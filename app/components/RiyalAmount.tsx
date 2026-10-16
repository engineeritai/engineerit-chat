"use client";

import { useEffect, useState } from "react";
import { RIYAL, RIYAL_PATHS, RIYAL_VIEWBOX, embedRiyal } from "@/lib/riyal";

let glyphProbe: Promise<boolean> | null = null;

/** True only when the page font paints U+20C1 as its own glyph, not .notdef. */
function pageFontHasRiyal() {
  if (glyphProbe) return glyphProbe;
  glyphProbe = Promise.resolve().then(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    const family = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.font = `24px ${family}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    const pixels = (text: string) => {
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillText(text, 16, 16);
      return ctx.getImageData(0, 0, 32, 32).data;
    };
    const glyph = pixels(RIYAL);
    const missing = pixels("\u{10FFFF}");
    for (let i = 0; i < glyph.length; i += 1) {
      if (glyph[i] !== missing[i]) return true;
    }
    return false;
  });
  return glyphProbe;
}

/** Official mark. SVG until a canvas probe shows the page font has U+20C1. */
export function RiyalMark() {
  const [unicode, setUnicode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void pageFontHasRiyal().then((ready) => {
      if (!cancelled && ready) setUnicode(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (unicode) {
    return (
      <span className="riyal-char" translate="no">
        {RIYAL}
      </span>
    );
  }

  return (
    <svg
      className="riyal-mark"
      viewBox={`0 0 ${RIYAL_VIEWBOX.width} ${RIYAL_VIEWBOX.height}`}
      role="img"
      aria-label="Saudi Riyal"
      data-riyal="svg"
    >
      <title>Saudi Riyal</title>
      {RIYAL_PATHS.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Renders a price string with the riyal sign kept on the left of the number. */
export function SarText({ children, className }: { children: string; className?: string }) {
  const text = embedRiyal(children);
  const parts = text.split(RIYAL);
  return (
    <span className={className ? `sar-amount ${className}` : "sar-amount"} dir="ltr">
      {parts.map((part, index) => (
        <span key={`${index}-${part}`}>
          {index > 0 ? <RiyalMark /> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
