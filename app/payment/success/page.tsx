"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PlanId } from "@/lib/plans";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();

  const status = searchParams.get("status"); // من مويسار
  const plan = searchParams.get("plan") as PlanId | null;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // نعمل حفظ مرة واحدة فقط
    if (saved || saving) return;
    if (status !== "paid") return;
    if (!plan) return;

    setSaving(true);
    setError(null);

    fetch("/api/subscription/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save subscription.");
        }
        setSaved(true);
      })
      .catch((err) => {
        console.error("Save subscription error:", err);
        setError(err.message || "Unexpected error while saving subscription.");
      })
      .finally(() => setSaving(false));
  }, [status, plan, saving, saved]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>

        <p className="text-sm text-gray-700">
          Payment completed successfully.
        </p>

        {saving && (
          <p className="text-xs text-gray-500">
            Applying your subscription, please wait...
          </p>
        )}

        {saved && !error && (
          <p className="text-xs text-green-600">
            Your subscription has been updated.
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600">
            Could not save your subscription: {error}
          </p>
        )}

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
