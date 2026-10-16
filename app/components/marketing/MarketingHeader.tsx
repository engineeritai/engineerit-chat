"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { getMarketingContent, type Locale } from "@/lib/marketing";

export default function MarketingHeader({ locale = "en" }: { locale?: Locale }) {
  const content = getMarketingContent(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const onHome = pathname === "/";

  const links = [
    {
      href: onHome ? "#disciplines" : "/#disciplines",
      label: content.nav.disciplines,
    },
    { href: onHome ? "#tools" : "/#tools", label: content.nav.tools },
    {
      href: onHome ? "#how-it-works" : "/#how-it-works",
      label: content.nav.how,
    },
    { href: onHome ? "#teams" : "/#teams", label: content.nav.teams },
    { href: "/pricing", label: content.nav.pricing },
  ];

  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <Link href="/" className="brand" aria-label="engineerit.ai home">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </Link>

        <nav className="mkt-nav" aria-label={content.nav.primary}>
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={pathname === "/pricing" && link.href === "/pricing" ? "mkt-nav-active" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-actions">
          <Link className="mkt-btn mkt-btn-secondary mkt-login" href="/login">
            {content.nav.login}
          </Link>
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
          {links.map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            {content.nav.login}
          </Link>
          <Link href="/chat" onClick={() => setOpen(false)}>
            {content.nav.openChat}
          </Link>
        </nav>
      )}
    </header>
  );
}
