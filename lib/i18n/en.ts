import type { Messages } from "./types";
import { playbooksFor } from "@/lib/playbooks";
import type { AdvisorId } from "@/lib/advisors";

const en: Messages = {
  advisors: {
    sectionTitle: "AI Advisors",
    ecosystem: "engineerit AI › AI Advisors",
    ecosystemTitle: "Ecosystem",
    ecosystemAi: "engineerit AI",
    ecosystemAdvisors: "AI Advisors",
    ecosystemTracks: "PMO, Supply Chain, Program Assurance, Decision Support",
    ecosystemOutcomesLabel: "Outcomes",
    ecosystemOutcomes:
      "Charters, status reports, risk registers, schedule health, RACI, vendor evaluation, TBE, procurement plans, long-lead trackers, stage-gate reviews, design checklists, RAG audits, options analysis, MCDA, decision briefs, and cost-benefit.",
    ecosystemOutcomesShort:
      "Charters, TBE, long-lead trackers, RAG reports, and decision briefs.",
    landingNav: "All advisors",
    landingTitle: "AI Advisors",
    landingSubtitle:
      "A layer above chat and engineer tools. Each advisor runs one-click playbooks that turn uploaded files into an export-ready report: tables, a RAG rating, and an executive summary.",
    open: "Open advisor",
    preview: "View locked preview",
    lockedBadge: "Locked",
    includedBadge: "Included",
    outputTemplate: "Report template",
    askPlaceholder: "Add a note, or attach a file and run a playbook…",
    emptyState:
      "Attach a project file, then run a playbook. The report is structured for copy, share, and export.",
    backToAdvisors: "All AI Advisors",
    layerNote: "engineerit AI › AI Advisors ›",
    homeWelcome:
      "AI Advisors sit above chat and engineer tools: PMO, Supply Chain, Program Assurance, and Decision Support. One-click playbooks turn uploaded files into export-ready reports.",
    homeCta: "Explore AI Advisors",
    notFound: "That advisor does not exist.",
    capabilitiesTitle: "What this advisor prepares",
    playbooksTitle: "Playbooks",
    playbookHint: "One click builds the report from the attached files.",
    playbookRun:
      "Run the {name} playbook. Produce the export-ready report from the uploaded files and this conversation.",
    items: {
      pmo: {
        name: "PMO Advisor",
        flowLabel: "PMO",
        track: "PMO",
        summary:
          "Project plans, work breakdown structures, schedules, RACI, risk registers, and progress or status reports from uploaded files.",
        capabilities: [
          "Project charters and control baselines",
          "Monthly status with schedule, cost, and scope RAG",
          "Risk registers and schedule health checks",
          "RACI matrices with a single accountable owner",
        ],
        playbooks: {
          charter: {
            name: "Project Charter",
            outcome: "Scope, objectives, milestones, and a charter RAG.",
          },
          status: {
            name: "Monthly Status Report",
            outcome: "Period RAG, variances, and decisions needed.",
          },
          risk: {
            name: "Risk Register",
            outcome: "Scored risks, owners, responses, and a RAG band.",
          },
          schedule: {
            name: "Schedule Health Check",
            outcome: "Logic, float, critical path, and recovery items.",
          },
          raci: {
            name: "RACI",
            outcome: "One accountable owner per activity, with gaps flagged.",
          },
        },
      },
      assurance: {
        name: "Program Assurance Advisor",
        flowLabel: "Program Assurance",
        track: "Assurance",
        summary:
          "Governance and stage-gate reviews, design and deliverable reviews, compliance checklists, audit findings, lessons learned, and assurance reports with RAG ratings.",
        capabilities: [
          "Stage-gate decisions with conditions",
          "Design review and compliance checklists",
          "Audit reports with severity and RAG",
          "Lessons learned that name what to repeat or avoid",
        ],
        playbooks: {
          "stage-gate": {
            name: "Stage-Gate Review",
            outcome: "Gate criteria, evidence, and proceed / hold / recycle.",
          },
          "design-review": {
            name: "Design Review Checklist",
            outcome: "Deliverables scored Met, Partial, or Gap.",
          },
          audit: {
            name: "Audit Report",
            outcome: "Findings, owners, due dates, and an overall RAG.",
          },
          compliance: {
            name: "Compliance Checklist",
            outcome: "Requirements tied to evidence, or marked as a gap.",
          },
          lessons: {
            name: "Lessons Learned",
            outcome: "Reusable lessons with an owner and where they apply.",
          },
        },
      },
      decision: {
        name: "Decision Support Advisor",
        flowLabel: "Decision Support",
        track: "Decision",
        summary:
          "Options analysis, multi-criteria decision matrices, cost-benefit analysis, risk-based recommendations, and executive decision briefs.",
        capabilities: [
          "Options, including defer or do nothing when it is real",
          "Weighted MCDA matrices and cost-benefit from source figures",
          "Executive briefs a decision owner can act on",
        ],
        playbooks: {
          options: {
            name: "Options Analysis",
            outcome: "Comparable options with pros, cons, and readiness.",
          },
          mcda: {
            name: "MCDA Matrix",
            outcome: "Weights that sum to 100 and a weighted total.",
          },
          brief: {
            name: "Executive Decision Brief",
            outcome: "The decision, the recommendation, and the ask.",
          },
          cba: {
            name: "Cost-Benefit",
            outcome: "Cost, benefit, and net from figures in the file.",
          },
        },
      },
      supply: {
        name: "Supply Chain & Procurement Advisor",
        flowLabel: "Supply Chain",
        track: "Supply Chain",
        summary:
          "Procurement strategy, vendor prequalification, technical bid evaluation, RFQ/RFP packages, long-lead tracking, expediting, IKTVA and logistics risk, and supply chain risk registers.",
        capabilities: [
          "Vendor prequalification and evaluation matrices",
          "Technical bid evaluation kept separate from price",
          "RFQ/RFP packages and procurement plans",
          "Long-lead tracking, expediting, IKTVA, and logistics risk",
        ],
        playbooks: {
          vendor: {
            name: "Vendor Evaluation",
            outcome: "Prequalification matrix with pass/fail and RAG.",
          },
          tbe: {
            name: "TBE",
            outcome: "Technical scores, deviations, and who is acceptable.",
          },
          "procurement-plan": {
            name: "Procurement Plan",
            outcome: "Packages, route, need dates, and IKTVA notes.",
          },
          "long-lead": {
            name: "Long-Lead Tracker",
            outcome: "Need date, promised date, float, and expediting.",
          },
          rfq: {
            name: "RFQ / RFP Package",
            outcome: "Issue checklist for scope, specs, and bid rules.",
          },
          risk: {
            name: "Supply Chain Risk Register",
            outcome: "Vendor, lead-time, logistics, and IKTVA risks.",
          },
        },
      },
    },
  },
  gating: {
    lockedTitle: "AI Advisors are locked on this plan",
    lockedBody:
      "PMO, Supply Chain, Program Assurance, and Decision Support are included on Consultant, Team, and Enterprise. You can preview the playbooks and report templates here.",
    upgradeCta: "Upgrade",
    compareCta: "Compare plans",
    registerCta: "Register",
    loginCta: "Login",
    close: "Close",
    upgradeRequired: "Upgrade required",
    registerRequired: "Register / Login required",
    sendLocked:
      "Upgrade to Consultant, Team, or Enterprise to run playbooks and attach files.",
  },
  pricing: {
    title: "Plans and AI Advisors",
    subtitle:
      "Feature lists for each plan. AI Advisors are a separate layer from engineer tools and are included on Consultant, Team, and Enterprise.",
    advisorsIncluded:
      "AI Advisors: PMO, Supply Chain, Program Assurance, and Decision Support",
    advisorsLocked:
      "AI Advisors (locked): PMO, Supply Chain, Program Assurance, and Decision Support — included on Consultant, Team, and Enterprise",
    availabilityTitle: "AI Advisors by plan",
    availabilityNote:
      "Access is config-driven. Consultant, Team, and Enterprise include every advisor and playbook. Free, Engineer, and Professional keep a locked preview.",
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

assertPlaybooks("pmo", en.advisors.items.pmo.playbooks);
assertPlaybooks("supply", en.advisors.items.supply.playbooks);
assertPlaybooks("assurance", en.advisors.items.assurance.playbooks);
assertPlaybooks("decision", en.advisors.items.decision.playbooks);

function assertPlaybooks(advisorId: AdvisorId, copy: Record<string, { name: string }>) {
  for (const playbook of playbooksFor(advisorId)) {
    if (!copy[playbook.id]?.name) {
      throw new Error(`Missing English playbook copy: ${advisorId}.${playbook.id}`);
    }
  }
}

export default en;
