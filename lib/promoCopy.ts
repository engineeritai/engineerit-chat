import type { PromoRejectReason } from "@/lib/promoCodes";

export type PromoCopy = {
  haveCode: string;
  placeholder: string;
  apply: string;
  remove: string;
  applied: string;
  checking: string;
  original: string;
  discount: string;
  total: string;
  renewOnce: string;
  renewMany: (renewals: number) => string;
  freeActivate: string;
  freeNote: string;
  activating: string;
  reasons: Record<PromoRejectReason, string>;
  question: {
    title: string;
    lead: string;
    empty: string;
    submit: string;
    submitting: string;
    signIn: string;
    correct: string;
    incorrect: string;
    participation: string;
    already: string;
    reward: (percent: number) => string;
    copy: string;
    copied: string;
    share: string;
    linkedin: string;
    x: string;
    choices: string;
  };
};

export const promoCopy: { en: PromoCopy; ar: PromoCopy } = {
  en: {
    haveCode: "Have a code?",
    placeholder: "Enter code",
    apply: "Apply",
    remove: "Remove",
    applied: "Code applied.",
    checking: "Checking the code…",
    original: "Original price",
    discount: "Discount",
    total: "Total today",
    renewOnce: "This discount applies to this payment only. The next renewal is the list price.",
    renewMany: (renewals) =>
      `This discount applies to this payment and ${renewals} renewal${renewals === 1 ? "" : "s"}. Later renewals use the list price.`,
    freeActivate: "Activate free access",
    freeNote:
      "Nothing to pay today. This period is free. After it ends, the list price applies. Save a card from billing if you want automatic renewal.",
    activating: "Activating…",
    reasons: {
      empty: "Enter a code.",
      not_found: "That code was not found.",
      disabled: "This code is turned off.",
      not_started: "This code is not active yet.",
      expired: "This code has expired.",
      wrong_plan: "This code does not apply to this plan.",
      wrong_interval: "This code does not apply to this billing cycle.",
      wrong_domain: "This code is limited to a university or approved email domain.",
      wrong_user: "This code belongs to a different account.",
      not_lapsed: "This code is only for subscribers whose paid plan has ended.",
      already_used: "You have already used this code.",
      maxed: "This code has reached its limit.",
      below_minimum: "This discount cannot be charged. Ask the owner to adjust the code.",
    },
    question: {
      title: "Question of the week",
      lead: "A short engineering question. Answer it, or take part when the week allows, and a limited discount code is yours.",
      empty: "No question is open this week. Check back soon.",
      submit: "Submit answer",
      submitting: "Checking…",
      signIn: "Sign in to answer",
      correct: "Correct. Your discount code is ready.",
      incorrect: "That is not the answer this week.",
      participation: "Thanks for taking part. Your discount code is ready.",
      already: "You already answered this question.",
      reward: (percent) => `The code is ${percent}% off the first payment, for a limited time.`,
      copy: "Copy code",
      copied: "Copied",
      share: "Share the question",
      linkedin: "LinkedIn",
      x: "X",
      choices: "Choices",
    },
  },
  ar: {
    haveCode: "عندك رمز؟",
    placeholder: "اكتب الرمز",
    apply: "تطبيق",
    remove: "إزالة",
    applied: "تم تطبيق الرمز.",
    checking: "جار التحقق من الرمز…",
    original: "السعر الأصلي",
    discount: "الخصم",
    total: "المجموع اليوم",
    renewOnce: "يسري هذا الخصم على هذه الدفعة فقط. التجديد التالي بالسعر المعلن.",
    renewMany: (renewals) =>
      `يسري هذا الخصم على هذه الدفعة و${renewals} تجديد. بعد ذلك يعود التجديد إلى السعر المعلن.`,
    freeActivate: "تفعيل الوصول المجاني",
    freeNote:
      "لا يوجد مبلغ للدفع اليوم. هذه الفترة مجانية. بعد انتهائها يسري السعر المعلن. احفظ بطاقة من الفوترة إذا أردت التجديد التلقائي.",
    activating: "جار التفعيل…",
    reasons: {
      empty: "اكتب الرمز.",
      not_found: "الرمز غير موجود.",
      disabled: "هذا الرمز متوقف.",
      not_started: "هذا الرمز لم يبدأ بعد.",
      expired: "انتهت صلاحية الرمز.",
      wrong_plan: "الرمز لا يشمل هذه الباقة.",
      wrong_interval: "الرمز لا يشمل دورة الفوترة هذه.",
      wrong_domain: "هذا الرمز مخصص لبريد جامعي أو نطاق معتمد.",
      wrong_user: "هذا الرمز مخصص لحساب آخر.",
      not_lapsed: "هذا الرمز للمشتركين السابقين الذين انتهى اشتراكهم.",
      already_used: "استخدمت هذا الرمز من قبل.",
      maxed: "استنفد هذا الرمز الحد المسموح.",
      below_minimum: "لا يمكن تحصيل هذا الخصم. اطلب تعديل الرمز.",
    },
    question: {
      title: "سؤال الأسبوع",
      lead: "سؤال هندسي قصير. أجب عنه، أو شارك عندما يسمح الأسبوع بذلك، لتحصل على رمز خصم لفترة محدودة.",
      empty: "لا يوجد سؤال مفتوح هذا الأسبوع. عد لاحقا.",
      submit: "إرسال الإجابة",
      submitting: "جار التحقق…",
      signIn: "سجل الدخول للإجابة",
      correct: "إجابة صحيحة. رمز الخصم جاهز.",
      incorrect: "ليست هذه إجابة هذا الأسبوع.",
      participation: "شكرا لمشاركتك. رمز الخصم جاهز.",
      already: "أجبت عن هذا السؤال من قبل.",
      reward: (percent) => `الرمز يخصم ${percent}٪ من أول دفعة، لفترة محدودة.`,
      copy: "نسخ الرمز",
      copied: "تم النسخ",
      share: "شارك السؤال",
      linkedin: "لينكدإن",
      x: "إكس",
      choices: "الخيارات",
    },
  },
};

export function renewalNote(locale: "en" | "ar", cycles: number) {
  const copy = promoCopy[locale];
  if (cycles > 1) return copy.renewMany(cycles - 1);
  return copy.renewOnce;
}
