"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/components/LocaleProvider";
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

export function buyLabel(planId: PlanId, verb: "buy" | "upgrade" = "buy", locale: "en" | "ar" = "en") {
  const ar = locale === "ar";
  if (planId === "assistant") return ar ? "ابدأ مجاناً" : "Start free";
  if (planId === "enterprise") {
    return verb === "upgrade"
      ? ar
        ? "الترقية إلى المؤسسات"
        : "Upgrade to Enterprise"
      : ar
        ? "اشترِ المؤسسات"
        : "Buy Enterprise";
  }
  if (planId === "team") {
    return verb === "upgrade" ? (ar ? "الترقية إلى الفريق" : "Upgrade to Team") : ar ? "اشترِ الفريق" : "Buy Team";
  }
  return verb === "upgrade" ? (ar ? "ترقية" : "Upgrade") : ar ? "اشترِ" : "Buy";
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
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const label = buyLabel(planId, verb, locale);
  const failed = locale === "ar" ? "تعذر بدء الدفع. حاول مرة أخرى." : "Could not start payment. Please try again.";
  const processing = locale === "ar" ? "جارٍ المعالجة..." : "Processing...";

  if (planId === "assistant") {
    return (
      <Link href="/register" className={className} style={style}>
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
      onError?.(failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} style={style} onClick={onClick} disabled={busy}>
      {busy ? processing : label}
    </button>
  );
}
