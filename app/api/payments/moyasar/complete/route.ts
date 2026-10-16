import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { confirmStoredInvoice, loadCheckoutById } from "@/lib/settlePayment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { checkoutId?: string } | null;
    const checkoutId = (body?.checkoutId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(checkoutId)) {
      return NextResponse.json({ error: "Missing checkout." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const row = await loadCheckoutById(admin, checkoutId);
    if (!row) {
      return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
    }

    const result = await confirmStoredInvoice(admin, row);
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
