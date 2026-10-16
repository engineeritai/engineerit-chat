import assert from "node:assert/strict";
import test from "node:test";
import {
  canExportChatHistory,
  canShareChatWithTeam,
  daysUntilExpiry,
  expiresAtFromCreated,
  isExpired,
  isNearingExpiry,
  normalizeSubscriptionTier,
  retentionDaysForTier,
} from "./historyRetention";

test("retention follows the plan ladder", () => {
  assert.equal(retentionDaysForTier("assistant"), 3);
  assert.equal(retentionDaysForTier("free"), 3);
  assert.equal(retentionDaysForTier(null), 3);
  assert.equal(retentionDaysForTier("engineer"), 30);
  assert.equal(retentionDaysForTier("pro"), 90);
  assert.equal(retentionDaysForTier("professional"), 90);
  assert.equal(retentionDaysForTier("consultant"), 365);
  assert.equal(retentionDaysForTier("pilot"), 365);
  assert.equal(retentionDaysForTier("team"), null);
  assert.equal(retentionDaysForTier("enterprise"), null);
});

test("expiry is measured from creation and unlimited plans do not expire", () => {
  const created = "2026-01-01T00:00:00.000Z";
  assert.equal(expiresAtFromCreated(created, "assistant"), "2026-01-04T00:00:00.000Z");
  assert.equal(expiresAtFromCreated(created, "engineer"), "2026-01-31T00:00:00.000Z");
  assert.equal(expiresAtFromCreated(created, "team"), null);
  assert.equal(isExpired("2026-01-04T00:00:00.000Z", new Date("2026-01-04T00:00:00.000Z")), true);
  assert.equal(isExpired(null), false);
});

test("nearing-expiry warning is the last slice of each window", () => {
  const created = "2026-01-01T00:00:00.000Z";
  const freeEnd = expiresAtFromCreated(created, "assistant")!;
  assert.equal(isNearingExpiry(freeEnd, "assistant", new Date("2026-01-02T00:00:00.000Z")), false);
  assert.equal(isNearingExpiry(freeEnd, "assistant", new Date("2026-01-03T12:00:00.000Z")), true);
  assert.equal(daysUntilExpiry(freeEnd, new Date("2026-01-03T12:00:00.000Z")), 1);

  const engineerEnd = expiresAtFromCreated(created, "engineer")!;
  assert.equal(isNearingExpiry(engineerEnd, "engineer", new Date("2026-01-20T00:00:00.000Z")), false);
  assert.equal(isNearingExpiry(engineerEnd, "engineer", new Date("2026-01-29T00:00:00.000Z")), true);
  assert.equal(isNearingExpiry(null, "team"), false);
});

test("export and team share follow plan gates", () => {
  assert.equal(canExportChatHistory("engineer"), false);
  assert.equal(canExportChatHistory("professional"), true);
  assert.equal(canExportChatHistory("consultant"), true);
  assert.equal(canExportChatHistory("team"), true);
  assert.equal(canShareChatWithTeam("professional"), false);
  assert.equal(canShareChatWithTeam("team"), true);
  assert.equal(canShareChatWithTeam("enterprise"), true);
  assert.equal(normalizeSubscriptionTier("Professional_Engineer"), "professional");
});
