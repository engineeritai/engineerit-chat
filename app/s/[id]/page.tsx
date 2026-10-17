import { ShareScreen, shareMetadata } from "@/app/share/screen";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RouteContext) {
  const { id } = await params;
  return shareMetadata(id);
}

export default async function LegacySharePage({ params }: RouteContext) {
  const { id } = await params;
  return <ShareScreen id={id} />;
}
