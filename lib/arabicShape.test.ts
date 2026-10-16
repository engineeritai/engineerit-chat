import assert from "node:assert/strict";
import test from "node:test";
import { visualLine } from "./arabicShape";

test("arabic words are shaped and placed right to left", () => {
  const visual = visualLine("مرحبا");
  assert.equal(visual.includes("مرحبا"), false);
  assert.equal([...visual].length > 0, true);
  assert.equal(visual[0], "\uFE8E");
});

test("lam alef becomes a ligature and digits stay in order", () => {
  const visual = visualLine("لا 12");
  assert.equal(visual.includes("12"), true);
  assert.equal(visual.includes("\uFEFB") || visual.includes("\uFEFC"), true);
  assert.equal(visual.startsWith("12"), true);
});

test("latin lines are unchanged", () => {
  assert.equal(visualLine("Pump P-101"), "Pump P-101");
});
