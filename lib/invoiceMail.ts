/** Inbox that receives a BCC of every customer invoice email. */
export function invoiceBccAddress(raw = process.env.INVOICE_BCC_EMAIL) {
  const trimmed = raw?.trim();
  return trimmed || "info@engineerit.ai";
}

export function canDownloadInvoice(
  sessionUserId: string | null | undefined,
  invoiceUserId: string | null | undefined,
  status: string | null | undefined
) {
  return Boolean(sessionUserId && invoiceUserId && sessionUserId === invoiceUserId && status === "paid");
}
