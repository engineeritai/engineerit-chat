import { track } from "@vercel/analytics";

const STORAGE_KEY = "engineerit_utm";
const SEEN_KEY = "engineerit_tracked_events";

export type ProductEvent =
  | "chat_started"
  | "register_completed"
  | "checkout_opened"
  | "payment_succeeded";

export type Attribution = {
  utm_source?: string;
  utm_campaign?: string;
};

/** Keep campaign tags short and free of control characters or markup. */
export function cleanUtm(value: string | null | undefined) {
  if (!value) return "";
  return value.trim().replace(/[^\w .\-]/g, "").replace(/\s+/g, " ").slice(0, 80);
}

function readStored(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Attribution;
    const source = cleanUtm(parsed?.utm_source);
    const campaign = cleanUtm(parsed?.utm_campaign);
    return {
      ...(source ? { utm_source: source } : {}),
      ...(campaign ? { utm_campaign: campaign } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Remember utm_source and utm_campaign for this tab.
 * Later pages drop the query string; the stored values stay on custom events.
 */
export function captureAttribution(search?: string): Attribution {
  const stored = readStored();
  if (typeof window === "undefined" && search == null) return stored;
  const params = new URLSearchParams(search ?? (typeof window === "undefined" ? "" : window.location.search));
  const source = cleanUtm(params.get("utm_source"));
  const campaign = cleanUtm(params.get("utm_campaign"));
  if (!source && !campaign) return stored;
  const next: Attribution = {
    ...stored,
    ...(source ? { utm_source: source } : {}),
    ...(campaign ? { utm_campaign: campaign } : {}),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* The event still includes whatever we could read. */
  }
  return next;
}

export function trackProduct(
  name: ProductEvent,
  properties?: Record<string, string | number | boolean | null>
) {
  const utm = captureAttribution();
  const payload: Record<string, string | number | boolean | null> = { ...utm };
  for (const [key, value] of Object.entries(properties || {})) {
    if (value == null || value === "") continue;
    payload[key] = value;
  }
  track(name, payload);
}

/** Fire a page-level event once per tab, so a refresh does not count it again. */
export function trackOnce(
  key: string,
  name: ProductEvent,
  properties?: Record<string, string | number | boolean | null>
) {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(SEEN_KEY);
      const seen = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(seen) && seen.includes(key)) return;
      const next = Array.isArray(seen) ? seen.concat(key).slice(-40) : [key];
      window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      /* Still send the event. */
    }
  }
  trackProduct(name, properties);
}
