import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { confirmCheckout, loadCheckoutById } from "@/lib/settlePayment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      checkoutId?: string;
      paymentId?: string;
      stage?: string;
    } | null;
    const checkoutId = (body?.checkoutId || "").trim();
    const paymentId = (body?.paymentId || "").trim();
    const created = body?.stage === "created";
    if (!/^[0-9a-f-]{36}$/i.test(checkoutId)) {
      return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const row = await loadCheckoutById(admin, checkoutId);
    if (!row) {
      return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
    }

    const result = await confirmCheckout(admin, row, paymentId || row.payment_id);
    if (!result.ok) {
      if (created && result.reason === "not_paid") {
        return NextResponse.json({ ok: true, pending: true });
      }
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
