/**
 * Launch shell. Runs only on the local Capacitor origin, then hands off to engineerit.ai.
 */
(function () {
  var policy = window.EngineeritPolicy;
  var statusEl = document.getElementById("status");

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function plugin(name) {
    var cap = window.Capacitor;
    if (!cap || !cap.Plugins) return null;
    return cap.Plugins[name] || null;
  }

  function siteUrlFrom(raw) {
    if (!policy) return "https://engineerit.ai/";
    return policy.toSiteUrl(raw);
  }

  async function networkOnline() {
    var network = plugin("Network");
    if (network && network.getStatus) {
      try {
        var status = await network.getStatus();
        return !!status.connected;
      } catch (err) {
        /* fall through to the browser flag */
      }
    }
    return navigator.onLine !== false;
  }

  function probeSite() {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 8000);
    return fetch("https://engineerit.ai/", {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(function () {
        return true;
      })
      .catch(function () {
        return false;
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  function styleStatusBar() {
    var statusBar = plugin("StatusBar");
    if (!statusBar) return;
    var jobs = [];
    if (statusBar.setOverlaysWebView) {
      jobs.push(statusBar.setOverlaysWebView({ overlay: false }));
    }
    if (statusBar.setStyle) jobs.push(statusBar.setStyle({ style: "LIGHT" }));
    if (statusBar.setBackgroundColor) {
      jobs.push(statusBar.setBackgroundColor({ color: "#F9FAFB" }));
    }
    return Promise.all(jobs).catch(function () {});
  }

  async function resolveTarget() {
    var app = plugin("App");
    if (app && app.getLaunchUrl) {
      try {
        var launch = await app.getLaunchUrl();
        if (launch && launch.url) return siteUrlFrom(launch.url);
      } catch (err) {
        /* open the home page */
      }
    }
    return "https://engineerit.ai/";
  }

  async function start() {
    styleStatusBar();
    var target = await resolveTarget();
    var online = await networkOnline();
    if (!online) {
      window.location.replace("offline.html");
      return;
    }
    setStatus("Opening engineerit.ai…");
    var reachable = await probeSite();
    if (!reachable) {
      window.location.replace("error.html");
      return;
    }
    window.location.replace(target);
  }

  var appPlugin = plugin("App");
  if (appPlugin && appPlugin.addListener) {
    appPlugin.addListener("appUrlOpen", function (event) {
      if (!event || !event.url) return;
      window.location.replace(siteUrlFrom(event.url));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
