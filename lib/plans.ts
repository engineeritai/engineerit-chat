// lib/plans.ts

export type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export type Plan = {
  id: PlanId;
  name: string;
  shortName: string;
  tagline: string;
  priceMonthly: string; // formatted for display
  priceYearly: string;  // formatted for display (keep field for UI compatibility)
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
    priceYearly: "",
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
    priceMonthly: `SAR 19 / month`,
    priceYearly: "",
    features: [
      "Everything in Assistant Engineer",
      "Analyze Word, Excel, PowerPoint Documents",
      "Technical report review and analysis",
      "Engineering calculation sheets review",
      "Presentation outlines for clients and management",
    ],
  },
  {
    id: "professional",
    name: "Professional Engineer",
    shortName: "P",
    tagline: "For senior engineers and lead designers.",
    priceMonthly: `SAR 41 / month`,
    priceYearly: "",
    features: [
      "Everything in Engineer",
      "Advanced designs, equations, formulas, design checks",
      "Finite element & modeling assesment (where available)",
      "ITP & QA/QC checklist templates analysis",
      "BOQ & quantities take-off review",
    ],
  },
  {
    id: "consultant",
    name: "Consultant Engineer",
    shortName: "C",
    tagline: "For consultants and firms managing full projects.",
    priceMonthly: `SAR 79 / month`,
    priceYearly: "",
    features: [
      "Everything in Professional Engineer",
      "Equipment list & BOQ analysis",
      "Value Engineering outlines",
      "Resource & cost estimation & schedule check",
      "Project dashboards and portfolio overview",
    ],
  },
];
