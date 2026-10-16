import { PLAN_LABELS, formatSar, type BillingInterval, type PlanId } from "@/lib/plans";
import { vatFromInclusive, zatcaInvoicesEnabled } from "@/lib/billingCycle";
import { escapeHtml, getMailer } from "@/lib/mail";

export type ReceiptInput = {
  plan: string;
  amountSar: number;
  interval: BillingInterval;
  seats?: number | null;
  periodEnd?: string | null;
};

export function buildReceipt(input: ReceiptInput) {
  const planLabel =
    input.plan in PLAN_LABELS ? PLAN_LABELS[input.plan as PlanId] : input.plan;
  const period = input.interval === "year" ? "Annual" : "Monthly";
  const amount = formatSar(input.amountSar);
  const until = input.periodEnd
    ? new Date(input.periodEnd).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const vat = vatFromInclusive(input.amountSar);
  const zatca = zatcaInvoicesEnabled(process.env.ZATCA_INVOICES_ENABLED);
  const zatcaLine = zatca
    ? "ZATCA tax invoice: VAT fields are ready. The e-invoice number is issued when the ZATCA connection is turned on."
    : "ZATCA tax invoice: not issued yet.";
  const lines = [
    `Plan: ${planLabel}`,
    `Period: ${period}`,
    `Amount: ${amount}`,
    "This amount is VAT inclusive.",
    `Net: ${formatSar(vat.net)}`,
    `VAT ${(vat.rate * 100).toFixed(0)}%: ${formatSar(vat.vat)}`,
    zatcaLine,
  ];
  if (input.seats && input.seats > 0 && (input.plan === "team" || input.plan === "enterprise")) {
    lines.push(`Seats: ${input.seats}`);
  }
  if (until && until !== "Invalid Date") {
    lines.push(`Access until: ${until}`);
  }

  const subject = `engineerit.ai receipt — ${planLabel} — ${amount}`;
  const text = ["Thank you for your payment to engineerit.ai.", "", ...lines].join("\n");
  const html = `
    <h2>Payment receipt</h2>
    <p>Thank you for your payment to engineerit.ai.</p>
    <p><strong>Plan:</strong> ${escapeHtml(planLabel)}</p>
    <p><strong>Period:</strong> ${escapeHtml(period)}</p>
    <p><strong>Amount:</strong> ${escapeHtml(amount)}</p>
    <p><strong>This amount is VAT inclusive.</strong></p>
    <p><strong>Net:</strong> ${escapeHtml(formatSar(vat.net))}</p>
    <p><strong>VAT ${(vat.rate * 100).toFixed(0)}%:</strong> ${escapeHtml(formatSar(vat.vat))}</p>
    <p>${escapeHtml(zatcaLine)}</p>
    ${
      input.seats && (input.plan === "team" || input.plan === "enterprise")
        ? `<p><strong>Seats:</strong> ${input.seats}</p>`
        : ""
    }
    ${until && until !== "Invalid Date" ? `<p><strong>Access until:</strong> ${escapeHtml(until)}</p>` : ""}
  `;

  return { subject, text, html };
}

export async function sendReceipt(to: string, input: ReceiptInput) {
  const mailer = getMailer();
  if (!mailer) return false;
  const receipt = buildReceipt(input);
  await mailer.transporter.sendMail({
    from: `"engineerit.ai" <${mailer.from}>`,
    to,
    subject: receipt.subject,
    text: receipt.text,
    html: receipt.html,
  });
  return true;
}
