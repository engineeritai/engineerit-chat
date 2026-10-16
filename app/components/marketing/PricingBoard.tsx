"use client";

import { useState } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { PLANS, type BillingInterval } from "@/lib/plans";
import { getMarketingContent, type Locale } from "@/lib/marketing";
import { localizedPlan } from "@/lib/labels";
import { assertIndividualPlanPrices, displayFeatures, planPriceLabel } from "@/lib/pricingDisplay";
import BuyPlanButton, { ResumeCheckout } from "@/app/components/BuyPlanButton";

assertIndividualPlanPrices();

const INDIVIDUAL = PLANS.filter((plan) => plan.id !== "team" && plan.id !== "enterprise");
const FIRM = PLANS.filter((plan) => plan.id === "team" || plan.id === "enterprise");

export default function PricingBoard() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [extraSeats, setExtraSeats] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const annual = interval === "year";

  return (
    <div className="mkt-pricing">
      <ResumeCheckout onError={setErrorMsg} />
      <div className="mkt-pricing-top">
        <div
          className="mkt-toggle"
          role="group"
          aria-label={`${content.pricing.monthly}. ${content.pricing.annual}`}
        >
          <button
            type="button"
            aria-pressed={!annual}
            className={!annual ? "is-active" : undefined}
            onClick={() => setInterval("month")}
          >
            {content.pricing.monthly}
          </button>
          <button
            type="button"
            aria-pressed={annual}
            className={annual ? "is-active" : undefined}
            onClick={() => setInterval("year")}
          >
            {content.pricing.annual}
            <span className="mkt-pill">{content.pricing.twoMonthsFree}</span>
          </button>
        </div>
        {content.pricing.vatNote ? <p className="mkt-note">{content.pricing.vatNote}</p> : null}
        <p className="mkt-note">{content.pricing.annualExplainer}</p>
        <p className="mkt-muted">{content.pricing.usdNote}</p>
      </div>

      {errorMsg && <p className="mkt-note">{errorMsg}</p>}

      <h2>{content.pricing.individualTitle}</h2>
      <p className="mkt-intro">{content.pricing.individualIntro}</p>
      <div className="mkt-plan-grid">
        {INDIVIDUAL.map((plan) => (
          <PlanCard
            key={plan.id}
            planId={plan.id}
            interval={interval}
            extraSeats={0}
            locale={locale}
            onError={setErrorMsg}
          />
        ))}
      </div>

      <h2>{content.pricing.firmTitle}</h2>
      <p className="mkt-intro">{content.pricing.firmIntro}</p>
      <div className="mkt-plan-grid mkt-plan-grid-firm">
        {FIRM.map((plan) => (
          <PlanCard
            key={plan.id}
            planId={plan.id}
            interval={interval}
            extraSeats={plan.id === "team" ? extraSeats : 0}
            locale={locale}
            onError={setErrorMsg}
            onExtraSeats={plan.id === "team" ? setExtraSeats : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  planId,
  interval,
  extraSeats,
  locale,
  onError,
  onExtraSeats,
}: {
  planId: (typeof PLANS)[number]["id"];
  interval: BillingInterval;
  extraSeats: number;
  locale: Locale;
  onError: (message: string) => void;
  onExtraSeats?: (value: number) => void;
}) {
  const content = getMarketingContent(locale);
  const source = PLANS.find((item) => item.id === planId)!;
  const plan = localizedPlan(locale, source);
  const price = planPriceLabel(plan.id, interval, extraSeats);
  const features = locale === "ar" ? plan.features : displayFeatures(source, interval);

  return (
    <article id={plan.id} className={plan.id === "team" ? "mkt-card mkt-plan mkt-plan-team" : "mkt-card mkt-plan"}>
      <h3>{plan.name}</h3>
      <p className="mkt-muted">{plan.tagline}</p>
      <div className="mkt-price">
        <div className="mkt-price-main">{price.primary}</div>
        {price.usd && (
          <div className="mkt-price-usd">
            {content.pricing.approx} {price.usd}
          </div>
        )}
      </div>
      <ul className="mkt-bullets">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {onExtraSeats && (
        <label>
          {locale === "ar" ? "مقاعد إضافية" : "Extra seats"}
          <input
            className="input"
            type="number"
            min={0}
            max={200}
            value={extraSeats}
            onChange={(event) =>
              onExtraSeats(Math.max(0, Math.min(200, Number(event.target.value) || 0)))
            }
          />
        </label>
      )}
      <BuyPlanButton
        planId={plan.id}
        interval={interval}
        extraSeats={extraSeats}
        className="mkt-btn mkt-btn-primary"
        onError={onError}
      />
    </article>
  );
}
