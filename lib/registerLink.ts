import { safeNextPath } from "@/lib/safeNext";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/**
 * Campaign values PR #87 will accept. Dots stay so aliases such as
 * linkedin.com and x.com survive the hop onto /register.
 */
const SAFE_UTM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

export function authPath(
  path: "/register" | "/login",
  args: { locale: "en" | "ar"; search?: string; next?: string | null }
): string {
  const raw = args.search || "";
  const incoming = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const params = new URLSearchParams();
  params.set("lang", args.locale === "ar" ? "ar" : "en");
  for (const key of UTM_KEYS) {
    const value = (incoming.get(key) || "").trim();
    if (SAFE_UTM.test(value)) params.set(key, value);
  }
  if (args.next) {
    const next = safeNextPath(args.next, "");
    if (next) params.set("next", next);
  }
  return `${path}?${params.toString()}`;
}
