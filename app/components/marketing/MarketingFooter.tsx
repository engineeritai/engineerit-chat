import Link from "next/link";
import Wordmark from "@/app/components/marketing/Wordmark";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import { SAUDI_BUSINESS_VERIFY_URL } from "@/lib/trust";

export default function MarketingFooter() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const year = new Date().getFullYear();
  const terms = locale === "ar" ? "الشروط" : "Terms";

  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-line">
        <span className="brand" aria-hidden="true">
          <Wordmark decorative />
        </span>
        <span>© {year} engineerit.ai</span>
        <span className="mkt-footer-trust">
          <span className="mkt-footer-registered">{content.footer.registered}</span>
          <a href={SAUDI_BUSINESS_VERIFY_URL} target="_blank" rel="noopener noreferrer">
            {content.trust.verify}
          </a>
        </span>
        <nav aria-label={content.footer.policyLink}>
          <Link href="/pricing">{content.nav.pricing}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/legal/privacy">{content.footer.privacy}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/legal/terms">{terms}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/legal/refund">{content.footer.refunds}</Link>
        </nav>
      </div>
    </footer>
  );
}
