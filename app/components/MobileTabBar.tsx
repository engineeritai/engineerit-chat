"use client";

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
            {tab.id === "chat" ? <EitMark size={28} /> : null}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
