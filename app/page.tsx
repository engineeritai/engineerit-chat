import LandingView from "@/app/components/marketing/LandingView";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import SoftwareJsonLd from "@/app/components/marketing/SoftwareJsonLd";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/");
  return pageMetadata({ ...meta, path: "/", locale });
}

export default async function HomePage() {
  return (
    <>
      <SoftwareJsonLd />
      <MarketingShell>
        <LandingView />
      </MarketingShell>
    </>
  );
}
