import { track } from "@vercel/analytics";
import {
  acquisitionFromMemory,
  acquisitionPayload,
  allowAnalytics,
  eventProperties,
  memoryFromLegacy,
  nextAttribution,
  planConfirmedSignup,
  rememberSignup,
  unknownAcquisition,
  type Acquisition,
  type AttributionMemory,
} from "@/lib/acquisition";

const STORAGE_KEY = "engineerit_utm";
const SEEN_KEY = "engineerit_tracked_events";
const SIGNUP_SEEN_KEY = "engineerit_signup_tracked";
const CALLBACK_KEY = "engineerit_confirm_callback";

export type ProductEvent =
  | "chat_started"
  | "register_completed"
  | "checkout_opened"
  | "payment_succeeded"
  | "campaign_visit";

type TrackSink = (name: ProductEvent, properties: Record<string, string | number | boolean>) => void;

function browserAllow() {
  if (typeof window === "undefined") return false;
  return allowAnalytics({
    hostname: window.location.hostname,
    webdriver: typeof navigator !== "undefined" && navigator.webdriver === true,
  });
}

function readRaw(store: Storage | undefined) {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readMemory(): AttributionMemory | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  const local = memoryFromLegacy(readRaw(window.localStorage), now);
  if (local) return local;
  return memoryFromLegacy(readRaw(window.sessionStorage), now);
}

function writeMemory(memory: AttributionMemory | null) {
  if (typeof window === "undefined") return;
  try {
    if (!memory) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* The signup request still sends whatever was already read. */
  }
}

export function currentAcquisition(): Acquisition {
  const now = Date.now();
  return acquisitionFromMemory(readMemory(), now) || unknownAcquisition(now);
}

/** Remember a whitelisted source for this browser. No cookie and no raw query string. */
export function captureAttribution() {
  const now = Date.now();
  const result = nextAttribution({
    memory: readMemory(),
    search: typeof window === "undefined" ? "" : window.location.search,
    referrer: typeof document === "undefined" ? "" : document.referrer,
    pathname: typeof window === "undefined" ? "/" : window.location.pathname,
    now,
  });
  writeMemory(result.memory);
  return result;
}

export function readAcquisitionPayload() {
  return acquisitionPayload(captureAttribution().acquisition);
}

export function trackProduct(
  name: ProductEvent,
  properties?: Record<string, string | number | boolean | null>,
  deps?: { allow?: boolean; sink?: TrackSink; acquisition?: Acquisition }
) {
  const allow = deps?.allow ?? browserAllow();
  const acquisition = deps?.acquisition || currentAcquisition();
  const payload = eventProperties(name, acquisition, properties);
  if (!allow) return payload;
  const sink = deps?.sink || ((event, extra) => track(event, extra));
  sink(name, payload);
  return payload;
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

export function markConfirmationCallback(intent: "signup" | "code") {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CALLBACK_KEY, intent);
  } catch {
    /* The confirmation URL can still carry type=signup. */
  }
}

export function readConfirmationCallback(): "signup" | "code" | "none" {
  if (typeof window === "undefined") return "none";
  try {
    const raw = window.sessionStorage.getItem(CALLBACK_KEY);
    if (raw === "signup" || raw === "code") return raw;
  } catch {
    /* A missing flag leaves the event unsent. The admin count does not use it. */
  }
  return "none";
}

export function clearConfirmationCallback() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CALLBACK_KEY);
  } catch {
    /* The seen list still blocks a second event in this browser. */
  }
}

export function trackCampaignVisit(acquisition: Acquisition, deps?: { allow?: boolean; sink?: TrackSink }) {
  if (acquisition.source === "unknown") return;
  trackProduct("campaign_visit", undefined, { ...deps, acquisition });
}

function readSignupSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SIGNUP_SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(-20);
  } catch {
    return [];
  }
}

function writeSignupSeen(seen: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIGNUP_SEEN_KEY, JSON.stringify(seen.slice(-20)));
  } catch {
    /* A refresh may send the event again. The admin count does not use this flag. */
  }
}

export function trackConfirmedSignup(
  user: { created_at?: string | null; email_confirmed_at?: string | null; confirmed_at?: string | null; user_metadata?: unknown },
  deps?: { nowMs?: number; seen?: string[]; allow?: boolean; sink?: TrackSink; local?: Acquisition; intent?: "signup" | "code" | "none" }
) {
  const nowMs = deps?.nowMs ?? Date.now();
  const seen = deps?.seen ?? readSignupSeen();
  const local = deps?.local || currentAcquisition();
  const plan = planConfirmedSignup({ user, nowMs, seen, local, intent: deps?.intent || "none" });
  if (!plan.track) return plan;
  const nextSeen = rememberSignup(seen, plan.createdAt);
  if (!deps?.seen) writeSignupSeen(nextSeen);
  trackProduct("register_completed", undefined, {
    allow: deps?.allow ?? browserAllow(),
    sink: deps?.sink,
    acquisition: plan.acquisition,
  });
  return { ...plan, seen: nextSeen };
}
