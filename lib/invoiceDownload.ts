import { invoiceLanguage } from "@/lib/invoiceDocument";

/** Profile, the success page, and any other client download. Always hits the live generator. */
export function invoicePdfHref(id: string, payToken = "", locale: string | null = "en") {
  const params = new URLSearchParams();
  if (payToken) params.set("pay", payToken);
  params.set("lang", invoiceLanguage(locale));
  return `/api/invoices/${id}/pdf?${params.toString()}`;
}

export async function downloadInvoicePdf(id: string, token: string, payToken = "", locale: string | null = "en") {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(invoicePdfHref(id, payToken, locale), { headers, cache: "no-store" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Could not download the invoice.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = invoiceLanguage(locale) === "ar" ? "engineerit-invoice-ar.pdf" : "engineerit-invoice.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
