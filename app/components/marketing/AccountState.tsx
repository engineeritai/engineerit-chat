"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resolveEffectivePlan } from "@/lib/effectivePlan";
import { isPlanId, type PlanId } from "@/lib/plans";

export type AccountSnapshot = {
  ready: boolean;
  signedIn: boolean;
  email: string | null;
  fullName: string | null;
  firstName: string;
  avatarUrl: string | null;
  planId: PlanId;
  periodStart: string | null;
  periodEnd: string | null;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountSnapshot | null>(null);

function firstToken(fullName: string | null, email: string | null) {
  const base = (fullName || email?.split("@")[0] || "").trim();
  return base.split(/\s+/)[0] || "";
}

/** Local-only fixture so layout tests can render every plan without a session. */
export function localPlanPreview(): {
  plan: PlanId;
  name: string;
  start: string;
  end: string;
} | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host !== "127.0.0.1" && host !== "localhost") return null;
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("planPreview");
  if (!isPlanId(plan)) return null;
  const name = params.get("namePreview") || "Professional Engineer";
  const end = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
  const start = new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString();
  return { plan, name, start, end };
}

function avatarSrc(raw: string | null | undefined) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^\/+/, "").replace(/^avatars\//, "");
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl || null;
}

export function AccountState({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [planId, setPlanId] = useState<PlanId>("assistant");
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);

  useEffect(() => {
    const preview = localPlanPreview();
    if (preview) {
      setEmail("preview@engineerit.ai");
      setFullName(preview.name);
      setAvatarUrl(null);
      setPlanId(preview.plan);
      setPeriodStart(preview.start);
      setPeriodEnd(preview.end);
      setReady(true);
      return;
    }

    let active = true;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setEmail(null);
        setFullName(null);
        setAvatarUrl(null);
        setPlanId("assistant");
        setPeriodStart(null);
        setPeriodEnd(null);
        setReady(true);
        return;
      }

      let name =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split("@")[0] ??
        "";
      let avatar =
        (user.user_metadata?.avatar_url as string | undefined) ??
        (user.user_metadata?.picture as string | undefined) ??
        null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && profile) {
        if (profile.full_name) name = profile.full_name;
        if (profile.avatar_url) avatar = profile.avatar_url;
      }

      let plan = await resolveEffectivePlan(supabase, user.id);
      let start: string | null = null;
      let end: string | null = null;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const billingRes = await fetch("/api/billing", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        const billingJson = billingRes ? await billingRes.json().catch(() => ({})) : {};
        if (billingRes?.ok && isPlanId(billingJson.plan)) plan = billingJson.plan;
        const sub = billingJson?.subscription;
        if (billingRes?.ok && sub) {
          start = typeof sub.current_period_start === "string" ? sub.current_period_start : null;
          end = typeof sub.current_period_end === "string" ? sub.current_period_end : null;
        }
      }
      if (!active) return;
      setEmail(user.email || user.id);
      setFullName(name || null);
      setAvatarUrl(avatarSrc(avatar));
      setPlanId(plan);
      setPeriodStart(start);
      setPeriodEnd(end);
      setReady(true);
    };

    void load();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      data.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
    };
  }, [pathname]);

  const value = useMemo<AccountSnapshot>(
    () => ({
      ready,
      signedIn: Boolean(email),
      email,
      fullName,
      firstName: firstToken(fullName, email),
      avatarUrl,
      planId,
      periodStart,
      periodEnd,
      signOut: async () => {
        await supabase.auth.signOut();
        setEmail(null);
        setFullName(null);
        setAvatarUrl(null);
        setPlanId("assistant");
        setPeriodStart(null);
        setPeriodEnd(null);
        router.push("/");
      },
    }),
    [ready, email, fullName, avatarUrl, planId, periodStart, periodEnd, router]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error("useAccount must be used within AccountState");
  }
  return value;
}
