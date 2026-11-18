import assert from "node:assert/strict";
import test from "node:test";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { SITEMAP_PAGES, languageAlternates, localizedPageUrl, pageMetadata } from "../lib/seo";

const KEYS = ["/", "/pricing", "/advisors", "/register", "/chat"] as const;

test("arabic URLs are their own canonical and name en, ar, and x-default", () => {
  assert.equal(localizedPageUrl("/", "en"), "https://engineerit.ai");
  assert.equal(localizedPageUrl("/", "ar"), "https://engineerit.ai/?lang=ar");
  assert.equal(localizedPageUrl("/pricing", "ar"), "https://engineerit.ai/pricing?lang=ar");

  const arabic = languageAlternates("/pricing", "ar");
  assert.equal(arabic.canonical, "https://engineerit.ai/pricing?lang=ar");
  assert.equal(arabic.languages.en, "https://engineerit.ai/pricing");
  assert.equal(arabic.languages.ar, "https://engineerit.ai/pricing?lang=ar");
  assert.equal(arabic.languages["x-default"], "https://engineerit.ai/pricing");

  const english = languageAlternates("/", "en");
  assert.equal(english.canonical, "https://engineerit.ai");
  assert.equal(english.languages["x-default"], "https://engineerit.ai");

  const meta = pageMetadata({
    title: "الأسعار | engineer it",
    description: "أسعار engineerit.ai",
    path: "/pricing",
    locale: "ar",
  });
  assert.equal(meta.alternates?.canonical, "https://engineerit.ai/pricing?lang=ar");
  assert.equal(meta.openGraph?.url, "https://engineerit.ai/pricing?lang=ar");
  assert.equal(meta.openGraph?.locale, "ar_SA");
  const languages = meta.alternates?.languages as Record<string, string>;
  assert.equal(languages.en, "https://engineerit.ai/pricing");
  assert.equal(languages.ar, "https://engineerit.ai/pricing?lang=ar");
  assert.equal(languages["x-default"], "https://engineerit.ai/pricing");
});

test("sitemap lists each key page in English and Arabic and omits login", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  for (const path of KEYS) {
    assert.equal(urls.includes(localizedPageUrl(path, "en")), true, path);
    assert.equal(urls.includes(localizedPageUrl(path, "ar")), true, `${path} ar`);
  }
  assert.equal(urls.some((url) => url.includes("/login")), false);
  assert.equal(SITEMAP_PAGES.some((page) => page.path === "/login"), false);
  for (const entry of entries) {
    const languages = entry.alternates?.languages;
    assert.equal(languages?.en, localizedPageUrl(new URL(entry.url).pathname, "en"));
    assert.ok(languages?.ar?.includes("lang=ar"));
    assert.equal(languages?.["x-default"], languages?.en);
  }
});

test("robots allows the public site and still points at the sitemap", () => {
  const body = robots();
  const rules = Array.isArray(body.rules) ? body.rules[0] : body.rules;
  assert.equal(rules?.allow, "/");
  const blocked = Array.isArray(rules?.disallow) ? rules.disallow.join(" ") : String(rules?.disallow || "");
  for (const path of ["/pricing", "/advisors", "/register", "/chat"]) {
    assert.equal(blocked.includes(path), false, path);
  }
  assert.match(String(body.sitemap), /sitemap\.xml$/);
});
