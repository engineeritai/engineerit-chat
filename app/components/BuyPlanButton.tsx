"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { isSelfServePlan, type BillingInterval, type PlanId } from "@/lib/plans";
import { startMoyasarCheckout } from "@/lib/checkoutClient";

type Props = {
  planId: PlanId;
  interval: BillingInterval;
  extraSeats?: number;
  verb?: "buy" | "upgrade";
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (message: string) => void;
};

export function buyLabel(planId: PlanId, _verb: "buy" | "upgrade" = "buy", locale: "en" | "ar" = "en") {
  const ar = locale === "ar";
  if (planId === "assistant") return ar ? "ابدأ مجاناً" : "Start free";
  return ar ? "اشترك الآن" : "Subscribe";
}

export default function BuyPlanButton({
  planId,
  interval,
  extraSeats = 0,
  verb = "buy",
  label: labelOverride,
  className,
  style,
  onError,
}: Props) {
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const label = labelOverride ?? buyLabel(planId, verb, locale);
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
      if (result.ok || result.needsAuth) return;
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
