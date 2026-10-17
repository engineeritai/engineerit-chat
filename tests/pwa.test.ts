import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import manifest from "../app/manifest";

describe("android pwa", () => {
  it("publishes the install manifest the Trusted Web Activity expects", () => {
    const web = manifest();
    assert.equal(web.name, "engineer it");
    assert.equal(web.short_name, "eit");
    assert.equal(web.start_url, "/?source=android");
    assert.equal(web.display, "standalone");
    assert.equal(web.background_color, "#f6f7f9");
    assert.equal(web.theme_color, "#1a56ff");
    const icons = web.icons ?? [];
    assert.ok(icons.some((icon) => icon.src === "/icon-192-maskable.png" && icon.purpose === "maskable"));
    assert.ok(icons.some((icon) => icon.src === "/icon-512-maskable.png" && icon.purpose === "maskable"));
    assert.ok(icons.some((icon) => icon.src === "/icon-192.png" && icon.purpose === "any"));
    assert.ok(icons.some((icon) => icon.src === "/icon-512.png" && icon.purpose === "any"));
  });

  it("keeps a fetch handler and lists the upload key plus the Play signing TODO", () => {
    const worker = readFileSync("public/sw.js", "utf8");
    assert.match(worker, /addEventListener\("fetch"/);
    const links = JSON.parse(readFileSync("public/.well-known/assetlinks.json", "utf8"));
    const target = links[0].target;
    assert.equal(target.package_name, "ai.engineerit.app");
    assert.equal(target.sha256_cert_fingerprints.length, 1);
    assert.match(target.sha256_cert_fingerprints[0], /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/);
    assert.match(links[0].comment, /Play App Signing SHA-256/);
    const config = readFileSync("next.config.ts", "utf8");
    assert.match(config, /assetlinks\.json/);
    assert.match(config, /application\/json/);
    assert.match(config, /\/privacy".*\/legal\/privacy/);
  });
});
