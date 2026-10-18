import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildAdvisorSystemPrompt } from "../lib/advisorPrompts";
import { getAdvisor } from "../lib/advisors";
import ar from "../lib/i18n/ar";
import en from "../lib/i18n/en";
import { getPlaybook } from "../lib/playbooks";

const STARTUP = /[اإأ]لقلاع/;

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules" || name === "test-results") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    else if (/\.(ts|tsx|js|jsx|json|md)$/.test(name)) files.push(path);
  }
  return files;
}

describe("Arabic start-up wording", () => {
  it("uses بدء for commissioning start-up on the operations card", () => {
    const enOps = en.advisors.items.operations;
    const arOps = ar.advisors.items.operations;
    assert.match(enOps.summary, /start-up/);
    assert.equal(enOps.capabilities[1], "Start-up and regularisation of operation");
    assert.match(arOps.summary, /والبدء/);
    assert.doesNotMatch(arOps.summary, STARTUP);
    assert.equal(arOps.capabilities[1], "بدء وانتظام التشغيل");
    assert.equal(arOps.playbooks.startup.name, "بدء وانتظام التشغيل");
    assert.equal(arOps.playbooks.commissioning.outcome, "التسلسل حتى اكتمال التشغيل التجريبي والجاهزية للبدء.");
  });

  it("keeps بدء in the Arabic playbooks and the advisor prompt", () => {
    const advisor = getAdvisor("operations");
    assert.ok(advisor);
    const prompt = buildAdvisorSystemPrompt(advisor!, "ar", "startup");
    assert.match(prompt, /بدء وانتظام التشغيل/);
    assert.match(prompt, /تاريخ البدء/);
    assert.match(prompt, /Do not write الإقلاع/);
    assert.doesNotMatch(prompt.replace("Do not write الإقلاع, الاقلاع, or إقلاع.", ""), STARTUP);
    const commissioning = getPlaybook("operations", "commissioning");
    assert.match(commissioning?.templates.ar ?? "", /جاهز للبدء/);
    assert.match(commissioning?.templates.ar ?? "", /الجاهزية للبدء/);
    const alignment = getPlaybook("operations", "alignment");
    assert.match(alignment?.templates.ar ?? "", /الأثر على البدء أو التسليم/);
  });

  it("leaves no start-up الإقلاع in site source", () => {
    const hits = sourceFiles(".").filter((path) => STARTUP.test(readFileSync(path, "utf8")));
    assert.deepEqual(
      hits.filter((path) => path !== "lib/advisorPrompts.ts" && path !== "tests/operationsCardCopy.test.ts"),
      []
    );
  });
});
