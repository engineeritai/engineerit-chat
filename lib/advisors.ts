import type { Locale } from "@/lib/i18n";

/**
 * AI Advisors — plan gating.
 *
 * Same shape as engineer-tool access: an explicit allow-list per plan.
 * Change `ADVISOR_ACCESS` to move advisors between tiers. Do not encode
 * the rule as "consultant and above" in the UI.
 *
 * Included: Consultant, Team, Enterprise, and pilot or trial accounts
 * (those tiers alias to Consultant).
 * Locked preview: guest, Assistant Engineer, Engineer, Professional.
 */
/** Display order everywhere: PMO, Program Assurance, Operations Readiness, Decision Support. */
export const ADVISOR_IDS = ["pmo", "assurance", "operations", "decision"] as const;

export type AdvisorId = (typeof ADVISOR_IDS)[number];

export type AdvisorPlanId =
  | "guest"
  | "assistant"
  | "engineer"
  | "professional"
  | "consultant"
  | "team"
  | "enterprise";

export const ADVISOR_ACCESS: Record<AdvisorPlanId, readonly AdvisorId[]> = {
  guest: [],
  assistant: [],
  engineer: [],
  professional: [],
  consultant: ADVISOR_IDS,
  team: ADVISOR_IDS,
  enterprise: ADVISOR_IDS,
};

/** Plans shown on /pricing. Order is the commercial ladder, not the allow-list. */
export const PRICING_PLAN_IDS: readonly AdvisorPlanId[] = [
  "assistant",
  "engineer",
  "professional",
  "consultant",
  "team",
  "enterprise",
];

/**
 * Export actions follow the existing chat rules.
 * Team and Enterprise sit with Consultant so an advisor reply can be exported.
 * Change these lists to retune export without editing the chat components.
 */
export const EXPORT_ACCESS = {
  copyShare: ["engineer", "professional", "consultant", "team", "enterprise"],
  pdf: ["professional", "consultant", "team", "enterprise"],
  wordPpt: ["consultant", "team", "enterprise"],
} as const satisfies Record<string, readonly AdvisorPlanId[]>;

const PLAN_ALIASES: Record<string, AdvisorPlanId> = {
  free: "assistant",
  assistant: "assistant",
  assistant_engineer: "assistant",
  engineer: "engineer",
  professional: "professional",
  pro: "professional",
  professional_engineer: "professional",
  consultant: "consultant",
  consultant_engineer: "consultant",
  /** Signed pilot and trial accounts receive Consultant advisor access. */
  pilot: "consultant",
  trial: "consultant",
  free_trial: "consultant",
  team: "team",
  enterprise: "enterprise",
  guest: "guest",
};

export type Advisor = {
  id: AdvisorId;
  /** Ecosystem segment: engineerit AI > AI Advisors > track */
  track: "PMO" | "Assurance" | "Operations" | "Decision";
  templates: Record<Locale, string>;
};

const PMO_TEMPLATE_EN = `# PMO Status Pack

## 1. Project snapshot
- Project / package:
- Battery limit: inside battery limits (ISBL)
- Phase:
- Reporting period:
- Overall status (RAG):

## 2. Work breakdown (WBS)
| WBS | Work package | Owner | Start | Finish | % complete | Notes |
| --- | --- | --- | --- | --- | --- | --- |

## 3. Schedule
| ID | Activity | Predecessor | Duration | Start | Finish | Float | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 4. Cost
| Cost element | Baseline | Forecast | Variance | Commitment | RAG |
| --- | --- | --- | --- | --- | --- |

## 5. RACI
| Activity | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |

## 6. Risk register
| ID | Risk | Cause | Impact | Likelihood | Score | Owner | Response | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 7. Progress and status
- Accomplishments:
- Planned next period:
- Variances:
- Decisions needed:

## 8. Assumptions and gaps

## 9. Procurement and supply chain
| Package | Route | Vendor status | Long-lead | IKTVA note | RAG |
| --- | --- | --- | --- | --- | --- |
`;

