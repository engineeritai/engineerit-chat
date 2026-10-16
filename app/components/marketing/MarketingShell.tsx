"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/app/components/LocaleProvider";
import { AccountState } from "@/app/components/marketing/AccountState";
import AppSidebar from "@/app/components/marketing/AppSidebar";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
import MobileTabBar from "@/app/components/MobileTabBar";

function ShellFrame({ children }: { children: ReactNode }) {
  const { locale, dir } = useLocale();
  const pathname = usePathname() || "/";
  const [drawer, setDrawer] = useState(false);
  const app =
    pathname === "/chat" ||
    pathname.startsWith("/advisors/") ||
    pathname.startsWith("/checkout");

  return (
    <div className={"mkt" + (app ? " mkt-app" : "")} dir={dir} lang={locale === "ar" ? "ar" : "en"}>
      <AppSidebar open={drawer} onClose={() => setDrawer(false)} />
      <div className="mkt-column">
        <MarketingHeader onMenu={() => setDrawer(true)} />
        <main className="mkt-main">{children}</main>
        {app ? null : <MarketingFooter />}
      </div>
      <MobileTabBar />
    </div>
  );
}

export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <AccountState>
      <ShellFrame>{children}</ShellFrame>
    </AccountState>
  );
}
