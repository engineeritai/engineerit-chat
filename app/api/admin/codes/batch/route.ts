import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { buildBatchCodes, promoInsertPayload } from "@/lib/promo";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { studentBatchDraft } from "@/lib/studentVerify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing batch." }, { status: 400 });
  const built = buildBatchCodes({
    count: Number(body.count),
    prefix: typeof body.prefix === "string" ? body.prefix : "STU",
    draft: studentBatchDraft({
      label: typeof body.label === "string" ? body.label : undefined,
      percentOff: body.percentOff === undefined ? undefined : Number(body.percentOff),
      cycles: body.cycles === undefined ? undefined : Number(body.cycles),
    }),
  });
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("promo_codes").insert(built.rows.map((row) => promoInsertPayload(row)));
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true, codes: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    batchId: built.batchId,
    codes: built.rows.map((row) => row.code),
  });
}
