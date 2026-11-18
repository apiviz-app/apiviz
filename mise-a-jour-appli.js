// Apiviz — mise à jour de l'application Android / iOS sans nouvel APK (IT-30, AP-TECH-409).
// Dans le site, ce fichier ne fait rien. Dans l'appli, à chaque ouverture :
// 1. il confirme au module de mise à jour que cette version démarre bien (sinon, retour automatique à la précédente) ;
// 2. il lit mobile/version.json sur le site de son environnement (publié par « Mise en ligne ») ;
// 3. si la version diffère et ne demande pas un nouvel APK, il télécharge le paquet en arrière-plan ; il s'applique à la
//    prochaine ouverture de l'appli (jamais pendant une saisie : ni au passage à l'appareil photo, ni en arrière-plan).
(function () {
  const M = window.Capacitor?.Plugins?.CapacitorUpdater;
  if (!window.Plateforme?.native || !M) return;
  const DEJA_SIGNALE = "apiviz.majNatifSignalee";
  const ECHEC = "apiviz.majEchouee";

  // Démarrage réussi = l'écran de l'application est affiché. Une version qui casse au démarrage n'appelle jamais
  // notifyAppReady : le module revient tout seul à la version précédente après 15 s (capacitor.config.json).
  function quandDemarree() {
    return new Promise((ok) => {
      const debut = Date.now();
      (function regarder() {
        const app = document.getElementById("app");
        if (app && app.children.length && window.supabase) return ok(true);
        if (Date.now() - debut > 12000) return ok(false);
        setTimeout(regarder, 300);
      })();
    });
  }

  // Fichier local : fetch. Fichier du site : requête native (CapacitorHttp), car le site est sur une autre adresse que
  // l'appli (https://localhost) et ne répond pas aux requêtes d'une autre origine (CORS).
  async function lireJson(url) {
    const H = window.Capacitor?.Plugins?.CapacitorHttp;
    if (/^https:/.test(url) && H) {
      const r = await H.get({ url: url + "?t=" + Date.now(), headers: { "Cache-Control": "no-cache" }, responseType: "json" });
      if (r.status < 200 || r.status > 299) throw new Error(url + " : " + r.status);
      return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    }
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(url + " : " + r.status);
    return r.json();
  }

  async function verifier() {
    if (!(await quandDemarree())) return;
    await M.notifyAppReady();
    if (!navigator.onLine) return;
    const site = window.Plateforme.adresseRetour();
    const [ici, publiee, natif] = await Promise.all([
      lireJson("./version-mobile.json").catch(() => ({})),
      lireJson(site + "mobile/version.json"),
      M.getBuiltinVersion().then((b) => parseInt(String(b.version).replace("natif-", ""), 10) || 1),
    ]);
    if (!publiee.version || publiee.version === ici.version) return;

    // Le nouveau contenu demande des fonctions que cet APK n'a pas : il faut installer le nouvel APK.
    if ((publiee.natif || 1) > natif) {
      let signalee = null;
      try { signalee = localStorage.getItem(DEJA_SIGNALE); } catch (e) { /* stockage indisponible */ }
      if (signalee !== publiee.version) {
        window.toast?.("Une nouvelle version de l'application est à installer.");
        try { localStorage.setItem(DEJA_SIGNALE, publiee.version); } catch (e) { /* stockage indisponible */ }
      }
      return;
    }

    // Déjà téléchargée lors d'une ouverture précédente ? Sinon, téléchargement.
    const { bundles = [] } = await M.list();
    // Une version qui a déjà échoué au démarrage (retour automatique) n'est pas retentée : on attend la suivante.
    let echouee = null;
    try { echouee = localStorage.getItem(ECHEC); } catch (e) { /* stockage indisponible */ }
    if (bundles.some((b) => b.version === publiee.version && b.status === "error")) {
      try { localStorage.setItem(ECHEC, publiee.version); } catch (e) { /* stockage indisponible */ }
      echouee = publiee.version;
    }
    if (echouee === publiee.version) return;
    let paquet = bundles.find((b) => b.version === publiee.version);
    if (!paquet) paquet = await M.download({ url: site + publiee.url, version: publiee.version });
    await M.next({ id: paquet.id });
    // Seulement à la prochaine ouverture (appli fermée puis relancée).
    await M.setMultiDelay({ delayConditions: [{ kind: "kill" }] });

    // Ménage : on ne garde que la version en cours et la prochaine.
    const { bundle: actuelle } = await M.current();
    for (const b of bundles) {
      if (b.id !== paquet.id && b.id !== actuelle?.id && b.id !== "builtin") await M.delete({ id: b.id }).catch(() => {});
    }
    window.toast?.("Nouvelle version d'Apiviz prête : elle s'appliquera à la prochaine ouverture.");
  }

  window.addEventListener("load", () => {
    verifier().catch((e) => console.warn("Mise à jour de l'appli :", e?.message || e));
  });
})();
