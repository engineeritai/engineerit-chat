import JsonLd from "@/app/components/marketing/JsonLd";
import LandingView from "@/app/components/marketing/LandingView";
import LoggedInChatRedirect from "@/app/components/marketing/LoggedInChatRedirect";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { metaFor } from "@/lib/pageMeta";
import { requestLocale } from "@/lib/requestLocale";
import { pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export async function generateMetadata() {
  const locale = await requestLocale();
  const meta = metaFor(locale, "/");
  return pageMetadata({ ...meta, path: "/", locale });
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <LoggedInChatRedirect />
      <MarketingShell>
        <LandingView />
      </MarketingShell>
    </>
  );
}
