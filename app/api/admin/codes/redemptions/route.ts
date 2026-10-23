import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/promoAccess";
import { missingPromoSchema } from "@/lib/promoSchema";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("promo_redemptions")
    .select(
      "id, email, plan, billing_interval, list_amount_sar, discount_sar, charged_amount_sar, cycles, status, created_at, code_id, promo_codes(code)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (missingPromoSchema(error)) return NextResponse.json({ unavailable: true, redemptions: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ redemptions: data || [] });
}
