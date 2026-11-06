// Apidoo — service worker : garde l'application sur le téléphone pour l'ouvrir sans réseau.
// Les données (Supabase) ne passent pas par ici : offline.js s'en occupe.
const VERSION = "apidoo-dev"; // remplie à l'assemblage : date + commit (scripts/generer-coquille.py)
// Liste remplie à l'assemblage depuis index.html (scripts/generer-coquille.py, IT-03) : ne plus l'écrire à la main.
// Hors assemblage (développement), seule la page est gardée ; le reste l'est au fil de l'eau.
const COQUILLE = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) =>
    Promise.all(COQUILLE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k.startsWith("recette-") === VERSION.startsWith("recette-")).map((k) => caches.delete(k))))
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

// Un clic sur une notification rouvre Apidoo sur les rappels.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((l) => (l[0] ? l[0].focus() : self.clients.openWindow("./"))));
});
