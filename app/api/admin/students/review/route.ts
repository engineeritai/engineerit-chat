import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { saveStudentVerification } from "@/lib/studentAccess";
import { reviewStudentDocument } from "@/lib/studentVerify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: string; decision?: string } | null;
  const id = body?.id || "";
  const decision = body?.decision === "approve" || body?.decision === "reject" ? body.decision : null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !decision) {
    return NextResponse.json({ error: "Missing review." }, { status: 400 });
  }
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("student_documents")
      .select("id, user_id, status")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.status !== "pending") return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const review = reviewStudentDocument(decision);
    const { error: updateErr } = await admin
      .from("student_documents")
      .update({ status: review.status, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    if (review.verifiedUntil) {
      await saveStudentVerification(admin, {
        userId: String(data.user_id),
        verifiedUntil: review.verifiedUntil,
        method: "document",
      });
    }
    return NextResponse.json({ ok: true, status: review.status, verifiedUntil: review.verifiedUntil });
  } catch (err) {
    if (missingPromoSchema(err instanceof Error ? err : String(err))) return NextResponse.json({ unavailable: true });
    const message = err instanceof Error ? err.message : "Could not review the letter.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
