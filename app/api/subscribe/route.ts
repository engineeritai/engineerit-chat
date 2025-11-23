// app/api/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const PLAN_PRICES: Record<PlanId, number> = {
  assistant: 0,
  engineer: 19,
  professional: 41,
  consultant: 79,
};

const PLAN_DURATION_DAYS = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // set in Vercel

const supabaseServer = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { planId } = (await req.json()) as { planId: PlanId };

    if (!planId || !["assistant", "engineer", "professional", "consultant"].includes(planId)) {
      return NextResponse.json(
        { error: "Invalid planId" },
        { status: 400 }
      );
    }

    // get current user from client session
    const supabaseClient = createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;

    const now = new Date();
    const startDate = now.toISOString();
    const endDate =
      planId === "assistant"
        ? null
        : new Date(
            now.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
          ).toISOString();

    const price = PLAN_PRICES[planId];
    const currency = "SAR";

    // Upsert profile (plan + dates)
    const { error: profileError } = await supabaseServer
      .from("profiles")
      .update({
        plan: planId,
        billing_currency: currency,
        plan_started_at: startDate,
        plan_expires_at: endDate,
        updated_at: startDate,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Insert new subscription row
    const { error: subError } = await supabaseServer
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan: planId,
        price,
        currency,
        status: "active",
        start_date: startDate,
        end_date: endDate,
      });

    if (subError) {
      console.error("Subscription insert error:", subError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
