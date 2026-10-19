import assert from "node:assert/strict";
import test from "node:test";
import { checkAuthRate, consumeAuthDaily, resetAuthRateLimits } from "../lib/authRateLimit";
import { isProductionMailRuntime, isTestRecipient, mailDecision } from "../lib/mailPolicy";

const prod = { NODE_ENV: "production", VERCEL_ENV: "production" } as NodeJS.ProcessEnv;

test("test inboxes and non-production never use SMTP", () => {
  for (const email of [
    "eit-pw-mvcn4vtf@maxxspace.com",
    "t4491@maxxspace.com",
    "team449-check-20261017@example.com",
    "owner+test@engineerit.ai",
  ]) {
    assert.equal(isTestRecipient(email), true);
    assert.equal(mailDecision({ to: email, env: prod }).deliver, "log");
  }
  assert.equal(isTestRecipient("engism16@outlook.com"), false);
  assert.equal(mailDecision({ to: "engism16@outlook.com", env: prod }).deliver, "smtp");
  assert.equal(mailDecision({ to: "engism16@outlook.com", env: prod, testHeader: "1" }).reason, "test-header");
  assert.equal(mailDecision({ to: "engism16@outlook.com", env: { NODE_ENV: "development" } }).reason, "non-production");
  assert.equal(mailDecision({ to: "engism16@outlook.com", env: { ...prod, MAIL_TRANSPORT: "log" } }).deliver, "log");
  assert.equal(mailDecision({ to: "engism16@outlook.com", env: { ...prod, MAIL_TRANSPORT: "mailpit" } }).deliver, "mailpit");
  assert.equal(isProductionMailRuntime({ NODE_ENV: "production", VERCEL_ENV: "preview" }), false);
  assert.equal(isProductionMailRuntime(prod), true);
  assert.equal(mailDecision({ to: "eit-pw-a@maxxspace.com", env: prod }).deliver === "smtp" ? "send" : "sink", "sink");
  assert.equal(mailDecision({ to: "person@engineerit.ai", env: prod }).deliver === "smtp" ? "send" : "sink", "send");
});

test("signup, reset, and resend share 3 per hour per address and 20 per hour per IP", () => {
  resetAuthRateLimits();
  const now = Date.parse("2026-10-17T12:00:00Z");
  for (let i = 0; i < 3; i += 1) {
    assert.equal(checkAuthRate({ email: "person@engineerit.ai", ip: "1.2.3.4", now: now + i }).ok, true);
  }
  const blocked = checkAuthRate({ email: "person@engineerit.ai", ip: "1.2.3.4", now: now + 4 });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.scope, "address");
  assert.equal(checkAuthRate({ email: "person@engineerit.ai", ip: "1.2.3.4", now: now + 60 * 60 * 1000 }).ok, true);

  resetAuthRateLimits();
  for (let i = 0; i < 20; i += 1) {
    assert.equal(checkAuthRate({ email: `user${i}@engineerit.ai`, ip: "9.9.9.9", now }).ok, true);
  }
  const ipBlocked = checkAuthRate({ email: "one-more@engineerit.ai", ip: "9.9.9.9", now });
  assert.equal(ipBlocked.ok, false);
  if (!ipBlocked.ok) assert.equal(ipBlocked.scope, "ip");
});

test("the daily auth cap alerts once", () => {
  resetAuthRateLimits();
  const now = Date.parse("2026-10-17T08:00:00Z");
  assert.equal(consumeAuthDaily(now, 2).ok, true);
  assert.equal(consumeAuthDaily(now, 2).ok, true);
  const capped = consumeAuthDaily(now, 2);
  assert.equal(capped.ok, false);
  if (!capped.ok) assert.match(capped.alert || "", /AUTH_EMAIL_DAILY_CAP 2/);
  const again = consumeAuthDaily(now, 2);
  assert.equal(again.ok, false);
  if (!again.ok) assert.equal(again.alert, undefined);
});
