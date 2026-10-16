import { NextResponse } from "next/server";
import { verifyCheckoutHandoff } from "@/lib/checkoutHandoff";
import { canDownloadInvoice } from "@/lib/invoiceMail";
import { renderInvoicePdf } from "@/lib/invoicePdf";
import { buildReceipt } from "@/lib/receipt";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import type { BillingInterval } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing invoice." }, { status: 400 });
  }
  const pay = new URL(req.url).searchParams.get("pay") || "";
  const handoff = verifyCheckoutHandoff(pay, id);
  const user = await getUserFromRequest(req);
  if (!user && !handoff.ok) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select("id, user_id, plan, billing_interval, amount_sar, seat_limit, period_end, status, locale")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const allowed = data && (canDownloadInvoice(user?.id, data.user_id, data.status) || (handoff.ok && data.status === "paid"));
  if (!data || !allowed) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const interval: BillingInterval = data.billing_interval === "year" ? "year" : "month";
  const receipt = buildReceipt({
    plan: data.plan,
    amountSar: Number(data.amount_sar),
    interval,
    seats: data.seat_limit,
    periodEnd: data.period_end,
    locale: data.locale === "ar" ? "ar" : "en",
  });
  const pdf = await renderInvoicePdf(receipt.text);
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="engineerit-invoice.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
