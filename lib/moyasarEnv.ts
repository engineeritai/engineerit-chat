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
