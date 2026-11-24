import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { countConfirmedSince, foldConfirmedSignups, signupObservation } from "../lib/adminStats";
import { trafficCopy } from "../lib/adminTrafficCopy";
import { aggregatePageViews, normalizePageViewRow, pageViewsTableMissing, type PageViewRow } from "../lib/visitAggregate";
import { exampleAdminStats, examplePageViews, EXAMPLE_NOW } from "../lib/visitExample";
import { planPageView, resolveVisitSalt, visitDay, visitorId, VISIT_HASH_SALT_ENV, VISIT_HASH_SALT_FALLBACK } from "../lib/visitTracking";
import {
  allowVisitExample,
  cleanVisitPath,
  deviceClass,
  isBotUserAgent,
  isExcludedPath,
  isProductionHost,
  referrerHost,
  type VisitRequestInput,
} from "../lib/visitPublic";

const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0";
const SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const CUBOT =
  "Mozilla/5.0 (Linux; Android 10; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.210 Mobile Safari/537.36";
const IP = "203.0.113.8";
const SALT = "production-salt-0123456789";
const NOW = new Date("2026-11-24T12:00:00.000Z");

function request(overrides: Partial<VisitRequestInput> = {}): VisitRequestInput & { salt: string } {
  return {
    method: "POST",
    host: "engineerit.ai",
    path: "/pricing",
    userAgent: CHROME,
    ip: IP,
    referrer: "https://www.linkedin.com/feed?token=secret",
    utmSource: "LinkedIn",
    utmMedium: "social",
    utmCampaign: "launch-post",
    language: "ar",
    purpose: "",
    secPurpose: "",
    nextPrefetch: "",
    nextSegmentPrefetch: "",
    middlewarePrefetch: "",
    testHeader: "",
    secFetchSite: "same-origin",
    isAdmin: false,
    day: "2026-11-24",
    salt: SALT,
    ...overrides,
  };
}

describe("visit bots", () => {
  it("keeps ordinary browsers and drops crawlers and headless clients", () => {
    for (const ua of [CHROME, IPHONE, FIREFOX, SAFARI, CUBOT]) {
      assert.equal(isBotUserAgent(ua), false, ua);
    }
    for (const ua of [
      "",
      "   ",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1",
      "Twitterbot/1.0",
      "LinkedInBot/1.0",
      "WhatsApp/2.23.20.0",
      "Mozilla/5.0 (compatible; Bytespider; +https://zhanzhang.toutiao.com/)",
      "Mozilla/5.0 HeadlessChrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
      "curl/8.5.0",
      "Wget/1.21",
      "python-requests/2.31.0",
      "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
      "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
      "Mozilla/5.0 (compatible; Playwright/1.56; +https://playwright.dev)",
    ]) {
      assert.equal(isBotUserAgent(ua), true, ua);
    }
  });

  it("classes phones as mobile and desktops as desktop", () => {
    assert.equal(deviceClass(IPHONE), "mobile");
    assert.equal(deviceClass(CUBOT), "mobile");
    assert.equal(deviceClass(CHROME), "desktop");
    assert.equal(deviceClass(SAFARI), "desktop");
  });
});

describe("visit identity", () => {
  it("hashes ip, user agent, and the Arabia date, and never returns the ip", () => {
    const day = visitDay(NOW);
    assert.equal(day, "2026-11-24");
    assert.equal(visitDay(new Date("2026-11-23T20:30:00.000Z")), "2026-11-23");
    assert.equal(visitDay(new Date("2026-11-23T21:30:00.000Z")), "2026-11-24");

    const first = visitorId(IP, CHROME, day, SALT);
    assert.equal(first, visitorId(IP, CHROME, day, SALT));
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.equal(first.includes(IP), false);
    assert.equal(first.toLowerCase().includes("chrome"), false);
    assert.notEqual(first, visitorId("203.0.113.9", CHROME, day, SALT));
    assert.notEqual(first, visitorId(IP, IPHONE, day, SALT));
    assert.notEqual(first, visitorId(IP, CHROME, "2026-11-25", SALT));
    assert.notEqual(first, visitorId(IP, CHROME, day, "other-salt-0123456789"));
  });

  it("still hashes when the salt env var is missing", () => {
    assert.equal(VISIT_HASH_SALT_ENV, "VISIT_HASH_SALT");
    const missing = resolveVisitSalt({});
    const short = resolveVisitSalt({ VISIT_HASH_SALT: "too-short" });
    const set = resolveVisitSalt({ VISIT_HASH_SALT: "  long-enough-salt  " });
    assert.equal(missing.fallback, true);
    assert.equal(missing.salt, VISIT_HASH_SALT_FALLBACK);
    assert.equal(short.fallback, true);
    assert.equal(set.fallback, false);
    assert.equal(set.salt, "long-enough-salt");
    const hashed = visitorId(IP, CHROME, "2026-11-24", missing.salt);
    assert.match(hashed, /^[0-9a-f]{64}$/);
    assert.equal(hashed.includes(IP), false);
    assert.notEqual(hashed, visitorId(IP, CHROME, "2026-11-24", set.salt));
  });
});

