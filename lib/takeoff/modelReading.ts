import { confidenceOf, parseDrawingText } from "@/lib/takeoff/parseText";
import type { Confidence, Reading } from "@/lib/takeoff/types";
import { emptyReading } from "@/lib/takeoff/types";

export const TAKEOFF_EXTRACTION_PROMPT = `You extract dimensions from an engineering drawing for a quantity surveyor.
Do not calculate volumes, areas, weights, bar totals, or counts of bars.
Return one JSON object only, with no markdown.

Rules:
- Transcribe schedule lines and notes into transcribed_lines, copied as printed. Keep the numbers you see. Do not simplify them.
- Member sizes are millimetres in *_mm fields. A size printed in metres (1.80 m) is converted to millimetres (1800). A size printed in feet and inches is converted with 304.8 mm per foot and 25.4 mm per inch: 2'-0" is 610 mm, 6" is 152 mm, 120'-0" is 36576 mm. Do not leave feet in a *_mm field.
- Bars printed as #5 stay "#5". Do not rename a US bar to a T bar. steel_kg_per_m may include "#5" only when a weight is printed. Do not invent 1.043.
- A concrete foundation wall has material "concrete". Do not call it blockwork and do not add plaster unless plaster is printed. A block wall keeps material "block".
- A slab on grade has on_grade true. Do not invent soffit formwork.
- A continuous footing schedule such as "CF24 2'-0" wide x 1'-0" thick (3) #5" is a strip. centreline_mm is only a length printed on the sheet, or null. Do not scale the plan to invent that length. If the notes print an out-to-out building size, copy that size into transcribed_lines and do not compute the centreline yourself.
- formation_below_ngl_m is only a level written in metres below NGL, such as 1.55 from "underside of blinding at -1.55 m below NGL". Never put the footing thickness in this field.
- working_space_each_side_mm is the working space beyond the footing, in millimetres.
- Counts are the printed numbers (4 no.), not a number you derive.
- If a value is not on the drawing, use null. Do not invent laps, hooks, wastage, or covers.
- steel_kg_per_m uses the printed unit masses only, keyed as "T12".

Shape:
{
  "title": "S-101",
  "transcribed_lines": ["F1 1800 x 1800 x 500 thk (4 no.) BOTTOM T16 @ 200 B.W."],
  "dimensions_in_mm": true,
  "cover_slab_mm": null,
  "cover_footing_mm": null,
  "laps": "none or not_stated",
  "hooks": "none or not_stated",
  "wastage_percent": null,
  "blinding": { "thickness_mm": null, "projection_each_side_mm": null, "grade": null },
  "formation_below_ngl_m": null,
  "working_space_each_side_mm": null,
  "vertical_sides": true,
  "steel_kg_per_m": {},
  "pads": [{ "mark": "F1", "length_mm": 1800, "width_mm": 1800, "thickness_mm": 500, "count": 4, "grade": "C30", "bottom_bar": "T16", "spacing_mm": 200, "both_ways": true }],
  "strips": [{ "mark": "SF1", "width_mm": 600, "thickness_mm": 400, "centreline_mm": 36000, "count": 1, "closed": true, "grade": "C25", "longitudinal_bar": "T12", "longitudinal_count": 3, "transverse_bar": "T10", "transverse_spacing_mm": 200 }],
  "columns": [{ "mark": "C1", "width_mm": 400, "depth_mm": 400, "height_mm": 3000, "count": 6, "rebar_by_others": true }],
  "slabs": [{ "mark": "S1", "length_mm": 8000, "width_mm": 6000, "thickness_mm": 200, "grade": "C30", "mesh_bar": "T12", "spacing_mm": 150, "both_ways": true, "top_nil": true, "on_grade": false, "wwf": false }],
  "walls": [{ "mark": "W1", "thickness_mm": 200, "height_mm": 3000, "centreline_mm": 18800, "count": 1, "plaster_sides": 2, "material": "block", "grade": null }],
  "openings": [{ "mark": "D1", "width_mm": 900, "height_mm": 2100, "count": 1, "deduct_wall": true, "deduct_plaster": true }],
  "floors": [{ "length_mm": 5000, "width_mm": 4000, "tiles": true, "screed_mm": 50, "skirting_deduct_mm": 900 }]
}
Omit empty arrays. Include only elements that are drawn.`;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function mm(row: Record<string, unknown>, key: string): number | null {
  const named = asNumber(row[`${key}_mm`]);
  if (named != null) return Math.round(named);
  const plain = asNumber(row[key]);
  if (plain == null) return null;
  return plain > 20 ? Math.round(plain) : Math.round(plain * 1000);
}

