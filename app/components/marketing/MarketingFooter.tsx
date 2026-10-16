import Link from "next/link";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";
import PlanPriceList from "@/app/components/PlanPriceList";
import { CONTACT_EMAIL } from "@/lib/trust";

export default function MarketingFooter() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <div className="brand" aria-hidden="true">
          <span className="word">
            <span className="engineer">engineer</span>
            <span className="it">it</span>
          </span>
        </div>
        <p>{content.footer.blurb}</p>
        <PlanPriceList />
        <p>
          © {year} engineerit.ai. {content.footer.rights}
        </p>
        <p>
          {content.footer.policyLead}{" "}
          <Link href="/legal/terms">{content.footer.policyLink}</Link>.
        </p>
        <p>
          <Link href="/pricing">{content.nav.pricing}</Link>
          {" · "}
          <Link href="/chat">{content.nav.openChat}</Link>
          {" · "}
          <Link href="/register">{content.footer.register}</Link>
          {" · "}
          <Link href="/legal/privacy">{content.footer.privacy}</Link>
          {" · "}
          <Link href="/legal/refund">{content.footer.refunds}</Link>
          {" · "}
          <a href={`mailto:${CONTACT_EMAIL}`}>
            {content.footer.contact} {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
