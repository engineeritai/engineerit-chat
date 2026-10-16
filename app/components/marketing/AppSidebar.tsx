"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlanSummary } from "@/app/components/marketing/AccountMenu";
import { useAccount } from "@/app/components/marketing/AccountState";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import { useMessages } from "@/lib/useMessages";

export default function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() || "/";
  const { locale } = useLocale();
  const { shell } = useMessages();
  const account = useAccount();
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

  const links: { href: string; label: string; active: boolean; hash?: string }[] = [
    { href: "/", label: shell.nav.home, active: pathname === "/" },
    { href: "/chat", label: shell.nav.chat, active: pathname === "/chat" },
    {
      href: "/advisors",
      label: content.nav.advisors,
      active: pathname === "/advisors" || pathname.startsWith("/advisors/"),
    },
    { href: "/how-it-works", label: content.nav.how, active: pathname === "/how-it-works" },
    { href: "/guide", label: content.nav.guide, active: pathname === "/guide" },
    { href: "/tools", label: content.nav.tools, active: pathname === "/tools" },
    { href: "/#disciplines", label: content.nav.disciplines, hash: "disciplines", active: false },
    { href: "/pricing", label: content.nav.pricing, active: pathname === "/pricing" },
    { href: "/faq", label: content.nav.faq, active: pathname === "/faq" },
    { href: "/profile", label: shell.nav.profile, active: pathname === "/profile" },
    { href: "/feedback", label: shell.nav.feedback, active: pathname === "/feedback" },
    { href: "/legal/terms", label: shell.nav.terms, active: pathname === "/legal/terms" },
    { href: "/legal/privacy", label: content.footer.privacy, active: pathname === "/legal/privacy" },
    { href: "/legal/refund", label: content.footer.refunds, active: pathname === "/legal/refund" },
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
              onClick={(event) => onNavClick(event, link.hash)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="app-side-foot">
          <PlanSummary onNavigate={onClose} />
          {account.ready && !account.signedIn ? (
            <div className="acct-guest acct-guest-side">
              <Link className="mkt-header-link" href="/login" onClick={onClose}>
                {shell.header.signIn}
              </Link>
              <Link className="mkt-header-link is-accent" href="/register" onClick={onClose}>
                {shell.header.register}
              </Link>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
