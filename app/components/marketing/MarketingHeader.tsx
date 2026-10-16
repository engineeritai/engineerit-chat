"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/marketing/AccountMenu";
import EitMark from "@/app/components/marketing/EitMark";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";
import { useMessages } from "@/lib/useMessages";
import { getMarketingContent } from "@/lib/marketing";

export default function MarketingHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname() || "/";
  const { locale } = useLocale();
  const { shell } = useMessages();
  const content = getMarketingContent(locale);
  const onChat = pathname === "/chat";
  const chatLabel = shell.nav.chat;

  return (
    <header className="mkt-header">
      <div className="mkt-header-inner">
        <button
          type="button"
          className="mkt-menu-btn"
          aria-label={content.nav.menu}
          onClick={() => {
            if (pathname === "/chat") {
              window.dispatchEvent(new Event("engineerit-open-chat-drawer"));
              return;
            }
            onMenu();
          }}
        >
          <span />
          <span />
          <span />
        </button>
        <Link href="/" className="mkt-header-brand brand" aria-label={shell.nav.home}>
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </Link>
        <nav className="mkt-nav" aria-label={content.nav.primary}>
          <Link href="/" className={pathname === "/" ? "mkt-nav-active" : undefined}>
            {shell.nav.home}
          </Link>
          <Link href="/pricing" className={pathname === "/pricing" ? "mkt-nav-active" : undefined}>
            {content.nav.pricing}
          </Link>
        </nav>
        <div className="mkt-header-spacer" />
        {onChat ? null : (
          <Link className="eit-chat" href="/chat" aria-label={chatLabel} title={chatLabel}>
            <EitMark size={36} />
          </Link>
        )}
        <LanguageToggle compact className="mkt-header-lang" />
        <AccountMenu />
      </div>
    </header>
  );
}
