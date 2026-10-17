"use client";

import { useEffect, useId, useState } from "react";
import { downloadSvgPng, downloadTextFile, svgElementToPng } from "@/app/components/copyRich";

type Labels = { copy: string; png: string; svg: string };

function prepare(code: string, dir: "ltr" | "rtl") {
  if (dir !== "rtl") return code;
  return code.replace(/flowchart\s+(LR|TD|TB)/i, "flowchart RL");
}

export default function MermaidFigure({
  code,
  dir,
  index,
  labels,
}: {
  code: string;
  dir: "ltr" | "rtl";
  index: number;
  labels: Labels;
}) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancel = false;
    const source = prepare(code, dir);
    (async () => {
      const mermaid = (await import("mermaid")).default;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "Inter, IBM Plex Sans Arabic, sans-serif",
        themeVariables: dark
          ? { primaryColor: "#1e3a8a", primaryTextColor: "#e2e8f0", lineColor: "#60a5fa", background: "#0b1220" }
          : { primaryColor: "#e7eeff", primaryTextColor: "#0f172a", primaryBorderColor: "#1a56ff", lineColor: "#1a56ff" },
      });
      try {
        const rendered = await mermaid.render(`mmd-${reactId}`, source);
        if (!cancel) setSvg(rendered.svg);
      } catch {
        if (!cancel) setFailed(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [code, dir, reactId]);

  if (failed) return null;
  return (
    <figure className="schedule-figure mermaid-figure" data-diagram-index={index} dir={dir}>
      <div className="schedule-scroll" dangerouslySetInnerHTML={{ __html: svg }} />
      {svg && (
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
              if (node) void downloadSvgPng(node, "diagram.png");
            }}
          >
            {labels.png}
          </button>
          <button type="button" className="msg-action-btn" onClick={() => downloadTextFile("diagram.svg", svg, "image/svg+xml")}>
            {labels.svg}
          </button>
        </div>
      )}
    </figure>
  );
}
