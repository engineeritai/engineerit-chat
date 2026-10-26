import type { Locale } from "@/lib/i18n";
import type { EngineerToolId } from "@/lib/engineerTools";

export type ShellCopy = {
  nav: {
    navigation: string;
    pages: string;
    home: string;
    chat: string;
    openChat: string;
    pricing: string;
    register: string;
    profile: string;
    feedback: string;
    terms: string;
    team: string;
    advisors: string;
    faq: string;
  };
  footer: {
    blurb: string;
    rights: string;
    policyLead: string;
    policyLink: string;
  };
  trust: { title: string; auth: string; verify: string };
  header: {
    openMenu: string;
    login: string;
    signInTitle: string;
    email: string;
    password: string;
    signingIn: string;
    signIn: string;
    forgot: string;
    noAccount: string;
    register: string;
    resetTitle: string;
    yourEmail: string;
    sending: string;
    tryAgain: string;
    sendReset: string;
    backToLogin: string;
    accountMenu: string;
    profileAlt: string;
    planSuffix: string;
    myProfile: string;
    plansRegistration: string;
    subscribe: string;
    logout: string;
    daysLeft: string;
    dayLeft: string;
    upgrade: string;
    renew: string;
    invoicesLink: string;
    topicsLink: string;
    resetPassword: string;
    newPassword: string;
    confirmPassword: string;
    updatePassword: string;
    updating: string;
    unableSignIn: string;
    genericError: string;
    enterEmail: string;
    resetSent: string;
    passwordShort: string;
    passwordMismatch: string;
    passwordUpdated: string;
  };
  chat: {
    newChat: string;
    discipline: string;
    history: string;
    emptyHistory: string;
    welcomeTitle: string;
    welcomeBody: string;
    toolsForPlan: string;
    askPlaceholder: string;
    addAttachments: string;
    photo: string;
    document: string;
    send: string;
    attachLocked: string;
    toolLocked: string;
    unlockWith: string;
    perMonth: string;
    dailyGuest: string;
    dailyPaid: string;
    dailyGuestReply: string;
    dailyPaidReply: string;
    sorry: string;
    copyFailed: string;
    shareFailed: string;
    pdfFailed: string;
    wordFailed: string;
    pptFailed: string;
    newConversation: string;
    attachmentOnly: string;
    analyzeImage: string;
    analyzeDocument: string;
    imageFailed: string;
    documentFailed: string;
    registerTitle: string;
    upgradeTitle: string;
    registerBody: string;
    upgradeBody: string;
    close: string;
    upgrade: string;
    copy: string;
    share: string;
    exportPdf: string;
    exportWord: string;
    exportPpt: string;
    copyTable: string;
    exportExcel: string;
    excelFailed: string;
    diagramCopy: string;
    diagramPng: string;
    diagramSvg: string;
    toolsLabel: string;
    empty: string;
    you: string;
    ai: string;
    registerActions: string;
    upgradeActions: string;
    saveHtml: string;
    print: string;
    whatsapp: string;
    closeShare: string;
    viewerDownload: string;
    viewerPdf: string;
    viewerWord: string;
    viewerPowerPoint: string;
    viewerExcel: string;
    viewerCopied: string;
    viewerCopyLink: string;
    viewerLinkedIn: string;
    viewerEmail: string;
    viewerReport: string;
    viewerPdfPreview: string;
    viewerPreparing: string;
    searchHistory: string;
    rename: string;
    pin: string;
    unpin: string;
    deleteChat: string;
    deleteConfirm: string;
    shareTeam: string;
    unshareTeam: string;
    shared: string;
    expiryNote: string;
    expiryToday: string;
    upgradeKeep: string;
    historySignIn: string;
    historyLoading: string;
    historyLoadFailed: string;
    historySaveFailed: string;
    historyActionFailed: string;
    exportChatPdf: string;
    exportChatWord: string;
    exportChatFailed: string;
    exportChatLocked: string;
    shareTeamFailed: string;
    shareTeamNeedsLink: string;
    noSearchResults: string;
    sharedReadOnly: string;
    greeting: string;
    promptA: string;
    promptB: string;
    promptC: string;
    promptD: string;
    dictate: string;
    listening: string;
    toolsMenu: string;
    advisorsMenu: string;
    viewAllAdvisors: string;
    removeAdvisor: string;
    hideSidebar: string;
    showSidebar: string;
    moreActions: string;
    prompts: Record<EngineerToolId, string>;
    advisorPrompt: string;
  };
  auth: {
    signInTitle: string;
    signInLead: string;
    welcome: string;
    email: string;
    password: string;
    signingIn: string;
    signIn: string;
    noAccount: string;
    createOne: string;
    unable: string;
    emailNotConfirmed: string;
    resendConfirm: string;
    resendSent: string;
    invalidLogin: string;
    genericError: string;
    loggedIn: string;
    registerTitle: string;
    registerLeadBefore: string;
    registerLeadLink: string;
    registerLeadAfter: string;
    createAccount: string;
    fullName: string;
    fullNamePlaceholder: string;
    confirmEmail: string;
    confirmEmailPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    agreeLead: string;
    termsLink: string;
    agreeAnd: string;
    privacyLink: string;
    creating: string;
    create: string;
    emailConfirmTitle: string;
    emailConfirmHint: string;
    afterRegister: string;
    viewPlans: string;
    plansOverview: string;
    toolsInPlan: string;
    createHere: string;
    emailRequired: string;
    emailInvalid: string;
    emailMismatch: string;
    passwordMismatch: string;
    passwordMin: string;
    policyRequired: string;
    captchaRequired: string;
    duplicateEmail: string;
    planWaiting: string;
    continueSignIn: string;
    createdConfirm: string;
    createdRedirect: string;
    upgradeAnytime: string;
  };
  password: {
    changeTitle: string;
    changeLead: string;
    current: string;
    newPassword: string;
    confirm: string;
    show: string;
    hide: string;
    hint: string;
    strengthShort: string;
    strengthOk: string;
    strengthStrong: string;
    update: string;
    updating: string;
    updated: string;
    currentWrong: string;
    mismatch: string;
    tooShort: string;
    sendReset: string;
    sending: string;
    resetSentYou: string;
    ifExists: string;
    tryLater: string;
    generic: string;
    forgotTitle: string;
    forgotLead: string;
    sendLink: string;
    backToLogin: string;
    resetTitle: string;
    resetLead: string;
    save: string;
    savedRedirect: string;
    linkInvalid: string;
    requestNew: string;
  };
  profile: {
    title: string;
    loading: string;
    chooseFile: string;
    avatarHint: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    saving: string;
    save: string;
    subscription: string;
    currentPlan: string;
    yourPlan: string;
    freeBody: string;
    status: string;
    price: string;
    startDate: string;
    endDate: string;
    noBilling: string;
    billingNote: string;
    manage: string;
    billingLink: string;
    manageTeam: string;
    teamLapsed: string;
    activity: string;
    chats: string;
    documents: string;
    projects: string;
    soon: string;
    history: string;
    noPayments: string;
    plan: string;
    amount: string;
    date: string;
    invoiceNote: string;
    paymentConfirmed: string;
    paymentPending: string;
    paymentMissing: string;
    unknown: string;
    notLoggedIn: string;
    paymentFailed: string;
    paymentSaved: string;
    loadFailed: string;
    saveFailed: string;
    saved: string;
    photoFailed: string;
    photoUnavailable: string;
    photoSaved: string;
    cycle: string;
    monthly: string;
    annual: string;
    nextRenewal: string;
    autoRenew: string;
    autoRenewOn: string;
    autoRenewOff: string;
    renewNow: string;
    renewing: string;
    changePlan: string;
    downloadInvoice: string;
    paymentSuccess: string;
    invoiceUnavailable: string;
    goToProfile: string;
    invoices: string;
    noInvoices: string;
    continueChat: string;
    invoiceHeading: string;
    paymentFailedBanner: string;
    confirmingPayment: string;
    paymentConfirmedGo: string;
    cardRequired: string;
    tabOverview: string;
    tabBilling: string;
    tabTopics: string;
    jobTitle: string;
    company: string;
    phone: string;
    country: string;
    discipline: string;
    cropTitle: string;
    cropApply: string;
    cropCancel: string;
    topicsEmpty: string;
    filesEmpty: string;
    openTopic: string;
    fileSize: string;
    photo: string;
    initials: string;
  };
  checkout: {
    title: string;
    savedCard: string;
    consent: string;
    optional: string;
    renewManually: string;
    securePay: string;
    cancelAnytime: string;
    cardNotStored: string;
    openFailed: string;
    missingKey: string;
    seats: string;
    payOnce: string;
    saveRejected: string;
    summary: string;
    walletReminder: string;
    phonePay: string;
    scanToPay: string;
    phonePayHint: string;
    phonePayWaiting: string;
    phonePayExpired: string;
    phonePayInvalid: string;
    retry: string;
    paymentFailed: string;
    copyLink: string;
    copied: string;
    networks: string;
    vatNote: string;
    saveNotice: string;
    cancelHow: string;
  };
  billing: {
    title: string;
    empty: string;
    renewsOn: string;
    endsOn: string;
    cancelsAtEnd: string;
    cardLabel: string;
    cardMissing: string;
    ending: string;
    updateCard: string;
    cancelRenewal: string;
    resumeRenewal: string;
    cancelledInfo: string;
    resumedInfo: string;
    loadFailed: string;
    updateFailed: string;
    chargeFailed: string;
    nextRetry: string;
    seats: string;
    cardTitle: string;
    cardLead: string;
    cardConsent: string;
    cardUpdated: string;
    cardSaveFailed: string;
    cardUnavailable: string;
    downgraded: string;
    endedBody: string;
    endedRenew: string;
  };
  subscription: {
    title: string;
    lead: string;
    freePlan: string;
    processing: string;
    subscribe: string;
    toolsInPlan: string;
    back: string;
    loginRequired: string;
    saveFailed: string;
    freeSaved: string;
    paymentStartFailed: string;
    processFailed: string;
  };
  feedback: {
    title: string;
    lead: string;
    botHello: string;
    botUnclear: string;
    botError: string;
    category: string;
    feedback: string;
    complaint: string;
    suggestion: string;
    emailOptional: string;
    message: string;
    messagePlaceholder: string;
    sending: string;
    submit: string;
    thanks: string;
    sendError: string;
    assistant: string;
    askAssistant: string;
    askPlaceholder: string;
    send: string;
    close: string;
    review: {
      link: string;
      title: string;
      lead: string;
      rating: string;
      liked: string;
      improve: string;
      optional: string;
      submit: string;
      sending: string;
      thanks: string;
      error: string;
      signIn: string;
      signInLead: string;
      unavailable: string;
    };
  };
  legal: {
    termsTitle: string;
    termsLead: string;
    privacyTitle: string;
    privacyLead: string;
    privacyBody: string;
    privacyLink: string;
    privacyNote: string;
    refundTitle: string;
    refundLead: string;
    refundBody: string;
    refundLink: string;
    refundNote: string;
    downloadTitle: string;
    downloadLead: string;
    downloadButton: string;
  };
  install: {
    menu: string;
    bannerTitle: string;
    bannerBody: string;
    install: string;
    notNow: string;
    close: string;
    share: string;
    iosSafari: string;
    iosOther: string;
    browserMenu: string;
    pricingLine: string;
  };
};

