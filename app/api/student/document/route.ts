import { NextRequest, NextResponse } from "next/server";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import { DOC_MAX_BYTES, DOC_MIME } from "@/lib/studentVerify";

export const runtime = "nodejs";

const BUCKET = "student-documents";

function extension(mime: string, name: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  const fromName = name.split(".").pop()?.toLowerCase();
  return fromName && fromName.length <= 5 ? fromName : "bin";
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  const mime = file.type || "";
  if (!DOC_MIME.includes(mime as (typeof DOC_MIME)[number])) {
    return NextResponse.json({ ok: false, reason: "type" });
  }
  if (file.size <= 0 || file.size > DOC_MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "size" });
  }
  try {
    const admin = getSupabaseAdmin();
    const { data: pending, error: pendingErr } = await admin
      .from("student_documents")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1);
    if (pendingErr) {
      if (missingPromoSchema(pendingErr)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: pendingErr.message }, { status: 500 });
    }
    if (pending && pending.length > 0) return NextResponse.json({ ok: false, reason: "pending" });
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.${extension(mime, file.name)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
    if (uploaded.error) {
      if (missingPromoSchema(uploaded.error)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
    }
    const { error } = await admin.from("student_documents").insert({
      id,
      user_id: user.id,
      storage_path: path,
      file_name: file.name.slice(0, 180) || "student-letter",
      mime_type: mime,
      byte_size: bytes.length,
      status: "pending",
    });
    if (error) {
      await admin.storage.from(BUCKET).remove([path]);
      if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    if (missingPromoSchema(err instanceof Error ? err : String(err))) return NextResponse.json({ unavailable: true });
    const message = err instanceof Error ? err.message : "Could not upload the letter.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
