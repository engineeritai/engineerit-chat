import { kgPerMFromLbPerFt, STANDARD_KG_PER_M } from "@/lib/takeoff/numbers";
import type { Confidence, Reading } from "@/lib/takeoff/types";
import { emptyReading } from "@/lib/takeoff/types";

/**
 * OCR sometimes glues a note number to the following thickness: "3.50 mm"
 * was "3. 50 mm". Only split that when the millimetre part is a whole
 * construction size, so a real "1.55 m" level is left alone.
 */
const PLAUSIBLE_MM = new Set([10, 15, 20, 25, 40, 50, 75, 100, 150, 200, 250, 300]);

export function normalizeDrawingText(raw: string): string {
  const spaced = raw
    .replace(/\u00a0/g, " ")
    .replace(/[×✕]/g, "x")
    // OCR reads a zero in "0 in" as the letter O.
    .replace(/(\d+\s*ft\s+)[Oo](\s+in\b)/g, "$10$2");
  return spaced.replace(/\b(\d{1,2})\.(\d{2,3})\s*mm\b/g, (full, note, mm) => {
    const index = Number(note);
    const thickness = Number(mm);
    if (index >= 1 && index <= 20 && PLAUSIBLE_MM.has(thickness)) return `${thickness} mm`;
    return full;
  });
}

function lengthToMm(value: number, dimensionsInMm: boolean): number {
  if (dimensionsInMm || value > 20) return Math.round(value);
  return Math.round(value * 1000);
}

/** Feet-and-inches, or a bare inch mark. Returns millimetres. */
const FEET_INCHES =
  String.raw`(?:\d+\s*'\s*-\s*\d+(?:\s+\d+\s*/\s*\d+)?\s*"|\d+\s*ft\s+\d+\s*in|\d+\s*"|\d+\s*in\b)`;

