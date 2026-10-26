export type ReadSource = "pdf-text" | "ocr" | "model" | "none";

export type Confidence = "high" | "partial" | "none";

export type PadFooting = {
  mark: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  count: number;
  grade: string | null;
  bottomBar: string | null;
  spacingMm: number | null;
  bothWays: boolean;
};

export type StripFooting = {
  mark: string;
  widthMm: number;
  thicknessMm: number;
  lengthMm: number;
  count: number;
  closed: boolean;
  grade: string | null;
  longitudinalBar: string | null;
  longitudinalCount: number | null;
  transverseBar: string | null;
  transverseSpacingMm: number | null;
};

export type Column = {
  mark: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  count: number;
  grade: string | null;
  rebarByOthers: boolean;
};

export type Slab = {
  mark: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  grade: string | null;
  meshBar: string | null;
  spacingMm: number | null;
  bothWays: boolean;
  topNil: boolean;
  /** True for a slab on grade. Soffit formwork is not measured. */
  onGrade: boolean;
  /** Welded wire fabric over the slab area. No bar mass is implied. */
  wwf: boolean;
};

export type Wall = {
  mark: string;
  thicknessMm: number;
  heightMm: number;
  centrelineMm: number;
  count: number;
  plasterSides: number;
  material: "block" | "concrete";
  grade: string | null;
};

export type Opening = {
  mark: string;
  widthMm: number;
  heightMm: number;
  count: number;
  deductWall: boolean;
  deductPlaster: boolean;
};

export type FloorFinish = {
  lengthMm: number;
  widthMm: number;
  tiles: boolean;
  screedMm: number | null;
  skirtingDeductMm: number | null;
};

export type Reading = {
  title: string;
  dimensionsInMm: boolean;
  /** ft means the sheet was dimensioned in feet and inches. */
  unitSystem: "mm" | "ft";
  pads: PadFooting[];
  strips: StripFooting[];
  columns: Column[];
  slabs: Slab[];
  walls: Wall[];
  openings: Opening[];
  floors: FloorFinish[];
  coverSlabMm: number | null;
  coverFootingMm: number | null;
  laps: "none" | "not_stated";
  hooks: "none" | "not_stated";
  /** null means the drawing does not state a percentage. The take-off then uses 0. */
  wastagePercent: number | null;
  blinding: { thicknessMm: number; projectionMm: number; grade: string } | null;
  formationBelowNglM: number | null;
  workingSpaceMm: number | null;
  verticalSides: boolean;
  mentionedExcavation: boolean;
  mentionedBlinding: boolean;
  steelKgPerM: Record<string, number>;
  /** Printed pound-per-foot masses, when the sheet states them. */
  steelLbPerFt: Record<string, number>;
  columnRebarByOthers: boolean;
  slabTopNil: boolean;
};

export type BoqLine = {
  code: string;
  unit: "m3" | "m2" | "m" | "kg";
  quantity: number;
  /** Expression without the final equals. The quantity is appended once. */
  expression: string;
  working: string;
  grade?: string;
};

export type TakeoffResult = {
  source: ReadSource;
  confidence: Confidence;
  reading: Reading;
  lines: BoqLine[];
  reply: string;
};

export function emptyReading(): Reading {
  return {
    title: "",
    dimensionsInMm: true,
    unitSystem: "mm",
    pads: [],
    strips: [],
    columns: [],
    slabs: [],
    walls: [],
    openings: [],
    floors: [],
    coverSlabMm: null,
    coverFootingMm: null,
    laps: "not_stated",
    hooks: "not_stated",
    wastagePercent: null,
    blinding: null,
    formationBelowNglM: null,
    workingSpaceMm: null,
    verticalSides: false,
    mentionedExcavation: false,
    mentionedBlinding: false,
    steelKgPerM: {},
    steelLbPerFt: {},
    columnRebarByOthers: false,
    slabTopNil: false,
  };
}
