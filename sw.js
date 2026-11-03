// Apidoo — service worker : garde l'application sur le téléphone pour l'ouvrir sans réseau.
// Les données (Supabase) ne passent pas par ici : offline.js s'en occupe.
const VERSION = "apidoo-2026-11-03";
const COQUILLE = [
  "./", "./index.html", "./app.js", "./photos.js", "./offline.js", "./config.js", "./manifest.webmanifest",
  "./logo-apidoo.svg", "./logo-apidoo-clair.svg", "./symbole-apidoo.svg", "./icone-apidoo.svg",
  "./icone-180.png", "./icone-192.png", "./icone-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) =>
    Promise.all(COQUILLE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const garder = (req, res) => {
  if (res && (res.ok || res.type === "opaque")) {
    const copie = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copie)).catch(() => {});
  }
  return res;
};
const enCache = (req) => caches.match(req, { ignoreSearch: true });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return; // données et photos : toujours en direct

  if (url.origin === self.location.origin) {
    // L'app : version en ligne d'abord (pour les mises à jour), copie gardée si le réseau manque ou traîne.
    e.respondWith((async () => {
      const reseau = fetch(req).then((r) => garder(req, r));
      const lent = new Promise((ok) => setTimeout(ok, 4000)).then(() => enCache(req));
      let r = await Promise.race([reseau.catch(() => null), lent]);
      if (!r) r = await reseau.catch(() => null);
      if (!r) r = await enCache(req);
      if (!r && req.mode === "navigate") r = await enCache("./index.html");
      return r || Response.error();
    })());
    return;
  }

  // Bibliothèque Supabase et polices : la copie gardée d'abord.
  if (/^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    e.respondWith(enCache(req).then((r) => r || fetch(req).then((x) => garder(req, x))));
  }
});
