import { ar } from "@/lib/marketing/ar";
import { en } from "@/lib/marketing/en";
import type { MarketingContent } from "@/lib/marketing/types";
import type { Locale } from "@/lib/i18n";

export type { Locale };

const CATALOGS: Record<Locale, MarketingContent> = { en, ar };

export function getMarketingContent(locale: Locale = "en"): MarketingContent {
  return CATALOGS[locale] ?? CATALOGS.en;
}

export type { MarketingContent };
