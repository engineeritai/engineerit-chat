import type { Locale } from "@/lib/i18n";
import { DISCIPLINES, type Discipline } from "@/lib/disciplines";
import { ENGINEER_TOOLS, type EngineerToolId } from "@/lib/engineerTools";
import { PLANS, type Plan, type PlanId } from "@/lib/plans";

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
    name: "مهندس مساعد",
    tagline: "للطلاب والمهندسين المبتدئين.",
    priceMonthly: "مجاناً",
    features: [
      "محادثة في كل التخصصات",
      "فهم مخططات التدفق والمخططات الأنابيب والأجهزة والمخططات الصندوقية البسيطة",
      "رقمنة بيانات أساسية (جداول ووسوم بسيطة)",
    ],
  },
  engineer: {
    name: "مهندس",
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
    name: "مهندس محترف",
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
    name: "مهندس استشاري",
    tagline: "للاستشاريين والمكاتب التي تدير مشاريع كاملة.",
    priceMonthly: "79 ر.س شهرياً",
    features: [
      "كل ما في باقة المهندس المحترف",
      "تحليل قوائم المعدات وجداول الكميات",
      "خطوط الهندسة القيمية",
      "تقدير الموارد والتكلفة ومراجعة الجدول",
      "لوحات المشروع ونظرة على المحفظة",
      "تصدير إلى PDF وورد وباوربوينت",
    ],
  },
};

export function disciplineLabel(locale: Locale, name: string): string {
  if (locale === "ar" && name in AR_DISCIPLINES) return AR_DISCIPLINES[name as Discipline];
  return name;
}

export function toolLabel(locale: Locale, id: EngineerToolId): string {
  if (locale === "ar") return AR_TOOLS[id];
  return ENGINEER_TOOLS.find((tool) => tool.id === id)?.label ?? id;
}

export function formatMoney(amount: number, locale: Locale): string {
  if (locale === "ar") return `${amount.toLocaleString("ar-SA")} ر.س`;
  return `SAR ${amount.toLocaleString("en-US")}`;
}

export function formatUsd(amountSar: number, locale: Locale): string {
  const usd = amountSar / 3.75;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
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
