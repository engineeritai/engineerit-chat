import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { workingsMatchQuantities } from "../lib/takeoff/calculate";
import { prepareTakeoff } from "../lib/takeoff/pipeline";

const truth = JSON.parse(readFileSync("eval/takeoff/drawings/truth.json", "utf8")) as Record<
  string,
  Record<string, number>
>;

const MAIN: Record<string, string[]> = {
  S101: [
    "excavation_m3",
    "blinding_m3",
    "footing_concrete_m3",
    "column_concrete_m3",
    "slab_concrete_m3",
    "footing_side_formwork_m2",
    "column_formwork_m2",
    "slab_soffit_formwork_m2",
    "slab_edge_formwork_m2",
    "footing_T16_kg",
    "slab_T12_kg",
    "total_concrete_C30_m3",
    "total_rebar_kg",
  ],
  S102: [
    "excavation_m3",
    "blinding_m3",
    "strip_concrete_m3",
    "strip_side_formwork_m2",
    "longitudinal_T12_kg",
    "transverse_T10_kg",
    "total_concrete_C25_m3",
    "total_rebar_kg",
  ],
  A101: ["wall_net_m2", "blockwork_m3", "plaster_m2", "floor_tiles_m2", "screed_m3", "skirting_m"],
};

const RUNS = 3;
const TOLERANCE = 0.05;

function within(actual: number, expected: number) {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / Math.abs(expected) <= TOLERANCE;
}

async function measure(filename: string) {
  const result = await prepareTakeoff({
    filename,
    buffer: readFileSync(`eval/takeoff/drawings/${filename}`),
    locale: "en",
  });
  assert.equal(workingsMatchQuantities(result.lines), true, filename);
  assert.equal(result.confidence, "high", `${filename} confidence`);
  const qty = Object.fromEntries(result.lines.map((line) => [line.code, line.quantity]));
  return { result, qty };
}

for (const drawing of ["S101", "S102", "A101"] as const) {
  for (const ext of ["pdf", "png"] as const) {
    test(`${drawing} ${ext} stays within 5% over ${RUNS} runs`, async () => {
      const filename = `${drawing}.${ext}`;
      const runs = [];
      for (let i = 0; i < RUNS; i++) runs.push(await measure(filename));
      const expected = truth[drawing];
      for (const code of MAIN[drawing]) {
        for (const run of runs) {
          const actual = run.qty[code];
          assert.ok(actual != null, `${filename} missing ${code}`);
          assert.ok(
            within(actual, expected[code]),
            `${filename} ${code}: got ${actual}, expected ${expected[code]}`
          );
        }
        assert.equal(runs[0].qty[code], runs[1].qty[code]);
        assert.equal(runs[1].qty[code], runs[2].qty[code]);
      }
      assert.equal(runs[0].result.source, ext === "pdf" ? "pdf-text" : "ocr");
    });
  }
}

test("the original S-101 PDF from the trial matches the hand quantities", async () => {
  const { qty } = await measure("S101-source.pdf");
  for (const code of MAIN.S101) {
    assert.equal(qty[code], truth.S101[code], code);
  }
});
