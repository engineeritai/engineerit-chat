"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { useAccount } from "@/app/components/marketing/AccountState";
import BuyPlanButton from "@/app/components/BuyPlanButton";
import { FeatureLine, RiyalMark } from "@/app/components/RiyalAmount";
import { featuresForLocale, localizedPlan } from "@/lib/labels";
import { getMarketingContent } from "@/lib/marketing";
import {
  extraSeatPrice,
  includedSeats,
  isSelfServePlan,
  PLAN_THEME,
  PLANS,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";
import { planPriceLabel } from "@/lib/pricingDisplay";
import { useMessages } from "@/lib/useMessages";

export default function HomePlanCards() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [dot, setDot] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const annual = interval === "year";

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) {
      setDot(0);
      return;
    }
    const left = Math.abs(el.scrollLeft);
    setDot(Math.round((left / max) * (PLANS.length - 1)));
  }

  return (
    <div className="home-plans">
      <div className="mkt-pricing-top">
        <div className="mkt-toggle" role="group" aria-label={`${content.pricing.monthly}. ${content.pricing.annual}`}>
          <button type="button" aria-pressed={!annual} className={!annual ? "is-active" : undefined} onClick={() => setInterval("month")}>
            {content.pricing.monthly}
          </button>
          <button type="button" aria-pressed={annual} className={annual ? "is-active" : undefined} onClick={() => setInterval("year")}>
            {content.pricing.annual}
            <span className="mkt-pill">{content.pricing.twoMonthsFree}</span>
          </button>
        </div>
      </div>
      <div className="home-plan-row" ref={scroller} onScroll={onScroll}>
        {PLANS.map((source) => (
          <HomePlanCard key={source.id} planId={source.id} interval={interval} />
        ))}
      </div>
      <div className="home-plan-dots" role="tablist" aria-label={content.faq.pricesHeading}>
        {PLANS.map((source, index) => (
          <button
            key={source.id}
            type="button"
            className={index === dot ? "is-active" : undefined}
            aria-label={localizedPlan(locale, source).name}
            onClick={() => {
              const el = scroller.current;
              if (!el) return;
              const card = el.children.item(index) as HTMLElement | null;
              card?.scrollIntoView({ inline: "start", block: "nearest", behavior: "smooth" });
            }}
          />
        ))}
      </div>
      <p className="home-rate-note">
        {locale === "ar" ? (
          <>
            الأسعار بـ <RiyalMark /> SAR. 1 دولار = 3.75 SAR. ضريبة القيمة المضافة حسب الأنظمة.
          </>
        ) : (
          <>
            Prices in <RiyalMark /> SAR. 1 USD = 3.75 SAR. VAT as applicable.
          </>
        )}
      </p>
    </div>
  );
}

function HomePlanCard({ planId, interval }: { planId: PlanId; interval: BillingInterval }) {
  const { locale } = useLocale();
  const { shell: s } = useMessages();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const source = PLANS.find((item) => item.id === planId)!;
  const plan = localizedPlan(locale, source);
  const price = planPriceLabel(planId, interval, 0, locale);
  const features = featuresForLocale(locale, source, interval).filter(
    (feature) => !/USD|approx\.|دولار/.test(feature)
  );
  const shown = open ? features : features.slice(0, 3);
  const theme = PLAN_THEME[planId];
  const yours = account.signedIn && account.planId === planId;
  const unit = interval === "year" ? (locale === "ar" ? "/سنة" : "/year") : locale === "ar" ? "/شهر" : "/month";
  const seats = isSelfServePlan(planId) && (planId === "team" || planId === "enterprise") ? includedSeats(planId) : 0;
  const extra = seats > 0 && isSelfServePlan(planId) ? extraSeatPrice(planId)[interval] : 0;

  return (
    <article className="home-plan-card" style={{ borderTop: `3px solid ${theme.accent}`, background: theme.soft }}>
      {yours ? (
        <span className="plan-ribbon plan-ribbon-inline" style={{ background: theme.accent }}>
          {s.profile.yourPlan}
        </span>
      ) : null}
      <h3 style={{ color: theme.ink, margin: 0 }}>{plan.name}</h3>
      <div className="home-plan-price sar-amount" dir="ltr">
        {price.amountSar === 0 ? (
          locale === "ar" ? "مجانا" : "Free"
        ) : (
          <>
            <RiyalMark /> {price.amountSar.toLocaleString("en-US")}
            <span className="home-plan-unit"> {unit}</span>
          </>
        )}
      </div>
      {seats > 0 ? (
        <span className="home-seat-chip" dir="ltr">
          {locale === "ar" ? (
            <>
              {seats} مقاعد، مقعد إضافي <RiyalMark /> {extra.toLocaleString("en-US")}
            </>
          ) : (
            <>
              {seats} seats, extra <RiyalMark /> {extra.toLocaleString("en-US")}
            </>
          )}
        </span>
      ) : null}
      <ul className="home-plan-features">
        {shown.map((feature) => (
          <li key={feature}>
            <FeatureLine>{feature}</FeatureLine>
          </li>
        ))}
      </ul>
      {features.length > 3 ? (
        <button type="button" className="home-plan-more" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? (locale === "ar" ? "إخفاء" : "Show less") : locale === "ar" ? "عرض كل المزايا" : "See all features"}
        </button>
      ) : null}
      <BuyPlanButton planId={planId} interval={interval} className="mkt-btn mkt-btn-primary" />
    </article>
  );
}
