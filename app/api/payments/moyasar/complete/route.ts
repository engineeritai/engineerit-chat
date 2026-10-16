import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { confirmCheckout, loadCheckoutById } from "@/lib/settlePayment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { checkoutId?: string; paymentId?: string } | null;
    const checkoutId = (body?.checkoutId || "").trim();
    const paymentId = (body?.paymentId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(checkoutId)) {
      return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const row = await loadCheckoutById(admin, checkoutId);
    if (!row) {
      return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
    }

    if (paymentId) {
      await admin.from("moyasar_invoices").update({ payment_id: paymentId }).eq("id", row.id);
    }
    const result = await confirmCheckout(admin, { ...row, payment_id: paymentId || row.payment_id }, paymentId || row.payment_id);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Moyasar has not confirmed this payment yet.", reason: result.reason },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, plan: result.plan, periodEnd: result.periodEnd });
  } catch (err) {
    console.error("Moyasar complete error", err);
    return NextResponse.json({ error: "Could not confirm payment." }, { status: 500 });
  }
}
