/** Width-based plate mark so the wide eit glyph stays inside the circle. */
export function eitPlateMarkSize(diameter: number, vbW: number, vbH: number) {
  const width = Math.round(diameter * 0.7);
  const height = Math.max(1, Math.round((width * vbH) / vbW));
  return { width, height };
}
