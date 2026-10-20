"use client";

import { useState } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { useAccount } from "@/app/components/marketing/AccountState";
import { PLAN_THEME, PLANS, type BillingInterval, type PlanId } from "@/lib/plans";
import { getMarketingContent, type Locale } from "@/lib/marketing";
import { featuresForLocale, localizedPlan } from "@/lib/labels";
import { assertIndividualPlanPrices, planPriceLabel } from "@/lib/pricingDisplay";
import BuyPlanButton from "@/app/components/BuyPlanButton";
import PriceRateNote from "@/app/components/marketing/PriceRateNote";
import { FeatureLine, SarText } from "@/app/components/RiyalAmount";
import { useMessages } from "@/lib/useMessages";

assertIndividualPlanPrices();

const INDIVIDUAL = PLANS.filter((plan) => plan.id !== "team" && plan.id !== "enterprise");
const FIRM = PLANS.filter((plan) => plan.id === "team" || plan.id === "enterprise");

export default function PricingBoard() {
  const { locale } = useLocale();
  const account = useAccount();
  const content = getMarketingContent(locale);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [extraSeats, setExtraSeats] = useState({ team: 0, enterprise: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const annual = interval === "year";

  return (
    <div className="mkt-pricing">
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
        <p className="mkt-note">{content.pricing.annualExplainer}</p>
      </div>

      {errorMsg && (
        <p className="mkt-note" role="alert" style={{ color: "#b91c1c" }}>
          {errorMsg}
        </p>
      )}

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
            extraSeats={plan.id === "team" || plan.id === "enterprise" ? extraSeats[plan.id] : 0}
            locale={locale}
            onError={setErrorMsg}
            onExtraSeats={
              plan.id === "team" || plan.id === "enterprise"
                ? (value) => setExtraSeats((current) => ({ ...current, [plan.id]: value }))
                : undefined
            }
          />
        ))}
      </div>
      <PlanComparison locale={locale} current={account.signedIn ? account.planId : null} />
      <PriceRateNote />
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
  const { shell: s } = useMessages();
  const account = useAccount();
  const source = PLANS.find((item) => item.id === planId)!;
  const plan = localizedPlan(locale, source);
  const price = planPriceLabel(plan.id, interval, extraSeats, locale);
  const features = featuresForLocale(locale, source, interval);
  const theme = PLAN_THEME[plan.id];
  const yours = account.signedIn && account.planId === plan.id;

  return (
    <article
      id={plan.id}
      className={"mkt-card mkt-plan" + (yours ? " is-current" : "")}
      style={{ borderTop: `3px solid ${theme.accent}`, background: theme.soft }}
    >
      {yours ? (
        <span className="plan-ribbon" style={{ background: theme.accent }}>
          {s.profile.yourPlan}
        </span>
      ) : null}
      <h3 style={{ color: theme.ink }}>{plan.name}</h3>
      <p className="mkt-muted">{plan.tagline}</p>
      <div className="mkt-price">
        <div className="mkt-price-main">
          <SarText>{price.primary}</SarText>
        </div>
        {price.usd && (
          <div className="mkt-price-usd">
            {content.pricing.approx} {price.usd}
          </div>
        )}
      </div>
      <ul className="mkt-bullets">
        {features.map((feature) => (
          <li key={feature}>
            <FeatureLine>{feature}</FeatureLine>
          </li>
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

function PlanComparison({ locale, current }: { locale: Locale; current: PlanId | null }) {
  const { shell: s } = useMessages();
  const monthLabel = locale === "ar" ? "شهريا" : "Monthly";
  const yearLabel = locale === "ar" ? "سنويا" : "Annual";
  const includes = locale === "ar" ? "يشمل" : "Includes";

  return (
    <div className="plan-compare-wrap">
      <table className="plan-compare">
        <thead>
          <tr>
            <th />
            {PLANS.map((plan) => {
              const theme = PLAN_THEME[plan.id];
              const name = localizedPlan(locale, plan).name;
              return (
                <th key={plan.id} className="plan-compare-plan" style={{ background: theme.accent }}>
                  {current === plan.id ? <span className="plan-ribbon plan-ribbon-inline">{s.profile.yourPlan}</span> : null}
                  {name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{monthLabel}</th>
            {PLANS.map((plan) => (
              <td key={plan.id}>
                <SarText>{planPriceLabel(plan.id, "month", 0, locale).primary}</SarText>
              </td>
            ))}
          </tr>
          <tr>
            <th>{yearLabel}</th>
            {PLANS.map((plan) => (
              <td key={plan.id}>
                <SarText>{planPriceLabel(plan.id, "year", 0, locale).primary}</SarText>
              </td>
            ))}
          </tr>
          <tr>
            <th>{includes}</th>
            {PLANS.map((plan) => (
              <td key={plan.id}>
                <ul>
                  {featuresForLocale(locale, plan, "month").slice(0, 4).map((feature) => (
                    <li key={feature}>
                      <FeatureLine>{feature}</FeatureLine>
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
