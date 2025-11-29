// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { plan?: PlanId }
      | null;

    if (!body?.plan) {
      return NextResponse.json({ error: "Missing plan." }, { status: 400 });
    }

    const plan = body.plan;
    const allowed: PlanId[] = [
      "assistant",
      "engineer",
      "professional",
      "consultant",
    ];

    if (!allowed.includes(plan)) {
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

    const now = new Date().toISOString();

    // ✅ upsert بدلاً من update لضمان وجود صف للمستخدم
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          subscription_tier: plan,
          updated_at: now,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("profiles upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to save subscription." },
        { status: 500 }
      );
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
