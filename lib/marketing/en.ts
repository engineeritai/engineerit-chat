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
    advisors: "AI Advisors",
    pricing: "Pricing",
    faq: "Questions",
    login: "Login",
    openChat: "Start chatting",
    startChat: "Start chatting",
    continueChat: "Continue to chat",
  },
  hero: {
    kicker: "Saudi Arabia and the GCC",
    h1: "engineerit.ai engineers any idea, topic or subject with a structured approach",
    lead:
      "Attach files, pick a tool, and get structured answers. Paid plans add exports.",
    primaryCta: "Start chatting",
    askPlaceholder: "Ask an engineering question…",
    askSend: "Send",
    chips: [
      "Review a drawing for clashes",
      "Draft a method statement",
      "Check a specification",
      "Summarize report risks",
    ],
    secondaryCta: "View pricing",
    tertiaryCta: "Subscribe",
    panelTitle: "Chat is one click away",
    panelBody:
      "Attach a file, pick a tool, and get a structured answer. Paid plans add exports.",
  },
  trust: {
    kicker: "Verified store",
    title: "Listed with the Saudi Business Center",
    body: "engineerit.ai is registered with the Saudi Business Center. Confirm the number below on the official site.",
    authLabel: "Auth No.",
    verify: "Verify via Saudi Business Center",
  },
  disciplines: {
    title: "Disciplines your consultancy already staffs",
    intro:
      "Choose the discipline your question belongs to so the answer stays in that field.",
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
      "Each tool starts a brief in the chat. Your plan decides which tools you can run.",
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
      "Assistant Engineer, Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise use these prices on every page. Annual billing is 10 times the monthly price. Team and Enterprise are bought through Moyasar and renew automatically. Consultant Engineer includes the PMO Advisor. Team includes PMO and Program Assurance. Enterprise includes all four advisors.",
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
          "Engineer is SAR 190 per year, Professional Engineer SAR 410 per year, and Consultant Engineer SAR 990 per year. Team is SAR 499 per month or SAR 4,990 per year for 5 seats, plus SAR 89 per extra seat. Enterprise is SAR 3,900 per month or SAR 39,000 per year for 10 seats, plus SAR 299 per extra seat. All are paid through Moyasar and renew until you cancel. Consultant Engineer includes the PMO Advisor. Team includes PMO and Program Assurance. Enterprise includes PMO, Program Assurance, Operations Readiness, and Decision Support.",
      },
      {
        question: "How do I change the interface language?",
        answer:
          "Use the language control in the header. Chat replies follow that language unless you write in the other one.",
      },
      {
        question: "Where is the company verification?",
        answer:
          "Our Saudi Business Center registration number is on this page. Use the verification link to confirm it on the official site.",
      },
    ],
    pricesHeading: "Plan prices and features",
  },
  closing: {
    title: "Start with a question, or buy a plan",
    body: "Engineers can open the chat now. Paid plans, Team, and Enterprise are bought through Moyasar and renew automatically.",
    primaryCta: "Start chatting",
    secondaryCta: "Subscribe",
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
    rateNote: "Prices in Saudi Riyal. 1 USD = 3.75 SAR. VAT as applicable.",
    individualTitle: "Individual plans",
    individualIntro:
      "Assistant Engineer, Engineer, Professional Engineer, and Consultant Engineer. Same names, prices, and features as registration.",
    firmTitle: "Team and Enterprise",
    firmIntro:
      "Team is SAR 499 per month or SAR 4,990 per year for 5 seats, plus SAR 89 per extra seat, and includes PMO and Program Assurance. Enterprise is SAR 3,900 per month or SAR 39,000 per year for 10 seats, plus SAR 299 per extra seat, and includes PMO, Program Assurance, Operations Readiness, and Decision Support. Extra seats are charged on the saved card. Both renew automatically.",
    approx: "approx.",
  },
};
