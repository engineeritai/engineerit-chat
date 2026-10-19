"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCloseOnRouteChange, useHistoryOverlay } from "@/app/components/useHistoryOverlay";
import Link from "next/link";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useAccount } from "@/app/components/marketing/AccountState";
import UserAvatar from "@/app/components/marketing/UserAvatar";
import { useMessages } from "@/lib/useMessages";
import { planById } from "@/lib/labels";
import { HEADER_PLAN_ABBREV, PLAN_THEME, type PlanId } from "@/lib/plans";
import { planPriceLabel } from "@/lib/pricingDisplay";
import { SarText } from "@/app/components/RiyalAmount";

const DAY = 24 * 60 * 60 * 1000;

function periodProgress(startIso: string | null, endIso: string | null, now: number) {
  if (!endIso) return null;
  const end = new Date(endIso).getTime();
  if (Number.isNaN(end)) return null;
  const start = startIso ? new Date(startIso).getTime() : end - 30 * DAY;
  const span = Math.max(end - (Number.isNaN(start) ? end - 30 * DAY : start), DAY);
  const origin = Number.isNaN(start) ? end - span : start;
  const days = Math.max(0, Math.ceil((end - now) / DAY));
  const used = Math.min(1, Math.max(0, (now - origin) / span));
  return { days, used };
}

function PlanMark({ planId }: { planId: PlanId }) {
  const common = { width: 18, height: 18, viewBox: "0 0 18 18", "aria-hidden": true as const };
  if (planId === "enterprise") {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M2 15V7l4-3 3 2 3-2 4 3v8H2Z" />
      </svg>
    );
  }
  if (planId === "team") {
    return (
      <svg {...common}>
        <circle cx="6" cy="7" r="2.2" fill="currentColor" />
        <circle cx="12" cy="7" r="2.2" fill="currentColor" />
        <path fill="currentColor" d="M2.5 14c.4-2.2 2-3.4 3.5-3.4S9 11.8 9.4 14H2.5Zm6.2 0c.3-1.6 1.4-2.6 2.8-2.6 1.6 0 2.8 1.2 3.1 2.6H8.7Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="9" cy="9" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="9" r="2.2" fill="currentColor" />
    </svg>
  );
}

function PeriodRing({ used, color }: { used: number; color: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, 1 - used)));
  return (
    <svg className="acct-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(17,20,24,0.08)" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

export function PlanSummary({ onNavigate }: { onNavigate?: () => void }) {
  const { locale, shell: s } = useMessages();
  const account = useAccount();
  const [now, setNow] = useState(() => Date.now());
  const theme = PLAN_THEME[account.planId];
  const fullPlan = planById(locale, account.planId).name;
  const price = planPriceLabel(account.planId, "month", 0, locale);
  const free = account.planId === "assistant";
  const progress = useMemo(
    () => (free ? null : periodProgress(account.periodStart, account.periodEnd, now)),
    [free, account.periodStart, account.periodEnd, now]
  );

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  if (!account.ready || !account.signedIn) return null;

  const daysLabel =
    progress == null
      ? ""
      : progress.days === 1
        ? s.header.dayLeft
        : s.header.daysLeft.replace("{days}", String(progress.days));

  return (
    <div className="acct-summary" data-testid="plan-card">
      <div className="acct-plan" style={{ background: theme.soft }}>
        <span className="acct-plan-icon" style={{ color: theme.accent }}>
          <PlanMark planId={account.planId} />
        </span>
        <div className="acct-plan-copy">
          <strong style={{ color: theme.ink }}>{fullPlan}</strong>
          <span className="acct-plan-price">
            <SarText>{price.primary}</SarText>
          </span>
          {progress ? <span>{daysLabel}</span> : null}
        </div>
        {progress ? <PeriodRing used={progress.used} color={theme.accent} /> : null}
      </div>
      {progress ? (
        <div className="acct-bar" aria-hidden="true">
          <span style={{ width: `${Math.round((1 - progress.used) * 100)}%`, background: theme.accent }} />
        </div>
      ) : null}
      <Link className="acct-cta" href={free ? "/pricing" : "/account/billing"} onClick={() => onNavigate?.()}>
        {free ? s.header.upgrade : s.header.renew}
      </Link>
    </div>
  );
}

function GuestLinks() {
  const { shell: s } = useMessages();
  return (
    <div className="acct-guest">
      <Link className="mkt-header-link" href="/login">
        {s.header.signIn}
      </Link>
      <Link className="mkt-header-link is-accent" href="/register">
        {s.header.register}
      </Link>
    </div>
  );
}

export default function AccountMenu() {
  const { locale, shell: s } = useMessages();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  useHistoryOverlay(open, () => setOpen(false));
  useCloseOnRouteChange(() => setOpen(false));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const theme = PLAN_THEME[account.planId];
  const fullPlan = planById(locale, account.planId).name;
  const short = HEADER_PLAN_ABBREV[account.planId];

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("acct-open");
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("acct-open");
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account.ready) {
    return <span className="acct-chip acct-chip-wait" aria-hidden="true" />;
  }

  if (!account.signedIn) {
    return <GuestLinks />;
  }

  const name = account.fullName || account.email || "";

  return (
    <div className="acct" ref={rootRef} data-plan={account.planId}>
      <button
        type="button"
        className="acct-chip"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={s.header.accountMenu}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="acct-avatar" style={{ boxShadow: `0 0 0 2px ${theme.accent}` }}>
          <UserAvatar url={account.avatarUrl} name={name} size={28} />
        </span>
        <span className="acct-name">{account.firstName || name}</span>
        <span className="acct-pill" style={{ background: theme.accent }} title={fullPlan} translate="no">
          {short}
        </span>
      </button>
      {open ? (
        <>
          <button type="button" className="acct-backdrop" aria-label={s.header.accountMenu} onClick={() => setOpen(false)} />
          <div className="acct-sheet" role="menu">
            <PlanSummary />
            <Link href="/profile">{s.header.myProfile}</Link>
            <Link href="/profile?tab=billing">{s.header.invoicesLink}</Link>
            <Link href="/profile?tab=topics">{s.header.topicsLink}</Link>
            <div className="acct-lang">
              <LanguageToggle compact />
            </div>
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
        </>
      ) : null}
    </div>
  );
}
