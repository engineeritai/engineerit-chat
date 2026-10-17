import { SITE_URL } from "@/lib/seo";

/** Absolute share URL. Production links always use engineerit.ai. */
export function publicShareUrl(id: string, requestOrigin?: string): string {
  let origin = SITE_URL;
  if (requestOrigin) {
    try {
      const url = new URL(requestOrigin);
      const host = url.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
        origin = url.origin;
      }
    } catch {
      /* keep the public site */
    }
  }
  return `${origin}/share/${id}`;
}
