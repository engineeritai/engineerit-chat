import type { Locale } from "@/lib/i18n";

/**
 * Operations Readiness summary and capabilities are shared with the advisor
 * chat page. This rewrite is only for the Arabic card on /advisors.
 * English counterparts: summary uses "start-up"; the second capability is
 * "Start-up and regularisation of operation".
 */
export function operationsCardCopy(
  locale: Locale,
  summary: string,
  capabilities: string[]
) {
  if (locale !== "ar") return { summary, capabilities };
  return {
    summary: summary.replace("والإقلاع", "والبدء"),
    capabilities: capabilities.map((item) =>
      item === "الإقلاع وانتظام التشغيل" ? "بدء وانتظام التشغيل" : item
    ),
  };
}
