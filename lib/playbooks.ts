import type { AdvisorId } from "@/lib/advisors";
import type { Locale } from "@/lib/i18n/types";

export type PlaybookGroup = "controls" | "procurement" | "program" | "execution" | "capital";

export type Playbook = {
  id: string;
  advisorId: AdvisorId;
  /** Set on PMO so project controls and procurement render as separate groups. */
  group?: PlaybookGroup;
  templates: Record<Locale, string>;
};

const PROCUREMENT_IDS = new Set(["vendor", "tbe", "rfq", "long-lead", "iktva"]);
const EXECUTION_IDS = new Set([
  "schedule-health",
  "cost-health",
  "risk-health",
  "quality-health",
]);

function playbookGroup(advisorId: AdvisorId, id: string): PlaybookGroup | undefined {
  if (advisorId === "pmo") return PROCUREMENT_IDS.has(id) ? "procurement" : "controls";
  if (advisorId === "assurance") return EXECUTION_IDS.has(id) ? "execution" : "program";
  if (advisorId === "decision" && id === "capital-assessment") return "capital";
  return undefined;
}

function enReport(title: string, findings: string) {
  return `# ${title}

## 1. Executive summary
- Purpose:
- Overall RAG (Red / Amber / Green):
- Why this rating:
- Recommended action:
- What the files do not support:

## 2. Findings
${findings.trim()}

## 3. Evidence and gaps
| Item | Source file | Status | Gap |
| --- | --- | --- | --- |
`;
}

function arReport(title: string, findings: string) {
  return `# ${title}

## 1. الملخص التنفيذي
- الغرض:
- RAG الإجمالي (أحمر / كهرماني / أخضر):
- سبب التقييم:
- الإجراء الموصى به:
- ما لا تدعمه الملفات:

## 2. النتائج
${findings.trim()}

## 3. الأدلة والفجوات
| البند | ملف المصدر | الحالة | الفجوة |
| --- | --- | --- | --- |
`;
}

function pack(
  advisorId: AdvisorId,
  id: string,
  enTitle: string,
  enFindings: string,
  arTitle: string,
  arFindings: string
): Playbook {
  return {
    id,
    advisorId,
    group: playbookGroup(advisorId, id),
    templates: {
      en: enReport(enTitle, enFindings),
      ar: arReport(arTitle, arFindings),
    },
  };
}

