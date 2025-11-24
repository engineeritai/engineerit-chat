import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const PLAN_PRICES: Record<PlanId, number> = {
  assistant: 0,
  engineer: 19,
  professional: 41,
  consultant: 79,
};

const PLAN_DURATION_DAYS = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, planId } = (await req.json()) as {
      userId?: string;
      planId?: PlanId;
    };

    if (!userId || !planId) {
      return NextResponse.json(
        { error: "Missing userId or planId" },
        { status: 400 }
      );
    }

    const now = new Date();
    const start = now.toISOString();
    const end =
      planId === "assistant"
        ? null
        : new Date(
            now.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
          ).toISOString();

    const price = PLAN_PRICES[planId] ?? 0;

    // 1) Update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: planId,
        plan_started_at: start,
        plan_expires_at: end,
        billing_currency: "SAR",
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // 2) Insert subscription row
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan: planId,
        price,
        currency: "SAR",
        status: "active",
        start_date: start,
        end_date: end,
      });

    if (subscriptionError) {
      console.error("Subscription insert error:", subscriptionError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Subscribe API error:", err);
    return NextResponse.json(
      { error: "Unexpected error in subscribe endpoint" },
      { status: 500 }
    );
  }
}
