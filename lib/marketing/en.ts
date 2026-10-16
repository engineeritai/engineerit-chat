import type { MarketingContent } from "@/lib/marketing/types";

export const en: MarketingContent = {
  locale: "en",
  dir: "ltr",
  htmlLang: "en",
  nav: {
    primary: "Primary",
    menu: "Open menu",
    disciplines: "Disciplines",
    tools: "Tools",
    how: "How it works",
    teams: "For teams",
    pricing: "Pricing",
    login: "Login",
    openChat: "Open chat",
  },
  hero: {
    kicker: "Saudi Arabia and the GCC",
    h1: "engineerit.ai engineers any idea, topic or subject with a structured approach",
    lead:
      "Attach files, pick a tool, and get structured answers. Paid plans add exports.",
    primaryCta: "Open chat",
    secondaryCta: "View pricing",
    tertiaryCta: "Buy Team",
    panelTitle: "Chat is one click away",
    panelBody:
      "Attach a file, pick a tool, and get a structured answer. Paid plans add exports.",
  },
  trust: {
    kicker: "Verified store",
    title: "Listed with the Saudi Business Center",
    body: "engineerit.ai publishes the same verification details already shown in the product.",
    authLabel: "Auth No.",
    verify: "Verify via Saudi Business Center",
  },
  disciplines: {
    title: "Disciplines your consultancy already staffs",
    intro:
      "The chat assistant uses the same discipline list as the product. Choose one before you ask so the answer stays inside that field.",
    summaries: {
      General:
        "Cross-discipline questions when the work does not sit in a single department.",
      "Civil Engineering":
        "Structures, site works, and civil packages typical of consultancy deliverables.",
      "Mechanical Engineering":
        "Equipment, HVAC, piping, and mechanical design reviews.",
      "Electrical Engineering":
        "Power systems, substations, and electrical design checks.",
      "Chemical Engineering":
        "Process chemistry, materials, and plant process questions.",
      Instrumentation:
        "Loops, control systems, and instrument data.",
      "Process Engineering":
        "PFDs, P&IDs, and process design narratives.",
      Geotechnical:
        "Ground conditions, foundations, and site investigation reviews.",
      "Mining Engineering":
        "Mining methods, materials handling, and mine infrastructure.",
      Architectural:
        "Layouts, spatial coordination, and architectural drawing reviews.",
      "Project Engineering":
        "Interfaces, actions, and coordination across packages.",
      "Value Engineering":
        "Options that trade cost, function, and specification.",
      Survey: "Survey inputs, coordinates, and site measurement questions.",
      Exploration: "Early-stage technical screening and exploration studies.",
      "HSE / HAZOP":
        "Safety studies, HAZOP-style reviews, and HSE documentation.",
    },
  },
  tools: {
    title: "Seven engineer tools",
    intro:
      "Each tool inserts a starting brief in the chat. Which tools you can run depends on the individual plan, the same way it does in the app.",
    summaries: {
      drawing:
        "Explain and analyze an engineering drawing, PFD, P&ID, or block diagram.",
      design: "Check a design against the codes and standards that apply.",
      itp: "Draft an inspection and test plan and a QA/QC checklist.",
      boq: "Propose a structured bill of quantities with items and units.",
      schedule: "Build a high-level schedule and look at resource needs.",
      value: "Run a value engineering review of the options in front of you.",
      dashboard: "Summarize KPIs, risks, and actions for a project review.",
    },
    availability: {
      drawing: "From the Engineer plan",
      design: "From the Engineer plan",
      itp: "From the Professional Engineer plan",
      boq: "From the Professional Engineer plan",
      schedule: "Consultant Engineer plan",
      value: "Consultant Engineer plan",
      dashboard: "Consultant Engineer plan",
    },
  },
  how: {
    title: "How it works",
    intro: "Three steps from a blank chat to something your team can review.",
    steps: [
      {
        title: "Pick a discipline",
        body: "Open the chat and choose the field the question belongs to, from civil and process through HSE.",
      },
      {
        title: "Ask, or start from a tool",
        body: "Type the question, attach a drawing or document on a paid plan, or insert a brief from an engineer tool.",
      },
      {
        title: "Review, then share or export",
        body: "Use the answer in your own check. Paid plans can copy and share. Higher plans export PDF, Word, or PowerPoint.",
      },
    ],
  },
  audiences: {
    title: "Who it is for",
    intro: "The same assistant, used differently by a firm, a working engineer, and a student.",
    items: [
      {
        title: "Engineering consultancies",
        body: "Speed up first-pass reviews of drawings, ITPs, quantities, and client dashboards without adding another seat to every job.",
      },
      {
        title: "Practicing engineers",
        body: "Get a structured starting point for design checks, calculation reviews, and technical writing during the week.",
      },
      {
        title: "Students",
        body: "Learn how a question is framed in a discipline, on the free Assistant Engineer plan.",
      },
    ],
  },
  teams: {
    title: "Plans and pricing",
    intro:
      "Assistant Engineer, Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise use these prices on every page. Annual billing is 10 times the monthly price. Team and Enterprise are bought through Moyasar and renew automatically. Consultant Engineer, Team, and Enterprise include AI Advisors (included at launch).",
  },
  faq: {
    title: "Questions consultancies ask",
    intro: "Short answers. The pricing page has the plan amounts.",
    items: [
      {
        question: "Can I try the chat before I register?",
        answer:
          "Yes. Open chat is available without an account. Guests receive one reply a day. The free Assistant Engineer plan includes three replies a day. Engineer, Professional Engineer, and Consultant Engineer are not capped by that daily limit.",
      },
      {
        question: "Does Team replace our engineers?",
        answer:
          "No. engineerit.ai assists the people in your firm. A qualified engineer remains responsible for the design and for what is issued to a client.",
      },
      {
        question: "Which standards can it refer to?",
        answer:
          "Where it fits the question, answers can refer to international codes and to Saudi references such as the Saudi Building Code, SASO, Saudi Aramco standards, and Saudi Electricity regulations. Your team still confirms the clause that applies to the project.",
      },
      {
        question: "How do Team, Enterprise, and annual billing get paid?",
        answer:
          "Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise are paid through Moyasar, monthly or annual, and renew automatically until you cancel in billing. Annual price is 10 times the monthly price. Enterprise is SAR 2,500 per month for 10 seats, with an extra seat at SAR 199 per month. Consultant Engineer, Team, and Enterprise include AI Advisors (included at launch).",
      },
      {
        question: "How do I change the interface language?",
        answer:
          "Use the language control in the header. Chat replies follow that language unless you write in the other one.",
      },
      {
        question: "Where is the company verification?",
        answer:
          "The Saudi Business Center auth number on this page is the same one shown inside the product. Use the verification link to check it on the official inquiry site.",
      },
    ],
    pricesHeading: "Plan prices and features",
  },
  closing: {
    title: "Start with a question, or buy a plan",
    body: "Engineers can open the chat now. Paid plans, Team, and Enterprise are bought through Moyasar and renew automatically.",
    primaryCta: "Open chat",
    secondaryCta: "Buy Team",
  },
  footer: {
    blurb: "AI engineering assistant for consultancies, engineers, and students.",
    policyLead: "Use of engineerit as per",
    policyLink: "User Policy & Agreement",
    rights: "All rights reserved.",
    contact: "Contact",
    register: "Register",
    privacy: "Privacy",
    refunds: "Refunds",
  },
  pricing: {
    title: "Plans and pricing",
    intro:
      "Assistant Engineer, Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise. Monthly and annual prices match registration and billing.",
    monthly: "Monthly",
    annual: "Annual",
    twoMonthsFree: "2 months free",
    annualExplainer:
      "Annual price is 10 times the monthly price (2 months free). Paid plans open Moyasar checkout and renew automatically until you cancel.",
    usdNote: "US dollar amounts are approximate, at SAR 3.75 per USD 1.",
    vatNote: "",
    individualTitle: "Individual plans",
    individualIntro:
      "Assistant Engineer, Engineer, Professional Engineer, and Consultant Engineer. Same names, prices, and features as registration.",
    firmTitle: "Team and Enterprise",
    firmIntro:
      "Team includes 5 seats. Enterprise includes 10 seats at SAR 2,500 per month. Extra seats are charged on the saved card. Both renew automatically and include AI Advisors (included at launch).",
    approx: "approx.",
  },
};
