import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShareView from "@/app/s/[id]/view";
import { readShare } from "@/lib/shareStore";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { id } = await params;
  const share = await readShare(id);
  if (!share) return { title: "engineer it" };
  const image = `/s/${share.id}/og`;
  return {
    title: share.title,
    description: share.description,
    openGraph: {
      title: share.title,
      description: share.description,
      images: [image],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: share.title,
      description: share.description,
      images: [image],
    },
  };
}

export default async function SharePage({ params }: RouteContext) {
  const { id } = await params;
  const share = await readShare(id);
  if (!share) notFound();
  return <ShareView share={share} />;
}