const en: ShellCopy = {
  nav: {
    navigation: "Navigation",
    pages: "Pages",
    home: "Home",
    chat: "Chat",
    openChat: "Open chat",
    pricing: "Pricing",
    register: "Registration and plans",
    profile: "My profile",
    feedback: "Feedback and complaints",
    terms: "User policy and agreement",
    team: "Team",
    advisors: "AI Advisors",
    faq: "Questions",
  },
  footer: {
    blurb: "AI engineering assistant",
    rights: "All rights reserved.",
    policyLead: "Use of engineerit as per",
    policyLink: "User policy and agreement",
  },
  trust: {
    title: "Saudi Business Center",
    auth: "Auth No.",
    verify: "Verify via Saudi Business Center",
  },
  header: {
    openMenu: "Open menu",
    login: "Login",
    signInTitle: "Sign in to engineerit.ai",
    email: "Email",
    password: "Password",
    signingIn: "Signing in…",
    signIn: "Sign in",
    forgot: "Forgot password?",
    noAccount: "Don't have an account?",
    register: "Register",
    resetTitle: "Reset your password",
    yourEmail: "Your email",
    sending: "Sending…",
    tryAgain: "Try again in {seconds}s",
    sendReset: "Send reset link",
    backToLogin: "Back to login",
    accountMenu: "Account menu",
    profileAlt: "Profile",
    planSuffix: "plan",
    myProfile: "My profile",
    plansRegistration: "Plans and registration",
    subscribe: "Subscribe",
    logout: "Log out",
    daysLeft: "{days} days left",
    dayLeft: "1 day left",
    upgrade: "Upgrade",
    renew: "Renew",
    invoicesLink: "Subscription and invoices",
    topicsLink: "Topics and files",
    resetPassword: "Reset password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    updatePassword: "Update password",
    updating: "Updating…",
    unableSignIn: "Unable to sign in. Please try again.",
    genericError: "Something went wrong. Please try again.",
    enterEmail: "Enter your email first.",
    resetSent: "Reset link sent to your email.",
    passwordShort: "Password must be at least 6 characters.",
    passwordMismatch: "Passwords do not match.",
    passwordUpdated: "Password updated successfully.",
  },
  chat: {
    newChat: "New chat",
    discipline: "Discipline",
    history: "History",
    emptyHistory: "No conversations yet",
    welcomeTitle: "Welcome to engineerit.ai",
    welcomeBody:
      "A digital platform for engineering intelligence: analysis, document review, and an interactive assistant for drawings and technical work.",
    toolsForPlan: "Engineer tools for your plan",
    askPlaceholder: "Ask anything…",
    addAttachments: "Add attachments",
    photo: "Photo",
    document: "Document",
    send: "Send message",
    attachLocked: "Subscribe to attach photos or documents.",
    toolLocked: "This tool requires a higher subscription plan.",
    unlockWith: "Unlock with",
    perMonth: "/month",
    dailyGuest: "Daily limit reached. Please register or log in.",
    dailyPaid: "You have used today's 3 replies on the free Assistant plan.",
    dailyGuestReply: "Daily limit reached. Please register or log in to continue using engineerit.ai.",
    dailyPaidReply:
      "Daily limit reached. Engineer is SAR 19 a month: no daily reply cap, plus Word, Excel, and PowerPoint file analysis.",
    sorry: "Sorry, something failed. Please try again.",
    copyFailed: "Copy failed on this browser.",
    shareFailed: "Could not create the share link. Please try again.",
    pdfFailed: "PDF export failed. Please try again.",
    wordFailed: "Word export failed. Please try again.",
    pptFailed: "PowerPoint export failed. Please try again.",
    newConversation: "New conversation",
    attachmentOnly: "[Attachment]",
    analyzeImage: "Analyze this engineering image.",
    analyzeDocument: "Extract and summarize this document.",
    imageFailed: "Image analysis failed. Please try again or use a smaller image.",
    documentFailed:
      "Document processing failed. Please try again, or convert the file to PDF or text and upload it again.",
    registerTitle: "Register or log in",
    upgradeTitle: "Engineer",
    registerBody: "Please register or log in to continue.",
    upgradeBody:
      "SAR 19 a month. No daily reply cap, plus analysis of Word, Excel, and PowerPoint files.",
    close: "Close",
    upgrade: "Upgrade",
    copy: "Copy",
    share: "Share",
    exportPdf: "Export PDF",
    exportWord: "Export Word",
    exportPpt: "Export PowerPoint",
    copyTable: "Copy table",
    exportExcel: "Export to Excel",
    excelFailed: "Excel export failed. Please try again.",
    diagramCopy: "Copy as image",
    diagramPng: "Download PNG",
    diagramSvg: "Download SVG",
    toolsLabel: "Engineer tools:",
    empty: "Ask an engineering question to start the conversation.",
    you: "You",
    ai: "AI",
    registerActions: "Register to copy, share, and attach files",
    upgradeActions: "Upgrade to copy, share, and attach files",
    saveHtml: "Save HTML",
    print: "Print",
    whatsapp: "WhatsApp",
    closeShare: "Close",
    viewerDownload: "Download",
    viewerPdf: "PDF",
    viewerWord: "Word",
    viewerPowerPoint: "PowerPoint",
    viewerExcel: "Excel",
    viewerCopied: "Copied",
    viewerCopyLink: "Copy link",
    viewerLinkedIn: "LinkedIn",
    viewerEmail: "Email",
    viewerReport: "Report",
    viewerPdfPreview: "PDF preview",
    viewerPreparing: "Preparing the PDF…",
    searchHistory: "Search history",
    rename: "Rename",
    pin: "Pin",
    unpin: "Unpin",
    deleteChat: "Delete",
    deleteConfirm: "Delete this chat? This cannot be undone.",
    shareTeam: "Share with team",
    unshareTeam: "Stop team sharing",
    shared: "Shared",
    expiryNote: "This chat expires in {days} days.",
    expiryToday: "This chat expires today.",
    upgradeKeep: "Upgrade to keep it longer",
    historySignIn: "Sign in to keep chats on every device.",
    historyLoading: "Loading history…",
    historyLoadFailed: "Could not load history.",
    historySaveFailed: "Could not save this chat.",
    historyActionFailed: "Could not update this chat.",
    exportChatPdf: "Export chat PDF",
    exportChatWord: "Export chat Word",
    exportChatFailed: "Could not export this chat.",
    exportChatLocked: "Chat export is available on Professional Engineer and above.",
    shareTeamFailed: "Could not share this chat with the team.",
    shareTeamNeedsLink: "Link this account to a team before sharing.",
    noSearchResults: "No matching chats.",
    sharedReadOnly: "This shared chat is read only.",
    greeting: "How can we engineer your ideas and topics today?",
    promptA: "Review a drawing for clashes and missing notes",
    promptB: "Draft a method statement for a site activity",
    promptC: "Check this specification against the code",
    promptD: "Summarize the risks in a technical report",
    dictate: "Dictate",
    listening: "Listening",
    toolsMenu: "Tools",
    advisorsMenu: "Advisors",
    viewAllAdvisors: "View all advisors",
    removeAdvisor: "Remove advisor",
    hideSidebar: "Hide sidebar",
    showSidebar: "Show sidebar",
    moreActions: "Chat actions",
    prompts: {
      drawing: "Explain and analyze the attached engineering drawing, including any process flow, piping and instrumentation, or block diagram.",
      design: "Check this engineering design against the relevant codes and standards.",
      itp: "Generate an inspection and test plan and a quality checklist.",
      boq: "Propose a structured bill of quantities with items and units.",
      schedule: "Build a high-level project schedule.",
      value: "Perform a value engineering review.",
      dashboard: "Create a management dashboard summary with indicators, risks, and actions.",
    },
    advisorPrompt: "Ask an engineering advisor about this topic.",
  },
  auth: {
    signInTitle: "Sign in",
    signInLead: "Use your engineerit.ai account to access your chats and documents.",
    welcome: "Welcome back",
    email: "Email address",
    password: "Password",
    signingIn: "Signing in…",
    signIn: "Sign in",
    noAccount: "New here?",
    createOne: "Create an account",
    unable: "Unable to sign in. Please try again.",
    emailNotConfirmed: "Confirm your email before signing in. Open the link we sent, then come back.",
    resendConfirm: "Send the confirmation email again",
    resendSent: "We sent another confirmation email.",
    invalidLogin: "That email or password is not right. Try again, or reset the password.",
    genericError: "Something went wrong. Please try again.",
    loggedIn: "Logged in. Redirecting to your profile...",
    registerTitle: "Register on engineerit.ai",
    registerLeadBefore:
      "Create your account and start with the free Assistant Engineer plan, then subscribe to one of the paid plans for unlimited chats and chat export, according to each plan's features (",
    registerLeadLink: "plans",
    registerLeadAfter: ").",
    createAccount: "Create your account",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    confirmEmail: "Confirm email",
    confirmEmailPlaceholder: "Repeat your email",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your password",
    agreeLead: "I agree to the ",
    termsLink: "Terms and Conditions",
    agreeAnd: " and ",
    privacyLink: "Privacy Policy",
    creating: "Creating account...",
    create: "Create account",
    emailConfirmTitle: "Email confirmation required",
    emailConfirmHint: "Open the link in the email, then use the sign-in button. A plan you already chose opens at checkout.",
    afterRegister:
      "After registration, your account starts on the free Assistant Engineer plan. Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise are bought through Moyasar, monthly or annual. Annual billing saves you 2 months free. Each payment covers the period you choose.",
    viewPlans: "View plans and subscribe",
    plansOverview: "Plans and engineer tools",
    toolsInPlan: "Engineer tools in this plan",
    createHere: "Create one here",
    emailRequired: "Please enter and confirm your email.",
    emailInvalid: "Enter a valid email address.",
    emailMismatch: "Email and confirmation email do not match.",
    passwordMismatch: "Password and confirmation password do not match.",
    passwordMin: "Password must be at least 8 characters.",
    policyRequired: "Agree to the Terms and Conditions and Privacy Policy to create an account.",
    captchaRequired: "Complete the captcha and try again.",
    duplicateEmail: "An account with this email already exists. Sign in instead.",
    planWaiting: "Your chosen plan is saved. Confirm your email, then sign in to open checkout.",
    continueSignIn: "Sign in to continue",
    createdConfirm:
      "Account created. We sent a confirmation email. Check your inbox and junk folder, confirm the address, then sign in from the top bar.",
    createdRedirect: "Account created. Redirecting to your profile...",
    upgradeAnytime: "You can change your plan at any time from your profile or the pricing page.",
  },
  password: {
    changeTitle: "Change password",
    changeLead: "Enter your current password, then choose a new one.",
    current: "Current password",
    newPassword: "New password",
    confirm: "Confirm new password",
    show: "Show",
    hide: "Hide",
    hint: "Use at least 8 characters. A mix of letters and numbers is stronger.",
    strengthShort: "Too short",
    strengthOk: "Long enough",
    strengthStrong: "Strong",
    update: "Update password",
    updating: "Updating…",
    updated: "Password updated.",
    currentWrong: "Current password is incorrect.",
    mismatch: "The two new passwords do not match.",
    tooShort: "Password must be at least 8 characters.",
    sendReset: "Send reset link to my email",
    sending: "Sending…",
    resetSentYou: "We sent a reset link to your email.",
    ifExists: "If an account exists, we sent a link.",
    tryLater: "Please wait a moment and try again.",
    generic: "Something went wrong. Please try again.",
    forgotTitle: "Forgot password",
    forgotLead: "Enter the email on your account. We will send a link to choose a new password.",
    sendLink: "Send reset link",
    backToLogin: "Back to sign in",
    resetTitle: "Set a new password",
    resetLead: "Choose a new password for your account.",
    save: "Save password",
    savedRedirect: "Password saved. Opening chat…",
    linkInvalid: "This reset link is invalid or has expired.",
    requestNew: "Request a new link",
  },
  profile: {
    title: "Profile and subscription",
    loading: "Loading profile…",
    chooseFile: "Choose file",
    avatarHint: "JPG, PNG, or GIF. Max 5 MB.",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    email: "Email",
    saving: "Saving…",
    save: "Save changes",
    subscription: "Subscription",
    currentPlan: "Current plan",
    yourPlan: "Your plan",
    freeBody: "You are on the free Assistant Engineer plan. No charges apply until you upgrade.",
    status: "Status",
    price: "Price",
    startDate: "Start date",
    endDate: "End date",
    noBilling: "No billing data found yet for this plan.",
    billingNote: "Plan changes are handled by engineerit.ai billing. Change plan from the pricing page.",
    manage: "Manage or upgrade subscription",
    billingLink: "Billing, card, and cancellation",
    manageTeam: "Manage team seats",
    teamLapsed:
      "The team subscription has ended, so Consultant-tier access for this team is paused for every seat.",
    activity: "Activity",
    chats: "Total chats",
    documents: "Total uploaded documents",
    projects: "Saved projects",
    soon: "soon",
    history: "Billing history",
    noPayments: "No payments recorded yet. Future subscriptions will appear here.",
    plan: "Plan",
    amount: "Amount",
    date: "Date",
    invoiceNote: "A receipt with the amount, plan, and period is emailed after each successful payment.",
    paymentConfirmed: "Payment confirmed. A receipt is emailed to you.",
    paymentPending: "The payment is not confirmed yet.",
    paymentMissing: "This return is missing the payment reference.",
    unknown: "unknown",
    notLoggedIn: "You are not logged in.",
    paymentFailed: "Could not save the subscription after payment. Please contact support.",
    paymentSaved: "Payment successful and subscription updated.",
    loadFailed: "Could not load the profile.",
    saveFailed: "Could not save the profile.",
    saved: "Profile updated.",
    photoFailed: "Could not upload the profile photo.",
    photoUnavailable: "Profile photos are not available yet. Your initials stay in the header.",
    photoSaved: "Profile photo updated.",
    cycle: "Billing cycle",
    monthly: "Monthly",
    annual: "Annual",
    nextRenewal: "Next renewal",
    autoRenew: "Auto-renew",
    autoRenewOn: "On",
    autoRenewOff: "Off",
    renewNow: "Renew now",
    renewing: "Starting payment…",
    changePlan: "Change plan",
    downloadInvoice: "Download invoice (PDF)",
    paymentSuccess: "Payment successful",
    invoiceUnavailable: "Invoice unavailable",
    goToProfile: "Go to profile",
    invoices: "Invoices",
    noInvoices: "No invoices yet.",
    continueChat: "Continue to chat",
    invoiceHeading: "Invoice",
    paymentFailedBanner: "The payment was not completed. Choose a plan and try again.",
    confirmingPayment: "Confirming the payment…",
    paymentConfirmedGo: "Payment confirmed. Your invoice is ready.",
    cardRequired: "Save a card with Moyasar before auto-renew can be turned on.",
    tabOverview: "Overview",
    tabBilling: "Subscription history",
    tabTopics: "Topics and files",
    jobTitle: "Title",
    company: "Company",
    phone: "Phone",
    country: "Country",
    discipline: "Discipline",
    cropTitle: "Crop photo",
    cropApply: "Use photo",
    cropCancel: "Cancel",
    topicsEmpty: "No conversations yet.",
    filesEmpty: "No uploaded files yet.",
    openTopic: "Open",
    fileSize: "Size",
    photo: "Photo",
    initials: "Initials",
  },
  checkout: {
    title: "Checkout",
    savedCard: "We'll renew with this card. You can cancel anytime from your profile.",
    consent: "Save this card for automatic renewal",
    optional: "Optional",
    renewManually: "You can renew manually anytime from your profile.",
    securePay: "Secure payment by Moyasar",
    cancelAnytime: "Cancel anytime",
    cardNotStored: "Your card details are never stored on our servers",
    openFailed: "Could not open checkout.",
    missingKey: "The card form is not configured yet.",
    seats: "seats",
    payOnce: "Pay once now. Auto-renew stays off until a card is saved.",
    saveRejected: "We could not save the card this time. You can still pay once and renew from your profile.",
    summary: "Order",
    walletReminder:
      "Apple Pay, Samsung Pay, and cards renew automatically. STC Pay is a one-time payment.",
    phonePay: "Pay with your phone",
    scanToPay: "STC Pay or mada on your phone",
    phonePayHint:
      "Scan this code to open this checkout on your phone. The link lasts 15 minutes and opens this payment only.",
    phonePayWaiting: "This page opens the invoice when the phone payment is confirmed.",
    phonePayExpired: "This phone link has expired. Open checkout on your computer and scan a new code.",
    phonePayInvalid: "This phone link is not valid. Open checkout on your computer and scan a new code.",
    retry: "Try again",
    paymentFailed: "This payment was declined or cancelled. Your plan was not changed. Try again below.",
    copyLink: "Copy phone link",
    copied: "Link copied",
    networks: "Cards",
    vatNote: "Total due today is the amount above, in SAR. VAT is shown on the receipt only when a VAT number is on file.",
    saveNotice: "Your card is saved securely by Moyasar for automatic renewal.",
    cancelHow: "Cancel anytime from Billing before the renewal date. Access stays on until that date.",
  },
  billing: {
    title: "Billing",
    empty: "No paid subscription yet. Buy a plan on the pricing page. It renews automatically until you cancel.",
    renewsOn: "Renews automatically on",
    endsOn: "Access continues until",
    cancelsAtEnd: "cancels at period end",
    cardLabel: "Card",
    cardMissing: "not on file yet",
    ending: "ending",
    updateCard: "Update card",
    cancelRenewal: "Cancel auto-renew",
    resumeRenewal: "Resume auto-renew",
    cancelledInfo: "Renewal is cancelled at the end of this period.",
    resumedInfo: "Renewal is on again.",
    loadFailed: "Could not load billing.",
    updateFailed: "Could not update billing.",
    chargeFailed: "The last charge failed. Update the card so the subscription can renew.",
    nextRetry: "The next retry is",
    seats: "seats",
    cardTitle: "Update card",
    cardLead: "Moyasar verifies the card with a SAR 1 charge and saves it for renewal. This does not change the plan period.",
    cardConsent: "I agree to replace the saved card used for automatic Moyasar renewals.",
    cardUpdated: "Card updated. Future renewals use this card.",
    cardSaveFailed: "Could not save the card.",
    cardUnavailable: "Saving the card is unavailable until Moyasar tokenization is enabled.",
    downgraded:
      "We could not renew the saved card on the renewal date or on the retries 1 and 3 days later. This account is on the free Assistant Engineer plan.",
    endedBody:
      "Your paid plan has ended, so this account is on the free Assistant plan. Daily reply limits apply, and chat history is kept for the free plan.",
    endedRenew: "Renew",
  },
  subscription: {
    title: "Plans and subscription",
    lead: "Choose Assistant Engineer, Engineer, Professional Engineer, Consultant Engineer, Team, or Enterprise.",
    freePlan: "This is your free plan",
    processing: "Processing...",
    subscribe: "Subscribe",
    toolsInPlan: "Engineer tools in this plan",
    back: "Back to profile",
    loginRequired: "Please log in or register before selecting a plan.",
    saveFailed: "Could not save the subscription.",
    freeSaved: "Your free Assistant plan is saved. Continue from your profile.",
    paymentStartFailed: "Could not start payment. Please try again.",
    processFailed: "Could not process the request. Please try again.",
  },
  feedback: {
    title: "Feedback and complaints",
    lead: "Help us improve engineerit.ai. Your message goes to support@engineerit.ai. You can also ask the smart assistant.",
    botHello: "Hello. I am the smart assistant for engineerit.ai. How can I help with the platform, subscriptions, or an issue?",
    botUnclear: "I could not understand that. Please try another wording.",
    botError: "The smart assistant could not be reached. Please try again later.",
    category: "Category",
    feedback: "Feedback",
    complaint: "Complaint",
    suggestion: "Suggestion",
    emailOptional: "Your email (optional)",
    message: "Message",
    messagePlaceholder: "Write your feedback, complaint, or suggestion…",
    sending: "Sending…",
    submit: "Submit",
    thanks: "Thank you. Your message has been submitted.",
    sendError: "There was a problem sending your message. Please try again later.",
    assistant: "Smart assistant",
    askAssistant: "Ask the smart assistant",
    askPlaceholder: "Ask the smart assistant…",
    send: "Send",
    close: "Close",
    review: {
      link: "Rate the platform",
      title: "Your opinion of engineerit.ai",
      lead: "Choose a rating from 1 to 5. The two questions are optional. This is saved on your signed-in account.",
      rating: "How is the platform for you?",
      liked: "What do you like?",
      improve: "What should we improve or add?",
      optional: "optional",
      submit: "Send feedback",
      sending: "Sending…",
      thanks: "Thank you. Your feedback is saved.",
      error: "Could not save your feedback. Try again.",
      signIn: "Sign in",
      signInLead: "Sign in to save your feedback on this account.",
      unavailable: "Saving feedback is not available yet. You can write to support@engineerit.ai.",
    },
  },
  legal: {
    termsTitle: "User policy and agreement",
    termsLead:
      "This page describes the terms, the privacy policy, the cancellation and refund policy, and the liability limits for using engineerit.ai.",
    privacyTitle: "Privacy policy – engineerit.ai",
    privacyLead: "This page describes the privacy policy for the engineerit.ai platform.",
    privacyBody: "The full privacy policy is in the legal document:",
    privacyLink: "Open the privacy section on the legal page",
    privacyNote: "This address exists for payment-provider compliance. The governing text is the legal page.",
    refundTitle: "Refund and cancellation policy – engineerit.ai",
    refundLead: "This page describes the refund and cancellation policy for engineerit.ai.",
    refundBody: "The full refund policy is in the legal document:",
    refundLink: "Open the refund section on the legal page",
    refundNote: "This address exists for payment-provider compliance. The governing text is the legal page.",
    downloadTitle: "Download the full terms",
    downloadLead: "Download the terms of use in the language you are reading.",
    downloadButton: "Download terms of use",
  },
  install: {
    menu: "Install app",
    bannerTitle: "Install the app",
    bannerBody: "Add engineer it to your home screen.",
    install: "Install",
    notNow: "Not now",
    close: "Close",
    share: "Share",
    iosSafari: "Tap {share}, then Add to Home Screen.",
    iosOther: "Open this page in Safari, then tap {share} and Add to Home Screen.",
    browserMenu: "Open the browser menu and choose Install app or Add to Home screen.",
    pricingLine: "Install the app",
  },
};

