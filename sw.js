// Apiviz — service worker : garde l'application sur le téléphone pour l'ouvrir sans réseau.
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

  // Bibliothèques (Supabase, Leaflet, QR) : la copie gardée d'abord. Les polices sont hébergées par Apiviz (v5.73).
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(enCache(req).then((r) => r || fetch(req).then((x) => garder(req, x))));
  }
});

// v5.87 : rappel envoyé par la fonction « rappels » (Web Push), même quand Apiviz est fermée.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corps: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titre || "Apiviz", { body: d.corps || "", icon: "icone-192.png", badge: "icone-192.png", tag: d.tag || "apiviz-rappel", data: { route: d.route || "rappels" } }));
});

// Un clic sur une notification rouvre Apiviz (sur l'écran du rappel : ?ecran=…).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const route = /^[a-z]{2,20}$/.test(e.notification.data?.route || "") ? e.notification.data.route : "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((l) => {
    if (l[0]) { if (route) l[0].postMessage({ type: "apiviz-route", route }); return l[0].focus(); }
    return self.clients.openWindow(route ? `./?ecran=${route}` : "./");
  }));
});
