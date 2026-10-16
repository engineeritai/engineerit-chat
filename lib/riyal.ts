/**
 * Official Saudi riyal sign (Unicode U+20C1) and the SAMA symbol paths.
 * The two paths are the public-domain geometry from Saudi_Riyal_Symbol-2.svg
 * (viewBox 0 0 1124.14 1256.39). Do not redraw them.
 */
export const RIYAL = "\u20C1";

export const RIYAL_VIEWBOX = { width: 1124.14, height: 1256.39 } as const;

export const RIYAL_PATHS = [
  "M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z",
  "M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z",
] as const;

const NUMBER = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?`;

/** Symbol, a space, then the already-formatted number. SAMA places the sign on the left. */
export function riyalAmount(formattedNumber: string) {
  return `${RIYAL} ${formattedNumber}`;
}

/**
 * Turn "SAR 19", "19 SAR", and "19 ر.س" into the riyal sign left of the number.
 * Leaves the words "Saudi Riyal" and "الريال السعودي" alone.
 */
export function embedRiyal(text: string) {
  if (!text) return text;
  let out = text;
  out = out.replace(new RegExp(String.raw`\bSAR\s+(${NUMBER})`, "g"), (_, n: string) => riyalAmount(n));
  out = out.replace(new RegExp(String.raw`(${NUMBER})\s+SAR\b`, "g"), (_, n: string) => riyalAmount(n));
  out = out.replace(new RegExp(String.raw`(${NUMBER})\s*ر\.س`, "g"), (_, n: string) => riyalAmount(n));
  out = out.replace(new RegExp(String.raw`ر\.س\s*(${NUMBER})`, "g"), (_, n: string) => riyalAmount(n));
  out = out.replace(new RegExp(String.raw`(${NUMBER})\s+ريال(?![\u0600-\u06FF])`, "g"), (_, n: string) => riyalAmount(n));
  return out;
}
