import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { formatUsdApprox } from "../lib/pricingDisplay";
import { statusPillClass, usdApproxLine } from "../lib/invoiceTable";

describe("invoice history layout", () => {
  it("paints active green and expired grey, and keeps other statuses neutral", () => {
    assert.equal(statusPillClass("active"), "status-pill is-active");
    assert.equal(statusPillClass("Expired"), "status-pill is-expired");
    assert.equal(statusPillClass("pending"), "status-pill");
    assert.equal(statusPillClass(null), "status-pill");
  });

  it("puts the English dollar estimate on its own muted line", () => {
    assert.equal(usdApproxLine(formatUsdApprox(19)), "≈ USD 5.07");
    const page = readFileSync("app/profile/page.tsx", "utf8");
    assert.match(page, /usdApproxLine\(formatUsdApprox\(price\)\)/);
    assert.doesNotMatch(page, /minmax\(0, 0\.8fr\)/);
    assert.match(page, /className="profile-table stack-phone"/);
    const css = readFileSync("app/design.css", "utf8");
    assert.match(css, /\.status-pill\.is-active/);
    assert.match(css, /\.status-pill\.is-expired/);
    assert.match(css, /max-width: 480px/);
  });
});
