import JsonLd from "@/app/components/marketing/JsonLd";
import LandingView from "@/app/components/marketing/LandingView";
import LoggedInChatRedirect from "@/app/components/marketing/LoggedInChatRedirect";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { pageMetadata, softwareApplicationJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "engineerit.ai | AI engineering assistant for GCC consultancies",
  description:
    "engineerit.ai engineers any idea, topic or subject with a structured approach. Attach files, pick a tool, and get structured answers. Paid plans add exports.",
  path: "/",
});

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
