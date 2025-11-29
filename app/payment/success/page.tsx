"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    "Payment completed successfully. If your subscription does not appear updated immediately, please refresh your profile page."
  );

  useEffect(() => {
    const plan = searchParams.get("plan") as PlanId | null;

    // لو ما فيه plan في الرابط، لا نحاول نحفظ شي
    if (!plan || plan === "assistant") return;

    async function save() {
      try {
        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("Save subscription failed:", json);
          setMessage(
            "Payment succeeded, but we could not update your subscription automatically. Please open your profile and check your plan."
          );
          return;
        }

        setMessage(
          "Payment and subscription updated successfully. Redirecting to your profile..."
        );

        // نعطي المستخدم ثانية يشوف الرسالة ثم نرجّعه للبروفايل
        setTimeout(() => {
          router.replace("/profile");
        }, 1500);
      } catch (err) {
        console.error("Save subscription error:", err);
        setMessage(
          "Payment succeeded, but we could not update your subscription. Please go to your profile and contact support if needed."
        );
      }
    }

    save();
  }, [router, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>
        <p className="text-sm text-gray-700">{message}</p>

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
