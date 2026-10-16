"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSelfServePlan, type BillingInterval, type PlanId } from "@/lib/plans";
import {
  clearPendingCheckout,
  readPendingCheckout,
  startMoyasarCheckout,
} from "@/lib/checkoutClient";

type Props = {
  planId: PlanId;
  interval: BillingInterval;
  extraSeats?: number;
  verb?: "buy" | "upgrade";
  className?: string;
  style?: React.CSSProperties;
  onError?: (message: string) => void;
};

export function buyLabel(planId: PlanId, verb: "buy" | "upgrade" = "buy") {
  if (planId === "assistant") return "Start free";
  if (planId === "enterprise") return "Enterprise";
  if (planId === "team") return verb === "upgrade" ? "Upgrade to Team" : "Buy Team";
  return verb === "upgrade" ? "Upgrade" : "Buy";
}

export function ResumeCheckout({ onError }: { onError?: (message: string) => void }) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    const pending = readPendingCheckout();
    if (!pending) return;
    let cancelled = false;
    void (async () => {
      const result = await startMoyasarCheckout(pending);
      if (cancelled || result.ok || result.needsAuth) return;
      clearPendingCheckout();
      onErrorRef.current?.(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export default function BuyPlanButton({
  planId,
  interval,
  extraSeats = 0,
  verb = "buy",
  className,
  style,
  onError,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const label = buyLabel(planId, verb);

  if (planId === "assistant") {
    return (
      <Link href="/register" className={className} style={style}>
        {label}
      </Link>
    );
  }

  if (planId === "enterprise") {
    return (
      <Link href="/enterprise" className={className} style={style}>
        {label}
      </Link>
    );
  }

  async function onClick() {
    if (!isSelfServePlan(planId)) return;
    setBusy(true);
    try {
      const result = await startMoyasarCheckout({ planId, interval, extraSeats });
      if (result.ok) return;
      if (result.needsAuth) {
        const next = `${window.location.pathname}${window.location.search}` || "/pricing";
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      onError?.(result.error);
    } catch (err) {
      console.error(err);
      onError?.("Could not start payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} style={style} onClick={onClick} disabled={busy}>
      {busy ? "Processing..." : label}
    </button>
  );
}
