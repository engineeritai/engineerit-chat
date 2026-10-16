/** Read Moyasar keys at request time. Bracket access stays out of the build-time inliner. */
export function readMoyasarKeys(env: Record<string, string | undefined> = process.env) {
  const secret = (env["MOYASAR_SECRET_KEY"] || "").trim();
  const publishable = (env["NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY"] || "").trim();
  const missing: string[] = [];
  if (!secret) missing.push("MOYASAR_SECRET_KEY");
  if (!publishable) missing.push("NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY");
  return { secret, publishable, missing };
}

export function moyasarKeysError(missing: string[]) {
  if (missing.length === 0) return "";
  return `Missing ${missing.join(" and ")} on the server.`;
}

/** Samsung Pay stays off the form until the merchant service id is set. */
export function readSamsungPayServiceId(env: Record<string, string | undefined> = process.env) {
  return (env["NEXT_PUBLIC_MOYASAR_SAMSUNG_PAY_SERVICE_ID"] || "").trim();
}

/** Mada first, then the other networks Moyasar accepts for a Saudi merchant. */
export const MOYASAR_CARD_NETWORKS = ["mada", "visa", "mastercard", "amex", "unionpay"] as const;

/**
 * Wallets are listed before the card so supported devices show them first.
 * Samsung Pay is omitted when the service id is empty.
 */
export function checkoutPaymentMethods(samsungServiceId: string, wallets = true) {
  if (!wallets) return ["creditcard"];
  const methods = ["applepay"];
  if (samsungServiceId.trim()) methods.push("samsungpay");
  methods.push("stcpay", "creditcard");
  return methods;
}

/** Apple Pay, Samsung Pay, and STC Pay cannot be stored for automatic renewal. */
export function isWalletPaymentSource(type: string | null | undefined) {
  return type === "applepay" || type === "samsungpay" || type === "stcpay";
}

/** Moyasar rejects save_card when tokenization is not enabled for the merchant. */
export function isSaveCardRejection(error: unknown) {
  const text =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error ?? "");
  return /save[_\s-]?card|tokeni[sz]/i.test(text);
}
