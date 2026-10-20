"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISCIPLINES } from "@/lib/disciplines";
import { ENGINEER_TOOLS } from "@/lib/engineerTools";
import { useLocale } from "@/app/components/LocaleProvider";
import { useMessages } from "@/lib/useMessages";
import { getMarketingContent } from "@/lib/marketing";
import { disciplineLabel, toolLabel } from "@/lib/labels";
import BuyPlanButton from "@/app/components/BuyPlanButton";
import ChatShowcase from "@/app/components/marketing/ChatShowcase";
import HomePlanCards from "@/app/components/marketing/HomePlanCards";
import PricingBoard from "@/app/components/marketing/PricingBoard";
import AdvisorEcosystem from "@/app/components/AdvisorEcosystem";
import StartChatLink from "@/app/components/marketing/StartChatLink";
import ComposerPlus from "@/app/components/ComposerPlus";

export default function LandingView() {
  const { locale } = useLocale();
  const { m, shell } = useMessages();
  const content = getMarketingContent(locale);
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const placeholder = content.hero.askPlaceholder;

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <section className="mkt-hero">
        <div>
          <h1 id="hero-title" className="brand-headline">
            {locale === "ar" ? (
              <>
                <span className="headline-ar">{content.hero.showcase.accent}</span>
                {content.hero.showcase.after}
              </>
            ) : (
              <span className="headline-en">
                <img className="headline-wordmark" src="/wordmark.svg" alt="engineer it" width={817} height={176} />
                <span className="headline-rest">{content.hero.showcase.after}</span>
              </span>
            )}
          </h1>
          <p className="mkt-lead">{content.hero.lead}</p>
          <form
            className="hero-composer"
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
          >
            <Link className="hero-plus" href="/chat" aria-label={shell.chat.addAttachments}>
              <ComposerPlus />
            </Link>
            <textarea
              className="hero-composer-input"
              rows={1}
              value={draft}
              placeholder={placeholder}
              aria-label={placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
            />
            <button className="chat-input-send-btn" type="submit" aria-label={content.hero.askSend} disabled={!draft.trim()}>
              ➤
            </button>
          </form>
          <div className="hero-chips">
            {content.hero.chips.map((chip) => (
              <button key={chip} type="button" className="hero-chip" onClick={() => ask(chip)}>
                {chip}
              </button>
            ))}
          </div>
          <div className="mkt-cta-row">
            <StartChatLink className="mkt-btn mkt-btn-primary mkt-cta-pulse" label={content.hero.showcase.cta} />
            <Link className="mkt-btn mkt-btn-secondary" href="/pricing">
              {content.hero.secondaryCta}
            </Link>
            <BuyPlanButton planId="team" interval="month" className="mkt-btn mkt-btn-ghost" />
          </div>
        </div>
        <ChatShowcase />
      </section>

      <section className="mkt-section" id="advisors">
        <AdvisorEcosystem />
        <p className="mkt-intro">
          <Link href="/advisors">{m.advisors.homeCta}</Link>
        </p>
      </section>

      <section className="mkt-section" id="disciplines">
        <h2>{content.disciplines.title}</h2>
        <p className="mkt-intro">{content.disciplines.intro}</p>
        <div className="mkt-grid-disciplines">
          {DISCIPLINES.map((name) => (
            <article key={name} className="mkt-card">
              <h3>{disciplineLabel(locale, name)}</h3>
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
              <h3>{toolLabel(locale, tool.id)}</h3>
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
        <div className="mkt-cta-row">
          <Link className="mkt-btn mkt-btn-secondary" href="/how-it-works">
            {content.how.openPage}
          </Link>
          <Link className="mkt-btn mkt-btn-ghost" href="/guide">
            {content.how.openGuide}
          </Link>
        </div>
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
        <h2>{content.teams.title}</h2>
        <p className="mkt-intro">{content.teams.intro}</p>
        <PricingBoard />
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
        <h3>{content.faq.pricesHeading}</h3>
        <HomePlanCards />
      </section>

      <section className="mkt-closing">
        <h2>{content.closing.title}</h2>
        <p>{content.closing.body}</p>
        <div className="mkt-cta-row">
          <StartChatLink className="mkt-btn mkt-btn-primary" label={content.hero.showcase.cta} />
          <BuyPlanButton planId="team" interval="month" className="mkt-btn mkt-btn-secondary" />
        </div>
      </section>
    </>
  );
}
