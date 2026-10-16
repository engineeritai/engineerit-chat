"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { planById } from "@/lib/labels";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const PLAN_COLORS: Record<PlanId, string> = {
  assistant: "#2563eb",
  engineer: "#f97316",
  professional: "#0f766e",
  consultant: "#7c3aed",
};

export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { locale, shell: s, m } = useMessages();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [planId, setPlanId] = useState<PlanId>("assistant");

  useEffect(() => {
    let active = true;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setEmail(null);
        return;
      }
      setEmail(user.email || user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      const tier = profile?.subscription_tier;
      if (tier === "assistant" || tier === "engineer" || tier === "professional" || tier === "consultant") {
        setPlanId(tier);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!email) {
    return (
      <Link className={compact ? undefined : "mkt-btn mkt-btn-secondary mkt-login"} href="/login">
        {s.header.login}
      </Link>
    );
  }

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <div className="mkt-account">
      <button
        type="button"
        className="mkt-account-btn"
        style={{ backgroundColor: PLAN_COLORS[planId] }}
        aria-expanded={open}
        aria-label={s.header.accountMenu}
        onClick={() => setOpen((value) => !value)}
      >
        {planById(locale, planId).name}
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
          <button type="button" onClick={() => go("/subscription")}>
            {s.header.subscribe}
          </button>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await supabase.auth.signOut();
              setEmail(null);
              router.push("/");
            }}
          >
            {s.header.logout}
          </button>
        </div>
      )}
    </div>
  );
}
