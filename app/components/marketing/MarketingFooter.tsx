import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";

export default function MarketingFooter() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const year = new Date().getFullYear();
  const terms = locale === "ar" ? "الشروط" : "Terms";

  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-line">
        <span className="brand" aria-hidden="true">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </span>
        <span>© {year} engineerit.ai</span>
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
