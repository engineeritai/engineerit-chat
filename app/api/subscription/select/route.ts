// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { plan?: PlanId }
      | null;

    const plan = body?.plan;

    if (!plan) {
      return NextResponse.json({ error: "Missing plan." }, { status: 400 });
    }

    const allowed: PlanId[] = [
      "assistant",
      "engineer",
      "professional",
      "consultant",
    ];
    if (!allowed.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // Supabase client مرتبط بالكوكيز (جلسة المستخدم)
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("auth.getUser error:", userError);
      return NextResponse.json(
        { error: "Authentication error." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // ✅ ركّز هنا: نحدّث subscription_tier فقط
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: plan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("profiles update error:", updateError);
      // مؤقتًا نرجع رسالة أوضح لو صار خطأ
      return NextResponse.json(
        {
          error: "DB update failed",
          details: updateError.message ?? updateError,
        },
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