describe("visit exclusions", () => {
  it("records a production page view without the referrer path or raw address", () => {
    const plan = planPageView(request());
    assert.equal(plan.record, true);
    if (!plan.record) return;
    const json = JSON.stringify(plan.row);
    assert.equal(json.includes(IP), false);
    assert.equal(json.includes("secret"), false);
    assert.equal(json.includes("/feed"), false);
    assert.equal(json.includes("@"), false);
    assert.equal(plan.row.path, "/pricing");
    assert.equal(plan.row.referrer_host, "www.linkedin.com");
    assert.equal(plan.row.utm_source, "linkedin");
    assert.equal(plan.row.utm_medium, "social");
    assert.equal(plan.row.utm_campaign, "launch-post");
    assert.equal(plan.row.language, "ar");
    assert.equal(plan.row.device_class, "desktop");
    assert.match(plan.row.visitor_id, /^[0-9a-f]{64}$/);
    assert.equal("ip" in plan.row, false);
  });

  it("drops admin, api, preview hosts, prefetch, tests, bots, and the signed-in owner", () => {
    const skip = (overrides: Partial<VisitRequestInput>, reason: string) => {
      const plan = planPageView(request(overrides));
      assert.equal(plan.record, false, JSON.stringify(overrides));
      if (!plan.record) assert.equal(plan.reason, reason);
    };
    skip({ path: "/admin" }, "path");
    skip({ path: "/admin/stats" }, "path");
    skip({ path: "/API/chat" }, "path");
    skip({ path: "/people/owner@example.com" }, "path");
    const priced = planPageView(request({ path: "/pricing?email=hidden.person@example.com" }));
    assert.equal(priced.record, true);
    if (priced.record) {
      assert.equal(priced.row.path, "/pricing");
      assert.equal(JSON.stringify(priced.row).includes("@"), false);
      assert.equal(JSON.stringify(priced.row).includes("hidden.person"), false);
    }
    const absolute = planPageView(request({ path: "https://engineerit.ai/chat?utm_source=linkedin&email=hidden.person@example.com" }));
    assert.equal(absolute.record, true);
    if (absolute.record) {
      assert.equal(absolute.row.path, "/chat");
      assert.equal(JSON.stringify(absolute.row).includes("@"), false);
    }
    const chat = planPageView(request({ path: "/chat?utm_source=linkedin" }));
    assert.equal(chat.record, true);
    if (chat.record) {
      assert.equal(chat.row.path, "/chat");
      assert.equal(JSON.stringify(chat.row).includes("email"), false);
    }
    skip({ host: "engineerit-chat-git-preview.vercel.app" }, "host");
    skip({ host: "localhost:3000" }, "host");
    skip({ host: "engineerit.ai.evil.com" }, "host");
    assert.equal(planPageView(request({ host: "www.engineerit.ai" })).record, true);
    assert.equal(planPageView(request({ host: "EngineerIt.ai:443" })).record, true);
    skip({ purpose: "prefetch" }, "prefetch");
    skip({ secPurpose: "prefetch" }, "prefetch");
    skip({ nextPrefetch: "1" }, "prefetch");
    skip({ nextSegmentPrefetch: "1" }, "prefetch");
    skip({ middlewarePrefetch: "1" }, "prefetch");
    skip({ purpose: "prefetch", host: "engineerit.ai", path: "/pricing" }, "prefetch");
    skip({ testHeader: "1" }, "test");
    skip({ secFetchSite: "cross-site" }, "cross-site");
    skip({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" }, "bot");
    skip({ userAgent: "" }, "bot");
    skip({ isAdmin: true }, "admin");
    skip({ method: "GET" }, "method");
  });

  it("strips query strings, emails, and dynamic ids from the stored path", () => {
    assert.equal(cleanVisitPath("/pricing?email=hidden.person@example.com"), "/pricing");
    assert.equal(cleanVisitPath("/Pricing/"), "/pricing");
    assert.equal(cleanVisitPath("/"), "/");
    assert.equal(cleanVisitPath("/share/Ab3xK9mQpL12"), "/share/:id");
    assert.equal(cleanVisitPath("/checkout/550e8400-e29b-41d4-a716-446655440000"), "/checkout/:id");
    assert.equal(cleanVisitPath("/advisors/pmo"), "/advisors/pmo");
    assert.equal(cleanVisitPath("/people/owner@example.com"), null);
    assert.equal(isExcludedPath("/admin/stats"), true);
    assert.equal(isExcludedPath("/api/visits"), true);
    assert.equal(isExcludedPath("/chat"), false);
    assert.equal(isProductionHost("www.engineerit.ai"), true);
    assert.equal(isProductionHost("preview.vercel.app"), false);
    assert.equal(referrerHost("https://engineerit.ai/pricing?utm_source=x"), null);
    assert.equal(referrerHost("https://user:pass@news.example/path"), null);
    const mobile = planPageView(request({ userAgent: IPHONE, language: "fr", utmSource: "<script>", utmCampaign: "owner@example.com" }));
    assert.equal(mobile.record, true);
    if (mobile.record) {
      assert.equal(mobile.row.device_class, "mobile");
      assert.equal(mobile.row.language, "en");
      assert.equal(mobile.row.utm_source, null);
      assert.equal(mobile.row.utm_campaign, null);
    }
  });

  it("shows example numbers only away from the public host", () => {
    assert.equal(allowVisitExample("engineerit.ai", true), false);
    assert.equal(allowVisitExample("www.engineerit.ai", true), false);
    assert.equal(allowVisitExample("localhost", true), true);
    assert.equal(allowVisitExample("engineerit-chat-git-preview.vercel.app", true), true);
    assert.equal(allowVisitExample("engineerit-chat-git-preview.vercel.app", false), false);
  });
});

describe("visit admin aggregation", () => {
  const idA = "a".repeat(64);
  const idB = "b".repeat(64);

  function row(created_at: string, path: string, visitor_id: string, extra: Partial<PageViewRow> = {}): PageViewRow {
    return {
      created_at,
      path,
      referrer_host: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      device_class: "desktop",
      language: "en",
      visitor_id,
      ...extra,
    };
  }

  it("counts visits, uniques, pages, referrers, sources, and conversion in Arabia windows", () => {
    const report = aggregatePageViews(
      [
        row("2026-11-24T10:00:00.000Z", "/pricing", idA, { referrer_host: "www.google.com", utm_source: "linkedin" }),
        row("2026-11-24T11:00:00.000Z", "/chat", idA, { utm_source: "linkedin" }),
        row("2026-11-24T11:30:00.000Z", "/pricing", idB, { referrer_host: "linkedin.com", utm_source: "x" }),
        row("2026-11-23T20:30:00.000Z", "/faq", idB, { referrer_host: "t.co" }),
        row("2026-11-20T10:00:00.000Z", "/register", idA, { utm_source: "email" }),
        row("2026-11-16T10:00:00.000Z", "/guide", idB),
        row("2026-10-20T10:00:00.000Z", "/old", idA, { utm_source: "linkedin" }),
        ...Array.from({ length: 12 }, (_, index) =>
          row("2026-11-22T10:00:00.000Z", `/p/${index}`, idB, { referrer_host: index === 0 ? "www.google.com" : null })
        ),
      ],
      NOW,
      { days7: 2, days30: 5 }
    );

    assert.equal(report.today.views, 3);
    assert.equal(report.today.uniques, 2);
    assert.equal(report.days7.views, 3 + 1 + 1 + 12);
    assert.equal(report.days7.uniques, 2);
    assert.equal(report.days30.views, report.days7.views + 1);
    assert.equal(report.days30.uniques, 2);
    assert.equal(report.daily.length, 14);
    assert.equal(report.daily[13]?.date, "2026-11-24");
    assert.equal(report.daily[13]?.views, 3);
    assert.equal(report.daily[13]?.uniques, 2);
    assert.equal(report.daily.reduce((sum, day) => sum + day.views, 0), report.days7.views + 1);
    assert.equal(report.topPages[0]?.label, "/pricing");
    assert.equal(report.topPages[0]?.count, 2);
    assert.equal(report.topPages.length, 10);
    assert.equal(report.topReferrers[0]?.label, "www.google.com");
    assert.equal(report.topReferrers.find((item) => item.label === "t.co")?.count, 1);
    assert.equal(report.topSources.find((item) => item.label === "linkedin")?.count, 2);
    assert.equal(report.topSources.some((item) => item.label === ""), false);
    assert.equal(report.conversion7, 2 / report.days7.uniques);
    assert.equal(report.conversion30, 5 / report.days30.uniques);
    assert.equal(JSON.stringify(report).includes(IP), false);
    assert.equal(JSON.stringify(report).includes("@"), false);
  });

  it("returns an empty rate when a window has no visitors", () => {
    const report = aggregatePageViews([], NOW, { days7: 4, days30: 9 });
    assert.equal(report.today.views, 0);
    assert.equal(report.days30.uniques, 0);
    assert.equal(report.conversion7, null);
    assert.equal(report.conversion30, null);
    assert.equal(report.daily.length, 14);
    assert.equal(report.truncated, false);
  });

  it("ignores a missing page_views table and a malformed row", () => {
    assert.equal(
      pageViewsTableMissing({ code: "42P01", message: 'relation "public.page_views" does not exist' }),
      true
    );
    assert.equal(
      pageViewsTableMissing({ code: "PGRST205", message: "Could not find the table 'public.page_views' in the schema cache" }),
      true
    );
    assert.equal(pageViewsTableMissing(new Error("Could not find the table 'public.page_views' in the schema cache")), true);
    assert.equal(pageViewsTableMissing({ code: "42P01", message: 'relation "public.conversations" does not exist' }), false);
    assert.equal(pageViewsTableMissing({ code: "42501", message: "permission denied for table page_views" }), false);
    assert.equal(normalizePageViewRow({ created_at: "2026-11-24T00:00:00.000Z", path: "/chat", visitor_id: "nope", device_class: "desktop", language: "en" }), null);
    const kept = normalizePageViewRow({
      created_at: "2026-11-24T00:00:00.000Z",
      path: "/chat",
      visitor_id: "ab".repeat(32),
      device_class: "mobile",
      language: "ar",
      referrer_host: "linkedin.com",
      utm_source: "linkedin",
    });
    assert.equal(kept?.path, "/chat");
    assert.equal(kept?.device_class, "mobile");
  });

  it("uses the same confirmed-signup count as the source table", () => {
    const linkedin = signupObservation({
      created_at: "2026-11-06T10:00:00.000Z",
      email_confirmed_at: "2026-11-06T10:05:00.000Z",
      email: "nora@example.com",
      user_metadata: { acq_source: "linkedin", acq_via: "utm" },
    });
    const testAccount = signupObservation({
      created_at: "2026-11-06T12:00:00.000Z",
      email_confirmed_at: "2026-11-06T12:05:00.000Z",
      email: "eit-pw-1@example.com",
      user_metadata: { acq_source: "x" },
    });
    const unconfirmed = signupObservation({
      created_at: "2026-11-06T12:00:00.000Z",
      email: "waiting@example.com",
      user_metadata: { acq_source: "email" },
    });
    assert.ok(linkedin && testAccount && unconfirmed);
    const todayMs = Date.parse("2026-11-06T21:00:00.000Z");
    const weekMs = Date.parse("2026-10-31T21:00:00.000Z");
    const folded = foldConfirmedSignups([linkedin, testAccount, unconfirmed], todayMs, weekMs);
    assert.equal(countConfirmedSince([linkedin, testAccount, unconfirmed], weekMs), folded.confirmed7);
    assert.equal(folded.visits, null);
    assert.equal(folded.conversion, null);
  });
});

describe("visit page copy and wiring", () => {
  it("keeps the example sample marked and consistent", () => {
    const sample = exampleAdminStats();
    assert.equal(sample.example, true);
    assert.equal(sample.visits.ready, true);
    if (!sample.visits.ready) return;
    assert.equal(sample.visits.daily.length, 14);
    const last7 = sample.visits.daily.slice(-7);
    assert.equal(
      last7.reduce((sum, day) => sum + day.views, 0),
      sample.visits.days7.views
    );
    assert.equal(sample.visits.days7.views > 0, true);
    assert.equal(JSON.stringify(sample).includes("@"), false);
    assert.equal(JSON.stringify(sample.visits).includes("@"), false);
    assert.equal(JSON.stringify(sample).includes("203.0.113"), false);
    assert.equal(examplePageViews().length > 0, true);
    assert.equal(sample.timezone, "Asia/Riyadh");
    assert.equal(EXAMPLE_NOW.toISOString(), "2026-11-24T12:00:00.000Z");
  });

  it("labels the summary in both languages and names the missing table", () => {
    assert.equal(trafficCopy.en.visits, "Visits");
    assert.equal(trafficCopy.en.uniques, "Unique visitors");
    assert.equal(trafficCopy.en.signups, "Signups");
    assert.equal(trafficCopy.en.chats, "Chats");
    assert.equal(trafficCopy.en.paid, "Paid subs");
    assert.equal(trafficCopy.en.missing, "Visits: table not created yet");
    assert.equal(trafficCopy.en.unavailable, "Visits: unavailable");
    assert.match(trafficCopy.en.example, /Example data/);
    assert.match(trafficCopy.en.subtitle, /No cookies/);
    assert.equal(trafficCopy.ar.visits.length > 0, true);
    assert.equal(trafficCopy.ar.missing.includes("الزيارات"), true);
    assert.equal(trafficCopy.en.title, "Traffic and usage");

    const page = readFileSync("app/admin/stats/page.tsx", "utf8");
    assert.equal(page.includes("Visit totals are not stored here"), false);
    assert.equal(page.includes("Visits: unavailable. Conversion: unavailable."), false);
    assert.match(page, /TrafficSummary/);
    assert.match(page, /allowVisitExample/);
  });

  it("wires a silent beacon, service-role storage, and the privacy sentence", () => {
    const beacon = readFileSync("app/components/VisitBeacon.tsx", "utf8");
    const route = readFileSync("app/api/visits/route.ts", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    const sql = readFileSync("supabase/migrations/20261124160000_page_views.sql", "utf8");
    const stats = readFileSync("app/api/admin/stats/route.ts", "utf8");
    const docs = readFileSync("docs/LAUNCH_CHECKLIST.md", "utf8");
    const privacy = readFileSync("app/legal/privacy/page.tsx", "utf8");
    const terms = readFileSync("app/legal/terms/page.tsx", "utf8");

    assert.match(beacon, /keepalive:\s*true/);
    assert.match(beacon, /credentials:\s*"omit"/);
    assert.equal(/document\.cookie|cookies\(/.test(beacon), false);
    assert.equal(beacon.includes("visitTracking"), false);
    assert.match(layout, /isTest \? null : <VisitBeacon \/>/);
    assert.match(route, /planPageView/);
    assert.match(route, /getSupabaseAdmin/);
    assert.match(route, /page_views/);
    assert.match(route, /isAdminEmail/);
    assert.equal(/nodemailer|sendMail|@sendgrid|resend/i.test(route), false);
    assert.match(route, /status: 204/);
    assert.match(stats, /pageViewsTableMissing/);
    assert.match(stats, /aggregatePageViews/);
    assert.equal(/nodemailer|sendMail/i.test(stats), false);

    assert.match(sql, /alter table public\.page_views enable row level security/);
    assert.match(sql, /alter table public\.page_views force row level security/);
    assert.match(sql, /revoke all on table public\.page_views from public, anon, authenticated/);
    assert.match(sql, /grant select, insert on table public\.page_views to service_role/);
    assert.equal(/grant (select|insert|all) on table public\.page_views to (anon|authenticated)/.test(sql), false);
    assert.equal(/create policy/i.test(sql), false);
    assert.match(sql, /VISIT_HASH_SALT/);
    assert.match(docs, /VISIT_HASH_SALT/);
    assert.match(privacy, /privacyVisits/);
    assert.match(terms, /Anonymous aggregate visit statistics are collected without cookies\./);
    assert.match(terms, /تُجمع إحصاءات زيارات مجمّعة ومجهولة دون ملفات تعريف ارتباط\./);
  });
});
