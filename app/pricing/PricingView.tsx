"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AdvisorPricingNote from "@/app/components/AdvisorPricingNote";
import PricingBoard from "@/app/components/marketing/PricingBoard";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import { useMessages } from "@/lib/useMessages";

function PricingBody() {
  const { locale } = useLocale();
  const { shell: s } = useMessages();
  const content = getMarketingContent(locale);
  const failed = useSearchParams().get("payment") === "failed";

  return (
    <div className="mkt-section">
      <h1>{content.pricing.title}</h1>
      {failed ? (
        <p className="mkt-lead" role="alert" style={{ color: "#b91c1c" }}>
          {s.profile.paymentFailedBanner}
        </p>
      ) : null}
      <p className="mkt-lead">{content.pricing.intro}</p>
      <PricingBoard />
      <AdvisorPricingNote />
    </div>
  );
}

export default function PricingView() {
  return (
    <Suspense fallback={null}>
      <PricingBody />
    </Suspense>
  );
}
