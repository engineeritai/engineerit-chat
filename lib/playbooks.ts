import type { AdvisorId } from "@/lib/advisors";
import type { Locale } from "@/lib/i18n/types";

export type Playbook = {
  id: string;
  advisorId: AdvisorId;
  templates: Record<Locale, string>;
};

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
| Scope in | |
| Scope out | |
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
| داخل النطاق | |
| خارج النطاق | |
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

- ما أُنجز:
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
| النشاط | المنفّذ | المسؤول | يُستشار | يُبلَّغ | RAG |
| --- | --- | --- | --- | --- | --- |

- أنشطة بلا مسؤول واحد:
- أنشطة بلا منفّذ:
`
  ),
  pack(
    "assurance",
    "stage-gate",
    "Stage-Gate Review",
    `
| Criterion | Evidence | Finding | RAG |
| --- | --- | --- | --- |

- Gate:
- Decision supported: proceed / proceed with conditions / hold / recycle
- Conditions:
`,
    "مراجعة بوابة المرحلة",
    `
| المعيار | الدليل | الملاحظة | RAG |
| --- | --- | --- | --- |

- البوابة:
- القرار المدعوم: متابعة / متابعة بشروط / إيقاف / إعادة
- الشروط:
`
  ),
  pack(
    "assurance",
    "design-review",
    "Design Review Checklist",
    `
| Deliverable | Requirement / standard | Observation | Status (Met / Partial / Gap) | Severity | RAG |
| --- | --- | --- | --- | --- | --- |

- Review decision:
- Items that block issue:
`,
    "قائمة مراجعة التصميم",
    `
| المخرج | المتطلب / المعيار | الملاحظة | الحالة (مستوفى / جزئي / فجوة) | الشدة | RAG |
| --- | --- | --- | --- | --- | --- |

- قرار المراجعة:
- البنود التي تمنع الإصدار:
`
  ),
  pack(
    "assurance",
    "audit",
    "Audit Report",
    `
| ID | Finding | Severity | Cause | Recommendation | Owner | Due | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- Audit opinion:
- Overall RAG:
`,
    "تقرير التدقيق",
    `
| المعرف | الملاحظة | الشدة | السبب | التوصية | المالك | الاستحقاق | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

- رأي التدقيق:
- RAG الإجمالي:
`
  ),
  pack(
    "assurance",
    "compliance",
    "Compliance Checklist",
    `
| Item | Requirement | Status (Met / Partial / Gap) | Evidence | Owner | RAG |
| --- | --- | --- | --- | --- | --- |

- Requirements cited by the file:
- Requirements still to be evidenced:
`,
    "قائمة الامتثال",
    `
| البند | المتطلب | الحالة (مستوفى / جزئي / فجوة) | الدليل | المالك | RAG |
| --- | --- | --- | --- | --- | --- |

- المتطلبات التي يذكرها الملف:
- المتطلبات التي ما زالت بلا دليل:
`
  ),
  pack(
    "assurance",
    "lessons",
    "Lessons Learned",
    `
| Lesson | Context | Repeat or avoid | Recommendation | Applies to | RAG |
| --- | --- | --- | --- | --- | --- |

- Lessons that are actionable now:
- Lessons that lack an owner:
`,
    "الدروس المستفادة",
    `
| الدرس | السياق | يُكرَّر أو يُتجنَّب | التوصية | ينطبق على | RAG |
| --- | --- | --- | --- | --- | --- |

- دروس قابلة للتنفيذ الآن:
- دروس بلا مالك:
`
  ),
  pack(
    "decision",
    "options",
    "Options Analysis",
    `
| Option | Description | Pros | Cons | RAG |
| --- | --- | --- | --- | --- |

- Decision question:
- Include defer or do nothing when it is a real alternative:
- Readiness of the option set:
`,
    "تحليل الخيارات",
    `
| الخيار | الوصف | المزايا | العيوب | RAG |
| --- | --- | --- | --- | --- |

