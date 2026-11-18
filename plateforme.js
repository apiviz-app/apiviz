// Apiviz — plateforme (IT-30, AP-TECH-387). Seul fichier qui sait si l'on tourne dans le site ou dans l'application
// Android / iOS (Capacitor injecte window.Capacitor avant les scripts de la page). Les écrans appellent Plateforme,
// jamais Capacitor directement.
(function () {
  const nom = window.Capacitor?.getPlatform?.() || "web";
  const native = nom !== "web";
  if (native) document.documentElement.classList.add("app-native", "app-" + nom);
  window.Plateforme = {
    nom, // "web", "android" ou "ios"
    native,
    // Application installée : l'appli des stores, ou le site ajouté à l'écran d'accueil (PWA).
    installee: () => native || matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
    // Adresse mise dans les liens envoyés par e-mail (confirmation, mot de passe oublié). L'application n'a pas
    // d'adresse web à elle : ses liens ouvrent le site du même environnement, en attendant les liens d'application.
    adresseRetour() {
      if (!native) return location.origin + location.pathname;
      return window.APIDOO?.env === "recette" ? "https://recette.apiviz.fr/" : "https://app.apiviz.fr/";
    },
  };
})();
