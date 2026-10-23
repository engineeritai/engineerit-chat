import { PLAN_AMOUNTS_SAR } from "@/lib/plans";

/** Free-plan daily limit copy. Price comes from the plan table, not a second number. */
export function freeLimitUpgradeMessage(locale: "en" | "ar") {
  const price = PLAN_AMOUNTS_SAR.engineer.month;
  if (locale === "ar") {
    return `بلغت الحد اليومي لباقة المساعد المجانية. باقة المهندس ${price} ريال شهريا: بلا حد يومي للردود، مع تحليل ملفات وورد وإكسل وباوربوينت.`;
  }
  return `Daily limit reached on the free Assistant plan. Engineer is SAR ${price} a month: no daily reply cap, plus Word, Excel, and PowerPoint file analysis.`;
}
