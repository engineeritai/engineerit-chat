import { NextRequest, NextResponse } from "next/server";
import { checkoutActor } from "@/lib/promoAccess";
import { fulfillFreeCheckout } from "@/lib/promoFulfill";
import { loadCheckoutById } from "@/lib/settlePayment";
import { missingPromoSchema } from "@/lib/promoSchema";

export const runtime = "nodejs";

const ID = /^[0-9a-f-]{36}$/i;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string; pay?: string; amount?: unknown } | null;
  const id = body?.id || "";
  if (!ID.test(id)) return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
  void body?.amount;
  try {
    const actor = await checkoutActor(req, id, body?.pay || "");
    if (!actor.ok) return NextResponse.json({ error: actor.error }, { status: actor.status });
    const row = await loadCheckoutById(actor.admin, id);
    if (!row || row.user_id !== actor.userId) {
      return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
    }
    const result = await fulfillFreeCheckout(actor.admin, row);
    if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
    return NextResponse.json({ ok: true, periodEnd: result.periodEnd });
  } catch (err) {
    if (missingPromoSchema(err instanceof Error ? err : String(err))) {
      return NextResponse.json({ ok: false, reason: "unavailable" });
    }
    const message = err instanceof Error ? err.message : "Could not activate this plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
