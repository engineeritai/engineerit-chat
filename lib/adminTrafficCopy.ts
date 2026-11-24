export type TrafficCopy = {
  title: string;
  subtitle: string;
  example: string;
  exampleBadge: string;
  summary: string;
  visits: string;
  uniques: string;
  signups: string;
  chats: string;
  paid: string;
  today: string;
  days7: string;
  days30: string;
  activeNow: string;
  daily: string;
  date: string;
  page: string;
  views: string;
  topPages: string;
  topReferrers: string;
  topSources: string;
  referrer: string;
  source: string;
  count: string;
  conversion: string;
  conversionLead: string;
  noPages: string;
  noReferrers: string;
  noSources: string;
  directNote: string;
  missing: string;
  unavailable: string;
  truncated: string;
  attributionTail: string;
  perDay: string;
};

const en: TrafficCopy = {
  title: "Traffic and usage",
  subtitle: "Account counts and anonymous page views, in Arabia time. No cookies and no raw IP addresses are stored.",
  example: "Example data. These numbers are a sample, not live traffic.",
  exampleBadge: "Example",
  summary: "Summary",
  visits: "Visits",
  uniques: "Unique visitors",
  signups: "Signups",
  chats: "Chats",
  paid: "Paid subs",
  today: "Today",
  days7: "7 days",
  days30: "30 days",
  activeNow: "Active now",
  daily: "Daily visits, last 14 days",
  date: "Date",
  page: "Page",
  views: "Visits",
  topPages: "Top pages, last 7 days",
  topReferrers: "Top referrers, last 7 days",
  topSources: "UTM sources, last 7 days",
  referrer: "Referrer",
  source: "Source",
  count: "Count",
  conversion: "Visit to confirmed signup",
  conversionLead: "Confirmed signups divided by unique visitors. Confirmed signups use the same rules as the source table.",
  noPages: "No page views in the last 7 days.",
  noReferrers: "No referrers in the last 7 days.",
  noSources: "No tagged sources in the last 7 days.",
  directNote: "Direct and same-site visits have no referrer host.",
  missing: "Visits: table not created yet",
  unavailable: "Visits: unavailable",
  truncated: "This window was capped at 20,000 page views, so the totals are partial.",
  attributionTail: "Page views and the visit-to-confirmed-signup rate are in the summary above.",
  perDay: "Unique",
};

const ar: TrafficCopy = {
  title: "الزيارات والاستخدام",
  subtitle: "أعداد الحسابات ومشاهدات الصفحات المجهولة، بتوقيت الجزيرة. لا ملفات تعريف ارتباط ولا عناوين إنترنت خام.",
  example: "بيانات مثال. هذه الأرقام عينة وليست زيارات حقيقية.",
  exampleBadge: "مثال",
  summary: "الملخص",
  visits: "الزيارات",
  uniques: "الزوار الفريدون",
  signups: "التسجيلات",
  chats: "المحادثات",
  paid: "الاشتراكات المدفوعة",
  today: "اليوم",
  days7: "7 أيام",
  days30: "30 يوما",
  activeNow: "النشطة الآن",
  daily: "الزيارات اليومية، آخر 14 يوما",
  date: "التاريخ",
  page: "الصفحة",
  views: "الزيارات",
  topPages: "أكثر الصفحات، آخر 7 أيام",
  topReferrers: "أكثر المواقع المُحيلة، آخر 7 أيام",
  topSources: "مصادر UTM، آخر 7 أيام",
  referrer: "المُحيل",
  source: "المصدر",
  count: "العدد",
  conversion: "من الزيارة إلى التسجيل المؤكد",
  conversionLead: "التسجيلات المؤكدة مقسومة على الزوار الفريدين. التسجيلات المؤكدة تتبع قواعد جدول المصدر نفسها.",
  noPages: "لا مشاهدات صفحات في آخر 7 أيام.",
  noReferrers: "لا مواقع مُحيلة في آخر 7 أيام.",
  noSources: "لا مصادر موسومة في آخر 7 أيام.",
  directNote: "الزيارة المباشرة ومن الموقع نفسه بلا موقع مُحيل.",
  missing: "الزيارات: الجدول غير مُنشأ بعد",
  unavailable: "الزيارات: غير متاحة",
  truncated: "توقف العد عند 20,000 مشاهدة في هذه النافذة، فالمجاميع جزئية.",
  attributionTail: "مشاهدات الصفحات ومعدل التحويل من الزيارة إلى التسجيل المؤكد في الملخص أعلاه.",
  perDay: "فريد",
};

export const trafficCopy = { en, ar };
