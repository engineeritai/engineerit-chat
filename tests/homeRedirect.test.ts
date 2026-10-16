import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("the home page and How it works stay put for signed-in visitors", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  const landing = readFileSync("app/components/marketing/LandingView.tsx", "utf8");
  const header = readFileSync("app/components/marketing/MarketingHeader.tsx", "utf8");
  const sidebar = readFileSync("app/components/marketing/AppSidebar.tsx", "utf8");

  assert.equal(existsSync("app/components/marketing/LoggedInChatRedirect.tsx"), false);
  assert.equal(home.includes("LoggedInChatRedirect"), false);
  assert.doesNotMatch(home, /router\.(replace|push)\(\s*["']\/chat["']/);
  assert.doesNotMatch(home, /location\.(href|assign|replace)\s*=\s*["']\/chat["']/);
  assert.match(landing, /id="how-it-works"/);
  assert.doesNotMatch(landing, /router\.(replace|push)\(\s*["']\/chat["']/);
  assert.doesNotMatch(header, /router\.(replace|push)\(\s*["']\/chat["']/);
  assert.match(sidebar, /\/how-it-works/);
});
