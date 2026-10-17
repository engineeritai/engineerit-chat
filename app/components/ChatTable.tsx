"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyTable } from "@/app/components/copyRich";
import { downloadName, shortTopic } from "@/lib/exportName";
import { riyadhStamp } from "@/lib/ksaTime";

type Labels = { copyTable: string; exportExcel: string };

export default function ChatTable({
  headers,
  rows,
  dir,
  labels,
  locale,
  fileBase,
}: {
  headers: string[];
  rows: string[][];
  dir: "ltr" | "rtl";
  labels: Labels;
  locale: "en" | "ar";
  fileBase?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLTableElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const widths = columnWidths(headers, rows);

  const sync = useCallback(() => {
    const scroll = scrollRef.current;
    const pin = pinRef.current;
    const table = scroll?.querySelector("table");
    if (!scroll || !pin || !table) return;
    const port = scroll.getBoundingClientRect();
    const body = table.getBoundingClientRect();
    setEdges({
      left: body.left < port.left - 1,
      right: body.right > port.right + 1,
    });
    const delta = body.left - port.left;
    pin.style.transform = `translateX(${delta}px)`;
    const first = pin.querySelector("th");
    if (first instanceof HTMLElement) first.style.transform = `translateX(${-delta}px)`;
  }, []);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    sync();
    const observer = new ResizeObserver(() => sync());
    observer.observe(scroll);
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const scroller = scroll.closest(".conversation") as HTMLElement | null;
      if (!scroller) return;
      scroller.scrollTop += event.deltaY;
      event.preventDefault();
    };
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let axis: "x" | "y" | null = null;
    const onStart = (event: TouchEvent) => {
      startX = event.touches[0]?.clientX ?? 0;
      startY = event.touches[0]?.clientY ?? 0;
      lastY = startY;
      axis = null;
    };
    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const dy = touch.clientY - lastY;
      lastY = touch.clientY;
      if (!axis) {
        const dx = touch.clientX - startX;
        const travelY = touch.clientY - startY;
        if (Math.abs(dx) < 8 && Math.abs(travelY) < 8) return;
        axis = Math.abs(travelY) >= Math.abs(dx) ? "y" : "x";
      }
      if (axis !== "y") return;
      const scroller = scroll.closest(".conversation") as HTMLElement | null;
      if (!scroller) return;
      scroller.scrollTop -= dy;
      event.preventDefault();
    };
    scroll.addEventListener("wheel", onWheel, { passive: false });
    scroll.addEventListener("touchstart", onStart, { passive: true });
    scroll.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      observer.disconnect();
      scroll.removeEventListener("wheel", onWheel);
      scroll.removeEventListener("touchstart", onStart);
      scroll.removeEventListener("touchmove", onMove);
    };
  }, [sync, headers, rows]);

  async function exportExcel() {
    const res = await fetch("/api/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: headers[0] || "Table",
        locale,
        headers,
        rows,
        stamp: riyadhStamp(new Date(), locale),
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName(shortTopic(fileBase || headers[0], locale === "ar" ? "جدول" : "Table"), "xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="chat-table" dir={dir}>
      <div className="chat-table-tools">
        <button type="button" className="msg-action-btn" onClick={() => void copyTable(headers, rows, dir)}>
          {labels.copyTable}
        </button>
        <button
          type="button"
          className="msg-action-btn"
          onClick={() =>
            void exportExcel().catch(() => {
              /* the caller surfaces export failures on the message actions */
            })
          }
        >
          {labels.exportExcel}
        </button>
      </div>
      <div className="chat-table-pin">
        <table ref={pinRef} style={{ width: "100%", minWidth: widths.reduce((sum, width) => sum + width, 0) }}>
          <colgroup>
            {widths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div
        className={"chat-table-scroll" + (edges.left ? " has-left" : "") + (edges.right ? " has-right" : "")}
        dir={dir}
        ref={scrollRef}
        onScroll={sync}
      >
        <table style={{ width: "100%", minWidth: widths.reduce((sum, width) => sum + width, 0) }}>
          <colgroup>
            {widths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex}>{row[cellIndex] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className={"chat-table-fade is-left" + (edges.left ? " is-on" : "")} />
      <span className={"chat-table-fade is-right" + (edges.right ? " is-on" : "")} />
    </div>
  );
}

function columnWidths(headers: string[], rows: string[][]): number[] {
  return headers.map((header, index) => {
    const values = [header, ...rows.map((row) => row[index] || "")];
    const longestWord = values.reduce((max, value) => {
      const word = value.split(/\s+/).reduce((best, part) => Math.max(best, [...part].length), 0);
      return Math.max(max, word);
    }, 1);
    const fromHeader = Math.min(168, [...header].length * 8 + 28);
    const fromWord = Math.min(180, longestWord * 8 + 24);
    return Math.max(112, fromHeader, fromWord);
  });
}
