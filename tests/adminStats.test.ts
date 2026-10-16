import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countByPlan, foldSignups, riyadhWindows, sumSar } from "../lib/adminStats";
import { cleanUtm } from "../lib/attribution";

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
  it("keeps a LinkedIn source and drops markup", () => {
    assert.equal(cleanUtm("  linkedin  "), "linkedin");
    assert.equal(cleanUtm("launch-post"), "launch-post");
    assert.equal(cleanUtm("<script>"), "script");
    assert.equal(cleanUtm(""), "");
  });
});
