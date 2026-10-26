/** Quantities are rounded to 3 decimal places, which is the take-off display. */

export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function formatQty(n: number): string {
  const text = round3(n).toFixed(3);
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function m3FromMm(lengthMm: number, widthMm: number, thicknessMm: number, count = 1): number {
  return (lengthMm * widthMm * thicknessMm * count) / 1e9;
}

export function m2FromMm(aMm: number, bMm: number, count = 1): number {
  return (aMm * bMm * count) / 1e6;
}

export function metresFromMm(mm: number): number {
  return mm / 1000;
}

/**
 * Straight bar: one bar at each end of the clear span.
 * clear and spacing are millimetres.
 */
export function straightBarCount(clearMm: number, spacingMm: number): number {
  if (clearMm <= 0 || spacingMm <= 0) return 0;
  return Math.floor(clearMm / spacingMm + 1e-9) + 1;
}

/**
 * Closed loop: the start point is not counted twice.
 * An exact division (36000 / 200) stays 180.
 */
export function closedBarCount(lengthMm: number, spacingMm: number): number {
  if (lengthMm <= 0 || spacingMm <= 0) return 0;
  return Math.max(1, Math.round(lengthMm / spacingMm));
}

/** ASTM A615 nominal weights. 1 lb/ft = 1.488164 kg/m. */
export const LB_PER_FT_TO_KG_PER_M = 0.45359237 / 0.3048;

export function kgPerMFromLbPerFt(lbPerFt: number): number {
  return lbPerFt * LB_PER_FT_TO_KG_PER_M;
}

/** Published US bar weights, pounds per foot. */
export const STANDARD_LB_PER_FT: Record<string, number> = {
  "#3": 0.376,
  "#4": 0.668,
  "#5": 1.043,
  "#6": 1.502,
  "#7": 2.044,
  "#8": 2.67,
  "#9": 3.4,
  "#10": 4.303,
  "#11": 5.313,
};

/** Published unit masses, used only when the drawing does not state one. */
export const STANDARD_KG_PER_M: Record<string, number> = {
  T6: 0.222,
  T8: 0.395,
  T10: 0.617,
  T12: 0.888,
  T16: 1.578,
  T20: 2.466,
  T25: 3.854,
  T32: 6.313,
};

for (const [bar, lbPerFt] of Object.entries(STANDARD_LB_PER_FT)) {
  STANDARD_KG_PER_M[bar] = kgPerMFromLbPerFt(lbPerFt);
}

export function barMass(table: Record<string, number>, bar: string): { kgPerM: number; fromDrawing: boolean } {
  const key = bar.toUpperCase();
  if (table[key] != null) return { kgPerM: table[key], fromDrawing: true };
  if (STANDARD_KG_PER_M[key] != null) return { kgPerM: STANDARD_KG_PER_M[key], fromDrawing: false };
  return { kgPerM: 0, fromDrawing: false };
}
