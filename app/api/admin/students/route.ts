import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { normalizeAcademicEmail } from "@/lib/studentVerify";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("student_documents")
    .select("id, user_id, file_name, mime_type, byte_size, status, created_at, storage_path")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true, documents: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const documents = [];
  for (const row of data || []) {
    const signed = await admin.storage.from("student-documents").createSignedUrl(String(row.storage_path), 300);
    documents.push({
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      createdAt: row.created_at,
      url: signed.data?.signedUrl || null,
    });
  }
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { domain?: string } | null;
  const domain = (body?.domain || "").trim().toLowerCase();
  if (!/^\.?[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Enter a domain such as ksu.edu.sa." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("student_email_domains").insert({ domain: domain.startsWith(".") ? domain : `.${domain}` });
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true });
    if (error.message.toLowerCase().includes("duplicate")) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
