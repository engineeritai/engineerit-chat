/* App shell only. Never cache API, auth, checkout, or payment hosts. */
const CACHE = "engineerit-shell-v4";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        OFFLINE,
        "/apple-touch-icon-eit.png?v=2",
        "/icon-eit-192.png?v=2",
        "/icon-eit-512.png?v=2",
        "/icon-192-maskable.png?v=2",
        "/icon-512-maskable.png?v=2",
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function blocked(url) {
  const path = url.pathname;
  if (path.startsWith("/api")) return true;
  if (path.startsWith("/auth")) return true;
  if (path.startsWith("/checkout")) return true;
  if (path.startsWith("/payment")) return true;
  if (path.startsWith("/account/billing")) return true;
  const host = url.hostname;
  if (host.includes("supabase")) return true;
  if (host.includes("moyasar")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (blocked(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE)) || new Response("Offline", { status: 503 });
      })
    );
  }
});
