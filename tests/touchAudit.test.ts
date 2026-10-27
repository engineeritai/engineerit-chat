import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { saveRoute, unreliableDownload } from "../lib/saveFile";
import { viewerScale } from "../lib/viewerScale";

test("iOS and Xiaomi save through the share sheet, other browsers download", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
  const xiaomi = "Mozilla/5.0 (Linux; Android 14; Redmi Note 13) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.0";
  const chrome = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36";
  const samsung = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36 SamsungBrowser/26.0";
  assert.equal(saveRoute(iphone, true), "share");
  assert.equal(saveRoute(iphone, false), "tab");
  assert.equal(saveRoute(xiaomi, true), "share");
  assert.equal(saveRoute(xiaomi, false), "tab");
  assert.equal(saveRoute(chrome, true), "download");
  assert.equal(saveRoute(samsung, false), "download");
  assert.equal(saveRoute("Mozilla/5.0 (Windows NT 10.0)", false), "download");
  assert.equal(unreliableDownload("Mi Browser"), true);
  assert.equal(unreliableDownload(samsung), false);
});

test("viewer fits a wide chart to the screen width and never upscales past 2x", () => {
  const wide = viewerScale({ w: 1168, h: 84, font: 13 }, { w: 390, h: 700 }, false);
  assert.ok(Math.abs(wide.scale - 390 / 1168) < 0.001);
  assert.ok(wide.scale <= 2);
  assert.equal(wide.panX, false);
  assert.ok(Math.abs(wide.x) < 0.5);
  assert.ok(wide.y > 0);
  assert.ok(1168 * wide.scale <= 390 + 0.5);

  const rtl = viewerScale({ w: 1168, h: 84, font: 13 }, { w: 390, h: 700 }, true);
  assert.equal(rtl.panX, false);
  assert.ok(Math.abs(rtl.x) < 0.5);

  const landscape = viewerScale({ w: 1168, h: 84, font: 13 }, { w: 844, h: 320 }, false);
  assert.ok(Math.abs(landscape.scale - 844 / 1168) < 0.001);
  assert.equal(landscape.panX, false);
  assert.ok(Math.abs(landscape.x) < 0.5);
  assert.ok(landscape.y > 0);

  const contained = viewerScale({ w: 400, h: 200, font: 13 }, { w: 1440, h: 800 }, false);
  assert.ok(Math.abs(contained.scale - 16 / 13) < 0.001);
  assert.ok(contained.scale <= 2);
  assert.equal(contained.panX, false);
  assert.ok(Math.abs(contained.x - (1440 - 400 * contained.scale) / 2) < 0.01);
  assert.ok(contained.y > 0);

  const tinyFont = viewerScale({ w: 100, h: 40, font: 4 }, { w: 1440, h: 800 }, false);
  assert.ok(Math.abs(tinyFont.scale - 2) < 0.001);
});

test("touch styles keep pinch zoom and block pull-to-refresh", () => {
  const design = readFileSync(new URL("../app/design.css", import.meta.url), "utf8");
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(design, /touch-action:\s*manipulation/);
  assert.match(design, /overscroll-behavior-y:\s*contain/);
  assert.match(design, /\.chart-viewer-close[\s\S]*min-height:\s*44px/);
  assert.match(design, /@media \(hover:\s*none\)/);
  assert.match(globals + design, /touch-action:\s*pan-x pinch-zoom/);
  assert.doesNotMatch(globals + design, /pan-x pan-y/);
  assert.doesNotMatch(layout, /maximumScale/);
  assert.match(layout, /interactiveWidget:\s*"resizes-content"/);
  assert.match(layout, /initialScale:\s*1/);
});
