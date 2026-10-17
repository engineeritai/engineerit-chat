import type { Metadata } from "next";
import ShareView, { ShareExpired } from "@/app/share/view";
import { readShare } from "@/lib/shareStore";
import { SITE_URL } from "@/lib/seo";

export async function shareMetadata(id: string): Promise<Metadata> {
  const share = await readShare(id);
  if (!share) {
    return {
      title: "This share link has expired",
      description: "This share link has expired.",
      robots: { index: false, follow: false },
    };
  }
  const url = `${SITE_URL}/share/${share.id}`;
  const image = `${SITE_URL}/share/${share.id}/og`;
  return {
    title: share.title,
    description: share.description,
    robots: { index: false, follow: false },
    alternates: { canonical: url },
    openGraph: {
      title: share.title,
      description: share.description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: share.title }],
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

export async function ShareScreen({ id }: { id: string }) {
  const share = await readShare(id);
  if (!share) return <ShareExpired />;
  return <ShareView share={share} />;
}
