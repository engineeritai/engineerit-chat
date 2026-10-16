"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/marketing/AccountMenu";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import { useMessages } from "@/lib/useMessages";

const ANCHORS = [
  ["disciplines", "disciplines"],
  ["tools", "tools"],
  ["teams", "teams"],
] as const;

export default function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() || "/";
  const { locale } = useLocale();
  const { shell } = useMessages();
  const content = getMarketingContent(locale);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const links = [
    { href: "/chat", label: shell.nav.chat, active: pathname === "/chat" },
    ...ANCHORS.filter(([, key]) => key !== "teams").map(([id, key]) => ({
      href: `/#${id}`,
      hash: id,
      label: content.nav[key],
      active: false,
    })),
    { href: "/how-it-works", label: content.nav.how, active: pathname === "/how-it-works" },
    { href: "/guide", label: content.nav.guide, active: pathname === "/guide" },
    ...ANCHORS.filter(([, key]) => key === "teams").map(([id, key]) => ({
      href: `/#${id}`,
      hash: id,
      label: content.nav[key],
      active: false,
    })),
    {
      href: "/advisors",
      label: content.nav.advisors,
      active: pathname === "/advisors" || pathname.startsWith("/advisors/"),
    },
    { href: "/pricing", label: content.nav.pricing, active: pathname === "/pricing" },
    { href: "/faq", label: content.nav.faq, active: pathname === "/faq" },
    { href: "/register", label: shell.nav.register, active: pathname === "/register" },
    { href: "/profile", label: shell.nav.profile, active: pathname === "/profile" },
    { href: "/account/team", label: shell.nav.team, active: pathname.startsWith("/account/team") },
    { href: "/feedback", label: shell.nav.feedback, active: pathname === "/feedback" },
    { href: "/legal/terms", label: shell.nav.terms, active: pathname.startsWith("/legal/") },
  ];

  function onNavClick(event: React.MouseEvent<HTMLAnchorElement>, hash?: string) {
    onClose();
    if (!hash || pathname !== "/") return;
    event.preventDefault();
    const next = `${window.location.pathname}${window.location.search}#${hash}`;
    window.history.pushState(null, "", next);
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {open ? (
        <button type="button" className="app-side-backdrop" aria-label={content.nav.menu} onClick={onClose} />
      ) : null}
      <aside
        className={"app-side" + (open ? " is-open" : "")}
        aria-label={content.nav.primary}
        onTouchStart={(event) => {
          startX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (startX.current == null) return;
          const dx = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
          const rtl = document.documentElement.dir === "rtl";
          if ((!rtl && dx < -48) || (rtl && dx > 48)) onClose();
          startX.current = null;
        }}
      >
        <Link href="/" className="app-side-brand" onClick={onClose}>
          <span className="brand" aria-hidden="true">
            <span className="word">
              <span className="engineer">engineer</span>
              <span className="it">it</span>
            </span>
          </span>
          <span className="app-side-home">{shell.nav.home}</span>
        </Link>
        <nav className="app-side-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.active ? "app-side-link is-active" : "app-side-link"}
              aria-current={link.active ? "page" : undefined}
              onClick={(event) => onNavClick(event, "hash" in link ? link.hash : undefined)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="app-side-foot">
          <LanguageToggle compact />
          <AccountMenu presentation="row" />
        </div>
      </aside>
    </>
  );
}
