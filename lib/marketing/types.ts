import type { Discipline } from "@/lib/disciplines";
import type { EngineerToolId } from "@/lib/engineerTools";

/**
 * Locale-neutral shape for marketing copy.
 * Add Arabic by creating ar.ts with this same shape (dir: "rtl", htmlLang: "ar")
 * and registering it in ./index.ts. Do not put prices in here — those come from
 * the plan catalog and lib/pricingDisplay.ts.
 */
export type MarketingContent = {
  locale: string;
  dir: "ltr" | "rtl";
  htmlLang: string;
  nav: {
    primary: string;
    menu: string;
    disciplines: string;
    tools: string;
    how: string;
    teams: string;
    pricing: string;
    login: string;
    openChat: string;
  };
  hero: {
    kicker: string;
    h1: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
    panelTitle: string;
    panelBody: string;
  };
  trust: {
    kicker: string;
    title: string;
    body: string;
    authLabel: string;
    verify: string;
  };
  disciplines: {
    title: string;
    intro: string;
    summaries: Record<Discipline, string>;
  };
  tools: {
    title: string;
    intro: string;
    summaries: Record<EngineerToolId, string>;
    availability: Record<EngineerToolId, string>;
  };
  how: {
    title: string;
    intro: string;
    steps: { title: string; body: string }[];
  };
  audiences: {
    title: string;
    intro: string;
    items: { title: string; body: string }[];
  };
  teams: {
    title: string;
    intro: string;
  };
  faq: {
    title: string;
    intro: string;
    items: { question: string; answer: string }[];
  };
  closing: {
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    blurb: string;
    policyLead: string;
    policyLink: string;
    rights: string;
    contact: string;
    register: string;
    privacy: string;
    refunds: string;
  };
  pricing: {
    title: string;
    intro: string;
    monthly: string;
    annual: string;
    twoMonthsFree: string;
    annualExplainer: string;
    usdNote: string;
    vatNote: string;
    individualTitle: string;
    individualIntro: string;
    firmTitle: string;
    firmIntro: string;
    approx: string;
  };
};
