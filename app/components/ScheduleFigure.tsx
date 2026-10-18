"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { downloadSvgPng, downloadTextFile, svgElementToPng } from "@/app/components/copyRich";
import type { ChartModel } from "@/lib/scheduleModel";
import { GANTT_HEADER, GANTT_ROW, ganttRows, renderChartSvg, type ChartTheme } from "@/lib/scheduleSvg";

type Labels = { copy: string; png: string; svg: string };

export default function ScheduleFigure({
  model,
  dir,
  index,
  labels,
}: {
  model: ChartModel;
  dir: "ltr" | "rtl";
  index: number;
  labels: Labels;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [width, setWidth] = useState(420);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setTheme(media.matches ? "dark" : "light");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useLayoutEffect(() => {
    if (model.kind !== "scurve") return;
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => {
      const next = Math.round(frame.clientWidth);
      if (next < 200) return;
      setWidth((prev) => (Math.abs(prev - next) <= 2 ? prev : Math.min(720, next)));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [model.kind]);
  const svg = renderChartSvg(model, dir, theme, model.kind === "scurve" ? width : undefined).replace(/<\?xml[^?]*\?>/, "");
  const filename = model.title.replace(/[^\w\u0600-\u06FF.-]+/g, "-").slice(0, 40) || "chart";
  const gantt = model.kind === "gantt" ? model : null;
  useLayoutEffect(() => {
    if (!gantt) return;
    const port = scrollRef.current;
    if (!port) return;
    const bar = port.querySelector("[data-kind='bar'], [data-kind='milestone']");
    if (!bar) return;
    const delta = bar.getBoundingClientRect().left - port.getBoundingClientRect().left - 12;
    if (Math.abs(delta) > 1) port.scrollLeft += delta;
  }, [svg, gantt, dir]);
  const legend = dir === "rtl"
    ? [
        ["task", "مهمة"],
        ["crit", "مسار حرج"],
        ["milestone", "معلم"],
        ["today", "اليوم"],
      ]
    : [
        ["task", "Task"],
        ["crit", "Critical"],
        ["milestone", "Milestone"],
        ["today", "Today"],
      ];

  return (
    <figure className="schedule-figure" data-diagram-index={index} dir={dir}>
      <figcaption>{model.title}</figcaption>
      {gantt ? (
        <div className="gantt-board">
          <ul className="gantt-legend">
            {legend.map(([kind, label]) => (
              <li key={kind}>
                <span className={`gantt-swatch is-${kind}`} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <div className="gantt-board-body">
            <div className="gantt-names">
              <div className="gantt-names-head" style={{ height: GANTT_HEADER }} />
              {ganttRows(gantt).map((row, rowIndex) => (
                <div
                  key={`${row.kind}-${rowIndex}`}
                  className={row.kind === "group" ? "gantt-name is-group" : "gantt-name"}
                  style={{ height: GANTT_ROW }}
                  title={row.label}
                >
                  {row.label}
                </div>
              ))}
            </div>
            <div className="gantt-scroll" ref={scrollRef} dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      ) : (
        <div className="schedule-scroll" ref={frameRef} dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      <div className="diagram-tools">
        <button
          type="button"
          className="msg-action-btn"
          onClick={async (event) => {
            const node = event.currentTarget.closest("figure")?.querySelector("svg");
            if (!node) return;
            const png = await svgElementToPng(node, 3.125);
            const blob = await (await fetch(png)).blob();
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          }}
        >
          {labels.copy}
        </button>
        <button
          type="button"
          className="msg-action-btn"
          onClick={(event) => {
            const node = event.currentTarget.closest("figure")?.querySelector("svg");
            if (node) void downloadSvgPng(node, `${filename}.png`);
          }}
        >
          {labels.png}
        </button>
        <button type="button" className="msg-action-btn" onClick={() => downloadTextFile(`${filename}.svg`, svg, "image/svg+xml")}>
          {labels.svg}
        </button>
      </div>
    </figure>
  );
}