export function parseLengthToMm(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/[′’`]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/\s+/g, " ");
  const feet = t.match(/^(\d+)\s*(?:'|ft)\s*(?:-\s*)?(\d+)(?:\s+(\d+)\s*\/\s*(\d+))?\s*(?:"|in)?$/i);
  if (feet) {
    const whole = Number(feet[2]);
    const frac = feet[3] ? Number(feet[3]) / Number(feet[4]) : 0;
    return (Number(feet[1]) * 12 + whole + frac) * 25.4;
  }
  const inches = t.match(/^(\d+)(?:\s+(\d+)\s*\/\s*(\d+))?\s*(?:"|in)$/i);
  if (inches) {
    const frac = inches[2] ? Number(inches[2]) / Number(inches[3]) : 0;
    return (Number(inches[1]) + frac) * 25.4;
  }
  return null;
}

function sheetGrades(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(C\d+)\b/gi)) found.add(match[1].toUpperCase());
  for (const match of text.matchAll(/\b(\d+)\s*PSI\b/gi)) found.add(`${match[1]}PSI`);
  return [...found];
}

export function parseDrawingText(raw: string): { reading: Reading; confidence: Confidence } {
  const text = normalizeDrawingText(raw || "");
  const reading = emptyReading();
  if (!text.trim()) return { reading, confidence: "none" };

  reading.title =
    text.match(/SAMPLE DRAWING\s+([A-Z]-\d+)/i)?.[1] ||
    text.match(/\b([SA]-\d{2,})\b/)?.[1] ||
    "";
  reading.dimensionsInMm = /all dimensions in mm/i.test(text);
  if (/all dimensions in feet and inches/i.test(text)) {
    reading.dimensionsInMm = false;
    reading.unitSystem = "ft";
  }
  reading.mentionedExcavation = /below\s+NGL|working space/i.test(text);
  reading.mentionedBlinding = /blinding/i.test(text);
  reading.columnRebarByOthers = /rebar by others/i.test(text);
  reading.slabTopNil = /TOP:\s*NIL/i.test(text);
  if (/no laps/i.test(text)) reading.laps = "none";
  if (/no hooks/i.test(text)) reading.hooks = "none";
  if (/no wastage/i.test(text)) reading.wastagePercent = 0;

  const covers = text.match(
    /covers?:\s*slab\s+(\d+(?:\.\d+)?)\s*mm\s*,\s*footings?\s+(\d+(?:\.\d+)?)\s*mm/i
  );
  if (covers) {
    reading.coverSlabMm = Number(covers[1]);
    reading.coverFootingMm = Number(covers[2]);
  }
  const footingCover = text.match(/cover:\s*footings?\s+(\d+(?:\.\d+)?)\s*mm/i);
  if (footingCover && reading.coverFootingMm == null) {
    reading.coverFootingMm = Number(footingCover[1]);
  }

  const blinding = text.match(
    /(\d+(?:\.\d+)?)\s*mm\s+(C\d+)\s+blinding\s+under\s+(?:the\s+)?(?:footings?|strip)[^.]{0,180}?projecting\s+(\d+(?:\.\d+)?)\s*mm/i
  );
  if (blinding) {
    reading.blinding = {
      thicknessMm: Number(blinding[1]),
      grade: blinding[2].toUpperCase(),
      projectionMm: Number(blinding[3]),
    };
  }

  const formation = text.match(/underside of blinding at\s*-?\s*(\d+(?:\.\d+)?)\s*m\s+below\s+NGL/i);
  if (formation) reading.formationBelowNglM = Number(formation[1]);
  const working = text.match(/(\d+(?:\.\d+)?)\s*mm\s+working space each side/i);
  if (working) reading.workingSpaceMm = Number(working[1]);
  reading.verticalSides = /vertical sides/i.test(text);

  for (const match of text.matchAll(/\bT(\d+)\s*=\s*(\d+(?:\.\d+)?)\s*kg\s*\/\s*m/gi)) {
    reading.steelKgPerM[`T${match[1]}`] = Number(match[2]);
  }
  for (const match of text.matchAll(/#(\d+)\s*=\s*(\d+(?:\.\d+)?)\s*lb\s*\/\s*ft/gi)) {
    const bar = `#${match[1]}`;
    const lb = Number(match[2]);
    reading.steelLbPerFt[bar] = lb;
    reading.steelKgPerM[bar] = kgPerMFromLbPerFt(lb);
  }

  const padGrade = text.match(/FOOTING SCHEDULE\s*\([^)]*?,\s*(C\d+)\)/i)?.[1]?.toUpperCase() || null;
  for (const match of text.matchAll(
    /\b(F\d+)\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*thk\s*\((\d+)\s*no\.?\)\s*BOTTOM\s*(T\d+)\s*@\s*(\d+(?:\.\d+)?)\s*(B\.?\s*W\.?)?/gi
  )) {
    reading.pads.push({
      mark: match[1].toUpperCase(),
      lengthMm: lengthToMm(Number(match[2]), reading.dimensionsInMm),
      widthMm: lengthToMm(Number(match[3]), reading.dimensionsInMm),
      thicknessMm: lengthToMm(Number(match[4]), reading.dimensionsInMm),
      count: Number(match[5]),
      grade: padGrade,
      bottomBar: match[6].toUpperCase(),
      spacingMm: lengthToMm(Number(match[7]), reading.dimensionsInMm),
      bothWays: Boolean(match[8]),
    });
  }

  const stripGrade = text.match(/STRIP FOOTING SCHEDULE\s*\((C\d+)\)/i)?.[1]?.toUpperCase() || null;
  for (const match of text.matchAll(
    /\b(SF\d+)\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*thk\s+cent(?:re|er)line\s+(\d+(?:\.\d+)?)\s*mm\s+(closed|straight)\s+\((\d+)\s*no\.?\)\s+LONG\s+(\d+)\s*(T\d+)\s+TRANSVERSE\s*(T\d+)\s*@\s*(\d+(?:\.\d+)?)/gi
  )) {
    reading.strips.push({
      mark: match[1].toUpperCase(),
      widthMm: lengthToMm(Number(match[2]), reading.dimensionsInMm),
      thicknessMm: lengthToMm(Number(match[3]), reading.dimensionsInMm),
      lengthMm: Math.round(Number(match[4])),
      count: Number(match[6]),
      closed: match[5].toLowerCase() === "closed",
      grade: stripGrade,
      longitudinalBar: match[8].toUpperCase(),
      longitudinalCount: Number(match[7]),
      transverseBar: match[9].toUpperCase(),
      transverseSpacingMm: lengthToMm(Number(match[10]), reading.dimensionsInMm),
    });
  }

  const imperialStrip = new RegExp(
    String.raw`\b(CF\d+)\s+(${FEET_INCHES})\s*wide\s*x\s*(${FEET_INCHES})\s*thick\s+(?:cent(?:re|er)line\s+(${FEET_INCHES})\s+)?(perimeter(?:\s+closed)?|closed|straight)\s+\((\d+)\s*no\.?\)\s+LONG\s+\((\d+)\)\s*(#\d+)`,
    "gi"
  );
  const imperialGrade =
    text.match(/CONTINUOUS FOOTING SCHEDULE\s*\((\d+)\s*PSI\)/i)?.[1] != null
      ? `${text.match(/CONTINUOUS FOOTING SCHEDULE\s*\((\d+)\s*PSI\)/i)?.[1]}PSI`
      : text.match(/CONTINUOUS FOOTING SCHEDULE\s*\((C\d+)\)/i)?.[1]?.toUpperCase() || null;
  for (const match of text.matchAll(imperialStrip)) {
    const width = parseLengthToMm(match[2]);
    const thickness = parseLengthToMm(match[3]);
    const stated = match[4] ? parseLengthToMm(match[4]) : null;
    if (width == null || thickness == null) continue;
    const kind = match[5].toLowerCase();
    reading.strips.push({
      mark: match[1].toUpperCase(),
      widthMm: width,
      thicknessMm: thickness,
      lengthMm: stated ?? 0,
      count: Number(match[6]),
      closed: kind !== "straight",
      grade: imperialGrade,
      longitudinalBar: match[8].toUpperCase(),
      longitudinalCount: Number(match[7]),
      transverseBar: null,
      transverseSpacingMm: null,
    });
  }

  // Column schedule as printed: "CF24  2'-0"  1'-0"  (3) #5", length elsewhere.
  if (/CONTINUOUS FOOTING SCHEDULE/i.test(text)) {
    const columnRow = new RegExp(
      String.raw`\b(CF\d+)\s+(${FEET_INCHES})\s+(${FEET_INCHES})\s+\((\d+)\)\s*(#\d+)`,
      "gi"
    );
    const seen = new Set(reading.strips.map((strip) => strip.mark));
    for (const match of text.matchAll(columnRow)) {
      const mark = match[1].toUpperCase();
      if (seen.has(mark)) continue;
      const width = parseLengthToMm(match[2]);
      const thickness = parseLengthToMm(match[3]);
      if (width == null || thickness == null) continue;
      seen.add(mark);
      reading.strips.push({
        mark,
        widthMm: width,
        thicknessMm: thickness,
        lengthMm: 0,
        count: 1,
        closed: true,
        grade: imperialGrade,
        longitudinalBar: match[5].toUpperCase(),
        longitudinalCount: Number(match[4]),
        transverseBar: null,
        transverseSpacingMm: null,
      });
    }
  }

  for (const match of text.matchAll(
    /\bCOLUMN\s+(C\d+)\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*,\s*(\d+)\s*no\.?\s*,\s*height\s+(\d+(?:\.\d+)?)/gi
  )) {
    reading.columns.push({
      mark: match[1].toUpperCase(),
      widthMm: lengthToMm(Number(match[2]), reading.dimensionsInMm),
      depthMm: lengthToMm(Number(match[3]), reading.dimensionsInMm),
      heightMm: lengthToMm(Number(match[5]), reading.dimensionsInMm),
      count: Number(match[4]),
      grade: null,
      rebarByOthers: reading.columnRebarByOthers,
    });
  }

  const slabMark = text.match(/\bSLAB\s+(S\d+)/i)?.[1]?.toUpperCase() || "S1";
  const slabSize = text.match(/\bslab\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  const slabThk = text.match(/(\d+(?:\.\d+)?)\s*mm\s+THK\s+RC\s+SLAB\s*\((C\d+)\)/i);
  const mesh = text.match(/BOTTOM:\s*(T\d+)\s*@\s*(\d+(?:\.\d+)?)\s*(B\.?\s*W\.?)?/i);
  if (slabSize && slabThk) {
    reading.slabs.push({
      mark: slabMark,
      lengthMm: lengthToMm(Number(slabSize[1]), reading.dimensionsInMm),
      widthMm: lengthToMm(Number(slabSize[2]), reading.dimensionsInMm),
      thicknessMm: Math.round(Number(slabThk[1])),
      grade: slabThk[2].toUpperCase(),
      meshBar: mesh ? mesh[1].toUpperCase() : null,
      spacingMm: mesh ? lengthToMm(Number(mesh[2]), reading.dimensionsInMm) : null,
      bothWays: Boolean(mesh?.[3]),
      topNil: reading.slabTopNil,
      onGrade: false,
      wwf: false,
    });
  }

  const slabOnGrade = text.match(
    new RegExp(
      String.raw`(${FEET_INCHES})\s*THK\s+CONCRETE\s+SLAB-ON-GRADE\s+inside\s+(${FEET_INCHES})\s*x\s*(${FEET_INCHES})(?:\s*\((\d+)\s*PSI\))?`,
      "i"
    )
  );
  if (slabOnGrade) {
    const thickness = parseLengthToMm(slabOnGrade[1]);
    const length = parseLengthToMm(slabOnGrade[2]);
    const width = parseLengthToMm(slabOnGrade[3]);
    if (thickness != null && length != null && width != null) {
      reading.slabs.push({
        mark: "S1",
        lengthMm: length,
        widthMm: width,
        thicknessMm: thickness,
        grade: slabOnGrade[4] ? `${slabOnGrade[4]}PSI` : null,
        meshBar: null,
        spacingMm: null,
        bothWays: false,
        topNil: false,
        onGrade: true,
        wwf: /WWF|welded wire/i.test(text),
      });
    }
  }

  const plasterSides = /PLASTER\s+both\s+sides/i.test(text) ? 2 : /PLASTER\s+one\s+side/i.test(text) ? 1 : 0;
  for (const match of text.matchAll(
    /\bWALL\s+(W\d+)\s+block\s+(\d+(?:\.\d+)?)\s*mm\s+thk,\s*height\s+(\d+(?:\.\d+)?),\s*cent(?:re|er)line\s+(\d+(?:\.\d+)?)\s*mm\s*\((\d+)\s*no\.?\)/gi
  )) {
    reading.walls.push({
      mark: match[1].toUpperCase(),
      thicknessMm: Math.round(Number(match[2])),
      heightMm: Math.round(Number(match[3])),
      centrelineMm: Math.round(Number(match[4])),
      count: Number(match[5]),
      plasterSides,
      material: "block",
      grade: null,
    });
  }

  const concreteWall = new RegExp(
    String.raw`\bWALL\s+([A-Z]+\d+)\s+concrete\s+(${FEET_INCHES})\s*thk,\s*height\s+(${FEET_INCHES}),\s*cent(?:re|er)line\s+(${FEET_INCHES})\s*\((\d+)\s*no\.?\)`,
    "gi"
  );
  for (const match of text.matchAll(concreteWall)) {
    const thickness = parseLengthToMm(match[2]);
    const height = parseLengthToMm(match[3]);
    const centreline = parseLengthToMm(match[4]);
    if (thickness == null || height == null || centreline == null) continue;
    reading.walls.push({
      mark: match[1].toUpperCase(),
      thicknessMm: thickness,
      heightMm: height,
      centrelineMm: centreline,
      count: Number(match[5]),
      plasterSides: 0,
      material: "concrete",
      grade: null,
    });
  }

  for (const match of text.matchAll(
    /\bOPENING\s+([A-Z]\d+)\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*\((\d+)\s*no\.?\)\s*deduct\s+wall\s+and\s+plaster/gi
  )) {
    reading.openings.push({
      mark: match[1].toUpperCase(),
      widthMm: lengthToMm(Number(match[2]), reading.dimensionsInMm),
      heightMm: lengthToMm(Number(match[3]), reading.dimensionsInMm),
      count: Number(match[4]),
      deductWall: true,
      deductPlaster: true,
    });
  }

  const floor = text.match(/FLOOR\s+internal\s+(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*tiles/i);
  if (floor) {
    const screed = text.match(/SCREED\s+(\d+(?:\.\d+)?)\s*mm/i);
    const skirt = text.match(/SKIRTING\s+internal\s+perimeter,\s*deduct\s+door\s+(\d+(?:\.\d+)?)\s*mm/i);
    reading.floors.push({
      lengthMm: lengthToMm(Number(floor[1]), reading.dimensionsInMm),
      widthMm: lengthToMm(Number(floor[2]), reading.dimensionsInMm),
      tiles: true,
      screedMm: screed ? Math.round(Number(screed[1])) : null,
      skirtingDeductMm: skirt ? Math.round(Number(skirt[1])) : null,
    });
  }

  fillPerimeterFromOutToOut(text, reading);
  reading.strips = reading.strips.filter((strip) => strip.lengthMm > 0);
  const grades = sheetGrades(text);
  if (grades.length === 1) {
    const grade = grades[0];
    for (const strip of reading.strips) if (!strip.grade) strip.grade = grade;
    for (const slab of reading.slabs) if (!slab.grade) slab.grade = grade;
    for (const wall of reading.walls) {
      if (wall.material === "concrete" && !wall.grade) wall.grade = grade;
    }
  }

  return { reading, confidence: confidenceOf(reading) };
}

/**
 * A closed perimeter footing with no printed length takes the centreline of
 * an out-to-out rectangle: 2 x ((length - thickness) + (width - thickness)).
 */
function fillPerimeterFromOutToOut(text: string, reading: Reading): void {
  const overall = text.match(
    new RegExp(String.raw`out-to-out(?:\s+[A-Za-z]+){0,2}\s+(${FEET_INCHES})\s*x\s*(${FEET_INCHES})`, "i")
  );
  if (!overall) return;
  const length = parseLengthToMm(overall[1]);
  const width = parseLengthToMm(overall[2]);
  const wall = reading.walls.find((item) => item.material === "concrete" && item.thicknessMm > 0);
  if (length == null || width == null || !wall) return;
  const centreline = 2 * (length + width - 2 * wall.thicknessMm);
  for (const strip of reading.strips) {
    if (strip.closed && strip.lengthMm <= 0) strip.lengthMm = centreline;
  }
}

function barMassKnown(reading: Reading, bar: string): boolean {
  if (reading.steelKgPerM[bar] != null) return true;
  return bar.startsWith("#") && STANDARD_KG_PER_M[bar] != null;
}

function steelNeeded(reading: Reading): string[] {
  const bars = new Set<string>();
  for (const pad of reading.pads) if (pad.bottomBar) bars.add(pad.bottomBar);
  for (const strip of reading.strips) {
    if (strip.longitudinalBar) bars.add(strip.longitudinalBar);
    if (strip.transverseBar) bars.add(strip.transverseBar);
  }
  for (const slab of reading.slabs) if (slab.meshBar) bars.add(slab.meshBar);
  return [...bars];
}

export function confidenceOf(reading: Reading): Confidence {
  const elements =
    reading.pads.length +
    reading.strips.length +
    reading.slabs.length +
    reading.columns.length +
    reading.walls.length +
    reading.floors.length;
  if (elements === 0) return "none";

  const bars = steelNeeded(reading);
  if (reading.pads.some((pad) => pad.bottomBar) && reading.coverFootingMm == null) return "partial";
  const stripNeedsCover = reading.strips.some(
    (strip) => strip.transverseBar || (strip.longitudinalBar && !strip.closed)
  );
  if (stripNeedsCover && reading.coverFootingMm == null) return "partial";
  if (reading.slabs.some((slab) => slab.meshBar) && reading.coverSlabMm == null) return "partial";
  if (bars.some((bar) => !barMassKnown(reading, bar))) return "partial";
  if (reading.mentionedExcavation && (reading.formationBelowNglM == null || reading.workingSpaceMm == null)) {
    return "partial";
  }
  if (reading.mentionedBlinding && !reading.blinding) return "partial";
  if (reading.pads.some((pad) => pad.count <= 0 || pad.lengthMm <= 0 || pad.thicknessMm <= 0)) return "partial";
  return "high";
}
