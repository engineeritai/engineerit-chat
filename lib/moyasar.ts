import crypto from "crypto";

export type RemoteInvoice = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  url?: string;
  metadata?: Record<string, string>;
};

export function assessPaidInvoice(
  storedHalalas: number,
  remote: { status?: string | null; amount?: number | null }
) {
  if (remote.status !== "paid") {
    return { ok: false as const, reason: "not_paid" as const };
  }
  if (remote.amount !== storedHalalas) {
    return { ok: false as const, reason: "amount_mismatch" as const };
  }
  return { ok: true as const };
}

export function verifyMoyasarSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined
) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature.trim());
}

export function verifyMoyasarSecretToken(
  token: string | null | undefined,
  secret: string | undefined
) {
  if (!token || !secret) return false;
  return safeEqual(token, secret);
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function extractInvoiceId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    id?: unknown;
    status?: unknown;
    amount?: unknown;
    type?: unknown;
    invoice_id?: unknown;
    data?: { invoice_id?: unknown; id?: unknown; metadata?: { checkout_id?: unknown } };
  };

  if (typeof record.type === "string" && record.data && typeof record.data === "object") {
    if (typeof record.data.invoice_id === "string") return record.data.invoice_id;
    return null;
  }

  if (typeof record.invoice_id === "string") return record.invoice_id;
  if (typeof record.id === "string" && (record.status || record.amount)) return record.id;
  return null;
}

export function extractCheckoutId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    metadata?: { checkout_id?: unknown };
    data?: { metadata?: { checkout_id?: unknown } };
  };
  const fromInvoice = record.metadata?.checkout_id;
  const fromPayment = record.data?.metadata?.checkout_id;
  if (typeof fromInvoice === "string") return fromInvoice;
  if (typeof fromPayment === "string") return fromPayment;
  return null;
}

function authHeader(secretKey: string) {
  return "Basic " + Buffer.from(`${secretKey}:`).toString("base64");
}

export async function createMoyasarInvoice(
  secretKey: string,
  payload: {
    amount: number;
    currency: string;
    description: string;
    success_url: string;
    back_url: string;
    callback_url: string;
    metadata: Record<string, string>;
  }
) {
  const response = await fetch("https://api.moyasar.com/v1/invoices", {
    method: "POST",
    headers: {
      Authorization: authHeader(secretKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const invoice = (await response.json().catch(() => null)) as
    | (RemoteInvoice & { message?: string })
    | null;

  if (!response.ok) {
    const message = invoice?.message || "Failed to create payment invoice.";
    throw new Error(message);
  }

  const url = invoice?.url;
  if (!invoice?.id || !url) {
    throw new Error("Payment URL is missing from Moyasar response.");
  }

  return { id: invoice.id, url, invoice };
}

export async function fetchMoyasarInvoice(secretKey: string, invoiceId: string) {
  const response = await fetch(
    `https://api.moyasar.com/v1/invoices/${encodeURIComponent(invoiceId)}`,
    {
      headers: {
        Authorization: authHeader(secretKey),
        Accept: "application/json",
      },
    }
  );

  const invoice = (await response.json().catch(() => null)) as RemoteInvoice | null;
  if (!response.ok || !invoice) {
    throw new Error("Could not verify the Moyasar invoice.");
  }
  return invoice;
}
