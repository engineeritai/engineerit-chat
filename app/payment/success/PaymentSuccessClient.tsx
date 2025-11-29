// app/payment/success/PaymentSuccessClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [statusMsg, setStatusMsg] = useState(
    "Finalizing your subscription…"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const plan = searchParams.get("plan") as PlanId | null;
    const status = searchParams.get("status");

    if (!plan) {
      setStatusMsg(
        "Payment completed successfully. If your subscription does not appear updated immediately, please refresh your profile page."
      );
      return;
    }

    const allowed: PlanId[] = ["assistant", "engineer", "professional", "consultant"];
    if (!allowed.includes(plan)) {
      setErrorMsg("Payment succeeded, but plan information is invalid.");
      return;
    }

    if (
      status &&
      !["paid", "approved"].includes(status.toLowerCase())
    ) {
      setErrorMsg("Payment did not complete successfully.");
      return;
    }

    const saveSubscription = async () => {
      try {
        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.success) {
          setErrorMsg(
            json.error || "Unexpected error while saving subscription."
          );
          return;
        }

        setStatusMsg("Subscription updated. Redirecting to your profile…");

        setTimeout(() => {
          router.push("/profile");
        }, 1200);
      } catch (e) {
        console.error(e);
        setErrorMsg("Unexpected error while saving subscription.");
      }
    };

    saveSubscription();
  }, [searchParams, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>

        <p className="text-sm text-gray-700">
          {errorMsg ?? statusMsg}
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
