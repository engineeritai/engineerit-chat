import type { Locale } from "@/lib/i18n";

export type PageMeta = { title: string; description: string };

const META: Record<Locale, Record<string, PageMeta>> = {
  en: {
    "/": {
      title: "engineer it | Your AI Engineering Assistant",
      description:
        "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Your subscription unlocks unlimited chats, engineering tools and AI Advisors.",
    },
    "/faq": {
      title: "Questions | engineer it",
      description:
        "Answers for engineering consultancies: trying the chat, standards, Moyasar billing, language, and company verification.",
    },
    "/how-it-works": {
      title: "How it works | engineer it",
      description:
        "How engineerit.ai works: sign up, pick a discipline, ask or upload a file, use tools, run an advisor playbook, export, and manage billing.",
    },
    "/guide": {
      title: "User guide | engineer it",
      description:
        "Step-by-step guide to engineerit.ai: sign up, discipline, questions and uploads, tools, AI Advisors, export, and plans.",
    },
    "/tools": {
      title: "Tools | engineer it",
      description:
        "Seven engineer tools: drawings, design checks, inspection plans, quantities, schedules, value engineering, and dashboards.",
    },
    "/pricing": {
      title: "Pricing | engineer it",
      description:
        "Assistant Engineer is free. Engineer is SAR 19 per month, Professional Engineer SAR 41 per month, Consultant Engineer SAR 99 per month. Team is SAR 449 per month for 5 seats. Enterprise is SAR 3,900 per month for 10 seats.",
    },
    "/chat": {
      title: "Chat | engineer it",
      description:
        "Open the engineerit.ai chat. Choose a discipline and ask an engineering question, or start from an engineer tool.",
    },
    "/advisors": {
      title: "AI Advisors | engineer it",
      description:
        "Consultant Engineer includes the PMO Advisor. Team includes PMO and Program Assurance. Enterprise includes PMO, Program Assurance, Operations Readiness, and Decision Support.",
    },
    "/login": {
      title: "Login | engineer it",
      description: "Sign in to engineerit.ai to continue your engineering chats and manage your plan.",
    },
    "/register": {
      title: "Register | engineer it",
      description:
        "Create an engineerit.ai account. Plans are Assistant Engineer, Engineer, Professional Engineer, Consultant Engineer, Team, and Enterprise.",
    },
    "/profile": {
      title: "Profile | engineer it",
      description: "View your engineerit.ai profile, plan, and billing.",
    },
    "/feedback": {
      title: "Feedback | engineer it",
      description: "Send feedback or a complaint about engineerit.ai.",
    },
    "/feedback/review": {
      title: "Rate the platform | engineer it",
      description: "Rate engineerit.ai from 1 to 5 and send an optional note about what you like and what to improve.",
    },
    "/subscription": {
      title: "Subscription | engineer it",
      description: "Choose or upgrade your engineerit.ai plan.",
    },
    "/legal/terms": {
      title: "User Policy | engineer it",
      description: "Terms, privacy, and refund policy for engineerit.ai.",
    },
    "/legal/privacy": {
      title: "Privacy Policy | engineer it",
      description: "Privacy policy for the engineerit.ai platform.",
    },
    "/legal/refund": {
      title: "Refund Policy | engineer it",
      description: "Refund and cancellation policy for engineerit.ai.",
    },
    "/payment/success": {
      title: "Payment successful | engineer it",
      description: "Your engineerit.ai payment completed.",
    },
    "/payment/failed": {
      title: "Payment not completed | engineer it",
      description: "Your engineerit.ai payment did not complete.",
    },
    "/reset-password": {
      title: "Reset password | engineer it",
      description: "Set a new password for your engineerit.ai account.",
    },
    "/forgot-password": {
      title: "Forgot password | engineer it",
      description: "Send a password reset link for an engineerit.ai account.",
    },
    "/auth/login": {
      title: "Login | engineer it",
      description: "Sign in to engineerit.ai.",
    },
    "/auth/confirmed": {
      title: "Email confirmed | engineer it",
      description: "Your engineerit.ai email address has been confirmed.",
    },
  },
  ar: {
    "/": {
      title: "engineer it | مساعدك الهندسي بالذكاء الاصطناعي",
      description:
        "engineerit.ai يهندس أي فكرة أو موضوع بمنهج منظم. أرفق ملفاتك، واختر أداة، واحصل على إجابات منظمة. اشتراكك يفتح المحادثات غير المحدودة والأدوات الهندسية ومستشاري الذكاء الاصطناعي.",
    },
    "/faq": {
      title: "الأسئلة الشائعة | engineer it",
      description:
        "إجابات للمكاتب الهندسية: تجربة المحادثة، والمعايير، وفوترة Moyasar، واللغة، وتوثيق الشركة.",
    },
    "/how-it-works": {
      title: "كيف يعمل | engineer it",
      description:
        "كيف يعمل engineerit.ai: التسجيل، اختيار التخصص، السؤال أو إرفاق ملف، الأدوات، أدلة المستشارين، التصدير، والفوترة.",
    },
    "/guide": {
      title: "دليل الاستخدام | engineer it",
      description:
        "دليل استخدام engineerit.ai خطوة بخطوة: التسجيل، التخصص، السؤال والملفات، الأدوات، المستشارون، التصدير، والباقات.",
    },
    "/tools": {
      title: "الأدوات | engineer it",
      description:
        "سبع أدوات هندسية: الرسومات، مراجعة التصميم، خطط الفحص، الكميات، الجداول، هندسة القيمة، ولوحات المتابعة.",
    },
    "/pricing": {
      title: "الأسعار | engineer it",
      description:
        "المهندس المساعد مجاني. المهندس 19 ر.س شهريا، والمهندس المحترف 41 ر.س، والمهندس الاستشاري 99 ر.س. الفريق 449 ر.س شهريا لخمسة مقاعد. المؤسسات 3,900 ر.س شهريا لعشرة مقاعد.",
    },
    "/chat": {
      title: "المحادثة | engineer it",
      description: "افتح محادثة engineerit.ai. اختر التخصص واسأل سؤالا هندسيا، أو ابدأ من أداة مهندس.",
    },
    "/advisors": {
      title: "مستشارو الذكاء الاصطناعي | engineer it",
      description:
        "المهندس الاستشاري يشمل مستشار إدارة المشاريع. الفريق يشمل إدارة المشاريع وضمان البرنامج. المؤسسات تشمل إدارة المشاريع وضمان البرنامج وجاهزية التشغيل ودعم القرار.",
    },
    "/login": {
      title: "دخول | engineer it",
      description: "ادخل إلى engineerit.ai لمتابعة محادثاتك الهندسية وإدارة باقتك.",
    },
    "/register": {
      title: "تسجيل | engineer it",
      description:
        "أنشئ حساب engineerit.ai. الباقات هي المهندس المساعد والمهندس والمهندس المحترف والمهندس الاستشاري والفريق والمؤسسات.",
    },
    "/profile": {
      title: "الملف | engineer it",
      description: "اعرض ملفك وباقتك وفواتيرك في engineerit.ai.",
    },
    "/feedback": {
      title: "الملاحظات | engineer it",
      description: "أرسل ملاحظة أو شكوى عن engineerit.ai.",
    },
    "/feedback/review": {
      title: "قيم المنصة | engineer it",
      description: "قيم engineerit.ai من 1 إلى 5، وأضف ملاحظة اختيارية عما يعجبك وما ينبغي تحسينه.",
    },
    "/subscription": {
      title: "الاشتراك | engineer it",
      description: "اختر باقة engineerit.ai أو ارفعها.",
    },
    "/legal/terms": {
      title: "سياسة الاستخدام | engineer it",
      description: "الشروط والخصوصية وسياسة الاسترداد في engineerit.ai.",
    },
    "/legal/privacy": {
      title: "سياسة الخصوصية | engineer it",
      description: "سياسة الخصوصية لمنصة engineerit.ai.",
    },
    "/legal/refund": {
      title: "سياسة الاسترداد | engineer it",
      description: "سياسة الاسترداد والإلغاء في engineerit.ai.",
    },
    "/payment/success": {
      title: "تم الدفع | engineer it",
      description: "اكتمل دفع engineerit.ai.",
    },
    "/payment/failed": {
      title: "لم يكتمل الدفع | engineer it",
      description: "لم يكتمل دفع engineerit.ai.",
    },
    "/reset-password": {
      title: "إعادة تعيين كلمة المرور | engineer it",
      description: "ضع كلمة مرور جديدة لحساب engineerit.ai.",
    },
    "/forgot-password": {
      title: "نسيت كلمة المرور | engineer it",
      description: "أرسل رابط استعادة كلمة المرور لحساب engineerit.ai.",
    },
    "/auth/login": {
      title: "دخول | engineer it",
      description: "ادخل إلى engineerit.ai.",
    },
    "/auth/confirmed": {
      title: "تم تأكيد البريد | engineer it",
      description: "تم تأكيد بريد engineerit.ai.",
    },
  },
};

export function metaFor(locale: Locale, path: string): PageMeta {
  return META[locale][path] ?? META[locale]["/"];
}
