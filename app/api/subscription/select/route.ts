// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isSelfServePlan,
  normalizeExtraSeats,
  parseInterval,
  type BillingInterval,
} from "@/lib/plans";
import { recordPlanPurchase } from "@/lib/recordPlan";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant" | "team";

const ALLOWED: PlanId[] = ["assistant", "engineer", "professional", "consultant", "team"];

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
      | {
          plan?: PlanId;
          user_id?: string;
          interval?: string;
          extraSeats?: number;
        }
      | null;

    const plan = body?.plan;
    const userId = body?.user_id;

    if (!plan || !ALLOWED.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // Same contract as the existing individual plans: the signed-in profile page
    // sends its user id after Moyasar redirects back. Enterprise is not self-serve.
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    if (plan === "assistant") {
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

      return NextResponse.json({ success: true });
    }

    if (!isSelfServePlan(plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const interval: BillingInterval = parseInterval(body?.interval);
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr) {
      console.error("auth user lookup error:", authErr);
    }

    await recordPlanPurchase(supabaseAdmin, {
      userId,
      email: authUser?.user?.email ?? null,
      plan,
      interval,
      extraSeats: plan === "team" ? normalizeExtraSeats(body?.extraSeats) : 0,
      source: "moyasar",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in /api/subscription/select:", err);
    const message = err instanceof Error ? err.message : "";
    const clientError = message.toLowerCase().includes("email")
      ? message
      : "Unexpected error while saving subscription.";
    const status = message.toLowerCase().includes("email") ? 400 : 500;
    return NextResponse.json({ error: clientError }, { status });
  }
}
