"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import EitMark from "@/app/components/marketing/EitMark";
import { useLocale } from "@/app/components/LocaleProvider";

const TABS = [
  { href: "/chat", en: "Chat", ar: "المحادثة", id: "chat" },
  { href: "/tools", en: "Tools", ar: "الأدوات", id: "tools" },
  { href: "/advisors", en: "Advisors", ar: "المستشارون", id: "advisors" },
  { href: "/profile", en: "Profile", ar: "الملف", id: "profile" },
] as const;

const iconProps = {
  className: "tab-icon",
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function TabIcon({ id }: { id: "tools" | "advisors" | "profile" }) {
  const paths: Record<typeof id, ReactNode> = {
    tools: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
    advisors: (
      <>
        <circle cx="9" cy="9.2" r="3.05" />
        <path d="M3.5 20.2c.8-2.9 2.8-4.4 5.5-4.4s4.7 1.5 5.5 4.4" />
        <path d="m18.2 2.6.5 1.45 1.45.5-1.45.5-.5 1.45-.5-1.45-1.45-.5 1.45-.5z" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <circle cx="12" cy="10" r="2.25" />
        <path d="M7.6 16.9a5.1 5.1 0 0 1 8.8 0" />
      </>
    ),
  };
  return <svg {...iconProps}>{paths[id]}</svg>;
}

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const { locale } = useLocale();
  const ar = locale === "ar";

  return (
    <nav className="mkt-tabbar" aria-label={ar ? "التنقل" : "App"}>
      {TABS.map((tab) => {
        const active =
          tab.id === "tools"
            ? pathname === "/tools"
            : tab.id === "advisors"
              ? pathname === "/advisors" || pathname.startsWith("/advisors/")
              : pathname === tab.href;
        const label = ar ? tab.ar : tab.en;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
            aria-label={label}
          >
            {tab.id === "chat" ? <EitMark size={22} title="eit" /> : <TabIcon id={tab.id} />}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
