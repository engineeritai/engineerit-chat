"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { planById } from "@/lib/labels";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";
import { PLAN_COLORS, type PlanId } from "@/lib/plans";
import { resolveEffectivePlan } from "@/lib/effectivePlan";

export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { locale, shell: s, m } = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [planId, setPlanId] = useState<PlanId>("assistant");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setEmail(null);
        setPlanId("assistant");
        return;
      }
      setEmail(user.email || user.id);
      setPlanId(await resolveEffectivePlan(supabase, user.id));
    };
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [pathname]);

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
          <button type="button" onClick={() => go("/pricing")}>
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
