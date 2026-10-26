import { barMass, closedBarCount, formatQty, m2FromMm, m3FromMm, metresFromMm, round3, straightBarCount } from "@/lib/takeoff/numbers";
import type { BoqLine, Reading } from "@/lib/takeoff/types";

function line(code: string, unit: BoqLine["unit"], quantity: number, expression: string, grade?: string): BoqLine {
  const rounded = round3(quantity);
  const shown = formatQty(rounded);
  return {
    code,
    unit,
    quantity: rounded,
    expression,
    working: `${expression} = ${shown}`,
    grade,
  };
}

function num(mm: number): string {
  return formatQty(metresFromMm(mm));
}

function massFactor(kgPerM: number): string {
  return kgPerM.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Every quantity is produced here. The model is not asked to multiply.
 * Excavation depth is the formation level (underside of blinding below NGL),
 * never the footing thickness.
 */
export function calculateTakeoff(reading: Reading): BoqLine[] {
  const lines: BoqLine[] = [];
  const concrete = new Map<string, { qty: number; parts: string[] }>();
  const rebarParts: string[] = [];
  let rebar = 0;

  const addConcrete = (grade: string | null, qty: number, part: string) => {
    const key = grade || "unspecified";
    const current = concrete.get(key) || { qty: 0, parts: [] };
    current.qty = round3(current.qty + round3(qty));
    current.parts.push(part);
    concrete.set(key, current);
  };
  const addRebar = (qty: number, part: string) => {
    rebar = round3(rebar + round3(qty));
    rebarParts.push(part);
  };

  if (
    reading.formationBelowNglM != null &&
    reading.workingSpaceMm != null &&
    (reading.pads.length > 0 || reading.strips.length > 0)
  ) {
    const depthM = reading.formationBelowNglM;
    const depthMm = Math.round(depthM * 1000);
    const space = reading.workingSpaceMm;
    const parts: string[] = [];
    let volume = 0;
    for (const pad of reading.pads) {
      const planL = pad.lengthMm + 2 * space;
      const planW = pad.widthMm + 2 * space;
      const qty = m3FromMm(planL, planW, depthMm, pad.count);
      volume += qty;
      parts.push(
        `${pad.mark}: ${pad.count} × (${num(pad.lengthMm)} + 2×${num(space)}) × (${num(pad.widthMm)} + 2×${num(space)}) × ${formatQty(depthM)}`
      );
    }
    for (const strip of reading.strips) {
      const planW = strip.widthMm + 2 * space;
      const qty = m3FromMm(strip.lengthMm, planW, depthMm, strip.count);
      volume += qty;
      parts.push(
        `${strip.mark}: ${strip.count} × ${num(strip.lengthMm)} × (${num(strip.widthMm)} + 2×${num(space)}) × ${formatQty(depthM)}`
      );
    }
    lines.push(line("excavation_m3", "m3", volume, parts.join(" + ")));
  }

  if (reading.blinding && (reading.pads.length > 0 || reading.strips.length > 0)) {
    const { thicknessMm, projectionMm, grade } = reading.blinding;
    const parts: string[] = [];
    let volume = 0;
    for (const pad of reading.pads) {
      const planL = pad.lengthMm + 2 * projectionMm;
      const planW = pad.widthMm + 2 * projectionMm;
      const qty = m3FromMm(planL, planW, thicknessMm, pad.count);
      volume += qty;
      parts.push(`${pad.mark}: ${pad.count} × ${num(planL)} × ${num(planW)} × ${num(thicknessMm)}`);
    }
    for (const strip of reading.strips) {
      const planW = strip.widthMm + 2 * projectionMm;
      const qty = m3FromMm(strip.lengthMm, planW, thicknessMm, strip.count);
      volume += qty;
      parts.push(`${strip.mark}: ${strip.count} × ${num(strip.lengthMm)} × ${num(planW)} × ${num(thicknessMm)}`);
    }
    lines.push(line("blinding_m3", "m3", volume, parts.join(" + "), grade));
  }

  if (reading.pads.length > 0) {
    const parts: string[] = [];
    let volume = 0;
    let area = 0;
    const sideParts: string[] = [];
    const grade = reading.pads.every((pad) => pad.grade && pad.grade === reading.pads[0].grade)
      ? reading.pads[0].grade
      : null;
    for (const pad of reading.pads) {
      const qty = m3FromMm(pad.lengthMm, pad.widthMm, pad.thicknessMm, pad.count);
      volume += qty;
      parts.push(`${pad.mark}: ${pad.count} × ${num(pad.lengthMm)} × ${num(pad.widthMm)} × ${num(pad.thicknessMm)}`);
      const side = m2FromMm(2 * (pad.lengthMm + pad.widthMm), pad.thicknessMm, pad.count);
      area += side;
      sideParts.push(
        `${pad.mark}: ${pad.count} × 2 × (${num(pad.lengthMm)} + ${num(pad.widthMm)}) × ${num(pad.thicknessMm)}`
      );
    }
    const concreteLine = line("footing_concrete_m3", "m3", volume, parts.join(" + "), grade || undefined);
    lines.push(concreteLine);
    addConcrete(grade, concreteLine.quantity, formatQty(concreteLine.quantity));
    lines.push(line("footing_side_formwork_m2", "m2", area, sideParts.join(" + ")));

    const cover = reading.coverFootingMm;
    if (cover != null) {
      const byBar = new Map<string, { metres: number; parts: string[] }>();
      for (const pad of reading.pads) {
        if (!pad.bottomBar || !pad.spacingMm) continue;
        const clearL = pad.lengthMm - 2 * cover;
        const clearW = pad.widthMm - 2 * cover;
        const nL = straightBarCount(clearW, pad.spacingMm);
        const nW = straightBarCount(clearL, pad.spacingMm);
        const metres = pad.bothWays
          ? (pad.count * (nL * clearL + nW * clearW)) / 1000
          : (pad.count * nL * clearL) / 1000;
        const bucket = byBar.get(pad.bottomBar) || { metres: 0, parts: [] };
        bucket.metres += metres;
        const detail = pad.bothWays
          ? `${pad.count} × (${nL} × ${num(clearL)} + ${nW} × ${num(clearW)})`
          : `${pad.count} × ${nL} × ${num(clearL)}`;
        bucket.parts.push(`${pad.mark}: ${detail}`);
        byBar.set(pad.bottomBar, bucket);
      }
      for (const [bar, bucket] of byBar) {
        const mass = barMass(reading.steelKgPerM, bar);
        const kg = bucket.metres * mass.kgPerM;
        const code = `footing_${bar}_kg`;
        const steel = line(code, "kg", kg, `${bucket.parts.join("; ")}; ${formatQty(bucket.metres)} m × ${massFactor(mass.kgPerM)}`);
        lines.push(steel);
        addRebar(steel.quantity, formatQty(steel.quantity));
      }
    }
  }

  if (reading.strips.length > 0) {
    const parts: string[] = [];
    const sideParts: string[] = [];
    let volume = 0;
    let area = 0;
    const grade = reading.strips.every((strip) => strip.grade && strip.grade === reading.strips[0].grade)
      ? reading.strips[0].grade
      : null;
    for (const strip of reading.strips) {
      const qty = m3FromMm(strip.lengthMm, strip.widthMm, strip.thicknessMm, strip.count);
      volume += qty;
      parts.push(
        `${strip.mark}: ${strip.count} × ${num(strip.lengthMm)} × ${num(strip.widthMm)} × ${num(strip.thicknessMm)}`
      );
      const side = m2FromMm(2 * strip.lengthMm, strip.thicknessMm, strip.count);
      area += side;
      sideParts.push(`${strip.mark}: ${strip.count} × 2 × ${num(strip.lengthMm)} × ${num(strip.thicknessMm)}`);
    }
    const concreteLine = line("strip_concrete_m3", "m3", volume, parts.join(" + "), grade || undefined);
    lines.push(concreteLine);
    addConcrete(grade, concreteLine.quantity, formatQty(concreteLine.quantity));
    lines.push(line("strip_side_formwork_m2", "m2", area, sideParts.join(" + ")));

    const cover = reading.coverFootingMm;
    for (const strip of reading.strips) {
      if (strip.longitudinalBar && strip.longitudinalCount && (strip.closed || cover != null)) {
        const barMm = strip.closed ? strip.lengthMm : strip.lengthMm - 2 * (cover ?? 0);
        const metres = (strip.count * strip.longitudinalCount * barMm) / 1000;
        const mass = barMass(reading.steelKgPerM, strip.longitudinalBar);
        const kg = metres * mass.kgPerM;
        const steel = line(
          `longitudinal_${strip.longitudinalBar}_kg`,
          "kg",
          kg,
          `${strip.mark}: ${strip.count} × ${strip.longitudinalCount} × ${num(barMm)} m × ${massFactor(mass.kgPerM)}`
        );
        lines.push(steel);
        addRebar(steel.quantity, formatQty(steel.quantity));
      }
      if (strip.transverseBar && strip.transverseSpacingMm && cover != null) {
        const count = strip.closed
          ? closedBarCount(strip.lengthMm, strip.transverseSpacingMm)
          : straightBarCount(strip.lengthMm - 2 * cover, strip.transverseSpacingMm);
        const barMm = strip.widthMm - 2 * cover;
        const metres = (strip.count * count * barMm) / 1000;
        const mass = barMass(reading.steelKgPerM, strip.transverseBar);
        const kg = metres * mass.kgPerM;
        const steel = line(
          `transverse_${strip.transverseBar}_kg`,
          "kg",
          kg,
          `${strip.mark}: ${strip.count} × ${count} × ${num(barMm)} m × ${massFactor(mass.kgPerM)}`
        );
        lines.push(steel);
        addRebar(steel.quantity, formatQty(steel.quantity));
      }
    }
  }

  if (reading.columns.length > 0) {
    const structuralGrades = [
      ...reading.pads.map((pad) => pad.grade),
      ...reading.slabs.map((slab) => slab.grade),
    ].filter((grade): grade is string => Boolean(grade));
    const unique = [...new Set(structuralGrades)];
    const assumed = unique.length === 1 ? unique[0] : null;
    const parts: string[] = [];
    const sideParts: string[] = [];
    let volume = 0;
    let area = 0;
    for (const column of reading.columns) {
      const qty = m3FromMm(column.widthMm, column.depthMm, column.heightMm, column.count);
      volume += qty;
      parts.push(
        `${column.mark}: ${column.count} × ${num(column.widthMm)} × ${num(column.depthMm)} × ${num(column.heightMm)}`
      );
      const side = m2FromMm(2 * (column.widthMm + column.depthMm), column.heightMm, column.count);
      area += side;
      sideParts.push(
        `${column.mark}: ${column.count} × 2 × (${num(column.widthMm)} + ${num(column.depthMm)}) × ${num(column.heightMm)}`
      );
    }
    const concreteLine = line("column_concrete_m3", "m3", volume, parts.join(" + "), assumed || undefined);
    lines.push(concreteLine);
    if (assumed) addConcrete(assumed, concreteLine.quantity, formatQty(concreteLine.quantity));
    lines.push(line("column_formwork_m2", "m2", area, sideParts.join(" + ")));
  }

  for (const slab of reading.slabs) {
    const qty = m3FromMm(slab.lengthMm, slab.widthMm, slab.thicknessMm);
    const concreteLine = line(
      slab.onGrade ? "slab_on_grade_m3" : "slab_concrete_m3",
      "m3",
      qty,
      `${slab.mark}: ${num(slab.lengthMm)} × ${num(slab.widthMm)} × ${num(slab.thicknessMm)}`,
      slab.grade || undefined
    );
    lines.push(concreteLine);
    addConcrete(slab.grade, concreteLine.quantity, formatQty(concreteLine.quantity));
    if (slab.onGrade && slab.wwf) {
      lines.push(
        line(
          "slab_wwf_m2",
          "m2",
          m2FromMm(slab.lengthMm, slab.widthMm),
          `${slab.mark}: ${num(slab.lengthMm)} × ${num(slab.widthMm)}`
        )
      );
    }
    if (!slab.onGrade) {
      lines.push(
        line(
          "slab_soffit_formwork_m2",
          "m2",
          m2FromMm(slab.lengthMm, slab.widthMm),
          `${slab.mark}: ${num(slab.lengthMm)} × ${num(slab.widthMm)}`
        )
      );
      lines.push(
        line(
          "slab_edge_formwork_m2",
          "m2",
          m2FromMm(2 * (slab.lengthMm + slab.widthMm), slab.thicknessMm),
          `${slab.mark}: 2 × (${num(slab.lengthMm)} + ${num(slab.widthMm)}) × ${num(slab.thicknessMm)}`
        )
      );
    }
    if (slab.meshBar && slab.spacingMm && reading.coverSlabMm != null) {
      const clearL = slab.lengthMm - 2 * reading.coverSlabMm;
      const clearW = slab.widthMm - 2 * reading.coverSlabMm;
      const nLong = straightBarCount(clearW, slab.spacingMm);
      const nShort = straightBarCount(clearL, slab.spacingMm);
      const metres = slab.bothWays ? (nLong * clearL + nShort * clearW) / 1000 : (nLong * clearL) / 1000;
      const layers = slab.topNil ? 1 : 1;
      const mass = barMass(reading.steelKgPerM, slab.meshBar);
      const kg = metres * layers * mass.kgPerM;
      const expr = slab.bothWays
        ? `${nLong} × ${num(clearL)} + ${nShort} × ${num(clearW)} = ${formatQty(metres)} m × ${massFactor(mass.kgPerM)}`
        : `${nLong} × ${num(clearL)} m × ${massFactor(mass.kgPerM)}`;
      const steel = line(`slab_${slab.meshBar}_kg`, "kg", kg, expr);
      lines.push(steel);
      addRebar(steel.quantity, formatQty(steel.quantity));
    }
  }

  const blockWalls = reading.walls.filter((wall) => wall.material !== "concrete");
  const concreteWalls = reading.walls.filter((wall) => wall.material === "concrete");
  if (concreteWalls.length > 0) {
    const parts: string[] = [];
    let volume = 0;
    const grade = concreteWalls.every((wall) => wall.grade && wall.grade === concreteWalls[0].grade)
      ? concreteWalls[0].grade
      : null;
    for (const wall of concreteWalls) {
      const qty = m3FromMm(wall.centrelineMm, wall.thicknessMm, wall.heightMm, wall.count);
      volume += qty;
      parts.push(
        `${wall.mark}: ${wall.count} × ${num(wall.centrelineMm)} × ${num(wall.thicknessMm)} × ${num(wall.heightMm)}`
      );
    }
    const concreteLine = line("wall_concrete_m3", "m3", volume, parts.join(" + "), grade || undefined);
    lines.push(concreteLine);
    addConcrete(grade, concreteLine.quantity, formatQty(concreteLine.quantity));
  }

  if (blockWalls.length > 0) {
    let grossMm2 = 0;
    let thickness = blockWalls[0].thicknessMm;
    let plasterSides = 0;
    const grossParts: string[] = [];
    for (const wall of blockWalls) {
      grossMm2 += wall.centrelineMm * wall.heightMm * wall.count;
      thickness = wall.thicknessMm;
      plasterSides = Math.max(plasterSides, wall.plasterSides);
      grossParts.push(`${wall.count} × ${num(wall.centrelineMm)} × ${num(wall.heightMm)}`);
    }
    let deductWall = 0;
    let deductPlaster = 0;
    const deductParts: string[] = [];
    for (const opening of reading.openings) {
      const area = opening.widthMm * opening.heightMm * opening.count;
      if (opening.deductWall) deductWall += area;
      if (opening.deductPlaster) deductPlaster += area;
      deductParts.push(`${opening.count} × ${num(opening.widthMm)} × ${num(opening.heightMm)}`);
    }
    const netMm2 = Math.max(0, grossMm2 - deductWall);
    const net = netMm2 / 1e6;
    const grossExpr = grossParts.join(" + ");
    const netExpr = deductParts.length ? `(${grossExpr} − (${deductParts.join(" + ")}))` : `(${grossExpr})`;
    lines.push(line("wall_net_m2", "m2", net, netExpr));
    lines.push(line("blockwork_m3", "m3", (netMm2 * thickness) / 1e9, `${netExpr} × ${num(thickness)}`));
    if (plasterSides > 0) {
      const plasterNet = Math.max(0, grossMm2 - deductPlaster) / 1e6;
      const plasterExpr = deductParts.length
        ? `(${grossExpr} − (${deductParts.join(" + ")}))`
        : `(${grossExpr})`;
      lines.push(line("plaster_m2", "m2", plasterSides * plasterNet, `${plasterSides} × ${plasterExpr}`));
    }
  }

  for (const floor of reading.floors) {
    const area = m2FromMm(floor.lengthMm, floor.widthMm);
    if (floor.tiles) {
      lines.push(line("floor_tiles_m2", "m2", area, `${num(floor.lengthMm)} × ${num(floor.widthMm)}`));
    }
    if (floor.screedMm != null) {
      lines.push(
        line(
          "screed_m3",
          "m3",
          m3FromMm(floor.lengthMm, floor.widthMm, floor.screedMm),
          `${num(floor.lengthMm)} × ${num(floor.widthMm)} × ${num(floor.screedMm)}`
        )
      );
    }
    if (floor.skirtingDeductMm != null) {
      const perimeter = 2 * (floor.lengthMm + floor.widthMm);
      const net = (perimeter - floor.skirtingDeductMm) / 1000;
      lines.push(
        line(
          "skirting_m",
          "m",
          net,
          `2 × (${num(floor.lengthMm)} + ${num(floor.widthMm)}) − ${num(floor.skirtingDeductMm)}`
        )
      );
    }
  }

  for (const [grade, bucket] of concrete) {
    if (grade === "unspecified") continue;
    lines.push(
      line(
        `total_concrete_${grade}_m3`,
        "m3",
        bucket.qty,
        bucket.parts.join(" + "),
        grade
      )
    );
  }
  if (rebarParts.length > 0) {
    lines.push(line("total_rebar_kg", "kg", rebar, rebarParts.join(" + ")));
  }

  return lines;
}

export function workingsMatchQuantities(lines: Pick<BoqLine, "quantity" | "working">[]): boolean {
  return lines.every((item) => {
    const match = item.working.match(/=\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return false;
    const shown = Number(match[1]);
    return Math.abs(shown - item.quantity) < 0.0006;
  });
}
