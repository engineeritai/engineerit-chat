import GuideView from "@/app/components/marketing/GuideView";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/how-it-works");
  return pageMetadata({ ...meta, path: "/how-it-works", locale });
}

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <GuideView mode="how" />
    </MarketingShell>
  );
}
