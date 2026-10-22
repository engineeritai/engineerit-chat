import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import fontkit from "@pdf-lib/fontkit";
import { directionalRuns, visualTokens } from "./arabicShape";

test("arabic title tokens stay logical and read from the right", () => {
  assert.deepEqual(visualTokens("تركيب مضخة التغذية"), ["التغذية", " ", "مضخة", " ", "تركيب"]);
  assert.deepEqual(visualTokens("40 بار"), ["بار", " ", "40"]);
  assert.deepEqual(visualTokens("لا 12"), ["12", " ", "لا"]);
  assert.deepEqual(visualTokens("Pump P-101"), ["Pump", " ", "P-101"]);
  assert.deepEqual(visualTokens("تقرير · بإعداد engineer it"), ["engineer", " ", "it", " ", "بإعداد", " ", "·", " ", "تقرير"]);
  assert.deepEqual(directionalRuns("تقرير · بإعداد engineer it"), [
    { text: "تقرير · بإعداد ", rtl: true },
    { text: "engineer it", rtl: false },
  ]);
  assert.deepEqual(directionalRuns("Report · Engineered with engineer it"), [
    { text: "Report · Engineered with engineer it", rtl: false },
  ]);
});

test("Noto Sans Arabic shapes the logical title with joining forms", () => {
  const font = fontkit.create(readFileSync("assets/fonts/NotoSansArabic-Regular.ttf")) as {
    layout: (text: string) => { glyphs: { name?: string }[] };
  };
  const names = font.layout("تركيب مضخة التغذية").glyphs.map((glyph) => glyph.name);
  assert.equal(names[0], "uniFE94");
  assert.equal(names.at(-1), "uniFE97");
  assert.equal(names.includes("uni062A"), false);
  assert.ok(names.includes("uniFEFB") === false);
  const word = font.layout("تركيب").glyphs.map((glyph) => glyph.name);
  assert.deepEqual(word, ["uniFE90", "uniFEF4", "uniFEDB", "uniFEAE", "uniFE97"]);
});
