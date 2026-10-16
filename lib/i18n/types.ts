export type Locale = "en" | "ar";

export type AdvisorCopy = {
  name: string;
  track: string;
  summary: string;
  capabilities: string[];
  starters: string[];
};

export type Messages = {
  advisors: {
    sectionTitle: string;
    ecosystem: string;
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
    startersTitle: string;
    items: {
      pmo: AdvisorCopy;
      assurance: AdvisorCopy;
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
