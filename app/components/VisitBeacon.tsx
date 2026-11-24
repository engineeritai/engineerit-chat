"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/app/components/LocaleProvider";
import { supabase } from "@/lib/supabaseClient";
import { isExcludedPath, isProductionHost } from "@/lib/visitPublic";

/**
 * Records one page view after paint. The request is keepalive and errors are
 * ignored, so chat and navigation do not wait on it. No cookie is written.
 */
export default function VisitBeacon() {
  const pathname = usePathname() || "/";
  const { locale } = useLocale();

  useEffect(() => {
    if (!isProductionHost(window.location.hostname)) return;
    if (isExcludedPath(pathname)) return;
    if (navigator.webdriver) return;

    let cancelled = false;
    async function send() {
      try {
        const headers: Record<string, string> = { "content-type": "application/json" };
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers.authorization = `Bearer ${token}`;
        } catch {
          /* An anonymous view still counts when the session read fails. */
        }
        if (cancelled) return;
        const params = new URLSearchParams(window.location.search);
        let referrer = "";
        try {
          referrer = document.referrer ? new URL(document.referrer).hostname : "";
        } catch {
          referrer = "";
        }
        await fetch("/api/visits", {
          method: "POST",
          headers,
          credentials: "omit",
          keepalive: true,
          body: JSON.stringify({
            path: pathname,
            language: locale === "ar" ? "ar" : "en",
            referrer,
            utm_source: params.get("utm_source") || "",
            utm_medium: params.get("utm_medium") || "",
            utm_campaign: params.get("utm_campaign") || "",
          }),
        });
      } catch {
        /* Fail silently. */
      }
    }
    void send();
    return () => {
      cancelled = true;
    };
  }, [pathname, locale]);

  return null;
}
