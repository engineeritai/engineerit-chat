"use client";

import { useEffect, useState } from "react";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";
type Phase = "processing" | "notPaid" | "missing" | "saveError" | "ok";

export default function PaymentSuccessPage() {
  const { locale } = useLocale();
  const arabic = locale === "ar";
  const [phase, setPhase] = useState<Phase>("processing");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const planParam = params.get("plan") as PlanId | null;

    if (status !== "paid") {
      setPhase("notPaid");
      return;
    }
    if (!planParam) {
      setPhase("missing");
      return;
    }

    let cancelled = false;
    const saveSubscription = async () => {
      try {
        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planParam }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setPhase("saveError");
          return;
        }
        setPhase("ok");
        window.setTimeout(() => {
          window.location.href = "/profile";
        }, 2000);
      } catch (err) {
        console.error("Error calling /api/subscription/select:", err);
        if (!cancelled) setPhase("saveError");
      }
    };

    void saveSubscription();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = arabic
    ? {
        processing: ["جارٍ معالجة الدفع وتحديث الاشتراك.", "انتظر لحظة. سيتم تحويلك إلى ملفك إذا اكتملت العملية."],
        notPaid: ["حالة الدفع ليست مكتملة.", "إذا كان هذا خطأ، راجع عملية الدفع أو تواصل مع الدعم."],
        missing: ["اكتمل الدفع، وبيانات الباقة غير موجودة.", "تعذر تحديد الباقة التي اشتريتها. تواصل مع الدعم أو حاول مرة أخرى."],
        saveError: ["خطأ غير متوقع أثناء حفظ الاشتراك.", "افتح صفحة الملف وتحقق من باقتك. إذا لم تتحدث، تواصل مع الدعم."],
        ok: ["تم الدفع وتحديث الاشتراك.", "سيتم تحويلك إلى ملفك قريباً."],
      }
    : {
        processing: [
          "Processing your payment and updating your subscription.",
          "Please wait a moment. You will be redirected to your profile if everything is OK.",
        ],
        notPaid: [
          "Payment status is not paid.",
          "If you believe this is an error, please check your payment or contact support.",
        ],
        missing: [
          "Payment completed, but plan information is missing.",
          "We could not detect which plan you purchased. Please contact support or try again.",
        ],
        saveError: [
          "Unexpected error while saving the subscription.",
          "Open your profile and check your plan. If it did not update, contact support.",
        ],
        ok: ["Payment successful and subscription updated.", "You will be redirected to your profile shortly."],
      };

  const [message, subMessage] = copy[phase];
  const titleColor = phase === "ok" ? "#16a34a" : phase === "processing" ? "#111827" : "#b91c1c";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-4">
        <LanguageToggle />
        <h1 className="text-3xl font-semibold" style={{ color: titleColor }}>
          {arabic ? "تم الدفع" : "Payment successful"}
        </h1>
        <p className="text-sm text-gray-800">{message}</p>
        <p className="text-xs text-gray-600">{subMessage}</p>
        <div className="mt-4 flex items-center gap-3">
          <a
            href="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-transparent text-sm font-medium bg-black text-white hover:opacity-90"
          >
            {arabic ? "الذهاب إلى الملف" : "Go to profile"}
          </a>
          <a
            href="/subscription"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {arabic ? "العودة إلى الاشتراكات" : "Back to subscriptions"}
          </a>
        </div>
      </div>
    </div>
  );
}
