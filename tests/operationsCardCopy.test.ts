import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import ar from "../lib/i18n/ar";
import en from "../lib/i18n/en";
import { operationsCardCopy } from "../lib/operationsCardCopy";

const enOps = en.advisors.items.operations;
const arOps = ar.advisors.items.operations;

describe("operations advisor card copy", () => {
  it("rewrites only the Arabic card start-up wording", () => {
    assert.match(enOps.summary, /start-up/);
    assert.equal(enOps.capabilities[1], "Start-up and regularisation of operation");
    assert.match(arOps.summary, /والإقلاع/);
    assert.equal(arOps.capabilities[1], "الإقلاع وانتظام التشغيل");

    const card = operationsCardCopy("ar", arOps.summary, arOps.capabilities);
    assert.match(card.summary, /والبدء/);
    assert.doesNotMatch(card.summary, /الإقلاع/);
    assert.equal(card.capabilities[1], "بدء وانتظام التشغيل");
    assert.equal(card.capabilities[0], arOps.capabilities[0]);
    assert.equal(arOps.summary.includes("والإقلاع"), true);
    assert.equal(arOps.playbooks.startup.name, "الإقلاع وانتظام التشغيل");

    const english = operationsCardCopy("en", enOps.summary, enOps.capabilities);
    assert.equal(english.summary, enOps.summary);
    assert.deepEqual(english.capabilities, enOps.capabilities);
  });

  it("applies the rewrite on the advisors card only", () => {
    const page = readFileSync("app/advisors/page.tsx", "utf8");
    assert.match(page, /advisor\.id === "operations"/);
    assert.match(page, /operationsCardCopy/);
    const chat = readFileSync("app/components/AdvisorChat.tsx", "utf8");
    assert.doesNotMatch(chat, /operationsCardCopy/);
    const prompts = readFileSync("lib/advisorPrompts.ts", "utf8");
    const playbooks = readFileSync("lib/playbooks.ts", "utf8");
    const templates = readFileSync("lib/advisors.ts", "utf8");
    assert.doesNotMatch(prompts, /والبدء/);
    assert.doesNotMatch(playbooks, /والبدء/);
    assert.doesNotMatch(templates, /والبدء/);
    assert.match(playbooks, /الإقلاع/);
  });
});