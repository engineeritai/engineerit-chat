import { NextRequest, NextResponse } from "next/server";
import { deliverMail } from "@/lib/mail";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { academicEmailOwner, studentDomains } from "@/lib/studentAccess";
import { issueStudentOtp, normalizeAcademicEmail } from "@/lib/studentVerify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeAcademicEmail(body?.email || "");
  try {
    const admin = getSupabaseAdmin();
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const [domains, recentUser, recentEmail, owner] = await Promise.all([
      studentDomains(admin),
      admin.from("student_otp_challenges").select("created_at").eq("user_id", user.id).gte("created_at", since),
      admin.from("student_otp_challenges").select("created_at").eq("academic_email", email).gte("created_at", since),
      academicEmailOwner(admin, email),
    ]);
    if (recentUser.error) {
      if (missingPromoSchema(recentUser.error)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: recentUser.error.message }, { status: 500 });
    }
    if (recentEmail.error && !missingPromoSchema(recentEmail.error)) {
      return NextResponse.json({ error: recentEmail.error.message }, { status: 500 });
    }
    if (owner.unavailable) return NextResponse.json({ unavailable: true });
    if (owner.userId && owner.userId !== user.id) {
      return NextResponse.json({ ok: false, reason: "taken" });
    }
    const recent = [...(recentUser.data || []), ...(recentEmail.data || [])].map((row) => ({
      createdAt: String(row.created_at),
    }));
    const issued = await issueStudentOtp({
      email,
      domains,
      recent,
      send: async (message) => {
        await deliverMail({ to: message.to, subject: message.subject, text: message.text });
      },
    });
    if (!issued.ok) return NextResponse.json({ ok: false, reason: issued.reason });
    const { error } = await admin.from("student_otp_challenges").insert({
      user_id: user.id,
      academic_email: issued.email,
      code_hash: issued.otp.codeHash,
      salt: issued.otp.salt,
      expires_at: issued.otp.expiresAt,
    });
    if (error) {
      if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (missingPromoSchema(err instanceof Error ? err : String(err))) return NextResponse.json({ unavailable: true });
    const message = err instanceof Error ? err.message : "Could not send the code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
