import type { Locale } from "@/lib/i18n";

/**
 * AI Advisors — plan gating.
 *
 * Same shape as engineer-tool access: an explicit allow-list per plan.
 * Change `ADVISOR_ACCESS` to move advisors between tiers. Do not encode
 * the rule as "consultant and above" in the UI.
 *
 * Included: Consultant, Team, Enterprise.
 * Locked preview: guest, Free (assistant), Engineer, Professional.
 */
export const ADVISOR_IDS = ["pmo", "assurance", "decision", "supply"] as const;

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
  team: "team",
  enterprise: "enterprise",
  guest: "guest",
};

export type Advisor = {
  id: AdvisorId;
  /** Ecosystem segment: engineerit AI > AI Advisors > track */
  track: "PMO" | "Assurance" | "Decision" | "Supply Chain";
  templates: Record<Locale, string>;
};

const PMO_TEMPLATE_EN = `# PMO Status Pack

## 1. Project snapshot
- Project / package:
- Phase:
- Reporting period:
- Overall status (RAG):

## 2. Work breakdown (WBS)
| WBS | Work package | Owner | Start | Finish | % complete | Notes |
| --- | --- | --- | --- | --- | --- | --- |

## 3. Schedule
| ID | Activity | Predecessor | Duration | Start | Finish | Float | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 4. RACI
| Activity | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |

## 5. Risk register
| ID | Risk | Cause | Impact | Likelihood | Score | Owner | Response | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 6. Progress and status
- Accomplishments:
- Planned next period:
- Variances:
- Decisions needed:

## 7. Assumptions and gaps
`;

const PMO_TEMPLATE_AR = `# حزمة حالة إدارة المشروع

## 1. لمحة المشروع
- المشروع / الحزمة:
- المرحلة:
- فترة التقرير:
- الحالة الإجمالية (RAG):

## 2. هيكل تقسيم العمل
| الرمز | حزمة العمل | المالك | البداية | النهاية | نسبة الإنجاز | ملاحظات |
| --- | --- | --- | --- | --- | --- | --- |

## 3. الجدول
| المعرف | النشاط | السابق | المدة | البداية | النهاية | الهامش | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 4. مصفوفة RACI
| النشاط | منفّذ | مسؤول | يُستشار | يُبلَّغ |
| --- | --- | --- | --- | --- |

## 5. سجل المخاطر
| المعرف | الخطر | السبب | الأثر | الاحتمال | الدرجة | المالك | الاستجابة | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 6. التقدم والحالة
- ما أُنجز:
- المخطط للفترة التالية:
- الانحرافات:
- القرارات المطلوبة:

## 7. الافتراضات والفجوات
`;

const ASSURANCE_TEMPLATE_EN = `# Assurance Report

## 1. Review header
- Review type: (stage-gate / design / deliverable / compliance / audit / lessons learned)
- Project / package:
- Stage or gate:
- Decision supported: (proceed / proceed with conditions / hold / recycle)

## 2. RAG summary
| Area | RAG | Rationale |
| --- | --- | --- |

## 3. Governance and stage-gate
| Criterion | Evidence | Finding | RAG |
| --- | --- | --- | --- |

## 4. Design and deliverable review
| Deliverable | Requirement / standard | Observation | Severity |
| --- | --- | --- | --- |

## 5. Compliance checklist
| Item | Requirement | Status (Met / Partial / Gap) | Evidence |
| --- | --- | --- | --- |

## 6. Audit findings
| ID | Finding | Severity | Cause | Recommendation | Owner | Due |
| --- | --- | --- | --- | --- | --- | --- |

## 7. Lessons learned
| Lesson | Context | Recommendation | Applies to |
| --- | --- | --- | --- |

## 8. Assurance opinion
- Overall RAG:
- Conditions to proceed:
- Residual risks:
`;

const ASSURANCE_TEMPLATE_AR = `# تقرير الضمان

## 1. رأس المراجعة
- نوع المراجعة: (بوابة مرحلة / تصميم / مخرج / امتثال / تدقيق / دروس مستفادة)
- المشروع / الحزمة:
- المرحلة أو البوابة:
- القرار الذي تدعمه المراجعة: (متابعة / متابعة بشروط / إيقاف / إعادة)

## 2. ملخص RAG
| المجال | RAG | المبرر |
| --- | --- | --- |

## 3. الحوكمة وبوابة المرحلة
| المعيار | الدليل | الملاحظة | RAG |
| --- | --- | --- | --- |

## 4. مراجعة التصميم والمخرجات
| المخرج | المتطلب / المعيار | الملاحظة | الشدة |
| --- | --- | --- | --- |

## 5. قائمة الامتثال
| البند | المتطلب | الحالة (مستوفى / جزئي / فجوة) | الدليل |
| --- | --- | --- | --- |

## 6. ملاحظات التدقيق
| المعرف | الملاحظة | الشدة | السبب | التوصية | المالك | الاستحقاق |
| --- | --- | --- | --- | --- | --- | --- |

## 7. الدروس المستفادة
| الدرس | السياق | التوصية | ينطبق على |
| --- | --- | --- | --- |

## 8. رأي الضمان
- RAG الإجمالي:
- شروط المتابعة:
- المخاطر المتبقية:
`;

