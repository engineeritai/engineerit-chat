/**
 * Build the Capacitor asset master from /public/engineerit-logo.PNG.
 * @capacitor/assets then writes the Android and iOS icon and splash densities.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, "..");
const logoPath = path.resolve(mobileRoot, "../public/engineerit-logo.PNG");
const resourcesDir = path.join(mobileRoot, "resources");
const wwwImg = path.join(mobileRoot, "www", "img");

if (!fs.existsSync(logoPath)) {
  console.error("Logo not found at " + logoPath);
  process.exit(1);
}

fs.mkdirSync(resourcesDir, { recursive: true });
fs.mkdirSync(wwwImg, { recursive: true });

const trimmed = await sharp(logoPath).ensureAlpha().trim({ threshold: 12 }).png().toBuffer();
await sharp(trimmed).png().toFile(path.join(resourcesDir, "logo.png"));
await sharp(trimmed).resize({ width: 640, fit: "inside" }).png().toFile(path.join(wwwImg, "logo.png"));

const androidDir = path.join(mobileRoot, "android");
const iosDir = path.join(mobileRoot, "ios");
if (!fs.existsSync(androidDir) || !fs.existsSync(iosDir)) {
  console.log("Wrote resources/logo.png. Add the native projects, then run this again.");
  process.exit(0);
}

const result = spawnSync(
  "npx",
  [
    "capacitor-assets",
    "generate",
    "--android",
    "--ios",
    "--assetPath",
    "resources",
    "--iconBackgroundColor",
    "#ffffff",
    "--iconBackgroundColorDark",
    "#F9FAFB",
    "--splashBackgroundColor",
    "#F9FAFB",
    "--splashBackgroundColorDark",
    "#F9FAFB",
    "--logoSplashScale",
    "0.42",
  ],
  { cwd: mobileRoot, stdio: "inherit" }
);

process.exit(result.status ?? 1);
