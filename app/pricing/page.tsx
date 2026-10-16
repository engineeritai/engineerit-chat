import JsonLd from "@/app/components/marketing/JsonLd";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import PricingBoard from "@/app/components/marketing/PricingBoard";
import AdvisorPricingNote from "@/app/components/AdvisorPricingNote";
import { getMarketingContent } from "@/lib/marketing";
import { pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Pricing",
  description:
    "Prices include VAT. Assistant Engineer is free. Engineer SAR 19/month, Professional Engineer SAR 41/month, Consultant Engineer SAR 79/month. Team SAR 349/month includes Consultant-tier features for 5 seats. Enterprise from SAR 2,500/month.",
  path: "/pricing",
});

export default function PricingPage() {
  const content = getMarketingContent("en");

  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <MarketingShell>
        <div className="mkt-section">
          <h1>{content.pricing.title}</h1>
          <p className="mkt-lead">{content.pricing.intro}</p>
          <PricingBoard />
          <AdvisorPricingNote />
        </div>
      </MarketingShell>
    </>
  );
}
