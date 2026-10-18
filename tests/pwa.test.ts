import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import manifest from "../app/manifest";
import { DISMISS_MS, dismissIsActive, installPlatform } from "../lib/installApp";
import { shellCopy } from "../lib/shell";

const HOME_ICONS = ["public/apple-touch-icon-eit.png", "public/icon-eit-192.png", "public/icon-eit-512.png"];

function readRgbaPng(file: string) {
  const buf = readFileSync(file);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, file);
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + len;
  }
  assert.equal(colorType, 6, file);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[src++];
      const left = x >= 4 ? pixels[row + x - 4] : 0;
      const up = y > 0 ? pixels[row - stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[row - stride + x - 4] : 0;
      let recon = value;
      if (filter === 1) recon = (value + left) & 255;
      else if (filter === 2) recon = (value + up) & 255;
      else if (filter === 3) recon = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const paeth = left + up - upLeft;
        const pa = Math.abs(paeth - left);
        const pb = Math.abs(paeth - up);
        const pc = Math.abs(paeth - upLeft);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        recon = (value + pred) & 255;
      }
      pixels[row + x] = recon;
    }
  }
  return { width, height, pixels };
}

describe("android pwa", () => {
  it("publishes the install manifest the Trusted Web Activity expects", () => {
    const web = manifest();
    assert.equal(web.name, "engineer it");
    assert.equal(web.short_name, "engineer it");
    assert.equal(web.start_url, "/?source=android");
    assert.equal(web.display, "standalone");
    assert.equal(web.background_color, "#f6f7f9");
    assert.equal(web.theme_color, "#1a56ff");
    const icons = web.icons ?? [];
    assert.ok(icons.some((icon) => icon.src === "/icon-192-maskable.png" && icon.purpose === "maskable"));
    assert.ok(icons.some((icon) => icon.src === "/icon-512-maskable.png" && icon.purpose === "maskable"));
    assert.ok(icons.some((icon) => icon.src === "/icon-eit-192.png" && icon.purpose === "any"));
    assert.ok(icons.some((icon) => icon.src === "/icon-eit-512.png" && icon.purpose === "any"));
    assert.equal(icons.filter((icon) => icon.purpose === "any").length, 2);
  });

  it("serves a transparent eit mark for the Home Screen", () => {
    const expected = [180, 192, 512];
    HOME_ICONS.forEach((file, index) => {
      const png = readRgbaPng(file);
      assert.equal(png.width, expected[index], file);
      assert.equal(png.height, expected[index], file);
      const corner = (x: number, y: number) => png.pixels[(png.width * y + x) * 4 + 3];
      assert.equal(corner(0, 0), 0, file);
      assert.equal(corner(png.width - 1, 0), 0, file);
      assert.equal(corner(0, png.height - 1), 0, file);
      assert.equal(corner(png.width - 1, png.height - 1), 0, file);
      let blue = false;
      for (let i = 0; i < png.pixels.length; i += 4) {
        if (png.pixels[i + 3] === 255 && png.pixels[i] === 13 && png.pixels[i + 1] === 96 && png.pixels[i + 2] === 228) {
          blue = true;
          break;
        }
      }
      assert.equal(blue, true, file);
    });
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
    assert.match(layout, /apple-mobile-web-app-title" content="engineer it"/);
    assert.match(layout, /applicationName: "engineer it"/);
    assert.match(layout, /name="application-name" content="engineer it"/);
    assert.match(layout, /appleWebApp:\s*\{[^}]*title: "engineer it"/);
    assert.match(layout, /rel="apple-touch-icon" href="\/apple-touch-icon-eit.png"/);
    assert.doesNotMatch(layout, /apple-touch-icon-dark/);
    assert.match(layout, /url: "\/apple-touch-icon-eit.png"/);
    const android = readFileSync("android/app/src/main/res/values/strings.xml", "utf8");
    const androidAr = readFileSync("android/app/src/main/res/values-ar/strings.xml", "utf8");
    assert.match(android, /<string name="app_name">engineer it<\/string>/);
    assert.match(androidAr, /<string name="app_name">engineer it<\/string>/);
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
