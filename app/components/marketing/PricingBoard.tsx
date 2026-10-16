"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { PLANS, type PlanId } from "@/lib/plans";
import { getMarketingContent } from "@/lib/marketing";
import { formatMoney, formatUsd, localizedPlan } from "@/lib/labels";
import {
  ANNUAL_MONTHS_BILLED,
  ENTERPRISE_PLAN,
  TEAM_PLAN,
  type BillingPeriod,
  annualSar,
  assertIndividualPlanPrices,
  monthlySarFromPlan,
} from "@/lib/pricingDisplay";
import { pilotMailto } from "@/lib/trust";
import PilotRequestForm from "@/app/components/marketing/PilotRequestForm";

assertIndividualPlanPrices();

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export default function PricingBoard() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const annual = period === "annual";

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
            onClick={() => setPeriod("monthly")}
          >
            {content.pricing.monthly}
          </button>
          <button
            type="button"
            aria-pressed={annual}
            className={annual ? "is-active" : undefined}
            onClick={() => setPeriod("annual")}
          >
            {content.pricing.annual}
            <span className="mkt-pill">{content.pricing.twoMonthsFree}</span>
          </button>
        </div>
        <p className="mkt-note">{content.pricing.vatNote}</p>
        <p className="mkt-note">{content.pricing.annualExplainer}</p>
        <p className="mkt-muted">{content.pricing.usdNote}</p>
      </div>

      <h2>{content.pricing.individualTitle}</h2>
      <p className="mkt-intro">{content.pricing.individualIntro}</p>
      <div className="mkt-plan-grid">
        {PLANS.map((source) => {
          const plan = localizedPlan(locale, source);
          const monthly = monthlySarFromPlan(source);
          const amount = annual ? annualSar(monthly) : monthly;
          const isFree = plan.id === "assistant";
          const cta = individualCta(plan.id, period, plan.name, content, locale);

          return (
            <article key={plan.id} className="mkt-card mkt-plan">
              <h3>{plan.name}</h3>
              <p className="mkt-muted">{plan.tagline}</p>
              <div className="mkt-price">
                {isFree ? (
                  <div className="mkt-price-main">{content.pricing.free}</div>
                ) : annual ? (
                  <div className="mkt-price-main">
                    {formatMoney(amount, locale)} <span>{content.pricing.perYear}</span>
                  </div>
                ) : (
                  <div className="mkt-price-main">
                    {formatMoney(monthly, locale)} <span>{content.pricing.perMonth}</span>
                  </div>
                )}
                {amount > 0 && (
                  <div className="mkt-price-usd">
                    {content.pricing.approx} {formatUsd(amount, locale)}
                  </div>
                )}
                {annual && !isFree && (
                  <div className="mkt-muted">
                    {ANNUAL_MONTHS_BILLED}× {formatMoney(monthly, locale)} {content.pricing.perMonth}
                  </div>
                )}
              </div>
              <ul className="mkt-bullets">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {cta.external ? (
                <a className="mkt-btn mkt-btn-primary" href={cta.href}>
                  {cta.label}
                </a>
              ) : (
                <Link className="mkt-btn mkt-btn-primary" href={cta.href}>
                  {cta.label}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <h2>{content.pricing.firmTitle}</h2>
      <p className="mkt-intro">{content.pricing.firmIntro}</p>
      <div className="mkt-plan-grid mkt-plan-grid-firm">
        <article className="mkt-card mkt-plan mkt-plan-team">
          <h3>{locale === "ar" ? "فريق" : TEAM_PLAN.name}</h3>
          <p className="mkt-muted">{content.pricing.notInApp}</p>
          <div className="mkt-price">
            <div className="mkt-price-main">
              {formatMoney(annual ? annualSar(TEAM_PLAN.monthlySar) : TEAM_PLAN.monthlySar, locale)}{" "}
              <span>{annual ? content.pricing.perYear : content.pricing.perMonth}</span>
            </div>
            <div className="mkt-price-usd">
              {content.pricing.approx}{" "}
              {formatUsd(annual ? annualSar(TEAM_PLAN.monthlySar) : TEAM_PLAN.monthlySar, locale)}
            </div>
            <div className="mkt-muted">
              {fill(content.pricing.forSeats, {
                seats: String(TEAM_PLAN.includedSeats),
              })}
            </div>
          </div>
          <ul className="mkt-bullets">
            <li>
              {fill(content.pricing.consultantTier, {
                seats: String(TEAM_PLAN.includedSeats),
              })}
            </li>
            <li>
              {`${content.pricing.extraSeat} ${formatMoney(
                annual ? annualSar(TEAM_PLAN.extraSeatMonthlySar) : TEAM_PLAN.extraSeatMonthlySar,
                locale
              )} ${annual ? content.pricing.perYear : content.pricing.perMonth} (${content.pricing.approx} ${formatUsd(
                annual ? annualSar(TEAM_PLAN.extraSeatMonthlySar) : TEAM_PLAN.extraSeatMonthlySar,
                locale
              )})`}
            </li>
            <li>{content.pricing.sharedProjects}</li>
            <li>{content.pricing.admin}</li>
          </ul>
          <a
            className="mkt-btn mkt-btn-primary"
            href={pilotMailto(locale === "ar" ? "طلب تجربة فريق — engineerit.ai" : "Team pilot request — engineerit.ai")}
          >
            {content.pricing.requestPilot}
          </a>
        </article>

        <article className="mkt-card mkt-plan" id="enterprise">
          <h3>{locale === "ar" ? "مؤسسة" : ENTERPRISE_PLAN.name}</h3>
          <p className="mkt-muted">{content.pricing.notInApp}</p>
          <div className="mkt-price">
            <div className="mkt-price-main">
              {content.pricing.from}{" "}
              {formatMoney(
                annual ? annualSar(ENTERPRISE_PLAN.monthlySarFrom) : ENTERPRISE_PLAN.monthlySarFrom,
                locale
              )}{" "}
              <span>{annual ? content.pricing.perYear : content.pricing.perMonth}</span>
            </div>
            <div className="mkt-price-usd">
              {content.pricing.approx}{" "}
              {formatUsd(
                annual ? annualSar(ENTERPRISE_PLAN.monthlySarFrom) : ENTERPRISE_PLAN.monthlySarFrom,
                locale
              )}
            </div>
          </div>
          <ul className="mkt-bullets">
            <li>{content.pricing.sso}</li>
            <li>{content.pricing.prioritySupport}</li>
            <li>{content.pricing.customStandards}</li>
            <li>{content.pricing.contactScope}</li>
          </ul>
          <a
            className="mkt-btn mkt-btn-secondary"
            href={pilotMailto(locale === "ar" ? "استفسار المؤسسات — engineerit.ai" : "Enterprise enquiry — engineerit.ai")}
          >
            {content.pricing.contactUs}
          </a>
        </article>
      </div>

      <div className="mkt-pricing-form">
        <PilotRequestForm />
      </div>
    </div>
  );
}

function individualCta(
  planId: PlanId,
  period: BillingPeriod,
  planName: string,
  content: ReturnType<typeof getMarketingContent>,
  locale: "en" | "ar"
) {
  if (planId === "assistant") {
    return { href: "/register", label: content.pricing.startFree, external: false };
  }
  if (period === "annual") {
    const subject =
      locale === "ar" ? `طلب فوترة سنوية — ${planName}` : `Annual billing request — ${planName}`;
    return {
      href: pilotMailto(subject),
      label: content.pricing.requestAnnual,
      external: true,
    };
  }
  return {
    href: "/register",
    label: content.pricing.createAccount,
    external: false,
  };
}
