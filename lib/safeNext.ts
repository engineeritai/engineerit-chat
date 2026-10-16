/** Only allow same-site relative paths. */
export function safeNextPath(value: string | null | undefined, fallback = "/profile") {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return fallback;
  return value;
}
