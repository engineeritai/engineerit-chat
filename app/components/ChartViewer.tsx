"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useHistoryOverlay } from "@/app/components/useHistoryOverlay";
import { viewerScale } from "@/lib/viewerScale";

type Props = {
  open: boolean;
  dir: "ltr" | "rtl";
  closeLabel: string;
  title: string;
  sourceRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

export default function ChartViewer({ open, dir, closeLabel, title, sourceRef, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; scale: number; dist: number; down: number; swipe: boolean } | null>(null);
  const chatScroll = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useHistoryOverlay(open, onClose);

  useLayoutEffect(() => {
    const source = sourceRef.current;
    if (!open || !source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("button, .diagram-fade, .diagram-tools").forEach((node) => node.remove());
    setHtml(clone.outerHTML);
  }, [open, sourceRef]);

  useLayoutEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || !html) return;
    const svg = canvas.querySelector("svg");
    const font = Number(svg?.querySelector("text")?.getAttribute("font-size") || svg?.getAttribute("data-font") || 13);
    const attrW = Number(svg?.getAttribute("width") || 0);
    const attrH = Number(svg?.getAttribute("height") || svg?.viewBox?.baseVal?.height || 0);
    const next = viewerScale(
      { w: Math.max(canvas.scrollWidth, attrW), h: Math.max(canvas.scrollHeight, attrH), font },
      { w: stage.clientWidth, h: stage.clientHeight },
      dir === "rtl"
    );
    setView(next);
  }, [open, html, dir]);

  useEffect(() => {
    if (!open) return;
    const scroller = document.querySelector(".conversation") as HTMLElement | null;
    chatScroll.current = scroller?.scrollTop ?? window.scrollY;
    const htmlNode = document.documentElement;
    const previousHtml = htmlNode.style.overflow;
    const previousBody = document.body.style.overflow;
    htmlNode.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      htmlNode.style.overflow = previousHtml;
      document.body.style.overflow = previousBody;
      if (scroller) scroller.scrollTop = chatScroll.current;
      else window.scrollTo(0, chatScroll.current);
    };
  }, [open]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!open || !stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = stage.getBoundingClientRect();
      const current = viewRef.current;
      const nextScale = Math.min(8, Math.max(0.4, current.scale * (event.deltaY < 0 ? 1.08 : 0.92)));
      const px = event.clientX - box.left;
      const py = event.clientY - box.top;
      const ratio = nextScale / current.scale;
      const next = { scale: nextScale, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
      viewRef.current = next;
      setView(next);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [open, html]);

  if (!open || typeof document === "undefined") return null;

  const setFromGesture = (next: { scale: number; x: number; y: number }) => {
    const scale = Math.min(8, Math.max(0.4, next.scale));
    viewRef.current = { ...next, scale };
    setView(viewRef.current);
  };

  return createPortal(
    <div className="chart-viewer" role="dialog" aria-modal="true" aria-label={title} dir={dir}>
      <button type="button" className="chart-viewer-backdrop" aria-label={closeLabel} onClick={onClose} />
      <div
        className="chart-viewer-stage"
        ref={stageRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const current = viewRef.current;
          if (pointers.current.size === 1) {
            gesture.current = { x: event.clientX, y: event.clientY, scale: current.scale, dist: 0, down: event.clientY, swipe: true };
          } else if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            gesture.current = {
              x: current.x,
              y: current.y,
              scale: current.scale,
              dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
              down: 0,
              swipe: false,
            };
          }
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId);
          if (!previous || !gesture.current) return;
          if (pointers.current.size >= 2) {
            pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            const nextScale = gesture.current.scale * (dist / gesture.current.dist);
            const stage = stageRef.current?.getBoundingClientRect();
            if (!stage) return;
            const px = (a.x + b.x) / 2 - stage.left;
            const py = (a.y + b.y) / 2 - stage.top;
            const ratio = nextScale / viewRef.current.scale;
            setFromGesture({
              scale: nextScale,
              x: px - (px - viewRef.current.x) * ratio,
              y: py - (py - viewRef.current.y) * ratio,
            });
            return;
          }
          const dx = event.clientX - previous.x;
          const dy = event.clientY - previous.y;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          setFromGesture({ scale: viewRef.current.scale, x: viewRef.current.x + dx, y: viewRef.current.y + dy });
        }}
        onPointerUp={(event) => {
          const origin = gesture.current;
          pointers.current.delete(event.pointerId);
          if (origin?.swipe && pointers.current.size === 0) {
            const dx = event.clientX - origin.x;
            const dy = event.clientY - origin.down;
            if (dy > 72 && dy > Math.abs(dx) * 1.3) onClose();
          }
          if (pointers.current.size < 2) gesture.current = null;
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId);
          gesture.current = null;
        }}
      >
        <div
          ref={canvasRef}
          className="chart-viewer-canvas"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <button type="button" className="chart-viewer-close" aria-label={closeLabel} onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
    </div>,
    document.body
  );
}