const PMO_TEMPLATE_AR = `# حزمة حالة إدارة المشروع

## 1. لمحة المشروع
- المشروع / الحزمة:
- حدود المشروع: داخل حدود المشروع
- المرحلة:
- فترة التقرير:
- الحالة الإجمالية (RAG):

## 2. هيكل تقسيم العمل
| الرمز | حزمة العمل | المالك | البداية | النهاية | نسبة الإنجاز | ملاحظات |
| --- | --- | --- | --- | --- | --- | --- |

## 3. الجدول
| المعرف | النشاط | السابق | المدة | البداية | النهاية | الهامش | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 4. التكلفة
| عنصر التكلفة | خط الأساس | التوقع | الانحراف | الالتزام | RAG |
| --- | --- | --- | --- | --- | --- |

## 5. مصفوفة RACI
| النشاط | منفّذ | مسؤول | يُستشار | يُبلَّغ |
| --- | --- | --- | --- | --- |

## 6. سجل المخاطر
| المعرف | الخطر | السبب | الأثر | الاحتمال | الدرجة | المالك | الاستجابة | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 7. التقدم والحالة
- ما أُنجز:
- المخطط للفترة التالية:
- الانحرافات:
- القرارات المطلوبة:

## 8. الافتراضات والفجوات

## 9. المشتريات وسلسلة الإمداد
| الحزمة | المسار | حالة المورد | التوريد الطويل | ملاحظة اكتفاء | RAG |
| --- | --- | --- | --- | --- | --- |
`;

const ASSURANCE_TEMPLATE_EN = `# Program Assurance Report

## 1. Review header
- Review type: (interface / stakeholder / OSBL / stage-gate / assurance / execution health)
- Program:
- Projects covered:
- Decision supported: (proceed / proceed with conditions / hold / recycle)

## 2. RAG summary
| Area | RAG | Rationale |
| --- | --- | --- |

## 3. Interface register
| ID | Interface | Type | From | To | Owner | Need date | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 4. OSBL dependencies
| Dependency | Provider | Need | Need date | Impact if late | RAG |
| --- | --- | --- | --- | --- | --- |

## 5. Execution health across projects
| Project | Schedule RAG | Cost RAG | Risk RAG | Quality RAG |
| --- | --- | --- | --- | --- |

## 6. Assurance opinion
- Overall RAG:
- Conditions to proceed:

## 7. Delivery audit of execution
| ID | Area (project / technical / quality / compliance) | Finding | Requirement in the file | Severity | RAG |
| --- | --- | --- | --- | --- | --- |
`;

const ASSURANCE_TEMPLATE_AR = `# تقرير ضمان البرنامج

## 1. رأس المراجعة
- نوع المراجعة: (واجهة / أصحاب مصلحة / خارج حدود المشروع / بوابة / ضمان / صحة التنفيذ)
- البرنامج:
- المشاريع المشمولة:
- القرار الذي تدعمه المراجعة: (متابعة / متابعة بشروط / إيقاف / إعادة)

## 2. ملخص RAG
| المجال | RAG | المبرر |
| --- | --- | --- |

## 3. سجل الواجهات
| المعرف | الواجهة | النوع | من | إلى | المالك | تاريخ الحاجة | RAG |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 4. اعتمادات خارج حدود المشروع
| الاعتماد | المزوّد | الاحتياج | تاريخ الحاجة | الأثر إذا تأخر | RAG |
| --- | --- | --- | --- | --- | --- |

## 5. صحة التنفيذ عبر المشاريع
| المشروع | RAG الجدول | RAG التكلفة | RAG المخاطر | RAG الجودة |
| --- | --- | --- | --- | --- |

## 6. رأي الضمان
- RAG الإجمالي:
- شروط المتابعة:

## 7. تدقيق تسليم التنفيذ
| المعرف | المجال (مشروع / فني / جودة / امتثال) | الملاحظة | المتطلب في الملف | الشدة | RAG |
| --- | --- | --- | --- | --- | --- |
`;

