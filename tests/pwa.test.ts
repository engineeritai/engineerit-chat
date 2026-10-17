import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import manifest from "../app/manifest";
import { DISMISS_MS, dismissIsActive, installPlatform } from "../lib/installApp";
import { shellCopy } from "../lib/shell";

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
    const layout = readFileSync("app/layout.tsx", "utf8");
    assert.match(layout, /apple-mobile-web-app-capable/);
    assert.match(layout, /apple-mobile-web-app-title/);
    assert.match(layout, /apple-touch-icon/);
  });

  it("remembers an install dismissal for 14 days and tells iOS browsers apart", () => {
    const now = Date.UTC(2026, 9, 17);
    assert.equal(dismissIsActive(null, now), false);
    assert.equal(dismissIsActive(String(now - DISMISS_MS + 1000), now), true);
    assert.equal(dismissIsActive(String(now - DISMISS_MS - 1000), now), false);
    assert.equal(installPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/131.0.0.0 Mobile"), "android");
    assert.equal(
      installPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1"
      ),
      "ios-safari"
    );
    assert.equal(
      installPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1"
      ),
      "ios-other"
    );
    assert.equal(
      installPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", {
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
      "ios-safari"
    );
    assert.match(shellCopy.en.install.bannerTitle, /Install the app/);
    assert.equal(shellCopy.en.install.menu, "Install app");
    assert.match(shellCopy.en.install.iosSafari, /Add to Home Screen/);
    assert.match(shellCopy.ar.install.iosSafari, /الشاشة الرئيسية/);
    assert.match(shellCopy.ar.install.iosOther, /Safari/);
    assert.match(shellCopy.ar.install.menu, /تثبيت التطبيق/);
  });
});
