"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useRef, useState } from "react";
import { PlanSummary } from "@/app/components/marketing/AccountMenu";
import { useAccount } from "@/app/components/marketing/AccountState";
import Wordmark from "@/app/components/marketing/Wordmark";
import { getMarketingContent } from "@/lib/marketing";
import { useMessages } from "@/lib/useMessages";

export type HistoryItem = {
  id: string;
  title: string;
  pinned?: boolean;
  sharedWithTeam?: boolean;
  owned?: boolean;
  nearingExpiry?: boolean;
  expiresInDays?: number | null;
  persisted?: boolean;
};

type Props = {
  discipline: string;
  onDisciplineChange: (v: string) => void;
  onNewChat: () => void;
  threads: HistoryItem[];
  currentThreadId?: string;
  onSelectThread: (id: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  signedIn: boolean;
  historyQuery: string;
  onHistoryQuery: (value: string) => void;
  historyLoading: boolean;
  onRenameThread: (id: string, title: string) => void;
  onPinThread: (id: string, pinned: boolean) => void;
  onDeleteThread: (id: string) => void;
  onShareThread: (id: string, shared: boolean) => void;
  canShareTeam: boolean;
  onRefresh?: () => void;
};

export default function Sidebar({
  onNewChat,
  threads,
  currentThreadId,
  onSelectThread,
  isMobileOpen,
  onCloseMobile,
  signedIn,
  historyQuery,
  onHistoryQuery,
  historyLoading,
  onRenameThread,
  onPinThread,
  onDeleteThread,
  onShareThread,
  canShareTeam,
  onRefresh,
}: Props) {
  const { locale, shell: s } = useMessages();
  const account = useAccount();
  const pathname = usePathname() || "/";
  const content = getMarketingContent(locale);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pull, setPull] = useState(0);
  const pullStart = useRef<number | null>(null);
  const cancelEdit = React.useRef(false);
  const visibleThreads = signedIn
    ? threads
    : threads.filter((thread) => thread.title.toLowerCase().includes(historyQuery.trim().toLowerCase()));

  const nav = [
    { href: "/advisors", label: content.nav.advisors },
    { href: "/pricing", label: content.nav.pricing },
    { href: "/how-it-works", label: content.nav.how },
    { href: "/guide", label: content.nav.guide },
    { href: "/tools", label: content.nav.tools },
    { href: "/feedback", label: locale === "ar" ? "الملاحظات" : "Feedback" },
  ];

  const panel = (idSuffix: string) => (
    <aside className="sidebar-inner chat-side">
      <div className="chat-side-top">
        <Link href="/" className="chat-side-brand brand" aria-label={s.nav.home} onClick={onCloseMobile}>
          <Wordmark decorative />
        </Link>
        <Link href="/" className="chat-side-row" onClick={onCloseMobile}>
          {s.nav.home}
        </Link>
        <button
          type="button"
          className="chat-side-row"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
        >
          {s.chat.newChat}
        </button>
        <label className="history-search-label" htmlFor={`history-search-${idSuffix}`}>
          {s.chat.searchHistory}
        </label>
        <input
          id={`history-search-${idSuffix}`}
          className="history-search"
          value={historyQuery}
          onChange={(event) => onHistoryQuery(event.target.value)}
          placeholder={s.chat.searchHistory}
          type="search"
        />
        <nav className="chat-side-nav" aria-label={s.nav.navigation}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={onCloseMobile}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div
        className="chat-side-history"
        onTouchStart={(event) => {
          pullStart.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(event) => {
          if (pullStart.current == null) return;
          const delta = (event.touches[0]?.clientY ?? pullStart.current) - pullStart.current;
          if (delta > 0) setPull(Math.min(72, delta));
        }}
        onTouchEnd={() => {
          if (pull > 48) onRefresh?.();
          setPull(0);
          pullStart.current = null;
        }}
      >
        <p className={"pull-hint" + (pull > 24 ? " is-ready" : "")}>{pull > 48 ? s.chat.historyLoading : ""}</p>
        <h3>{s.chat.history}</h3>
        {!signedIn && <p className="history-note">{s.chat.historySignIn}</p>}
        <div className="history-list">
          {historyLoading && <div className="history-note">{s.chat.historyLoading}</div>}
          {!historyLoading && visibleThreads.length === 0 && (
            <div className="history-note">{historyQuery.trim() ? s.chat.noSearchResults : s.chat.emptyHistory}</div>
          )}

          {visibleThreads.map((thread) => {
            const active = currentThreadId === thread.id;
            const owned = thread.owned !== false;
            return (
              <div key={thread.id} className={active ? "history-item history-item-active" : "history-item"}>
                {editingId === thread.id ? (
                  <input
                    className="history-search"
                    value={editingTitle}
                    aria-label={s.chat.rename}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onBlur={() => {
                      if (cancelEdit.current) {
                        cancelEdit.current = false;
                        return;
                      }
                      onRenameThread(thread.id, editingTitle);
                      setEditingId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        cancelEdit.current = true;
                        setEditingTitle(thread.title);
                        setEditingId(null);
                        event.currentTarget.blur();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="history-title"
                    onClick={() => {
                      onSelectThread(thread.id);
                      onCloseMobile();
                    }}
                    title={thread.title}
                  >
                    {thread.pinned ? <span className="history-badge">{s.chat.pin}</span> : null}
                    <span>{thread.title}</span>
                    {thread.sharedWithTeam ? <span className="history-badge">{s.chat.shared}</span> : null}
                  </button>
                )}
                {thread.nearingExpiry && thread.expiresInDays != null && (
                  <p className="history-expiry">
                    {thread.expiresInDays <= 1
                      ? s.chat.expiryToday
                      : s.chat.expiryNote.replace("{days}", String(thread.expiresInDays))}{" "}
                    <Link href="/pricing">{s.chat.upgradeKeep}</Link>
                  </p>
                )}
                {owned && (
                  <>
                    <button
                      type="button"
                      className="history-more"
                      aria-label={s.chat.moreActions}
                      aria-expanded={menuId === thread.id}
                      onClick={() => setMenuId((current) => (current === thread.id ? null : thread.id))}
                    >
                      ⋯
                    </button>
                    {menuId === thread.id && (
                      <div className="history-menu" role="menu">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(thread.id);
                            setEditingTitle(thread.title);
                            setMenuId(null);
                          }}
                        >
                          {s.chat.rename}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onPinThread(thread.id, !thread.pinned);
                            setMenuId(null);
                          }}
                        >
                          {thread.pinned ? s.chat.unpin : s.chat.pin}
                        </button>
                        {signedIn && canShareTeam && thread.persisted !== false && (
                          <button
                            type="button"
                            onClick={() => {
                              onShareThread(thread.id, !thread.sharedWithTeam);
                              setMenuId(null);
                            }}
                          >
                            {thread.sharedWithTeam ? s.chat.unshareTeam : s.chat.shareTeam}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId(null);
                            if (window.confirm(s.chat.deleteConfirm)) onDeleteThread(thread.id);
                          }}
                        >
                          {s.chat.deleteChat}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="chat-side-foot">
        <PlanSummary onNavigate={onCloseMobile} />
        {account.ready && !account.signedIn ? (
          <div className="acct-guest acct-guest-side">
            <Link className="mkt-header-link" href="/login" onClick={onCloseMobile}>
              {s.header.signIn}
            </Link>
            <Link className="mkt-header-link is-accent" href="/register" onClick={onCloseMobile}>
              {s.header.register}
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );

  return (
    <>
      <div className="sidebar desktop-only">{panel("desk")}</div>

      {isMobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={onCloseMobile}>
          <div className="sidebar sidebar-mobile-panel" onClick={(event) => event.stopPropagation()}>
            {panel("drawer")}
          </div>
        </div>
      )}
    </>
  );
}
