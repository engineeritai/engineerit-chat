"use client";

import { useEffect, useState } from "react";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessPage() {
  const [message, setMessage] = useState<string>(
    "Processing your payment and updating your subscription..."
  );
  const [subMessage, setSubMessage] = useState<string>(
    "Please wait a moment. You will be redirected to your profile if everything is OK."
  );
  const [statusText, setStatusText] = useState<"ok" | "error" | "info">("info");

  useEffect(() => {
    // نقرأ الباراميترات من الـ URL مباشرة لتجنب useSearchParams
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const planParam = params.get("plan") as PlanId | null;

    if (status !== "paid") {
      setStatusText("error");
      setMessage("Payment status is not 'paid'.");
      setSubMessage(
        "If you believe this is an error, please check your payment or contact support."
      );
      return;
    }

    if (!planParam) {
      setStatusText("error");
      setMessage("Payment completed, but plan information is missing.");
      setSubMessage(
        "We could not detect which plan you purchased. Please contact support or try again."
      );
      return;
    }

    // ⬇️ هنا نرسل الطلب لحفظ الخطة
    const saveSubscription = async () => {
      try {
        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planParam }),
        });

        const json = await res
          .json()
          .catch(() => ({ error: "Unknown error from server." }));

        if (!res.ok) {
          setStatusText("error");
          setMessage("Unexpected error while saving subscription.");
          setSubMessage(
            json?.error ||
              "Please open your profile page and check your current plan. If it is not updated, contact support."
          );
          return;
        }

        // ✅ تم التحديث
        setStatusText("ok");
        setMessage("Payment successful and subscription updated.");
        setSubMessage("You will be redirected to your profile shortly...");

        // تحويل تلقائي للبروفايل بعد ثانيتين
        setTimeout(() => {
          window.location.href = "/profile";
        }, 2000);
      } catch (err) {
        console.error("Error calling /api/subscription/select:", err);
        setStatusText("error");
        setMessage("Unexpected error while saving subscription.");
        setSubMessage(
          "Please open your profile page and verify your plan. If it did not change, contact support."
        );
      }
    };

    saveSubscription();
  }, []);

  const titleColor =
    statusText === "ok"
      ? "#16a34a"
      : statusText === "error"
      ? "#b91c1c"
      : "#111827";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-left space-y-4">
        <h1 className="text-3xl font-semibold" style={{ color: titleColor }}>
          Payment successful
        </h1>

        <p className="text-sm text-gray-800">{message}</p>
        <p className="text-xs text-gray-600">{subMessage}</p>

        <div className="mt-4 flex items-center gap-3">
          <a
            href="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-transparent text-sm font-medium bg-black text-white hover:opacity-90"
          >
            Go to profile
          </a>
          <a
            href="/subscription"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Back to subscriptions
          </a>
        </div>
      </div>
    </div>
  );
}
