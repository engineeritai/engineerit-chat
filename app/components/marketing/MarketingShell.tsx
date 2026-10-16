"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/app/components/LocaleProvider";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
import MobileTabBar from "@/app/components/MobileTabBar";

export default function MarketingShell({ children }: { children: ReactNode }) {
  const { locale, dir } = useLocale();
  const pathname = usePathname() || "/";
  const app =
    pathname === "/chat" ||
    pathname.startsWith("/advisors/") ||
    pathname.startsWith("/checkout");

  return (
    <div className={"mkt" + (app ? " mkt-app" : "")} dir={dir} lang={locale === "ar" ? "ar" : "en"}>
      <MarketingHeader />
      <main className="mkt-main">{children}</main>
      {app ? null : <MarketingFooter />}
      <MobileTabBar />
    </div>
  );
}
