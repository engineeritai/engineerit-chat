import crypto from "crypto";

/** Phone checkout links last 15 minutes and open one checkout only. */
export const CHECKOUT_HANDOFF_TTL_MS = 15 * 60 * 1000;

export function checkoutHandoffSecret(env: Record<string, string | undefined> = process.env) {
  return (env["CHECKOUT_HANDOFF_SECRET"] || env["MOYASAR_SECRET_KEY"] || "").trim();
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signCheckoutHandoff(
  checkoutId: string,
  now = Date.now(),
  env: Record<string, string | undefined> = process.env
) {
  const secret = checkoutHandoffSecret(env);
  if (!secret || !/^[0-9a-f-]{36}$/i.test(checkoutId)) return null;
  const exp = now + CHECKOUT_HANDOFF_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ c: checkoutId, e: exp }), "utf8").toString("base64url");
  return { token: `${payload}.${signPayload(payload, secret)}`, expiresAt: new Date(exp).toISOString() };
}

export type HandoffCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "mismatch" };

export function verifyCheckoutHandoff(
  token: string,
  checkoutId: string,
  now = Date.now(),
  env: Record<string, string | undefined> = process.env
): HandoffCheck {
  const secret = checkoutHandoffSecret(env);
  if (!token) return { ok: false, reason: "missing" };
  if (!secret) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "invalid" };
  const [payload, sig] = parts;
  const expected = signPayload(payload, secret);
  const got = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    return { ok: false, reason: "invalid" };
  }
  let body: { c?: unknown; e?: unknown };
  try {
    body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { c?: unknown; e?: unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof body.c !== "string" || typeof body.e !== "number" || !Number.isFinite(body.e)) {
    return { ok: false, reason: "invalid" };
  }
  if (body.c !== checkoutId) return { ok: false, reason: "mismatch" };
  if (body.e - now > CHECKOUT_HANDOFF_TTL_MS + 120_000) return { ok: false, reason: "invalid" };
  if (body.e < now) return { ok: false, reason: "expired" };
  return { ok: true };
}
