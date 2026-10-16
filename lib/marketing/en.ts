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
    openChat: "Open chat",
  },
  hero: {
    kicker: "Saudi Arabia and the GCC",
    h1: "engineerit.ai engineers any idea, topic or subject with a structured approach",
    lead:
      "Attach files, pick a tool, and get structured answers. Paid plans add exports.",
    primaryCta: "Open chat",
    secondaryCta: "View pricing",
    tertiaryCta: "Request a team pilot",
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
    title: "For teams and consultancies",
    intro:
      "Individual plans are for one person. A team pilot is for a firm that wants shared projects, an admin, and seats for the people doing the work.",
    consultantTier: "Consultant-tier features for {seats} seats",
    teamBullet:
      "Team is {teamMonthly} per month for {seats} seats. An extra seat is {extraMonthly} per month, with shared projects and an admin.",
    enterpriseBullet:
      "Enterprise starts from {enterpriseMonthly} per month and includes SSO, priority support, and custom standards.",
    annualBullet:
      "Annual billing is ten times the monthly price, which is two months free. Ask for it in the pilot request.",
    regionBullet:
      "Aimed at consultancies working in Saudi Arabia and the wider GCC, in the disciplines and standards those projects use.",
    cta: "Request a team pilot",
    formTitle: "Request a team pilot",
    formNote:
      "This form opens an email to us. It does not create an account or start a payment.",
    name: "Name",
    email: "Work email",
    company: "Company",
    message: "What do you want to try?",
    messagePlaceholder: "Disciplines, team size, and the kind of projects you deliver.",
    submit: "Request a team pilot",
    opened: "Your email app should open with this request.",
    mailtoFallback: "Or email us directly",
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
        question: "Does a team pilot replace our engineers?",
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
          "Monthly individual plans are paid when you subscribe. Team, Enterprise, and annual billing are arranged by email. Use Request a team pilot or contact us.",
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
  },
  closing: {
    title: "Start with a question, or ask for a pilot",
    body: "Engineers can open the chat now. Consultancies can request a team pilot and we will reply by email.",
    primaryCta: "Open chat",
    secondaryCta: "Request a team pilot",
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
      "Assistant Engineer, Engineer, Professional Engineer, and Consultant Engineer are monthly plans. Team, Enterprise, and annual billing are arranged with us.",
    monthly: "Monthly",
    annual: "Annual",
    twoMonthsFree: "2 months free",
    annualExplainer:
      "Annual price is ten times the monthly price, which is two months free. Team, Enterprise, and annual plans are arranged by email.",
    usdNote: "US dollar amounts are approximate, at SAR 3.75 per USD 1.",
    vatNote: "Prices include VAT.",
    individualTitle: "Individual plans",
    individualIntro: "Assistant Engineer, Engineer, Professional Engineer, and Consultant Engineer.",
    firmTitle: "Team and Enterprise",
    firmIntro: "For consultancies. Contact us to get started.",
    perMonth: "/ month",
    perYear: "/ year",
    from: "From",
    free: "Free",
    approx: "approx.",
    forSeats: "For {seats} seats",
    extraSeat: "Extra seat",
    startFree: "Start free",
    createAccount: "Create account",
    requestAnnual: "Request annual billing",
    requestPilot: "Request a team pilot",
    contactUs: "Contact us",
    consultantTier: "Consultant-tier features for {seats} seats",
    sharedProjects: "Shared projects",
    admin: "Admin for the team",
    sso: "SSO",
    prioritySupport: "Priority support",
    customStandards: "Custom standards",
    contactScope: "Scope agreed when you contact us",
    featuresTitle: "Included",
    notInApp: "Arranged with our team.",
    seeChat: "Open chat",
  },
};