const DECISION_TEMPLATE_EN = `# Executive Decision Brief

## 1. Decision required
- Question:
- Decision owner:
- Needed by:
- Constraints:

## 2. Capital projects assessment
- Business case:
- CAPEX estimate:
- OPEX estimate:
- Feasibility (technical / commercial / schedule):
- Funding mechanism: (equity / project finance / PPP / government or PIF / grants)
- Strategy alignment:
- Customer expectations:
- Stage-gate decision: (go / no-go / hold)

## 3. Options
| Option | Description | CAPEX | OPEX | Pros | Cons |
| --- | --- | --- | --- | --- | --- |

## 4. Multi-criteria matrix
| Criterion | Weight | Option A | Option B | Option C |
| --- | --- | --- | --- | --- |
| Weighted total | 100 |  |  |  |

## 5. Strategy and governance
| Decision | Strategy objective | Governance forum | Alignment | RAG |
| --- | --- | --- | --- | --- |

## 6. Governance and investment audit
| ID | Finding | Area (capital governance / financial / strategy alignment / board) | Severity | Owner | Due | RAG |
| --- | --- | --- | --- | --- | --- | --- |

## 7. Recommendation
- Preferred option:
- Why:
- Conditions:
- What would change the decision:

## 8. Ask of the executive
`;

const DECISION_TEMPLATE_AR = `# مذكرة قرار تنفيذية

## 1. القرار المطلوب
- السؤال:
- صاحب القرار:
- مطلوب قبل:
- القيود:

## 2. تقييم المشاريع الرأسمالية
- دراسة الجدوى:
- تقدير النفقات الرأسمالية:
- تقدير النفقات التشغيلية:
- الجدوى (فنية / تجارية / الجدول):
- آلية التمويل: (حقوق ملكية / تمويل مشاريع / شراكة / حكومي أو صندوق الاستثمارات / منح)
- المواءمة مع الاستراتيجية:
- توقعات العميل:
- قرار بوابة المرحلة: (متابعة / عدم متابعة / إيقاف)

## 3. الخيارات
| الخيار | الوصف | النفقات الرأسمالية | النفقات التشغيلية | المزايا | العيوب |
| --- | --- | --- | --- | --- | --- |

## 4. مصفوفة المعايير
| المعيار | الوزن | الخيار أ | الخيار ب | الخيار ج |
| --- | --- | --- | --- | --- |
| المجموع المرجّح | 100 |  |  |  |

## 5. الاستراتيجية والحوكمة
| القرار | الهدف الاستراتيجي | منتدى الحوكمة | المواءمة | RAG |
| --- | --- | --- | --- | --- |

## 6. تدقيق الحوكمة والاستثمار
| المعرف | الملاحظة | المجال (حوكمة رأس المال / مالي / مواءمة استراتيجية / مجلس) | الشدة | المالك | الاستحقاق | RAG |
| --- | --- | --- | --- | --- | --- | --- |

## 7. التوصية
- الخيار المفضل:
- السبب:
- الشروط:
- ما الذي يغيّر القرار:

## 8. المطلوب من التنفيذي
`;

const OPERATIONS_TEMPLATE_EN = `# Operations Readiness Pack

## 1. Executive summary
- System / facility:
- Overall RAG:
- Why:
- Decision: (ready / ready with conditions / not ready)

## 2. Testing and pre-commissioning
| System | Test | Result | Open defects | Ready for next step | RAG |
| --- | --- | --- | --- | --- | --- |

## 3. Mechanical completion and handover dossiers
| System | MC certificate | Dossier | Open punch | Ready for handover | RAG |
| --- | --- | --- | --- | --- | --- |

## 4. Commissioning
| System | Pre-commissioning | Commissioning | Ready for start-up | Constraint | RAG |
| --- | --- | --- | --- | --- | --- |

## 5. Start-up and regularisation of operation
| System | Start-up | Steady state | Performance test | Operating KPI | Warranty / defects | RAG |
| --- | --- | --- | --- | --- | --- | --- |

## 6. Punch list
| ID | Category | Blocks handover | Owner | Due | Status |
| --- | --- | --- | --- | --- | --- |

## 7. Permits, offtakers, and capacity
| Party | Requirement | Evidence | Gap | RAG |
| --- | --- | --- | --- | --- |
| Regulator / permit | | | | |
| Customer / offtaker | | | | |
| Capacity | | | | |

## 8. O&M readiness
| Area | Spares | Procedures | Training matrix | Maintenance | RAG |
| --- | --- | --- | --- | --- | --- |
`;

