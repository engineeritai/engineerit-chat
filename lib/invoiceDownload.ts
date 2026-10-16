export async function downloadInvoicePdf(id: string, token: string, payToken = "") {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const qs = payToken ? `?pay=${encodeURIComponent(payToken)}` : "";
  const res = await fetch(`/api/invoices/${id}/pdf${qs}`, { headers });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Could not download the invoice.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "engineerit-invoice.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
