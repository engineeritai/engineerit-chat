import { receiptVatMode, vatFromInclusive } from "@/lib/billingCycle";
import { PLAN_LABELS, formatSar, type BillingInterval, type PlanId } from "@/lib/plans";
import { RIYAL } from "@/lib/riyal";

export type InvoiceLocale = "en" | "ar";

/** English is the invoice language unless the UI language is Arabic. */
export function invoiceLanguage(locale: string | null | undefined): InvoiceLocale {
  return locale === "ar" ? "ar" : "en";
}

export type InvoiceRow = { label: string; value: string };

export type InvoiceDocument = {
  locale: InvoiceLocale;
  title: string;
  invoiceNumber: string;
  issuedOn: string;
  billToLabel: string;
  customerName: string;
  customerEmail: string;
  rows: InvoiceRow[];
  totalLabel: string;
  totalValue: string;
  notes: string[];
  footer: string;
};

const PRESENTATION_FORMS = /[\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** The PDF draws logical Arabic and lets the font shape it. Presentation forms become tofu. */
export function usesLogicalArabic(doc: InvoiceDocument) {
  const lines = [
    doc.title,
    doc.customerName,
    doc.billToLabel,
    doc.totalLabel,
    ...doc.rows.flatMap((row) => [row.label, row.value]),
    ...doc.notes,
    doc.footer,
  ];
  return lines.every((line) => !PRESENTATION_FORMS.test(line));
}

const PLAN_LABELS_AR: Record<PlanId, string> = {
  assistant: "المهندس المساعد",
  engineer: "المهندس",
  professional: "المهندس المحترف",
  consultant: "المهندس الاستشاري",
  team: "الفريق",
  enterprise: "المؤسسات",
};

const METHOD_EN: Record<string, string> = {
  creditcard: "Card (mada, Visa, Mastercard, Amex)",
  applepay: "Apple Pay",
  samsungpay: "Samsung Pay",
  stcpay: "STC Pay",
  token: "Saved card",
};

const METHOD_AR: Record<string, string> = {
  creditcard: "بطاقة — مدى، فيزا، ماستركارد، أمريكان إكسبريس",
  applepay: "Apple Pay",
  samsungpay: "Samsung Pay",
  stcpay: "STC Pay",
  token: "بطاقة محفوظة",
};

export function paymentMethodLabel(type: string | null | undefined, locale: InvoiceLocale) {
  const key = (type || "").trim().toLowerCase();
  if (!key) return "";
  const table = locale === "ar" ? METHOD_AR : METHOD_EN;
  return table[key] || type || "";
}

export function planLabel(plan: string, locale: InvoiceLocale) {
  if (!(plan in PLAN_LABELS)) return plan;
  const id = plan as PlanId;
  return locale === "ar" ? PLAN_LABELS_AR[id] : PLAN_LABELS[id];
}

export type InvoiceDraft = {
  plan: string;
  amountSar: number;
  interval: BillingInterval;
  seats?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  locale?: string | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  paymentMethod?: string | null;
  paymentId?: string | null;
  issuedAt?: string | null;
  vatNumber?: string;
  zatcaFlag?: string;
};

export function buildInvoiceDocument(input: InvoiceDraft): InvoiceDocument {
  const locale = invoiceLanguage(input.locale);
  const ar = locale === "ar";
  const plan = planLabel(input.plan, locale);
  const cycle = input.interval === "year" ? (ar ? "سنوي" : "Annual") : ar ? "شهري" : "Monthly";
  const amount = ar ? formatArabicAmount(input.amountSar) : formatSar(input.amountSar);
  const mode = receiptVatMode(input.vatNumber, input.zatcaFlag);
  const vat = mode.kind === "vat" ? vatFromInclusive(input.amountSar) : null;
  const seats =
    input.seats && input.seats > 0 && (input.plan === "team" || input.plan === "enterprise")
      ? String(input.seats)
      : "";
  const method = paymentMethodLabel(input.paymentMethod, locale);
  const rows: InvoiceRow[] = [
    { label: ar ? "الباقة" : "Plan", value: plan },
    { label: ar ? "دورة الفوترة" : "Billing cycle", value: cycle },
  ];
  if (seats) rows.push({ label: ar ? "المقاعد" : "Seats", value: seats });
  const start = formatWhen(input.periodStart);
  const end = formatWhen(input.periodEnd);
  if (start) rows.push({ label: ar ? "بداية الفترة" : "Period start", value: start });
  if (end) rows.push({ label: ar ? "نهاية الفترة" : "Period end", value: end });
  if (method) rows.push({ label: ar ? "طريقة الدفع" : "Payment method", value: method });
  if (input.paymentId) rows.push({ label: ar ? "رقم عملية ميسر" : "Moyasar payment ID", value: input.paymentId });

  const notes: string[] = [];
  if (mode.kind === "vat" && vat) {
    if (ar) {
      notes.push("المبلغ شامل ضريبة القيمة المضافة.");
      notes.push(`الصافي: ${formatArabicAmount(vat.net)}`);
      notes.push(`ضريبة القيمة المضافة ${(vat.rate * 100).toFixed(0)}٪: ${formatArabicAmount(vat.vat)}`);
      notes.push(`الرقم الضريبي: ${mode.vatNumber}`);
    } else {
      notes.push("This amount is VAT inclusive.");
      notes.push(`Net: ${formatSar(vat.net)}`);
      notes.push(`VAT ${(vat.rate * 100).toFixed(0)}%: ${formatSar(vat.vat)}`);
      notes.push(`VAT number: ${mode.vatNumber}`);
    }
  } else {
    notes.push(ar ? "ضريبة القيمة المضافة حسب الأنظمة" : "VAT as applicable");
  }

  return {
    locale,
    title: ar ? "فاتورة" : "Invoice",
    invoiceNumber: (input.invoiceNumber || "").trim() || (ar ? "بدون رقم" : "Draft"),
    issuedOn: formatWhen(input.issuedAt) || formatWhen(new Date().toISOString()),
    billToLabel: ar ? "فاتورة إلى" : "Bill to",
    customerName: (input.customerName || "").trim() || (ar ? "العميل" : "Customer"),
    customerEmail: (input.customerEmail || "").trim(),
    rows,
    totalLabel: ar ? "المبلغ" : "Amount",
    totalValue: amount,
    notes,
    footer: "engineerit.ai  |  support@engineerit.ai",
  };
}

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Riyal sign, then a space, then the number. The PDF draws the sign from the official paths. */
export function formatArabicAmount(amount: number) {
  return `${RIYAL} ${formatAmount(amount)}`;
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
