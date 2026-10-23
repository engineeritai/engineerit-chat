"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import { promoCopy } from "@/lib/promoCopy";

export default function FaqView() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return (
    <section className="mkt-section" id="faq">
      <h1>{content.faq.title}</h1>
      <p className="mkt-intro">{content.faq.intro}</p>
      <div className="mkt-faq">
        {content.faq.items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <p className="mkt-intro">
        <a href="/question">{promoCopy[locale].question.title}</a>
      </p>
    </section>
  );
}
