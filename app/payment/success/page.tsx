import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const ALLOWED_PLANS = [
  "assistant",
  "engineer",
  "professional",
  "consultant",
] as const;
type PlanId = (typeof ALLOWED_PLANS)[number];

type PageProps = {
  searchParams: {
    status?: string;
    plan?: string;
  };
};

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const { status, plan } = searchParams;

  let mainMessage = "Payment completed successfully.";
  let errorMsg: string | null = null;

  // نحاول نحفظ الخطة فقط إذا كانت الحالة paid وعندنا plan صحيح
  if (status === "paid" && plan && ALLOWED_PLANS.includes(plan as PlanId)) {
    try {
      const supabase = createServerComponentClient/*<Database>*/({ cookies });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("auth.getUser error:", userError);
        errorMsg = "Authentication error while saving subscription.";
      } else if (!user) {
        errorMsg =
          "Payment completed, but you are not logged in. Please sign in again.";
      } else {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_tier: plan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("profiles update error:", updateError);
          errorMsg = "Unexpected error while saving subscription.";
        } else {
          mainMessage = "Payment and subscription updated successfully.";
        }
      }
    } catch (err) {
      console.error("Unexpected error in /payment/success:", err);
      errorMsg = "Unexpected error while saving subscription.";
    }
  } else if (status === "paid") {
    // الدفع تم لكن مافي plan واضح
    errorMsg = "Payment succeeded, but plan information is missing.";
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Payment successful</h1>

        <p className="text-sm text-gray-700">{mainMessage}</p>

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <div className="mt-4 flex items-center justify-center gap-2">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-transparent text-sm font-medium bg-black text-white hover:opacity-90"
          >
            Go to profile
          </Link>
          <Link
            href="/subscription"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Back to subscriptions
          </Link>
        </div>
      </div>
    </div>
  );
}
