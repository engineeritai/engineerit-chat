import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAdminEmail } from "@/lib/admin";
import { appBaseUrl, escapeHtml, getMailer } from "@/lib/mail";
import { createMoyasarInvoice } from "@/lib/moyasar";
import { PLAN_LABELS, formatSar, parseInterval } from "@/lib/plans";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const actor = await getUserFromRequest(req);
    if (!actor || !isAdminEmail(actor.email)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "MOYASAR_SECRET_KEY is not set in environment." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { leadId?: string; amountSar?: number; interval?: string }
      | null;

    const leadId = (body?.leadId || "").trim();
    const amountSar = Number(body?.amountSar);
    const interval = parseInterval(body?.interval);

    if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
      return NextResponse.json({ error: "Choose a lead." }, { status: 400 });
    }
    if (!Number.isFinite(amountSar) || amountSar < 1) {
      return NextResponse.json({ error: "Enter a custom amount of at least SAR 1." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: lead, error: leadErr } = await admin
      .from("enterprise_leads")
      .select("id, name, company, email, phone, seats")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const seats = Number(lead.seats) || 1;
    const amountHalalas = Math.round(amountSar * 100);
    const checkoutId = crypto.randomUUID();
    const base = appBaseUrl(req);
    const periodLabel = interval === "year" ? "yearly" : "monthly";
    const description = `engineerit.ai Enterprise plan (SAR ${amountSar} ${periodLabel}, ${seats} seats, VAT included)`;

    const invoice = await createMoyasarInvoice(secretKey, {
      amount: amountHalalas,
      currency: "SAR",
      description,
      success_url: `${base}/enterprise/paid?checkout=${checkoutId}`,
      back_url: `${base}/enterprise`,
      callback_url: `${base}/api/payments/moyasar/callback`,
      metadata: {
        plan_id: "enterprise",
        plan_label: PLAN_LABELS.enterprise,
        billing_interval: interval,
        seat_limit: String(seats),
        amount_sar: String(amountSar),
        lead_id: lead.id,
        checkout_id: checkoutId,
        customer_email: String(lead.email),
        source: "engineerit.ai",
      },
    });

    const { error: insertErr } = await admin.from("moyasar_invoices").insert({
      id: checkoutId,
      invoice_id: invoice.id,
      plan: "enterprise",
      billing_interval: interval,
      amount_sar: amountSar,
      amount_halalas: amountHalalas,
      currency: "SAR",
      seat_limit: seats,
      extra_seats: 0,
      customer_email: String(lead.email).toLowerCase(),
      lead_id: lead.id,
      company: lead.company,
      payment_url: invoice.url,
      status: "pending",
      created_by: actor.id,
    });

    if (insertErr) {
      console.error("moyasar invoice insert", insertErr);
      return NextResponse.json({ error: "Invoice was created but could not be stored." }, { status: 500 });
    }

    await admin
      .from("enterprise_leads")
      .update({ status: "invoiced", moyasar_invoice_id: invoice.id })
      .eq("id", lead.id);

    const mailer = getMailer();
    if (mailer) {
      const amount = formatSar(amountSar, interval);
      await mailer.transporter.sendMail({
        from: `"engineerit.ai" <${mailer.from}>`,
        to: String(lead.email),
        subject: `Pay your engineerit.ai Enterprise plan (${amount})`,
        html: `
          <p>Hello ${escapeHtml(String(lead.name || ""))},</p>
          <p>Your Enterprise quote is ready. Pay securely with Moyasar to activate ${seats} seats.</p>
          <p><strong>Amount:</strong> ${escapeHtml(amount)}</p>
          <p><strong>This amount is VAT inclusive.</strong></p>
          <p><a href="${escapeHtml(invoice.url)}">Pay now</a></p>
        `,
      });
    }

    return NextResponse.json({
      ok: true,
      url: invoice.url,
      invoiceId: invoice.id,
      checkoutId,
      emailed: Boolean(mailer),
    });
  } catch (err) {
    console.error("POST /api/admin/enterprise-invoice", err);
    const message = err instanceof Error ? err.message : "Could not create the Moyasar invoice.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
