import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileAnalysisAllowed } from "../lib/fileAnalysisAccess";
import { subjectFromSession } from "../lib/sessionSubject";

test("file analysis follows the paid plan, not the browser gate alone", () => {
  assert.equal(fileAnalysisAllowed("assistant"), false);
  assert.equal(fileAnalysisAllowed("guest"), false);
  assert.equal(fileAnalysisAllowed(null), false);
  assert.equal(fileAnalysisAllowed("engineer"), true);
  assert.equal(fileAnalysisAllowed("professional"), true);
  assert.equal(fileAnalysisAllowed("consultant"), true);
  assert.equal(fileAnalysisAllowed("team"), true);
  assert.equal(fileAnalysisAllowed("enterprise"), true);
});

test("a user id in the body is not a session", () => {
  assert.equal(subjectFromSession(null), null);
  assert.equal(subjectFromSession("  "), null);
  assert.equal(subjectFromSession("guest"), null);
  assert.equal(subjectFromSession("user-1"), "user-1");
  const chat = readFileSync("app/api/chat/route.ts", "utf8");
  assert.match(chat, /userId: subjectId/);
  assert.doesNotMatch(chat, /userId: userId/);
});

test("file-analysis errors stay free of Arabic diacritics", () => {
  const source = readFileSync("lib/fileAnalysisAccess.ts", "utf8");
  assert.doesNotMatch(source, /[\u064B-\u0652]/);
});
