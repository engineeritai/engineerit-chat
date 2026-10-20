export const INSTALL_DISMISS_KEY = "engineerit.install.dismissedAt";
export const INSTALL_OPEN_EVENT = "engineerit-open-install";
export const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export type InstallPlatform = "android" | "ios-safari" | "ios-other" | "other";

export function dismissIsActive(stored: string | null, now = Date.now()): boolean {
  if (!stored) return false;
  const at = Number(stored);
  if (!Number.isFinite(at)) return false;
  return now - at < DISMISS_MS;
}

/**
 * iOS browsers and in-app webviews other than Safari cannot add a home-screen icon.
 * X/Twitter and LinkedIn ship a WKWebView with no share sheet, so they must not
 * be told to tap Share inside that webview.
 */
const IOS_WITHOUT_HOME_SCREEN =
  /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|Instagram|FBAN|FBAV|Line\/|Twitter|LinkedInApp/i;

export function installPlatform(
  ua: string,
  opts: { platform?: string; maxTouchPoints?: number } = {}
): InstallPlatform {
  const classicIos = /iPad|iPhone|iPod/.test(ua);
  const ipadOs =
    opts.platform === "MacIntel" &&
    (opts.maxTouchPoints ?? 0) > 1 &&
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgiOS/.test(ua);
  if (classicIos || ipadOs) {
    return IOS_WITHOUT_HOME_SCREEN.test(ua) ? "ios-other" : "ios-safari";
  }
  if (/Android/i.test(ua)) return "android";
  return "other";
}
