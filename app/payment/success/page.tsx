"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(
    "Payment completed successfully. Updating your subscription…"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    const plan = searchParams.get("plan") as PlanId | null;

    // لو Moyasar ما رجّع plan، أو status مو paid → لا نحاول التحديث
    if (status !== "paid" || !plan) {
      setMessage("Payment completed successfully.");
      return;
    }

    let cancelled = false;

    const savePlan = async () => {
      try {
        setSaving(true);

        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled) {
            setMessage(
              data?.error
                ? `Payment completed, but could not update plan: ${data.error}`
                : "Payment completed, but could not update your plan. You can change it from the Subscription page."
            );
          }
          return;
        }

        if (!cancelled) {
          setMessage(
            "Payment completed successfully. Your subscription has been updated."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setMessage(
            "Payment completed, but there was an error saving your subscription."
          );
        }
      } finally {
        if (!cancelled) setSaving(false);
      }
    };

    savePlan();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>

        <p className="text-sm text-gray-700">
          {message} {saving && " (please wait…)"}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
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
