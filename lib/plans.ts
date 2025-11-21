// lib/plans.ts
export type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export type PlanInfo = {
  id: PlanId;
  name: string;
  shortName: string;
  priceMonthly: string;
  priceYearly: string;
  tagline: string;
  features: string[];
};

export const PLANS: PlanInfo[] = [
  {
    id: "assistant",
    name: "Assistant Engineer",
    shortName: "Assistant",
    priceMonthly: "Free",
    priceYearly: "Free",
    tagline: "Ideal for students and junior engineers.",
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
    shortName: "Engineer",
    priceMonthly: "SAR 15 / month",
    priceYearly: "SAR 131 / year (27% off)",
    tagline: "For practicing engineers who need faster documentation.",
    features: [
      "Everything in Assistant Engineer",
      "Export Word, Excel, PowerPoint outputs",
      "ITP & QA/QC checklist templates",
      "IFC package generation (draft deliverables)",
    ],
  },
  {
    id: "professional",
    name: "Professional Engineer",
    shortName: "Professional",
    priceMonthly: "SAR 39 / month",
    priceYearly: "SAR 342 / year (27% off)",
    tagline: "For senior engineers and lead designers.",
    features: [
      "Everything in Engineer",
      "Advanced designs, equations, formulas, design checks",
      "Finite element & modeling (where available)",
      "Advanced PFD / P&ID graph and engineering views",
    ],
  },
  {
    id: "consultant",
    name: "Consultant Engineer",
    shortName: "Consultant",
    priceMonthly: "SAR 79 / month",
    priceYearly: "SAR 692 / year (27% off)",
    tagline: "For consultants and firms managing full projects.",
    features: [
      "Everything in Professional Engineer",
      "Equipment list & BOQ extraction",
      "Value Engineering packages",
      "Resource & cost estimation & schedule generator",
      "Project dashboards and portfolio overview",
    ],
  },
];
// lib/plans.ts

export type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export type Plan = {
  id: PlanId;
  name: string;
  shortName: string;
  tagline: string;
  priceMonthly: string;
  priceYearly: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "assistant",
    name: "Assistant Engineer",
    shortName: "Assistant",
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
    shortName: "Engineer",
    tagline: "For practicing engineers who need faster documentation.",
    // NEW PRICING (Saudi Riyal symbol ﷼)
    priceMonthly: "﷼ 19 / month",
    priceYearly: "﷼ 205 / year (10% off)",
    features: [
      "Everything in Assistant Engineer",
      "Export Word, Excel, PowerPoint outputs",
      "Technical Report generator",
      "Calculation Sheet generator",
      "Presentation Outline generator",
    ],
  },
  {
    id: "professional",
    name: "Professional Engineer",
    shortName: "Professional",
    tagline: "For senior engineers and lead designers.",
    // NEW PRICING
    priceMonthly: "﷼ 41 / month",
    priceYearly: "﷼ 428 / year (13% off)",
    features: [
      "Everything in Engineer",
      "Advanced designs, equations, formulas, design checks",
      "Finite element & modeling (where available)",
      "Advanced PFD / P&ID graph and engineering views",
      "ITP & QA/QC checklist templates",
      "BOQ & quantities extraction",
    ],
  },
  {
    id: "consultant",
    name: "Consultant Engineer",
    shortName: "Consultant",
    tagline: "For consultants and firms managing full projects.",
    // NEW PRICING
    priceMonthly: "﷼ 79 / month",
    priceYearly: "﷼ 787 / year (17% off)",
    features: [
      "Everything in Professional Engineer",
      "Equipment list & BOQ extraction",
      "Value Engineering packages",
      "Resource & cost estimation & schedule generator",
      "Project dashboards and portfolio overview",
    ],
  },
];
