import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assistantRules } from "../lib/assistantRules";
import { buildAdvisorSystemPrompt } from "../lib/advisorPrompts";
import { getAdvisor } from "../lib/advisors";
import { composerMaxHeight, measureComposer } from "../lib/fitComposer";
import { parseMessage } from "../lib/messageDocument";
import { renderChartSvg } from "../lib/scheduleSvg";

const ownerReply = `Based on the provided weekly progress data, here's how the S-Curve would look:

## Weekly Progress Data

| Week | Cumulative Progress (%) |
| --- | --- |
| Wk1 | 10% |
| Wk2 | 25% |
| Wk3 | 67% |
| Wk4 | 89% |
| Wk5 | 100% |

## S-Curve Chart

**Explanation of the S-Curve:**

- Initial Stage (Wk1-Wk2): Slow progress.
`;

const plannedActual = `## Planned versus actual

| Week | Planned | Actual |
| --- | --- | --- |
| Wk1 | 20% | 12% |
| Wk2 | 45% | 30% |
| Wk3 | 70% | |
| Wk4 | 100% | |
`;

const arabicTable = `## منحنى التقدم

| الأسبوع | التقدم التراكمي |
| --- | --- |
| أسبوع 1 | 10٪ |
| أسبوع 2 | 25٪ |
| أسبوع 3 | 67٪ |
| أسبوع 4 | 100٪ |
`;

describe("s-curve fallback", () => {
  it("draws a chart from the owner's cumulative table even without a fence", () => {
    const blocks = parseMessage(ownerReply);
    const chart = blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart" && chart.model.kind === "scurve");
    if (chart.type !== "chart" || chart.model.kind !== "scurve") return;
    assert.deepEqual(chart.model.points.map((point) => point.planned), [10, 25, 67, 89, 100]);
    const svg = renderChartSvg(chart.model, "ltr");
    assert.match(svg, /data-chart="scurve"/);
    assert.match(svg, /data-kind="planned"/);
    assert.match(svg, / C/);
    assert.match(svg, /#0d60e4/);
    assert.match(svg, />Start</);
    assert.match(svg, />0</);
    assert.match(svg, />100</);
    assert.match(svg, /data-kind="increment"/);
    assert.equal(svg.includes("data-kind=\"actual\""), false);
  });

  it("draws planned and actual with a variance callout", () => {
    const blocks = parseMessage(plannedActual);
    const chart = blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart" && chart.model.kind === "scurve");
    if (chart.type !== "chart" || chart.model.kind !== "scurve") return;
    assert.equal(chart.model.points[1].actual, 30);
    assert.equal(chart.model.points[2].actual, null);
    const svg = renderChartSvg(chart.model, "ltr");
    assert.match(svg, /data-kind="actual"/);
    assert.match(svg, /#ea580c/);
    assert.match(svg, /data-kind="data-date"/);
    assert.match(svg, /Behind plan: -15%/);
    assert.match(svg, /SPI ≈ 0\.67/);
    const rtl = renderChartSvg(parseMessage(arabicTable).find((block) => block.type === "chart")!.type === "chart"
      ? (parseMessage(arabicTable).find((block) => block.type === "chart") as { type: "chart"; model: typeof chart.model }).model
      : chart.model, "rtl");
    assert.match(rtl, /البداية/);
    assert.match(rtl, /متأخر عن المخطط|التقدم/);
  });

  it("draws the fenced scurve the live model returned", () => {
    const blocks = parseMessage("```scurve\ntitle S-curve\nStart | 0 | 0\nWk1 | 10 | \nWk2 | 25 | \nWk3 | 67 | \nWk4 | 89 | \nWk5 | 100 | \n```");
    const chart = blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart" && chart.model.kind === "scurve");
    if (chart.type !== "chart") return;
    assert.deepEqual(chart.model.points.map((point) => point.planned), [0, 10, 25, 67, 89, 100]);
    assert.equal(chart.model.points.every((point) => point.actual == null), true);
    const svg = renderChartSvg(chart.model, "ltr");
    assert.match(svg, /data-chart="scurve"/);
    assert.match(svg, /data-kind="planned"/);
    assert.match(svg, /data-kind="increment"/);
  });

  it("leaves an ordinary table as a table", () => {
    const blocks = parseMessage("| Item | Cost |\n| --- | --- |\n| Pump | 40 bar |\n| Motor | 400 kW |");
    assert.equal(blocks.some((block) => block.type === "chart"), false);
  });

  it("tells the model and the PMO advisor to emit the scurve fence", () => {
    const rules = assistantRules({ locale: "en" });
    assert.match(rules, /MUST include a fenced scurve block/);
    assert.match(rules, /Start \| 0 \| 0/);
    const advisor = getAdvisor("pmo");
    assert.ok(advisor);
    const prompt = buildAdvisorSystemPrompt(advisor!, "en", "schedule");
    assert.match(prompt, /S-curves are a core PMO product/);
    assert.match(prompt, /fenced scurve block/);
    assert.match(prompt, /even while a playbook template is active/);
    assert.match(readFileSync("lib/advisorPrompts.ts", "utf8"), /S-curves are a core PMO product/);
  });

  it("caps the composer at six lines and a third of the phone viewport", () => {
    assert.equal(composerMaxHeight(844), 44 + 5 * 22);
    assert.equal(composerMaxHeight(400), Math.round(400 * 0.32));
    const measured = measureComposer(800, 844);
    assert.equal(measured.height, composerMaxHeight(844));
    assert.equal(measured.scroll, true);
    assert.equal(measureComposer(44, 844).scroll, false);
  });
});
