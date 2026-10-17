/**
 * Shared URL and App Store policy helpers.
 * Classic script in the WebView (window.EngineeritPolicy) and a CommonJS module in Node tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.EngineeritPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var SITE_ORIGIN = "https://engineerit.ai";

  /** Paths that sell or manage a paid digital subscription. */
  var PURCHASE_PATH_PREFIXES = [
    "/pricing",
    "/subscription",
    "/payment",
    "/api/checkout/moyasar",
    "/api/payments",
    "/api/subscribe",
  ];

  /**
   * Short labels used as purchase buttons in the current web UI (EN and AR).
   * Matched against the trimmed text of a link or button, not against paragraphs.
   */
  var PURCHASE_CTA_EXACT = [
    "upgrade",
    "subscribe",
    "pricing",
    "view pricing",
    "view plans & subscribe",
    "view plans and subscribe",
    "subscribe / upgrade",
    "manage / upgrade subscription",
    "manage / upgrade",
    "buy now",
    "choose plan",
    "get this plan",
    "الأسعار",
    "الاشتراك",
    "ترقية",
    "اشترك",
    "إدارة الاشتراك",
  ];

  function normalize(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function parseUrl(input, base) {
    try {
      return new URL(String(input), base || SITE_ORIGIN);
    } catch (err) {
      return null;
    }
  }

  function isSiteHost(hostname) {
    var host = String(hostname || "").toLowerCase();
    return host === "engineerit.ai" || host.endsWith(".engineerit.ai");
  }

  function isPaymentHost(hostname) {
    var host = String(hostname || "").toLowerCase();
    if (!host) return false;
    if (host === "moyasar.com" || host.endsWith(".moyasar.com")) return true;
    if (host === "paddle.com" || host.endsWith(".paddle.com")) return true;
    return false;
  }

  function pathIsPurchase(pathname) {
    var path = pathname || "/";
    if (path.length > 1 && path.charAt(path.length - 1) === "/") {
      path = path.slice(0, -1);
    }
    for (var i = 0; i < PURCHASE_PATH_PREFIXES.length; i++) {
      var prefix = PURCHASE_PATH_PREFIXES[i];
      if (path === prefix || path.indexOf(prefix + "/") === 0) return true;
    }
    return false;
  }

  function isPaymentUrl(input) {
    var url = parseUrl(input);
    if (!url) return false;
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return isPaymentHost(url.hostname);
  }

  function isPurchaseHref(input) {
    var url = parseUrl(input);
    if (!url) return false;
    if (isPaymentHost(url.hostname)) return true;
    if (!isSiteHost(url.hostname)) return false;
    return pathIsPurchase(url.pathname);
  }

  function isPurchaseCtaText(text) {
    var value = normalize(text);
    if (!value || value.length > 80) return false;
    return PURCHASE_CTA_EXACT.indexOf(value) !== -1;
  }

  /**
   * Map a deep link onto the public site.
   * engineerit://chat -> https://engineerit.ai/chat
   * engineerit://open/profile?x=1 -> https://engineerit.ai/profile?x=1
   * https://www.engineerit.ai/chat -> https://engineerit.ai/chat
   */
  function toSiteUrl(raw) {
    var fallback = SITE_ORIGIN + "/";
    if (!raw) return fallback;
    var url = parseUrl(raw, SITE_ORIGIN);
    if (!url) return fallback;

    if (url.protocol === "engineerit:") {
      var path = url.pathname || "";
      var host = url.hostname || "";
      if (host === "open") {
        path = path || "/";
      } else if (host && host !== "open") {
        path = "/" + host + (path === "/" ? "" : path);
      }
      if (!path || path.charAt(0) !== "/") path = "/" + (path || "");
      return SITE_ORIGIN + path + url.search + url.hash;
    }

    if (isSiteHost(url.hostname)) {
      return SITE_ORIGIN + url.pathname + url.search + url.hash;
    }

    return fallback;
  }

  function showsPrice(text) {
    var value = String(text || "");
    if (!value || value.length > 280) return false;
    return /(?:\bSAR\b|\bUSD\b|﷼)\s*\d|\d+(?:[.,]\d+)?\s*(?:SAR|﷼)/i.test(value);
  }

  return {
    SITE_ORIGIN: SITE_ORIGIN,
    PURCHASE_PATH_PREFIXES: PURCHASE_PATH_PREFIXES,
    isPaymentHost: isPaymentHost,
    isPaymentUrl: isPaymentUrl,
    isPurchaseHref: isPurchaseHref,
    isPurchaseCtaText: isPurchaseCtaText,
    pathIsPurchase: pathIsPurchase,
    toSiteUrl: toSiteUrl,
    showsPrice: showsPrice,
  };
});
