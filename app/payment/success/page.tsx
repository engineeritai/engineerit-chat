"use client";

import { useEffect, useState } from "react";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessPage() {
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [status, setStatus] =
    useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // 1) قراءة plan من كويري سترنغ (?.plan) على المتصفح
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("plan") as PlanId | null;

      if (!p) {
        setStatus("error");
        setMessage("Payment succeeded, but plan information is missing.");
        return;
      }

      setPlan(p);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Payment succeeded, but we could not read the plan.");
    }
  }, []);

  // 2) استدعاء API لتحديث الاشتراك في Supabase
  useEffect(() => {
    if (!plan || status !== "idle") return;

    const saveSubscription = async () => {
      try {
        setStatus("saving");
        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus("error");
          setMessage(
            json.error ||
              "Payment completed, but we could not update your subscription."
          );
          return;
        }

        setStatus("success");
        setMessage(
          "Your subscription has been updated successfully. You can continue from your profile page."
        );
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage(
          "Payment completed, but an error occurred while updating your subscription."
        );
      }
    };

    saveSubscription();
  }, [plan, status]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Payment successful</h1>

        {status === "saving" && (
          <p className="text-sm text-gray-600">
            Your payment is confirmed. Updating your subscription level…
          </p>
        )}

        {status === "success" && (
          <p className="text-sm text-green-600">{message}</p>
        )}

        {status === "error" && (
          <p className="text-sm text-red-600">
            {message ??
              "Payment completed, but we could not update your subscription. You can still use the platform and contact support if needed."}
          </p>
        )}

        <div className="mt-4 space-x-2">
          <a
            href="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-transparent text-sm font-medium bg-black text-white hover:opacity-90"
          >
            Go to profile
          </a>
          <a
            href="/subscription"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Back to subscriptions
          </a>
        </div>
      </div>
    </div>
  );
}
