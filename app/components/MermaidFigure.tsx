"use client";

import { useEffect, useId, useRef, useState } from "react";
import ChartActions from "@/app/components/ChartActions";
import ChartViewer from "@/app/components/ChartViewer";
import { bindVerticalPass } from "@/app/components/verticalPass";
import { svgElementToPng } from "@/app/components/copyRich";
import { sanitizeFlowchart } from "@/lib/diagramReply";
import { flowSvg } from "@/lib/flowSvg";
import { copyImageBlob, dataUrlToBlob, deliverBlob } from "@/lib/saveFile";

type Labels = { copy: string; png: string; svg: string; enlarge: string; close: string };

function nodeCount(source: string): number {
  const ids = new Set<string>();
  for (const match of source.matchAll(/(?:^|[\s;])([A-Za-z_][\w]*)\s*\[/g)) ids.add(match[1]);
  return ids.size;
}

function fitSvg(svg: SVGSVGElement, frame: HTMLElement, shrink: boolean) {
  const box = svg.viewBox.baseVal;
  let width = box?.width || 0;
  let height = box?.height || 0;
  if (!width) {
    const rawWidth = Number.parseFloat(svg.getAttribute("width") || "");
    const rawHeight = Number.parseFloat(svg.getAttribute("height") || "");
    if (rawWidth > 0 && rawHeight > 0) {
      svg.setAttribute("viewBox", `0 0 ${rawWidth} ${rawHeight}`);
      width = rawWidth;
      height = rawHeight;
    }
  }
  svg.removeAttribute("height");
  svg.style.display = "block";
  svg.style.height = "auto";
  svg.style.marginInline = "auto";
  if (!width) {
    svg.style.width = "100%";
    svg.style.maxWidth = "100%";
    svg.style.minWidth = "0";
    return;
  }
  const natural = Math.ceil(width);
  svg.setAttribute("width", String(natural));
  if (shrink) {
    svg.style.width = "100%";
    svg.style.maxWidth = `${natural}px`;
    svg.style.minWidth = "0";
    delete svg.dataset.overflow;
    return;
  }
  svg.style.width = `${natural}px`;
  svg.style.maxWidth = "none";
  svg.style.minWidth = `${natural}px`;
  if (natural > frame.clientWidth + 1 && !svg.dataset.compact) svg.dataset.overflow = "1";
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
  const frameRef = useRef<HTMLDivElement>(null);
  const source = sanitizeFlowchart(code, dir) || code;
  const painted = flowSvg(source, dir) || "";
  const [markup, setMarkup] = useState(painted);
  const [compact, setCompact] = useState(false);
  const [fade, setFade] = useState(false);
  const [open, setOpen] = useState(false);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    let timer = 0;
    if (painted) setMarkup(painted);
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          htmlLabels: false,
          fontFamily: "IBM Plex Sans Arabic, Noto Sans Arabic, Inter, sans-serif",
          flowchart: {
            htmlLabels: false,
            useMaxWidth: false,
            wrappingWidth: 200,
            padding: 8,
            nodeSpacing: 28,
            rankSpacing: 32,
          },
          themeVariables: {
            fontSize: "13px",
            primaryColor: "#e7eeff",
            primaryTextColor: "#111418",
            primaryBorderColor: "#1a56ff",
            lineColor: "#1a56ff",
            background: "#ffffff",
          },
        });
        if (compact) {
          if (!cancel && painted) setMarkup(painted);
          return;
        }
        const rendered = await Promise.race([
          mermaid.render(`mmd-${reactId}`, source),
          new Promise<never>((_, reject) => {
            timer = window.setTimeout(() => reject(new Error("diagram-timeout")), 4000);
          }),
        ]);
        window.clearTimeout(timer);
        if (!cancel) setMarkup(rendered.svg);
      } catch {
        if (!cancel && painted) setMarkup(painted);
      }
    })();
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [source, dir, reactId, compact, painted]);

  useEffect(() => {
    const frame = frameRef.current;
    const svg = frame?.querySelector("svg");
    if (!frame || !svg) return;
    const count = Number(svg.getAttribute("data-nodes") || "") || nodeCount(source);
    const shrink = count > 0 && count <= 3;
    fitSvg(svg, frame, shrink);
    setFade(frame.scrollWidth > frame.clientWidth + 1);
    if (!shrink && !compact && svg.dataset.overflow === "1") setCompact(true);
    return bindVerticalPass(frame);
  }, [markup, compact, source]);

  if (!markup) return null;
  return (
    <figure className="schedule-figure mermaid-figure" data-diagram-index={index} dir={dir}>
      <div className="diagram-shell">
        <div className="diagram-frame" ref={(node) => { frameRef.current = node; visualRef.current = node; }} dangerouslySetInnerHTML={{ __html: markup }} />
        {fade ? (
          <>
            <span className="diagram-fade is-start" aria-hidden="true" />
            <span className="diagram-fade is-end" aria-hidden="true" />
          </>
        ) : null}
      </div>
      <ChartActions
        labels={labels}
        onEnlarge={() => setOpen(true)}
        onCopy={() => {
          const node = visualRef.current?.querySelector("svg");
          if (!node) return;
          void svgElementToPng(node, 3.125).then((png) => copyImageBlob(dataUrlToBlob(png), "diagram.png"));
        }}
        onPng={() => {
          const node = visualRef.current?.querySelector("svg");
          if (!node) return;
          void svgElementToPng(node, 3.125).then((png) => deliverBlob(dataUrlToBlob(png), "diagram.png"));
        }}
        onSvg={() => void deliverBlob(new Blob([markup], { type: "image/svg+xml" }), "diagram.svg")}
      />
      <ChartViewer open={open} dir={dir} closeLabel={labels.close} title={labels.enlarge} sourceRef={visualRef} onClose={() => setOpen(false)} />
    </figure>
  );
}
