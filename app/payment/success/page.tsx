"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// لو عندك نوع Database استخدمه هنا، وإلا خله any
// import type { Database } from "@/lib/database.types";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export default function PaymentSuccessPage() {
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [status, setStatus] =
    useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // عميل Supabase على الواجهة (نفس المكتبة المستخدمة في بقية المشروع)
  const supabase = createClientComponentClient<any>();

  // 1) قراءة plan من الـ URL
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

  // 2) تحديث الاشتراك مباشرة في Supabase من الواجهة
  useEffect(() => {
    if (!plan || status !== "idle") return;

    const updateSubscription = async () => {
      try {
        setStatus("saving");

        // جلب المستخدم الحالي
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("Auth error:", authError);
          setStatus("error");
          setMessage(
            "Payment completed, but you are not logged in. Please sign in again."
          );
          return;
        }

        // تحديث جدول profiles.subscription_tier
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_tier: plan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Update error:", updateError);
          setStatus("error");
          setMessage(
            "Payment completed, but we could not update your subscription. Please contact support."
          );
          return;
        }

        setStatus("success");
        setMessage(
          "Your subscription has been updated successfully. You can continue from your profile page."
        );
      } catch (err) {
        console.error("Unexpected error:", err);
        setStatus("error");
        setMessage(
          "Payment completed, but an unexpected error occurred while updating your subscription."
        );
      }
    };

    updateSubscription();
  }, [plan, status, supabase]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>

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
