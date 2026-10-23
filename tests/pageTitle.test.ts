import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { metaFor } from "../lib/pageMeta";
import { defaultTitle, pageMetadata } from "../lib/seo";

const EN_TITLE = "engineer it | AI Engineering Assistant";
const AR_TITLE = "engineer it | مساعد هندسي بالذكاء الاصطناعي";
const EN_DESCRIPTION =
  "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Your subscription unlocks unlimited chats, engineering tools and AI Advisors.";
const AR_DESCRIPTION =
  "engineerit.ai يهندس أي فكرة أو موضوع بمنهج منظم. أرفق ملفاتك، واختر أداة، واحصل على إجابات منظمة. اشتراكك يفتح المحادثات غير المحدودة والأدوات الهندسية ومستشاري الذكاء الاصطناعي.";

function absoluteTitle(metadata: ReturnType<typeof pageMetadata>) {
  const title = metadata.title;
  assert.equal(typeof title, "object");
  assert.ok(title && "absolute" in title);
  return title.absolute;
}

test("homepage titles are the link-preview title in both locales", () => {
  const en = metaFor("en", "/");
  const ar = metaFor("ar", "/");
  assert.equal(en.title, EN_TITLE);
  assert.equal(ar.title, AR_TITLE);
  assert.equal(defaultTitle, EN_TITLE);
  assert.equal(en.description, EN_DESCRIPTION);
  assert.equal(ar.description, AR_DESCRIPTION);

  const enMeta = pageMetadata({ ...en, path: "/", locale: "en" });
  const arMeta = pageMetadata({ ...ar, path: "/", locale: "ar" });
  assert.equal(absoluteTitle(enMeta), EN_TITLE);
  assert.equal(enMeta.openGraph?.title, EN_TITLE);
  assert.equal(enMeta.twitter?.title, EN_TITLE);
  assert.equal(enMeta.description, EN_DESCRIPTION);
  assert.equal(absoluteTitle(arMeta), AR_TITLE);
  assert.equal(arMeta.openGraph?.title, AR_TITLE);
  assert.equal(arMeta.twitter?.title, AR_TITLE);
  assert.equal(arMeta.description, AR_DESCRIPTION);
});

test("per-page titles keep their page name and use the engineer it suffix", () => {
  assert.equal(metaFor("en", "/pricing").title, "Pricing | engineer it");
  assert.equal(metaFor("ar", "/pricing").title, "الأسعار | engineer it");
  assert.equal(metaFor("en", "/faq").description.startsWith("Answers for engineering consultancies:"), true);

  const priced = pageMetadata({ ...metaFor("en", "/pricing"), path: "/pricing" });
  assert.equal(absoluteTitle(priced), "Pricing | engineer it");

  const stats = pageMetadata({
    title: "Stats",
    description: "Internal stats",
    path: "/admin/stats",
    index: false,
  });
  assert.equal(absoluteTitle(stats), "Stats | engineer it");
  assert.equal(stats.openGraph?.title, "Stats | engineer it");
  assert.equal(stats.twitter?.title, "Stats | engineer it");

  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /template: "%s \| engineer it"/);
  const pageMeta = readFileSync("lib/pageMeta.ts", "utf8");
  assert.equal(pageMeta.includes("GCC consultancies"), false);
  assert.equal(pageMeta.includes("لمكاتب الخليج"), false);
});
