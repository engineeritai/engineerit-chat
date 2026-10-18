import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

function alphaBox(png: { width: number; height: number; pixels: Buffer }) {
  let l = png.width;
  let t = png.height;
  let r = -1;
  let b = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.pixels[(y * png.width + x) * 4 + 3] > 0) {
        if (x < l) l = x;
        if (y < t) t = y;
        if (x > r) r = x;
        if (y > b) b = y;
      }
    }
  }
  return { l, t, r, b, w: r - l + 1, h: b - t + 1 };
}

function solidDot(png: { width: number; height: number; pixels: Buffer }, box: { l: number; t: number; r: number; b: number }) {
  const opaque = new Set<string>();
  for (let y = box.t; y <= box.b; y++) {
    for (let x = box.l; x <= box.r; x++) {
      if (png.pixels[(y * png.width + x) * 4 + 3] > 200) opaque.add(`${x},${y}`);
    }
  }
  let topX = box.l;
  let topY = box.b;
  for (const key of opaque) {
    const [x, y] = key.split(",").map(Number);
    if (y < topY) {
      topX = x;
      topY = y;
    }
  }
  const seen = new Set<string>([`${topX},${topY}`]);
  const stack = [[topX, topY]];
  const comp: number[][] = [];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    comp.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx},${y + dy}`;
      if (opaque.has(key) && !seen.has(key)) {
        seen.add(key);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of comp) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const i = (cy * png.width + cx) * 4;
  return {
    fill: comp.length / ((maxX - minX + 1) * (maxY - minY + 1)),
    center: [png.pixels[i], png.pixels[i + 1], png.pixels[i + 2], png.pixels[i + 3]],
  };
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
    assert.ok(icons.some((icon) => icon.src === "/icon-192-maskable.png?v=2" && icon.purpose === "maskable"));
    assert.ok(icons.some((icon) => icon.src === "/icon-512-maskable.png?v=2" && icon.purpose === "maskable"));
    assert.ok(icons.some((icon) => icon.src === "/icon-eit-192.png?v=2" && icon.purpose === "any"));
    assert.ok(icons.some((icon) => icon.src === "/icon-eit-512.png?v=2" && icon.purpose === "any"));
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
      const box = alphaBox(png);
      const targetW = Math.round(png.width * 0.8);
      assert.ok(Math.abs(box.w - targetW) <= 1, `${file} width ${box.w} vs ${targetW}`);
      const midX = (box.l + box.r) / 2;
      const midY = (box.t + box.b) / 2;
      assert.ok(Math.abs(midX - (png.width - 1) / 2) <= 0.51, file);
      assert.ok(Math.abs(midY - (png.height - 1) / 2) <= 0.51, file);
      assert.ok(Math.abs(box.l - (png.width - 1 - box.r)) <= 1, file);
      assert.ok(Math.abs(box.t - (png.height - 1 - box.b)) <= 1, file);
      const dot = solidDot(png, box);
      assert.ok(dot.fill > 0.7, `${file} dot fill ${dot.fill}`);
      assert.deepEqual(dot.center, [13, 96, 228, 255], file);
    });
  });

  it("keeps the white Home Screen variant on disk and unwired", () => {
    assert.equal(existsSync("public/apple-touch-icon-eit-white.png"), true);
    const white = readRgbaPng("public/apple-touch-icon-eit-white.png");
    assert.equal(white.width, 180);
    const corner = (x: number, y: number) => {
      const i = (white.width * y + x) * 4;
      return [white.pixels[i], white.pixels[i + 1], white.pixels[i + 2], white.pixels[i + 3]];
    };
    assert.deepEqual(corner(0, 0), [255, 255, 255, 255]);
    const sources = ["app/layout.tsx", "app/manifest.ts", "public/sw.js"]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    assert.equal(sources.includes("apple-touch-icon-eit-white"), false);
  });

  it("uses a solid i-dot on the eit mark and leaves the wordmark hollow", () => {
    const mark = readFileSync("public/eit.svg", "utf8");
    const path = readFileSync("app/components/marketing/eitPath.ts", "utf8");
    const wordmark = readFileSync("public/wordmark.svg", "utf8");
    assert.equal(mark.includes("M129.59 22.25"), false);
    assert.equal(path.includes("M129.59 22.25"), false);
    assert.equal(mark.includes("M113.05 29.86"), true);
    assert.equal(wordmark.includes("M739.75 22.25"), true);
    assert.equal(wordmark.includes("M723.21 29.86"), true);
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
    assert.match(layout, /rel="apple-touch-icon" href="\/apple-touch-icon-eit\.png\?v=2"/);
    assert.doesNotMatch(layout, /apple-touch-icon-dark/);
    assert.match(layout, /url: "\/apple-touch-icon-eit\.png\?v=2"/);
    assert.match(worker, /engineerit-shell-v4/);
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
