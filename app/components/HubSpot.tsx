"use client";

import { useEffect } from "react";

const WA_SHIM = `(() => {
  var native = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input instanceof URL ? input.href : (input && input.url) || "";
    if (url.indexOf("px.ads.linkedin.com/wa") !== -1) {
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    return native(input, init);
  };
})();`;

/** HubSpot's loader rewrites head as soon as it runs. Doing that before React
    hydrates is reported as a hydration mismatch, and Next then paints its
    issues badge. LinkedIn's insight pixel also fetch()es /wa/ without CORS;
    rejecting that one call lets the tag's sendBeacon fallback succeed. */
export default function HubSpot() {
  useEffect(() => {
    if (document.getElementById("hs-script-loader")) return;
    const shim = document.createElement("script");
    shim.id = "linkedin-wa-fetch";
    shim.text = WA_SHIM;
    const loader = document.createElement("script");
    loader.id = "hs-script-loader";
    loader.async = true;
    loader.defer = true;
    loader.src = "https://js.hs-scripts.com/147368055.js";
    document.head.append(shim, loader);
  }, []);
  return null;
}
