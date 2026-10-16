"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/marketing/AccountMenu";
import StartChatLink from "@/app/components/marketing/StartChatLink";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";

const ANCHORS = [
  ["disciplines", "disciplines"],
  ["tools", "tools"],
  ["how-it-works", "how"],
  ["teams", "teams"],
] as const;

export default function MarketingHeader() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const onChat = pathname === "/chat";

  const links = [
    ...ANCHORS.map(([id, key]) => ({
      href: `/#${id}`,
      hash: id,
      label: content.nav[key],
      active: false,
    })),
    {
      href: "/advisors",
      hash: "",
      label: content.nav.advisors,
      active: pathname === "/advisors" || pathname.startsWith("/advisors/"),
    },
    { href: "/pricing", hash: "", label: content.nav.pricing, active: pathname === "/pricing" },
    { href: "/faq", hash: "", label: content.nav.faq, active: pathname === "/faq" },
  ];

  function onNavClick(event: React.MouseEvent<HTMLAnchorElement>, href: string, hash: string) {
    setOpen(false);
    if (!hash || pathname !== "/") return;
    event.preventDefault();
    const next = `${window.location.pathname}${window.location.search}#${hash}`;
    window.history.pushState(null, "", next);
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <Link href="/" className="brand" aria-label="engineerit.ai">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </Link>

        {!onChat && (
          <nav className="mkt-nav" aria-label={content.nav.primary}>
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={link.active ? "mkt-nav-active" : undefined}
                onClick={(event) => onNavClick(event, link.href, link.hash)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="mkt-actions">
          <LanguageToggle compact />
          <AccountMenu />
          {!onChat && <StartChatLink className="mkt-btn mkt-btn-primary mkt-open-chat mkt-cta-pulse" />}
          <button
            type="button"
            className={"mkt-menu-btn" + (onChat ? " mkt-menu-btn-show" : "")}
            aria-expanded={open}
            aria-label={content.nav.menu}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <nav className="mkt-nav-mobile" aria-label={content.nav.primary}>
          <LanguageToggle className="lang-toggle-block" />
          {links.map((link) => (
            <Link
              key={"m-" + link.href + link.label}
              href={link.href}
              onClick={(event) => onNavClick(event, link.href, link.hash)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/profile" onClick={() => setOpen(false)}>
            {content.nav.login}
          </Link>
          {!onChat && (
            <StartChatLink className="mkt-btn mkt-btn-primary mkt-cta-pulse" onClick={() => setOpen(false)} />
          )}
        </nav>
      )}
    </header>
  );
}
