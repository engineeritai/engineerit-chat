import type { UiLocale } from "@/lib/replyLanguage";
import type { BoqLine, ReadSource, Reading } from "@/lib/takeoff/types";
import { formatQty } from "@/lib/takeoff/numbers";

const EN_DESC: Record<string, string> = {
  excavation_m3: "Excavation for foundations, vertical sides, working space included",
  blinding_m3: "Blinding concrete under foundations",
  footing_concrete_m3: "In-situ concrete in isolated pad footings",
  footing_side_formwork_m2: "Formwork to sides of pad footings",
  column_concrete_m3: "In-situ concrete in columns",
  column_formwork_m2: "Formwork to column sides",
  slab_concrete_m3: "In-situ concrete in suspended slab",
  slab_soffit_formwork_m2: "Formwork to slab soffit",
  slab_edge_formwork_m2: "Formwork to slab edges",
  strip_concrete_m3: "In-situ concrete in strip footing",
  strip_side_formwork_m2: "Formwork to sides of strip footing",
  wall_net_m2: "Blockwork area, net of openings",
  blockwork_m3: "Blockwork, net of openings",
  plaster_m2: "Cement plaster, openings deducted, reveals not measured",
  floor_tiles_m2: "Floor tiles on the internal room area",
  screed_m3: "Screed under the floor tiles",
  skirting_m: "Skirting to the internal perimeter, door deducted",
  total_rebar_kg: "Total reinforcement",
};

const AR_DESC: Record<string, string> = {
  excavation_m3: "حفر الأساسات بجوانب رأسية مع فراغ العمل",
  blinding_m3: "خرسانة النظافة تحت الأساسات",
  footing_concrete_m3: "خرسانة القواعد المنفصلة",
  footing_side_formwork_m2: "شدة جوانب القواعد المنفصلة",
  column_concrete_m3: "خرسانة الأعمدة",
  column_formwork_m2: "شدة الأعمدة",
  slab_concrete_m3: "خرسانة البلاطة المعلقة",
  slab_soffit_formwork_m2: "شدة بطن البلاطة",
  slab_edge_formwork_m2: "شدة جوانب البلاطة",
  strip_concrete_m3: "خرسانة القواعد الشريطية",
  strip_side_formwork_m2: "شدة جوانب القاعدة الشريطية",
  wall_net_m2: "مساحة الطابوق بعد خصم الفتحات",
  blockwork_m3: "مباني الطابوق بعد خصم الفتحات",
  plaster_m2: "لياسة الأسمنت بعد خصم الفتحات، بدون قياس الأكتاف",
  floor_tiles_m2: "بلاط الأرضيات لمساحة الغرفة الداخلية",
  screed_m3: "طبقة التسوية تحت البلاط",
  skirting_m: "وزرة على المحيط الداخلي بعد خصم الباب",
  total_rebar_kg: "إجمالي حديد التسليح",
};

function describe(locale: UiLocale, item: BoqLine): string {
  const table = locale === "ar" ? AR_DESC : EN_DESC;
  if (item.code.startsWith("total_concrete_")) {
    const grade = item.grade || item.code.replace("total_concrete_", "").replace("_m3", "");
    return locale === "ar" ? `إجمالي خرسانة ${grade}` : `Total in-situ concrete grade ${grade}`;
  }
  if (item.code.startsWith("footing_T")) {
    const bar = item.code.replace("footing_", "").replace("_kg", "");
    return locale === "ar"
      ? `حديد التسليح ${bar} في القواعد، اتجاهان، أسياخ مستقيمة`
      : `Reinforcement ${bar} in pad footings, both ways, straight bars`;
  }
  if (item.code.startsWith("slab_T")) {
    const bar = item.code.replace("slab_", "").replace("_kg", "");
    return locale === "ar"
      ? `حديد التسليح ${bar} في البلاطة، أسياخ مستقيمة`
      : `Reinforcement ${bar} in the slab, straight bars`;
  }
  if (item.code.startsWith("longitudinal_")) {
    const bar = item.code.replace("longitudinal_", "").replace("_kg", "");
    return locale === "ar"
      ? `حديد طولي ${bar} في القاعدة الشريطية`
      : `Longitudinal reinforcement ${bar} in the strip footing`;
  }
  if (item.code.startsWith("transverse_")) {
    const bar = item.code.replace("transverse_", "").replace("_kg", "");
    return locale === "ar"
      ? `حديد عرضي ${bar} في القاعدة الشريطية`
      : `Transverse reinforcement ${bar} in the strip footing`;
  }
  const base = table[item.code] || item.code;
  if (item.grade && /concrete_m3$/.test(item.code) && !item.code.startsWith("total_")) {
    return locale === "ar" ? `${base}، درجة ${item.grade}` : `${base}, grade ${item.grade}`;
  }
  return base;
}

