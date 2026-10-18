import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assistantRules } from "../lib/assistantRules";
import {
  asksForDiagram,
  claimsDiagram,
  diagramRetryNeeded,
  ensureDiagramMarkdown,
  ensureReplyCharts,
  hasRenderableFlow,
  hydroReplyEn,
  requestedCharts,
  sanitizeFlowchart,
  stageGateReplyAr,
  stageGateReplyEn,
} from "../lib/diagramReply";
import { flowSvg } from "../lib/flowSvg";
import { parseMessage } from "../lib/messageDocument";
import { renderChartSvg } from "../lib/scheduleSvg";

const prior = `## Project stage-gate workflow

1. Identify the opportunity
2. Feasibility and concept select
3. Define the scope and basis
4. Execute the project
5. Start up and handover
6. Operate and close`;

describe("diagram replies", () => {
  it("recognises English and Arabic diagram requests", () => {
    for (const phrase of ["Put it in diagram", "Draw a process diagram of a hydrocracker plant", "flowchart", "process flow", "ارسم", "مخطط", "رسم تخطيطي"]) {
      assert.equal(asksForDiagram(phrase), true, phrase);
    }
    assert.equal(asksForDiagram("Show the weekly S-curve"), false);
    assert.equal(asksForDiagram("make Gantt chart for plant shutdown"), false);
    assert.equal(asksForDiagram("اعمل مخطط جانت لإيقاف المحطة"), false);
    assert.equal(asksForDiagram("جدول زمني لإيقاف المصنع"), false);
    assert.equal(requestedCharts("make Gantt chart for plant shutdown").gantt, true);
    assert.equal(requestedCharts("make s-curve").scurve, true);
    assert.equal(requestedCharts("make s-curve").flowchart, false);
    assert.equal(requestedCharts("Put it in diagram").flowchart, true);
  });

  it("turns the stage-gate follow-up into a left-to-right flowchart", () => {
    assert.equal(diagramRetryNeeded(stageGateReplyEn, "Put it in diagram"), true);
    const repaired = ensureDiagramMarkdown(stageGateReplyEn, prior, true);
    assert.match(repaired, /```mermaid/);
    assert.match(repaired, /flowchart LR/);
    assert.doesNotMatch(repaired, /flowchart TD/);
    assert.match(repaired, /Identify the opportunity/);
    assert.match(repaired, /Operate and close/);
    const blocks = parseMessage(stageGateReplyEn);
    const diagram = blocks.find((block) => block.type === "diagram");
    assert.ok(diagram && diagram.type === "diagram");
    if (diagram?.type === "diagram") assert.match(diagram.source, /flowchart LR/);
    const arabic = parseMessage(stageGateReplyAr);
    const arDiagram = arabic.find((block) => block.type === "diagram");
    assert.ok(arDiagram && arDiagram.type === "diagram");
    if (arDiagram?.type === "diagram") {
      assert.match(arDiagram.source, /flowchart LR/);
      assert.match(arDiagram.source, /تحديد الفرصة/);
    }
    assert.match(sanitizeFlowchart('flowchart TD\n  A["One"] --> B["Two"]', "rtl") || "", /^flowchart RL/);
  });

  it("quotes parentheses and ampersands and stacks a long flow", () => {
    const fence = hydroReplyEn.match(/```mermaid\n([\s\S]*?)```/)?.[1] || "";
    const clean = sanitizeFlowchart(fence);
    assert.ok(clean);
    assert.match(clean || "", /flowchart LR/);
    assert.doesNotMatch(clean || "", /flowchart TD/);
    assert.match(clean || "", /Feed\["Feedstock \(Vacuum Gas Oil\)"\]/);
    assert.match(clean || "", /Separator\["HP Separator & Recycle"\]/);
    assert.match(sanitizeFlowchart(fence, "rtl") || "", /flowchart RL/);
    assert.equal(hasRenderableFlow(ensureDiagramMarkdown(hydroReplyEn)), true);
    const blocks = parseMessage(hydroReplyEn);
    const diagram = blocks.find((block) => block.type === "diagram");
    assert.ok(diagram && diagram.type === "diagram");
    if (diagram?.type === "diagram") assert.match(diagram.source, /flowchart LR/);
  });

  it("still draws a flowchart when the model only returns an S-curve", () => {
    const reply = "Cumulative progress is below.\n\n```scurve\ntitle S-curve\nWk1 | 10\nWk2 | 25\n```";
    const user = "Draw a process diagram of a hydrocracker plant. Then an S-curve.";
    const fixed = ensureDiagramMarkdown(reply, user, true);
    assert.match(fixed, /```scurve/);
    assert.match(fixed, /flowchart LR/);
    assert.match(fixed, /hydrocracker plant/);
    assert.equal(diagramRetryNeeded(reply, user), true);
    assert.equal(hasRenderableFlow(fixed), true);
  });

  it("draws an Arabic flowchart when the model only returns an S-curve", () => {
    const reply = "وصف قصير.\n\n```scurve\ntitle S-curve\nStart | 0 | 0\nWk1 | 20 | 10\n```";
    const user = "ارسم مخطط عملية وحدة التكسير الهيدروجيني. ثم اعرض منحنى S كاتجاه.";
    const fixed = ensureDiagramMarkdown(reply, user, true);
    assert.match(fixed, /```scurve/);
    assert.match(fixed, /flowchart LR/);
    assert.match(fixed, /التكسير الهيدروجيني/);
    assert.equal(hasRenderableFlow(fixed), true);
  });

  it("keeps a branched mermaid fence instead of dropping it as ascii art", () => {
    const reply = [
      "Here's a process diagram for a hydrocracker plant using mermaid syntax:",
      "",
      "```mermaid",
      "flowchart TD",
      '  A["Feed Preparation"]',
      '  B["Hydrocracking Unit"]',
      '  C["Separation"]',
      '  D["Distillation"]',
      '  E["Hydrogen Recovery"]',
      '  F["Product Storage"]',
      '  G["Recycled Hydrogen"]',
      "  A --> B",
      "  B --> C",
      "  C --> D",
      "  C --> E",
      "  D --> F",
      "  E --> G",
      "  G --> A",
      "```",
      "",
      "This diagram outlines the main steps.",
    ].join("\n");
    const blocks = parseMessage(reply);
    const diagram = blocks.find((block) => block.type === "diagram");
    assert.ok(diagram && diagram.type === "diagram");
    if (diagram?.type === "diagram") {
      assert.match(diagram.source, /Feed Preparation/);
      assert.match(diagram.source, /Recycled Hydrogen/);
    }
  });

  it("stacks both outputs of a branch in the next column", () => {
    const source = `flowchart LR
  Sep["Product Separation"]
  Light["Light Products"]
  Heavy["Heavy Products"]
  Sep --> Light
  Sep --> Heavy`;
    const svg = flowSvg(source, "ltr");
    assert.ok(svg);
    assert.match(svg || "", /data-edge="Sep-Light"/);
    assert.match(svg || "", /data-edge="Sep-Heavy"/);
    assert.match(svg || "", /font-size="13"/);
    assert.doesNotMatch(svg || "", /viewBox="0 0 272 /);
    const box = (markup: string | null, id: string) => {
      const match = markup?.match(new RegExp(`data-node="${id}" x="([\\d.]+)" y="([\\d.]+)"`));
      assert.ok(match, id);
      return { x: Number(match?.[1]), y: Number(match?.[2]) };
    };
    const parent = box(svg, "Sep");
    const light = box(svg, "Light");
    const heavy = box(svg, "Heavy");
    assert.equal(light.x, heavy.x);
    assert.notEqual(light.y, heavy.y);
    assert.ok(light.x > parent.x);
    const rtl = flowSvg(source, "rtl");
    assert.ok(box(rtl, "Light").x < box(rtl, "Sep").x);
    assert.equal(box(rtl, "Light").x, box(rtl, "Heavy").x);
  });

  it("leaves an ordinary answer unchanged", () => {
    const text = "The pump is API 610. Confirm the nozzle loads.";
    assert.equal(claimsDiagram(text), false);
    assert.equal(ensureDiagramMarkdown(text), text);
  });

  it("tells the model to emit flowchart LR and not to claim a missing diagram", () => {
    const rules = assistantRules({ locale: "en" });
    assert.match(rules, /flowchart LR/);
    assert.match(rules, /flowchart RL/);
    assert.doesNotMatch(rules, /flowchart TD/);
    assert.match(rules, /Never output a flowchart for a Gantt/);
    assert.match(rules, /put it in diagram/);
    assert.match(rules, /ارسم/);
    assert.match(rules, /رسم تخطيطي/);
    assert.match(rules, /Never say a diagram/);
    assert.match(rules, /Never output a flowchart for a Gantt/);
    assert.match(readFileSync("app/api/chat/route.ts", "utf8"), /diagramRetryNeeded/);
    assert.match(readFileSync("app/api/chat/route.ts", "utf8"), /hasRenderableGantt/);
    assert.match(readFileSync("app/design.css", "utf8"), /\.diagram-frame svg[\s\S]*min-width:\s*0/);
  });

  it("turns a plant-shutdown flowchart into a Gantt and keeps 12px type", () => {
    const reply = [
      "Here is the shutdown plan.",
      "",
      "## Preparation:",
      "",
      "## Shutdown:",
      "",
      "## Post-Shutdown:",
      "",
      "```mermaid",
      "flowchart TD",
      '  A["Preparation:"] --> B["Shutdown:"]',
      '  B --> C["Post-Shutdown:"]',
      "```",
    ].join("\n");
    const fixed = ensureReplyCharts(reply, "make Gantt chart for plant shutdown");
    assert.match(fixed, /gantt/);
    assert.doesNotMatch(fixed, /flowchart/);
    const gantt = fixed.match(/```mermaid\n([\s\S]*?)```/)?.[1] || "";
    assert.match(gantt, /Preparation :t1/);
    assert.doesNotMatch(gantt, /Preparation:/);
    assert.equal(diagramRetryNeeded(reply, "make Gantt chart for plant shutdown"), false);
    const blocks = parseMessage(fixed);
    assert.equal(blocks.some((block) => block.type === "diagram"), false);
    const chart = blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart" && chart.model.kind === "gantt");
    if (chart?.type !== "chart" || chart.model.kind !== "gantt") return;
    assert.deepEqual(chart.model.tasks.map((task) => task.name), ["Preparation", "Shutdown", "Post-Shutdown"]);
    assert.equal(chart.model.tasks[1].dependsOn, "t1");
    assert.equal(chart.model.tasks[1].critical, true);
    const svg = renderChartSvg(chart.model, "ltr", "dark");
    assert.match(svg, /data-chart="gantt"/);
    assert.match(svg, /data-kind="today"/);
    assert.match(svg, /data-kind="dependency"/);
    assert.match(svg, /font-size="12"/);
    assert.match(svg, /style="width:\d+px/);
    assert.doesNotMatch(svg, />Preparation</);
    const firstBar = Number(/data-id="t1"[^>]*\sx="([\d.]+)"/.exec(svg)?.[1]);
    assert.ok(firstBar < 80, `first bar starts at ${firstBar}`);
    assert.doesNotMatch(svg, /font-size="(?:1[4-9]|[2-9]\d)"/);
    assert.match(svg, /#0b1220/);
    const fallback = flowSvg(sanitizeFlowchart('flowchart TD\n  A["Preparation:"] --> B["Shutdown:"]') || "", "ltr");
    assert.match(fallback || "", /font-size="13"/);
    assert.match(fallback || "", /data-font="13"/);
    assert.doesNotMatch(fallback || "", /Preparation:/);
    assert.doesNotMatch(fallback || "", /width:100%/);
  });

  it("turns an Arabic shutdown flowchart into a right-to-left Gantt", () => {
    const reply = "## التحضير:\n\n## الإيقاف:\n\n## ما بعد الإيقاف:";
    const fixed = ensureReplyCharts(reply, "اعمل مخطط جانت لإيقاف المحطة");
    assert.match(fixed, /gantt/);
    assert.doesNotMatch(fixed, /flowchart/);
    assert.match(fixed, /إيقاف المحطة/);
    const blocks = parseMessage(fixed);
    const chart = blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart" && chart.model.kind === "gantt");
    if (chart?.type !== "chart" || chart.model.kind !== "gantt") return;
    const svg = renderChartSvg(chart.model, "rtl", "dark");
    assert.match(svg, /direction="rtl"/);
    assert.match(svg, /data-kind="today"/);
    const xOf = (id: string) => Number(new RegExp(`data-id="${id}"[^>]*\\sx="([\\d.]+)"`).exec(svg)?.[1]);
    assert.ok(xOf("t1") > xOf("t2"));
  });

  it("does not turn an S-curve or a table into a flowchart", () => {
    const curve = ensureReplyCharts("## Preparation:\n\n## Shutdown:", "make s-curve");
    assert.match(curve, /```scurve/);
    assert.doesNotMatch(curve, /flowchart/);
    assert.equal(parseMessage(curve).some((block) => block.type === "diagram"), false);
    assert.equal(parseMessage(curve).some((block) => block.type === "chart" && block.model.kind === "scurve"), true);
    const table = "| Item | Status |\n| --- | --- |\n| Pump | On order |\n| Motor | Approved |";
    assert.equal(ensureReplyCharts(table, "Show the comparison table"), table);
    assert.equal(parseMessage(table).some((block) => block.type === "diagram"), false);
    const diagram = ensureReplyCharts(stageGateReplyEn, "Put it in diagram");
    assert.match(diagram, /flowchart LR/);
    assert.doesNotMatch(diagram, /\ngantt/);
  });
});
