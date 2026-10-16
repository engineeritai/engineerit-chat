import { en } from "@/lib/marketing/en";
import type { MarketingContent } from "@/lib/marketing/types";

/**
 * English is the only locale shipped today.
 * To add Arabic: implement MarketingContent in ./ar.ts (dir "rtl", htmlLang "ar")
 * and add it to CATALOGS. Pages already read copy through getMarketingContent.
 */
export type Locale = "en";

const CATALOGS: Record<Locale, MarketingContent> = {
  en,
};

export function getMarketingContent(locale: Locale = "en"): MarketingContent {
  return CATALOGS[locale];
}

export type { MarketingContent };
