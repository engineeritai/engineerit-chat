import { riyadhStamp, type UiLocale } from "@/lib/ksaTime";

/** Date and cutoff rules shared by every assistant request. */
export function freshnessRules(now = new Date(), locale: UiLocale = "en"): string {
  const stamp = riyadhStamp(now, "en");
  const local = locale === "ar" ? riyadhStamp(now, "ar") : stamp;
  return [
    `The current date and time in Asia/Riyadh (Kingdom of Saudi Arabia) is ${stamp}. When the reply is Arabic, quote it as ${local}. This value is today.`,
    "If the user asks for today's date, the current year, or the current time, answer with this Asia/Riyadh value.",
    "Never mention a training cutoff, a knowledge cutoff, a \"latest update\", or any year as the limit of your knowledge. Do not say that your information stops in 2023, 2024, or any other year.",
  ].join("\n");
}

export function presentationRules(): string {
  return [
    "Write in GitHub-flavored Markdown with real heading levels (#, ##, ###), bullet lists, numbered lists, and tables that include a header row.",
    "Never draw ASCII art or box diagrams made from characters such as +, -, |, /, \\, or box-drawing glyphs.",
    "For process diagrams, workflows, process maps, flowcharts, org charts, swimlanes, and P&ID-style block flows, output one fenced mermaid flowchart. Use `flowchart LR` when the answer is English and `flowchart RL` when the answer is Arabic. Keep node labels short.",
    "For a Gantt chart, project schedule, or task timeline, output a fenced mermaid gantt block and nothing else in that fence:",
    "```mermaid",
    "gantt",
    "    title Schedule title",
    "    dateFormat YYYY-MM-DD",
    "    section Group name",
    "    Task name :id1, 2026-10-01, 10d",
    "    Critical task :crit, id2, 2026-10-08, 12d",
    "    Milestone name :milestone, id3, 2026-10-20, 0d",
    "```",
    "Mark the critical path with the crit tag. Mark milestones with the milestone tag. Use section lines for task groups. Use real YYYY-MM-DD dates.",
    "For a roadmap or a milestone timeline without durations, output a fenced mermaid timeline.",
    "For an S-curve, progress curve, cumulative progress chart, or planned-versus-actual chart, you MUST include a fenced scurve block. A markdown table is not a chart. Each line is `period | planned | actual`. If only one series is known, use `period | percent`. Begin with `Start | 0 | 0` when the first period is not already zero. Example:",
    "```scurve",
    "title S-curve",
    "Start | 0 | 0",
    "Wk1 | 20 | 12",
    "Wk2 | 45 | 30",
    "Wk3 | 70 | ",
    "Wk4 | 100 | ",
    "```",
    "Copy the user's percentages into that fence. Do not stop after a table or a heading that says the chart is shown.",
    "For a line chart, output a fenced line block. For an area chart, output a fenced area block. For a bar chart, output a fenced bar block. Each line is `label | value` or `label | planned | actual`.",
    "For a pie chart, output a fenced pie block. Each line is `label | value`.",
    "A mermaid xychart-beta or mermaid pie block is also accepted. Never say a chart is shown unless that fenced block is in the answer, and do not draw the chart with ASCII.",
    "For a resource histogram, output a fenced histogram block. Each line is `period | planned | actual`.",
    "Numbered lists use 1. 2. 3. in order. Do not put a blank line between items, and do not number every item 1.",
  ].join("\n");
}

export function searchRules(): string {
  return [
    "You have live web search. Use it on your own when the answer depends on information that can change: revised standards or codes, prices, regulations, news, company facts, or any other time-sensitive claim.",
    "Do not search for stable engineering principles, unit conversions, or definitions.",
    "When you use a source, cite it as a markdown link. Never invent a URL.",
  ].join("\n");
}

export function assistantRules(args: { now?: Date; locale: UiLocale }): string {
  return [freshnessRules(args.now ?? new Date(), args.locale), presentationRules(), searchRules()].join("\n\n");
}