const ar: ShellCopy = {
  nav: {
    navigation: "التنقل",
    pages: "الصفحات",
    home: "الرئيسية",
    chat: "المحادثة",
    openChat: "افتح المحادثة",
    pricing: "الأسعار",
    register: "التسجيل والباقات",
    profile: "ملفي",
    feedback: "الملاحظات والشكاوى",
    terms: "سياسة الاستخدام والاتفاق",
    team: "الفريق",
    advisors: "مستشارو الذكاء الاصطناعي",
    faq: "الأسئلة الشائعة",
  },
  footer: {
    blurb: "مساعد هندسي بالذكاء الاصطناعي",
    rights: "جميع الحقوق محفوظة.",
    policyLead: "استخدام engineerit وفق",
    policyLink: "سياسة الاستخدام والاتفاق",
  },
  trust: {
    title: "المركز السعودي للأعمال",
    auth: "رقم التوثيق",
    verify: "تحقق عبر المركز السعودي للأعمال",
  },
  header: {
    openMenu: "فتح القائمة",
    login: "دخول",
    signInTitle: "الدخول إلى engineerit.ai",
    email: "البريد",
    password: "كلمة المرور",
    signingIn: "جاري الدخول…",
    signIn: "دخول",
    forgot: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    register: "تسجيل",
    resetTitle: "إعادة تعيين كلمة المرور",
    yourEmail: "بريدك",
    sending: "جاري الإرسال…",
    tryAgain: "حاول بعد {seconds} ث",
    sendReset: "إرسال رابط الاستعادة",
    backToLogin: "العودة للدخول",
    accountMenu: "قائمة الحساب",
    profileAlt: "الملف",
    planSuffix: "باقة",
    myProfile: "ملفي",
    plansRegistration: "الباقات والتسجيل",
    subscribe: "اشترك الآن",
    logout: "خروج",
    daysLeft: "{days} يوما متبقية",
    dayLeft: "يوم واحد متبقي",
    upgrade: "ترقية",
    renew: "تجديد",
    invoicesLink: "الاشتراك والفواتير",
    topicsLink: "المواضيع والملفات",
    resetPassword: "إعادة تعيين كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    updatePassword: "تحديث كلمة المرور",
    updating: "جاري التحديث…",
    unableSignIn: "تعذر الدخول. حاول مرة أخرى.",
    genericError: "حدث خطأ. حاول مرة أخرى.",
    enterEmail: "أدخل بريدك أولا.",
    resetSent: "أرسل رابط الاستعادة إلى بريدك.",
    passwordShort: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    passwordUpdated: "تم تحديث كلمة المرور.",
  },
  chat: {
    newChat: "محادثة جديدة",
    discipline: "التخصص",
    history: "السجل",
    emptyHistory: "لا توجد محادثات بعد",
    welcomeTitle: "مرحبا بك في engineerit.ai",
    welcomeBody:
      "منصة رقمية للذكاء الهندسي: التحليل، ومراجعة المستندات، ومساعد تفاعلي للرسومات والعمل الفني.",
    toolsForPlan: "أدوات المهندس في باقتك",
    askPlaceholder: "اسأل أي شيء…",
    addAttachments: "إضافة مرفقات",
    photo: "صورة",
    document: "مستند",
    send: "إرسال",
    attachLocked: "اشترك لإرفاق الصور أو المستندات.",
    toolLocked: "هذه الأداة تتطلب باقة أعلى.",
    unlockWith: "افتحها مع",
    perMonth: "/شهر",
    dailyGuest: "بلغت الحد اليومي. سجل أو ادخل.",
    dailyPaid: "استخدمت ردود اليوم الثلاثة في باقة المساعد المجانية.",
    dailyGuestReply: "بلغت الحد اليومي. سجل أو ادخل لمتابعة استخدام engineerit.ai.",
    dailyPaidReply:
      "بلغت الحد اليومي. باقة المهندس 19 ريال شهريا: بلا حد يومي للردود، مع تحليل ملفات وورد وإكسل وباوربوينت.",
    sorry: "عذرا، حدث خطأ. حاول مرة أخرى.",
    copyFailed: "تعذر النسخ في هذا المتصفح.",
    shareFailed: "تعذر إنشاء رابط المشاركة. حاول مرة أخرى.",
    pdfFailed: "تعذر تصدير بي دي إف. حاول مرة أخرى.",
    wordFailed: "تعذر تصدير وورد. حاول مرة أخرى.",
    pptFailed: "تعذر تصدير باوربوينت. حاول مرة أخرى.",
    newConversation: "محادثة جديدة",
    attachmentOnly: "[مرفق]",
    analyzeImage: "حلل هذه الصورة الهندسية.",
    analyzeDocument: "استخرج هذا المستند ولخصه.",
    imageFailed: "تعذر تحليل الصورة. حاول مرة أخرى أو استخدم صورة أصغر.",
    documentFailed: "تعذرت معالجة المستند. حاول مرة أخرى، أو احفظه كملف بي دي إف أو نص ثم أعد رفعه.",
    registerTitle: "التسجيل أو الدخول",
    upgradeTitle: "المهندس",
    registerBody: "سجل أو ادخل للمتابعة.",
    upgradeBody: "19 ريال شهريا. بلا حد يومي للردود، مع تحليل ملفات وورد وإكسل وباوربوينت.",
    close: "إغلاق",
    upgrade: "ترقية",
    copy: "نسخ",
    share: "مشاركة",
    exportPdf: "تصدير بي دي إف",
    exportWord: "تصدير وورد",
    exportPpt: "تصدير باوربوينت",
    copyTable: "نسخ الجدول",
    exportExcel: "تصدير إلى إكسل",
    excelFailed: "تعذر تصدير إكسل. حاول مرة أخرى.",
    diagramCopy: "نسخ كصورة",
    diagramPng: "تنزيل PNG",
    diagramSvg: "تنزيل SVG",
    toolsLabel: "أدوات المهندس:",
    empty: "اسأل سؤالا هندسيا لبدء المحادثة.",
    you: "أنت",
    ai: "الذكاء",
    registerActions: "سجل للنسخ والمشاركة وإرفاق الملفات",
    upgradeActions: "ارفع باقتك للنسخ والمشاركة وإرفاق الملفات",
    saveHtml: "حفظ الصفحة",
    print: "طباعة",
    whatsapp: "واتساب",
    closeShare: "إغلاق",
    viewerDownload: "تنزيل",
    viewerPdf: "بي دي إف",
    viewerWord: "وورد",
    viewerPowerPoint: "باوربوينت",
    viewerExcel: "إكسل",
    viewerCopied: "تم النسخ",
    viewerCopyLink: "نسخ الرابط",
    viewerLinkedIn: "لينكدإن",
    viewerEmail: "بريد",
    viewerReport: "التقرير",
    viewerPdfPreview: "معاينة بي دي إف",
    viewerPreparing: "جار تجهيز بي دي إف…",
    searchHistory: "بحث في السجل",
    rename: "إعادة تسمية",
    pin: "تثبيت",
    unpin: "إلغاء التثبيت",
    deleteChat: "حذف",
    deleteConfirm: "حذف هذه المحادثة؟ لا يمكن التراجع.",
    shareTeam: "مشاركة مع الفريق",
    unshareTeam: "إيقاف مشاركة الفريق",
    shared: "مشتركة",
    expiryNote: "تنتهي هذه المحادثة بعد {days} يوم.",
    expiryToday: "تنتهي هذه المحادثة اليوم.",
    upgradeKeep: "ارفع الباقة للإبقاء عليها مدة أطول",
    historySignIn: "سجل الدخول ليحفظ السجل على كل الأجهزة.",
    historyLoading: "جاري تحميل السجل…",
    historyLoadFailed: "تعذر تحميل السجل.",
    historySaveFailed: "تعذر حفظ هذه المحادثة.",
    historyActionFailed: "تعذر تحديث هذه المحادثة.",
    exportChatPdf: "تصدير المحادثة PDF",
    exportChatWord: "تصدير المحادثة وورد",
    exportChatFailed: "تعذر تصدير هذه المحادثة.",
    exportChatLocked: "تصدير المحادثة متاح من باقة المهندس المحترف فما فوق.",
    shareTeamFailed: "تعذرت مشاركة هذه المحادثة مع الفريق.",
    shareTeamNeedsLink: "اربط هذا الحساب بفريق قبل المشاركة.",
    noSearchResults: "لا توجد محادثات مطابقة.",
    sharedReadOnly: "هذه المحادثة المشتركة للقراءة فقط.",
    greeting: "كيف نهندس أفكارك ومشاريعك اليوم؟",
    promptA: "راجع رسما بحثا عن التعارضات والملاحظات الناقصة",
    promptB: "اكتب طريقة تنفيذ لنشاط في الموقع",
    promptC: "تحقق من المواصفة مقابل الكود",
    promptD: "لخص المخاطر في تقرير فني",
    dictate: "إملاء",
    listening: "جاري الاستماع",
    toolsMenu: "الأدوات",
    advisorsMenu: "المستشارون",
    viewAllAdvisors: "عرض كل المستشارين",
    removeAdvisor: "إزالة المستشار",
    hideSidebar: "إخفاء الشريط",
    showSidebar: "إظهار الشريط",
    moreActions: "إجراءات المحادثة",
    prompts: {
      drawing: "اشرح وحلل الرسم الهندسي المرفق، بما في ذلك مخطط التدفق أو مخطط الأنابيب والأجهزة أو المخطط الصندوقي.",
      design: "راجع هذا التصميم الهندسي مقابل الأكواد والمعايير ذات الصلة.",
      itp: "أعد خطة فحص واختبار وقائمة جودة.",
      boq: "اقترح جدول كميات منظما بالبنود والوحدات.",
      schedule: "أنشئ جدولا زمنيا عالي المستوى للمشروع.",
      value: "اعمل مراجعة هندسة قيمية.",
      dashboard: "أعد ملخص لوحة إدارة بالمؤشرات والمخاطر والإجراءات.",
    },
    advisorPrompt: "اسأل مستشارا هندسيا عن هذا الموضوع.",
  },
  auth: {
    signInTitle: "دخول",
    signInLead: "استخدم حساب engineerit.ai للوصول إلى محادثاتك ومستنداتك.",
    welcome: "مرحبا بعودتك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signingIn: "جاري الدخول…",
    signIn: "دخول",
    noAccount: "جديد هنا؟",
    createOne: "أنشئ حسابا",
    unable: "تعذر الدخول. حاول مرة أخرى.",
    emailNotConfirmed: "أكد بريدك قبل الدخول. افتح الرابط الذي أرسلناه ثم عد إلى هنا.",
    resendConfirm: "أرسل رسالة التأكيد مرة أخرى",
    resendSent: "أرسلنا رسالة تأكيد أخرى.",
    invalidLogin: "البريد أو كلمة المرور غير صحيحة. أعد المحاولة أو استعد كلمة المرور.",
    genericError: "حدث خطأ. حاول مرة أخرى.",
    loggedIn: "تم الدخول. جاري التحويل إلى ملفك...",
    registerTitle: "التسجيل في engineerit.ai",
    registerLeadBefore:
      "أنشئ حسابك، وابدأ بباقة المهندس المساعد المجانية، ثم اشترك في إحدى الباقات المدفوعة لتحصل على محادثات لا محدودة وتصدير للمحادثات حسب مزايا الباقات المتوفرة (",
    registerLeadLink: "الباقات",
    registerLeadAfter: ").",
    createAccount: "إنشاء الحساب",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "اسمك الكامل",
    confirmEmail: "تأكيد البريد",
    confirmEmailPlaceholder: "أعد كتابة البريد",
    confirmPassword: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أعد كتابة كلمة المرور",
    agreeLead: "أوافق على ",
    termsLink: "الشروط والأحكام",
    agreeAnd: " و",
    privacyLink: "سياسة الخصوصية",
    creating: "جاري إنشاء الحساب...",
    create: "إنشاء الحساب",
    emailConfirmTitle: "يلزم تأكيد البريد",
    emailConfirmHint: "افتح الرابط في الرسالة، ثم استخدم زر الدخول. الباقة التي اخترتها تفتح في الدفع.",
    afterRegister:
      "بعد التسجيل تبدأ على باقة المهندس المساعد المجانية. تشترى باقات المهندس والمهندس المحترف والمهندس الاستشاري والفريق والمؤسسات عبر Moyasar، شهريا أو سنويا. الاشتراك السنوي يوفر شهرين مجانا. كل دفعة تغطي المدة التي تختارها.",
    viewPlans: "عرض الباقات والاشتراك",
    plansOverview: "الباقات وأدوات المهندس",
    toolsInPlan: "أدوات المهندس في هذه الباقة",
    createHere: "أنشئ حسابا من هنا",
    emailRequired: "أدخل البريد وأكده.",
    emailInvalid: "أدخل بريدا إلكترونيا صالحا.",
    emailMismatch: "البريد وتأكيده غير متطابقين.",
    passwordMismatch: "كلمة المرور وتأكيدها غير متطابقين.",
    passwordMin: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    policyRequired: "وافق على الشروط والأحكام وسياسة الخصوصية لإنشاء الحساب.",
    captchaRequired: "أكمل التحقق ثم حاول مرة أخرى.",
    duplicateEmail: "يوجد حساب بهذا البريد. سجل الدخول.",
    planWaiting: "باقتك المختارة محفوظة. أكد البريد ثم سجل الدخول لفتح الدفع.",
    continueSignIn: "سجل الدخول للمتابعة",
    createdConfirm:
      "تم إنشاء الحساب. أرسلنا رسالة تأكيد. راجع الوارد والبريد غير الهام، ثم أكد العنوان وادخل من الشريط العلوي.",
    createdRedirect: "تم إنشاء الحساب. جاري التحويل إلى ملفك...",
    upgradeAnytime: "يمكنك تغيير الباقة في أي وقت من ملفك أو صفحة الأسعار.",
  },
  password: {
    changeTitle: "تغيير كلمة المرور",
    changeLead: "أدخل كلمة المرور الحالية، ثم اختر كلمة جديدة.",
    current: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirm: "تأكيد كلمة المرور الجديدة",
    show: "إظهار",
    hide: "إخفاء",
    hint: "استخدم 8 أحرف على الأقل. مزيج من الحروف والأرقام أقوى.",
    strengthShort: "قصيرة",
    strengthOk: "الطول مناسب",
    strengthStrong: "قوية",
    update: "تحديث كلمة المرور",
    updating: "جاري التحديث…",
    updated: "تم تحديث كلمة المرور.",
    currentWrong: "كلمة المرور الحالية غير صحيحة.",
    mismatch: "كلمتا المرور الجديدتان غير متطابقتين.",
    tooShort: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
    sendReset: "أرسل رابط الاستعادة إلى بريدي",
    sending: "جاري الإرسال…",
    resetSentYou: "أرسلنا رابط الاستعادة إلى بريدك.",
    ifExists: "إذا كان هناك حساب، أرسلنا رابطا.",
    tryLater: "انتظر قليلا ثم حاول مرة أخرى.",
    generic: "حدث خطأ. حاول مرة أخرى.",
    forgotTitle: "نسيت كلمة المرور",
    forgotLead: "أدخل البريد المسجل في حسابك. سنرسل رابطا لاختيار كلمة مرور جديدة.",
    sendLink: "إرسال رابط الاستعادة",
    backToLogin: "العودة لتسجيل الدخول",
    resetTitle: "تعيين كلمة مرور جديدة",
    resetLead: "اختر كلمة مرور جديدة لحسابك.",
    save: "حفظ كلمة المرور",
    savedRedirect: "تم حفظ كلمة المرور. جاري فتح المحادثة…",
    linkInvalid: "رابط الاستعادة غير صالح أو انتهت صلاحيته.",
    requestNew: "اطلب رابطا جديدا",
  },
  profile: {
    title: "الملف والاشتراك",
    loading: "جاري تحميل الملف…",
    chooseFile: "اختيار ملف",
    avatarHint: "صورة حتى 5 ميجابايت.",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "اسمك الكامل",
    email: "البريد",
    saving: "جاري الحفظ…",
    save: "حفظ التغييرات",
    subscription: "الاشتراك",
    currentPlan: "الباقة الحالية",
    yourPlan: "باقتك",
    freeBody: "أنت على باقة المهندس المساعد المجانية. لا تفرض رسوم حتى الترقية.",
    status: "الحالة",
    price: "السعر",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    noBilling: "لا توجد بيانات فوترة لهذه الباقة بعد.",
    billingNote: "تغيير الباقة يتم عبر فوترة engineerit.ai. اختر الباقة من صفحة الأسعار.",
    manage: "إدارة الاشتراك أو ترقيته",
    billingLink: "الفوترة والبطاقة والإلغاء",
    manageTeam: "إدارة مقاعد الفريق",
    teamLapsed: "انتهى اشتراك الفريق، وتوقف وصول المستوى الاستشاري لكل المقاعد.",
    activity: "النشاط",
    chats: "إجمالي المحادثات",
    documents: "إجمالي المستندات المرفوعة",
    projects: "المشاريع المحفوظة",
    soon: "قريبا",
    history: "سجل الفوترة",
    noPayments: "لا توجد مدفوعات بعد. ستظهر الاشتراكات القادمة هنا.",
    plan: "الباقة",
    amount: "المبلغ",
    date: "التاريخ",
    invoiceNote: "يرسل إيصال بالمبلغ والباقة والمدة بعد كل دفعة ناجحة.",
    paymentConfirmed: "تم تأكيد الدفع. سيصلك إيصال بالبريد.",
    paymentPending: "لم يؤكد الدفع بعد.",
    paymentMissing: "هذه العودة تفتقد مرجع الدفع.",
    unknown: "غير معروف",
    notLoggedIn: "لم تسجل الدخول.",
    paymentFailed: "تعذر حفظ الاشتراك بعد الدفع. تواصل مع الدعم.",
    paymentSaved: "تم الدفع وتحديث الاشتراك.",
    loadFailed: "تعذر تحميل الملف.",
    saveFailed: "تعذر حفظ الملف.",
    saved: "تم تحديث الملف.",
    photoFailed: "تعذر رفع صورة الملف.",
    photoUnavailable: "صور الملف غير متاحة بعد. تبقى الأحرف الأولى في الترويسة.",
    photoSaved: "تم تحديث صورة الملف.",
    cycle: "دورة الفوترة",
    monthly: "شهري",
    annual: "سنوي",
    nextRenewal: "التجديد التالي",
    autoRenew: "التجديد التلقائي",
    autoRenewOn: "مفعل",
    autoRenewOff: "متوقف",
    renewNow: "جدد الآن",
    renewing: "جاري بدء الدفع…",
    changePlan: "تغيير الباقة",
    downloadInvoice: "تنزيل الفاتورة (PDF)",
    paymentSuccess: "تم الدفع",
    invoiceUnavailable: "تعذر عرض الفاتورة",
    goToProfile: "الذهاب إلى الملف",
    invoices: "الفواتير",
    noInvoices: "لا توجد فواتير بعد.",
    continueChat: "المتابعة إلى المحادثة",
    invoiceHeading: "الفاتورة",
    paymentFailedBanner: "لم يكتمل الدفع. اختر باقة وحاول مرة أخرى.",
    confirmingPayment: "جاري تأكيد الدفع…",
    paymentConfirmedGo: "تم تأكيد الدفع. الفاتورة جاهزة.",
    cardRequired: "احفظ بطاقة عبر Moyasar قبل تفعيل التجديد التلقائي.",
    tabOverview: "نظرة عامة",
    tabBilling: "سجل الاشتراك",
    tabTopics: "المواضيع والملفات",
    jobTitle: "المسمى",
    company: "الشركة",
    phone: "الهاتف",
    country: "الدولة",
    discipline: "التخصص",
    cropTitle: "قص الصورة",
    cropApply: "استخدام الصورة",
    cropCancel: "إلغاء",
    topicsEmpty: "لا توجد محادثات بعد.",
    filesEmpty: "لا توجد ملفات مرفوعة بعد.",
    openTopic: "فتح",
    fileSize: "الحجم",
    photo: "الصورة",
    initials: "الأحرف",
  },
  checkout: {
    title: "الدفع",
    savedCard: "سنجدد بهذه البطاقة. يمكنك الإلغاء في أي وقت من ملفك.",
    consent: "احفظ هذه البطاقة للتجديد التلقائي",
    optional: "اختياري",
    renewManually: "يمكنك التجديد يدويا في أي وقت من ملفك الشخصي.",
    securePay: "دفع آمن عبر ميسر",
    cancelAnytime: "إلغاء في أي وقت",
    cardNotStored: "لا نحتفظ ببيانات بطاقتك على خوادمنا",
    openFailed: "تعذر فتح صفحة الدفع.",
    missingKey: "نموذج البطاقة غير معد بعد.",
    seats: "مقاعد",
    payOnce: "ادفع مرة واحدة الآن. يبقى التجديد التلقائي متوقفا حتى تحفظ البطاقة.",
    saveRejected: "تعذر حفظ البطاقة هذه المرة. يمكنك الدفع مرة واحدة والتجديد من ملفك.",
    summary: "الطلب",
    walletReminder:
      "Apple Pay وSamsung Pay والبطاقة تتجدد تلقائيا. STC Pay دفعة لمرة واحدة.",
    phonePay: "ادفع من جوالك",
    scanToPay: "STC Pay أو مدى من جوالك",
    phonePayHint: "امسح الرمز لفتح هذا الدفع على الجوال. الرابط يعمل 15 دقيقة ولهذا الدفع فقط.",
    phonePayWaiting: "تنتقل هذه الصفحة إلى الفاتورة عند تأكيد الدفع من الجوال.",
    phonePayExpired: "انتهت صلاحية رابط الجوال. افتح الدفع على الكمبيوتر لمسح رمز جديد.",
    phonePayInvalid: "رابط الجوال غير صالح. افتح الدفع على الكمبيوتر وامسح رمزا جديدا.",
    retry: "حاول مرة أخرى",
    paymentFailed: "رُفض هذا الدفع أو أُلغي. لم تتغير باقتك. أعد المحاولة في الأسفل.",
    copyLink: "نسخ رابط الجوال",
    copied: "تم نسخ الرابط",
    networks: "البطاقات",
    vatNote: "المستحق اليوم هو المبلغ أعلاه بالريال. تظهر ضريبة القيمة المضافة في الإيصال فقط عند وجود رقم ضريبي.",
    saveNotice: "يحفظ ميسر بطاقتك بشكل آمن للتجديد التلقائي.",
    cancelHow: "يمكنك الإلغاء من الفوترة قبل تاريخ التجديد. يستمر الوصول حتى ذلك التاريخ.",
  },
  billing: {
    title: "الفوترة",
    empty: "لا يوجد اشتراك مدفوع بعد. اشترك في باقة من صفحة الأسعار. يتجدد تلقائيا حتى تلغيه.",
    renewsOn: "يتجدد تلقائيا في",
    endsOn: "يستمر الوصول حتى",
    cancelsAtEnd: "يلغى في نهاية الفترة",
    cardLabel: "البطاقة",
    cardMissing: "غير محفوظة بعد",
    ending: "تنتهي بـ",
    updateCard: "تحديث البطاقة",
    cancelRenewal: "إيقاف التجديد التلقائي",
    resumeRenewal: "استئناف التجديد التلقائي",
    cancelledInfo: "سيلغى التجديد في نهاية هذه الفترة.",
    resumedInfo: "التجديد التلقائي مفعل من جديد.",
    loadFailed: "تعذر تحميل الفوترة.",
    updateFailed: "تعذر تحديث الفوترة.",
    chargeFailed: "فشلت آخر عملية خصم. استبدل البطاقة ليتمكن الاشتراك من التجدد.",
    nextRetry: "المحاولة التالية في",
    seats: "مقاعد",
    cardTitle: "تحديث البطاقة",
    cardLead: "يتحقق ميسر من البطاقة بخصم 1 ريال ويحفظها للتجديد. هذا لا يغير فترة الباقة.",
    cardConsent: "أوافق على استبدال البطاقة المحفوظة للتجديد التلقائي عبر ميسر.",
    cardUpdated: "تم تحديث البطاقة. التجديدات القادمة تستخدم هذه البطاقة.",
    cardSaveFailed: "تعذر حفظ البطاقة.",
    cardUnavailable: "حفظ البطاقة غير متاح حتى يتاح حفظ البطاقات في ميسر.",
    downgraded:
      "تعذر تجديد البطاقة المحفوظة في يوم التجديد وبعد يوم و3 أيام. هذا الحساب على باقة المهندس المساعد المجانية.",
    endedBody:
      "انتهت الباقة المدفوعة، والحساب الآن على باقة المساعد المجانية. تطبق حدود الردود اليومية، ويحفظ سجل المحادثات حسب الباقة المجانية.",
    endedRenew: "جدد",
  },
  subscription: {
    title: "الباقات والاشتراك",
    lead: "اختر المهندس المساعد أو المهندس أو المهندس المحترف أو المهندس الاستشاري أو الفريق أو المؤسسات.",
    freePlan: "هذه باقتك المجانية",
    processing: "جاري المعالجة...",
    subscribe: "اشترك الآن",
    toolsInPlan: "أدوات المهندس في هذه الباقة",
    back: "العودة إلى الملف",
    loginRequired: "ادخل أو سجل قبل اختيار الباقة.",
    saveFailed: "تعذر حفظ الاشتراك.",
    freeSaved: "حفظت باقة المساعد المجانية. تابع من ملفك.",
    paymentStartFailed: "تعذر بدء الدفع. حاول مرة أخرى.",
    processFailed: "تعذرت معالجة الطلب. حاول مرة أخرى.",
  },
  feedback: {
    title: "الملاحظات والشكاوى",
    lead: "ساعدنا على تحسين engineerit.ai. ترسل رسالتك إلى support@engineerit.ai. يمكنك أيضا سؤال المساعد الذكي.",
    botHello: "مرحبا. أنا المساعد الذكي لـ engineerit.ai. كيف أساعدك في المنصة أو الاشتراكات أو مشكلة؟",
    botUnclear: "لم أفهم ذلك. أعد الصياغة من فضلك.",
    botError: "تعذر الاتصال بالمساعد الذكي. حاول لاحقا.",
    category: "التصنيف",
    feedback: "ملاحظة",
    complaint: "شكوى",
    suggestion: "اقتراح",
    emailOptional: "بريدك (اختياري)",
    message: "الرسالة",
    messagePlaceholder: "اكتب ملاحظتك أو شكواك أو اقتراحك…",
    sending: "جاري الإرسال…",
    submit: "إرسال",
    thanks: "شكرا لك. تم إرسال رسالتك.",
    sendError: "تعذر إرسال الرسالة. حاول لاحقا.",
    assistant: "المساعد الذكي",
    askAssistant: "اسأل المساعد الذكي",
    askPlaceholder: "اسأل المساعد الذكي…",
    send: "إرسال",
    close: "إغلاق",
    review: {
      link: "قيم المنصة",
      title: "رأيك في engineerit.ai",
      lead: "اختر تقييما من 1 إلى 5. السؤالان اختياريان. يحفظ هذا على حسابك بعد الدخول.",
      rating: "كيف تجد المنصة؟",
      liked: "ما الذي يعجبك؟",
      improve: "ما الذي ينبغي أن نحسنه أو نضيفه؟",
      optional: "اختياري",
      submit: "إرسال الملاحظة",
      sending: "جاري الإرسال…",
      thanks: "شكرا لك. حفظنا ملاحظتك.",
      error: "تعذر حفظ الملاحظة. حاول مرة أخرى.",
      signIn: "دخول",
      signInLead: "ادخل لحفظ الملاحظة على حسابك.",
      unavailable: "حفظ الملاحظات غير جاهز بعد. يمكنك الكتابة إلى support@engineerit.ai.",
    },
  },
  legal: {
    termsTitle: "سياسة الاستخدام والاتفاق",
    termsLead: "تصف هذه الصفحة الشروط وسياسة الخصوصية وسياسة الإلغاء والاسترداد وحدود المسؤولية عند استخدام engineerit.ai.",
    privacyTitle: "سياسة الخصوصية – engineerit.ai",
    privacyLead: "تصف هذه الصفحة سياسة الخصوصية لمنصة engineerit.ai.",
    privacyBody: "النص الكامل لسياسة الخصوصية في المستند القانوني:",
    privacyLink: "افتح قسم الخصوصية في الصفحة القانونية",
    privacyNote: "هذا العنوان مخصص لمتطلبات مزود الدفع. النص الحاكم هو الصفحة القانونية.",
    refundTitle: "سياسة الاسترداد والإلغاء – engineerit.ai",
    refundLead: "تصف هذه الصفحة سياسة الاسترداد والإلغاء في engineerit.ai.",
    refundBody: "النص الكامل لسياسة الاسترداد في المستند القانوني:",
    refundLink: "افتح قسم الاسترداد في الصفحة القانونية",
    refundNote: "هذا العنوان مخصص لمتطلبات مزود الدفع. النص الحاكم هو الصفحة القانونية.",
    downloadTitle: "تنزيل الشروط الكاملة",
    downloadLead: "احصل على شروط الاستخدام باللغة التي تقرأ بها.",
    downloadButton: "تنزيل شروط الاستخدام",
  },
  install: {
    menu: "تثبيت التطبيق",
    bannerTitle: "ثبت التطبيق",
    bannerBody: "أضف engineer it إلى شاشتك الرئيسية.",
    install: "تثبيت",
    notNow: "ليس الآن",
    close: "إغلاق",
    share: "مشاركة",
    iosSafari: "اضغط {share}، ثم «إضافة إلى الشاشة الرئيسية».",
    iosOther: "افتح الصفحة في Safari، ثم اضغط {share} ثم «إضافة إلى الشاشة الرئيسية».",
    browserMenu: "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
    pricingLine: "ثبت التطبيق",
  },
};

export const shellCopy: Record<Locale, ShellCopy> = { en, ar };
