import assert from "node:assert/strict";
import test from "node:test";
import { createShare, isMissingRelation, readShare } from "./shareStore";
import { publicShareUrl } from "./shareUrl";

test("production share links use https://engineerit.ai/share", () => {
  assert.equal(publicShareUrl("abc12345", "https://engineerit.ai"), "https://engineerit.ai/share/abc12345");
  assert.equal(publicShareUrl("abc12345", "https://engineerit-chat.vercel.app"), "https://engineerit.ai/share/abc12345");
  assert.equal(publicShareUrl("abc12345", "http://127.0.0.1:3000"), "http://127.0.0.1:3000/share/abc12345");
  assert.equal(publicShareUrl("abc12345", "http://localhost:3000/api/share"), "http://localhost:3000/share/abc12345");
});

test("a missing shared_pages table is detected", () => {
  assert.equal(isMissingRelation({ code: "PGRST205", message: "Could not find the table 'public.shared_pages' in the schema cache" }), true);
  assert.equal(isMissingRelation({ code: "42P01", message: 'relation "public.shared_pages" does not exist' }), true);
  assert.equal(isMissingRelation({ code: "23505", message: "duplicate key" }), false);
  assert.equal(isMissingRelation(null), false);
});

test("a share round-trips from the local store when Supabase is not configured", async () => {
  const record = await createShare({
    title: "تركيب مضخة التغذية",
    markdown: "مضخة التغذية **P-101**",
    locale: "ar",
  });
  assert.match(record.id, /^[A-Za-z0-9_-]{8,32}$/);
  const read = await readShare(record.id);
  assert.equal(read?.title, "تركيب مضخة التغذية");
  assert.equal(read?.locale, "ar");
  assert.match(read?.markdown || "", /P-101/);
  assert.equal(await readShare("nope"), null);
  assert.equal(await readShare("expiredlink"), null);
});
