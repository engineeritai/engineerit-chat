import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { parsePromoDraft } from "@/lib/promo";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import type { PromoAudience, PromoDiscountType } from "@/lib/promo";
import type { BillingInterval } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("promo_codes")
    .select(
      "id, code, label, discount_type, percent_off, amount_off_sar, free_months, plans, intervals, cycles, starts_at, expires_at, max_uses, one_per_user, audience, domains, single_use, batch_id, active, restricted_user_id, note, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data || [] });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Missing code." }, { status: 400 });
  const parsed = parsePromoDraft({
    code: typeof body.code === "string" ? body.code : undefined,
    label: typeof body.label === "string" ? body.label : "",
    discountType: body.discountType as PromoDiscountType,
    percentOff: body.percentOff as number | null | undefined,
    amountOffSar: body.amountOffSar as number | null | undefined,
    freeMonths: body.freeMonths as number | null | undefined,
    plans: Array.isArray(body.plans) ? body.plans.map(String) : [],
    intervals: Array.isArray(body.intervals) ? (body.intervals as BillingInterval[]) : undefined,
    cycles: body.cycles as number | undefined,
    startsAt: typeof body.startsAt === "string" ? body.startsAt : null,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
    maxUses: body.maxUses === null || body.maxUses === "" ? null : (body.maxUses as number | null),
    onePerUser: body.onePerUser !== false,
    audience: (body.audience as PromoAudience) || "any",
    domains: Array.isArray(body.domains) ? body.domains.map(String) : [],
    singleUse: Boolean(body.singleUse),
    note: typeof body.note === "string" ? body.note : "",
  });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("promo_codes").insert(parsed.row).select("id, code").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code: data });
}