const OPERATIONS_TEMPLATE_AR = `# حزمة جاهزية التشغيل

## 1. الملخص التنفيذي
- النظام / المرفق:
- RAG الإجمالي:
- السبب:
- القرار: (جاهز / جاهز بشروط / غير جاهز)

## 2. الاختبار وما قبل التشغيل التجريبي
| النظام | الاختبار | النتيجة | العيوب المفتوحة | جاهز للخطوة التالية | RAG |
| --- | --- | --- | --- | --- | --- |

## 3. الإكمال الميكانيكي وملفات التسليم
| النظام | شهادة الإكمال | ملف التسليم | نواقص مفتوحة | جاهز للتسليم | RAG |
| --- | --- | --- | --- | --- | --- |

## 4. التشغيل التجريبي
| النظام | ما قبل التشغيل التجريبي | التشغيل التجريبي | جاهز للإقلاع | القيد | RAG |
| --- | --- | --- | --- | --- | --- |

## 5. الإقلاع وانتظام التشغيل
| النظام | الإقلاع | التشغيل المستقر | اختبار الأداء | مؤشر التشغيل | الضمان / العيوب | RAG |
| --- | --- | --- | --- | --- | --- | --- |

## 6. قائمة النواقص
| المعرف | الفئة | يعوق التسليم | المالك | الاستحقاق | الحالة |
| --- | --- | --- | --- | --- | --- |

## 7. التصاريح والمستلمون والطاقة
| الطرف | المتطلب | الدليل | الفجوة | RAG |
| --- | --- | --- | --- | --- |
| الجهة المنظمة / التصريح | | | | |
| العميل / المستلم | | | | |
| الطاقة | | | | |

## 8. جاهزية التشغيل والصيانة
| المجال | قطع الغيار | الإجراءات | مصفوفة التدريب | الصيانة | RAG |
| --- | --- | --- | --- | --- | --- |
`;

export const ADVISORS: readonly Advisor[] = [
  {
    id: "pmo",
    track: "PMO",
    templates: { en: PMO_TEMPLATE_EN, ar: PMO_TEMPLATE_AR },
  },
  {
    id: "assurance",
    track: "Assurance",
    templates: { en: ASSURANCE_TEMPLATE_EN, ar: ASSURANCE_TEMPLATE_AR },
  },
  {
    id: "operations",
    track: "Operations",
    templates: { en: OPERATIONS_TEMPLATE_EN, ar: OPERATIONS_TEMPLATE_AR },
  },
  {
    id: "decision",
    track: "Decision",
    templates: { en: DECISION_TEMPLATE_EN, ar: DECISION_TEMPLATE_AR },
  },
];

export function isAdvisorId(value: unknown): value is AdvisorId {
  return typeof value === "string" && (ADVISOR_IDS as readonly string[]).includes(value);
}

export function getAdvisor(id: string): Advisor | undefined {
  return ADVISORS.find((advisor) => advisor.id === id);
}

export function normalizeAdvisorPlan(
  raw: string | null | undefined,
  isGuest = false
): AdvisorPlanId {
  if (isGuest) return "guest";
  const key = (raw || "").trim().toLowerCase();
  return PLAN_ALIASES[key] ?? "assistant";
}

export function hasAdvisorAccess(
  planId: string | null | undefined,
  advisorId: AdvisorId,
  isGuest = false
): boolean {
  const plan = normalizeAdvisorPlan(planId, isGuest);
  return ADVISOR_ACCESS[plan].includes(advisorId);
}

export function planIncludesAdvisors(
  planId: string | null | undefined,
  isGuest = false
): boolean {
  const plan = normalizeAdvisorPlan(planId, isGuest);
  return ADVISOR_ACCESS[plan].length > 0;
}

export function exportCapabilities(planId: string | null | undefined, isGuest = false) {
  const plan = normalizeAdvisorPlan(planId, isGuest);
  const allows = (list: readonly AdvisorPlanId[]) => list.includes(plan);
  return {
    copyShare: allows(EXPORT_ACCESS.copyShare),
    pdf: allows(EXPORT_ACCESS.pdf),
    wordPpt: allows(EXPORT_ACCESS.wordPpt),
  };
}

export function advisorTemplate(advisor: Advisor, locale: Locale): string {
  return advisor.templates[locale] ?? advisor.templates.en;
}
