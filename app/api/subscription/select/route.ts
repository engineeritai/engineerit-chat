// app/api/subscription/select/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// لو عندك نوع Database في lib/database.types استخدمه هنا
// import type { Database } from "@/lib/database.types";

export const runtime = "nodejs";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { plan?: PlanId } | null;

    if (!body?.plan) {
      return NextResponse.json(
        { error: "Missing plan." },
        { status: 400 }
      );
    }

    const plan = body.plan;

    // تأكد أن القيمة واحدة من الأربع فقط
    const allowed: PlanId[] = [
      "assistant",
      "engineer",
      "professional",
      "consultant",
    ];
    if (!allowed.includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan." },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    // لو عندك نوع Database حطه داخل <>
    const supabase = createRouteHandlerClient(/*<Database>*/ { cookies: () => cookieStore });

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

    // ✅ هنا نحدّث عمود plan في جدول profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan }) // تأكد أن العمود اسمه plan كما في SQL
      .eq("id", user.id);

    if (updateError) {
      console.error("profiles update error:", updateError);
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
