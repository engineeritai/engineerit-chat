// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const ALLOWED: PlanId[] = [
  "assistant",
  "engineer",
  "professional",
  "consultant",
];

// أسعار الخطط (شهرياً بالريال)
const PLAN_PRICING: Record<
  PlanId,
  {
    price: number | null; // SAR شهري
    currency: string | null;
  }
> = {
  assistant: { price: null, currency: null },
  engineer: { price: 19, currency: "SAR" },
  professional: { price: 41, currency: "SAR" },
  consultant: { price: 79, currency: "SAR" },
};

// مدة الاشتراك المبدئية لكل عملية دفع (30 يوم)
const PLAN_DURATION_DAYS = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { plan?: PlanId }
      | null;

    if (!body?.plan) {
      return NextResponse.json({ error: "Missing plan." }, { status: 400 });
    }

    const plan = body.plan;

    if (!ALLOWED.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // Supabase client مرتبط بالكوكيز (session)
    const supabase = createRouteHandlerClient/*<Database>*/({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("auth.getUser error:", userError);
      return NextResponse.json(
        {
          error: "Authentication error from Supabase.",
          details: userError.message,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // لو الخطة مدفوعة نحسب تاريخ انتهاء بعد 30 يوم
    const pricing = PLAN_PRICING[plan];
    const endDateIso =
      plan !== "assistant" && pricing.price && pricing.currency
        ? new Date(
            now.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    // 1) تحديث profile.subscription_tier
    const updates: Record<string, any> = {
      subscription_tier: plan,
      updated_at: nowIso,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      console.error("profiles update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save subscription." },
        { status: 500 }
      );
    }

    // 2) تسجيل اشتراك في جدول subscriptions للخطط المدفوعة فقط
    if (plan !== "assistant" && pricing.price && pricing.currency) {
      try {
        // نعلّم أي اشتراكات سابقة لنفس المستخدم بأنها منتهية / مستبدلة
        await supabase
          .from("subscriptions")
          .update({ status: "replaced" })
          .eq("user_id", user.id);
      } catch (e) {
        console.warn("subscriptions old rows update warn:", e);
      }

      const { error: subInsertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan,
          price: pricing.price,
          currency: pricing.currency,
          status: "paid", // هذا المسار يُستدعى بعد نجاح الدفع
          start_date: nowIso,
          end_date: endDateIso,
        });

      if (subInsertError) {
        // لا نفشل الطلب للمستخدم، فقط نسجل الخطأ
        console.error("subscriptions insert error:", subInsertError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in /api/subscription/select:", err);
    return NextResponse.json(
      { error: "Unexpected error while saving subscription." },
      { status: 500 }
    );
  }
}
