import type { Locale } from "@/lib/i18n";
import { DISCIPLINES, type Discipline } from "@/lib/disciplines";
import { ENGINEER_TOOLS, type EngineerToolId } from "@/lib/engineerTools";
import {
  ENTERPRISE_EXTRA_SEAT_SAR,
  EXTRA_SEAT_SAR,
  PLANS,
  type BillingInterval,
  type Plan,
  type PlanId,
} from "@/lib/plans";
import { displayFeatures } from "@/lib/pricingDisplay";

const AR_DISCIPLINES: Record<Discipline, string> = {
  General: "عام",
  "Civil Engineering": "الهندسة المدنية",
  "Mechanical Engineering": "الهندسة الميكانيكية",
  "Electrical Engineering": "الهندسة الكهربائية",
  "Chemical Engineering": "الهندسة الكيميائية",
  Instrumentation: "الأجهزة الدقيقة",
  "Process Engineering": "هندسة العمليات",
  Geotechnical: "الهندسة الجيوتقنية",
  "Mining Engineering": "هندسة التعدين",
  Architectural: "العمارة",
  "Project Engineering": "هندسة المشاريع",
  "Value Engineering": "الهندسة القيمية",
  Survey: "المساحة",
  Exploration: "الاستكشاف",
  "HSE / HAZOP": "السلامة ودراسات المخاطر",
};

const AR_TOOLS: Record<EngineerToolId, string> = {
  drawing: "الرسومات والمخططات",
  design: "التصميم ومراجعة الكود",
  itp: "خطة الفحص والجودة",
  boq: "جداول الكميات",
  schedule: "الجدول والموارد",
  value: "الهندسة القيمية",
  dashboard: "لوحات المشروع",
};

const AR_PLANS: Record<
  PlanId,
  { name: string; tagline: string; priceMonthly: string; features: string[] }
> = {
  assistant: {
    name: "المهندس المساعد",
    tagline: "للطلاب والمهندسين المبتدئين.",
    priceMonthly: "مجاناً",
    features: [
      "محادثة في كل التخصصات",
      "فهم مخططات التدفق والمخططات الأنابيب والأجهزة والمخططات الصندوقية البسيطة",
      "رقمنة بيانات أساسية (جداول ووسوم بسيطة)",
    ],
  },
  engineer: {
    name: "المهندس",
    tagline: "للمهندسين الممارسين الذين يحتاجون توثيقاً أسرع.",
    priceMonthly: "19 ر.س شهرياً",
    features: [
      "كل ما في باقة المهندس المساعد",
      "تحليل مستندات وورد وإكسل وباوربوينت",
      "مراجعة التقارير الفنية وتحليلها",
      "مراجعة أوراق الحسابات الهندسية",
      "نسخ ومشاركة المخرجات الهندسية",
    ],
  },
  professional: {
    name: "المهندس المحترف",
    tagline: "لكبار المهندسين وقادة التصميم.",
    priceMonthly: "41 ر.س شهرياً",
    features: [
      "كل ما في باقة المهندس",
      "تصاميم ومعادلات وصيغ وفحوصات تصميم متقدمة",
      "تحليل قوالب خطة الفحص وقوائم الجودة",
      "مراجعة جداول الكميات وحصرها",
      "نسخ ومشاركة المخرجات الهندسية",
      "تصدير إلى PDF",
    ],
  },
  consultant: {
    name: "المهندس الاستشاري",
    tagline: "للاستشاريين والمكاتب التي تدير مشاريع كاملة.",
    priceMonthly: "79 ر.س شهرياً",
    features: [
      "كل ما في باقة المهندس المحترف",
      "تحليل قوائم المعدات وجداول الكميات",
      "خطوط الهندسة القيمية",
      "تقدير الموارد والتكلفة ومراجعة الجدول",
      "لوحات المشروع ونظرة على المحفظة",
      "تصدير إلى PDF وورد وباوربوينت",
      "مستشارو الذكاء الاصطناعي مشمولون",
    ],
  },
  team: {
    name: "الفريق",
    tagline: "وصول بمستوى المهندس الاستشاري لمكتب، على اشتراك واحد.",
    priceMonthly: "349 ر.س شهرياً",
    features: [
      "كل ما في باقة المهندس الاستشاري",
      "5 مقاعد مشمولة",
      "مقعد إضافي 69 ر.س شهرياً",
      "يتجدد تلقائياً حتى الإلغاء",
      "دعوة الزملاء بالبريد",
      "ينتهي الوصول لكل الفريق إذا توقف الاشتراك",
      "مستشارو الذكاء الاصطناعي مشمولون",
    ],
  },
  enterprise: {
    name: "المؤسسات",
    tagline: "وصول بمستوى المهندس الاستشاري لمكتب أكبر، على اشتراك واحد.",
    priceMonthly: "2,500 ر.س شهرياً",
    features: [
      "كل ما في باقة المهندس الاستشاري",
      "10 مقاعد مشمولة",
      "مقعد إضافي 199 ر.س شهرياً",
      "يتجدد تلقائياً حتى الإلغاء",
      "مستشارو الذكاء الاصطناعي مشمولون",
    ],
  },
};

export function featuresForLocale(locale: Locale, plan: Plan, interval: BillingInterval): string[] {
  if (locale !== "ar") return displayFeatures(plan, interval);
  return AR_PLANS[plan.id].features.map((feature) => {
    if ((plan.id === "team" || plan.id === "enterprise") && feature.startsWith("مقعد إضافي")) {
      const amount = (plan.id === "enterprise" ? ENTERPRISE_EXTRA_SEAT_SAR : EXTRA_SEAT_SAR)[interval];
      const period = interval === "year" ? "سنوياً" : "شهرياً";
      return `مقعد إضافي ${amount.toLocaleString("en-US")} ر.س ${period}`;
    }
    return feature;
  });
}

export function disciplineLabel(locale: Locale, name: string): string {
  if (locale === "ar" && name in AR_DISCIPLINES) return AR_DISCIPLINES[name as Discipline];
  return name;
}

export function toolLabel(locale: Locale, id: EngineerToolId): string {
  if (locale === "ar") return AR_TOOLS[id];
  return ENGINEER_TOOLS.find((tool) => tool.id === id)?.label ?? id;
}

export function formatMoney(amount: number, locale: Locale): string {
  if (locale === "ar") return `${amount.toLocaleString("en-US")} ر.س`;
  return `SAR ${amount.toLocaleString("en-US")}`;
}

export function formatUsd(amountSar: number, locale: Locale): string {
  const usd = amountSar / 3.75;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
  return locale === "ar" ? `${formatted} دولار` : `USD ${formatted}`;
}

export function localizedPlan(locale: Locale, plan: Plan): Plan {
  if (locale !== "ar") return plan;
  const copy = AR_PLANS[plan.id];
  return { ...plan, ...copy, priceYearly: "" };
}

export function planById(locale: Locale, id: PlanId): Plan {
  const plan = PLANS.find((item) => item.id === id) ?? PLANS[0];
  return localizedPlan(locale, plan);
}

export const DISCIPLINE_OPTIONS = DISCIPLINES;
