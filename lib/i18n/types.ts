export type Locale = "en" | "ar";

export type PlaybookCopy = {
  name: string;
  outcome: string;
};

export type AdvisorCopy = {
  name: string;
  /** Short label used in the ecosystem path. */
  flowLabel: string;
  track: string;
  summary: string;
  capabilities: string[];
  playbooks: Record<string, PlaybookCopy>;
};

export type Messages = {
  advisors: {
    sectionTitle: string;
    ecosystem: string;
    ecosystemTitle: string;
    ecosystemTagline: string;
    ecosystemAi: string;
    ecosystemAdvisors: string;
    ecosystemTracks: string;
    ecosystemOutcomesLabel: string;
    ecosystemOutcomes: string;
    ecosystemOutcomesShort: string;
    landingNav: string;
    landingTitle: string;
    landingSubtitle: string;
    open: string;
    preview: string;
    lockedBadge: string;
    includedBadge: string;
    outputTemplate: string;
    askPlaceholder: string;
    emptyState: string;
    backToAdvisors: string;
    layerNote: string;
    homeWelcome: string;
    homeCta: string;
    notFound: string;
    capabilitiesTitle: string;
    playbooksTitle: string;
    playbookHint: string;
    playbookRun: string;
    playbookGroups: {
      controls: string;
      procurement: string;
      program: string;
      execution: string;
      capital: string;
    };
    items: {
      pmo: AdvisorCopy;
      assurance: AdvisorCopy;
      operations: AdvisorCopy;
      decision: AdvisorCopy;
    };
  };
  gating: {
    lockedTitle: string;
    lockedBody: string;
    upgradeCta: string;
    compareCta: string;
    registerCta: string;
    loginCta: string;
    close: string;
    upgradeRequired: string;
    registerRequired: string;
    sendLocked: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    advisorsIncluded: string;
    advisorsLocked: string;
    availabilityTitle: string;
    availabilityNote: string;
    planColumn: string;
    accessColumn: string;
    included: string;
    locked: string;
    manageCta: string;
    teamEnterpriseNote: string;
    featureListTitle: string;
  };
  plans: {
    assistant: string;
    engineer: string;
    professional: string;
    consultant: string;
    team: string;
    enterprise: string;
  };
};
