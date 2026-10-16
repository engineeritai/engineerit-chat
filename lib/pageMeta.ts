import type { Locale } from "@/lib/i18n";

export type PageMeta = { title: string; description: string };

const META: Record<Locale, Record<string, PageMeta>> = {
  en: {
    "/": {
      title: "engineerit.ai | AI engineering assistant for GCC consultancies",
      description:
        "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Paid plans add exports.",
    },
    "/pricing": {
      title: "Pricing | engineerit.ai",
      description:
        "Prices include VAT. Assistant Engineer is free. Engineer is SAR 19 per month, Professional Engineer SAR 41 per month, Consultant Engineer SAR 79 per month. Team is SAR 349 per month for 5 seats. Enterprise starts from SAR 2,500 per month.",
    },
    "/chat": {
      title: "Chat | engineerit.ai",
      description:
        "Open the engineerit.ai chat. Choose a discipline and ask an engineering question, or start from an engineer tool.",
    },
    "/advisors": {
      title: "AI Advisors | engineerit.ai",
      description:
        "PMO, including procurement and supply chain, Program Assurance, Operations Readiness, and Decision Support. One-click playbooks turn uploaded files into export-ready reports.",
    },
    "/login": {
      title: "Login | engineerit.ai",
      description: "Sign in to engineerit.ai to continue your engineering chats and manage your plan.",
    },
    "/register": {
      title: "Register | engineerit.ai",
      description: "Create an engineerit.ai account and choose Assistant, Engineer, Professional, or Consultant.",
    },
    "/profile": {
      title: "Profile | engineerit.ai",
      description: "View your engineerit.ai profile, plan, and billing.",
    },
    "/feedback": {
      title: "Feedback | engineerit.ai",
      description: "Send feedback or a complaint about engineerit.ai.",
    },
    "/subscription": {
      title: "Subscription | engineerit.ai",
      description: "Choose or upgrade your engineerit.ai plan.",
    },
    "/legal/terms": {
      title: "User Policy | engineerit.ai",
      description: "Terms, privacy, and refund policy for engineerit.ai.",
    },
    "/legal/privacy": {
      title: "Privacy Policy | engineerit.ai",
      description: "Privacy policy for the engineerit.ai platform.",
    },
    "/legal/refund": {
      title: "Refund Policy | engineerit.ai",
      description: "Refund and cancellation policy for engineerit.ai.",
    },
    "/payment/success": {
      title: "Payment successful | engineerit.ai",
      description: "Your engineerit.ai payment completed.",
    },
    "/payment/failed": {
      title: "Payment not completed | engineerit.ai",
      description: "Your engineerit.ai payment did not complete.",
    },
    "/reset-password": {
      title: "Reset password | engineerit.ai",
      description: "Set a new password for your engineerit.ai account.",
    },
    "/auth/login": {
      title: "Login | engineerit.ai",
      description: "Sign in to engineerit.ai.",
    },
    "/auth/confirmed": {
      title: "Email confirmed | engineerit.ai",
      description: "Your engineerit.ai email address has been confirmed.",
    },
  },
  ar: {
    "/": {
      title: "engineerit.ai | مساعد هندسي بالذكاء الاصطناعي لمكاتب الخليج",
      description:
        "engineerit.ai يهندس أي فكرة أو موضوع بمنهج منظم. أرفق ملفاتك، واختر أداة، واحصل على إجابات منظمة. الباقات المدفوعة تضيف التصدير.",
    },
    "/pricing": {
      title: "الأسعار | engineerit.ai",
      description:
        "الأسعار شاملة الضريبة. المهندس المساعد مجاني. المهندس 19 ر.س شهرياً، والمهندس المحترف 41 ر.س، والمهندس الاستشاري 79 ر.س. الفريق 349 ر.س شهرياً لخمسة مقاعد. المؤسسات من 2500 ر.س شهرياً.",
    },
    "/chat": {
      title: "المحادثة | engineerit.ai",
      description: "افتح محادثة engineerit.ai. اختر التخصص واسأل سؤالاً هندسياً، أو ابدأ من أداة مهندس.",
    },
    "/advisors": {
      title: "مستشارو الذكاء الاصطناعي | engineerit.ai",
      description:
        "إدارة المشاريع بما فيها المشتريات وسلسلة الإمداد، وضمان البرنامج، وجاهزية التشغيل، ودعم القرار. كتيبات بنقرة واحدة تحوّل الملفات إلى تقارير جاهزة للتصدير.",
    },
    "/login": {
      title: "دخول | engineerit.ai",
      description: "ادخل إلى engineerit.ai لمتابعة محادثاتك الهندسية وإدارة باقتك.",
    },
    "/register": {
      title: "تسجيل | engineerit.ai",
      description: "أنشئ حساب engineerit.ai واختر المهندس المساعد أو المهندس أو المحترف أو الاستشاري.",
    },
    "/profile": {
      title: "الملف | engineerit.ai",
      description: "اعرض ملفك وباقتك وفواتيرك في engineerit.ai.",
    },
    "/feedback": {
      title: "الملاحظات | engineerit.ai",
      description: "أرسل ملاحظة أو شكوى عن engineerit.ai.",
    },
    "/subscription": {
      title: "الاشتراك | engineerit.ai",
      description: "اختر باقة engineerit.ai أو رقّها.",
    },
    "/legal/terms": {
      title: "سياسة الاستخدام | engineerit.ai",
      description: "الشروط والخصوصية وسياسة الاسترداد في engineerit.ai.",
    },
    "/legal/privacy": {
      title: "سياسة الخصوصية | engineerit.ai",
      description: "سياسة الخصوصية لمنصة engineerit.ai.",
    },
    "/legal/refund": {
      title: "سياسة الاسترداد | engineerit.ai",
      description: "سياسة الاسترداد والإلغاء في engineerit.ai.",
    },
    "/payment/success": {
      title: "تم الدفع | engineerit.ai",
      description: "اكتمل دفع engineerit.ai.",
    },
    "/payment/failed": {
      title: "لم يكتمل الدفع | engineerit.ai",
      description: "لم يكتمل دفع engineerit.ai.",
    },
    "/reset-password": {
      title: "إعادة تعيين كلمة المرور | engineerit.ai",
      description: "عيّن كلمة مرور جديدة لحساب engineerit.ai.",
    },
    "/auth/login": {
      title: "دخول | engineerit.ai",
      description: "ادخل إلى engineerit.ai.",
    },
    "/auth/confirmed": {
      title: "تم تأكيد البريد | engineerit.ai",
      description: "تم تأكيد بريد engineerit.ai.",
    },
  },
};

export function metaFor(locale: Locale, path: string): PageMeta {
  return META[locale][path] ?? META[locale]["/"];
}
