// Apiviz — navigation par catégories (v5.32, maquettes validées le 12 nov. 2026).
//   - Ordinateur : menu latéral permanent à gauche, rangé par catégorie, sans compteur ni pastille.
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
  });

  // Catégories : [titre, [[route, libellé, libellé court pour le volet]]]
  const CATEGORIES = [
    ["Au quotidien", [["dash", "Accueil"], ["agenda", "Agenda"], ["rappels", "Rappels"]]],
    ["Ruchers", [["ruches", "Ruches"], ["carte", "Carte"], ["varroa", "Santé et varroa", "Santé"]]],
    ["Miel et ventes", [["miel", "Stock et lots", "Stock"], ["clients", "Clients et ventes", "Clients"]]],
    ["Finances", [["pilotage", "Bilan"], ["compta", "Dépenses et achats", "Dépenses"], ["previsions", "Budget et prévisions", "Budget"], ["associes", "Entre associés", "Associés"]]],
    ["Administration", [["materiel", "Matériel"], ["fournisseurs", "Fournisseurs"], ["registre", "Registre d’élevage", "Registre"], ["declaration", "Déclaration"]]],
    ["Équipe et compte", [["membres", "Équipe"], ["reglages", "Réglages"]]],
  ];
  // Écrans de détail : l'entrée du menu qui reste allumée.
  const PARENT = { ruche: "ruches", rucher: "ruches", visite: "ruches", deplacer: "ruches", tournee: "ruches", meteo: "ruches",
    recolte: "miel", lot: "miel", miseenpots: "miel", ventes: "clients", vente: "clients", facture: "clients",
    plus: "pilotage", activite: "dash", saison: "agenda", recherche: "dash" };
  const actif = (route) => PARENT[route] || route;
  const categorieDe = (route) => CATEGORIES.find(([, l]) => l.some(([r]) => r === actif(route)))?.[0] || "";

  // ---------- Menus ----------
  // Ordinateur : API en tête, puis chaque catégorie (un séparateur devient son titre au dessin).
  SIDE.splice(0, SIDE.length, ["saisir", "API"], ...CATEGORIES.flatMap(([, l]) => [null, ...l.map(([r, t]) => [r, t])]));
  // Téléphone : Menu à la place de Gestion.
  const i = BOTTOM.findIndex(([k]) => k === "plus");
  if (i >= 0) BOTTOM[i] = ["menu", "Menu"];
  // Écrans rangés derrière « Menu » dans la barre du bas.
  ["pilotage", "compta", "previsions", "associes", "materiel", "fournisseurs", "registre", "declaration", "membres", "reglages", "plus", "rappels"]
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
      <div class="nl-corps">${CATEGORIES.map(([titre, l]) => `<section><h2>${esc(titre)}</h2><div class="nl-tuiles">${l
        .map(([r, t, court]) => `<button type="button" class="${a === r ? "on" : ""}" data-act="go" data-v="${r}"${a === r ? ' aria-current="page"' : ""}>${icon(r)}<span>${esc(court || t)}</span></button>`)
        .join("")}</div></section>`).join("")}</div>`;
    if (!d.open) d.showModal();
    d.querySelector("button.on, .nl-tuiles button")?.focus({ preventScroll: true });
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
      // Entrée allumée : celle de l'écran, ou de son parent.
      const a = actif(S.route);
      side.querySelectorAll(".nav[data-v]").forEach((b) => {
        const on = b.dataset.v === a;
        b.classList.toggle("on", on);
        on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
      });
      // Pas de cloche dans le menu (Rappels a son entrée) ; la recherche passe dans le bandeau du contenu.
      side.querySelector(".er-cloche")?.remove();
      const barre = side.querySelector(".er-barre"), main = document.querySelector(".shell > main");
      if (main && !main.querySelector(".nl-entete")) {
        main.insertAdjacentHTML("afterbegin", '<div class="nl-entete"></div>');
        if (barre) main.querySelector(".nl-entete").append(barre);
      }
    }
    // Fil d'Ariane : la catégorie à la place de « Gestion » ; sur téléphone, elle ouvre le volet.
    const cat = categorieDe(S.route);
    const lien = document.querySelector('.er-ariane [data-v="plus"], .wrap > .u-retour[data-v="plus"]');
    if (lien && cat) {
      lien.textContent = cat;
      lien.dataset.act = "nlmenu";
      lien.removeAttribute("data-v");
      // Ce n'est plus un retour (transitions.js, ergonomie.js) : il ouvre le volet.
      lien.classList.replace("u-retour", "nl-categorie");
    }
    if (!lien && cat && S.route === "associes" && !document.querySelector(".er-ariane")) {
      document.querySelector(".wrap > .head")?.insertAdjacentHTML("beforebegin", `<nav class="er-ariane" aria-label="Fil d’Ariane"><button type="button" class="link nl-categorie" data-act="nlmenu">${esc(cat)}</button><span aria-hidden="true">›</span><span>Entre associés</span></nav>`);
    }
  });

  return { CATEGORIES, ouvrir, fermer, categorieDe };
})();
