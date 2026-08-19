// Site Visit Intake — offline service worker
// Bump CACHE_NAME any time index.html (or other cached files) change,
// so returning users get the update instead of a stale cached copy.
const CACHE_NAME = "site-visit-intake-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: pre-cache the app shell so it's available offline immediately.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old cache versions.
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for the page (so you get updates when online),
// falling back to cache when offline. Cache-first for everything else.
self.addEventListener("fetch", function (event) {
  var req = event.request;

  // Only handle GET requests from this origin.
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) {
    return;
  }

  var isNavigation = req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept") && req.headers.get("accept").includes("text/html"));

  if (isNavigation) {
    event.respondWith(
      fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        return res;
      }).catch(function () {
        // No cache, no network — nothing we can do for this asset.
        return cached;
      });
    })
  );
});
