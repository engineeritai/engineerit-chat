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

test("viewer fits the stage height and never starts below 12px text", () => {
  const wide = viewerScale({ w: 1168, h: 84, font: 13 }, { w: 390, h: 700 }, false);
  assert.ok(Math.abs(wide.scale - 700 / 84) < 0.001);
  assert.equal(wide.x, 0);
  const floor = viewerScale({ w: 2000, h: 4000, font: 13 }, { w: 390, h: 700 }, false);
  assert.ok(Math.abs(floor.scale - 12 / 13) < 0.001);
  assert.equal(floor.x, 0);
  const rtl = viewerScale({ w: 2000, h: 4000, font: 13 }, { w: 390, h: 700 }, true);
  assert.ok(rtl.x < 0);
  assert.ok(rtl.scale * 13 >= 12);
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
