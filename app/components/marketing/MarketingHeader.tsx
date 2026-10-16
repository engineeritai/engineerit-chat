"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/app/components/marketing/AccountMenu";
import { useLocale } from "@/app/components/LocaleProvider";
import { useMessages } from "@/lib/useMessages";
import { getMarketingContent } from "@/lib/marketing";

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 2.5h10a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 13 11.5H7.2L4 13.8c-.4.3-1 .0-1-.5V11.5H3A1.5 1.5 0 0 1 1.5 10V4A1.5 1.5 0 0 1 3 2.5Z"
      />
    </svg>
  );
}

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
        <button type="button" className="mkt-menu-btn" aria-label={content.nav.menu} onClick={onMenu}>
          <span />
          <span />
          <span />
        </button>
        <Link href="/" className="mkt-header-brand brand" aria-label={shell.nav.home}>
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
          <span className="app-side-home">{shell.nav.home}</span>
        </Link>
        {!onChat && (
          <Link className="mkt-chat-pill" href="/chat" aria-label={chatLabel}>
            <ChatIcon />
            <span className="mkt-chat-label">{chatLabel}</span>
          </Link>
        )}
        <div className="mkt-header-spacer" />
        <AccountMenu presentation="photo" />
      </div>
    </header>
  );
}
