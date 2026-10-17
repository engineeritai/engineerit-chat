export function pastDueNotice(
  locale: "en" | "ar",
  input: { plan: string; retryDate: string; billingUrl: string }
) {
  if (locale === "ar") {
    return {
      subject: "تعذر خصم البطاقة",
      text: `تعذر تجديد ${input.plan}. حدّث البطاقة من ${input.billingUrl}. المحاولة التالية في ${input.retryDate}. يستمر الوصول حتى تفشل محاولة اليوم 3، ثم ينتقل الحساب إلى باقة المهندس المساعد المجانية.`,
    };
  }
  return {
    subject: "Card charge failed",
    text: `We could not renew ${input.plan}. Update the card at ${input.billingUrl}. The next retry is ${input.retryDate}. Access stays on until the day-3 retry fails, then the account moves to the free Assistant Engineer plan.`,
  };
}

export function downgradeNotice(locale: "en" | "ar") {
  if (locale === "ar") {
    return {
      subject: "تم نقل الاشتراك إلى المهندس المساعد",
      text: "تعذر تجديد البطاقة المحفوظة في يوم التجديد وبعد يوم و3 أيام. الحساب الآن على باقة المهندس المساعد المجانية. يمكنك شراء باقة من جديد من صفحة الأسعار.",
    };
  }
  return {
    subject: "Subscription moved to Assistant Engineer",
    text: "We could not renew the saved card on the renewal date or on the retries 1 and 3 days later. The account is now on the free Assistant Engineer plan. You can buy a plan again from the pricing page.",
  };
}

export function expireNotice(locale: "en" | "ar") {
  if (locale === "ar") {
    return {
      subject: "انتهى الاشتراك",
      text: "انتهت الفترة المدفوعة بعد الإلغاء. الحساب الآن على باقة المهندس المساعد المجانية.",
    };
  }
  return {
    subject: "Subscription ended",
    text: "The paid period ended after you cancelled. The account is now on the free Assistant Engineer plan.",
  };
}
