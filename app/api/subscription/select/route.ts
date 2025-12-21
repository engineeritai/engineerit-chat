// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const ALLOWED: PlanId[] = ["assistant", "engineer", "professional", "consultant"];

const PLAN_PRICING: Record<
  PlanId,
  { price: number | null; currency: string | null }
> = {
  assistant: { price: null, currency: null },
  engineer: { price: 19, currency: "SAR" },
  professional: { price: 41, currency: "SAR" },
  consultant: { price: 79, currency: "SAR" },
};

// default duration after payment (30 days)
const PLAN_DURATION_DAYS = 30;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { plan?: PlanId; user_id?: string }
      | null;

    const plan = body?.plan;
    const userId = body?.user_id;

    if (!plan || !ALLOWED.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // IMPORTANT:
    // We accept user_id explicitly from client after it already authenticated (profile page has user).
    // This avoids any cookie/session dependency and avoids failures after external redirect.
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const now = new Date();
    const nowIso = now.toISOString();

    const pricing = PLAN_PRICING[plan];

    const endDateIso =
      plan !== "assistant" && pricing.price && pricing.currency
        ? new Date(now.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // 1) Ensure profile exists + update tier
    const { error: profileUpsertErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          subscription_tier: plan,
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );

    if (profileUpsertErr) {
      console.error("ADMIN profiles upsert error:", profileUpsertErr);
      return NextResponse.json(
        { error: "Failed to save subscription to profile." },
        { status: 500 }
      );
    }

    // 2) If paid plan, write billing row
    if (plan !== "assistant" && pricing.price && pricing.currency) {
      // mark previous subs as replaced (optional)
      const { error: oldErr } = await supabaseAdmin
        .from("subscriptions")
        .update({ status: "replaced", updated_at: nowIso })
        .eq("user_id", userId)
        .in("status", ["paid", "active"]);

      if (oldErr) {
        console.warn("ADMIN subscriptions old rows update warn:", oldErr);
      }

      const { error: insertErr } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan,
          price: pricing.price,
          currency: pricing.currency,
          status: "active",
          start_date: nowIso,
          end_date: endDateIso,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (insertErr) {
        console.error("ADMIN subscriptions insert error:", insertErr);
        return NextResponse.json(
          { error: "Failed to write billing record." },
          { status: 500 }
        );
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
