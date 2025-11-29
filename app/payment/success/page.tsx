// app/payment/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// لو عندك نوع Database استعمله هنا، وإلا خل السطر كما هو
// import type { Database } from "@/lib/database.types";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export const dynamic = "force-dynamic";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient(/* <Database> */);
  const [message, setMessage] = useState(
    "Processing your subscription..."
  );

  useEffect(() => {
    async function run() {
      // 1) نقرأ الخطة من رابط Moyasar  ?plan=engineer / professional / consultant
      const planParam = searchParams.get("plan") as PlanId | null;
      const allowed: PlanId[] = [
        "assistant",
        "engineer",
        "professional",
        "consultant",
      ];

      if (!planParam || !allowed.includes(planParam)) {
        setMessage("Payment succeeded, but plan information is missing.");
        return;
      }

      // 2) نحصل على المستخدم الحالي
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("auth.getUser error:", userError);
        setMessage(
          "Payment completed, but you are not logged in. Please sign in again."
        );
        return;
      }

      // 3) نحدث جدول profiles مباشرة
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          // لو عندك عمود plan استخدمه، لو ما عندك احذف السطر التالي
          plan: planParam,
          subscription_tier: planParam,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("profiles update error:", updateError);
        setMessage("Unexpected error while saving subscription.");
        return;
      }

      // 4) تم التحديث بنجاح → تحويل إلى الصفحة الشخصية
      setMessage("Subscription updated. Redirecting to your profile...");
      router.replace("/profile");
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
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
