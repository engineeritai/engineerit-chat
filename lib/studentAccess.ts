import type { SupabaseClient } from "@supabase/supabase-js";
import { missingPromoSchema } from "@/lib/promoSchema";
import { STUDENT_DOMAINS, normalizeAcademicEmail } from "@/lib/studentVerify";

export async function studentDomains(admin: SupabaseClient) {
  const { data, error } = await admin.from("student_email_domains").select("domain");
  if (error) {
    if (missingPromoSchema(error)) return [...STUDENT_DOMAINS];
    throw new Error(error.message);
  }
  const domains = (data || []).map((row) => String(row.domain || "").trim()).filter(Boolean);
  return domains.length > 0 ? domains : [...STUDENT_DOMAINS];
}

export async function academicEmailOwner(admin: SupabaseClient, email: string) {
  const normalized = normalizeAcademicEmail(email);
  const { data, error } = await admin
    .from("student_status")
    .select("user_id")
    .ilike("academic_email", normalized)
    .maybeSingle();
  if (error) {
    if (missingPromoSchema(error)) return { unavailable: true as const, userId: null };
    throw new Error(error.message);
  }
  return { unavailable: false as const, userId: data?.user_id ? String(data.user_id) : null };
}

export async function saveStudentVerification(
  admin: SupabaseClient,
  args: { userId: string; verifiedUntil: string; method: "otp" | "document"; academicEmail?: string | null }
) {
  const row: {
    user_id: string;
    verified_until: string;
    method: "otp" | "document";
    updated_at: string;
    academic_email?: string;
  } = {
    user_id: args.userId,
    verified_until: args.verifiedUntil,
    method: args.method,
    updated_at: new Date().toISOString(),
  };
  if (args.academicEmail) row.academic_email = normalizeAcademicEmail(args.academicEmail);
  const { error } = await admin.from("student_status").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
