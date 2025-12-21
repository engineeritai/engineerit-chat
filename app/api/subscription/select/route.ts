// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const ALLOWED: PlanId[] = ["assistant", "engineer", "professional", "consultant"];

// Monthly prices (SAR)
const PLAN_PRICING: Record<
  PlanId,
  { price: number | null; currency: string | null }
> = {
  assistant: { price: null, currency: null },
  engineer: { price: 19, currency: "SAR" },
  professional: { price: 41, currency: "SAR" },
  consultant: { price: 79, currency: "SAR" },
};

const PLAN_DURATION_DAYS = 30;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

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

    // 1) Get signed-in user from session cookies (normal client)
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // 2) Admin client (bypasses RLS) to guarantee write succeeds after payment
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Server is missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const nowIso = now.toISOString();

    const pricing = PLAN_PRICING[plan];
    const isPaidPlan = plan !== "assistant" && !!pricing.price && !!pricing.currency;

    const endDateIso = isPaidPlan
      ? addDays(now, PLAN_DURATION_DAYS).toISOString()
      : null;

    // 3) Update profile plan
    // NOTE: Keep this small & stable. No new fields.
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_tier: plan,
        updated_at: nowIso,
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("profiles update error:", profileUpdateError);
      return NextResponse.json(
        { error: "Failed to save subscription (profile)." },
        { status: 500 }
      );
    }

    // 4) Insert a billing row for paid plans
    if (isPaidPlan) {
      // Mark any previous rows for this user as replaced (best-effort)
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "replaced" })
        .eq("user_id", user.id);

      // Use status = "active" (most common + avoids check-constraint surprises)
      const { error: subInsertError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan,
          price: pricing.price,
          currency: pricing.currency,
          status: "active",
          start_date: nowIso,
          end_date: endDateIso,
        });

      if (subInsertError) {
        console.error("subscriptions insert error:", subInsertError);
        return NextResponse.json(
          { error: "Failed to save subscription (billing row)." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      plan,
      start_date: nowIso,
      end_date: endDateIso,
    });
  } catch (err) {
    console.error("Unexpected error in /api/subscription/select:", err);
    return NextResponse.json(
      { error: "Unexpected error while saving subscription." },
      { status: 500 }
    );
  }
}
