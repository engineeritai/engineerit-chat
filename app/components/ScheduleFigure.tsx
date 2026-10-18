"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { downloadSvgPng, downloadTextFile, svgElementToPng } from "@/app/components/copyRich";
import type { ChartModel } from "@/lib/scheduleModel";
import { renderChartSvg, type ChartTheme } from "@/lib/scheduleSvg";

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

  return (
    <figure className="schedule-figure" data-diagram-index={index} dir={dir}>
      <figcaption>{model.title}</figcaption>
      <div className="schedule-scroll" ref={frameRef} dangerouslySetInnerHTML={{ __html: svg }} />
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
