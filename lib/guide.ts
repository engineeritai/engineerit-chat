import type { Locale } from "@/lib/i18n";

export type GuideStep = {
  id: string;
  title: string;
  short: string;
  body: string;
  href: string;
  hrefLabel: string;
};

export type GuideCopy = {
  howTitle: string;
  howLead: string;
  guideTitle: string;
  guideLead: string;
  flowLabel: string;
  readGuide: string;
  backHow: string;
  steps: GuideStep[];
};

const en: GuideCopy = {
  howTitle: "How it works",
  howLead: "A short path from a new account to an answer your team can review.",
  guideTitle: "User guide",
  guideLead: "Seven steps. Each one is a single action.",
  flowLabel: "From sign-up to billing",
  readGuide: "Read the full guide",
  backHow: "Back to how it works",
  steps: [
    {
      id: "signup",
      title: "Sign up",
      short: "Create an account, or try the chat as a guest.",
      body: "Open registration and create an account. A guest can send one message a day. The free Assistant plan includes three messages a day. Paid plans remove that daily cap.",
      href: "/register",
      hrefLabel: "Create an account",
    },
    {
      id: "discipline",
      title: "Pick a discipline",
      short: "Choose the engineering field before you ask.",
      body: "In the chat, pick the discipline the question belongs to. The assistant stays inside that field, from civil and structural through process and HSE.",
      href: "/chat",
      hrefLabel: "Open chat",
    },
    {
      id: "ask",
      title: "Ask or upload a drawing or document",
      short: "Type the question, or attach a file on a paid plan.",
      body: "Write the question in the composer. On a paid plan, attach a drawing, PDF, or document. The answer stays in the thread so you can follow up.",
      href: "/chat",
      hrefLabel: "Ask a question",
    },
    {
      id: "tools",
      title: "Use tools",
      short: "Start from an engineer tool when you want a set brief.",
      body: "Tools insert a structured brief: drawing review, design check, inspection and test plan, bill of quantities, schedule, value engineering, and a project dashboard. Each tool opens on the plan that includes it.",
      href: "/#tools",
      hrefLabel: "See the tools",
    },
    {
      id: "advisors",
      title: "AI Advisors playbooks",
      short: "Run a playbook with the advisor included in your plan.",
      body: "Advisors walk a review with a playbook. Consultant Engineer includes the PMO Advisor. Team adds Program Assurance. Enterprise also includes Operations Readiness and Decision Support.",
      href: "/advisors",
      hrefLabel: "Open AI Advisors",
    },
    {
      id: "export",
      title: "Export and share",
      short: "Copy the answer, or export it on a higher plan.",
      body: "Copy the reply and share it with your team. Higher plans export the thread as PDF, Word, or PowerPoint.",
      href: "/pricing",
      hrefLabel: "Compare plans",
    },
    {
      id: "plans",
      title: "Plans and billing",
      short: "Pick a plan, pay with Moyasar, and download the invoice from your profile.",
      body: "Compare plans on the pricing page. Checkout uses Moyasar. Apple Pay, Samsung Pay, and STC Pay are one-time payments. A saved card can renew the plan. After payment, the invoice is on your profile and a receipt is emailed.",
      href: "/pricing",
      hrefLabel: "View pricing",
    },
  ],
};

const ar: GuideCopy = {
  howTitle: "كيف يعمل",
  howLead: "مسار قصير من حساب جديد إلى إجابة يمكن لفريقك مراجعتها.",
  guideTitle: "دليل الاستخدام",
  guideLead: "سبع خطوات. كل خطوة إجراء واحد.",
  flowLabel: "من التسجيل إلى الفوترة",
  readGuide: "اقرأ الدليل كاملا",
  backHow: "العودة إلى كيف يعمل",
  steps: [
    {
      id: "signup",
      title: "سجل",
      short: "أنشئ حسابا، أو جرب المحادثة كزائر.",
      body: "افتح التسجيل وأنشئ حسابا. الزائر يرسل رسالة واحدة في اليوم. باقة المهندس المساعد المجانية تشمل ثلاث رسائل في اليوم. الباقات المدفوعة ترفع هذا الحد اليومي.",
      href: "/register",
      hrefLabel: "إنشاء حساب",
    },
    {
      id: "discipline",
      title: "اختر التخصص",
      short: "حدد المجال الهندسي قبل السؤال.",
      body: "في المحادثة، اختر التخصص الذي ينتمي إليه السؤال. يبقى المساعد داخل هذا المجال، من المدني والإنشائي حتى العمليات والسلامة.",
      href: "/chat",
      hrefLabel: "افتح المحادثة",
    },
    {
      id: "ask",
      title: "اسأل أو أرفق رسما أو مستندا",
      short: "اكتب السؤال، أو أرفق ملفا في باقة مدفوعة.",
      body: "اكتب السؤال في مربع الكتابة. في الباقة المدفوعة أرفق رسما أو PDF أو مستندا. تبقى الإجابة في المحادثة لتتابعها.",
      href: "/chat",
      hrefLabel: "اطرح سؤالا",
    },
    {
      id: "tools",
      title: "استخدم الأدوات",
      short: "ابدأ من أداة مهندس عندما تريد موجزا جاهزا.",
      body: "الأدوات تدرج موجزا منظما: مراجعة رسم، فحص تصميم، خطة فحص واختبار، جدول كميات، جدول زمني، هندسة القيمة، ولوحة مشروع. كل أداة تفتح في الباقة التي تشملها.",
      href: "/#tools",
      hrefLabel: "اعرض الأدوات",
    },
    {
      id: "advisors",
      title: "أدلة مستشاري الذكاء الاصطناعي",
      short: "شغل دليلا مع المستشار المشمول في باقتك.",
      body: "المستشار يمشي المراجعة وفق دليل. المهندس الاستشاري يشمل مستشار إدارة المشاريع. الفريق يضيف ضمان البرنامج. المؤسسات تشمل أيضا جاهزية التشغيل ودعم القرار.",
      href: "/advisors",
      hrefLabel: "افتح المستشارين",
    },
    {
      id: "export",
      title: "تصدير ومشاركة",
      short: "انسخ الإجابة، أو استخدم التصدير في باقة أعلى.",
      body: "انسخ الرد وشاركه مع فريقك. الباقات الأعلى تشمل تصدير المحادثة كملف PDF أو وورد أو باوربوينت.",
      href: "/pricing",
      hrefLabel: "قارن الباقات",
    },
    {
      id: "plans",
      title: "الباقات والفوترة",
      short: "اختر باقة، وادفع عبر Moyasar، وراجع الفاتورة من ملفك.",
      body: "قارن الباقات في صفحة الأسعار. الدفع عبر Moyasar. Apple Pay وSamsung Pay وSTC Pay دفعات لمرة واحدة. البطاقة المحفوظة تجدد الباقة. بعد الدفع تظهر الفاتورة في ملفك ويرسل إيصال بالبريد.",
      href: "/pricing",
      hrefLabel: "اعرض الأسعار",
    },
  ],
};

export function guideCopy(locale: Locale): GuideCopy {
  return locale === "ar" ? ar : en;
}
