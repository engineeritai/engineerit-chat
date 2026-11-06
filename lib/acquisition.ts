/** Whitelisted acquisition labels. No raw query string, email, or referrer path. */

export const ACQUISITION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const VISIT_GAP_MS = 12 * 60 * 60 * 1000;
export const SIGNUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const CONFIRM_FRESH_MS = 30 * 60 * 1000;

export const ACQUISITION_SOURCES = ["linkedin", "x", "email", "unknown"] as const;
export const ACQUISITION_MEDIUMS = ["social", "email", "organic", "referral"] as const;
export const SOURCE_LABELS = ["linkedin", "x", "email", "unknown", "not_recorded"] as const;

export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];
export type AcquisitionMedium = (typeof ACQUISITION_MEDIUMS)[number];
export type AcquisitionVia = "utm" | "referrer" | "none";
export type SourceLabel = (typeof SOURCE_LABELS)[number];

export type Acquisition = {
  source: AcquisitionSource;
  medium?: AcquisitionMedium;
  campaign?: string;
  via: AcquisitionVia;
  expiresAt: number;
};

export type AttributionMemory = {
  source: AcquisitionSource;
  medium?: AcquisitionMedium;
  campaign?: string;
  via: AcquisitionVia;
  expiresAt: number;
  visitKey?: string;
  visitAt?: number;
};

const SOURCE_ALIASES: Record<string, Exclude<AcquisitionSource, "unknown">> = {
  linkedin: "linkedin",
  "linkedin.com": "linkedin",
  lnkd: "linkedin",
  "lnkd.in": "linkedin",
  x: "x",
  twitter: "x",
  "x.com": "x",
  "twitter.com": "x",
  "t.co": "x",
  email: "email",
  newsletter: "email",
  mail: "email",
};

const MEDIUM_ALIASES: Record<string, AcquisitionMedium> = {
  social: "social",
  email: "email",
  "e-mail": "email",
  newsletter: "email",
  organic: "organic",
  referral: "referral",
};

const LINKEDIN_HOSTS = ["linkedin.com", "lnkd.in"];
const X_HOSTS = ["x.com", "twitter.com", "t.co"];
const EMAIL_HOSTS = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "mail.yahoo.co.uk",
  "mail.proton.me",
];

/** Pages reached from a confirmation or recovery email. Their referrer is the mailbox, not the visit. */
const AUTH_REFERRER_PATHS = ["/auth/confirmed", "/reset-password"];

const CAMPAIGN_TOKEN = /^[a-z0-9][a-z0-9_-]{0,40}$/;

export function cleanUtm(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!CAMPAIGN_TOKEN.test(trimmed)) return "";
  return trimmed;
}

function sourceAlias(value: string | null | undefined): Exclude<AcquisitionSource, "unknown"> | "" {
  if (!value) return "";
  const key = value.trim().toLowerCase();
  return SOURCE_ALIASES[key] || "";
}

function mediumAlias(value: string | null | undefined): AcquisitionMedium | "" {
  if (!value) return "";
  const key = value.trim().toLowerCase();
  return MEDIUM_ALIASES[key] || "";
}

function defaultMedium(source: AcquisitionSource, medium: AcquisitionMedium | ""): AcquisitionMedium | "" {
  if (medium) return medium;
  if (source === "linkedin" || source === "x") return "social";
  if (source === "email") return "email";
  return "";
}

export function unknownAcquisition(now: number): Acquisition {
  return { source: "unknown", via: "none", expiresAt: now + ACQUISITION_TTL_MS };
}

function withMedium(source: AcquisitionSource, medium: AcquisitionMedium | "", campaign: string, via: AcquisitionVia, now: number): Acquisition {
  const resolved = defaultMedium(source, medium);
  return {
    source,
    ...(resolved ? { medium: resolved } : {}),
    ...(campaign ? { campaign } : {}),
    via,
    expiresAt: now + ACQUISITION_TTL_MS,
  };
}

/** Read only the three campaign params. The rest of the query string is discarded. */
export function acquisitionFromSearch(search: string, now: number): Acquisition | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const source = sourceAlias(params.get("utm_source"));
  const medium = mediumAlias(params.get("utm_medium"));
  const campaign = cleanUtm(params.get("utm_campaign"));
  if (!source && !medium && !campaign) return null;
  const resolved: AcquisitionSource = source || (medium === "email" ? "email" : "unknown");
  return withMedium(resolved, medium, campaign, "utm", now);
}

