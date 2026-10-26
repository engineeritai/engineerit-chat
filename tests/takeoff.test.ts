import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateTakeoff, workingsMatchQuantities } from "../lib/takeoff/calculate";
import { isTakeoffRequest } from "../lib/takeoff/detect";
import { extractJsonObject } from "../lib/takeoff/json";
import { readingFromModelJson } from "../lib/takeoff/modelReading";
import { parseDrawingText } from "../lib/takeoff/parseText";
import { renderTakeoff } from "../lib/takeoff/render";

const S101 = `
FOOTING SCHEDULE (isolated pad, C30)
F1 1800 x 1800 x 500 thk (4 no.) BOTTOM T16 @ 200 B.W.
F2 2200 x 2200 x 600 thk (2 no.) BOTTOM T16 @ 200 B.W.
COLUMN C1 400 x 400, 6 no., height 3000 (top of footing to soffit of slab), rebar by others
SLAB S1
200 mm THK RC SLAB (C30)
BOTTOM: T12 @ 150 B.W.
TOP: NIL (single mesh)
NOTES
1. All dimensions in mm. Slab edge flush with grid lines (slab 8000 x 6000).
2. Covers: slab 25 mm, footings 75 mm. Straight bars, no laps or hooks.
3.50 mm C15 blinding under footings, projecting 100 mm each side.
4. Underside of blinding at -1.55 m below NGL. Excavation with vertical sides,
300 mm working space each side beyond footing.
5. Steel unit mass: T12 = 0.888 kg/m, T16 = 1.578 kg/m.
`;

const S101_TRUTH: Record<string, number> = {
  slab_concrete_m3: 9.6,
  slab_soffit_formwork_m2: 48,
  slab_edge_formwork_m2: 5.6,
  column_concrete_m3: 2.88,
  column_formwork_m2: 28.8,
  footing_concrete_m3: 12.288,
  footing_side_formwork_m2: 24.96,
  blinding_m3: 1.376,
  excavation_m3: 60.016,
  slab_T12_kg: 567.698,
  footing_T16_kg: 329.802,
  total_concrete_C30_m3: 24.768,
  total_rebar_kg: 897.5,
};

function quantities(lines: { code: string; quantity: number }[]) {
  return Object.fromEntries(lines.map((line) => [line.code, line.quantity]));
}

function assertQty(actual: Record<string, number>, expected: Record<string, number>) {
  for (const [code, want] of Object.entries(expected)) {
    assert.equal(actual[code], want, code);
  }
}

test("a take-off request is recognised in English and Arabic", () => {
  assert.equal(isTakeoffRequest("Prepare a first-pass quantity take-off and BOQ from this drawing only."), true);
  assert.equal(isTakeoffRequest("Propose a structured bill of quantities with items and units."), true);
  assert.equal(isTakeoffRequest("اقترح جدول كميات منظما بالبنود والوحدات."), true);
  assert.equal(isTakeoffRequest("اعمل حصر كميات لهذه اللوحة"), true);
  assert.equal(isTakeoffRequest("Describe this engineering image in detail."), false);
  assert.equal(isTakeoffRequest("Summarize this engineering document."), false);
});

test("S-101 text is measured exactly, including a glued OCR note number", () => {
  const parsed = parseDrawingText(S101);
  assert.equal(parsed.confidence, "high");
  const lines = calculateTakeoff(parsed.reading);
  assert.equal(workingsMatchQuantities(lines), true);
  assertQty(quantities(lines), S101_TRUTH);
  const excavation = lines.find((line) => line.code === "excavation_m3");
  assert.match(excavation?.working || "", /1\.55/);
  assert.doesNotMatch(excavation?.expression || "", /0\.5|0\.6/);
});

test("excavation uses the formation level, not the footing thickness", () => {
  const parsed = parseDrawingText(S101);
  parsed.reading.formationBelowNglM = 0.5;
  const lines = calculateTakeoff(parsed.reading);
  const excavation = lines.find((line) => line.code === "excavation_m3")?.quantity;
  assert.ok(excavation != null);
  assert.ok(Math.abs(excavation - 60.016) / 60.016 > 0.05);
});

