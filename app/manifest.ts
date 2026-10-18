import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=android",
    name: "engineer it",
    short_name: "engineer it",
    description: "Structured engineering answers, tools, and advisors.",
    start_url: "/?source=android",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#1a56ff",
    lang: "en",
    dir: "auto",
    icons: [
      { src: "/icon-eit-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-eit-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
