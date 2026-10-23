import { NextRequest, NextResponse } from "next/server";
import { applyPromo } from "@/lib/promoCheckout";
import { promoDb } from "@/lib/promoDb";
import { checkoutActor } from "@/lib/promoAccess";

export const runtime = "nodejs";

const ID = /^[0-9a-f-]{36}$/i;

function publicQuote(row: {
  promo_code: string | null;
  promo_code_id: string | null;
  list_amount_sar: number | null;
  list_amount_halalas: number | null;
  discount_sar: number | null;
  discount_halalas: number | null;
  amount_sar: number;
  amount_halalas: number;
  promo_cycles: number | null;
}) {
  const applied = Boolean(row.promo_code_id);
  const chargedHalalas = Number(row.amount_halalas) || 0;
  const listHalalas = applied ? Number(row.list_amount_halalas) || chargedHalalas : chargedHalalas;
  return {
    applied,
    code: applied ? row.promo_code : null,
    listSar: applied ? Number(row.list_amount_sar) || listHalalas / 100 : chargedHalalas / 100,
    discountSar: applied ? Number(row.discount_sar) || 0 : 0,
    chargedSar: Number(row.amount_sar) || chargedHalalas / 100,
    chargedHalalas,
    listHalalas,
    discountHalalas: applied ? Number(row.discount_halalas) || 0 : 0,
    cycles: applied ? Number(row.promo_cycles) || 1 : 0,
    free: applied && chargedHalalas === 0,
  };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!ID.test(id)) return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
  try {
    const actor = await checkoutActor(req, id, req.nextUrl.searchParams.get("pay") || "");
    if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
    const { data, error } = await actor.admin
      .from("moyasar_invoices")
      .select(
        "promo_code, promo_code_id, list_amount_sar, list_amount_halalas, discount_sar, discount_halalas, amount_sar, amount_halalas, promo_cycles, status"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
    return NextResponse.json(publicQuote(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read the code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { id?: string; code?: string; pay?: string; amount?: unknown; amountHalalas?: unknown }
    | null;
  const id = body?.id || "";
  if (!ID.test(id)) return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
  try {
    const actor = await checkoutActor(req, id, body?.pay || "");
    if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
    const result = await applyPromo(promoDb(actor.admin), {
      checkoutId: id,
      rawCode: body?.code || "",
      userId: actor.userId,
      clientAmountHalalas: body?.amount ?? body?.amountHalalas,
    });
    if (!result.ok) {
      const status = result.reason === "missing" ? 404 : result.reason === "wrong_user" ? 403 : 400;
      return NextResponse.json({ ok: false, reason: result.reason }, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not apply the code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
