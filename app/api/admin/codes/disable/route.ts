import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Missing code." }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("promo_codes").update({ active: false }).eq("id", id);
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true, ok: false });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
