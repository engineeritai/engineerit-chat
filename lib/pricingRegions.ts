// lib/pricingRegions.ts

export type PricingRegion = "sa" | "gcc" | "mena" | "global";

export const REGION_LABELS: Record<PricingRegion, string> = {
  sa: "Saudi Arabia",
  gcc: "GCC",
  mena: "MENA",
  global: "Global",
};

// معامل تعديل السعر (مثال مبدئي – عدّله كما تحب)
export const REGION_MULTIPLIER: Record<PricingRegion, number> = {
  sa: 1,      // الأساس بالريال
  gcc: 1.05,  // +5%
  mena: 0.9,  // -10%
  global: 1,  // ثابت
};