export const PLAYBOOKS: readonly Playbook[] = [
  pack(
    "pmo",
    "charter",
    "Project Charter",
    `
| Field | Value |
| --- | --- |
| Project / package | |
| Sponsor | |
| Project manager | |
| Objective | |
| Scope in (inside battery limits) | |
| Scope out (OSBL, for Program Assurance) | |
| Success measures | |
| Milestone outline | |
| Budget reference | |
| Key constraints | |
| Approvals required | |

| Charter area | RAG | Reason |
| --- | --- | --- |
| Objectives | | |
| Scope | | |
| Schedule outline | | |
| Cost reference | | |
| Governance | | |
`,
    "ميثاق المشروع",
    `
| الحقل | القيمة |
| --- | --- |
| المشروع / الحزمة | |
| الراعي | |
| مدير المشروع | |
| الهدف | |
| داخل النطاق (داخل حدود المشروع) | |
| خارج النطاق (خارج حدود المشروع، لضمان البرنامج) | |
| مقاييس النجاح | |
| معالم مختصرة | |
| مرجع الميزانية | |
| القيود الرئيسية | |
| الموافقات المطلوبة | |

| مجال الميثاق | RAG | السبب |
| --- | --- | --- |
| الأهداف | | |
| النطاق | | |
| مخطط الجدول | | |
| مرجع التكلفة | | |
| الحوكمة | | |
`
  ),
  pack(
    "pmo",
    "status",
    "Monthly Status Report",
    `
| Item | This period | Plan | Variance | RAG |
| --- | --- | --- | --- | --- |
| Schedule | | | | |
| Cost | | | | |
| Scope | | | | |
| Risk | | | | |
| Decisions | | | | |

- Accomplishments:
- Planned next period:
- Decisions needed:
`,
    "تقرير الحالة الشهري",
    `
| البند | هذه الفترة | الخطة | الانحراف | RAG |
| --- | --- | --- | --- | --- |
| الجدول | | | | |
| التكلفة | | | | |
| النطاق | | | | |
| المخاطر | | | | |
| القرارات | | | | |

- ما أنجز:
- المخطط للفترة التالية:
- القرارات المطلوبة:
`
  ),
  pack(
    "pmo",
    "risk",
    "Risk Register",
    `
| ID | Risk | Cause | Impact | Likelihood | Score | Owner | Response | Status | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Band | Count | Top item |
| --- | --- | --- |
| Red | | |
| Amber | | |
| Green | | |
`,
    "سجل المخاطر",
    `
| المعرف | الخطر | السبب | الأثر | الاحتمال | الدرجة | المالك | الاستجابة | الحالة | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| النطاق | العدد | أبرز بند |
| --- | --- | --- |
| أحمر | | |
| كهرماني | | |
| أخضر | | |
`
  ),
  pack(
    "pmo",
    "schedule",
    "Schedule Health Check",
    `
| Check | Evidence | Result | RAG |
| --- | --- | --- | --- |
| Battery limit (inside battery limits) | | | |
| Logic and predecessors | | | |
| Critical path | | | |
| Float on key activities | | | |
| Milestone dates | | | |
| Baseline variance | | | |
| Missing dates or owners | | | |

- Health statement:
- Activities that need recovery:
`,
    "فحص صحة الجدول",
    `
| الفحص | الدليل | النتيجة | RAG |
| --- | --- | --- | --- |
| حدود المشروع (داخل حدود المشروع) | | | |
| المنطق والأنشطة السابقة | | | |
| المسار الحرج | | | |
| الهامش على الأنشطة الرئيسية | | | |
| تواريخ المعالم | | | |
| الانحراف عن الخط المرجعي | | | |
| تواريخ أو ملاك ناقصون | | | |

- بيان الصحة:
- الأنشطة التي تحتاج استعادة:
`
  ),
  pack(
    "pmo",
    "raci",
    "RACI",
    `
| Activity | Responsible | Accountable | Consulted | Informed | RAG |
| --- | --- | --- | --- | --- | --- |

- Activities with no single Accountable:
- Activities with no Responsible:
`,
    "مصفوفة RACI",
    `
| النشاط | المنفذ | المسؤول | يستشار | يبلغ | RAG |
| --- | --- | --- | --- | --- | --- |

- أنشطة بلا مسؤول واحد:
- أنشطة بلا منفذ:
`
  ),
  pack(
    "pmo",
    "cost",
    "Cost Report",
    `
| Cost element | Baseline | Forecast | Variance | Commitment | RAG |
| --- | --- | --- | --- | --- | --- |
| Direct cost | | | | | |
| Indirect cost | | | | | |
| Procurement commitments | | | | | |
| Contingency | | | | | |

- Cost baseline source:
- Figures marked Not provided:
`,
    "تقرير التكلفة",
    `
| عنصر التكلفة | خط الأساس | التوقع | الانحراف | الالتزام | RAG |
| --- | --- | --- | --- | --- | --- |
| التكلفة المباشرة | | | | | |
| التكلفة غير المباشرة | | | | | |
| التزامات المشتريات | | | | | |
| الاحتياطي | | | | | |

- مصدر خط أساس التكلفة:
- أرقام معلمة غير متوفرة:
`
  ),
  pack(
    "assurance",
    "stage-gate",
    "Stage-Gate Review",
    `
| Criterion | ISBL evidence | OSBL / interface evidence | Finding | RAG |
| --- | --- | --- | --- | --- |
| Scope and battery limit | | | | |
| Utilities and demand | | | | |
| Stakeholders and external dependencies | | | | |
| Cost and schedule assurance | | | | |

- Gate:
- Projects in the program covered:
- Decision supported: proceed / proceed with conditions / hold / recycle
- Conditions:
`,
    "مراجعة بوابة المرحلة",
    `
| المعيار | دليل داخل حدود المشروع | دليل خارج حدود المشروع / الواجهة | الملاحظة | RAG |
| --- | --- | --- | --- | --- |
| النطاق وحدود المشروع | | | | |
| المنافع والطلب | | | | |
| أصحاب المصلحة والاعتمادات الخارجية | | | | |
| ضمان التكلفة والجدول | | | | |

- البوابة:
- المشاريع المشمولة في البرنامج:
- القرار المدعوم: متابعة / متابعة بشروط / إيقاف / إعادة
- الشروط:
`
  ),
  pack(
    "assurance",
    "interface",
    "Interface Register",
    `
| ID | Interface | Type (utility / demand / stakeholder / external) | From | To | Battery limit | Need date | Owner | Status | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- Interfaces that cross the battery limit:
- Interfaces with no owner:
`,
    "سجل الواجهات",
    `
| المعرف | الواجهة | النوع (منفعة / طلب / صاحب مصلحة / خارجي) | من | إلى | حدود المشروع | تاريخ الحاجة | المالك | الحالة | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- واجهات تعبر حدود المشروع:
- واجهات بلا مالك:
`
  ),
  pack(
    "assurance",
    "stakeholder",
    "Stakeholder Map",
    `
| Stakeholder | Interest | Influence | Inside or outside battery limit | Expectation | Owner | Engagement | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- Stakeholders who can change a gate decision:
- Stakeholders with no named owner:
`,
    "خريطة أصحاب المصلحة",
    `
| صاحب المصلحة | الاهتمام | التأثير | داخل أو خارج حدود المشروع | التوقع | المالك | المشاركة | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- أصحاب مصلحة يمكنهم تغيير قرار البوابة:
- أصحاب مصلحة بلا مالك مسمى:
`
  ),
  pack(
    "assurance",
    "osbl",
    "OSBL Dependency Tracker",
    `
| ID | Dependency | Provider | What the project needs | Need date | Promised | Impact if late | Owner | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Utility | | | | | | | | |
| Demand | | | | | | | | |
| Third party / external project | | | | | | | | |

- Dependencies outside the battery limit:
- Dependencies that can move the ISBL schedule:
`,
    "متابعة اعتمادات خارج حدود المشروع",
    `
| المعرف | الاعتماد | المزود | ما يحتاجه المشروع | تاريخ الحاجة | الموعود | الأثر إذا تأخر | المالك | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| منفعة | | | | | | | | |
| طلب | | | | | | | | |
| طرف ثالث / مشروع خارجي | | | | | | | | |

- اعتمادات خارج حدود المشروع:
- اعتمادات يمكنها تحريك جدول داخل حدود المشروع:
`
  ),
  pack(
    "assurance",
    "assurance-review",
    "Assurance Review",
    `
| Area | Scope (program / project / OSBL) | Evidence | Finding | Owner | RAG |
| --- | --- | --- | --- | --- | --- |
| Program governance | | | | | |
| Cross-project interfaces | | | | | |
| Utilities and demand | | | | | |
| External dependencies | | | | | |
| Stage-gate readiness | | | | | |

- Assurance opinion:
- Conditions before the next gate:
`,
    "مراجعة الضمان",
    `
| المجال | النطاق (البرنامج / المشروع / خارج حدود المشروع) | الدليل | الملاحظة | المالك | RAG |
| --- | --- | --- | --- | --- | --- |
| حوكمة البرنامج | | | | | |
| الواجهات بين المشاريع | | | | | |
| المنافع والطلب | | | | | |
| الاعتمادات الخارجية | | | | | |
| جاهزية بوابة المرحلة | | | | | |

- رأي الضمان:
- الشروط قبل البوابة التالية:
`
  ),
  pack(
    "assurance",
    "delivery-audit",
    "Delivery Audit Report",
    `
| ID | Area (project / technical / quality / compliance) | Finding | Requirement in the file | Evidence of execution | Severity | Recommendation | Owner | Due | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- Delivery audit opinion (execution only):
- This report does not cover capital governance, financial or strategy alignment, or board-level investment findings:
`,
    "تقرير تدقيق التسليم",
    `
| المعرف | المجال (مشروع / فني / جودة / امتثال) | الملاحظة | المتطلب في الملف | دليل التنفيذ | الشدة | التوصية | المالك | الاستحقاق | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- رأي تدقيق التسليم (التنفيذ فقط):
- هذا التقرير لا يغطي حوكمة رأس المال أو المواءمة المالية أو الاستراتيجية أو ملاحظات الاستثمار على مستوى المجلس:
`
  ),
  pack(
    "assurance",
    "schedule-health",
    "Schedule Health",
    `
| Project | Milestone | Baseline | Forecast | Variance | Interface that moves it | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| Program roll-up | Finish | Variance | RAG |
| --- | --- | --- | --- |

- Projects driving the program finish:
- OSBL dependencies moving an inside-battery-limit date:
`,
    "صحة الجدول",
    `
| المشروع | المعلم | خط الأساس | التوقع | الانحراف | الواجهة التي تحركه | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| تجميع البرنامج | النهاية | الانحراف | RAG |
| --- | --- | --- | --- |

- المشاريع التي تقود نهاية البرنامج:
- اعتمادات خارج حدود المشروع تحرك تاريخا داخل حدود المشروع:
`
  ),
  pack(
    "assurance",
    "cost-health",
    "Cost Health",
    `
| Project | Baseline | Forecast | Variance | Contingency left | RAG |
| --- | --- | --- | --- | --- | --- |

| Program roll-up | Baseline | Forecast | Variance | RAG |
| --- | --- | --- | --- | --- |

- Projects driving the variance:
- Figures marked Not provided:
`,
    "صحة التكلفة",
    `
| المشروع | خط الأساس | التوقع | الانحراف | الاحتياطي المتبقي | RAG |
| --- | --- | --- | --- | --- | --- |

| تجميع البرنامج | خط الأساس | التوقع | الانحراف | RAG |
| --- | --- | --- | --- | --- |

- المشاريع التي تقود الانحراف:
- أرقام معلمة غير متوفرة:
`
  ),
  pack(
    "assurance",
    "risk-health",
    "Risk Health",
    `
| Project | Top risk | Score | Owner | Response | Cross-project impact | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| Band | Count | Top item |
| --- | --- | --- |
| Red | | |
| Amber | | |
| Green | | |

- Risks that cross more than one project:
`,
    "صحة المخاطر",
    `
| المشروع | أبرز خطر | الدرجة | المالك | الاستجابة | الأثر عبر المشاريع | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| النطاق | العدد | أبرز بند |
| --- | --- | --- |
| أحمر | | |
| كهرماني | | |
| أخضر | | |

- مخاطر تعبر أكثر من مشروع:
`
  ),
  pack(
    "assurance",
    "quality-health",
    "Quality Health",
    `
| Project | Quality area | Evidence | Finding | Owner | RAG |
| --- | --- | --- | --- | --- | --- |
|  | Design | | | | |
|  | Inspection / ITP | | | | |
|  | NCR or punch trend | | | | |
|  | Handover quality | | | | |

- Quality issues that repeat across projects:
`,
    "صحة الجودة",
    `
| المشروع | مجال الجودة | الدليل | الملاحظة | المالك | RAG |
| --- | --- | --- | --- | --- | --- |
|  | التصميم | | | | |
|  | الفحص / خطة الفحص | | | | |
|  | اتجاه عدم المطابقة أو النواقص | | | | |
|  | جودة التسليم | | | | |

- مسائل جودة تتكرر عبر المشاريع:
`
  ),
  pack(
    "decision",
    "options",
    "Investment and Options Analysis",
    `
| Option | Investment case | Strategic fit | CAPEX note | OPEX note | Pros | Cons | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- Decision question:
- Include defer or do nothing when it is a real alternative:
- Readiness of the option set:
`,
    "تحليل الاستثمار والخيارات",
    `
| الخيار | حالة الاستثمار | الملاءمة الاستراتيجية | ملاحظة النفقات الرأسمالية | ملاحظة النفقات التشغيلية | المزايا | العيوب | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- سؤال القرار:
- تضمين التأجيل أو عدم الفعل عندما يكون بديلا حقيقيا:
- جاهزية مجموعة الخيارات:
`
  ),
  pack(
    "decision",
    "mcda",
    "MCDA Matrix",
    `
| Criterion | Weight | Option A | Option B | Option C |
| --- | --- | --- | --- | --- |
| Weighted total | 100 | | | |

- Scale used:
- Weights sum to 100:
- Data-quality RAG:
- Leading option on the weighted total:
`,
    "مصفوفة القرار متعددة المعايير",
    `
| المعيار | الوزن | الخيار أ | الخيار ب | الخيار ج |
| --- | --- | --- | --- | --- |
| المجموع المرجح | 100 | | | |

- المقياس المستخدم:
- مجموع الأوزان 100:
- RAG لجودة البيانات:
- الخيار المتقدم حسب المجموع المرجح:
`
  ),
  pack(
    "decision",
    "brief",
    "Executive Decision Brief",
    `
| Item | Content |
| --- | --- |
| Decision required | |
| Decision owner | |
| Needed by | |
| Constraints | |
| Preferred option | |
| Conditions | |
| What would change the decision | |
| Ask of the executive | |

| Option | Why it wins or loses | RAG |
| --- | --- | --- |
`,
    "مذكرة قرار تنفيذية",
    `
| البند | المحتوى |
| --- | --- |
| القرار المطلوب | |
| صاحب القرار | |
| مطلوب قبل | |
| القيود | |
| الخيار المفضل | |
| الشروط | |
| ما الذي يغير القرار | |
| المطلوب من التنفيذي | |

| الخيار | لماذا يتقدم أو يتراجع | RAG |
| --- | --- | --- |
`
  ),
  pack(
    "decision",
    "capital-assessment",
    "Capital Projects Assessment",
    `
| Item | Content |
| --- | --- |
| Business case | |
| CAPEX estimate | |
| OPEX estimate | |
| Preferred option | |
| Stage-gate decision (go / no-go / hold) | |
| Conditions | |

| Feasibility | Finding | Evidence | RAG |
| --- | --- | --- | --- |
| Technical | | | |
| Commercial | | | |
| Schedule | | | |

| Funding mechanism | Applicable | Amount or share | Evidence | Gap | RAG |
| --- | --- | --- | --- | --- | --- |
| Equity | | | | | |
| Project finance | | | | | |
| PPP | | | | | |
| Government / PIF funding | | | | | |
| Grants | | | | | |

| Alignment | Expectation | Fit | Evidence | RAG |
| --- | --- | --- | --- | --- |
| Strategy | | | | |
| Customer | | | | |

| Option | CAPEX | OPEX | Benefit | Strategic fit | RAG |
| --- | --- | --- | --- | --- | --- |
| Do nothing | | | | | |
| Recommended | | | | | |
| Alternative | | | | | |

- Gate decision:
- What would reverse the decision:
- Figures and funding amounts marked Not provided:
`,
    "تقييم المشاريع الرأسمالية",
    `
| البند | المحتوى |
| --- | --- |
| دراسة الجدوى | |
| تقدير النفقات الرأسمالية | |
| تقدير النفقات التشغيلية | |
| الخيار المفضل | |
| قرار بوابة المرحلة (متابعة / عدم متابعة / إيقاف) | |
| الشروط | |

| الجدوى | الملاحظة | الدليل | RAG |
| --- | --- | --- | --- |
| فنية | | | |
| تجارية | | | |
| الجدول | | | |

| آلية التمويل | تنطبق | المبلغ أو الحصة | الدليل | الفجوة | RAG |
| --- | --- | --- | --- | --- | --- |
| حقوق الملكية | | | | | |
| تمويل المشاريع | | | | | |
| شراكة بين القطاعين | | | | | |
| تمويل حكومي / صندوق الاستثمارات العامة | | | | | |
| المنح | | | | | |

| المواءمة | التوقع | الملاءمة | الدليل | RAG |
| --- | --- | --- | --- | --- |
| الاستراتيجية | | | | |
| العميل | | | | |

| الخيار | النفقات الرأسمالية | النفقات التشغيلية | العائد | الملاءمة الاستراتيجية | RAG |
| --- | --- | --- | --- | --- | --- |
| عدم الفعل | | | | | |
| الموصى به | | | | | |
| البديل | | | | | |

- قرار البوابة:
- ما الذي يعكس القرار:
- الأرقام ومبالغ التمويل المعلمة غير متوفرة:
`
  ),
  pack(
    "decision",
    "capex-opex",
    "CAPEX and OPEX Evaluation",
    `
| Case | CAPEX | OPEX (annual) | Life | Source in the file | Note | RAG |
| --- | --- | --- | --- | --- | --- | --- |
| Base | | | | | | |
| Alternative | | | | | | |

| Cost class | Included | Figure | Gap |
| --- | --- | --- | --- |
| Direct CAPEX | | | |
| Indirect CAPEX | | | |
| Contingency | | | |
| Fixed OPEX | | | |
| Variable OPEX | | | |

- Figures taken from the source:
- Figures marked Not provided:
`,
    "تقييم النفقات الرأسمالية والتشغيلية",
    `
| الحالة | النفقات الرأسمالية | النفقات التشغيلية (سنوي) | العمر | المصدر في الملف | ملاحظة | RAG |
| --- | --- | --- | --- | --- | --- | --- |
| الأساس | | | | | | |
| البديل | | | | | | |

| فئة التكلفة | مضمنة | الرقم | الفجوة |
| --- | --- | --- | --- |
| رأسمالية مباشرة | | | |
| رأسمالية غير مباشرة | | | |
| احتياطي | | | |
| تشغيلية ثابتة | | | |
| تشغيلية متغيرة | | | |

- الأرقام المأخوذة من المصدر:
- الأرقام المعلمة غير متوفرة:
`
  ),
  pack(
    "decision",
    "strategy",
    "Strategy and Governance Alignment",
    `
| Decision | Strategy objective | Governance forum | Alignment | Evidence | RAG |
| --- | --- | --- | --- | --- | --- |
| Investment | | | | | |
| Scope | | | | | |
| Schedule | | | | | |
| Risk appetite | | | | | |

- Approvals the governance forum must give:
- Misalignment that conditions the decision:
`,
    "المواءمة مع الاستراتيجية والحوكمة",
    `
| القرار | الهدف الاستراتيجي | منتدى الحوكمة | المواءمة | الدليل | RAG |
| --- | --- | --- | --- | --- | --- |
| الاستثمار | | | | | |
| النطاق | | | | | |
| الجدول | | | | | |
| شهية المخاطر | | | | | |

- الموافقات التي يجب أن يمنحها منتدى الحوكمة:
- عدم المواءمة الذي يضع شرطا على القرار:
`
  ),
  pack(
    "decision",
    "governance-audit",
    "Governance and Investment Audit",
    `
| ID | Finding | Area (capital governance / financial / strategy alignment / board) | Severity | Recommendation | Owner | Due | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- Governance and investment audit opinion:
- Board-level findings that should condition the capital decision:
- This audit does not cover project, technical, quality, or compliance audits of execution:
`,
    "تدقيق الحوكمة والاستثمار",
    `
| المعرف | الملاحظة | المجال (حوكمة رأس المال / مالي / مواءمة استراتيجية / مجلس) | الشدة | التوصية | المالك | الاستحقاق | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- رأي تدقيق الحوكمة والاستثمار:
- ملاحظات على مستوى المجلس يجب أن تشرط القرار الرأسمالي:
- هذا التدقيق لا يغطي تدقيق المشروع أو الفني أو الجودة أو الامتثال للتنفيذ:
`
  ),
  pack(
    "pmo",
    "vendor",
    "Vendor Evaluation",
    `
| Criterion | Weight | Vendor A | Vendor B | Vendor C | Pass / fail |
| --- | --- | --- | --- | --- | --- |
| Technical capability | | | | | |
| Quality system | | | | | |
| Relevant experience | | | | | |
| Capacity | | | | | |
| HSE | | | | | |
| Local content (IKTVA) | | | | | |
| Financial standing | | | | | |

| Vendor | Prequalification result | RAG | Reason |
| --- | --- | --- | --- |
`,
    "تقييم الموردين",
    `
| المعيار | الوزن | المورد أ | المورد ب | المورد ج | ناجح / راسب |
| --- | --- | --- | --- | --- | --- |
| القدرة الفنية | | | | | |
| نظام الجودة | | | | | |
| الخبرة ذات الصلة | | | | | |
| الطاقة الإنتاجية | | | | | |
| السلامة | | | | | |
| المحتوى المحلي (اكتفاء) | | | | | |
| الوضع المالي | | | | | |

| المورد | نتيجة التأهيل | RAG | السبب |
| --- | --- | --- | --- |
`
  ),
  pack(
    "pmo",
    "tbe",
    "Technical Bid Evaluation",
    `
| Criterion | Weight | Bidder A | Bidder B | Bidder C | Compliance |
| --- | --- | --- | --- | --- | --- |

| Bidder | Technical score | Deviations | Clarifications | Technically acceptable | RAG |
| --- | --- | --- | --- | --- | --- |

- Commercial prices are out of this technical evaluation unless the file mixes them:
- Recommendation for the commercial step:
`,
    "التقييم الفني للعروض",
    `
| المعيار | الوزن | مقدم العرض أ | مقدم العرض ب | مقدم العرض ج | الامتثال |
| --- | --- | --- | --- | --- | --- |

| مقدم العرض | الدرجة الفنية | الانحرافات | الاستيضاحات | مقبول فنيا | RAG |
| --- | --- | --- | --- | --- | --- |

- الأسعار التجارية خارج هذا التقييم الفني ما لم يخلطها الملف:
- التوصية للخطوة التجارية:
`
  ),
  pack(
    "pmo",
    "long-lead",
    "Long-Lead Tracker",
    `
| Item | Supplier | PO / RFQ | Need date | Promised date | Float (days) | Expediting action | Logistics risk | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

- Items with negative or thin float:
- Expediting actions this period:
`,
    "متابعة المواد طويلة التوريد",
    `
| البند | المورد | أمر الشراء / طلب العرض | تاريخ الحاجة | التاريخ الموعود | الهامش (أيام) | إجراء التعجيل | مخاطر اللوجستيات | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

- بنود بهامش سالب أو ضيق:
- إجراءات التعجيل في هذه الفترة:
`
  ),
  pack(
    "pmo",
    "rfq",
    "RFQ / RFP Package",
    `
| Package element | Included | Gap | Owner |
| --- | --- | --- | --- |
| Scope of supply | | | |
| Technical requirements | | | |
| Data sheets / specifications | | | |
| Delivery and incoterms | | | |
| QA/QC and ITP | | | |
| Local content (IKTVA) questions | | | |
| Bid submission instructions | | | |
| Evaluation criteria | | | |

| Package | Ready to issue | RAG | Reason |
| --- | --- | --- | --- |
`,
    "حزمة طلب العرض",
    `
| عنصر الحزمة | مضمن | الفجوة | المالك |
| --- | --- | --- | --- |
| نطاق التوريد | | | |
| المتطلبات الفنية | | | |
| أوراق البيانات / المواصفات | | | |
| التسليم وشروط التجارة | | | |
| الجودة وخطة الفحص | | | |
| أسئلة المحتوى المحلي (اكتفاء) | | | |
| تعليمات تقديم العرض | | | |
| معايير التقييم | | | |

| الحزمة | جاهزة للإصدار | RAG | السبب |
| --- | --- | --- | --- |
`
  ),
  pack(
    "pmo",
    "iktva",
    "IKTVA",
    `
| Package / vendor | IKTVA plan | Target % | Evidenced % | Gap | Owner | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| Local-content element | Evidence in the file | Status | Gap |
| --- | --- | --- | --- |
| Workforce localization | | | |
| Goods manufactured in KSA | | | |
| Services sourced in KSA | | | |
| Supplier development / training | | | |

- Score stated in the file:
- Score not claimed because the file does not state it:
`,
    "اكتفاء",
    `
| الحزمة / المورد | خطة اكتفاء | النسبة المستهدفة | النسبة الموثقة | الفجوة | المالك | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| عنصر المحتوى المحلي | الدليل في الملف | الحالة | الفجوة |
| --- | --- | --- | --- |
| توطين القوى العاملة | | | |
| السلع المصنعة في المملكة | | | |
| الخدمات من مصادر محلية | | | |
| تطوير الموردين / التدريب | | | |

- الدرجة المذكورة في الملف:
- درجة غير واردة لأن الملف لا يذكرها:
`
  ),
  pack(
    "operations",
    "testing",
    "Testing and Pre-commissioning",
    `
| System | Test type | Procedure | Result | Open defects | Owner | Ready for next step | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

| Step | Predecessor complete | Evidence | RAG |
| --- | --- | --- | --- |
| Mechanical completion | | | |
| Pre-commissioning | | | |
| Ready for commissioning | | | |

- Tests the file records:
- Tests still open:
`,
    "الاختبار وما قبل التشغيل التجريبي",
    `
| النظام | نوع الاختبار | الإجراء | النتيجة | العيوب المفتوحة | المالك | جاهز للخطوة التالية | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

| الخطوة | السابق مكتمل | الدليل | RAG |
| --- | --- | --- | --- |
| الإكمال الميكانيكي | | | |
| ما قبل التشغيل التجريبي | | | |
| الجاهزية للتشغيل التجريبي | | | |

- الاختبارات التي يسجلها الملف:
- الاختبارات التي ما زالت مفتوحة:
`
  ),
  pack(
    "operations",
    "handover",
    "Mechanical Completion and Handover Dossiers",
    `
| System / package | MC certificate | Open punch | Owner | Ready for handover | RAG |
| --- | --- | --- | --- | --- | --- |

| Handover item | Included | Gap | Owner |
| --- | --- | --- | --- |
| Mechanical completion certificate | | | |
| As-built drawings | | | |
| Test and inspection records | | | |
| Vendor dossiers | | | |
| Spare parts list | | | |
| Punch list closed or accepted | | | |
`,
    "الإكمال الميكانيكي وملفات التسليم",
    `
| النظام / الحزمة | شهادة الإكمال | نواقص مفتوحة | المالك | جاهز للتسليم | RAG |
| --- | --- | --- | --- | --- | --- |

| بند التسليم | مضمن | الفجوة | المالك |
| --- | --- | --- | --- |
| شهادة الإكمال الميكانيكي | | | |
| مخططات كما نفذ | | | |
| سجلات الاختبار والفحص | | | |
| ملفات الموردين | | | |
| قائمة قطع الغيار | | | |
| قائمة النواقص مغلقة أو مقبولة | | | |
`
  ),
  pack(
    "operations",
    "commissioning",
    "Commissioning Plan",
    `
| System | Pre-commissioning | Commissioning | Need date | Owner | Constraint | Ready for start-up | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Utilities | | | | | | | |
| Process | | | | | | | |
| Safety systems | | | | | | | |

| Milestone | Planned | Forecast | Predecessor | RAG |
| --- | --- | --- | --- | --- |
| Mechanical completion | | | | |
| Pre-commissioning complete | | | | |
| Commissioning complete | | | | |
| Ready for start-up | | | | |
`,
    "خطة التشغيل التجريبي",
    `
| النظام | ما قبل التشغيل التجريبي | التشغيل التجريبي | تاريخ الحاجة | المالك | القيد | جاهز للبدء | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |
| المنافع | | | | | | | |
| العملية | | | | | | | |
| أنظمة السلامة | | | | | | | |

| المعلم | المخطط | المتوقع | السابق | RAG |
| --- | --- | --- | --- | --- |
| الإكمال الميكانيكي | | | | |
| اكتمال ما قبل التشغيل التجريبي | | | | |
| اكتمال التشغيل التجريبي | | | | |
| الجاهزية للبدء | | | | |
`
  ),
  pack(
    "operations",
    "startup",
    "Start-up and Regularisation of Operation",
    `
| System | Start-up date | Steady-state date | Performance test | Result | Owner | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| Operating KPI | Target | Actual | Period | Owner | RAG |
| --- | --- | --- | --- | --- | --- |

| Warranty / defects item | Opened | Due | Owner | Status | Blocks steady state | RAG |
| --- | --- | --- | --- | --- | --- | --- |

- Transition to steady-state operations:
- Performance tests still open:
- Warranty / defects period end:
`,
    "بدء وانتظام التشغيل",
    `
| النظام | تاريخ البدء | تاريخ التشغيل المستقر | اختبار الأداء | النتيجة | المالك | RAG |
| --- | --- | --- | --- | --- | --- | --- |

| مؤشر التشغيل | المستهدف | الفعلي | الفترة | المالك | RAG |
| --- | --- | --- | --- | --- | --- |

| بند الضمان / العيوب | تاريخ الفتح | الاستحقاق | المالك | الحالة | يعوق الاستقرار | RAG |
| --- | --- | --- | --- | --- | --- | --- |

- الانتقال إلى التشغيل المستقر:
- اختبارات الأداء التي ما زالت مفتوحة:
- نهاية فترة الضمان والعيوب:
`
  ),
  pack(
    "operations",
    "om",
    "O&M Readiness",
    `
| Area | Item | Required | Available | Gap | Owner | RAG |
| --- | --- | --- | --- | --- | --- | --- |
| Spares | Critical spares | | | | | |
| Spares | Consumables | | | | | |
| Procedures | Operating procedures | | | | | |
| Procedures | Maintenance procedures | | | | | |
| Training | Training matrix | | | | | |
| Training | Competency evidence | | | | | |
| Maintenance | Asset register and criticality | | | | | |
| Maintenance | Preventive maintenance loaded | | | | | |

| Role | Training required | People trained | Gap | RAG |
| --- | --- | --- | --- | --- |
`,
    "جاهزية التشغيل والصيانة",
    `
| المجال | البند | المطلوب | المتاح | الفجوة | المالك | RAG |
| --- | --- | --- | --- | --- | --- | --- |
| قطع الغيار | قطع الغيار الحرجة | | | | | |
| قطع الغيار | المواد المستهلكة | | | | | |
| الإجراءات | إجراءات التشغيل | | | | | |
| الإجراءات | إجراءات الصيانة | | | | | |
| التدريب | مصفوفة التدريب | | | | | |
| التدريب | دليل الكفاءة | | | | | |
| الصيانة | سجل الأصول والحرجية | | | | | |
| الصيانة | الصيانة الوقائية محملة | | | | | |

| الدور | التدريب المطلوب | من تدرب | الفجوة | RAG |
| --- | --- | --- | --- | --- |
`
  ),
  pack(
    "operations",
    "punch",
    "Punch List Tracker",
    `
| ID | System | Description | Category (A / B / C) | Owner | Due | Status | Blocks handover | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Category | Open | Closed | Blocking handover | RAG |
| --- | --- | --- | --- | --- |
| A | | | | |
| B | | | | |
| C | | | | |
`,
    "متابعة قائمة النواقص",
    `
| المعرف | النظام | الوصف | الفئة (أ / ب / ج) | المالك | الاستحقاق | الحالة | يعوق التسليم | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

| الفئة | مفتوح | مغلق | يعوق التسليم | RAG |
| --- | --- | --- | --- | --- |
| أ | | | | |
| ب | | | | |
| ج | | | | |
`
  ),
  pack(
    "operations",
    "alignment",
    "Permits, Offtakers, and Capacity",
    `
| Party | Topic | Requirement | Evidence | Gap | Owner | RAG |
| --- | --- | --- | --- | --- | --- | --- |
| Regulator / permit | | | | | | |
| Customer / offtaker | | | | | | |
| Capacity (nameplate or contracted) | | | | | | |

| Alignment item | Status | Impact on startup or handover | RAG |
| --- | --- | --- | --- |
| Permits in force | | | |
| Offtake conditions | | | |
| Capacity match | | | |
`,
    "التصاريح والمستلمون والطاقة",
    `
| الطرف | الموضوع | المتطلب | الدليل | الفجوة | المالك | RAG |
| --- | --- | --- | --- | --- | --- | --- |
| الجهة المنظمة / التصريح | | | | | | |
| العميل / المستلم | | | | | | |
| الطاقة (الاسمية أو المتعاقد عليها) | | | | | | |

| بند المواءمة | الحالة | الأثر على البدء أو التسليم | RAG |
| --- | --- | --- | --- |
| التصاريح سارية | | | |
| شروط الاستلام | | | |
| مطابقة الطاقة | | | |
`
  ),
];

