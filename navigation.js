// Apiviz — navigation par catégories (v5.32, maquettes validées le 12 nov. 2026).
//   - Ordinateur : menu latéral permanent à gauche, rangé par catégorie (v5.50 : repliable, compteurs, API dans la barre
//     du haut et recherche en fenêtre : navigation-ordi.js).
//     Plus d'onglets en haut ni de rubrique « Gestion » ; la recherche passe dans un bandeau en haut du contenu.
//   - Téléphone : la 5e touche de la barre du bas devient « Menu » et ouvre un volet par la droite, avec les mêmes
//     catégories. Accueil, Ruchers, API et Miel restent dans la barre du bas.
//   - « Gestion » est scindée en deux catégories : Finances (bilan, dépenses, budget, entre associés) et
//     Administration (matériel, fournisseurs, registre, déclaration). L'écran « plus » reste joignable par son adresse.
// Chargé après tous les scripts qui touchent la coquille (nav4, alveoles, ergonomie, essentiels) : ses crochets passent
// en dernier. S'appuie sur app.js (SIDE, BOTTOM, GROUP, ICON, ACT, esc, icon).
const NL = (() => {
  Object.assign(ICON, {
    menu: "M4 7h16M4 12h16M4 17h16",
    rappels: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
    carte: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
    varroa: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z",
    associes: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 4a4 4 0 0 1 0 8M2 21c0-4 3-6 7-6s7 2 7 6M18 15c2 1 4 3 4 6",
    registre: "M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h3",
    declaration: "M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11",
    membres: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6",
    recherche: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3",
    fil: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5", // fil de l'équipe (v5.59)
    masaison: "M4 20V10M10 20V4M16 20v-7M22 20H2", // Ma saison (v5.59)
  });

  // Catégories : [titre, [[route, libellé, libellé court pour le volet]]]
  // v5.44 (rationalisation, 15 nov. 2026) : un écran par sujet, avec des onglets. 18 entrées → 8 sur ordinateur, 5 dans
  // le volet du téléphone (Accueil, Ruchers et Miel sont déjà dans la barre du bas).
  const CATEGORIES = [
    ["Au quotidien", [["dash", "Accueil"], ["agenda", "Agenda"], ["fil", "Fil de l’équipe"]]],
    ["Ruchers et miel", [["ruches", "Ruchers"], ["clients", "Miel"], ["masaison", "Ma saison"]]],
    ["Gestion", [["pilotage", "Finances"], ["materiel", "Matériel"], ["registre", "Registre et déclaration"]]],
    ["Compte", [["reglages", "Réglages"]]],
  ];
  // Volet du téléphone : les entrées qui ne sont pas dans la barre du bas, avec ce qu'elles contiennent.
  const VOLET = [
    ["agenda", "Agenda", "Tâches, visites prévues, idées de saison"],
    ["fil", "Fil de l’équipe", "Ce que chacun a fait, notes et demandes"],
    ["masaison", "Ma saison", "Kilos, pots vendus, argent, ce qu’API retient"],
    ["pilotage", "Finances", "Bilan, dépenses, factures, budget, entre associés"],
    ["materiel", "Matériel", "Stock, liste de courses, fournisseurs"],
    ["registre", "Registre et déclaration", "Traitements, ordonnances, déclaration annuelle"],
    ["reglages", "Réglages", "Toi, exploitation et équipe, rappels, appli"],
  ];
  // Écrans de détail : l'entrée du menu qui reste allumée.
  const PARENT = { ruche: "ruches", rucher: "ruches", visite: "ruches", deplacer: "ruches", tournee: "ruches", meteo: "ruches",
    carte: "ruches", varroa: "ruches", visiteexpress: "ruches", etiquettesqr: "ruches",
    miel: "clients", recolte: "clients", lot: "clients", miseenpots: "clients", ventes: "clients", vente: "clients", facture: "clients", caisse: "clients", commandes: "clients",
    compta: "pilotage", factures: "pilotage", achatfacture: "pilotage", previsions: "pilotage", associes: "pilotage", plus: "pilotage",
    courses: "materiel", inventaire: "materiel", fournisseurs: "materiel", declaration: "registre",
    membres: "reglages", profil: "reglages", rappels: "reglages", synchronisation: "reglages",
    activite: "dash", saison: "agenda", recherche: "dash" };
  const actif = (route) => PARENT[route] || route;
  const categorieDe = (route) => CATEGORIES.find(([, l]) => l.some(([r]) => r === actif(route)))?.[0] || "";

  // ---------- Menus ----------
  // Ordinateur : API en tête, puis chaque catégorie (un séparateur devient son titre au dessin).
  SIDE.splice(0, SIDE.length, ["saisir", "API"], ...CATEGORIES.flatMap(([, l]) => [null, ...l.map(([r, t]) => [r, t])]));
  // Téléphone : Menu à la place de Gestion.
  const i = BOTTOM.findIndex(([k]) => k === "plus");
  if (i >= 0) BOTTOM[i] = ["menu", "Menu"];
  // Écrans rangés derrière « Menu » dans la barre du bas.
  ["fil", "masaison", "pilotage", "compta", "factures", "achatfacture", "previsions", "associes", "materiel", "fournisseurs", "courses", "inventaire", "registre", "declaration", "membres", "reglages", "profil", "plus", "rappels", "synchronisation", "agenda", "saison"]
    .forEach((r) => (GROUP[r] = "menu"));

  const goAvant = ACT.go;
  ACT.go = (v) => (v === "menu" ? ouvrir() : goAvant(v));
  ACT.nlmenu = () => ouvrir();
  ACT.nlfermer = () => fermer();

  // ---------- Volet (téléphone) ----------
  function volet() {
    let d = document.getElementById("nlVolet");
    if (!d) {
      document.body.insertAdjacentHTML("beforeend", '<dialog id="nlVolet" class="nl-volet" aria-label="Menu"></dialog>');
      d = document.getElementById("nlVolet");
      // Fermer : clic sur le fond, ou choix d'une rubrique (l'action « go » est lancée par le gestionnaire d'app.js).
      d.addEventListener("click", (e) => {
        if (e.target === d || e.target.closest?.("[data-act=go]")) fermer();
      });
    }
    return d;
  }
  function ouvrir() {
    const d = volet(), a = actif(S.route), mail = S.session?.user?.email || "";
    let prenom = "";
    try { prenom = String(localStorage.getItem(`apiviz-prenom-${mail}`) || "").trim(); } catch {}
    const nom = typeof cfg == "function" ? cfg().nom || "" : "";
    d.innerHTML = `<div class="nl-tete"><span class="avatar">${esc((prenom || mail || "?")[0].toUpperCase())}</span>
        <span class="nl-qui"><b>${esc(prenom || mail)}</b>${nom ? `<span>${esc(nom)}</span>` : ""}</span>
        <button type="button" class="nl-fermer" data-act="nlfermer" aria-label="Fermer le menu">${icon("menu").replace(/d="[^"]*"/, 'd="M6 6l12 12M18 6L6 18"')}</button></div>
      <div class="nl-corps"><button type="button" class="nl-chercher" data-act="go" data-v="recherche">${icon("recherche")}<span>Rechercher une ruche, un client…</span></button>
        <div class="nl-liste">${VOLET.map(([r, t, sous]) => `<button type="button" class="nl-entree${a === r ? " on" : ""}" data-act="go" data-v="${r}"${a === r ? ' aria-current="page"' : ""}><span class="nl-ic">${icon(r)}</span><span class="nl-txt"><b>${esc(t)}</b><span>${esc(sous)}</span></span></button>`).join("")}</div>
        <p class="nl-note">Accueil, Ruchers et Miel sont dans la barre du bas.</p></div>`;
    if (!d.open) d.showModal();
    d.querySelector("button.on, .nl-liste button")?.focus({ preventScroll: true });
  }
  function fermer() { const d = document.getElementById("nlVolet"); if (d?.open) d.close(); }
  // Passage du téléphone à l'ordinateur (rotation d'une tablette) : le volet n'a plus lieu d'être.
  matchMedia("(min-width:801px)").addEventListener?.("change", (e) => { if (e.matches) fermer(); });

  // ---------- Après chaque écran ----------
  Noyau.crochets.sur("apresCoquille", "navigation", () => {
    fermer();
    const side = document.querySelector(".side");
    if (side) {
      // Titres de catégorie à la place des séparateurs, dans l'ordre.
      side.querySelectorAll(":scope > .sep").forEach((s, n) => {
        const h = document.createElement("p");
        h.className = "nl-titre";
        h.textContent = CATEGORIES[n]?.[0] || "";
        s.replaceWith(h);
      });
      // « Miel » (route clients) : l'icône du pot, pas celle des clients (v5.44).
      const pot = side.querySelector('.nav[data-v="clients"] svg');
      if (pot && typeof ICON != "undefined" && ICON.miel) pot.outerHTML = icon("miel");
      // Entrée allumée : celle de l'écran, ou de son parent.
      const a = actif(S.route);
      side.querySelectorAll(".nav[data-v]").forEach((b) => {
        const on = b.dataset.v === a;
        b.classList.toggle("on", on);
        on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
      });
      // La recherche et la cloche (v5.44 : elle ouvre la feuille Rappels) passent dans le bandeau du contenu.
      const cloche = side.querySelector(".er-cloche");
      const barre = side.querySelector(".er-barre"), main = document.querySelector(".shell > main");
      if (main && !main.querySelector(".nl-entete")) {
        main.insertAdjacentHTML("afterbegin", '<div class="nl-entete"></div>');
        if (barre) main.querySelector(".nl-entete").append(barre);
      }
      if (cloche) { const ent = main?.querySelector(".nl-entete"); ent ? ent.append(cloche) : cloche.remove(); }
    }
    // Fil d'Ariane : retiré en v5.43 (gabarit commun, src/noyau/gabarit.js) ; un écran du Menu n'a pas de retour.
  });

  return { CATEGORIES, VOLET, ouvrir, fermer, categorieDe };
})();
