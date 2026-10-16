import type { Locale } from "@/lib/i18n";

export type PageMeta = { title: string; description: string };

const META: Record<Locale, Record<string, PageMeta>> = {
  en: {
    "/": {
      title: "engineerit.ai | AI engineering assistant for GCC consultancies",
      description:
        "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Paid plans add exports.",
    },
    "/faq": {
      title: "Questions | engineerit.ai",
      description:
        "Answers for engineering consultancies: trying the chat, standards, Moyasar billing, language, and company verification.",
    },
    "/pricing": {
      title: "Pricing | engineerit.ai",
      description:
        "Assistant Engineer is free. Engineer is SAR 19 per month, Professional Engineer SAR 41 per month, Consultant Engineer SAR 99 per month. Team is SAR 499 per month for 5 seats. Enterprise is SAR 3,900 per month for 10 seats.",
    },
    "/chat": {
      title: "Chat | engineerit.ai",
      description:
        "Open the engineerit.ai chat. Choose a discipline and ask an engineering question, or start from an engineer tool.",
    },
    "/advisors": {
      title: "AI Advisors | engineerit.ai",
      description:
        "The PMO Advisor is included on Consultant Engineer. Program Assurance is included on Team. Operations Readiness and Decision Support are included on Enterprise.",
    },
    "/login": {
      title: "Login | engineerit.ai",
      description: "Sign in to engineerit.ai to continue your engineering chats and manage your plan.",
    },
    "/register": {
      title: "Register | engineerit.ai",
      description:
        "Create an engineerit.ai account. Plans are Assistant Engineer, Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise.",
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
    "/faq": {
      title: "الأسئلة الشائعة | engineerit.ai",
      description:
        "إجابات للمكاتب الهندسية: تجربة المحادثة، والمعايير، وفوترة Moyasar، واللغة، وتوثيق الشركة.",
    },
    "/pricing": {
      title: "الأسعار | engineerit.ai",
      description:
        "المهندس المساعد مجاني. المهندس 19 ر.س شهرياً، والمهندس المحترف 41 ر.س، والمهندس الاستشاري 99 ر.س. الفريق 499 ر.س شهرياً لخمسة مقاعد. المؤسسات 3,900 ر.س شهرياً لعشرة مقاعد.",
    },
    "/chat": {
      title: "المحادثة | engineerit.ai",
      description: "افتح محادثة engineerit.ai. اختر التخصص واسأل سؤالاً هندسياً، أو ابدأ من أداة مهندس.",
    },
    "/advisors": {
      title: "مستشارو الذكاء الاصطناعي | engineerit.ai",
      description:
        "مستشار إدارة المشاريع مشمول في المهندس الاستشاري. ضمان البرنامج مشمول في الفريق. جاهزية التشغيل ودعم القرار مشمولان في المؤسسات.",
    },
    "/login": {
      title: "دخول | engineerit.ai",
      description: "ادخل إلى engineerit.ai لمتابعة محادثاتك الهندسية وإدارة باقتك.",
    },
    "/register": {
      title: "تسجيل | engineerit.ai",
      description:
        "أنشئ حساب engineerit.ai. الباقات هي المهندس المساعد والمهندس والمهندس المحترف والمهندس الاستشاري والفريق والمؤسسات.",
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
