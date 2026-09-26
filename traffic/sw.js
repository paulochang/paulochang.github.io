// Offline support. The build (see the injectPrecache plugin in vite.config.ts) rewrites the two
// placeholders below into a full list of every built file (so the hashed JS bundle is cached from
// the very first, online, load — not just after a second visit) and a VERSION derived from a
// content hash of those files (so a new build always gets a fresh cache and drops the old one).
// Don't hand-edit these; they're overwritten by every build.
const VERSION = "traffic-play-be6bcee41a71";
const PRECACHE = ["apple-touch-icon.png","assets/index-CdtyFjgl.js","icon-192.png","icon-512.png","icon.svg","./","manifest.webmanifest","vehicles-sprites.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Network-first for navigations, so an online visit always sees a new deploy; offline (or a
    // failed fetch) falls back to the cached app shell.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./", { ignoreVary: true })),
    );
    return;
  }

  // Cache-first for everything else: the JS bundle, sprites, icons and manifest are all
  // content-hashed or effectively immutable, and every one of them was precached at install time.
  // A miss here is a real error (or a genuinely new, non-precached URL) and must fail as a normal
  // network error offline -- never fall back to the HTML shell, which would silently break script,
  // style and image loads.
  event.respondWith(
    // ignoreVary matters here: a CORS-mode request (e.g. the crossorigin module script tag) sends
    // an Origin header that the install-time cache.addAll() fetch didn't, and some servers (vite
    // preview among them) reply with "Vary: Origin" -- without ignoreVary that mismatch makes a
    // byte-identical, already-cached entry register as a cache miss.
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return response;
      });
    }),
  );
});
