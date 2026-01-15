export type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export const PLANS = [
  {
    id: "assistant",
    name: "Assistant",
    shortName: "A",
    tagline: "Ideal for students and junior engineers.",
    priceMonthly: "Free",
    features: [
      "Basic engineering Q&A",
      "Limited daily messages",
      "No file or image upload",
    ],
  },
  {
    id: "engineer",
    name: "Engineer",
    shortName: "E",
    tagline: "For practicing engineers who need analysis and assessment.",
    priceMonthly: "SAR 19 / month",
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
    name: "Professional",
    shortName: "P",
    tagline: "For senior engineers and lead designers.",
    priceMonthly: "SAR 41 / month",
    features: [
      "Everything in Engineer",
      "Advanced designs, equations, formulas, design checks",
      "Finite element & modeling assessment (where available)",
      "ITP & QA/QC checklist templates analysis",
      "BOQ & quantities take-off review",
    ],
  },
  {
    id: "consultant",
    name: "Consultant",
    shortName: "C",
    tagline: "For consultants and firms managing full projects.",
    priceMonthly: "SAR 79 / month",
    features: [
      "Full engineering tools",
      "Everything in Professional Engineer",
      "Equipment list & BOQ analysis",
      "Value Engineering outlines",
      "Resource & cost estimation & schedule check",
      "Project dashboards and portfolio overview",
      "Client-ready outputs",
    ],
  },
] as const;
