/* ============================================================================
   SLAM the Game: sw.js (the service worker)
   PURPOSE     Let a phone or a laptop install the game like an app.
   INPUT       Each GET request of the page.
   OUTPUT      The answer from the network. If the network fails: the answer from the browser cache,
               when the cache has one.
   DEPENDS ON  Nothing. features/home.js registers this file. The browser loads it apart from the page.
   RULES       The network comes first, thus the player never sees an old version.
               This file puts nothing in the cache, thus the cache is always empty (KNOWN-WEAK.md, C7).
   ========================================================================= */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
