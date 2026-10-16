import type { Metadata } from "next";
import { DISCIPLINES } from "@/lib/disciplines";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
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
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  const fullTitle = title.includes("engineerit.ai")
    ? title
    : `${title} | engineerit.ai`;

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
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
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/og.png"],
    },
  };
}

export function softwareApplicationJsonLd() {
  assertIndividualPlanPrices();

  const individualOffers = PLANS.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: String(monthlySarFromPlan(plan)),
    priceCurrency: "SAR",
    description: plan.tagline,
    url: `${SITE_URL}/pricing`,
    availability: "https://schema.org/InStock",
  }));

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Engineering",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og.png`,
    description: defaultDescription,
    inLanguage: "en",
    areaServed: ["SA", "AE", "KW", "QA", "BH", "OM"],
    offers: [
      ...individualOffers,
      {
        "@type": "Offer",
        name: TEAM_PLAN.name,
        price: String(TEAM_PLAN.monthlySar),
        priceCurrency: "SAR",
        description: `Team plan with Consultant-tier features for ${TEAM_PLAN.includedSeats} seats. Extra seat SAR ${TEAM_PLAN.extraSeatMonthlySar} per month. Shared projects and admin. Prices include VAT. Arranged by contact, not charged in the app.`,
        url: `${SITE_URL}/pricing`,
      },
      {
        "@type": "Offer",
        name: ENTERPRISE_PLAN.name,
        price: String(ENTERPRISE_PLAN.monthlySarFrom),
        priceCurrency: "SAR",
        description:
          "From SAR 2,500 per month. SSO, priority support, and custom standards. Contact us.",
        url: `${SITE_URL}/pricing`,
      },
    ],
    featureList: [
      ...DISCIPLINES,
      ...ENGINEER_TOOLS.map((tool) => tool.label),
    ],
  };
}
