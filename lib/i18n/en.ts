import type { Messages } from "./types";

const en: Messages = {
  advisors: {
    sectionTitle: "AI Advisors",
    ecosystem: "engineerit AI › AI Advisors",
    landingNav: "All advisors",
    landingTitle: "AI Advisors",
    landingSubtitle:
      "A layer above chat and engineer tools. Choose a specialist mode for project controls, program assurance, or executive decisions. Each advisor keeps the same file attach, chat, and export pipeline, and answers in a fixed report structure.",
    open: "Open advisor",
    preview: "View locked preview",
    lockedBadge: "Locked",
    includedBadge: "Included",
    outputTemplate: "Output template",
    askPlaceholder: "Ask this advisor, or attach a project file…",
    emptyState:
      "Ask a question or attach a plan, report, or schedule. The reply follows this advisor’s template.",
    backToAdvisors: "All AI Advisors",
    layerNote: "engineerit AI › AI Advisors ›",
    homeWelcome:
      "AI Advisors sit above chat and engineer tools: PMO, Program Assurance, and Decision Support.",
    homeCta: "Explore AI Advisors",
    notFound: "That advisor does not exist.",
    capabilitiesTitle: "What this advisor prepares",
    startersTitle: "Start from a prompt",
    items: {
      pmo: {
        name: "PMO Advisor",
        track: "PMO",
        summary:
          "Project plans, work breakdown structures, schedules, RACI, risk registers, and progress or status reports from uploaded files.",
        capabilities: [
          "Project plans and work breakdown structures",
          "Schedules with logic, dates, and float when the file supports them",
          "RACI matrices with a single accountable owner",
          "Risk registers and responses",
          "Progress and status reports",
        ],
        starters: [
          "Build a WBS and RACI from the attached project plan.",
          "Turn this schedule into a status report with variances.",
          "Draft a risk register from the uploaded file.",
        ],
      },
      assurance: {
        name: "Program Assurance Advisor",
        track: "Governance",
        summary:
          "Governance and stage-gate reviews, design and deliverable reviews, compliance checklists, audit findings, lessons learned, and assurance reports with RAG ratings.",
        capabilities: [
          "Governance and stage-gate reviews",
          "Design and deliverable reviews",
          "Compliance checklists",
          "Audit findings with severity and owners",
          "Lessons learned and assurance reports with RAG ratings",
        ],
        starters: [
          "Run a stage-gate review on the attached design package.",
          "Produce a compliance checklist and an overall RAG rating.",
          "Summarize audit findings and lessons learned.",
        ],
      },
      decision: {
        name: "Decision Support Advisor",
        track: "Decision",
        summary:
          "Options analysis, multi-criteria decision matrices, cost-benefit analysis, risk-based recommendations, and executive decision briefs.",
        capabilities: [
          "Options analysis, including defer or do nothing when relevant",
          "Weighted multi-criteria decision matrices",
          "Cost-benefit analysis from figures in the source",
          "Risk-based recommendations",
          "Executive decision briefs",
        ],
        starters: [
          "Compare these options with a weighted decision matrix.",
          "Prepare a cost-benefit view and a recommendation.",
          "Write an executive decision brief from the attached memo.",
        ],
      },
    },
  },
  gating: {
    lockedTitle: "AI Advisors are locked on this plan",
    lockedBody:
      "PMO, Program Assurance, and Decision Support are included on Consultant, Team, and Enterprise. You can preview the mode and its report template here.",
    upgradeCta: "Upgrade",
    compareCta: "Compare plans",
    registerCta: "Register",
    loginCta: "Login",
    close: "Close",
    upgradeRequired: "Upgrade required",
    registerRequired: "Register / Login required",
    sendLocked:
      "Upgrade to Consultant, Team, or Enterprise to ask AI Advisors and attach files.",
  },
  pricing: {
    title: "Plans and AI Advisors",
    subtitle:
      "Feature lists for each plan. AI Advisors are a separate layer from engineer tools and are included on Consultant, Team, and Enterprise.",
    advisorsIncluded:
      "AI Advisors: PMO, Program Assurance, and Decision Support",
    advisorsLocked:
      "AI Advisors (locked): PMO, Program Assurance, and Decision Support — included on Consultant, Team, and Enterprise",
    availabilityTitle: "AI Advisors by plan",
    availabilityNote:
      "Access is config-driven. Consultant, Team, and Enterprise include every advisor. Free, Engineer, and Professional keep a locked preview.",
    planColumn: "Plan",
    accessColumn: "AI Advisors",
    included: "Included",
    locked: "Locked preview",
    manageCta: "Manage subscription",
    teamEnterpriseNote:
      "Team and Enterprise include AI Advisors. Pricing and checkout for those plans are managed on the subscription page.",
    featureListTitle: "Included in this plan",
  },
  plans: {
    assistant: "Free (Assistant)",
    engineer: "Engineer",
    professional: "Professional",
    consultant: "Consultant",
    team: "Team",
    enterprise: "Enterprise",
  },
};

export default en;
