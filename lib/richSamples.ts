export const sampleEn = `# Feed pump installation

The feed pump P-101 is installed inside battery limits. The sequence below is the current plan.

## Comparison

| Item | Tag | Service | Standard | Material | Design pressure | Design temp | Status | Owner | Need date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Feed pump | P-101 | Boiler feed | API 610 | SS 316 | 40 bar | 180 C | On order | Mechanical | 2026-11-02 |
| Motor | M-101 | 400 kW | IEC 60034 | Cast iron | n/a | 40 C | Approved | Electrical | 2026-10-28 |
| Check valve | V-220 | Discharge | API 594 | SS 316 | 40 bar | 180 C | Bid | Piping | 2026-11-12 |
| Strainer | S-14 | Suction | ASME B16.34 | SS 316 | 16 bar | 120 C | Issued | Piping | 2026-10-30 |

## Schedule

\`\`\`mermaid
gantt
    title Feed pump installation
    dateFormat YYYY-MM-DD
    section Engineering
    Design package :done, des, 2026-09-01, 2026-09-20
    Procurement :crit, proc, 2026-09-15, 30d
    section Construction
    Installation :active, inst, 2026-10-10, 21d
    Handover :milestone, hand, 2026-11-05, 0d
\`\`\`

## Roadmap

\`\`\`timeline
    title Delivery roadmap
    section 2026
        Q1 : Charter
        Q2 : Design freeze
        Q3 : Construction
        Q4 : Handover
\`\`\`

## Progress

\`\`\`scurve
title Progress S-curve
Sep | 20 | 18
Oct | 45 | 40
Nov | 75 | 60
Dec | 100 | 80
\`\`\`

## Resources

\`\`\`histogram
title Resource histogram
Sep | 6 | 5
Oct | 12 | 14
Nov | 9 | 8
Dec | 4 | 4
\`\`\`

## Flow

\`\`\`mermaid
flowchart LR
    Suction --> Pump
    Pump --> Discharge
    Discharge --> Header
\`\`\`

## Actions

- Confirm the nozzle loads against API 610.
- Keep the critical procurement path visible in the weekly report.
1. Issue the motor datasheet.
2. Book the alignment crew for the week of 10 Oct.
`;

export const sampleAr = `# تركيب مضخة التغذية

تركيب مضخة التغذية P-101 يكون داخل حدود البطارية. التسلسل أدناه هو الخطة الحالية.

## المقارنة

| البند | الرقم | الخدمة | المواصفة | المادة | ضغط التصميم | حرارة التصميم | الحالة | المالك | تاريخ الحاجة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| مضخة تغذية | P-101 | تغذية الغلاية | API 610 | SS 316 | 40 بار | 180 م | قيد التوريد | ميكانيكا | 2026-11-02 |
| محرك | M-101 | 400 كيلوواط | IEC 60034 | حديد زهر | لا ينطبق | 40 م | معتمد | كهرباء | 2026-10-28 |
| صمام عدم رجوع | V-220 | الطرد | API 594 | SS 316 | 40 بار | 180 م | عرض | أنابيب | 2026-11-12 |
| مصفاة | S-14 | السحب | ASME B16.34 | SS 316 | 16 بار | 120 م | صدر | أنابيب | 2026-10-30 |

## الجدول

\`\`\`mermaid
gantt
    title تركيب مضخة التغذية
    dateFormat YYYY-MM-DD
    section الهندسة
    حزمة التصميم :done, des, 2026-09-01, 2026-09-20
    التوريد :crit, proc, 2026-09-15, 30d
    section الإنشاء
    التركيب :active, inst, 2026-10-10, 21d
    التسليم :milestone, hand, 2026-11-05, 0d
\`\`\`

## خارطة الطريق

\`\`\`timeline
    title خارطة التسليم
    section 2026
        الربع 1 : الميثاق
        الربع 2 : تجميد التصميم
        الربع 3 : الإنشاء
        الربع 4 : التسليم
\`\`\`

## التقدم

\`\`\`scurve
title منحنى التقدم
سبتمبر | 20 | 18
أكتوبر | 45 | 40
نوفمبر | 75 | 60
ديسمبر | 100 | 80
\`\`\`

## الموارد

\`\`\`histogram
title مخطط الموارد
سبتمبر | 6 | 5
أكتوبر | 12 | 14
نوفمبر | 9 | 8
ديسمبر | 4 | 4
\`\`\`

## المسار

\`\`\`mermaid
flowchart RL
    السحب --> المضخة
    المضخة --> الطرد
    الطرد --> المجمع
\`\`\`

## الإجراءات

- طابق أحمال الفوهات مع API 610.
- حافظ على مسار التوريد الحرج ظاهرا في التقرير الأسبوعي.
1. أصدر ورقة بيانات المحرك.
2. احجز فريق المحاذاة لأسبوع 10 أكتوبر.
`;

