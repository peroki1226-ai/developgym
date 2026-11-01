"use strict";
const PREFIX =
  "gymfinder-preview-" +
  encodeURIComponent(new URL(self.registration.scope).pathname) +
  "-";
const CACHE = PREFIX + "__CACHE__";
const FILES = __FILES__;
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  const entryPages = ["./", "./index.html", "./gym-app-preview.html"].map(
    (file) => new URL(file, self.registration.scope).pathname,
  );
  if (event.request.mode === "navigate") {
    if (!entryPages.includes(url.pathname)) return;
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put("./index.html", response.clone()).catch(() => {});
            return response;
          }
          return (await caches.match("./index.html")) || response;
        })
        .catch(() => caches.match("./index.html")),
    );
  } else if (
    FILES.some(
      (file) =>
        new URL(file, self.registration.scope).pathname === url.pathname,
    )
  ) {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(event.request, { ignoreSearch: true })) ||
            fetch(event.request),
        ),
    );
  }
});
