import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminEmail } from "../lib/admin";
import { pickEffectivePlan, teamGrantsAccess } from "../lib/effectivePlan";
import {
  ENTERPRISE_FROM_SAR,
  EXTRA_SEAT_SAR,
  PLAN_AMOUNTS_SAR,
  featureTier,
  quoteSelfServe,
} from "../lib/plans";
import { safeNextPath } from "../lib/safeNext";

describe("self-serve prices", () => {
  it("keeps individual monthly prices and bills annual at 10×", () => {
    for (const plan of ["engineer", "professional", "consultant", "team"] as const) {
      const month = quoteSelfServe(plan, "month");
      const year = quoteSelfServe(plan, "year");
      assert.equal(month.amountSar, PLAN_AMOUNTS_SAR[plan].month);
      assert.equal(year.amountSar, PLAN_AMOUNTS_SAR[plan].year);
      assert.equal(year.amountSar, month.amountSar * 10);
      assert.equal(month.amountHalalas, month.amountSar * 100);
    }
  });

  it("prices the Team plan at SAR 349 / 3,490 with 5 seats and SAR 69 extra seats", () => {
    const month = quoteSelfServe("team", "month", 0);
    const year = quoteSelfServe("team", "year", 2);
    assert.equal(month.amountSar, 349);
    assert.equal(month.seatLimit, 5);
    assert.equal(year.amountSar, 3490 + 2 * 690);
    assert.equal(year.seatLimit, 7);
    assert.equal(EXTRA_SEAT_SAR.year, EXTRA_SEAT_SAR.month * 10);
    assert.equal(quoteSelfServe("engineer", "month", 4).extraSeats, 0);
  });

  it("lists Enterprise from SAR 2,500 / month, 10× annually", () => {
    assert.equal(ENTERPRISE_FROM_SAR.month, 2500);
    assert.equal(ENTERPRISE_FROM_SAR.year, 25000);
  });
});

describe("team access", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it("gives Consultant features to an active team and enterprise seat", () => {
    assert.equal(featureTier("team"), "consultant");
    assert.equal(featureTier("enterprise"), "consultant");
    assert.equal(featureTier("engineer"), "engineer");
    assert.equal(
      pickEffectivePlan("assistant", [{ plan: "team", status: "active", current_period_end: future }]),
      "team"
    );
    assert.equal(
      pickEffectivePlan("professional", [
        { plan: "enterprise", status: "active", current_period_end: future },
      ]),
      "enterprise"
    );
  });

  it("drops the whole team when the subscription lapses and keeps a personal plan", () => {
    assert.equal(teamGrantsAccess({ plan: "team", status: "active", current_period_end: past }), false);
    assert.equal(
      pickEffectivePlan("professional", [{ plan: "team", status: "active", current_period_end: past }]),
      "professional"
    );
    assert.equal(
      pickEffectivePlan("team", [{ plan: "team", status: "active", current_period_end: past }]),
      "assistant"
    );
    assert.equal(
      pickEffectivePlan("consultant", [{ plan: "team", status: "canceled", current_period_end: future }]),
      "consultant"
    );
  });
});

describe("admin and redirects", () => {
  it("matches admin emails only from the configured list", () => {
    assert.equal(isAdminEmail("a@example.com", ""), false);
    assert.equal(isAdminEmail("A@Example.com", "a@example.com, other@example.com"), true);
    assert.equal(isAdminEmail("nope@example.com", "a@example.com"), false);
  });

  it("rejects off-site return paths", () => {
    assert.equal(safeNextPath("/team/join?token=abc"), "/team/join?token=abc");
    assert.equal(safeNextPath("https://evil.example"), "/profile");
    assert.equal(safeNextPath("//evil.example"), "/profile");
  });
});