function assumptions(locale: UiLocale, reading: Reading): string[] {
  const ar = locale === "ar";
  const lines: string[] = [];
  lines.push(
    ar
      ? "هذا حصر أولي ليراجعه المساح. ليس جدول مناقصة وليس كمية توريد."
      : "This is a first-pass take-off for a quantity surveyor to check. It is not a tender bill and it is not an order quantity."
  );
  lines.push(
    reading.dimensionsInMm
      ? ar
        ? "أبعاد الرسم بالمليمتر، وحولت إلى المتر بالقسمة على 1000."
        : "Drawing dimensions are in millimetres and were converted to metres by dividing by 1000."
      : ar
        ? "أبعاد الأعضاء أخذت بوحدة الرسم."
        : "Member sizes were taken in the drawing unit."
  );
  if (reading.formationBelowNglM != null) {
    const depth = formatQty(reading.formationBelowNglM);
    const space = reading.workingSpaceMm != null ? formatQty(reading.workingSpaceMm / 1000) : null;
    lines.push(
      ar
        ? `عمق الحفر ${depth} م، وهو منسوب أسفل خرسانة النظافة تحت منسوب الأرض الطبيعية. لم يستخدم سمك القاعدة كعمق للحفر.`
        : `Excavation depth is ${depth} m, the underside of blinding below NGL. Footing thickness was not used as the depth.`
    );
    if (space) {
      lines.push(
        ar
          ? `فراغ العمل ${space} م لكل جانب خارج القاعدة. الجوانب رأسية. بروز النظافة لا يضاف مرة ثانية إلى الحفر.`
          : `Working space is ${space} m each side beyond the footing. Sides are vertical. Blinding projection is not added again to the excavation.`
      );
    }
  } else if (reading.pads.length > 0 || reading.strips.length > 0) {
    lines.push(
      ar
        ? "منسوب الحفر غير مذكور. لم تحسب كمية حفر. على المساح تثبيت منسوب التأسيس."
        : "Excavation depth is not stated. No excavation quantity is included. The QS should confirm the formation level."
    );
  }
  if (reading.blinding) {
    lines.push(
      ar
        ? `خرسانة النظافة سمك ${reading.blinding.thicknessMm} مم بدرجة ${reading.blinding.grade}، وتبرز ${reading.blinding.projectionMm} مم عن كل جانب. ليست ضمن إجمالي الخرسانة الإنشائية.`
        : `Blinding is ${reading.blinding.thicknessMm} mm ${reading.blinding.grade}, projecting ${reading.blinding.projectionMm} mm each side. It is not included in the structural concrete total.`
    );
  }
  lines.push(
    reading.laps === "none"
      ? ar
        ? "الوصلات: لا توجد حسب الملاحظة. الطول المضاف للوصل = 0."
        : "Laps: none, as stated on the drawing. Lap length added: 0."
      : ar
        ? "الوصلات غير مذكورة. لم يضف طول وصل. على المساح تثبيت طول الوصل قبل طلب الحديد."
        : "Laps are not stated. No lap length was added. The QS should confirm lap length before ordering steel."
  );
  lines.push(
    reading.hooks === "none"
      ? ar
        ? "الخطافات والتكسيح: لا توجد. الأسياخ مستقيمة."
        : "Hooks and bends: none. Bars are straight."
      : ar
        ? "الخطافات غير مذكورة. لم تضف."
        : "Hooks are not stated. None were added."
  );
  lines.push(
    reading.wastagePercent != null
      ? ar
        ? `الهالك: الرسم يذكر أنه غير مشمول. الهالك المضاف = ${reading.wastagePercent}%.`
        : `Wastage: the drawing says none is included. Wastage applied: ${reading.wastagePercent}%.`
      : ar
        ? "نسبة الهالك غير مذكورة. الهالك المضاف = 0%. بدل الهدر عند الطلب (غالبا 2% إلى 5% للحديد) غير داخل في هذه الكميات."
        : "No wastage percentage is stated. Wastage applied: 0%. An ordering allowance (often 2% to 5% for reinforcement) is not included."
  );
  const coverBits: string[] = [];
  if (reading.coverSlabMm != null) coverBits.push(ar ? `البلاطة ${reading.coverSlabMm} مم` : `slab ${reading.coverSlabMm} mm`);
  if (reading.coverFootingMm != null) {
    coverBits.push(ar ? `القواعد ${reading.coverFootingMm} مم` : `footings ${reading.coverFootingMm} mm`);
  }
  if (coverBits.length) {
    lines.push(
      ar
        ? `عدد الأسياخ المستقيمة = الجزء الصحيح لـ (البحر الصافي / التباعد) + 1. البحر الصافي = البعد ناقص غطائين. الغطاء: ${coverBits.join("، ")}. طول السيخ = البحر الصافي.`
        : `Straight bar count = floor(clear span / spacing) + 1. Clear span = member size minus two covers. Covers: ${coverBits.join(", ")}. Bar length = clear span.`
    );
  }
  if (reading.strips.some((strip) => strip.closed)) {
    lines.push(
      ar
        ? "القاعدة الشريطية مغلقة. طول الحديد الطولي = طول المحور بدون خصم الغطاء عند الأطراف، لأن الحلقة ليس لها طرفان. عدد الأسياخ العرضية = تقريب طول المحور على التباعد حتى لا يحسب طرف البداية مرتين."
        : "The strip is a closed centreline. Longitudinal bar length is the centreline, with no end-cover deduction, because the loop has no ends. Transverse bar count is the centreline divided by the spacing, rounded, so the start point is not counted twice."
    );
  }
  if (reading.slabTopNil) {
    lines.push(
      ar
        ? "تسليح البلاطة طبقة سفلية واحدة في الاتجاهين. التسليح العلوي لا شيء حسب الرسم."
        : "Slab reinforcement is one bottom layer, both ways. Top reinforcement is nil on the drawing."
    );
  }
  if (reading.slabs.length > 0) {
    lines.push(
      ar
        ? "خرسانة البلاطة وشدة البطن على المسقط الكامل. الأعمدة لا تخصم من البلاطة، وتقاس وحدها حتى بطن البلاطة."
        : "Slab concrete and soffit formwork are the overall plan. Columns are not deducted from the slab. Columns are measured on their own up to the slab soffit."
    );
  }
  if (reading.columnRebarByOthers) {
    lines.push(
      ar
        ? "حديد الأعمدة مكتوب أنه من قبل الآخرين، وهو غير محصور."
        : "Column reinforcement is marked rebar by others and is not measured."
    );
  }
  const columnGrade = reading.columns.length
    ? new Set(
        [...reading.pads.map((pad) => pad.grade), ...reading.slabs.map((slab) => slab.grade)].filter(Boolean)
      )
    : new Set();
  if (reading.columns.length && columnGrade.size === 1) {
    const grade = [...columnGrade][0];
    lines.push(
      ar
        ? `درجة خرسانة الأعمدة غير مكتوبة على سطر العمود. أخذت ${grade}، وهي درجة البلاطة والقواعد في هذا الرسم.`
        : `Column concrete grade is not written on the column line. It is taken as ${grade}, the grade of the slab and the footings on this drawing.`
    );
  }
  const stated = Object.entries(reading.steelKgPerM).map(([bar, kg]) => `${bar} = ${kg} kg/m`);
  if (stated.length) {
    lines.push(
      ar
        ? `وزن المتر للحديد من الملاحظة: ${stated.join("، ")}.`
        : `Steel unit mass from the notes: ${stated.join(", ")}.`
    );
  }
  return lines;
}

