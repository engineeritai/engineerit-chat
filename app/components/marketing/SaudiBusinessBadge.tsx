"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { SAUDI_BUSINESS_AUTH_NO, SAUDI_BUSINESS_VERIFY_URL } from "@/lib/trust";
import { getMarketingContent } from "@/lib/marketing";

export default function SaudiBusinessBadge() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return (
    <aside className="mkt-trust">
      <div className="mkt-trust-mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <div>
        <div className="mkt-kicker">{content.trust.kicker}</div>
        <div className="mkt-trust-title">{content.trust.title}</div>
        <p>{content.trust.body}</p>
        <p>
          {content.trust.authLabel}{" "}
          <strong>{SAUDI_BUSINESS_AUTH_NO}</strong>
        </p>
        <a href={SAUDI_BUSINESS_VERIFY_URL} target="_blank" rel="noopener noreferrer">
          {content.trust.verify}
        </a>
      </div>
    </aside>
  );
}
