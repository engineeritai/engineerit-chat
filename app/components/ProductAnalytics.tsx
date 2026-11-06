"use client";

import { Analytics } from "@vercel/analytics/next";
import { allowAnalyticsUrl } from "@/lib/acquisition";

/** Existing Vercel Web Analytics. Preview, local, and automated browsers are dropped. */
export default function ProductAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const webdriver = typeof navigator !== "undefined" && navigator.webdriver === true;
        if (!allowAnalyticsUrl(event.url, webdriver)) return null;
        return event;
      }}
    />
  );
}
