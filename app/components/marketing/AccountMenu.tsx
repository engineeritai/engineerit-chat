"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { planById } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";
import { PLAN_COLORS } from "@/lib/plans";
import { useAccount } from "@/app/components/marketing/AccountState";
import UserAvatar from "@/app/components/marketing/UserAvatar";

export default function AccountMenu({ presentation = "photo" }: { presentation?: "photo" | "row" }) {
  const { locale, shell: s, m } = useMessages();
  const router = useRouter();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!account.signedIn) {
    if (presentation === "row") {
      return (
        <Link className="app-side-link" href="/login">
          {s.header.login}
        </Link>
      );
    }
    return (
      <Link className="mkt-header-login" href="/login">
        {s.header.login}
      </Link>
    );
  }

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };
  const name = account.fullName || account.email || "";
  const planName = planById(locale, account.planId).name;

  return (
    <div className={"mkt-account" + (presentation === "row" ? " mkt-account-row" : "")} ref={rootRef}>
      <button
        type="button"
        className={presentation === "row" ? "app-account-row" : "mkt-avatar-btn"}
        aria-expanded={open}
        aria-label={s.header.accountMenu}
        onClick={() => setOpen((value) => !value)}
      >
        <UserAvatar url={account.avatarUrl} name={name} size={32} />
        {presentation === "row" ? (
          <span className="app-account-meta">
            <span className="app-account-name">{account.firstName || name}</span>
            <span className="app-plan-badge" style={{ background: PLAN_COLORS[account.planId] }}>
              {planName}
            </span>
          </span>
        ) : null}
      </button>
      {open && (
        <div className="mkt-account-menu" role="menu">
          <button type="button" onClick={() => go("/profile")}>
            {s.header.myProfile}
          </button>
          <button type="button" onClick={() => go("/advisors")}>
            {m.advisors.sectionTitle}
          </button>
          <button type="button" onClick={() => go("/register")}>
            {s.header.plansRegistration}
          </button>
          <button type="button" onClick={() => go("/pricing")}>
            {s.header.subscribe}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void account.signOut();
            }}
          >
            {s.header.logout}
          </button>
        </div>
      )}
    </div>
  );
}
