import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAttachments } from "./attachmentMeta";

test("attachment metadata drops urls and file payloads", () => {
  const stored = sanitizeAttachments([
    {
      id: "1",
      name: "  P&ID.pdf ",
      type: "file",
      url: "blob:http://local/secret",
      file: { not: "serializable" },
      mime: "application/pdf",
      size: 1200.8,
    },
    { name: "photo.png", type: "image", url: "data:image/png;base64,AAAA" },
    { name: "   " },
    "nope",
  ]);
  assert.deepEqual(stored, [
    { name: "P&ID.pdf", type: "file", mime: "application/pdf", size: 1200 },
    { name: "photo.png", type: "image" },
  ]);
});
