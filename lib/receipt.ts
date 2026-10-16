import { PLAN_LABELS, formatSar, type BillingInterval, type PlanId } from "@/lib/plans";
import { riyalAmount } from "@/lib/riyal";
import { buildInvoiceDocument } from "@/lib/invoiceDocument";
import { receiptVatMode, vatFromInclusive } from "@/lib/billingCycle";
import { renderInvoicePdf } from "@/lib/invoicePdf";
import { invoiceBccAddress } from "@/lib/invoiceMail";
import { escapeHtml, getMailer } from "@/lib/mail";
import type { ReplyLanguage } from "@/lib/replyLanguage";

export type ReceiptInput = {
  plan: string;
  amountSar: number;
  interval: BillingInterval;
  seats?: number | null;
  periodEnd?: string | null;
  periodStart?: string | null;
  /** User's chosen language. English unless that language is Arabic. */
  locale?: ReplyLanguage | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  paymentMethod?: string | null;
  paymentId?: string | null;
  issuedAt?: string | null;
};

const PLAN_LABELS_AR: Record<PlanId, string> = {
  assistant: "المهندس المساعد",
  engineer: "المهندس",
  professional: "المهندس المحترف",
  consultant: "المهندس الاستشاري",
  team: "الفريق",
  enterprise: "المؤسسات",
};

function formatSarAr(amount: number) {
  return riyalAmount(amount.toLocaleString("en-US"));
}

export function buildReceipt(
  input: ReceiptInput,
  options?: { vatNumber?: string; zatcaFlag?: string }
) {
  const locale: ReplyLanguage = input.locale === "ar" ? "ar" : "en";
  const document = buildInvoiceDocument({
    plan: input.plan,
    amountSar: input.amountSar,
    interval: input.interval,
    seats: input.seats,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    locale,
    invoiceNumber: input.invoiceNumber,
    customerName: input.customerName || input.customerEmail,
    customerEmail: input.customerEmail,
    paymentMethod: input.paymentMethod,
    paymentId: input.paymentId,
    issuedAt: input.issuedAt,
    vatNumber: options?.vatNumber ?? process.env.VAT_NUMBER,
    zatcaFlag: options?.zatcaFlag ?? process.env.ZATCA_INVOICES_ENABLED,
  });
  const planLabel = planName(input.plan, locale);
  const amount = locale === "ar" ? formatSarAr(input.amountSar) : formatSar(input.amountSar);
  const until = formatUntil(input.periodEnd, locale);
  const mode = receiptVatMode(
    options?.vatNumber ?? process.env.VAT_NUMBER,
    options?.zatcaFlag ?? process.env.ZATCA_INVOICES_ENABLED
  );
  const vat = mode.kind === "vat" ? vatFromInclusive(input.amountSar) : null;
  const seats =
    input.seats && input.seats > 0 && (input.plan === "team" || input.plan === "enterprise")
      ? input.seats
      : null;

  const receipt =
    locale === "ar"
      ? renderArabic({ planLabel, amount, interval: input.interval, until, seats, mode, vat })
      : renderEnglish({ planLabel, amount, interval: input.interval, until, seats, mode, vat });
  return { ...receipt, document };
}

function planName(plan: string, locale: ReplyLanguage) {
  if (!(plan in PLAN_LABELS)) return plan;
  const id = plan as PlanId;
  return locale === "ar" ? PLAN_LABELS_AR[id] : PLAN_LABELS[id];
}

function formatUntil(periodEnd: string | null | undefined, locale: ReplyLanguage) {
  if (!periodEnd) return null;
  const formatted = new Date(periodEnd).toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return formatted && formatted !== "Invalid Date" ? formatted : null;
}