function checks(locale: UiLocale, reading: Reading): string[] {
  const ar = locale === "ar";
  const items = [
    ar
      ? "طابق كل بعد في عمود الحساب مع جدول الرسم قبل اعتماد الحصر."
      : "Check every dimension in the working column against the drawing schedule before using the take-off.",
    ar
      ? "ثبت منسوب التأسيس وفراغ العمل وحالة المياه الجوفية في الموقع."
      : "Confirm the formation level, the working space, and groundwater on site.",
    ar
      ? "ثبت طول الوصل والهالك قبل طلب الحديد. كلاهما صفر في هذا الحصر ما لم ينص الرسم على غير ذلك."
      : "Confirm lap length and wastage before ordering steel. Both are zero in this take-off unless the drawing says otherwise.",
  ];
  if (reading.columnRebarByOthers) {
    items.push(
      ar
        ? "اطلب جدول أسياخ الأعمدة. الحديد والكائنات غير موجودة في هذا الرسم."
        : "Obtain the column bar schedule. Main bars and links are not on this drawing."
    );
  }
  if (reading.slabTopNil) {
    items.push(
      ar
        ? "تأكد أن البلاطة بلا تسليح علوي، كما هو مكتوب."
        : "Confirm the slab has no top steel, as drawn."
    );
  }
  if (reading.openings.length > 0) {
    items.push(
      ar
        ? "تأكد من أبعاد الفتحات، وأن الأكتاف حولها غير مطلوبة في القياس."
        : "Confirm opening sizes, and that reveals are not required in the measurement."
    );
  }
  items.push(
    ar
      ? "عمود الكمية هو ناتج الحساب في السطر نفسه. إذا اختلفا فالحصر غير صالح."
      : "The quantity column is the result of the working on the same line. If they differ, the take-off is not valid."
  );
  return items;
}

