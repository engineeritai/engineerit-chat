import FaqView from "@/app/faq/FaqView";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/faq");
  return pageMetadata({ ...meta, path: "/faq", locale });
}

export default function FaqPage() {
  return (
    <MarketingShell>
      <FaqView />
    </MarketingShell>
  );
}