const BY_ADVISOR = new Map<AdvisorId, Playbook[]>();
for (const playbook of PLAYBOOKS) {
  const list = BY_ADVISOR.get(playbook.advisorId) ?? [];
  list.push(playbook);
  BY_ADVISOR.set(playbook.advisorId, list);
}

const PLAYBOOK_ORDER: Partial<Record<AdvisorId, readonly string[]>> = {
  pmo: [
    "charter",
    "schedule",
    "cost",
    "risk",
    "raci",
    "status",
    "vendor",
    "tbe",
    "rfq",
    "long-lead",
    "iktva",
  ],
  assurance: [
    "interface",
    "stakeholder",
    "osbl",
    "stage-gate",
    "assurance-review",
    "delivery-audit",
    "schedule-health",
    "cost-health",
    "risk-health",
    "quality-health",
  ],
  operations: ["testing", "handover", "commissioning", "startup", "punch", "alignment", "om"],
  decision: ["capital-assessment", "capex-opex", "strategy", "governance-audit", "options", "mcda", "brief"],
};

for (const [advisorId, order] of Object.entries(PLAYBOOK_ORDER)) {
  const list = BY_ADVISOR.get(advisorId as AdvisorId);
  if (!list || !order) continue;
  list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function playbooksFor(advisorId: AdvisorId): readonly Playbook[] {
  return BY_ADVISOR.get(advisorId) ?? [];
}

export function groupedPlaybooks(
  advisorId: AdvisorId
): { group: PlaybookGroup | null; playbooks: Playbook[] }[] {
  const groups: { group: PlaybookGroup | null; playbooks: Playbook[] }[] = [];
  for (const playbook of playbooksFor(advisorId)) {
    const group = playbook.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.group === group) last.playbooks.push(playbook);
    else groups.push({ group, playbooks: [playbook] });
  }
  return groups;
}

export function getPlaybook(advisorId: AdvisorId, playbookId: string): Playbook | undefined {
  return playbooksFor(advisorId).find((playbook) => playbook.id === playbookId);
}

export function isPlaybookId(advisorId: AdvisorId, value: unknown): value is string {
  return typeof value === "string" && !!getPlaybook(advisorId, value);
}

export function playbookTemplate(playbook: Playbook, locale: Locale): string {
  return playbook.templates[locale] ?? playbook.templates.en;
}
