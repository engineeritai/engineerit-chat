"use client";

import { useEffect, useId, useRef, useState } from "react";
import { downloadSvgPng, downloadTextFile, svgElementToPng } from "@/app/components/copyRich";
import { sanitizeFlowchart } from "@/lib/diagramReply";
import { flowSvg } from "@/lib/flowSvg";

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
  const [scale, setScale] = useState(1);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

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
  }, [markup, compact, source]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!markup) return null;
  return (
    <figure className="schedule-figure mermaid-figure" data-diagram-index={index} dir={dir}>
      <div className="diagram-shell">
        <div className="diagram-frame" ref={frameRef} dangerouslySetInnerHTML={{ __html: markup }} />
        {fade ? (
          <>
            <span className="diagram-fade is-start" aria-hidden="true" />
            <span className="diagram-fade is-end" aria-hidden="true" />
          </>
        ) : null}
      </div>
      <div className="diagram-tools">
        <button type="button" className="msg-action-btn" onClick={() => { setScale(1); setOpen(true); }}>
          {labels.enlarge}
        </button>
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
        <button type="button" className="msg-action-btn" onClick={() => downloadTextFile("diagram.svg", markup, "image/svg+xml")}>
          {labels.svg}
        </button>
      </div>
      {open ? (
        <div className="diagram-lightbox" role="dialog" aria-modal="true" aria-label={labels.enlarge}>
          <button type="button" className="diagram-lightbox-close" onClick={() => setOpen(false)}>
            {labels.close}
          </button>
          <div
            className="diagram-lightbox-stage"
            onWheel={(event) => {
              event.preventDefault();
              setScale((current) => Math.min(4, Math.max(1, current * (event.deltaY < 0 ? 1.08 : 0.92))));
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale };
              }
            }}
            onPointerMove={(event) => {
              if (!pointers.current.has(event.pointerId)) return;
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (pointers.current.size < 2 || !pinch.current) return;
              const [a, b] = [...pointers.current.values()];
              const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
              setScale(Math.min(4, Math.max(1, pinch.current.scale * (dist / pinch.current.dist))));
            }}
            onPointerUp={(event) => {
              pointers.current.delete(event.pointerId);
              if (pointers.current.size < 2) pinch.current = null;
            }}
          >
            <div style={{ width: "100%", transform: `scale(${scale})`, transformOrigin: "center top" }} dangerouslySetInnerHTML={{ __html: markup }} />
          </div>
        </div>
      ) : null}
    </figure>
  );
}