function metres(value: unknown): number | null {
  const n = asNumber(value);
  if (n == null) return null;
  return n > 20 ? n / 1000 : n;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readingFromFields(obj: Record<string, unknown>): Reading {
  const reading = emptyReading();
  reading.title = text(obj.title) || "";
  reading.dimensionsInMm = obj.dimensions_in_mm !== false;
  if (obj.unit === "ft") {
    reading.unitSystem = "ft";
    reading.dimensionsInMm = false;
  }
  reading.coverSlabMm = asNumber(obj.cover_slab_mm);
  reading.coverFootingMm = asNumber(obj.cover_footing_mm);
  reading.laps = obj.laps === "none" ? "none" : "not_stated";
  reading.hooks = obj.hooks === "none" ? "none" : "not_stated";
  const wastage = asNumber(obj.wastage_percent);
  reading.wastagePercent = wastage;
  const blinding = obj.blinding && typeof obj.blinding === "object" ? (obj.blinding as Record<string, unknown>) : null;
  if (blinding) {
    const thickness = asNumber(blinding.thickness_mm);
    const projection = asNumber(blinding.projection_each_side_mm);
    if (thickness != null && projection != null) {
      reading.blinding = {
        thicknessMm: Math.round(thickness),
        projectionMm: Math.round(projection),
        grade: (text(blinding.grade) || "C15").toUpperCase(),
      };
      reading.mentionedBlinding = true;
    }
  }
  reading.formationBelowNglM = metres(obj.formation_below_ngl_m);
  reading.workingSpaceMm = asNumber(obj.working_space_each_side_mm);
  reading.verticalSides = obj.vertical_sides !== false;
  reading.mentionedExcavation = reading.formationBelowNglM != null || reading.workingSpaceMm != null;
  const steel = obj.steel_kg_per_m && typeof obj.steel_kg_per_m === "object" ? (obj.steel_kg_per_m as Record<string, unknown>) : {};
  for (const [bar, kg] of Object.entries(steel)) {
    const mass = asNumber(kg);
    if (mass != null) reading.steelKgPerM[bar.toUpperCase()] = mass;
  }

  for (const row of rows(obj.pads)) {
    const length = mm(row, "length");
    const width = mm(row, "width");
    const thickness = mm(row, "thickness");
    const count = asNumber(row.count);
    if (length == null || width == null || thickness == null || count == null) continue;
    reading.pads.push({
      mark: (text(row.mark) || "F").toUpperCase(),
      lengthMm: length,
      widthMm: width,
      thicknessMm: thickness,
      count,
      grade: text(row.grade)?.toUpperCase().replace(/\s+/g, "") || null,
      bottomBar: text(row.bottom_bar)?.toUpperCase() || null,
      spacingMm: mm(row, "spacing"),
      bothWays: row.both_ways !== false,
    });
  }

  for (const row of rows(obj.strips)) {
    const width = mm(row, "width");
    const thickness = mm(row, "thickness");
    const length = mm(row, "centreline") ?? mm(row, "length");
    const count = asNumber(row.count);
    if (width == null || thickness == null || length == null || count == null) continue;
    reading.strips.push({
      mark: (text(row.mark) || "SF").toUpperCase(),
      widthMm: width,
      thicknessMm: thickness,
      lengthMm: length,
      count,
      closed: row.closed !== false,
      grade: text(row.grade)?.toUpperCase().replace(/\s+/g, "") || null,
      longitudinalBar: text(row.longitudinal_bar)?.toUpperCase() || null,
      longitudinalCount: asNumber(row.longitudinal_count),
      transverseBar: text(row.transverse_bar)?.toUpperCase() || null,
      transverseSpacingMm: mm(row, "transverse_spacing"),
    });
  }

  for (const row of rows(obj.columns)) {
    const width = mm(row, "width");
    const depth = mm(row, "depth");
    const height = mm(row, "height");
    const count = asNumber(row.count);
    if (width == null || depth == null || height == null || count == null) continue;
    const byOthers = row.rebar_by_others === true;
    reading.columns.push({
      mark: (text(row.mark) || "C").toUpperCase(),
      widthMm: width,
      depthMm: depth,
      heightMm: height,
      count,
      grade: text(row.grade)?.toUpperCase().replace(/\s+/g, "") || null,
      rebarByOthers: byOthers,
    });
    if (byOthers) reading.columnRebarByOthers = true;
  }

  for (const row of rows(obj.slabs)) {
    const length = mm(row, "length");
    const width = mm(row, "width");
    const thickness = mm(row, "thickness");
    if (length == null || width == null || thickness == null) continue;
    const topNil = row.top_nil !== false;
    reading.slabs.push({
      mark: (text(row.mark) || "S").toUpperCase(),
      lengthMm: length,
      widthMm: width,
      thicknessMm: thickness,
      grade: text(row.grade)?.toUpperCase().replace(/\s+/g, "") || null,
      meshBar: text(row.mesh_bar)?.toUpperCase() || null,
      spacingMm: mm(row, "spacing"),
      bothWays: row.both_ways !== false,
      topNil,
      onGrade: row.on_grade === true,
      wwf: row.wwf === true,
    });
    if (topNil) reading.slabTopNil = true;
  }

  for (const row of rows(obj.walls)) {
    const thickness = mm(row, "thickness");
    const height = mm(row, "height");
    const centreline = mm(row, "centreline");
    const count = asNumber(row.count);
    if (thickness == null || height == null || centreline == null || count == null) continue;
    const material = text(row.material)?.toLowerCase() === "concrete" ? "concrete" : "block";
    reading.walls.push({
      mark: (text(row.mark) || "W").toUpperCase(),
      thicknessMm: thickness,
      heightMm: height,
      centrelineMm: centreline,
      count,
      plasterSides: asNumber(row.plaster_sides) ?? 0,
      material,
      grade: text(row.grade)?.toUpperCase().replace(/\s+/g, "") || null,
    });
  }

  for (const row of rows(obj.openings)) {
    const width = mm(row, "width");
    const height = mm(row, "height");
    const count = asNumber(row.count);
    if (width == null || height == null || count == null) continue;
    reading.openings.push({
      mark: (text(row.mark) || "O").toUpperCase(),
      widthMm: width,
      heightMm: height,
      count,
      deductWall: row.deduct_wall !== false,
      deductPlaster: row.deduct_plaster !== false,
    });
  }

  for (const row of rows(obj.floors)) {
    const length = mm(row, "length");
    const width = mm(row, "width");
    if (length == null || width == null) continue;
    reading.floors.push({
      lengthMm: length,
      widthMm: width,
      tiles: row.tiles !== false,
      screedMm: asNumber(row.screed_mm),
      skirtingDeductMm: asNumber(row.skirting_deduct_mm),
    });
  }

  return reading;
}

export function readingFromModelJson(value: unknown): { reading: Reading; confidence: Confidence } {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const transcribed = Array.isArray(obj.transcribed_lines)
    ? obj.transcribed_lines.filter((line): line is string => typeof line === "string").join("\n")
    : "";
  const fromText = parseDrawingText(transcribed);
  if (fromText.confidence === "high") return fromText;
  const fromFields = readingFromFields(obj);
  if (confidenceOf(fromFields) !== "none") return { reading: fromFields, confidence: confidenceOf(fromFields) };
  return fromText.confidence === "none" ? { reading: fromFields, confidence: "none" } : fromText;
}
