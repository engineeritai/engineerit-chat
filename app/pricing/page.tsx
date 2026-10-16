import JsonLd from "@/app/components/marketing/JsonLd";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import PricingView from "@/app/pricing/PricingView";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/pricing");
  return pageMetadata({ ...meta, path: "/pricing", locale });
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <MarketingShell>
        <PricingView />
      </MarketingShell>
    </>
  );
}
