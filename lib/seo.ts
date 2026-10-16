import type { Metadata } from "next";
import { DISCIPLINES } from "@/lib/disciplines";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
import type { Locale } from "@/lib/i18n";
import { disciplineLabel, localizedPlan, toolLabel } from "@/lib/labels";
import { metaFor } from "@/lib/pageMeta";
import {
  ENTERPRISE_EXTRA_SEAT_SAR,
  ENTERPRISE_INCLUDED_SEATS,
  EXTRA_SEAT_SAR,
  PLAN_AMOUNTS_SAR,
  PLANS,
  TEAM_INCLUDED_SEATS,
  type Plan,
  type SelfServePlanId,
} from "@/lib/plans";
import { assertIndividualPlanPrices } from "@/lib/pricingDisplay";

export const SITE_URL = "https://engineerit.ai";
export const SITE_NAME = "engineerit.ai";

export const defaultTitle =
  "engineerit.ai | AI assistant for engineering consultancies";

export const defaultDescription =
  "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Your subscription unlocks unlimited chats, engineering tools and AI Advisors.";

export function languageAlternates(path: string) {
  const canonical = path === "/" ? `${SITE_URL}/` : new URL(path, SITE_URL).toString();
  const withLang = (lang: Locale) => {
    const url = new URL(path === "/" ? "/" : path, SITE_URL);
    url.searchParams.set("lang", lang);
    return url.toString();
  };
  return {
    canonical,
    languages: {
      en: withLang("en"),
      ar: withLang("ar"),
      "x-default": canonical,
    },
  };
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  locale = "en",
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  locale?: "en" | "ar";
}): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  const fullTitle = title.includes("engineerit.ai")
    ? title
    : `${title} | engineerit.ai`;

  return {
    title: { absolute: fullTitle },
    description,
    alternates: languageAlternates(path),
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: "/og.png", alt: SITE_NAME }],
      type: "website",
      locale: locale === "ar" ? "ar_SA" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/og.png"],
    },
  };
}

function grouped(amount: number) {
  return amount.toLocaleString("en-US");
}

function offerFor(plan: Plan, locale: "en" | "ar") {
  const name = localizedPlan(locale, plan).name;
  const price = plan.id === "assistant" ? 0 : PLAN_AMOUNTS_SAR[plan.id as SelfServePlanId].month;
  return {
    "@type": "Offer",
    name,
    price: String(price),
    priceCurrency: "SAR",
    description: offerDescription(plan, locale),
    url: `${SITE_URL}/pricing`,
    availability: "https://schema.org/InStock",
  };
}

function offerDescription(plan: Plan, locale: "en" | "ar") {
  if (plan.id === "assistant") {
    return locale === "ar" ? "المهندس المساعد مجاني." : "Assistant Engineer is free.";
  }
  const amounts = PLAN_AMOUNTS_SAR[plan.id];
  const month = grouped(amounts.month);
  const year = grouped(amounts.year);
  if (plan.id === "team") {
    return locale === "ar"
      ? `الفريق ${month} ر.س شهرياً أو ${year} ر.س سنوياً لـ ${TEAM_INCLUDED_SEATS} مقاعد. المقعد الإضافي ${grouped(EXTRA_SEAT_SAR.month)} ر.س شهرياً أو ${grouped(EXTRA_SEAT_SAR.year)} ر.س سنوياً. الشراء عبر Moyasar. الفريق يشمل مستشار إدارة المشاريع ومستشار ضمان البرنامج.`
      : `Team is SAR ${month} per month or SAR ${year} per year for ${TEAM_INCLUDED_SEATS} seats. Extra seat SAR ${grouped(EXTRA_SEAT_SAR.month)} per month or SAR ${grouped(EXTRA_SEAT_SAR.year)} per year. Bought through Moyasar. Team includes the PMO Advisor and Program Assurance.`;
  }
  if (plan.id === "enterprise") {
    return locale === "ar"
      ? `المؤسسات ${month} ر.س شهرياً أو ${year} ر.س سنوياً لـ ${ENTERPRISE_INCLUDED_SEATS} مقاعد. المقعد الإضافي ${grouped(ENTERPRISE_EXTRA_SEAT_SAR.month)} ر.س شهرياً أو ${grouped(ENTERPRISE_EXTRA_SEAT_SAR.year)} ر.س سنوياً. الشراء عبر Moyasar. المؤسسات تشمل مستشار إدارة المشاريع وضمان البرنامج وجاهزية التشغيل ودعم القرار.`
      : `Enterprise is SAR ${month} per month or SAR ${year} per year for ${ENTERPRISE_INCLUDED_SEATS} seats. Extra seat SAR ${grouped(ENTERPRISE_EXTRA_SEAT_SAR.month)} per month or SAR ${grouped(ENTERPRISE_EXTRA_SEAT_SAR.year)} per year. Bought through Moyasar. Enterprise includes PMO, Program Assurance, Operations Readiness, and Decision Support.`;
  }
  const advisors =
    plan.id === "consultant"
      ? locale === "ar"
        ? " المهندس الاستشاري يشمل مستشار إدارة المشاريع."
        : " Consultant Engineer includes the PMO Advisor."
      : "";
  return locale === "ar"
    ? `${localizedPlan("ar", plan).name} ${month} ر.س شهرياً أو ${year} ر.س سنوياً. الشراء عبر Moyasar.${advisors}`
    : `${plan.name} is SAR ${month} per month or SAR ${year} per year. Bought through Moyasar.${advisors}`;
}

export function softwareApplicationJsonLd(locale: Locale = "en") {
  assertIndividualPlanPrices();
  const arabic = locale === "ar";

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: arabic ? "هندسة" : "Engineering",
    operatingSystem: arabic ? "الويب" : "Web",
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og.png`,
    description: metaFor(locale, "/").description,
    inLanguage: arabic ? "ar" : "en",
    areaServed: ["SA", "AE", "KW", "QA", "BH", "OM"],
    offers: PLANS.map((plan) => offerFor(plan, locale)),
    featureList: arabic
      ? [
          ...DISCIPLINES.map((name) => disciplineLabel("ar", name)),
          ...ENGINEER_TOOLS.map((tool) => toolLabel("ar", tool.id)),
        ]
      : [...DISCIPLINES, ...ENGINEER_TOOLS.map((tool) => tool.label)],
  };
}
