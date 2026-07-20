// Finance Hub service worker — offline shell caching.
// Strategy: precache the app shell; cache-first for static assets, network-first for everything else.
const CACHE = "finance-hub-v1";
const SHELL = ["/dashboard", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API responses or Plaid — always network.
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first.
  if (req.destination === "style" || req.destination === "script" || req.destination === "image" || req.destination === "font") {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // Navigation requests: network-first, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/dashboard").then((c) => c || caches.match(req)))
    );
    return;
  }
});
