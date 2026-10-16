import { NextResponse } from "next/server";
import { verifyCheckoutHandoff } from "@/lib/checkoutHandoff";
import { buildInvoiceDocument, invoiceLanguage } from "@/lib/invoiceDocument";
import { canDownloadInvoice } from "@/lib/invoiceMail";
import { renderInvoicePdf } from "@/lib/invoicePdf";
import { fetchMoyasarPayment } from "@/lib/moyasar";
import { readMoyasarKeys } from "@/lib/moyasarEnv";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import type { BillingInterval } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Missing invoice." }, { status: 400 });
  }
  const url = new URL(req.url);
  const pay = url.searchParams.get("pay") || "";
  const handoff = verifyCheckoutHandoff(pay, id);
  const user = await getUserFromRequest(req);
  if (!user && !handoff.ok) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select(
      "id, invoice_id, payment_id, user_id, plan, billing_interval, amount_sar, seat_limit, paid_at, period_end, status, customer_email, company"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const allowed = data && (canDownloadInvoice(user?.id, data.user_id, data.status) || (handoff.ok && data.status === "paid"));
  if (!data || !allowed) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const locale = invoiceLanguage(url.searchParams.get("lang"));
  let customerName = (data.company || "").trim();
  if (data.user_id) {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle();
    const fullName = (profile?.full_name || "").trim();
    if (fullName) customerName = fullName;
  }
  let paymentMethod = "";
  const paymentId = (data.payment_id || "").trim();
  if (paymentId) {
    const keys = readMoyasarKeys();
    if (keys.secret) {
      try {
        const payment = await fetchMoyasarPayment(keys.secret, paymentId);
        paymentMethod = payment.source?.type || "";
      } catch (err) {
        console.warn("invoice payment method", err);
      }
    }
  }

  const interval: BillingInterval = data.billing_interval === "year" ? "year" : "month";
  const document = buildInvoiceDocument({
    plan: data.plan,
    amountSar: Number(data.amount_sar),
    interval,
    seats: data.seat_limit,
    periodStart: data.paid_at,
    periodEnd: data.period_end,
    locale,
    invoiceNumber: data.invoice_id || data.id,
    customerName,
    customerEmail: data.customer_email,
    paymentMethod,
    paymentId,
    issuedAt: data.paid_at,
  });
  const pdf = await renderInvoicePdf(document);
  const filename = locale === "ar" ? "engineerit-invoice-ar.pdf" : "engineerit-invoice.pdf";
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
