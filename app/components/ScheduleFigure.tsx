"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ChartActions from "@/app/components/ChartActions";
import ChartViewer from "@/app/components/ChartViewer";
import { svgElementToPng } from "@/app/components/copyRich";
import { bindVerticalPass } from "@/app/components/verticalPass";
import type { ChartModel } from "@/lib/scheduleModel";
import { GANTT_HEADER, GANTT_ROW, ganttRows, renderChartSvg, renderFittedChartParts, type ChartTheme } from "@/lib/scheduleSvg";
import { copyImageBlob, dataUrlToBlob, deliverBlob } from "@/lib/saveFile";

type Labels = { copy: string; png: string; svg: string; enlarge: string; close: string };

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
  const visualRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [width, setWidth] = useState(420);
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
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
    const node = figureRef.current;
    if (!node || !gantt) return;
    const apply = () => {
      const next = node.clientWidth;
      setCompact(next > 0 && next < 560);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [gantt]);
  useLayoutEffect(() => {
    if (!gantt || compact) return;
    const port = scrollRef.current;
    if (!port) return;
    const bar = port.querySelector("[data-kind='bar'], [data-kind='milestone']");
    if (!bar) return;
    const delta = bar.getBoundingClientRect().left - port.getBoundingClientRect().left - 12;
    if (Math.abs(delta) > 1) port.scrollLeft += delta;
  }, [svg, gantt, dir, compact]);
  useEffect(() => {
    const node = gantt ? scrollRef.current : frameRef.current;
    if (!node) return;
    return bindVerticalPass(node);
  }, [svg, gantt]);
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
  const chartSvg = () => (visualRef.current || frameRef.current)?.querySelector("svg") || null;

    const fitted = gantt && compact ? renderFittedChartParts(model, dir, theme).join("") : "";

    return (
    <figure className="schedule-figure" data-diagram-index={index} dir={dir} ref={figureRef}>
      <figcaption>{model.title}</figcaption>
      {gantt ? (
        <div className="gantt-board" ref={visualRef}>
          <ul className="gantt-legend">
            {legend.map(([kind, label]) => (
              <li key={kind}>
                <span className={`gantt-swatch is-${kind}`} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          {fitted ? (
            <div className="gantt-fit-live" dangerouslySetInnerHTML={{ __html: fitted }} />
          ) : (
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
          )}
        </div>
      ) : (
        <div
          className="schedule-scroll"
          ref={(node) => {
            frameRef.current = node;
            visualRef.current = node;
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <ChartActions
        labels={labels}
        onEnlarge={() => setOpen(true)}
        onCopy={() => {
          const node = chartSvg();
          if (!node) return;
          void svgElementToPng(node, 3.125).then((png) => copyImageBlob(dataUrlToBlob(png), `${filename}.png`));
        }}
        onPng={() => {
          const node = chartSvg();
          if (!node) return;
          void svgElementToPng(node, 3.125).then((png) => deliverBlob(dataUrlToBlob(png), `${filename}.png`));
        }}
        onSvg={() => void deliverBlob(new Blob([svg], { type: "image/svg+xml" }), `${filename}.svg`)}
      />
      <ChartViewer open={open} dir={dir} closeLabel={labels.close} title={labels.enlarge} sourceRef={visualRef} onClose={() => setOpen(false)} />
    </figure>
  );
}