test("the quantity column is the working, in English and Arabic", () => {
  const parsed = parseDrawingText(S101);
  const lines = calculateTakeoff(parsed.reading);
  for (const locale of ["en", "ar"] as const) {
    const reply = renderTakeoff(locale, parsed.reading, lines, "ocr");
    assert.doesNotMatch(reply, /[\u064B-\u0652]/);
    const rows = reply.split("\n").filter((line) => /^\| \d+ \|/.test(line));
    assert.equal(rows.length, lines.length);
    for (const row of rows) {
      const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
      const quantity = cells[3];
      const working = cells[4];
      assert.match(working, new RegExp(`= ${quantity.replace(".", "\\.")}$`));
    }
  }
  const english = renderTakeoff("en", parsed.reading, lines, "pdf-text");
  assert.match(english, /Footing thickness was not used as the depth/);
  assert.match(english, /Lap length added: 0/);
  assert.match(english, /Wastage applied: 0%/);
  assert.match(english, /Column reinforcement is marked rebar by others/);
  const arabic = renderTakeoff("ar", parsed.reading, lines, "pdf-text");
  assert.match(arabic, /عمق الحفر 1\.55 م/);
  assert.match(arabic, /لم يستخدم سمك القاعدة كعمق للحفر/);
  assert.match(arabic, /الهالك المضاف = 0%/);
  assert.match(arabic, /الطول المضاف للوصل = 0/);
});

test("a wrong model quantity cannot override a transcribed schedule", () => {
  const model = {
    transcribed_lines: S101.trim().split("\n"),
    pads: [{ mark: "F1", length_mm: 999, width_mm: 999, thickness_mm: 999, count: 4, grade: "C30" }],
    formation_below_ngl_m: 0.5,
  };
  const read = readingFromModelJson(model);
  assert.equal(read.confidence, "high");
  const lines = calculateTakeoff(read.reading);
  assertQty(quantities(lines), S101_TRUTH);
});

test("structured model dimensions are measured in code", () => {
  const raw = JSON.stringify({
    title: "S-101",
    cover_slab_mm: 25,
    cover_footing_mm: 75,
    laps: "none",
    hooks: "none",
    blinding: { thickness_mm: 50, projection_each_side_mm: 100, grade: "C15" },
    formation_below_ngl_m: 1.55,
    working_space_each_side_mm: 300,
    vertical_sides: true,
    steel_kg_per_m: { T12: 0.888, T16: 1.578 },
    pads: [
      { mark: "F1", length_mm: 1800, width_mm: 1800, thickness_mm: 500, count: 4, grade: "C30", bottom_bar: "T16", spacing_mm: 200, both_ways: true },
      { mark: "F2", length_mm: 2200, width_mm: 2200, thickness_mm: 600, count: 2, grade: "C30", bottom_bar: "T16", spacing_mm: 200, both_ways: true },
    ],
    columns: [{ mark: "C1", width_mm: 400, depth_mm: 400, height_mm: 3000, count: 6, rebar_by_others: true }],
    slabs: [{ mark: "S1", length_mm: 8000, width_mm: 6000, thickness_mm: 200, grade: "C30", mesh_bar: "T12", spacing_mm: 150, both_ways: true, top_nil: true }],
  });
  const read = readingFromModelJson(extractJsonObject(`Here is the read:\n${raw}`));
  assert.equal(read.confidence, "high");
  assertQty(quantities(calculateTakeoff(read.reading)), S101_TRUTH);
});

const S201_HAND: Record<string, number> = {
  slab_on_grade_m3: 64.965,
  slab_wwf_m2: 426.28,
  strip_concrete_m3: 17.972,
  wall_concrete_m3: 29.227,
  "longitudinal_#5_kg": 450.388,
  total_concrete_4000PSI_m3: 112.164,
  total_rebar_kg: 450.388,
};

const S201_WORDS = `
CONTINUOUS FOOTING SCHEDULE (4000 PSI)
CF24 2 ft 0 in wide x 1 ft 0 in thick centreline 317 ft 4 in closed (1 no.) LONG (3) #5
WALL FW1 concrete 8 in thk, height 5 ft 8 in, centreline 129 ft 10 in (1 no.)
WALL FW1 concrete 8 in thk, height 4 ft 4 in, centreline 187 ft 6 in (1 no.)
6 in THK CONCRETE SLAB-ON-GRADE inside 118 ft 8 in x 38 ft 8 in (4000 PSI)
REINFORCE SLAB WITH 6x6 W2.1xW2.1 WWF CTRD IN THE SLAB
NOTES
1. All dimensions in feet and inches.
2. No laps or hooks. No wastage is shown on this drawing.
3. Steel unit mass: #5 = 1.043 lb/ft.
4. Out-to-out building 120 ft 0 in x 40 ft 0 in with 8 in walls.
`;

