import MarketingShell from "@/app/components/marketing/MarketingShell";
import ToolsView from "@/app/components/marketing/ToolsView";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/tools");
  return pageMetadata({ ...meta, path: "/tools", locale });
}

export default function ToolsPage() {
  return (
    <MarketingShell>
      <ToolsView />
    </MarketingShell>
  );
}