- سؤال القرار:
- تضمين التأجيل أو عدم الفعل عندما يكون بديلاً حقيقيًا:
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
| المجموع المرجّح | 100 | | | |

- المقياس المستخدم:
- مجموع الأوزان 100:
- RAG لجودة البيانات:
- الخيار المتقدم حسب المجموع المرجّح:
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
| ما الذي يغيّر القرار | |
| المطلوب من التنفيذي | |

| الخيار | لماذا يتقدم أو يتراجع | RAG |
| --- | --- | --- |
`
  ),
  pack(
    "decision",
    "cba",
    "Cost-Benefit",
    `
| Option | Cost | Benefit | Net | Payback / notes | RAG |
| --- | --- | --- | --- | --- | --- |

- Figures taken from the source:
- Figures marked Not provided:
- Qualitative cost drivers where a number is absent:
`,
    "التكلفة والعائد",
    `
| الخيار | التكلفة | العائد | الصافي | الاسترداد / ملاحظات | RAG |
| --- | --- | --- | --- | --- | --- |

- الأرقام المأخوذة من المصدر:
- الأرقام المعلّمة غير متوفرة:
- محركات التكلفة النوعية حيث الرقم غائب:
`
  ),
  pack(
    "supply",
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
    "supply",
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

| مقدم العرض | الدرجة الفنية | الانحرافات | الاستيضاحات | مقبول فنيًا | RAG |
| --- | --- | --- | --- | --- | --- |

- الأسعار التجارية خارج هذا التقييم الفني ما لم يخلطها الملف:
- التوصية للخطوة التجارية:
`
  ),
  pack(
    "supply",
    "procurement-plan",
    "Procurement Plan",
    `
| Package | Strategy | Route (RFQ / RFP / single source) | Need date | Owner | IKTVA note | RAG |
| --- | --- | --- | --- | --- | --- | --- |

- Sourcing strategy:
- Local content (IKTVA) approach:
- Packages that need a decision:
`,
    "خطة المشتريات",
    `
| الحزمة | الاستراتيجية | المسار (طلب عرض سعر / طلب عرض / مصدر واحد) | تاريخ الحاجة | المالك | ملاحظة اكتفاء | RAG |
| --- | --- | --- | --- | --- | --- | --- |

- استراتيجية التوريد:
- منهج المحتوى المحلي (اكتفاء):
- الحزم التي تحتاج قرارًا:
`
  ),
  pack(
    "supply",
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
    "supply",
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
| عنصر الحزمة | مضمّن | الفجوة | المالك |
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
    "supply",
    "risk",
    "Supply Chain Risk Register",
    `
| ID | Risk | Type (vendor / lead time / logistics / IKTVA / quality) | Cause | Impact | Likelihood | Owner | Response | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

| Theme | RAG | Reason |
| --- | --- | --- |
| Vendor | | |
| Long-lead | | |
| Logistics | | |
| Local content (IKTVA) | | |
`,
    "سجل مخاطر سلسلة الإمداد",
    `
| المعرف | الخطر | النوع (مورد / مدة توريد / لوجستيات / اكتفاء / جودة) | السبب | الأثر | الاحتمال | المالك | الاستجابة | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

| المحور | RAG | السبب |
| --- | --- | --- |
| المورد | | |
| التوريد الطويل | | |
| اللوجستيات | | |
| المحتوى المحلي (اكتفاء) | | |
`
  ),
];

const BY_ADVISOR = new Map<AdvisorId, Playbook[]>();
for (const playbook of PLAYBOOKS) {
  const list = BY_ADVISOR.get(playbook.advisorId) ?? [];
  list.push(playbook);
  BY_ADVISOR.set(playbook.advisorId, list);
}

export function playbooksFor(advisorId: AdvisorId): readonly Playbook[] {
  return BY_ADVISOR.get(advisorId) ?? [];
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
