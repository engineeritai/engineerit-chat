// lib/plans.ts

export type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export type Plan = {
  id: PlanId;
  name: string;
  shortName: string;
  tagline: string;
  priceMonthly: string; // formatted for display
  priceYearly: string;  // formatted for display
  features: string[];
};

const SAR_SYMBOL = "﷼"; // Saudi Riyal symbol

export const PLANS: Plan[] = [
  {
    id: "assistant",
    name: "Assistant Engineer",
    shortName: "A",
    tagline: "Ideal for students and junior engineers.",
    priceMonthly: "Free",
    priceYearly: "Free",
    features: [
      "AI chat in all disciplines",
      "Read Word, Excel, PowerPoint, PDF",
      "Understand simple PFD / P&ID / block diagrams",
      "Basic data digitization (tables & simple tags)",
    ],
  },
  {
    id: "engineer",
    name: "Engineer",
    shortName: "E",
    tagline: "For practicing engineers who need faster documentation.",
    //  SAR 19 / month, 10% yearly discount → SAR 205 / year
    priceMonthly: `SAR 19 / month`,
    priceYearly: `SAR 205 / year (10% off)`,
    features: [
      "Everything in Assistant Engineer",
      "Export Word, Excel, PowerPoint outputs",
      "Technical report drafts",
      "Engineering calculation sheets",
      "Presentation outlines for clients and management",
    ],
  },
  {
    id: "professional",
    name: "Professional Engineer",
    shortName: "P",
    tagline: "For senior engineers and lead designers.",
    //  SAR 41 / month, 13% yearly discount → SAR 428 / year
    priceMonthly: `SAR 41 / month`,
    priceYearly: `SAR 428 / year (13% off)`,
    features: [
      "Everything in Engineer",
      "Advanced designs, equations, formulas, design checks",
      "Finite element & modeling (where available)",
      "ITP & QA/QC checklist templates",
      "BOQ & quantities take-off helpers",
    ],
  },
  {
    id: "consultant",
    name: "Consultant Engineer",
    shortName: "C",
    tagline: "For consultants and firms managing full projects.",
    //  SAR 79 / month, 17% yearly discount → SAR 787 / year
    priceMonthly: `SAR 79 / month`,
    priceYearly: `SAR 787 / year (17% off)`,
    features: [
      "Everything in Professional Engineer",
      "Equipment list & BOQ extraction",
      "Value Engineering packages",
      "Resource & cost estimation & schedule generator",
      "Project dashboards and portfolio overview",
    ],
  },
];
