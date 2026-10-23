import { NextRequest, NextResponse } from "next/server";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { academicEmailOwner, saveStudentVerification } from "@/lib/studentAccess";
import { checkStudentOtp, claimAcademicEmail, normalizeAcademicEmail, verifiedUntilFrom } from "@/lib/studentVerify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { email?: string; code?: string } | null;
  const email = normalizeAcademicEmail(body?.email || "");
  const code = String(body?.code || "");
  if (!email || !code) return NextResponse.json({ error: "Missing code." }, { status: 400 });
  try {
    const admin = getSupabaseAdmin();
    const owner = await academicEmailOwner(admin, email);
    if (owner.unavailable) return NextResponse.json({ unavailable: true });
    if (claimAcademicEmail(owner.userId, user.id) === "taken") {
      return NextResponse.json({ ok: false, reason: "taken" });
    }
    const { data, error } = await admin
      .from("student_otp_challenges")
      .select("id, code_hash, salt, expires_at, attempts, consumed_at")
      .eq("user_id", user.id)
      .eq("academic_email", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ ok: false, reason: "invalid" });
    const verdict = checkStudentOtp({
      now: new Date(),
      expiresAt: String(data.expires_at),
      attempts: Number(data.attempts) || 0,
      codeHash: String(data.code_hash),
      salt: String(data.salt),
      code,
    });
    if (verdict !== "ok") {
      if (verdict === "mismatch" || verdict === "too_many") {
        await admin
          .from("student_otp_challenges")
          .update({ attempts: Math.min(5, (Number(data.attempts) || 0) + 1) })
          .eq("id", data.id);
      }
      return NextResponse.json({ ok: false, reason: verdict });
    }
    const verifiedUntil = verifiedUntilFrom();
    await saveStudentVerification(admin, { userId: user.id, verifiedUntil, method: "otp", academicEmail: email });
    await admin.from("student_otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", data.id);
    return NextResponse.json({ ok: true, verifiedUntil });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not confirm the code.";
    if (message.toLowerCase().includes("student_status_academic_email") || message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ ok: false, reason: "taken" });
    }
    if (missingPromoSchema(err instanceof Error ? err : message)) return NextResponse.json({ unavailable: true });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
