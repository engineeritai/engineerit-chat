import GuideView from "@/app/components/marketing/GuideView";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/guide");
  return pageMetadata({ ...meta, path: "/guide", locale });
}

export default function GuidePage() {
  return (
    <MarketingShell>
      <GuideView mode="guide" />
    </MarketingShell>
  );
}
