import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EIT_VIEWBOX } from "../app/components/marketing/eitPath";
import { eitPlateMarkSize } from "../lib/eitPlateSize";
import {
  formatDaySeparator,
  formatMessageTime,
  isoOnDay,
  parseCreatedAt,
} from "../lib/messageTime";

const zone = "Asia/Riyadh";
const now = new Date("2026-10-18T12:00:00.000Z");
const today = "2026-10-18T13:32:00.000Z";
const yesterday = "2026-10-17T13:32:00.000Z";
const older = "2026-10-16T13:32:00.000Z";

function lin(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrast(fg: [number, number, number], bg: [number, number, number]) {
  const lum = (rgb: [number, number, number]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const hi = Math.max(lum(fg), lum(bg));
  const lo = Math.min(lum(fg), lum(bg));
  return (hi + 0.05) / (lo + 0.05);
}

describe("message timestamps", () => {
  it("formats today, yesterday, and older dates in English", () => {
    assert.equal(formatMessageTime(today, "en", now, zone), "4:32 PM");
    assert.equal(formatMessageTime(yesterday, "en", now, zone), "Yesterday 4:32 PM");
    assert.equal(formatMessageTime(older, "en", now, zone), "Oct 16, 4:32 PM");
  });

  it("formats Arabic with western digits", () => {
    assert.equal(formatMessageTime(today, "ar", now, zone), "4:32 م");
    assert.equal(formatMessageTime(yesterday, "ar", now, zone), "أمس 4:32 م");
    assert.equal(formatMessageTime(older, "ar", now, zone), "16 أكتوبر، 4:32 م");
    assert.equal(formatDaySeparator(today, "ar", now, zone), "اليوم");
    assert.equal(formatDaySeparator(yesterday, "ar", now, zone), "أمس");
  });

  it("names the day separator in English", () => {
    assert.equal(formatDaySeparator(today, "en", now, zone), "Today");
    assert.equal(formatDaySeparator(yesterday, "en", now, zone), "Yesterday");
    assert.equal(formatDaySeparator(older, "en", now, zone), "Oct 16");
  });

  it("hides a missing timestamp and rejects a bad created_at", () => {
    assert.equal(formatMessageTime(undefined, "en", now, zone), null);
    assert.equal(formatMessageTime("not-a-date", "en", now, zone), null);
    assert.equal(parseCreatedAt("2026-10-16T13:32:00.000Z"), "2026-10-16T13:32:00.000Z");
    assert.equal(parseCreatedAt("nope"), undefined);
    assert.equal(parseCreatedAt(null), undefined);
  });

  it("builds a Riyadh wall-clock instant", () => {
    const iso = isoOnDay(0, 16, 32, now, zone);
    assert.equal(formatMessageTime(iso, "en", now, zone), "4:32 PM");
    const prior = isoOnDay(-1, 16, 32, now, zone);
    assert.equal(formatMessageTime(prior, "en", now, zone), "Yesterday 4:32 PM");
  });
});

describe("chat bubble contrast and avatar plate", () => {
  it("keeps user and assistant text at AA", () => {
    assert.ok(contrast([17, 20, 24], [234, 241, 255]) >= 4.5);
    assert.ok(contrast([92, 101, 112], [234, 241, 255]) >= 4.5);
    assert.ok(contrast([17, 20, 24], [255, 255, 255]) >= 4.5);
    assert.ok(contrast([92, 101, 112], [255, 255, 255]) >= 4.5);
    assert.ok(contrast([234, 241, 255], [28, 45, 79]) >= 4.5);
    assert.ok(contrast([197, 212, 238], [28, 45, 79]) >= 4.5);
    assert.ok(contrast([232, 237, 245], [18, 22, 28]) >= 4.5);
    assert.ok(contrast([183, 192, 204], [18, 22, 28]) >= 4.5);
    const css = readFileSync("app/design.css", "utf8");
    assert.match(css, /#EAF1FF/);
    assert.match(css, /#1c2d4f/);
    assert.match(css, /#12161c/);
  });

  it("sizes the plate mark to about 70 percent of the circle", () => {
    const [, , vbW, vbH] = EIT_VIEWBOX.split(" ").map(Number);
    const sized = eitPlateMarkSize(32, vbW!, vbH!);
    const ratio = sized.width / 32;
    assert.ok(ratio >= 0.68 && ratio <= 0.72, `ratio ${ratio}`);
    assert.ok(sized.height < sized.width);
    assert.match(readFileSync("app/components/marketing/EitMark.tsx", "utf8"), /eitPlateMarkSize/);
    assert.match(readFileSync("app/design.css", "utf8"), /\.eit-plate\s*\{[^}]*box-sizing:\s*border-box/);
  });
});
