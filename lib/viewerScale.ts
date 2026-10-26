/**
 * Open fitted to the stage width so the whole chart is visible.
 * Labels may grow toward 14px only while that still fits the width, and never above 2×.
 * Pinch-zoom and pan stay available for the detail. Horizontal pan is unchanged.
 */
export function viewerScale(
  natural: { w: number; h: number; font: number },
  stage: { w: number; h: number },
  rtl = false
) {
  const font = Math.max(1, natural.font || 13);
  const natW = Math.max(1, natural.w);
  const natH = Math.max(1, natural.h);
  const stageW = Math.max(1, stage.w);
  const stageH = Math.max(1, stage.h);
  const cap = Math.min(2, 16 / font);
  const widthFit = stageW / natW;
  let scale = Math.min(widthFit, cap);
  if (scale * font < 12) scale = Math.min(14 / font, cap, widthFit);
  const scaledW = natW * scale;
  const scaledH = natH * scale;
  const panX = scaledW > stageW + 0.5;
  const panY = scaledH > stageH + 0.5;
  const x = panX ? (rtl ? stageW - scaledW : 0) : (stageW - scaledW) / 2;
  const y = panY ? 0 : (stageH - scaledH) / 2;
  return { scale, x, y, panX };
}