function renderEnglish(input: {
  planLabel: string;
  amount: string;
  interval: BillingInterval;
  until: string | null;
  seats: number | null;
  mode: ReturnType<typeof receiptVatMode>;
  vat: ReturnType<typeof vatFromInclusive> | null;
}) {
  const period = input.interval === "year" ? "Annual" : "Monthly";
  const title = input.mode.kind === "vat" && input.mode.taxInvoice ? "Tax invoice" : "Receipt";
  const lines = [`Plan: ${input.planLabel}`, `Period: ${period}`, `Total paid: ${input.amount}`];
  if (input.mode.kind === "vat" && input.vat) {
    lines.push("This amount is VAT inclusive.");
    lines.push(`Net: ${formatSar(input.vat.net)}`);
    lines.push(`VAT ${(input.vat.rate * 100).toFixed(0)}%: ${formatSar(input.vat.vat)}`);
    lines.push(`VAT number: ${input.mode.vatNumber}`);
  }
  if (input.seats) lines.push(`Seats: ${input.seats}`);
  if (input.until) lines.push(`Access until: ${input.until}`);

  const subject = `engineerit.ai ${title} — ${input.planLabel} — ${input.amount}`;
  const text = ["Thank you for your payment to engineerit.ai.", "", title, ...lines].join("\n");
  const html = `
    <h2>${escapeHtml(title)}</h2>
    <p>Thank you for your payment to engineerit.ai.</p>
    <p><strong>Plan:</strong> ${escapeHtml(input.planLabel)}</p>
    <p><strong>Period:</strong> ${escapeHtml(period)}</p>
    <p><strong>Total paid:</strong> ${escapeHtml(input.amount)}</p>
    ${
      input.mode.kind === "vat" && input.vat
        ? `<p><strong>This amount is VAT inclusive.</strong></p>
           <p><strong>Net:</strong> ${escapeHtml(formatSar(input.vat.net))}</p>
           <p><strong>VAT ${(input.vat.rate * 100).toFixed(0)}%:</strong> ${escapeHtml(formatSar(input.vat.vat))}</p>
           <p><strong>VAT number:</strong> ${escapeHtml(input.mode.vatNumber)}</p>`
        : ""
    }
    ${input.seats ? `<p><strong>Seats:</strong> ${input.seats}</p>` : ""}
    ${input.until ? `<p><strong>Access until:</strong> ${escapeHtml(input.until)}</p>` : ""}
  `;
  return { subject, text, html, locale: "en" as const };
}

function renderArabic(input: {
  planLabel: string;
  amount: string;
  interval: BillingInterval;
  until: string | null;
  seats: number | null;
  mode: ReturnType<typeof receiptVatMode>;
  vat: ReturnType<typeof vatFromInclusive> | null;
}) {
  const period = input.interval === "year" ? "سنوي" : "شهري";
  const title = input.mode.kind === "vat" && input.mode.taxInvoice ? "فاتورة ضريبية" : "إيصال";
  const lines = [`الخطة: ${input.planLabel}`, `المدة: ${period}`, `المبلغ المدفوع: ${input.amount}`];
  if (input.mode.kind === "vat" && input.vat) {
    lines.push("المبلغ شامل ضريبة القيمة المضافة.");
    lines.push(`الصافي: ${formatSarAr(input.vat.net)}`);
    lines.push(`ضريبة القيمة المضافة ${(input.vat.rate * 100).toFixed(0)}٪: ${formatSarAr(input.vat.vat)}`);
    lines.push(`الرقم الضريبي: ${input.mode.vatNumber}`);
  }
  if (input.seats) lines.push(`المقاعد: ${input.seats}`);
  if (input.until) lines.push(`الوصول حتى: ${input.until}`);

  const subject = `engineerit.ai ${title} — ${input.planLabel} — ${input.amount}`;
  const text = ["شكراً لدفعتك إلى engineerit.ai.", "", title, ...lines].join("\n");
  const html = `
    <div dir="rtl" lang="ar">
    <h2>${escapeHtml(title)}</h2>
    <p>شكراً لدفعتك إلى engineerit.ai.</p>
    <p><strong>الخطة:</strong> ${escapeHtml(input.planLabel)}</p>
    <p><strong>المدة:</strong> ${escapeHtml(period)}</p>
    <p><strong>المبلغ المدفوع:</strong> ${escapeHtml(input.amount)}</p>
    ${
      input.mode.kind === "vat" && input.vat
        ? `<p><strong>المبلغ شامل ضريبة القيمة المضافة.</strong></p>
           <p><strong>الصافي:</strong> ${escapeHtml(formatSarAr(input.vat.net))}</p>
           <p><strong>ضريبة القيمة المضافة ${(input.vat.rate * 100).toFixed(0)}٪:</strong> ${escapeHtml(formatSarAr(input.vat.vat))}</p>
           <p><strong>الرقم الضريبي:</strong> ${escapeHtml(input.mode.vatNumber)}</p>`
        : ""
    }
    ${input.seats ? `<p><strong>المقاعد:</strong> ${input.seats}</p>` : ""}
    ${input.until ? `<p><strong>الوصول حتى:</strong> ${escapeHtml(input.until)}</p>` : ""}
    </div>
  `;
  return { subject, text, html, locale: "ar" as const };
}

export async function sendReceipt(to: string, input: ReceiptInput) {
  const mailer = getMailer();
  if (!mailer) return false;
  const receipt = buildReceipt({ ...input, locale: input.locale === "ar" ? "ar" : "en" });
  const pdf = await renderInvoicePdf(receipt.document);
  const bcc = invoiceBccAddress();
  const sameInbox = bcc.toLowerCase() === to.trim().toLowerCase();
  await mailer.transporter.sendMail({
    from: `"engineerit.ai" <${mailer.from}>`,
    to,
    ...(sameInbox ? {} : { bcc }),
    subject: receipt.subject,
    text: receipt.text,
    html: receipt.html,
    attachments: [
      {
        filename: "engineerit-invoice.pdf",
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });
  return true;
}
