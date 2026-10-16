"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/marketing/AccountMenu";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";

export default function MarketingHeader() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const onHome = pathname === "/";

  const links = [
    {
      href: onHome ? "#disciplines" : "/#disciplines",
      label: content.nav.disciplines,
      active: false,
    },
    { href: onHome ? "#tools" : "/#tools", label: content.nav.tools, active: false },
    {
      href: onHome ? "#how-it-works" : "/#how-it-works",
      label: content.nav.how,
      active: false,
    },
    {
      href: "/advisors",
      label: content.nav.advisors,
      active: pathname === "/advisors" || pathname.startsWith("/advisors/"),
    },
    { href: onHome ? "#teams" : "/#teams", label: content.nav.teams, active: false },
    { href: "/pricing", label: content.nav.pricing, active: pathname === "/pricing" },
    { href: "/faq", label: content.nav.faq, active: pathname === "/faq" },
  ];

  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <Link href="/" className="brand" aria-label="engineerit.ai">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </Link>

        <nav className="mkt-nav" aria-label={content.nav.primary}>
          {links.map((link) => (
            <Link key={link.href + link.label} href={link.href} className={link.active ? "mkt-nav-active" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-actions">
          <LanguageToggle />
          <AccountMenu />
          <Link className="mkt-btn mkt-btn-primary" href="/chat">
            {content.nav.openChat}
          </Link>
          <button
            type="button"
            className="mkt-menu-btn"
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
            <Link key={link.href + link.label} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <AccountMenu compact />
          <Link href="/chat" onClick={() => setOpen(false)}>
            {content.nav.openChat}
          </Link>
        </nav>
      )}
    </header>
  );
}