function sourceLine(locale: UiLocale, source: ReadSource): string {
  const ar = locale === "ar";
  if (source === "pdf-text") {
    return ar
      ? "قرئت الأبعاد من نص ملف PDF، ثم حسبت الكميات في الكود لا في النموذج."
      : "Dimensions were read from the PDF text, then the quantities were computed in code rather than by the model.";
  }
  if (source === "ocr") {
    return ar
      ? "قرئت الأبعاد من الصورة بالتعرف على النص، ثم حسبت الكميات في الكود. على المساح مطابقة أرقام الجدول مع اللوحة."
      : "Dimensions were read from the image by OCR, then the quantities were computed in code. The QS should match the schedule figures to the sheet.";
  }
  if (source === "model") {
    return ar
      ? "نقل النموذج الأبعاد من الرسم كنص، ثم حسبت الكميات في الكود. على المساح مراجعة كل رقم على اللوحة."
      : "The model transcribed the dimensions from the drawing, and the quantities were computed in code. The QS should check every figure on the sheet.";
  }
  return ar
    ? "لم يقرأ الرسم بما يكفي لحصر يعتمد عليه."
    : "The drawing could not be read well enough for a take-off.";
}

export function renderTakeoff(locale: UiLocale, reading: Reading, items: BoqLine[], source: ReadSource): string {
  const ar = locale === "ar";
  const title = reading.title ? ` ${reading.title}` : "";
  const headers = ar
    ? ["البند", "الوصف", "الوحدة", "الكمية", "طريقة الحساب"]
    : ["Item", "Description", "Unit", "Quantity", "Working"];
  const rows = items.map((item, index) => {
    const cells = [
      String(index + 1),
      describe(locale, item),
      item.unit,
      formatQty(item.quantity),
      item.working,
    ];
    return `| ${cells.join(" | ")} |`;
  });
  const assumptionLines = assumptions(locale, reading).map((item) => `- ${item}`);
  const checkLines = checks(locale, reading).map((item) => `- ${item}`);
  return [
    ar ? `# حصر كميات أولي${title}` : `# First-pass quantity take-off${title}`,
    "",
    sourceLine(locale, source),
    "",
    ar ? "## جدول الكميات" : "## Bill of quantities",
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows,
    "",
    ar ? "## الافتراضات" : "## Assumptions",
    "",
    ...assumptionLines,
    "",
    ar ? "## ما يراجعه المساح" : "## What the QS should check",
    "",
    ...checkLines,
    "",
  ].join("\n");
}