const DECISION_TEMPLATE_EN = `# Executive Decision Brief

## 1. Decision required
- Question:
- Decision owner:
- Needed by:
- Constraints:

## 2. Options
| Option | Description | Pros | Cons |
| --- | --- | --- | --- |

## 3. Multi-criteria matrix
| Criterion | Weight | Option A | Option B | Option C |
| --- | --- | --- | --- | --- |
| Weighted total | 100 |  |  |  |

## 4. Cost-benefit
| Option | Cost | Benefit | Net | Payback / notes |
| --- | --- | --- | --- | --- |

## 5. Risk-based view
| Option | Key risks | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |

## 6. Recommendation
- Preferred option:
- Why:
- Conditions:
- What would change the decision:

## 7. Ask of the executive
`;

const DECISION_TEMPLATE_AR = `# مذكرة قرار تنفيذية

## 1. القرار المطلوب
- السؤال:
- صاحب القرار:
- مطلوب قبل:
- القيود:

## 2. الخيارات
| الخيار | الوصف | المزايا | العيوب |
| --- | --- | --- | --- |

## 3. مصفوفة المعايير
| المعيار | الوزن | الخيار أ | الخيار ب | الخيار ج |
| --- | --- | --- | --- | --- |
| المجموع المرجّح | 100 |  |  |  |

## 4. التكلفة والعائد
| الخيار | التكلفة | العائد | الصافي | الاسترداد / ملاحظات |
| --- | --- | --- | --- | --- |

## 5. منظور المخاطر
| الخيار | أهم المخاطر | الاحتمال | الأثر | المعالجة |
| --- | --- | --- | --- | --- |

## 6. التوصية
- الخيار المفضل:
- السبب:
- الشروط:
- ما الذي يغيّر القرار:

## 7. المطلوب من التنفيذي
`;

const SUPPLY_TEMPLATE_EN = `# Supply Chain Report

## 1. Executive summary
- Package:
- Overall RAG:
- Why:
- Recommended action:

## 2. Procurement strategy
| Package | Strategy | Route | Need date | Owner | RAG |
| --- | --- | --- | --- | --- | --- |

## 3. Vendor evaluation
| Vendor | Criterion | Score | Result | RAG |
| --- | --- | --- | --- | --- |

## 4. Technical bid evaluation
| Bidder | Technical score | Deviations | Acceptable | RAG |
| --- | --- | --- | --- | --- |

## 5. Long-lead and expediting
| Item | Supplier | Need date | Promised date | Expediting action | RAG |
| --- | --- | --- | --- | --- | --- |

## 6. Local content and logistics
| Topic | Evidence | Risk | RAG |
| --- | --- | --- | --- |
| IKTVA / local content | | | |
| Logistics | | | |

## 7. Supply chain risk register
| ID | Risk | Impact | Owner | Response | RAG |
| --- | --- | --- | --- | --- | --- |
`;

const SUPPLY_TEMPLATE_AR = `# تقرير سلسلة الإمداد

## 1. الملخص التنفيذي
- الحزمة:
- RAG الإجمالي:
- السبب:
- الإجراء الموصى به:

## 2. استراتيجية المشتريات
| الحزمة | الاستراتيجية | المسار | تاريخ الحاجة | المالك | RAG |
| --- | --- | --- | --- | --- | --- |

## 3. تقييم الموردين
| المورد | المعيار | الدرجة | النتيجة | RAG |
| --- | --- | --- | --- | --- |

## 4. التقييم الفني للعروض
| مقدم العرض | الدرجة الفنية | الانحرافات | مقبول | RAG |
| --- | --- | --- | --- | --- |

## 5. التوريد الطويل والتعجيل
| البند | المورد | تاريخ الحاجة | التاريخ الموعود | إجراء التعجيل | RAG |
| --- | --- | --- | --- | --- | --- |

## 6. المحتوى المحلي واللوجستيات
| الموضوع | الدليل | الخطر | RAG |
| --- | --- | --- | --- |
| اكتفاء / المحتوى المحلي | | | |
| اللوجستيات | | | |

## 7. سجل مخاطر سلسلة الإمداد
| المعرف | الخطر | الأثر | المالك | الاستجابة | RAG |
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
    id: "decision",
    track: "Decision",
    templates: { en: DECISION_TEMPLATE_EN, ar: DECISION_TEMPLATE_AR },
  },
  {
    id: "supply",
    track: "Supply Chain",
    templates: { en: SUPPLY_TEMPLATE_EN, ar: SUPPLY_TEMPLATE_AR },
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