function hostnameOf(referrer: string) {
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

function hostMatches(hostname: string, roots: string[]) {
  return roots.some((root) => hostname === root || hostname.endsWith(`.${root}`));
}

/** Classify a referrer by host only. Path and query never leave this function. */
export function acquisitionFromReferrer(referrer: string, now: number): Acquisition | null {
  const host = hostnameOf(referrer);
  if (!host || host === "engineerit.ai" || host === "www.engineerit.ai") return null;
  if (hostMatches(host, LINKEDIN_HOSTS)) return withMedium("linkedin", "social", "", "referrer", now);
  if (hostMatches(host, X_HOSTS)) return withMedium("x", "social", "", "referrer", now);
  if (EMAIL_HOSTS.includes(host)) return withMedium("email", "email", "", "referrer", now);
  return null;
}

function isAuthReferrerPath(pathname: string) {
  return AUTH_REFERRER_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function memoryFromAcquisition(value: Acquisition, previous?: AttributionMemory | null): AttributionMemory {
  return {
    source: value.source,
    ...(value.medium ? { medium: value.medium } : {}),
    ...(value.campaign ? { campaign: value.campaign } : {}),
    via: value.via,
    expiresAt: value.expiresAt,
    ...(previous?.visitKey ? { visitKey: previous.visitKey } : {}),
    ...(previous?.visitAt ? { visitAt: previous.visitAt } : {}),
  };
}

export function acquisitionFromMemory(memory: AttributionMemory | null, now: number): Acquisition | null {
  if (!memory || !memory.expiresAt || memory.expiresAt <= now) return null;
  const source = ACQUISITION_SOURCES.includes(memory.source) ? memory.source : "unknown";
  const medium = memory.medium && ACQUISITION_MEDIUMS.includes(memory.medium) ? memory.medium : "";
  const campaign = cleanUtm(memory.campaign);
  const via: AcquisitionVia = memory.via === "utm" || memory.via === "referrer" ? memory.via : "none";
  if (source === "unknown" && !campaign && via === "none") return null;
  return { ...withMedium(source, medium, campaign, via, now), expiresAt: memory.expiresAt };
}

function hasSignal(value: Acquisition | null): value is Acquisition {
  return Boolean(value && (value.source !== "unknown" || value.campaign || value.via === "utm"));
}

export function visitSignature(value: Acquisition) {
  return [value.source, value.medium || "", value.campaign || "", value.via].join("|");
}

/**
 * Last tagged link wins. A referrer never replaces a tag, and the confirmation
 * page's mailbox referrer never becomes the visit.
 */
export function nextAttribution(args: {
  memory: AttributionMemory | null;
  search: string;
  referrer: string;
  pathname: string;
  now: number;
}): { memory: AttributionMemory | null; emitVisit: boolean; acquisition: Acquisition } {
  const now = args.now;
  const stored = acquisitionFromMemory(args.memory, now);
  const tagged = acquisitionFromSearch(args.search, now);
  const taggedWins = hasSignal(tagged) && (!hasSignal(stored) || tagged.source !== "unknown" || Boolean(tagged.campaign));
  let next: Acquisition | null = null;
  if (taggedWins) next = tagged;
  else if (hasSignal(stored)) next = { ...stored, expiresAt: stored.expiresAt };
  else if (!isAuthReferrerPath(args.pathname || "/")) next = acquisitionFromReferrer(args.referrer, now);

  const acquisition = next && hasSignal(next) ? next : unknownAcquisition(now);
  if (!next || !hasSignal(next)) {
    return { memory: args.memory && stored ? args.memory : null, emitVisit: false, acquisition };
  }

  const signature = visitSignature(next);
  const previousAt = args.memory?.visitKey === signature ? args.memory.visitAt || 0 : 0;
  const emitVisit = next.source !== "unknown" && now - previousAt >= VISIT_GAP_MS;
  const memory = memoryFromAcquisition(next, args.memory);
  if (emitVisit) {
    memory.visitKey = signature;
    memory.visitAt = now;
  }
  return { memory, emitVisit, acquisition };
}

/** Client payload. Unknown keys are not readable from this shape. */
export function acquisitionPayload(value: Acquisition) {
  return {
    source: value.source,
    via: value.via,
    ...(value.medium ? { medium: value.medium } : {}),
    ...(value.campaign ? { campaign: value.campaign } : {}),
  };
}

/** Server-side whitelist. A raw query, email, or markup string cannot be stored. */
export function acquisitionFromClient(input: unknown, now = 0): Acquisition {
  const stamp = now || 0;
  if (!input || typeof input !== "object") return unknownAcquisition(stamp);
  const record = input as Record<string, unknown>;
  const source = sourceAlias(typeof record.source === "string" ? record.source : "");
  const medium = mediumAlias(typeof record.medium === "string" ? record.medium : "");
  const campaign = cleanUtm(typeof record.campaign === "string" ? record.campaign : "");
  const viaRaw = typeof record.via === "string" ? record.via : "";
  const via: AcquisitionVia = viaRaw === "utm" || viaRaw === "referrer" ? viaRaw : "none";
  const resolved: AcquisitionSource = source || (medium === "email" ? "email" : "unknown");
  if (resolved === "unknown" && !campaign) return unknownAcquisition(stamp);
  return withMedium(resolved, medium, campaign, via, stamp);
}

export function acquisitionMetadata(input: unknown): Record<string, string> {
  const value = acquisitionFromClient(input);
  return {
    acq_source: value.source,
    acq_via: value.via,
    ...(value.medium ? { acq_medium: value.medium } : {}),
    ...(value.campaign ? { acq_campaign: value.campaign } : {}),
  };
}

export function acquisitionFromMetadata(meta: unknown, now = 0): Acquisition {
  if (!meta || typeof meta !== "object") return unknownAcquisition(now);
  const record = meta as Record<string, unknown>;
  if (typeof record.acq_source !== "string" && typeof record.acq_via !== "string") return unknownAcquisition(now);
  return acquisitionFromClient(
    {
      source: record.acq_source,
      medium: record.acq_medium,
      campaign: record.acq_campaign,
      via: record.acq_via,
    },
    now
  );
}

export function sourceFromMetadata(meta: unknown): SourceLabel {
  if (!meta || typeof meta !== "object") return "not_recorded";
  const raw = (meta as Record<string, unknown>).acq_source;
  if (raw == null || raw === "") return "not_recorded";
  if (raw === "linkedin" || raw === "x" || raw === "email" || raw === "unknown") return raw;
  return "not_recorded";
}

export type ViaLabel = "utm" | "referrer" | "none" | "not_recorded";

/** utm is a tagged link. referrer is only the site host. Neither is a visit total. */
export function viaFromMetadata(meta: unknown): ViaLabel {
  if (!meta || typeof meta !== "object") return "not_recorded";
  const raw = (meta as Record<string, unknown>).acq_via;
  if (raw == null || raw === "") return "not_recorded";
  if (raw === "utm" || raw === "referrer" || raw === "none") return raw;
  return "not_recorded";
}

export function preferAcquisition(primary: Acquisition, fallback: Acquisition): Acquisition {
  if (primary.via === "utm" && (primary.source !== "unknown" || primary.campaign)) return primary;
  if (fallback.via === "utm" && (fallback.source !== "unknown" || fallback.campaign)) return fallback;
  if (primary.source !== "unknown") return primary;
  if (fallback.source !== "unknown") return fallback;
  return primary;
}

export function isFreshConfirmedSignup(
  user: { created_at?: string | null; email_confirmed_at?: string | null; confirmed_at?: string | null },
  nowMs: number
) {
  const created = Date.parse(user.created_at || "");
  const confirmed = Date.parse(user.email_confirmed_at || user.confirmed_at || "");
  if (!Number.isFinite(created) || !Number.isFinite(confirmed)) return false;
  if (created > nowMs + 60_000) return false;
  if (nowMs - created > SIGNUP_MAX_AGE_MS) return false;
  if (confirmed + 60_000 < created) return false;
  if (nowMs - confirmed > CONFIRM_FRESH_MS) return false;
  if (confirmed - nowMs > 60_000) return false;
  return true;
}

export function isCreatedStamp(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && value.length <= 40;
}

export function rememberSignup(seen: string[], createdAt: string) {
  if (!isCreatedStamp(createdAt) || seen.includes(createdAt)) return seen.slice(-20);
  return seen.concat(createdAt).slice(-20);
}

export function shouldTrackSubmittedSignup(needsConfirmation: boolean | undefined) {
  return needsConfirmation === false;
}

export type SignupTrackPlan =
  | { track: false }
  | { track: true; createdAt: string; acquisition: Acquisition };

export function planConfirmedSignup(args: {
  user: { created_at?: string | null; email_confirmed_at?: string | null; confirmed_at?: string | null; user_metadata?: unknown };
  nowMs: number;
  seen: string[];
  local: Acquisition;
}): SignupTrackPlan {
  if (!isFreshConfirmedSignup(args.user, args.nowMs)) return { track: false };
  const createdAt = args.user.created_at || "";
  if (!isCreatedStamp(createdAt) || args.seen.includes(createdAt)) return { track: false };
  const stored = acquisitionFromMetadata(args.user.user_metadata, args.nowMs);
  return { track: true, createdAt, acquisition: preferAcquisition(stored, args.local) };
}

const EVENT_FIELDS = ["source", "via", "medium", "campaign", "plan"] as const;

export function eventProperties(name: "register_completed" | "campaign_visit" | "chat_started" | "checkout_opened" | "payment_succeeded", acquisition: Acquisition, extra?: Record<string, string | number | boolean | null>) {
  const include = name === "register_completed" || name === "campaign_visit" || acquisition.source !== "unknown" || Boolean(acquisition.campaign);
  const payload: Record<string, string | number | boolean> = {};
  if (include && (name === "register_completed" || acquisition.source !== "unknown" || acquisition.campaign)) {
    if (name === "register_completed" || acquisition.source !== "unknown") payload.source = acquisition.source;
    if (name === "register_completed" || acquisition.via !== "none") payload.via = acquisition.via;
    if (acquisition.medium) payload.medium = acquisition.medium;
    if (acquisition.campaign) payload.campaign = acquisition.campaign;
  }
  for (const [key, value] of Object.entries(extra || {})) {
    if (!EVENT_FIELDS.includes(key as (typeof EVENT_FIELDS)[number]) || value == null || value === "") continue;
    if (key === "plan" && typeof value === "string") {
      const plan = cleanUtm(value);
      if (plan) payload.plan = plan;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) payload[key] = value;
    else if (typeof value === "boolean") payload[key] = value;
  }
  return payload;
}

export function allowAnalytics(args: { hostname?: string; webdriver?: boolean }) {
  if (args.webdriver) return false;
  const host = (args.hostname || "").toLowerCase().replace(/\.$/, "");
  return host === "engineerit.ai" || host === "www.engineerit.ai";
}

export function allowAnalyticsUrl(url: string, webdriver = false) {
  try {
    return allowAnalytics(new URL(url).hostname ? { hostname: new URL(url).hostname, webdriver } : { webdriver });
  } catch {
    return false;
  }
}

/** Legacy session value, re-read through the whitelist. */
export function memoryFromLegacy(raw: unknown, now: number): AttributionMemory | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.expiresAt === "number" && record.expiresAt <= now) return null;
  if (typeof record.source === "string" || typeof record.via === "string") {
    const acquisition = acquisitionFromClient(
      {
        source: record.source,
        medium: record.medium,
        campaign: record.campaign,
        via: record.via,
      },
      now
    );
    if (acquisition.source === "unknown" && !acquisition.campaign && acquisition.via === "none") return null;
    const expiresAt = typeof record.expiresAt === "number" && record.expiresAt > now ? record.expiresAt : now + ACQUISITION_TTL_MS;
    return attachVisit(memoryFromAcquisition({ ...acquisition, expiresAt }), record);
  }
  const source = typeof record.utm_source === "string" ? record.utm_source : "";
  const campaign = typeof record.utm_campaign === "string" ? record.utm_campaign : "";
  const tagged = acquisitionFromSearch(`?utm_source=${encodeURIComponent(source)}&utm_campaign=${encodeURIComponent(campaign)}`, now);
  if (!tagged) return null;
  return attachVisit(memoryFromAcquisition(tagged), record);
}

function attachVisit(memory: AttributionMemory, record: Record<string, unknown>) {
  if (typeof record.visitKey === "string" && /^[a-z0-9_|-]{1,120}$/.test(record.visitKey)) memory.visitKey = record.visitKey;
  if (typeof record.visitAt === "number" && Number.isFinite(record.visitAt)) memory.visitAt = record.visitAt;
  return memory;
}