test("an imperial foundation plan matches the hand measure", () => {
  const parsed = parseDrawingText(S201_WORDS);
  assert.equal(parsed.confidence, "high");
  assert.equal(parsed.reading.unitSystem, "ft");
  assert.equal(parsed.reading.walls.every((wall) => wall.material === "concrete"), true);
  const lines = calculateTakeoff(parsed.reading);
  assert.equal(workingsMatchQuantities(lines), true);
  const qty = quantities(lines);
  assertQty(qty, S201_HAND);
  assert.equal(qty.blockwork_m3, undefined);
  assert.equal(qty.slab_soffit_formwork_m2, undefined);
  const reply = renderTakeoff("en", parsed.reading, lines, "pdf-text");
  assert.match(reply, /304\.8 mm per foot/);
  assert.match(reply, /not measured as blockwork/);
  assert.match(reply, /Lap length added: 0/);
  const arabic = renderTakeoff("ar", parsed.reading, lines, "pdf-text");
  assert.equal(/[\u064B-\u0652]/.test(arabic), false);
});

test("feet-and-inch symbols and a standard #5 mass measure the same foundation", () => {
  const parsed = parseDrawingText(`
CONTINUOUS FOOTING SCHEDULE (4000 PSI)
CF24 2'-0" wide x 1'-0" thick perimeter closed (1 no.) LONG (3) #5
WALL FW1 concrete 8" thk, height 5'-8", centreline 129'-10" (1 no.)
WALL FW1 concrete 8" thk, height 4'-4", centreline 187'-6" (1 no.)
6" THK CONCRETE SLAB-ON-GRADE inside 118'-8" x 38'-8"
REINFORCE SLAB WITH 6x6 W2.1xW2.1 WWF
NOTES
All dimensions in feet and inches.
Out-to-out 120'-0" x 40'-0".
No laps or hooks. No wastage is shown on this drawing.
`);
  assert.equal(parsed.confidence, "high");
  assert.equal(parsed.reading.strips[0]?.lengthMm, (317 * 12 + 4) * 25.4);
  assertQty(quantities(calculateTakeoff(parsed.reading)), S201_HAND);
  const reply = renderTakeoff("en", parsed.reading, calculateTakeoff(parsed.reading), "pdf-text");
  assert.match(reply, /#5 = 1\.043 lb\/ft/);
});

test("a printed footing-schedule row is measured once the centreline is known", () => {
  const parsed = parseDrawingText(`
CONTINUOUS FOOTING SCHEDULE (4000 PSI)
MARK WIDTH THICKNESS REINFORCING
CF24 2'-0" 1'-0" (3) #5
WALL FW1 concrete 8" thk, height 5'-8", centreline 129'-10" (1 no.)
WALL FW1 concrete 8" thk, height 4'-4", centreline 187'-6" (1 no.)
6" THK CONCRETE SLAB-ON-GRADE inside 118'-8" x 38'-8"
REINFORCE SLAB WITH 6x6 W2.1xW2.1 WWF
NOTES
All dimensions in feet and inches.
Out-to-out 120'-0" x 40'-0".
No laps or hooks. No wastage is shown on this drawing.
`);
  assert.equal(parsed.confidence, "high");
  assertQty(quantities(calculateTakeoff(parsed.reading)), S201_HAND);
});

test("the chat route does not trust a user id in the body", () => {
  const chat = readFileSync("app/api/chat/route.ts", "utf8");
  assert.match(chat, /subjectFromSession/);
  assert.doesNotMatch(chat, /userId && userId !== "guest"/);
  const image = readFileSync("app/api/image/route.ts", "utf8");
  const document = readFileSync("app/api/document/route.ts", "utf8");
  const signed = readFileSync("app/api/uploads/signed/route.ts", "utf8");
  for (const source of [image, document, signed]) {
    assert.match(source, /assertFileAnalysisAccess/);
  }
  assert.match(image, /prepareTakeoff/);
  assert.match(document, /prepareTakeoff/);
  assert.match(readFileSync("app/chat/page.tsx", "utf8"), /attachmentHeaders/);
});
