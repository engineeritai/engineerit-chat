import { cleanUtm } from "@/lib/acquisition";

/** Production site only. Preview hosts and localhost are not counted. */
export const PRODUCTION_HOSTS = ["engineerit.ai", "www.engineerit.ai"] as const;

export type DeviceClass = "mobile" | "desktop";
export type VisitLanguage = "en" | "ar";

export type VisitSkip =
  | "method"
  | "test"
  | "prefetch"
  | "cross-site"
  | "host"
  | "bot"
  | "admin"
  | "path";

export function isProductionHost(host: string) {
  const name = host.trim().toLowerCase().replace(/\.$/, "").split(":")[0] || "";
  return name === "engineerit.ai" || name === "www.engineerit.ai";
}

/** Example numbers are for preview and local review. Never on the public site. */
export function allowVisitExample(host: string, exampleFlag: boolean) {
  return exampleFlag && !isProductionHost(host);
}

export function isExcludedPath(path: string) {
  const name = path.toLowerCase();
  return name === "/admin" || name.startsWith("/admin/") || name === "/api" || name.startsWith("/api/");
}

/**
 * Path only. Query, hash, emails, and dynamic ids are dropped.
 * Returns null when the path is not a normal page path.
 */
export function cleanVisitPath(input: string): string | null {
  let path = input.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  path = path.split("?")[0]?.split("#")[0] || "";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  path = path.toLowerCase();
  path = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g,
    ":id"
  );
  path = path.replace(/^\/(checkout|share|s)\/[^/]+/, "/$1/:id");
  if (path.length > 180 || path.length < 1) return null;
  if (path.includes("@") || path.includes("\\") || path.includes("%") || path.includes("..")) return null;
  if (path !== "/" && !/^\/[a-z0-9._~:-]+(?:\/[a-z0-9._~:-]+)*$/.test(path)) return null;
  return path;
}

const BOT_UA =
  /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|wget\/|curl\/|python-requests|go-http-client|scrapy|httpclient|facebookexternalhit|whatsapp\/|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|pinterest|embedly|applebot|bingpreview|yandex|baiduspider|duckduckbot|semrush|ahrefs|mj12bot|dotbot|bytespider|gptbot|claudebot|anthropic-ai|ccbot|amazonbot|petalbot|dataforseo|screaming frog|lighthouse|pingdom|uptimerobot|statuscake|ia_archiver|qwantify|seznambot|sogou|previewbot/i;

/** Common crawlers, preview fetchers, and headless clients. Empty agents count as bots. */
export function isBotUserAgent(userAgent: string) {
  const value = userAgent.trim();
  if (!value) return true;
  // Cubot phones include "bot" in the device name. They are not crawlers.
  const sample = value.replace(/cubot/gi, " ");
  if (!sample.trim()) return true;
  return BOT_UA.test(sample);
}

export function deviceClass(userAgent: string): DeviceClass {
  if (/ipad|tablet|kindle|silk|playbook|mobile|iphone|ipod|android|webos|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

export function visitLanguage(value: string): VisitLanguage {
  return value.trim().toLowerCase() === "ar" ? "ar" : "en";
}

/** Host only. A same-site or unparseable referrer is stored as none. */
export function referrerHost(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.includes("@")) return null;
  let host = "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.username || url.password) return null;
      host = url.hostname;
    } catch {
      return null;
    }
  } else {
    if (raw.includes("/") || raw.includes("?") || raw.includes("#") || /\s/.test(raw)) return null;
    host = raw;
  }
  host = host.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host || host.length > 253) return null;
  if (host === "engineerit.ai" || host === "www.engineerit.ai") return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return null;
  return host;
}

export function isPrefetchRequest(headers: {
  purpose?: string | null;
  secPurpose?: string | null;
  nextPrefetch?: string | null;
  nextSegmentPrefetch?: string | null;
  middlewarePrefetch?: string | null;
}) {
  const purpose = `${headers.purpose || ""} ${headers.secPurpose || ""}`.toLowerCase();
  if (purpose.includes("prefetch")) return true;
  if ((headers.nextPrefetch || "") === "1") return true;
  if ((headers.nextSegmentPrefetch || "") === "1") return true;
  if ((headers.middlewarePrefetch || "") === "1") return true;
  return false;
}

/** First address only. The value is hashed and never stored. */
export function clientIp(headers: { vercel?: string | null; real?: string | null; forwarded?: string | null }) {
  const pick = (value?: string | null) => (value || "").split(",")[0]?.trim() || "";
  return (pick(headers.vercel) || pick(headers.real) || pick(headers.forwarded) || "unknown").slice(0, 80);
}

export type VisitInspection =
  | { ok: false; reason: VisitSkip }
  | {
      ok: true;
      ip: string;
      userAgent: string;
      day: string;
      fields: {
        path: string;
        referrer_host: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        device_class: DeviceClass;
        language: VisitLanguage;
      };
    };

export type VisitRequestInput = {
  method: string;
  host: string;
  path: string;
  userAgent: string;
  ip: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  language: string;
  purpose: string;
  secPurpose: string;
  nextPrefetch: string;
  nextSegmentPrefetch: string;
  middlewarePrefetch: string;
  testHeader: string;
  secFetchSite: string;
  isAdmin: boolean;
  day: string;
};

function blank(value: string) {
  const cleaned = cleanUtm(value);
  return cleaned || null;
}

/** Decide whether this request is a page view. The caller hashes the identity. */
export function inspectVisit(input: VisitRequestInput): VisitInspection {
  if (input.method.toUpperCase() !== "POST") return { ok: false, reason: "method" };
  if ((input.testHeader || "").trim() === "1") return { ok: false, reason: "test" };
  if (
    isPrefetchRequest({
      purpose: input.purpose,
      secPurpose: input.secPurpose,
      nextPrefetch: input.nextPrefetch,
      nextSegmentPrefetch: input.nextSegmentPrefetch,
      middlewarePrefetch: input.middlewarePrefetch,
    })
  ) {
    return { ok: false, reason: "prefetch" };
  }
  if ((input.secFetchSite || "").trim().toLowerCase() === "cross-site") return { ok: false, reason: "cross-site" };
  if (!isProductionHost(input.host)) return { ok: false, reason: "host" };
  const userAgent = input.userAgent.slice(0, 512);
  if (isBotUserAgent(userAgent)) return { ok: false, reason: "bot" };
  if (input.isAdmin) return { ok: false, reason: "admin" };
  const path = cleanVisitPath(input.path);
  if (!path || isExcludedPath(path)) return { ok: false, reason: "path" };
  return {
    ok: true,
    ip: input.ip.slice(0, 80),
    userAgent,
    day: input.day,
    fields: {
      path,
      referrer_host: referrerHost(input.referrer),
      utm_source: blank(input.utmSource),
      utm_medium: blank(input.utmMedium),
      utm_campaign: blank(input.utmCampaign),
      device_class: deviceClass(userAgent),
      language: visitLanguage(input.language),
    },
  };
}
