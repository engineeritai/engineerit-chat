/** Contain the chart, keep labels near 12–16px, and never scale above 2×. */
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
  let scale = Math.min(stageW / natW, stageH / natH, cap);
  if (scale * font < 12) scale = Math.min(14 / font, cap);
  const scaledW = natW * scale;
  const scaledH = natH * scale;
  const panX = scaledW > stageW + 0.5;
  const panY = scaledH > stageH + 0.5;
  const x = panX ? (rtl ? stageW - scaledW : 0) : (stageW - scaledW) / 2;
  const y = panY ? 0 : (stageH - scaledH) / 2;
  return { scale, x, y, panX };
}
