/**
 * Live take-off evaluation. No model call unless --model and OPENAI_API_KEY are set.
 * The default path reads PDF text and OCRs PNG drawings, then measures in code.
 *
 *   npm run eval:takeoff
 *   npm run eval:takeoff -- --runs 3 --model
 */
import { readFileSync, writeFileSync } from "node:fs";
import { prepareTakeoff, type TakeoffCompletion } from "../lib/takeoff/pipeline";

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
  S201: [
    "slab_on_grade_m3",
    "strip_concrete_m3",
    "wall_concrete_m3",
    "longitudinal_#5_kg",
    "total_concrete_4000PSI_m3",
    "total_rebar_kg",
  ],
};

/** Quantity column from the 26 Oct 2026 live run, before this change. */
const BEFORE: Record<string, { image: Record<string, number>; pdf: Record<string, number> }> = {
  S101: {
    image: {
      excavation_m3: 13.5,
      blinding_m3: 1,
      footing_concrete_m3: 4,
      column_concrete_m3: 2.4,
      slab_concrete_m3: 12,
      footing_side_formwork_m2: 12.8,
      column_formwork_m2: 7.5,
      slab_soffit_formwork_m2: 48,
      footing_T16_kg: 23.16,
      slab_T12_kg: 54.72,
      total_concrete_C30_m3: 18.4,
      total_rebar_kg: 77.88,
    },
    pdf: {
      excavation_m3: 11.88,
      blinding_m3: 0.42,
      footing_concrete_m3: 6.96,
      column_concrete_m3: 2.88,
      slab_concrete_m3: 9.6,
      footing_side_formwork_m2: 20.88,
      column_formwork_m2: 9.6,
      slab_soffit_formwork_m2: 48,
      slab_edge_formwork_m2: 28,
      footing_T16_kg: 75.04,
      slab_T12_kg: 56.6,
    },
  },
};

function pct(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : Infinity;
  return (Math.abs(actual - expected) / Math.abs(expected)) * 100;
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

async function main() {
  const runs = Number(arg("--runs", "3"));
  const useModel = process.argv.includes("--model");
  let complete: TakeoffCompletion | undefined;
  if (useModel) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set. Refusing to call the model.");
      process.exit(1);
    }
    const loaded = await import("../lib/takeoff/openaiExtract");
    complete = loaded.completeTakeoffExtraction;
  }

  const drawings = ["S101", "S102", "A101", "S201"];
  const files = [
    ...drawings.flatMap((id) => [`${id}.pdf`, `${id}.png`]),
    "S101-source.pdf",
  ];
  const report: {
    file: string;
    source: string;
    runs: number;
    maxErrorPct: number;
    stable: boolean;
    rows: { code: string; expected: number; actual: number; errorPct: number }[];
  }[] = [];

  console.log(`Take-off eval, ${runs} run(s)${useModel ? ", model fallback enabled" : ", no model call"}`);
  console.log("");
  console.log("Before (26 Oct 2026 live site, S-101 quantity column vs hand measure)");
  console.log("| Input | Item | Live qty | True | Error |");
  console.log("| --- | --- | ---: | ---: | ---: |");
  for (const input of ["image", "pdf"] as const) {
    for (const [code, actual] of Object.entries(BEFORE.S101[input])) {
      const expected = truth.S101[code];
      if (expected == null) continue;
      console.log(`| ${input} | ${code} | ${actual} | ${expected} | ${pct(actual, expected).toFixed(1)}% |`);
    }
  }
  console.log("");
  console.log("After");
  console.log("| File | Source | Item | Qty | True | Error | Stable across runs |");
  console.log("| --- | --- | --- | ---: | ---: | ---: | --- |");

  let failed = false;
  for (const file of files) {
    const id = file.startsWith("S101") ? "S101" : file.replace(/\.(pdf|png)$/i, "");
    const measures = [];
    for (let i = 0; i < runs; i++) {
      const result = await prepareTakeoff({
        filename: file,
        buffer: readFileSync(`eval/takeoff/drawings/${file}`),
        locale: i % 2 === 0 ? "en" : "ar",
        complete,
      });
      const qty = Object.fromEntries(result.lines.map((line) => [line.code, line.quantity]));
      const consistent = result.lines.every((line) => {
        const shown = line.working.match(/=\s*(-?\d+(?:\.\d+)?)\s*$/)?.[1];
        return shown != null && Math.abs(Number(shown) - line.quantity) < 0.0006;
      });
      if (!consistent) failed = true;
      measures.push({ result, qty, consistent });
    }
    const rows = [];
    let maxError = 0;
    let stable = true;
    for (const code of MAIN[id]) {
      const expected = truth[id][code];
      const actual = measures[0].qty[code];
      const error = actual == null ? Infinity : pct(actual, expected);
      maxError = Math.max(maxError, error);
      if (measures.some((run) => run.qty[code] !== actual)) stable = false;
      if (error > 5 || !stable || !measures.every((run) => run.consistent)) failed = true;
      rows.push({ code, expected, actual: actual ?? NaN, errorPct: Number(error.toFixed(3)) });
      console.log(
        `| ${file} | ${measures[0].result.source} | ${code} | ${actual ?? "missing"} | ${expected} | ${error.toFixed(2)}% | ${stable ? "yes" : "no"} |`
      );
    }
    report.push({
      file,
      source: measures[0].result.source,
      runs,
      maxErrorPct: Number(maxError.toFixed(3)),
      stable,
      rows,
    });
  }

  writeFileSync("eval/takeoff/results.json", JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2) + "\n");
  console.log("");
  console.log(failed ? "FAIL" : "PASS");
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
