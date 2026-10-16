import MarketingShell from "@/app/components/marketing/MarketingShell";
import SoftwareJsonLd from "@/app/components/marketing/SoftwareJsonLd";
import PricingView from "@/app/pricing/PricingView";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/pricing");
  return pageMetadata({ ...meta, path: "/pricing", locale });
}

export default async function PricingPage() {
  return (
    <>
      <SoftwareJsonLd />
      <MarketingShell>
        <PricingView />
      </MarketingShell>
    </>
  );
}
