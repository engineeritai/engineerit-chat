import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { buildBatchCodes, type PromoAudience, type PromoDiscountType } from "@/lib/promo";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import type { BillingInterval } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing batch." }, { status: 400 });
  const built = buildBatchCodes({
    count: Number(body.count),
    prefix: typeof body.prefix === "string" ? body.prefix : "STU",
    draft: {
      label: typeof body.label === "string" ? body.label : "Student gift",
      discountType: body.discountType as PromoDiscountType,
      percentOff: body.percentOff as number | null | undefined,
      amountOffSar: body.amountOffSar as number | null | undefined,
      freeMonths: body.freeMonths as number | null | undefined,
      plans: Array.isArray(body.plans) ? body.plans.map(String) : ["engineer"],
      intervals: Array.isArray(body.intervals) ? (body.intervals as BillingInterval[]) : ["month"],
      cycles: body.cycles as number | undefined,
      startsAt: typeof body.startsAt === "string" ? body.startsAt : null,
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
      audience: (body.audience as PromoAudience) || "batch",
      domains: Array.isArray(body.domains) ? body.domains.map(String) : [],
      singleUse: true,
      note: typeof body.note === "string" ? body.note : "Student batch",
    },
  });
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("promo_codes").insert(built.rows);
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true, codes: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    batchId: built.batchId,
    codes: built.rows.map((row) => row.code),
  });
}
