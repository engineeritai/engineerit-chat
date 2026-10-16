import type { Metadata } from "next";
import { DISCIPLINES } from "@/lib/disciplines";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
import type { Locale } from "@/lib/i18n";
import { disciplineLabel, localizedPlan, toolLabel } from "@/lib/labels";
import { metaFor } from "@/lib/pageMeta";
import { PLANS } from "@/lib/plans";
import {
  ENTERPRISE_PLAN,
  TEAM_PLAN,
  assertIndividualPlanPrices,
  monthlySarFromPlan,
} from "@/lib/pricingDisplay";

export const SITE_URL = "https://engineerit.ai";
export const SITE_NAME = "engineerit.ai";

export const defaultTitle =
  "engineerit.ai | AI assistant for engineering consultancies";

export const defaultDescription =
  "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Paid plans add exports.";

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

export function softwareApplicationJsonLd(locale: Locale = "en") {
  assertIndividualPlanPrices();
  const arabic = locale === "ar";

  const individualOffers = PLANS.map((plan) => {
    const copy = arabic ? localizedPlan("ar", plan) : plan;
    return {
      "@type": "Offer",
      name: copy.name,
      price: String(monthlySarFromPlan(plan)),
      priceCurrency: "SAR",
      description: copy.tagline,
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
    };
  });

  const teamDescription = arabic
    ? `باقة الفريق لـ ${TEAM_PLAN.includedSeats} مقاعد. المقعد الإضافي ${TEAM_PLAN.extraSeatMonthlySar} ر.س شهرياً. مشاريع مشتركة ومدير للفريق. الأسعار شاملة الضريبة. تُرتَّب معنا.`
    : `Team plan for ${TEAM_PLAN.includedSeats} seats. Extra seat SAR ${TEAM_PLAN.extraSeatMonthlySar} per month. Shared projects and an admin. Prices include VAT. Arranged with us.`;

  const enterpriseDescription = arabic
    ? `من ${ENTERPRISE_PLAN.monthlySarFrom.toLocaleString("ar-SA")} ر.س شهرياً. دخول الشركة ودعم أولوي ومعايير مخصصة. تواصل معنا.`
    : `From SAR ${ENTERPRISE_PLAN.monthlySarFrom.toLocaleString("en-US")} per month. Company sign-in, priority support, and custom standards. Contact us.`;

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
    offers: [
      ...individualOffers,
      {
        "@type": "Offer",
        name: arabic ? "فريق" : TEAM_PLAN.name,
        price: String(TEAM_PLAN.monthlySar),
        priceCurrency: "SAR",
        description: teamDescription,
        url: `${SITE_URL}/pricing`,
      },
      {
        "@type": "Offer",
        name: arabic ? "مؤسسة" : ENTERPRISE_PLAN.name,
        price: String(ENTERPRISE_PLAN.monthlySarFrom),
        priceCurrency: "SAR",
        description: enterpriseDescription,
        url: `${SITE_URL}/pricing#enterprise`,
      },
    ],
    featureList: arabic
      ? [
          ...DISCIPLINES.map((name) => disciplineLabel("ar", name)),
          ...ENGINEER_TOOLS.map((tool) => toolLabel("ar", tool.id)),
        ]
      : [...DISCIPLINES, ...ENGINEER_TOOLS.map((tool) => tool.label)],
  };
}
