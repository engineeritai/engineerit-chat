import type { Messages } from "./types";
import { playbooksFor } from "@/lib/playbooks";
import type { AdvisorId } from "@/lib/advisors";

const en: Messages = {
  advisors: {
    sectionTitle: "AI Advisors",
    ecosystem: "engineerit AI › AI Advisors",
    ecosystemTitle: "Ecosystem",
    ecosystemTagline: "From Strategy to Assured Delivery",
    ecosystemAi: "engineerit AI",
    ecosystemAdvisors: "AI Advisors",
    ecosystemTracks: "PMO, Program Assurance, Operations Readiness, Decision Support",
    ecosystemOutcomesLabel: "Outcomes",
    ecosystemOutcomes:
      "Capital project assessments, charters, cost and schedule, vendor evaluation, TBE, IKTVA, interface registers, execution health, stage-gate reviews, commissioning, start-up and regularisation, handover dossiers, and executive decision briefs.",
    ecosystemOutcomesShort:
      "Capital assessments, execution health, handover, and decision briefs.",
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
      "AI Advisors sit above chat and engineer tools: PMO, Program Assurance, Operations Readiness, and Decision Support. One-click playbooks turn uploaded files into export-ready reports.",
    homeCta: "Explore AI Advisors",
    notFound: "That advisor does not exist.",
    capabilitiesTitle: "What this advisor prepares",
    playbooksTitle: "Playbooks",
    playbookHint: "One click builds the report from the attached files.",
    playbookRun:
      "Run the {name} playbook. Produce the export-ready report from the uploaded files and this conversation.",
    playbookGroups: {
      controls: "Project controls",
      procurement: "Procurement & Supply Chain",
      program: "Program oversight",
      execution: "Execution Health",
      capital: "Opens the chain",
    },
    items: {
      pmo: {
        name: "PMO Advisor",
        flowLabel: "PMO",
        track: "PMO",
        summary:
          "The project inside battery limits: charter, schedule, cost, risk, RACI, and status, plus a Procurement & Supply Chain group for vendor evaluation, TBE, RFQ/RFP packages, long-lead tracking, and IKTVA.",
        capabilities: [
          "Charter, schedule, and cost inside battery limits",
          "Risk register, RACI, and status with RAG",
          "Vendor evaluation and technical bid evaluation",
          "RFQ/RFP packages, long-lead tracking, and IKTVA",
        ],
        playbooks: {
          charter: {
            name: "Project Charter",
            outcome: "ISBL scope, objectives, milestones, and a charter RAG.",
          },
          schedule: {
            name: "Schedule Health Check",
            outcome: "Inside-battery-limit logic, float, and the critical path.",
          },
          cost: {
            name: "Cost Report",
            outcome: "Baseline, forecast, variance, and commitments.",
          },
          risk: {
            name: "Risk Register",
            outcome: "Scored project risks, owners, and responses.",
          },
          raci: {
            name: "RACI",
            outcome: "One accountable owner per activity, with gaps flagged.",
          },
          status: {
            name: "Monthly Status Report",
            outcome: "Period RAG for schedule, cost, and scope.",
          },
          vendor: {
            name: "Vendor Evaluation",
            outcome: "Prequalification matrix with pass/fail and RAG.",
          },
          tbe: {
            name: "TBE",
            outcome: "Technical scores, deviations, and who is acceptable.",
          },
          rfq: {
            name: "RFQ / RFP Package",
            outcome: "Issue checklist for scope, specs, and bid rules.",
          },
          "long-lead": {
            name: "Long-Lead Tracker",
            outcome: "Need date, promised date, float, and expediting.",
          },
          iktva: {
            name: "IKTVA",
            outcome: "Local-content targets, evidence, and the gap to the plan.",
          },
        },
      },
      assurance: {
        name: "Program Assurance Advisor",
        flowLabel: "Program Assurance",
        track: "Assurance",
        summary:
          "Program oversight across projects, including outside-battery-limit interfaces: utilities, demand, stakeholders, and external dependencies. Interface register, stakeholder map, OSBL dependency tracker, stage-gate and assurance reviews, and Execution Health checks for schedule, cost, risk, and quality.",
        capabilities: [
          "Interface register for utilities, demand, stakeholders, and external dependencies",
          "Stakeholder map and OSBL dependency tracker",
          "Stage-gate and assurance reviews across the program",
          "Execution Health: schedule, cost, risk, and quality RAG across projects",
        ],
        playbooks: {
          interface: {
            name: "Interface Register",
            outcome: "Utilities, demand, stakeholders, and external dependencies.",
          },
          stakeholder: {
            name: "Stakeholder Map",
            outcome: "Interest, influence, and the owner for each stakeholder.",
          },
          osbl: {
            name: "OSBL Dependency Tracker",
            outcome: "Outside-battery-limit needs, dates, and the impact if late.",
          },
          "stage-gate": {
            name: "Stage-Gate Review",
            outcome: "Program gate decision: proceed, hold, or recycle.",
          },
          "assurance-review": {
            name: "Assurance Review",
            outcome: "Cross-project assurance opinion with conditions.",
          },
          "schedule-health": {
            name: "Schedule Health",
            outcome: "Program schedule RAG and the projects that drive the finish.",
          },
          "cost-health": {
            name: "Cost Health",
            outcome: "Program cost RAG, variance, and contingency.",
          },
          "risk-health": {
            name: "Risk Health",
            outcome: "Cross-project risks with a RAG band.",
          },
          "quality-health": {
            name: "Quality Health",
            outcome: "Design, inspection, NCR, and handover quality RAG.",
          },
        },
      },
      operations: {
        name: "Operations Readiness Advisor",
        flowLabel: "Operations Readiness",
        track: "Operations",
        summary:
          "Testing, commissioning, handover, start-up, and regularisation of operation: the transition to steady-state operations, performance tests, operating KPIs, and the warranty and defects period, plus permits, offtakers, capacity, and O&M readiness.",
        capabilities: [
          "Testing, commissioning, and handover dossiers",
          "Start-up and regularisation of operation",
          "Performance tests, operating KPIs, and the warranty and defects period",
          "Punch lists, permits, offtakers, capacity, and O&M readiness",
        ],
        playbooks: {
          testing: {
            name: "Testing & Pre-commissioning",
            outcome: "Test results and whether the next step can start.",
          },
          handover: {
            name: "Mechanical Completion & Handover Dossiers",
            outcome: "Certificates, as-builts, dossiers, and accepted punch.",
          },
          commissioning: {
            name: "Commissioning Plan",
            outcome: "Sequence through commissioning and ready for start-up.",
          },
          startup: {
            name: "Start-up & Regularisation of Operation",
            outcome: "Steady-state transition, performance tests, KPIs, and warranty.",
          },
          punch: {
            name: "Punch List Tracker",
            outcome: "Categorized punch and what still blocks handover.",
          },
          alignment: {
            name: "Permits, Offtakers & Capacity",
            outcome: "Regulators, customers, offtake, and capacity alignment.",
          },
          om: {
            name: "O&M Readiness",
            outcome: "Spares, procedures, training matrix, and maintenance.",
          },
        },
      },
      decision: {
        name: "Decision Support Advisor",
        flowLabel: "Decision Support",
        track: "Decision",
        summary:
          "Opens with Capital Projects Assessment: business case, technical commercial and schedule feasibility, CAPEX and OPEX, funding (equity, project finance, PPP, government or PIF, grants), strategy and customer alignment, options, and a stage-gate go or no-go.",
        capabilities: [
          "Capital Projects Assessment: feasibility, funding, and a stage-gate go or no-go",
          "CAPEX and OPEX evaluation from source figures",
          "Alignment with strategy and governance",
          "Audits, investment and options analysis, MCDA, and executive briefs",
        ],
        playbooks: {
          "capital-assessment": {
            name: "Capital Projects Assessment",
            outcome: "Feasibility, funding, strategy and customer fit, and go or no-go.",
          },
          "capex-opex": {
            name: "CAPEX & OPEX Evaluation",
            outcome: "Capital and operating cost from figures in the file.",
          },
          strategy: {
            name: "Strategy & Governance Alignment",
            outcome: "Fit to strategy and the forum that must approve.",
          },
          audit: {
            name: "Audit",
            outcome: "Findings that condition the investment decision.",
          },
          options: {
            name: "Investment & Options Analysis",
            outcome: "Comparable investment options with strategic fit.",
          },
          mcda: {
            name: "MCDA Matrix",
            outcome: "Weights that sum to 100 and a weighted total.",
          },
          brief: {
            name: "Executive Decision Brief",
            outcome: "The decision, the recommendation, and the ask.",
          },
        },
      },
    },
  },
  gating: {
    lockedTitle: "AI Advisors are locked on this plan",
    lockedBody:
      "PMO, Program Assurance, Operations Readiness, and Decision Support are included on Consultant, Team, and Enterprise. You can preview the playbooks and report templates here.",
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
      "AI Advisors: PMO, Program Assurance, Operations Readiness, and Decision Support",
    advisorsLocked:
      "AI Advisors (locked): PMO, Program Assurance, Operations Readiness, and Decision Support — included on Consultant, Team, and Enterprise",
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
assertPlaybooks("assurance", en.advisors.items.assurance.playbooks);
assertPlaybooks("operations", en.advisors.items.operations.playbooks);
assertPlaybooks("decision", en.advisors.items.decision.playbooks);

function assertPlaybooks(advisorId: AdvisorId, copy: Record<string, { name: string }>) {
  for (const playbook of playbooksFor(advisorId)) {
    if (!copy[playbook.id]?.name) {
      throw new Error(`Missing English playbook copy: ${advisorId}.${playbook.id}`);
    }
  }
}

export default en;
