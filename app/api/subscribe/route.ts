// app/api/subscribe/route.ts
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
    const expires =
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
        plan_started_at: now.toISOString(),
        plan_expires_at: expires,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("profile update error", profileError);
      return NextResponse.json(
        { error: "Failed to update profile plan" },
        { status: 500 }
      );
    }

    // 2) Insert subscription record
    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan: planId,
        price,
        currency: "SAR",
        status: "active",
        start_date: now.toISOString(),
        end_date: expires,
      });

    if (subError) {
      console.error("subscription insert error", subError);
      // Don’t fail the whole request for this; just log
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("subscribe route error", err);
    return NextResponse.json(
      { error: "Unexpected error in subscription API" },
      { status: 500 }
    );
  }
}
