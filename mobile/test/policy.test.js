const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../www/js/policy.js");

test("maps custom-scheme deep links onto engineerit.ai", () => {
  assert.equal(policy.toSiteUrl("engineerit://chat"), "https://engineerit.ai/chat");
  assert.equal(
    policy.toSiteUrl("engineerit://open/profile?tab=plan"),
    "https://engineerit.ai/profile?tab=plan"
  );
  assert.equal(
    policy.toSiteUrl("https://www.engineerit.ai/login"),
    "https://engineerit.ai/login"
  );
  assert.equal(policy.toSiteUrl("https://example.com/phish"), "https://engineerit.ai/");
  assert.equal(policy.toSiteUrl(""), "https://engineerit.ai/");
});

test("detects Moyasar and other payment hosts", () => {
  assert.equal(policy.isPaymentUrl("https://checkout.moyasar.com/invoices/abc"), true);
  assert.equal(policy.isPaymentUrl("https://api.moyasar.com/v1/invoices"), true);
  assert.equal(policy.isPaymentUrl("https://engineerit.ai/subscription"), false);
  assert.equal(policy.isPaymentUrl("https://engineerit.ai/chat"), false);
});

test("treats pricing, subscription, and checkout routes as purchases", () => {
  assert.equal(policy.isPurchaseHref("/pricing"), true);
  assert.equal(policy.isPurchaseHref("https://engineerit.ai/subscription"), true);
  assert.equal(policy.isPurchaseHref("/payment/success?plan=engineer"), true);
  assert.equal(policy.isPurchaseHref("/api/checkout/moyasar"), true);
  assert.equal(policy.isPurchaseHref("/login"), false);
  assert.equal(policy.isPurchaseHref("/register"), false);
  assert.equal(policy.isPurchaseHref("/chat"), false);
  assert.equal(policy.isPurchaseHref("/profile"), false);
  assert.equal(policy.isPurchaseHref("/legal/privacy"), false);
});

test("matches the purchase buttons currently rendered by the website", () => {
  assert.equal(policy.isPurchaseCtaText("Upgrade"), true);
  assert.equal(policy.isPurchaseCtaText("Subscribe / Upgrade"), true);
  assert.equal(policy.isPurchaseCtaText("View pricing"), true);
  assert.equal(policy.isPurchaseCtaText("View plans & subscribe"), true);
  assert.equal(policy.isPurchaseCtaText("Manage / Upgrade subscription"), true);
  assert.equal(policy.isPurchaseCtaText("Login"), false);
  assert.equal(policy.isPurchaseCtaText("Open chat"), false);
  assert.equal(policy.isPurchaseCtaText("Send"), false);
  assert.equal(
    policy.isPurchaseCtaText("Upgrade to copy, share and attach files"),
    false
  );
});

test("flags short price labels used on the marketing pages", () => {
  assert.equal(policy.showsPrice("SAR 19 / month"), true);
  assert.equal(policy.showsPrice("Team · SAR 349"), true);
  assert.equal(policy.showsPrice("Ask an engineering question"), false);
});
