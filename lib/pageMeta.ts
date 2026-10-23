import type { Locale } from "@/lib/i18n";

export type PageMeta = { title: string; description: string };

const META: Record<Locale, Record<string, PageMeta>> = {
  en: {
    "/": {
      title: "engineerit.ai | AI engineering assistant for GCC consultancies",
      description:
        "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Your subscription unlocks unlimited chats, engineering tools and AI Advisors.",
    },
    "/question": {
      title: "Question of the week | engineerit.ai",
      description:
        "Answer the engineerit.ai question of the week. A correct answer, or taking part when the week allows, can earn a limited 10% discount code.",
    },
    "/faq": {
      title: "Questions | engineerit.ai",
      description:
        "Answers for engineering consultancies: trying the chat, standards, Moyasar billing, language, and company verification.",
    },
    "/how-it-works": {
      title: "How it works | engineerit.ai",
      description:
        "How engineerit.ai works: sign up, pick a discipline, ask or upload a file, use tools, run an advisor playbook, export, and manage billing.",
    },
    "/guide": {
      title: "User guide | engineerit.ai",
      description:
        "Step-by-step guide to engineerit.ai: sign up, discipline, questions and uploads, tools, AI Advisors, export, and plans.",
    },
    "/tools": {
      title: "Tools | engineerit.ai",
      description:
        "Seven engineer tools: drawings, design checks, inspection plans, quantities, schedules, value engineering, and dashboards.",
    },
    "/pricing": {
      title: "Pricing | engineerit.ai",
      description:
        "Assistant Engineer is free. Engineer is SAR 19 per month, Professional Engineer SAR 41 per month, Consultant Engineer SAR 99 per month. Team is SAR 449 per month for 5 seats. Enterprise is SAR 3,900 per month for 10 seats.",
    },
    "/chat": {
      title: "Chat | engineerit.ai",
      description:
        "Open the engineerit.ai chat. Choose a discipline and ask an engineering question, or start from an engineer tool.",
    },
    "/advisors": {
      title: "AI Advisors | engineerit.ai",
      description:
        "Consultant Engineer includes the PMO Advisor. Team includes PMO and Program Assurance. Enterprise includes PMO, Program Assurance, Operations Readiness, and Decision Support.",
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
    "/forgot-password": {
      title: "Forgot password | engineerit.ai",
      description: "Send a password reset link for an engineerit.ai account.",
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
        "engineerit.ai يهندس أي فكرة أو موضوع بمنهج منظم. أرفق ملفاتك، واختر أداة، واحصل على إجابات منظمة. اشتراكك يفتح المحادثات غير المحدودة والأدوات الهندسية ومستشاري الذكاء الاصطناعي.",
    },
    "/question": {
      title: "سؤال الأسبوع | engineerit.ai",
      description:
        "أجب عن سؤال الأسبوع في engineerit.ai. الإجابة الصحيحة، أو المشاركة عندما يسمح الأسبوع، تمنحك رمز خصم محدود.",
    },
    "/faq": {
      title: "الأسئلة الشائعة | engineerit.ai",
      description:
        "إجابات للمكاتب الهندسية: تجربة المحادثة، والمعايير، وفوترة Moyasar، واللغة، وتوثيق الشركة.",
    },
    "/how-it-works": {
      title: "كيف يعمل | engineerit.ai",
      description:
        "كيف يعمل engineerit.ai: التسجيل، اختيار التخصص، السؤال أو إرفاق ملف، الأدوات، أدلة المستشارين، التصدير، والفوترة.",
    },
    "/guide": {
      title: "دليل الاستخدام | engineerit.ai",
      description:
        "دليل استخدام engineerit.ai خطوة بخطوة: التسجيل، التخصص، السؤال والملفات، الأدوات، المستشارون، التصدير، والباقات.",
    },
    "/tools": {
      title: "الأدوات | engineerit.ai",
      description:
        "سبع أدوات هندسية: الرسومات، مراجعة التصميم، خطط الفحص، الكميات، الجداول، هندسة القيمة، ولوحات المتابعة.",
    },
    "/pricing": {
      title: "الأسعار | engineerit.ai",
      description:
        "المهندس المساعد مجاني. المهندس 19 ر.س شهريا، والمهندس المحترف 41 ر.س، والمهندس الاستشاري 99 ر.س. الفريق 449 ر.س شهريا لخمسة مقاعد. المؤسسات 3,900 ر.س شهريا لعشرة مقاعد.",
    },
    "/chat": {
      title: "المحادثة | engineerit.ai",
      description: "افتح محادثة engineerit.ai. اختر التخصص واسأل سؤالا هندسيا، أو ابدأ من أداة مهندس.",
    },
    "/advisors": {
      title: "مستشارو الذكاء الاصطناعي | engineerit.ai",
      description:
        "المهندس الاستشاري يشمل مستشار إدارة المشاريع. الفريق يشمل إدارة المشاريع وضمان البرنامج. المؤسسات تشمل إدارة المشاريع وضمان البرنامج وجاهزية التشغيل ودعم القرار.",
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
      description: "اختر باقة engineerit.ai أو ارفعها.",
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
      description: "ضع كلمة مرور جديدة لحساب engineerit.ai.",
    },
    "/forgot-password": {
      title: "نسيت كلمة المرور | engineerit.ai",
      description: "أرسل رابط استعادة كلمة المرور لحساب engineerit.ai.",
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
