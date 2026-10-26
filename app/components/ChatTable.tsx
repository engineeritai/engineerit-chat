"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bindVerticalPass } from "@/app/components/verticalPass";
import { copyTable } from "@/app/components/copyRich";
import { downloadName, shortTopic } from "@/lib/exportName";
import { riyadhStamp } from "@/lib/ksaTime";
import { deliverBlob, saveWasToasted } from "@/lib/saveFile";
import { isolatePieces } from "@/lib/shareDirection";
import { showToast } from "@/lib/toast";

type Labels = { copyTable: string; exportExcel: string };

function CellText({ value, rtl }: { value: string; rtl: boolean }) {
  if (!/[\u0600-\u06FF]/.test(value)) {
    if (!rtl) return value;
    return <bdi dir="ltr">{value}</bdi>;
  }
  const pieces = isolatePieces(value);
  if (pieces.length === 1 && !pieces[0].isolate) return value;
  return pieces.map((piece, index) =>
    piece.isolate ? (
      <bdi key={index} dir="ltr">
        {piece.text}
      </bdi>
    ) : (
      <span key={index}>{piece.text}</span>
    )
  );
}

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
    const unbind = bindVerticalPass(scroll);
    return () => {
      observer.disconnect();
      unbind();
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
    await deliverBlob(blob, downloadName(shortTopic(fileBase || headers[0], locale === "ar" ? "جدول" : "Table"), "xlsx"));
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
            void exportExcel().catch((error) => {
              if (saveWasToasted(error)) return;
              showToast(locale === "ar" ? "تعذر تصدير الجدول" : "Couldn't export the table", "err");
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
              {headers.map((header, index) => (
                <th key={`${header}-${index}`}>
                  <span className="chat-table-text">
                    <CellText value={header} rtl={dir === "rtl"} />
                  </span>
                </th>
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
              {headers.map((header, index) => (
                <th key={`${header}-${index}`}>
                  <span className="chat-table-text">
                    <CellText value={header} rtl={dir === "rtl"} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex}>
                    <span className="chat-table-text">
                      <CellText value={row[cellIndex] ?? ""} rtl={dir === "rtl"} />
                    </span>
                  </td>
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
