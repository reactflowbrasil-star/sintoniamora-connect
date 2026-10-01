const CACHE = "sintoniamora-shell-v1";
const OFFLINE = "/offline.html";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const req = event.request, url = new URL(req.url);
  // Do not cache APIs, authenticated pages, messages, or any private user data.
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || new Response("Você está offline. Conecte-se à internet para acessar este recurso.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })));
});
