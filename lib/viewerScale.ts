/** Fit a chart to the viewer height, and never start below 12px text. */
export function viewerScale(
  natural: { w: number; h: number; font: number },
  stage: { w: number; h: number },
  rtl = false
) {
  const font = Math.max(1, natural.font || 13);
  const fitHeight = stage.h / Math.max(1, natural.h);
  const scale = Math.max(fitHeight, 12 / font);
  const scaledW = natural.w * scale;
  const scaledH = natural.h * scale;
  const x = scaledW <= stage.w ? (stage.w - scaledW) / 2 : rtl ? stage.w - scaledW : 0;
  const y = Math.max(0, (stage.h - scaledH) / 2);
  return { scale, x, y };
}
