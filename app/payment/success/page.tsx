"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [statusMsg, setStatusMsg] = useState<string>(
    "Payment completed successfully. If your subscription does not appear updated immediately, please refresh your profile page."
  );

  useEffect(() => {
    const plan = searchParams.get("plan") as PlanId | null;

    // لو ما رجعنا من مويسار بخطة واضحة
    if (!plan) {
      setStatusMsg("Payment succeeded, but plan information is missing.");
      return;
    }

    // تحديث الخطة في Supabase عن طريق نفس API المستخدم في صفحة الاشتراكات
    setStatusMsg("Payment completed. Updating your subscription…");

    fetch("/api/subscription/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res
            .json()
            .catch(() => ({ error: "Failed to save subscription." }));
          throw new Error(json.error || "Failed to save subscription.");
        }

        setStatusMsg("Your subscription has been updated. Redirecting…");

        // تحويل تلقائي للبروفايل بعد 1.5 ثانية
        setTimeout(() => {
          router.push("/profile");
        }, 1500);
      })
      .catch((err) => {
        console.error("Error saving subscription after payment:", err);
        setStatusMsg(
          "Payment completed, but we could not update your subscription automatically. Please go to your profile or subscriptions page."
        );
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>

        <p className="text-sm text-gray-700">{statusMsg}</p>

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
