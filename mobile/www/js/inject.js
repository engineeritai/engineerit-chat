/**
 * Injected into https://engineerit.ai at document start.
 * Android opens Moyasar in the in-app browser. iOS hides purchase UI (reader-style sign-in).
 * File uploads stay on the WebView's native picker (camera, photos, and documents).
 */
(function () {
  var attempts = 0;

  function boot() {
    if (window.__engineeritNativeInstalled) return;
    var policy = window.EngineeritPolicy;
    var cap = window.Capacitor;
    var platform = cap && cap.getPlatform ? cap.getPlatform() : "";
    if (!policy || (platform !== "ios" && platform !== "android")) {
      if (attempts++ < 40) setTimeout(boot, 50);
      return;
    }
    window.__engineeritNativeInstalled = true;
    start(policy, cap, platform);
  }

  function start(policy, cap, platform) {
  var ios = platform === "ios";

  var root = document.documentElement;
  root.setAttribute("data-engineerit-app", platform);
  root.setAttribute("data-engineerit-payments", ios ? "disabled" : "browser");

  var HIDDEN = "engineerit-native-hidden";
  var READER_ID = "engineerit-reader-notice";

  function plugin(name) {
    if (!cap || !cap.Plugins) return null;
    return cap.Plugins[name] || null;
  }

  function installSafeAreaStyle() {
    if (document.getElementById("engineerit-safe-area")) return;
    var style = document.createElement("style");
    style.id = "engineerit-safe-area";
    style.textContent = [
      ":root {",
      "  --engineerit-safe-area-top: env(safe-area-inset-top, 0px);",
      "  --engineerit-safe-area-right: env(safe-area-inset-right, 0px);",
      "  --engineerit-safe-area-bottom: env(safe-area-inset-bottom, 0px);",
      "  --engineerit-safe-area-left: env(safe-area-inset-left, 0px);",
      "}",
      "." + HIDDEN + " { display: none !important; }",
      "html.engineerit-reader-lock body { visibility: hidden !important; }",
      "#" + READER_ID + " { visibility: visible !important; }",
      "#" + READER_ID + " {",
      "  position: fixed; inset: 0; z-index: 2147483646;",
      "  background: #f9fafb; color: #111827;",
      "  display: flex; align-items: center; justify-content: center;",
      "  padding: calc(24px + var(--engineerit-safe-area-top)) 24px calc(24px + var(--engineerit-safe-area-bottom));",
      "  font-family: system-ui, -apple-system, Segoe UI, sans-serif;",
      "}",
      "#" + READER_ID + " .card {",
      "  max-width: 420px; background: #fff; border: 1px solid #e5e7eb;",
      "  border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(17,24,39,0.06);",
      "}",
      "#" + READER_ID + " h1 { font-size: 20px; margin: 0 0 8px; }",
      "#" + READER_ID + " p { margin: 0 0 12px; line-height: 1.5; font-size: 15px; }",
      "#" + READER_ID + " button {",
      "  margin-top: 8px; background: #2563eb; color: #fff; border: 0;",
      "  border-radius: 999px; padding: 10px 16px; font-weight: 600;",
      "}",
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  function hide(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.id === READER_ID) return;
    el.classList.add(HIDDEN);
    el.setAttribute("aria-hidden", "true");
  }

  function showReaderNotice() {
    root.classList.add("engineerit-reader-lock");
    if (document.getElementById(READER_ID)) return;
    var wrap = document.createElement("div");
    wrap.id = READER_ID;
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML =
      '<div class="card">' +
      "<h1>engineerit AI</h1>" +
      "<p>This iOS app is for signing in and using an engineerit.ai account you already have. Subscriptions are not sold in the app.</p>" +
      '<p dir="rtl" lang="ar">هذا التطبيق على iOS لتسجيل الدخول واستخدام حساب engineerit.ai الحالي. لا يُباع الاشتراك داخل التطبيق.</p>' +
      '<button type="button">Continue</button>' +
      "</div>";
    (document.documentElement || document.body).appendChild(wrap);
    var button = wrap.querySelector("button");
    if (button) {
      button.addEventListener("click", function () {
        wrap.remove();
        root.classList.remove("engineerit-reader-lock");
        if (policy.pathIsPurchase(window.location.pathname)) {
          window.location.assign(policy.SITE_ORIGIN + "/chat");
        }
      });
    }
  }

  function scrub(node) {
    if (!ios || !node || node.nodeType !== 1) return;
    if (node.id === READER_ID) return;

    var anchors = node.matches && node.matches("a[href]") ? [node] : [];
    if (node.querySelectorAll) {
      anchors = anchors.concat(Array.prototype.slice.call(node.querySelectorAll("a[href]")));
    }
    anchors.forEach(function (anchor) {
      var href = anchor.getAttribute("href") || "";
      if (policy.isPurchaseHref(href) || policy.isPurchaseCtaText(anchor.textContent)) {
        hide(anchor);
      }
    });

    var controls = [];
    if (node.matches && node.matches("button, a")) controls = [node];
    if (node.querySelectorAll) {
      controls = controls.concat(Array.prototype.slice.call(node.querySelectorAll("button, a")));
    }
    controls.forEach(function (control) {
      if (policy.isPurchaseCtaText(control.innerText || control.textContent)) hide(control);
    });

    var labels = [];
    if (node.matches && node.matches("span")) labels = [node];
    if (node.querySelectorAll) {
      labels = labels.concat(Array.prototype.slice.call(node.querySelectorAll("span, .engineer-tools-mobile-plan-hint")));
    }
    labels.forEach(function (el) {
      var own = el.innerText || el.textContent || "";
      if (el.classList && el.classList.contains("engineer-tools-mobile-plan-hint")) hide(el);
      else if (policy.isPurchaseCtaText(own)) hide(el);
    });

    var priced = [];
    if (node.matches && node.matches(".plan-card, .mkt-bullets li, .mkt-teams li")) priced = [node];
    if (node.querySelectorAll) {
      priced = priced.concat(
        Array.prototype.slice.call(node.querySelectorAll(".plan-card, .mkt-bullets li, .mkt-teams li"))
      );
    }
    priced.forEach(function (el) {
      if (el.classList && el.classList.contains("plan-card")) {
        hide(el);
        return;
      }
      var text = el.innerText || el.textContent || "";
      if (policy.showsPrice(text)) hide(el);
    });

    var gate = node.querySelector ? node.querySelector(".gate-overlay, .gate-modal") : null;
    var gates = [];
    if (node.matches && node.matches(".gate-overlay, .gate-modal")) gates.push(node);
    if (node.querySelectorAll) {
      gates = gates.concat(Array.prototype.slice.call(node.querySelectorAll(".gate-overlay")));
    }
    gates.forEach(function (overlay) {
      var upgrade = overlay.querySelector('a[href="/subscription"], a[href^="/subscription"]');
      var title = overlay.querySelector(".gate-title");
      var titleText = title ? title.textContent || "" : "";
      if (upgrade || /upgrade/i.test(titleText)) {
        overlay.querySelectorAll("a, .gate-btn-primary").forEach(hide);
        var body = overlay.querySelector(".gate-text");
        if (body) {
          body.textContent =
            "This feature needs a plan already on your account. Subscriptions are not sold in the iOS app.";
        }
      }
    });
    if (gate) {
      /* queried above */
    }
  }

  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var anchor = target.closest("a[href]");
    var href = anchor ? anchor.getAttribute("href") : "";

    if (!ios && href && policy.isPaymentUrl(href)) {
      event.preventDefault();
      event.stopPropagation();
      openPaymentBrowser(new URL(href, window.location.href).toString());
      return;
    }

    if (!ios) return;

    if (anchor && (policy.isPurchaseHref(href) || policy.isPurchaseCtaText(anchor.textContent))) {
      event.preventDefault();
      event.stopPropagation();
      showReaderNotice();
      return;
    }

    var control = target.closest("button, a");
    if (!control) return;
    var label = control.innerText || control.textContent || "";
    var hint = control.querySelector && control.querySelector(".engineer-tools-mobile-plan-hint");
    if (policy.isPurchaseCtaText(label) || hint) {
      event.preventDefault();
      event.stopPropagation();
      showReaderNotice();
    }
  }

  function openPaymentBrowser(url) {
    var browser = plugin("Browser");
    if (browser && browser.open) {
      browser.open({ url: url, presentationStyle: "fullscreen" }).catch(function () {
        window.open(url, "_blank");
      });
      return;
    }
    window.open(url, "_blank");
  }

  function trapHistory() {
    function guard(original) {
      return function (state, title, url) {
        if (typeof url === "string" && url) {
          if (ios && policy.isPurchaseHref(url)) {
            showReaderNotice();
            return;
          }
          if (!ios && policy.isPaymentUrl(url)) {
            openPaymentBrowser(new URL(url, window.location.href).toString());
            return;
          }
        }
        return original.apply(history, arguments);
      };
    }
    history.pushState = guard(history.pushState);
    history.replaceState = guard(history.replaceState);
    window.addEventListener("popstate", function () {
      if (ios && policy.pathIsPurchase(window.location.pathname)) showReaderNotice();
    });
  }

  function trapWindowOpen() {
    var original = window.open;
    window.open = function (url) {
      var value = url == null ? "" : String(url);
      if (!ios && value && policy.isPaymentUrl(value)) {
        openPaymentBrowser(value);
        return null;
      }
      if (ios && value && (policy.isPaymentUrl(value) || policy.isPurchaseHref(value))) {
        showReaderNotice();
        return null;
      }
      return original.apply(window, arguments);
    };
  }

  async function registerPush() {
    var push = plugin("PushNotifications");
    if (!push || !push.register) return;
    try {
      var perm = await push.requestPermissions();
      if (!perm || perm.receive !== "granted") return;
      await push.register();
      if (push.addListener) {
        push.addListener("registration", function (token) {
          var value = token && token.value;
          if (!value) return;
          fetch(policy.SITE_ORIGIN + "/api/mobile/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token: value, platform: platform }),
          }).catch(function () {
            /* The website does not have to implement this endpoint yet. */
          });
        });
        push.addListener("pushNotificationActionPerformed", function (action) {
          var data = action && action.notification && action.notification.data;
          var link = data && (data.url || data.link || data.path);
          if (!link) return;
          window.location.assign(policy.toSiteUrl(String(link)));
        });
      }
    } catch (err) {
      /* Missing Firebase or APNs setup should not block the shell. */
    }
  }

  function registerDeepLinks() {
    var app = plugin("App");
    if (!app || !app.addListener) return;
    app.addListener("appUrlOpen", function (event) {
      if (!event || !event.url) return;
      var next = policy.toSiteUrl(event.url);
      if (ios && policy.isPurchaseHref(next)) {
        window.location.assign(policy.SITE_ORIGIN + "/chat");
        showReaderNotice();
        return;
      }
      window.location.assign(next);
    });
  }

  function styleStatusBar() {
    var statusBar = plugin("StatusBar");
    if (!statusBar) return;
    if (statusBar.setOverlaysWebView) statusBar.setOverlaysWebView({ overlay: false }).catch(function () {});
    if (statusBar.setStyle) statusBar.setStyle({ style: "LIGHT" }).catch(function () {});
    if (statusBar.setBackgroundColor) {
      statusBar.setBackgroundColor({ color: "#F9FAFB" }).catch(function () {});
    }
  }

  installSafeAreaStyle();
  trapHistory();
  trapWindowOpen();
  document.addEventListener("click", onClick, true);

  if (ios && policy.pathIsPurchase(window.location.pathname)) {
    showReaderNotice();
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  whenReady(function () {
    if (ios) {
      scrub(document.body || document.documentElement);
      if (policy.pathIsPurchase(window.location.pathname)) showReaderNotice();
      var observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
          Array.prototype.forEach.call(record.addedNodes, function (node) {
            scrub(node);
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    styleStatusBar();
    registerDeepLinks();
    registerPush();
    var splash = plugin("SplashScreen");
    if (splash && splash.hide) splash.hide().catch(function () {});
  });

  async function openLaunchUrl() {
    var app = plugin("App");
    if (!app || !app.getLaunchUrl) return;
    try {
      var launch = await app.getLaunchUrl();
      if (!launch || !launch.url) return;
      var next = policy.toSiteUrl(launch.url);
      var target = new URL(next);
      var here = new URL(window.location.href);
      if (target.origin === here.origin && target.pathname === here.pathname && target.search === here.search) {
        return;
      }
      if (ios && policy.isPurchaseHref(next)) {
        showReaderNotice();
        return;
      }
      window.location.replace(next);
    } catch (err) {
      /* stay on the page that just loaded */
    }
  }

  window.__engineeritShowReader = showReaderNotice;
  window.EngineeritNative = {
    platform: platform,
    payments: ios ? "disabled" : "browser",
    openPayment: openPaymentBrowser,
    showReaderNotice: showReaderNotice,
  };

  whenReady(function () {
    openLaunchUrl();
  });
  }

  boot();
})();
