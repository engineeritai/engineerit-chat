"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resolveEffectivePlan } from "@/lib/effectivePlan";
import type { PlanId } from "@/lib/plans";

export type AccountSnapshot = {
  ready: boolean;
  signedIn: boolean;
  email: string | null;
  fullName: string | null;
  firstName: string;
  avatarUrl: string | null;
  planId: PlanId;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountSnapshot | null>(null);

function firstToken(fullName: string | null, email: string | null) {
  const base = (fullName || email?.split("@")[0] || "").trim();
  return base.split(/\s+/)[0] || "";
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

  useEffect(() => {
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

      const plan = await resolveEffectivePlan(supabase, user.id);
      if (!active) return;
      setEmail(user.email || user.id);
      setFullName(name || null);
      setAvatarUrl(avatarSrc(avatar));
      setPlanId(plan);
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
      signOut: async () => {
        await supabase.auth.signOut();
        setEmail(null);
        setFullName(null);
        setAvatarUrl(null);
        setPlanId("assistant");
        router.push("/");
      },
    }),
    [ready, email, fullName, avatarUrl, planId, router]
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
