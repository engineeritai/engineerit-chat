import type { Locale } from "@/lib/i18n";
import type { EngineerToolId } from "@/lib/engineerTools";

export type ShellCopy = {
  nav: {
    navigation: string;
    pages: string;
    home: string;
    chat: string;
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
    genericError: string;
    loggedIn: string;
    registerTitle: string;
    registerLead: string;
    createAccount: string;
    fullName: string;
    fullNamePlaceholder: string;
    confirmEmail: string;
    confirmEmailPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    agreePrefix: string;
    agreeSuffix: string;
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
    emailMismatch: string;
    passwordMismatch: string;
    passwordMin: string;
    createdConfirm: string;
    createdRedirect: string;
    upgradeAnytime: string;
    policyName: string;
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
    askPlaceholder: string;
    send: string;
    close: string;
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
};

const en: ShellCopy = {
  nav: {
    navigation: "Navigation",
    pages: "Pages",
    home: "Home",
    chat: "Chat",
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
    dailyPaid: "Daily limit reached. Please upgrade.",
    dailyGuestReply: "Daily limit reached. Please register or log in to continue using engineerit.ai.",
    dailyPaidReply: "Daily limit reached. Please upgrade to continue.",
    sorry: "Sorry, something failed. Please try again.",
    copyFailed: "Copy failed on this browser.",
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
    upgradeTitle: "Upgrade required",
    registerBody: "Please register or log in to continue.",
    upgradeBody: "Upgrade to continue without limits.",
    close: "Close",
    upgrade: "Upgrade",
    copy: "Copy",
    share: "Share",
    exportPdf: "Export PDF",
    exportWord: "Export Word",
    exportPpt: "Export PowerPoint",
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
    genericError: "Something went wrong. Please try again.",
    loggedIn: "Logged in. Redirecting to your profile...",
    registerTitle: "Register on engineerit.ai",
    registerLead:
      "Create your account, start on the free Assistant Engineer plan, and buy Engineer, Professional Engineer, Consultant Engineer, Team, or Enterprise through Moyasar.",
    createAccount: "Create your account",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    confirmEmail: "Confirm email",
    confirmEmailPlaceholder: "Repeat your email",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your password",
    agreePrefix: "I have read and agree to the",
    agreeSuffix:
      ", including cancellation and refund policies, and I understand that engineerit.ai is not responsible for decisions based on its outputs.",
    creating: "Creating account...",
    create: "Create account",
    emailConfirmTitle: "Email confirmation required",
    emailConfirmHint: "After confirmation, come back and sign in from the top bar.",
    afterRegister:
      "After registration, your account starts on the free Assistant Engineer plan. Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise are bought through Moyasar, monthly or annual. Annual price is 10 times the monthly price. Paid plans renew automatically until you cancel.",
    viewPlans: "View plans and subscribe",
    plansOverview: "Plans and engineer tools",
    toolsInPlan: "Engineer tools in this plan",
    createHere: "Create one here",
    emailRequired: "Please enter and confirm your email.",
    emailMismatch: "Email and confirmation email do not match.",
    passwordMismatch: "Password and confirmation password do not match.",
    passwordMin: "Password must be at least 8 characters.",
    createdConfirm:
      "Account created. We sent a confirmation email. Check your inbox and junk folder, confirm the address, then sign in from the top bar.",
    createdRedirect: "Account created. Redirecting to your profile...",
    upgradeAnytime: "You can change your plan at any time from your profile or the pricing page.",
    policyName: "User policy and agreement",
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
    consent: "Save card for automatic renewal (optional)",
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
      "Apple Pay, Samsung Pay, and STC Pay are one-time payments. Renew from your profile whenever you like.",
    phonePay: "Pay with your phone",
    scanToPay: "STC Pay or mada on your phone",
    phonePayHint:
      "Scan this code to open this checkout on your phone. The link lasts 15 minutes and opens this payment only.",
    phonePayWaiting: "This page opens the invoice when the phone payment is confirmed.",
    phonePayExpired: "This phone link has expired. Open checkout on your computer and scan a new code.",
    phonePayInvalid: "This phone link is not valid. Open checkout on your computer and scan a new code.",
    retry: "Try again",
    paymentFailed: "The payment did not go through. Check the details and try again.",
    copyLink: "Copy phone link",
    copied: "Link copied",
    networks: "Cards",
    vatNote: "VAT as applicable",
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
    lead: "Help us improve engineerit.ai. Your message goes to info@engineerit.ai. You can also ask the smart assistant.",
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
    askPlaceholder: "Ask the smart assistant…",
    send: "Send",
    close: "Close",
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
};

const ar: ShellCopy = {
  nav: {
    navigation: "التنقل",
    pages: "الصفحات",
    home: "الرئيسية",
    chat: "المحادثة",
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
    signingIn: "جارٍ الدخول…",
    signIn: "دخول",
    forgot: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    register: "تسجيل",
    resetTitle: "إعادة تعيين كلمة المرور",
    yourEmail: "بريدك",
    sending: "جارٍ الإرسال…",
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
    daysLeft: "{days} يوماً متبقية",
    dayLeft: "يوم واحد متبقٍ",
    upgrade: "ترقية",
    renew: "تجديد",
    invoicesLink: "الاشتراك والفواتير",
    topicsLink: "المواضيع والملفات",
    resetPassword: "إعادة تعيين كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    updatePassword: "تحديث كلمة المرور",
    updating: "جارٍ التحديث…",
    unableSignIn: "تعذر الدخول. حاول مرة أخرى.",
    genericError: "حدث خطأ. حاول مرة أخرى.",
    enterEmail: "أدخل بريدك أولاً.",
    resetSent: "أُرسل رابط الاستعادة إلى بريدك.",
    passwordShort: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    passwordUpdated: "تم تحديث كلمة المرور.",
  },
  chat: {
    newChat: "محادثة جديدة",
    discipline: "التخصص",
    history: "السجل",
    emptyHistory: "لا توجد محادثات بعد",
    welcomeTitle: "مرحباً بك في engineerit.ai",
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
    dailyGuest: "بلغت الحد اليومي. سجّل أو ادخل.",
    dailyPaid: "بلغت الحد اليومي. يرجى الترقية.",
    dailyGuestReply: "بلغت الحد اليومي. سجّل أو ادخل لمتابعة استخدام engineerit.ai.",
    dailyPaidReply: "بلغت الحد اليومي. يرجى الترقية للمتابعة.",
    sorry: "عذراً، حدث خطأ. حاول مرة أخرى.",
    copyFailed: "تعذر النسخ في هذا المتصفح.",
    pdfFailed: "تعذر تصدير بي دي إف. حاول مرة أخرى.",
    wordFailed: "تعذر تصدير وورد. حاول مرة أخرى.",
    pptFailed: "تعذر تصدير باوربوينت. حاول مرة أخرى.",
    newConversation: "محادثة جديدة",
    attachmentOnly: "[مرفق]",
    analyzeImage: "حلّل هذه الصورة الهندسية.",
    analyzeDocument: "استخرج هذا المستند ولخّصه.",
    imageFailed: "تعذر تحليل الصورة. حاول مرة أخرى أو استخدم صورة أصغر.",
    documentFailed: "تعذرت معالجة المستند. حاول مرة أخرى، أو حوّله إلى بي دي إف أو نص ثم أعد رفعه.",
    registerTitle: "التسجيل أو الدخول",
    upgradeTitle: "الترقية مطلوبة",
    registerBody: "سجّل أو ادخل للمتابعة.",
    upgradeBody: "رقِّ باقتك للمتابعة دون حدود.",
    close: "إغلاق",
    upgrade: "ترقية",
    copy: "نسخ",
    share: "مشاركة",
    exportPdf: "تصدير بي دي إف",
    exportWord: "تصدير وورد",
    exportPpt: "تصدير باوربوينت",
    toolsLabel: "أدوات المهندس:",
    empty: "اسأل سؤالاً هندسياً لبدء المحادثة.",
    you: "أنت",
    ai: "الذكاء",
    registerActions: "سجّل للنسخ والمشاركة وإرفاق الملفات",
    upgradeActions: "رقِّ باقتك للنسخ والمشاركة وإرفاق الملفات",
    saveHtml: "حفظ الصفحة",
    print: "طباعة",
    whatsapp: "واتساب",
    closeShare: "إغلاق",
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
    upgradeKeep: "رقِّ الباقة للإبقاء عليها مدة أطول",
    historySignIn: "سجّل الدخول ليُحفظ السجل على كل الأجهزة.",
    historyLoading: "جارٍ تحميل السجل…",
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
    promptA: "راجع رسماً بحثاً عن التعارضات والملاحظات الناقصة",
    promptB: "اكتب طريقة تنفيذ لنشاط في الموقع",
    promptC: "تحقق من المواصفة مقابل الكود",
    promptD: "لخّص المخاطر في تقرير فني",
    dictate: "إملاء",
    listening: "جارٍ الاستماع",
    toolsMenu: "الأدوات",
    advisorsMenu: "المستشارون",
    hideSidebar: "إخفاء الشريط",
    showSidebar: "إظهار الشريط",
    moreActions: "إجراءات المحادثة",
    prompts: {
      drawing: "اشرح وحلّل الرسم الهندسي المرفق، بما في ذلك مخطط التدفق أو مخطط الأنابيب والأجهزة أو المخطط الصندوقي.",
      design: "راجع هذا التصميم الهندسي مقابل الأكواد والمعايير ذات الصلة.",
      itp: "أعد خطة فحص واختبار وقائمة جودة.",
      boq: "اقترح جدول كميات منظماً بالبنود والوحدات.",
      schedule: "ابنِ جدولاً زمنياً عالي المستوى للمشروع.",
      value: "أجرِ مراجعة هندسة قيمية.",
      dashboard: "أعد ملخص لوحة إدارة بالمؤشرات والمخاطر والإجراءات.",
    },
    advisorPrompt: "اسأل مستشاراً هندسياً عن هذا الموضوع.",
  },
  auth: {
    signInTitle: "دخول",
    signInLead: "استخدم حساب engineerit.ai للوصول إلى محادثاتك ومستنداتك.",
    welcome: "مرحباً بعودتك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signingIn: "جارٍ الدخول…",
    signIn: "دخول",
    noAccount: "جديد هنا؟",
    createOne: "أنشئ حساباً",
    unable: "تعذر الدخول. حاول مرة أخرى.",
    genericError: "حدث خطأ. حاول مرة أخرى.",
    loggedIn: "تم الدخول. جارٍ التحويل إلى ملفك...",
    registerTitle: "التسجيل في engineerit.ai",
    registerLead:
      "أنشئ حسابك، وابدأ بباقة المهندس المساعد المجانية، واشترِ المهندس أو المهندس المحترف أو المهندس الاستشاري أو الفريق أو المؤسسات عبر Moyasar.",
    createAccount: "إنشاء الحساب",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "اسمك الكامل",
    confirmEmail: "تأكيد البريد",
    confirmEmailPlaceholder: "أعد كتابة البريد",
    confirmPassword: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أعد كتابة كلمة المرور",
    agreePrefix: "قرأت وأوافق على",
    agreeSuffix: "، بما في ذلك سياسات الإلغاء والاسترداد، وأفهم أن engineerit.ai غير مسؤول عن القرارات المبنية على مخرجاته.",
    creating: "جارٍ إنشاء الحساب...",
    create: "إنشاء الحساب",
    emailConfirmTitle: "يلزم تأكيد البريد",
    emailConfirmHint: "بعد التأكيد، عد وسجّل الدخول من الشريط العلوي.",
    afterRegister:
      "بعد التسجيل تبدأ على باقة المهندس المساعد المجانية. تُشترى باقات المهندس والمهندس المحترف والمهندس الاستشاري والفريق والمؤسسات عبر Moyasar، شهرياً أو سنوياً. السعر السنوي عشرة أضعاف الشهري. تتجدد الباقات المدفوعة تلقائياً حتى الإلغاء.",
    viewPlans: "عرض الباقات والاشتراك",
    plansOverview: "الباقات وأدوات المهندس",
    toolsInPlan: "أدوات المهندس في هذه الباقة",
    createHere: "أنشئ حساباً من هنا",
    emailRequired: "أدخل البريد وأكّده.",
    emailMismatch: "البريد وتأكيده غير متطابقين.",
    passwordMismatch: "كلمة المرور وتأكيدها غير متطابقين.",
    passwordMin: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    createdConfirm:
      "تم إنشاء الحساب. أرسلنا رسالة تأكيد. راجع الوارد والبريد غير الهام، ثم أكّد العنوان وادخل من الشريط العلوي.",
    createdRedirect: "تم إنشاء الحساب. جارٍ التحويل إلى ملفك...",
    upgradeAnytime: "يمكنك تغيير الباقة في أي وقت من ملفك أو صفحة الأسعار.",
    policyName: "سياسة الاستخدام والاتفاق",
  },
  profile: {
    title: "الملف والاشتراك",
    loading: "جارٍ تحميل الملف…",
    chooseFile: "اختيار ملف",
    avatarHint: "صورة حتى 5 ميجابايت.",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "اسمك الكامل",
    email: "البريد",
    saving: "جارٍ الحفظ…",
    save: "حفظ التغييرات",
    subscription: "الاشتراك",
    currentPlan: "الباقة الحالية",
    yourPlan: "باقتك",
    freeBody: "أنت على باقة المهندس المساعد المجانية. لا تُفرض رسوم حتى الترقية.",
    status: "الحالة",
    price: "السعر",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    noBilling: "لا توجد بيانات فوترة لهذه الباقة بعد.",
    billingNote: "تغيير الباقة يتم عبر فوترة engineerit.ai. غيّر الباقة من صفحة الأسعار.",
    manage: "إدارة الاشتراك أو ترقيته",
    billingLink: "الفوترة والبطاقة والإلغاء",
    manageTeam: "إدارة مقاعد الفريق",
    teamLapsed: "انتهى اشتراك الفريق، وتوقف وصول المستوى الاستشاري لكل المقاعد.",
    activity: "النشاط",
    chats: "إجمالي المحادثات",
    documents: "إجمالي المستندات المرفوعة",
    projects: "المشاريع المحفوظة",
    soon: "قريباً",
    history: "سجل الفوترة",
    noPayments: "لا توجد مدفوعات بعد. ستظهر الاشتراكات القادمة هنا.",
    plan: "الباقة",
    amount: "المبلغ",
    date: "التاريخ",
    invoiceNote: "يُرسل إيصال بالمبلغ والباقة والمدة بعد كل دفعة ناجحة.",
    paymentConfirmed: "تم تأكيد الدفع. سيصلك إيصال بالبريد.",
    paymentPending: "لم يُؤكد الدفع بعد.",
    paymentMissing: "هذه العودة تفتقد مرجع الدفع.",
    unknown: "غير معروف",
    notLoggedIn: "لم تسجّل الدخول.",
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
    autoRenewOn: "مفعّل",
    autoRenewOff: "متوقف",
    renewNow: "جدّد الآن",
    renewing: "جارٍ بدء الدفع…",
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
    confirmingPayment: "جارٍ تأكيد الدفع…",
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
    savedCard: "سنجدّد بهذه البطاقة. يمكنك الإلغاء في أي وقت من ملفك.",
    consent: "حفظ البطاقة للتجديد التلقائي (اختياري)",
    optional: "اختياري",
    renewManually: "يمكنك التجديد يدويًا في أي وقت من ملفك الشخصي.",
    securePay: "دفع آمن عبر ميسر",
    cancelAnytime: "إلغاء في أي وقت",
    cardNotStored: "لا نحتفظ ببيانات بطاقتك على خوادمنا",
    openFailed: "تعذر فتح صفحة الدفع.",
    missingKey: "نموذج البطاقة غير مُعد بعد.",
    seats: "مقاعد",
    payOnce: "ادفع مرة واحدة الآن. يبقى التجديد التلقائي متوقفاً حتى تُحفظ البطاقة.",
    saveRejected: "تعذر حفظ البطاقة هذه المرة. يمكنك الدفع مرة واحدة والتجديد من ملفك.",
    summary: "الطلب",
    walletReminder:
      "Apple Pay وSamsung Pay وSTC Pay دفعات لمرة واحدة. جدّد من ملفك وقتما تشاء.",
    phonePay: "ادفع من جوالك",
    scanToPay: "STC Pay أو مدى من جوالك",
    phonePayHint: "امسح الرمز لفتح هذا الدفع على الجوال. الرابط يعمل 15 دقيقة ولهذا الدفع فقط.",
    phonePayWaiting: "تنتقل هذه الصفحة إلى الفاتورة عند تأكيد الدفع من الجوال.",
    phonePayExpired: "انتهت صلاحية رابط الجوال. افتح الدفع على الكمبيوتر لمسح رمز جديد.",
    phonePayInvalid: "رابط الجوال غير صالح. افتح الدفع على الكمبيوتر وامسح رمزاً جديداً.",
    retry: "حاول مرة أخرى",
    paymentFailed: "لم يتم الدفع. راجع البيانات وحاول مرة أخرى.",
    copyLink: "نسخ رابط الجوال",
    copied: "تم نسخ الرابط",
    networks: "البطاقات",
    vatNote: "ضريبة القيمة المضافة حسب الأنظمة",
  },
  subscription: {
    title: "الباقات والاشتراك",
    lead: "اختر المهندس المساعد أو المهندس أو المهندس المحترف أو المهندس الاستشاري أو الفريق أو المؤسسات.",
    freePlan: "هذه باقتك المجانية",
    processing: "جارٍ المعالجة...",
    subscribe: "اشترك الآن",
    toolsInPlan: "أدوات المهندس في هذه الباقة",
    back: "العودة إلى الملف",
    loginRequired: "ادخل أو سجّل قبل اختيار الباقة.",
    saveFailed: "تعذر حفظ الاشتراك.",
    freeSaved: "حُفظت باقة المساعد المجانية. تابع من ملفك.",
    paymentStartFailed: "تعذر بدء الدفع. حاول مرة أخرى.",
    processFailed: "تعذرت معالجة الطلب. حاول مرة أخرى.",
  },
  feedback: {
    title: "الملاحظات والشكاوى",
    lead: "ساعدنا على تحسين engineerit.ai. تُرسل رسالتك إلى info@engineerit.ai. يمكنك أيضاً سؤال المساعد الذكي.",
    botHello: "مرحباً. أنا المساعد الذكي لـ engineerit.ai. كيف أساعدك في المنصة أو الاشتراكات أو مشكلة؟",
    botUnclear: "لم أفهم ذلك. أعد الصياغة من فضلك.",
    botError: "تعذر الاتصال بالمساعد الذكي. حاول لاحقاً.",
    category: "التصنيف",
    feedback: "ملاحظة",
    complaint: "شكوى",
    suggestion: "اقتراح",
    emailOptional: "بريدك (اختياري)",
    message: "الرسالة",
    messagePlaceholder: "اكتب ملاحظتك أو شكواك أو اقتراحك…",
    sending: "جارٍ الإرسال…",
    submit: "إرسال",
    thanks: "شكراً لك. تم إرسال رسالتك.",
    sendError: "تعذر إرسال الرسالة. حاول لاحقاً.",
    assistant: "المساعد الذكي",
    askPlaceholder: "اسأل المساعد الذكي…",
    send: "إرسال",
    close: "إغلاق",
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
    downloadLead: "نزّل شروط الاستخدام باللغة التي تقرأ بها.",
    downloadButton: "تنزيل شروط الاستخدام",
  },
};

export const shellCopy: Record<Locale, ShellCopy> = { en, ar };
