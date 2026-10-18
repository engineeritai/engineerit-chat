import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assistantRules } from "../lib/assistantRules";
import {
  asksForDiagram,
  claimsDiagram,
  diagramRetryNeeded,
  ensureDiagramMarkdown,
  hasRenderableFlow,
  hydroReplyEn,
  sanitizeFlowchart,
  stageGateReplyAr,
  stageGateReplyEn,
} from "../lib/diagramReply";
import { flowSvg } from "../lib/flowSvg";
import { parseMessage } from "../lib/messageDocument";

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
  });

  it("turns the stage-gate follow-up into a top-down flowchart", () => {
    assert.equal(diagramRetryNeeded(stageGateReplyEn, "Put it in diagram"), true);
    const repaired = ensureDiagramMarkdown(stageGateReplyEn, prior, true);
    assert.match(repaired, /```mermaid/);
    assert.match(repaired, /flowchart TD/);
    assert.match(repaired, /Identify the opportunity/);
    assert.match(repaired, /Operate and close/);
    const blocks = parseMessage(stageGateReplyEn);
    const diagram = blocks.find((block) => block.type === "diagram");
    assert.ok(diagram && diagram.type === "diagram");
    if (diagram?.type === "diagram") assert.match(diagram.source, /flowchart TD/);
    const arabic = parseMessage(stageGateReplyAr);
    const arDiagram = arabic.find((block) => block.type === "diagram");
    assert.ok(arDiagram && arDiagram.type === "diagram");
    if (arDiagram?.type === "diagram") {
      assert.match(arDiagram.source, /flowchart TD/);
      assert.match(arDiagram.source, /تحديد الفرصة/);
    }
  });

  it("quotes parentheses and ampersands and stacks a long flow", () => {
    const fence = hydroReplyEn.match(/```mermaid\n([\s\S]*?)```/)?.[1] || "";
    const clean = sanitizeFlowchart(fence);
    assert.ok(clean);
    assert.match(clean || "", /flowchart TD/);
    assert.match(clean || "", /Feed\["Feedstock \(Vacuum Gas Oil\)"\]/);
    assert.match(clean || "", /Separator\["HP Separator & Recycle"\]/);
    assert.equal(hasRenderableFlow(ensureDiagramMarkdown(hydroReplyEn)), true);
    const blocks = parseMessage(hydroReplyEn);
    const diagram = blocks.find((block) => block.type === "diagram");
    assert.ok(diagram && diagram.type === "diagram");
    if (diagram?.type === "diagram") assert.doesNotMatch(diagram.source, /flowchart LR/);
  });

  it("still draws a flowchart when the model only returns an S-curve", () => {
    const reply = "Cumulative progress is below.\n\n```scurve\ntitle S-curve\nWk1 | 10\nWk2 | 25\n```";
    const user = "Draw a process diagram of a hydrocracker plant. Then an S-curve.";
    const fixed = ensureDiagramMarkdown(reply, user, true);
    assert.match(fixed, /```scurve/);
    assert.match(fixed, /flowchart TD/);
    assert.match(fixed, /hydrocracker plant/);
    assert.equal(diagramRetryNeeded(reply, user), true);
    assert.equal(hasRenderableFlow(fixed), true);
  });

  it("draws an Arabic flowchart when the model only returns an S-curve", () => {
    const reply = "وصف قصير.\n\n```scurve\ntitle S-curve\nStart | 0 | 0\nWk1 | 20 | 10\n```";
    const user = "ارسم مخطط عملية وحدة التكسير الهيدروجيني. ثم اعرض منحنى S كاتجاه.";
    const fixed = ensureDiagramMarkdown(reply, user, true);
    assert.match(fixed, /```scurve/);
    assert.match(fixed, /flowchart TD/);
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

  it("draws both outputs of a branch beside each other", () => {
    const svg = flowSvg(`flowchart TD
  Sep["Product Separation"]
  Light["Light Products"]
  Heavy["Heavy Products"]
  Sep --> Light
  Sep --> Heavy`, "ltr");
    assert.ok(svg);
    assert.match(svg || "", /data-edge="Sep-Light"/);
    assert.match(svg || "", /data-edge="Sep-Heavy"/);
    const box = (id: string) => {
      const match = svg?.match(new RegExp(`data-node="${id}" x="([\\d.]+)" y="([\\d.]+)"`));
      assert.ok(match, id);
      return { x: Number(match?.[1]), y: Number(match?.[2]) };
    };
    const parent = box("Sep");
    const light = box("Light");
    const heavy = box("Heavy");
    assert.equal(light.y, heavy.y);
    assert.notEqual(light.x, heavy.x);
    assert.ok(light.y > parent.y);
    assert.match(svg || "", /viewBox="0 0 272 /);
  });

  it("leaves an ordinary answer unchanged", () => {
    const text = "The pump is API 610. Confirm the nozzle loads.";
    assert.equal(claimsDiagram(text), false);
    assert.equal(ensureDiagramMarkdown(text), text);
  });

  it("tells the model to emit flowchart TD and not to claim a missing diagram", () => {
    const rules = assistantRules({ locale: "en" });
    assert.match(rules, /flowchart TD/);
    assert.match(rules, /put it in diagram/);
    assert.match(rules, /ارسم/);
    assert.match(rules, /رسم تخطيطي/);
    assert.match(rules, /Never say a diagram/);
    assert.match(readFileSync("app/api/chat/route.ts", "utf8"), /diagramRetryNeeded/);
    assert.match(readFileSync("app/design.css", "utf8"), /\.diagram-frame svg[\s\S]*min-width:\s*0/);
  });
});
