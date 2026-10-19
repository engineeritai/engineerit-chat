/** Addresses created by auth probes. They must never receive production mail. */
const TEST_RECIPIENT = /maxxspace|eit-pw-|team449-check|\+test@/i;

export function isTestRecipient(email: string): boolean {
  const value = email.trim().toLowerCase();
  if (!value.includes("@")) return false;
  return TEST_RECIPIENT.test(value);
}

/**
 * Real SMTP is allowed only on the Vercel production runtime.
 * MAIL_TRANSPORT=log or mailpit always sinks. MAIL_TRANSPORT=smtp is an
 * explicit operator override for a non-Vercel host.
 */
export function isProductionMailRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  const transport = (env.MAIL_TRANSPORT || "").toLowerCase();
  if (transport === "log" || transport === "mailpit") return false;
  if (transport === "smtp") return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  return env.VERCEL_ENV === "production" && env.NODE_ENV !== "test";
}

export function mailDecision(args: {
  to: string | string[];
  testHeader?: string | null;
  env?: NodeJS.ProcessEnv;
}): { deliver: "smtp" | "log" | "mailpit"; reason: string } {
  const env = args.env || process.env;
  const recipients = (Array.isArray(args.to) ? args.to : [args.to]).map((item) => String(item || ""));
  if (recipients.some(isTestRecipient)) return { deliver: "log", reason: "test-recipient" };
  const header = (args.testHeader || "").trim().toLowerCase();
  if (header === "1" || header === "true") return { deliver: "log", reason: "test-header" };
  const transport = (env.MAIL_TRANSPORT || "").toLowerCase();
  if (transport === "mailpit") return { deliver: "mailpit", reason: "mailpit" };
  if (transport === "log") return { deliver: "log", reason: "log-transport" };
  if (!isProductionMailRuntime(env)) return { deliver: "log", reason: "non-production" };
  return { deliver: "smtp", reason: "production" };
}
