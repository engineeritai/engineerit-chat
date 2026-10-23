import { NextRequest, NextResponse } from "next/server";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { studentDiscountAllowed } from "@/lib/studentVerify";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const admin = getSupabaseAdmin();
    const [status, pending] = await Promise.all([
      admin.from("student_status").select("verified_until, academic_email").eq("user_id", user.id).maybeSingle(),
      admin
        .from("student_documents")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1),
    ]);
    if (status.error) {
      if (missingPromoSchema(status.error)) return NextResponse.json({ unavailable: true, verified: false });
      return NextResponse.json({ error: status.error.message }, { status: 500 });
    }
    const verifiedUntil = status.data?.verified_until ? String(status.data.verified_until) : null;
    return NextResponse.json({
      verified: studentDiscountAllowed(verifiedUntil),
      verifiedUntil,
      academicEmail: status.data?.academic_email ? String(status.data.academic_email) : null,
      pending: Boolean(pending.data && pending.data.length > 0),
    });
  } catch (err) {
    if (missingPromoSchema(err instanceof Error ? err : String(err))) {
      return NextResponse.json({ unavailable: true, verified: false });
    }
    const message = err instanceof Error ? err.message : "Could not read student status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