/** Model output that used to drop the chart, restart every number at 1, and clip the status column. */
export const chartCaseEn = `Here's an S-curve chart of planned versus actual progress for a 12-month road project. Actual stays below the plan through the middle, then catches up.

\`\`\`mermaid
xychart-beta
    title "Road project S-curve"
    x-axis [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12]
    y-axis "Percent" 0 --> 100
    line "Planned" [4, 9, 16, 25, 36, 48, 60, 71, 81, 89, 96, 100]
    line "Actual" [3, 7, 12, 19, 28, 38, 49, 61, 73, 84, 93, 99]
\`\`\`

## Trend

\`\`\`line
title Monthly output
Jan | 12
Feb | 18
Mar | 15
Apr | 22
\`\`\`

## Crew

\`\`\`bar
title Crew size
Civil | 20 | 18
Paving | 14 | 16
Marking | 6 | 7
\`\`\`

## Spend

\`\`\`area
title Cumulative spend
Q1 | 10
Q2 | 24
Q3 | 41
Q4 | 63
\`\`\`

## Split

\`\`\`pie
title Cost split
Earthworks | 35
Pavement | 25
Structures | 20
Utilities | 12
Contingency | 8
\`\`\`

## Next steps

1. Confirm the baseline schedule with the client.

2. Issue the traffic management plan.

3. Book the asphalt plant window.

## Action items

| Action | Owner | Due | Status |
| --- | --- | --- | --- |
| Follow up on RFI on façade anchors | Architect | 2026-10-21 | Open |
| Update the traffic diversion drawing for the northern interchange | Civil | 2026-10-24 | In review |
| Close the night-work permit for station 12+400 | HSE | 2026-10-18 | Blocked |
`;

export const chartCaseAr = `هذا منحنى تقدم يقارن المخطط بالفعلي لمشروع طريق مدته 12 شهرا. يبقى الفعلي تحت المخطط في منتصف المدة، ثم يلحق به.

\`\`\`mermaid
xychart-beta
    title "منحنى تقدم الطريق"
    x-axis [ش1, ش2, ش3, ش4, ش5, ش6, ش7, ش8, ش9, ش10, ش11, ش12]
    y-axis "النسبة" 0 --> 100
    line "مخطط" [4, 9, 16, 25, 36, 48, 60, 71, 81, 89, 96, 100]
    line "فعلي" [3, 7, 12, 19, 28, 38, 49, 61, 73, 84, 93, 99]
\`\`\`

## الاتجاه

\`\`\`line
title الإنتاج الشهري
يناير | 12
فبراير | 18
مارس | 15
أبريل | 22
\`\`\`

## الطاقم

\`\`\`bar
title حجم الطاقم
مدني | 20 | 18
سفلتة | 14 | 16
تخطيط | 6 | 7
\`\`\`

## الإنفاق

\`\`\`area
title الإنفاق التراكمي
ر1 | 10
ر2 | 24
ر3 | 41
ر4 | 63
\`\`\`

## التوزيع

\`\`\`pie
title توزيع التكلفة
أعمال ترابية | 35
رصف | 25
منشآت | 20
مرافق | 12
احتياطي | 8
\`\`\`

## الخطوات التالية

1. اعتماد الجدول الأساسي مع العميل.

2. إصدار خطة إدارة الحركة.

3. حجز نافذة خلاطة الأسفلت.

## بنود العمل

| الإجراء | المسؤول | الاستحقاق | الحالة |
| --- | --- | --- | --- |
| متابعة طلب المعلومات عن مثبتات الواجهة | المعماري | 2026-10-21 | مفتوح |
| تحديث مخطط تحويل الحركة عند التقاطع الشمالي | المدني | 2026-10-24 | قيد المراجعة |
| إغلاق تصريح العمل الليلي عند المحطة 12+400 | السلامة | 2026-10-18 | متوقف |
`;

/** Site-meeting action table with long cells, including one unbreakable token. */
export const actionItemsEn = `Here's the action items table based on your site meeting notes:

| Action Item | Owner | Due Date | Priority |
| --- | --- | --- | --- |
| Address late rebar delivery | Project Manager | 2026-10-20 | High |
| Resolve MEP clash on level 3 | MEP Coordinator | 2026-10-18 | Medium |
| Follow up on RFI for façade anchors | Architect | 2026-10-22 | High |
| Prepare for safety audit | Safety Officer | 2026-10-17 | High |
| Confirm Superduperspecificationforfacadeanchorsystem12b before the pour | Architect | 2026-10-23 | High |

Feel free to adjust any details as needed!
`;

export const actionItemsAr = `هذا جدول بنود العمل من ملاحظات اجتماع الموقع:

| بند العمل | المسؤول | تاريخ الاستحقاق | الأولوية |
| --- | --- | --- | --- |
| معالجة تأخر توريد حديد التسليح | مدير المشروع | 2026-10-20 | عالية |
| حل تعارض الأعمال الكهروميكانيكية في المستوى 3 | منسق الأعمال | 2026-10-18 | متوسطة |
| متابعة طلب المعلومات عن مثبتات الواجهة للواجهة الشمالية | المعماري | 2026-10-22 | عالية |
| التحضير لتدقيق السلامة | مسؤول السلامة | 2026-10-17 | عالية |
| تأكيد مواصفةمثبتاتالواجهةالشماليةالطويلةجدا قبل الصب | المعماري | 2026-10-23 | عالية |

يمكن تعديل أي تفصيل عند الحاجة.
`;
