import Link from "next/link";
import { DISCIPLINES } from "@/lib/disciplines";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
import { getMarketingContent, type Locale } from "@/lib/marketing";
import {
  ENTERPRISE_PLAN,
  TEAM_PLAN,
  formatSar,
} from "@/lib/pricingDisplay";
import PilotRequestForm from "@/app/components/marketing/PilotRequestForm";
import SaudiBusinessBadge from "@/app/components/marketing/SaudiBusinessBadge";
import AdvisorEcosystem from "@/app/components/AdvisorEcosystem";
import en from "@/lib/i18n/en";

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export default function LandingView({ locale = "en" }: { locale?: Locale }) {
  const content = getMarketingContent(locale);

  const teamBullet = fill(content.teams.teamBullet, {
    teamMonthly: formatSar(TEAM_PLAN.monthlySar),
    seats: String(TEAM_PLAN.includedSeats),
    extraMonthly: formatSar(TEAM_PLAN.extraSeatMonthlySar),
  });
  const enterpriseBullet = fill(content.teams.enterpriseBullet, {
    enterpriseMonthly: formatSar(ENTERPRISE_PLAN.monthlySarFrom),
  });

  return (
    <>
      <section className="mkt-hero">
        <div>
          <p className="mkt-kicker">{content.hero.kicker}</p>
          <h1>{content.hero.h1}</h1>
          <p className="mkt-lead">{content.hero.lead}</p>
          <div className="mkt-cta-row">
            <Link className="mkt-btn mkt-btn-primary" href="/chat">
              {content.hero.primaryCta}
            </Link>
            <Link className="mkt-btn mkt-btn-secondary" href="/pricing">
              {content.hero.secondaryCta}
            </Link>
            <a className="mkt-btn mkt-btn-ghost" href="#teams">
              {content.hero.tertiaryCta}
            </a>
          </div>
        </div>

        <div className="mkt-hero-panel">
          <h2>{content.hero.panelTitle}</h2>
          <p>{content.hero.panelBody}</p>
          <ul className="mkt-check">
            {ENGINEER_TOOLS.map((tool) => (
              <li key={tool.id}>{tool.label}</li>
            ))}
          </ul>
          <Link className="mkt-btn mkt-btn-primary" href="/chat">
            {content.nav.openChat}
          </Link>
          <SaudiBusinessBadge locale={locale} />
        </div>
      </section>

      <section className="mkt-section" id="advisors">
        <AdvisorEcosystem />
        <p className="mkt-intro">
          <Link href="/advisors">{en.advisors.homeCta}</Link>
        </p>
      </section>

      <section className="mkt-section" id="disciplines">
        <h2>{content.disciplines.title}</h2>
        <p className="mkt-intro">{content.disciplines.intro}</p>
        <div className="mkt-grid-disciplines">
          {DISCIPLINES.map((name) => (
            <article key={name} className="mkt-card">
              <h3>{name}</h3>
              <p>{content.disciplines.summaries[name]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="tools">
        <h2>{content.tools.title}</h2>
        <p className="mkt-intro">{content.tools.intro}</p>
        <div className="mkt-grid-tools">
          {ENGINEER_TOOLS.map((tool) => (
            <article key={tool.id} className="mkt-card">
              <h3>{tool.label}</h3>
              <p>{content.tools.summaries[tool.id]}</p>
              <p className="mkt-chip">{content.tools.availability[tool.id]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="how-it-works">
        <h2>{content.how.title}</h2>
        <p className="mkt-intro">{content.how.intro}</p>
        <ol className="mkt-steps">
          {content.how.steps.map((step, index) => (
            <li key={step.title} className="mkt-card">
              <span className="mkt-step-no">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mkt-section">
        <h2>{content.audiences.title}</h2>
        <p className="mkt-intro">{content.audiences.intro}</p>
        <div className="mkt-grid-3">
          {content.audiences.items.map((item) => (
            <article key={item.title} className="mkt-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="teams">
        <div className="mkt-teams">
          <div>
            <h2>{content.teams.title}</h2>
            <p className="mkt-intro">{content.teams.intro}</p>
            <ul className="mkt-bullets">
              <li>
                {fill(content.teams.consultantTier, {
                  seats: String(TEAM_PLAN.includedSeats),
                })}
              </li>
              <li>{teamBullet}</li>
              <li>{enterpriseBullet}</li>
              <li>{content.teams.annualBullet}</li>
              <li>{content.teams.regionBullet}</li>
            </ul>
            <div className="mkt-cta-row">
              <Link className="mkt-btn mkt-btn-secondary" href="/pricing">
                {content.nav.pricing}
              </Link>
            </div>
          </div>
          <PilotRequestForm locale={locale} />
        </div>
      </section>

      <section className="mkt-section" id="faq">
        <h2>{content.faq.title}</h2>
        <p className="mkt-intro">{content.faq.intro}</p>
        <div className="mkt-faq">
          {content.faq.items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mkt-closing">
        <h2>{content.closing.title}</h2>
        <p>{content.closing.body}</p>
        <div className="mkt-cta-row">
          <Link className="mkt-btn mkt-btn-primary" href="/chat">
            {content.closing.primaryCta}
          </Link>
          <a className="mkt-btn mkt-btn-secondary" href="#teams">
            {content.closing.secondaryCta}
          </a>
        </div>
      </section>
    </>
  );
}
