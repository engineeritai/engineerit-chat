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

تُركّب مضخة التغذية P-101 داخل حدود البطارية. التسلسل أدناه هو الخطة الحالية.

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
- أبقِ مسار التوريد الحرج ظاهراً في التقرير الأسبوعي.
1. أصدر ورقة بيانات المحرك.
2. احجز فريق المحاذاة لأسبوع 10 أكتوبر.
`;
