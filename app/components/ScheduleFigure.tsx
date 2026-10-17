"use client";

import { useEffect, useState } from "react";
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
  const [theme, setTheme] = useState<ChartTheme>("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setTheme(media.matches ? "dark" : "light");
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  const svg = renderChartSvg(model, dir, theme).replace(/<\?xml[^?]*\?>/, "");
  const filename = model.title.replace(/[^\w\u0600-\u06FF.-]+/g, "-").slice(0, 40) || "chart";

  return (
    <figure className="schedule-figure" data-diagram-index={index} dir={dir}>
      <figcaption>{model.title}</figcaption>
      <div className="schedule-scroll" dangerouslySetInnerHTML={{ __html: svg }} />
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
