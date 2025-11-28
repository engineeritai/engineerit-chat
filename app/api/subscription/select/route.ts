// app/api/subscription/select/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// لو عندك نوع Database استخدمه هنا بدل any
// import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const ALLOWED_PLANS: PlanId[] = [
  "assistant",
  "engineer",
  "professional",
  "consultant",
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { plan?: PlanId }
      | null;

    const plan = body?.plan;

    if (!plan || !ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: "Invalid or missing plan." },
        { status: 400 }
      );
    }

    // Supabase client مرتبط بالكوكيز (سيشن المستخدم)
    const supabase = createRouteHandlerClient<any>({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: plan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update subscription_tier:", updateError);
      return NextResponse.json(
        {
          error:
            "Failed to update subscription in database. Please contact support if the problem persists.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("Unexpected error in subscription/select:", err);
    return NextResponse.json(
      { error: "Unexpected error while saving subscription." },
      { status: 500 }
    );
  }
}
