import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countByPlan, foldConfirmedSignups, foldSignups, riyadhWindows, signupObservation, sumSar } from "../lib/adminStats";
import { cleanUtm } from "../lib/acquisition";

describe("owner stats windows", () => {
  it("starts the Arabia day at 21:00 UTC the previous evening", () => {
    const evening = riyadhWindows(new Date("2026-10-16T20:30:00.000Z"));
    assert.equal(evening.todayStart.toISOString(), "2026-10-15T21:00:00.000Z");
    assert.equal(evening.weekStart.toISOString(), "2026-10-09T21:00:00.000Z");

    const afterMidnight = riyadhWindows(new Date("2026-10-16T22:30:00.000Z"));
    assert.equal(afterMidnight.todayStart.toISOString(), "2026-10-16T21:00:00.000Z");
    assert.equal(afterMidnight.weekStart.toISOString(), "2026-10-10T21:00:00.000Z");
  });

  it("counts signups in today and in the last 7 Arabia days", () => {
    const { todayStart, weekStart } = riyadhWindows(new Date("2026-10-16T22:30:00.000Z"));
    const folded = foldSignups(
      [
        "2026-10-16T22:00:00.000Z",
        "2026-10-16T18:00:00.000Z",
        "2026-10-10T21:00:00.000Z",
        "2026-10-10T20:59:00.000Z",
      ],
      todayStart.getTime(),
      weekStart.getTime()
    );
    assert.deepEqual(folded, { today: 1, days7: 3 });
  });

  it("groups plans and sums invoice amounts without inventing rows", () => {
    assert.deepEqual(countByPlan(["engineer", "team", "engineer", ""]), [
      { plan: "engineer", count: 2 },
      { plan: "team", count: 1 },
      { plan: "unknown", count: 1 },
    ]);
    assert.equal(sumSar([19, "41.5", null, "nope"]), 60.5);
  });
});

describe("campaign tags", () => {
  it("keeps a campaign token and drops markup", () => {
    assert.equal(cleanUtm("  linkedin  "), "linkedin");
    assert.equal(cleanUtm("launch-post"), "launch-post");
    assert.equal(cleanUtm("<script>"), "");
    assert.equal(cleanUtm("owner@example.com"), "");
    assert.equal(cleanUtm(""), "");
  });
});

describe("confirmed signup sources", () => {
  const todayMs = Date.parse("2026-11-06T21:00:00.000Z");
  const weekMs = Date.parse("2026-10-31T21:00:00.000Z");

  it("counts confirmed accounts by the stored label and leaves missing history unknown", () => {
    const linkedin = signupObservation({
      created_at: "2026-11-06T10:00:00.000Z",
      email_confirmed_at: "2026-11-06T10:05:00.000Z",
      email: "nora@example.com",
      user_metadata: { acq_source: "linkedin", acq_via: "utm", email: "nora@example.com" },
    });
    const unknown = signupObservation({
      created_at: "2026-11-05T10:00:00.000Z",
      email_confirmed_at: "2026-11-05T10:05:00.000Z",
      email: "omar@example.com",
      user_metadata: { acq_source: "unknown", acq_via: "none" },
    });
    const older = signupObservation({
      created_at: "2026-11-04T10:00:00.000Z",
      email_confirmed_at: "2026-11-04T10:05:00.000Z",
      email: "lina@example.com",
      user_metadata: { full_name: "Lina" },
    });
    const unconfirmed = signupObservation({
      created_at: "2026-11-06T12:00:00.000Z",
      email: "waiting@example.com",
      user_metadata: { acq_source: "email" },
    });
    const injected = signupObservation({
      created_at: "2026-11-06T12:00:00.000Z",
      email_confirmed_at: "2026-11-06T12:05:00.000Z",
      email: "safe@example.com",
      user_metadata: { acq_source: "<script>alert(1)</script>" },
    });
    const testAccount = signupObservation({
      created_at: "2026-11-06T12:00:00.000Z",
      email_confirmed_at: "2026-11-06T12:05:00.000Z",
      email: "eit-pw-1@example.com",
      user_metadata: { acq_source: "x" },
    });
    assert.ok(linkedin && unknown && older && unconfirmed && injected && testAccount);
    for (const row of [linkedin, unknown, older, unconfirmed, injected, testAccount]) {
      assert.equal(JSON.stringify(row).includes("@"), false);
      assert.equal(JSON.stringify(row).includes("script"), false);
    }
    assert.equal(linkedin.source, "linkedin");
    assert.equal(unknown.source, "unknown");
    assert.equal(older.source, "not_recorded");
    assert.equal(injected.source, "not_recorded");
    assert.equal(testAccount.test, true);

    const folded = foldConfirmedSignups(
      [linkedin, unknown, older, unconfirmed, injected, testAccount],
      todayMs,
      weekMs
    );
    assert.equal(folded.confirmed7, 4);
    assert.equal(folded.unconfirmed7, 1);
    assert.equal(folded.excludedTest, 1);
    assert.equal(folded.days7.linkedin, 1);
    assert.equal(folded.days7.x, 0);
    assert.equal(folded.days7.email, 0);
    assert.equal(folded.days7.unknown, 1);
    assert.equal(folded.days7.not_recorded, 2);
    assert.equal(folded.methods.utm, 1);
    assert.equal(folded.methods.referrer, 0);
    assert.equal(folded.methods.none, 1);
    assert.equal(folded.methods.not_recorded, 2);
    assert.equal(folded.visits, null);
    assert.equal(folded.conversion, null);
    assert.equal(JSON.stringify(folded).includes("@"), false);
  });
});
