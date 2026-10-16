"use client";

import { useEffect, useState } from "react";
import { normalizeAdvisorPlan, type AdvisorPlanId } from "@/lib/advisors";
import { supabase } from "@/lib/supabaseClient";

export type SubscriptionTierState = {
  ready: boolean;
  isGuest: boolean;
  userId: string | null;
  /** Raw profile tier, normalized. Guest until the profile read finishes. */
  tier: AdvisorPlanId;
};

export function useSubscriptionTier(): SubscriptionTierState {
  const [state, setState] = useState<SubscriptionTierState>({
    ready: false,
    isGuest: true,
    userId: null,
    tier: "guest",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setState({ ready: true, isGuest: true, userId: null, tier: "guest" });
          }
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        const raw = !error ? (profile?.subscription_tier as string | undefined) : undefined;
        if (!cancelled) {
          setState({
            ready: true,
            isGuest: false,
            userId: user.id,
            tier: normalizeAdvisorPlan(raw, false),
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setState({ ready: true, isGuest: true, userId: null, tier: "guest" });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
