import assert from "node:assert/strict";
import test from "node:test";
import { buildChatDocx, buildChatPdf } from "./chatExport";
import type { StoredMessage } from "./historyDb";

const messages: StoredMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Check pump P-101 and مضخة التغذية",
    attachments: [{ name: "PID.pdf", type: "file", mime: "application/pdf", size: 10 }],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    role: "assistant",
    content: "المضخة ضمن الحدود.\nThe pump is within limits.",
    attachments: [],
    createdAt: "2026-01-01T00:01:00.000Z",
  },
];

test("chat export builds a pdf and a word file", async () => {
  const pdf = await buildChatPdf({ title: "مراجعة المضخة", messages, locale: "ar" });
  const docx = await buildChatDocx({ title: "Pump review", messages, locale: "en" });
  assert.equal(pdf[0], 0x25);
  assert.equal(pdf[1], 0x50);
  assert.equal(docx[0], 0x50);
  assert.equal(docx[1], 0x4b);
  assert.equal(pdf.byteLength > 1000, true);
  assert.equal(docx.byteLength > 1000, true);
});
