// Apiviz — gabarit d'écran commun (v5.43, audit « ergonomie et uniformisation » du 14 nov. 2026, règles 1 à 10).
// Un seul endroit décide de l'habillage de chaque écran, quel que soit le module qui l'a dessiné :
//   - en-tête : « ‹ Parent » (seulement sous le 1er niveau), titre = un nom (jamais une phrase), résumé dessous,
//     bouton ⋯ pour les actions rares ;
//   - un seul bouton principal : en bas sur téléphone (barre au-dessus du menu), à droite de l'en-tête sur ordinateur ;
//   - les autres boutons de l'en-tête et des barres du bas partent dans la feuille « Actions » (⋯) ;
//   - l'année se choisit par une puce « 2026 ▾ » qui ouvre une feuille ;
//   - les écrans de saisie pas à pas (« flux » : visite, tournée, vente…) gardent leur propre en-tête.
// Règles pures exportées (tests : tests/unitaires/gabarit.test.mjs) ; la partie DOM tourne en dernier, après chaque
// rendu (crochet « apresRendu » déclaré par le dernier module chargé), et ne change aucune donnée.

/** Écrans de saisie pas à pas : leur en-tête (Annuler, étapes) n'est pas touché. */
export const FLUX = new Set(["visite", "visiteexpress", "tournee", "vente", "recolte", "miseenpots", "deplacer", "inventaire"]);

/** Écrans de 1er niveau (barre du bas ou Menu) : pas de bouton retour. */
export const NIVEAU1 = new Set(["dash", "ruches", "carte", "varroa", "clients", "ventes", "miel", "agenda", "pilotage", "compta",
  "previsions", "associes", "materiel", "courses", "fournisseurs", "registre", "declaration", "membres", "reglages", "plus"]);

/** Parent d'un écran de 2e niveau quand l'écran ne le donne pas lui-même : [route, libellé]. */
export const PARENTS = {
  ruche: ["ruches", "Ruchers"], rucher: ["ruches", "Ruchers"], meteo: ["ruches", "Ruchers"],
  lot: ["miel", "Miel"], facture: ["clients", "Miel"], inventaire: ["materiel", "Matériel"],
  saison: ["agenda", "Agenda"], activite: ["dash", "Accueil"], recherche: ["dash", "Accueil"], profil: ["reglages", "Réglages"],
  rappels: ["reglages", "Réglages"],
};

/**
 * Écrans-sujets (v5.44, rationalisation du 15 nov. 2026) : plusieurs adresses, un seul écran pour l'apiculteur, avec
 * des onglets. Le titre est celui du sujet ; l'onglet allumé dit où l'on est.
 */
export const SUJETS = {
  // v5.50 (standards d'écran du 16 nov. 2026) : Ruchers et Miel suivent la même règle. Un onglet peut lancer une action de
  // l'écran au lieu d'une adresse : [adresse, libellé, action, valeur] (Ventes et Clients partagent l'adresse « clients »).
  ruchers: { titre: "Ruchers", onglets: [["ruches", "Liste"], ["carte", "Carte"], ["varroa", "Santé"]] },
  miel: { titre: "Miel", onglets: [["clients", "Ventes", "uonglet", "ventes"], ["clients", "Clients", "uonglet", "clients"], ["miel", "Stock et récoltes", "uonglet", "stock"]] },
  finances: { titre: "Finances", onglets: [["pilotage", "Bilan"], ["compta", "Dépenses"], ["previsions", "Budget"], ["associes", "Associés"]] },
  materiel: { titre: "Matériel", onglets: [["materiel", "Stock"], ["courses", "Courses"], ["fournisseurs", "Fournisseurs"]] },
  registre: { titre: "Registre et déclaration", onglets: [["registre", "Registre"], ["declaration", "Déclaration"]] },
  reglages: { titre: "Réglages", onglets: [["reglages", "Réglages"], ["membres", "Équipe"]] },
};
/**
 * Index de l'onglet allumé : celui de l'adresse ; si plusieurs onglets partagent l'adresse, celui dont la valeur est
 * l'onglet interne de l'écran (« livrer » compte pour Ventes), sinon le premier.
 */
/** Titres d'écran longs (plus de 16 caractères) : 22 px au lieu de 27 sur téléphone (gabarit.css, .g-long). */
export const TITRE_LONG = 16;
export function ongletActif(sujet, route, interne) {
  const l = sujet.onglets.map((o, i) => [o, i]).filter(([o]) => o[0] === route);
  if (l.length < 2) return l.length ? l[0][1] : -1;
  return (l.find(([o]) => o[3] === interne) || l[0])[1];
}
/** Le sujet d'une adresse, ou null. */
export function sujetDe(route) {
  for (const [cle, s] of Object.entries(SUJETS)) if (s.onglets.some(([r]) => r === route)) return { cle, titre: s.titre, onglets: s.onglets, actif: route };
  return null;
}

const UNITE = /\d[\d\s,.]*\s?(€|kg|pots?|ruches?|rappels?|colonies?|articles?)(?=$|[\s.,;:!?])/i;

/**
 * Titre d'écran : un nom court. Une phrase (« Bilan positif de 36 €. », « 0 € dépensés en 2026 ») passe en résumé
 * sous le titre de l'écran (celui de la table des écrans).
 */
export function titreEtResume(titre, resume, titreEcran) {
  const t = String(titre ?? "").trim(), r = String(resume ?? "").trim();
  const phrase = /[.!?…]$/.test(t) || t.length > 32 || UNITE.test(t);
  if (phrase && titreEcran && titreEcran !== t) return { titre: titreEcran, resume: [t.replace(/\.$/, ""), r].filter(Boolean).join(" · ") };
  return { titre: t || titreEcran || "", resume: r };
}

/**
 * Tri des boutons d'une barre : un seul principal (le premier « main » ou « honey »), les autres vont dans ⋯.
 * Entrée : [{ principal, garder, menu }] ; sortie : { principal: index | -1, autres: [index], menu: index | -1 }.
 * « menu » = un bouton ⋯ déjà présent : s'il est seul avec le principal, il sert tel quel.
 */
export function trierBoutons(boutons) {
  const principal = boutons.findIndex((b) => b.principal);
  const reste = boutons.map((b, i) => i).filter((i) => i !== principal && !boutons[i].garder);
  const menu = reste.length === 1 && boutons[reste[0]].menu ? reste[0] : -1;
  return { principal, autres: menu >= 0 ? [] : reste, menu };
}

/** Retour : celui que l'écran propose, sinon son parent connu ; jamais pour un écran de 1er niveau. */
export function retourDe(route, propose) {
  if (NIVEAU1.has(route) || FLUX.has(route)) return null;
  if (propose && propose.act) return { act: propose.act, v: propose.v ?? "", k: propose.k ?? "", texte: String(propose.texte || "").replace(/^‹\s*/, "").split(" · ")[0].trim() || "Retour" };
  const p = PARENTS[route];
  return p ? { act: "go", v: p[0], k: "", texte: p[1] } : null;
}

/** Années proposées par la puce : celles de la liste, la plus récente d'abord. */
export const annees = (valeurs) => [...new Set(valeurs.map(Number).filter((x) => x > 1900))].sort((a, b) => b - a);

// ---------- Partie DOM (navigateur seulement) ----------
const ICONE = (d, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const PLUS = "M5 12h.01M12 12h.01M19 12h.01", RETOUR = "M15 18l-6-6 6-6", BAS = "M6 9l6 6 6-6";
let enAttente = [];
const echap = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const libelle = (b) => (b.getAttribute("aria-label") && b.textContent.trim().length <= 1 ? b.getAttribute("aria-label") : b.textContent.replace(/\s+/g, " ").trim()) || b.title || "Action";

/** Feuille « Actions » : une liste d'actions ; toucher ferme la feuille puis lance l'action d'origine. */
export function feuilleActions(titre, elements) {
  const f = typeof $sheetForm != "undefined" ? $sheetForm : null, d = typeof $sheet != "undefined" ? $sheet : null;
  if (!f || !d || !elements.length) return;
  enAttente = elements;
  f.onsubmit = (e) => e.preventDefault();
  f.innerHTML = `<div class="g-ftete"><h2>${echap(titre)}</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ICONE("M18 6L6 18M6 6l12 12")}</button></div>
    <div class="g-actions">${elements.map((b, i) => `<button type="button" class="g-action${b.classList.contains("crit") || b.classList.contains("danger") ? " crit" : ""}" data-act="gchoisir" data-v="${i}"${b.disabled ? " disabled" : ""}>${echap(libelle(b))}</button>`).join("")}</div>`;
  d.open ? null : d.showModal();
}

/** Lance l'action d'origine d'un élément mis de côté (data-act, data-cp, lien) : on le clique hors de la feuille. */
function lancer(i) {
  const b = enAttente[Number(i)];
  if (typeof $sheet != "undefined") $sheet.close();
  if (!b) return;
  const boite = document.getElementById("gReserve") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "gReserve", hidden: true }));
  boite.append(b);
  setTimeout(() => { b.click(); b.remove(); }, 0);
}

/** Puce d'année à la place de la liste « Année » : un toucher ouvre une feuille avec les années. */
function puceAnnee(label) {
  const sel = label.querySelector("select");
  if (!sel || label.dataset.g) return;
  label.dataset.g = "1";
  label.classList.add("g-cache");
  label.insertAdjacentHTML("beforebegin", `<button type="button" class="g-puce g-annee" data-act="gannee" aria-label="Année ${echap(sel.value)}, changer">${echap(sel.value)}${ICONE(BAS, 16)}</button>`);
}
function feuilleAnnee() {
  const sel = document.querySelector("label.yr select");
  const f = typeof $sheetForm != "undefined" ? $sheetForm : null, d = typeof $sheet != "undefined" ? $sheet : null;
  if (!sel || !f || !d) return;
  f.onsubmit = (e) => e.preventDefault();
  f.innerHTML = `<div class="g-ftete"><h2>Année</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ICONE("M18 6L6 18M6 6l12 12")}</button></div>
    <div class="g-puces">${annees([...sel.options].map((o) => o.value)).map((a) => `<button type="button" class="g-puce${String(a) === sel.value ? " on" : ""}" data-act="ganneechoix" data-v="${a}" aria-pressed="${String(a) === sel.value}">${a}</button>`).join("")}</div>`;
  d.showModal();
}
function choisirAnnee(a) {
  if (typeof $sheet != "undefined") $sheet.close();
  const sel = document.querySelector("label.yr select");
  if (!sel || sel.value === String(a)) return;
  sel.value = String(a);
  sel.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Retour dans la barre du haut (téléphone) : une copie du bouton de l'en-tête, à la place du logo (gabarit.css). La
 * copie ne porte pas les classes du retour de l'en-tête (.g-retour, .u-retour), qui reste celui des ordinateurs.
 */
function retourEnHaut(head) {
  const barre = document.querySelector(".shell > .topbar");
  const r = head.querySelector(".g-retour");
  document.body.toggleAttribute("data-g-retour", !!r);
  if (!barre || !r || barre.querySelector(".g-retour-haut")) return;
  const c = r.cloneNode(true);
  c.className = "g-retour-haut";
  barre.prepend(c);
}

/** Ce qui va dans la barre d'outils d'un écran-sujet, dans l'ordre (v5.48). */
export const OUTILS = ["label.yr", ".g-annee", ".subtabs.g-segment", ".er-onglets", ".op-barre", ".op-puces"];

/** Barre d'outils sous les onglets d'un écran-sujet. Idempotent ; sans outil, pas de barre. */
function barreOutils(wrap, head) {
  const onglets = wrap.querySelector(":scope > .g-onglets");
  if (!onglets) return;
  let outils = wrap.querySelector(":scope > .g-outils");
  const elements = OUTILS.flatMap((sel) => [...head.querySelectorAll(sel), ...wrap.querySelectorAll(`:scope > ${sel}`)]);
  if (!elements.length) return;
  if (!outils) {
    outils = Object.assign(document.createElement("div"), { className: "g-outils" });
    onglets.after(outils);
  }
  outils.append(...elements);
  // Le lien « Voir la liste de courses » passe sous la barre : il ne décale plus la recherche.
  wrap.querySelectorAll(":scope > .op-lien").forEach((l) => outils.after(l));
}

/** Habille l'écran affiché selon le gabarit. Idempotent : peut tourner plusieurs fois sur le même écran. */
export function appliquer() {
  if (typeof S == "undefined" || !S?.session || !S.d) return;
  const route = S.route;
  const wrap = document.querySelector(".shell > main .wrap");
  const head = wrap?.querySelector(":scope > .head");
  document.body.dataset.gabarit = FLUX.has(route) ? "flux" : "liste";
  // Saisies pas à pas (v5.50) : elles gardent leur en-tête (« Annuler », étapes), mais le titre est à la même place
  // que sur les autres écrans (il descendait de 14 px, aligné sur le bas du bouton « Annuler »).
  if (head && FLUX.has(route)) head.classList.add("g-tete");
  if (!wrap || !head || FLUX.has(route)) return;

  // 1. Titre : un nom, la phrase en résumé.
  const h1 = head.querySelector("h1"), def = window.Noyau?.ecran?.(route);
  if (h1 && !h1.dataset.g) {
    h1.dataset.g = "1";
    const sous = head.querySelector(".sub");
    const t = titreEtResume(h1.textContent, sous?.textContent, def?.titre);
    if (t.titre !== h1.textContent.trim()) {
      h1.textContent = t.titre;
      if (sous) sous.textContent = t.resume;
      else h1.insertAdjacentHTML("afterend", `<p class="sub">${echap(t.resume)}</p>`);
    }
  }

  // 1 ter (v5.50). Tous les écrans (sauf l'Accueil) : titre et ligne d'état à gauche, ⋯ et flèches à droite, sur la même
  // rangée ; la ligne d'état tient sur une ligne. Le titre est ainsi au même endroit partout.
  if (route !== "dash") head.classList.add("g-tete");

  // 1 bis. Écran-sujet : titre du sujet, onglets sous l'en-tête.
  // v5.48 (maquettes du 16 nov. 2026) : l'en-tête a la même forme et la même hauteur sur chaque onglet (titre, une
  // seule ligne d'état, ⋯ à droite ; ni surtitre ni bandeau foncé), pour que rien ne saute d'un onglet à l'autre.
  let sujet = sujetDe(route);
  // Ruchers sans colonie : l'accueil « Crée ton premier rucher », sans onglets.
  if (sujet?.cle === "ruchers" && !S.d.ruches?.length) sujet = null;
  if (sujet && h1 && !head.dataset.gs) {
    head.dataset.gs = "1";
    h1.textContent = sujet.titre;
    head.classList.remove("hero-head");
    head.classList.add("g-sujet");
    // Titre long (« Registre et déclaration ») : un peu plus petit sur téléphone pour tenir entier à côté de ⋯.
    head.classList.toggle("g-long", sujet.titre.length > TITRE_LONG);
    head.querySelectorAll(".eyebrow").forEach((x) => x.remove());
    let etat = head.querySelector(".sub");
    if (!etat) { h1.insertAdjacentHTML("afterend", `<p class="sub"></p>`); etat = head.querySelector(".sub"); }
    wrap.querySelectorAll(":scope > .subtabs.g-onglets").forEach((x) => x.remove());
    // Onglets que l'écran dessinait lui-même pour le même sujet (Ruchers, Miel) : remplacés par ceux du gabarit.
    const cles = new Set(sujet.onglets.map((o) => o[3] || o[0]));
    wrap.querySelectorAll(".subtabs:not(.g-onglets)").forEach((x) => {
      const v = [...x.querySelectorAll("button[data-v]")].map((b) => b.dataset.v);
      if (v.length && v.every((k) => cles.has(k))) x.remove();
    });
    // Les onglets propres à l'écran (Financier / Opérationnel…) deviennent un choix de vue (segment) : un seul rang d'onglets.
    wrap.querySelectorAll(".subtabs:not(.g-onglets)").forEach((x) => x.classList.add("g-segment"));
    const actif = ongletActif(sujet, route, typeof UX != "undefined" ? UX.ongletMiel?.() : undefined);
    head.insertAdjacentHTML("afterend", `<div class="subtabs g-onglets" role="tablist" aria-label="${echap(sujet.titre)}">${sujet.onglets.map(([r, t, act, v], i) =>
      `<button type="button" role="tab" class="${i === actif ? "on" : ""}" aria-selected="${i === actif}" data-act="${act || "go"}" data-v="${echap(v || r)}">${echap(t)}</button>`).join("")}</div>`);
  }

  // La ligne d'état peut être coupée par « … » : son texte entier reste au survol et pour les lecteurs d'écran.
  head.querySelectorAll(".sub").forEach((x) => { if (!x.title) x.title = x.textContent.trim(); });

  // 2. Retour : un seul, en tête, « ‹ Parent ».
  if (!head.querySelector(".g-retour")) {
    const anciens = [...wrap.querySelectorAll(".u-retour, .er-ariane, .nl-categorie")];
    const r = anciens.find((a) => a.classList.contains("u-retour") && a.dataset.act);
    const cible = retourDe(route, r && { act: r.dataset.act, v: r.dataset.v, k: r.dataset.k, texte: r.textContent });
    anciens.forEach((a) => (a.closest(".er-ariane") || a).remove());
    wrap.querySelectorAll(".n4-rnav").forEach((n) => { if (!n.querySelector("button")) n.remove(); });
    if (cible) {
      (head.firstElementChild || head).insertAdjacentHTML("afterbegin", `<button type="button" class="g-retour u-retour" data-act="${echap(cible.act)}" data-v="${echap(cible.v)}"${cible.k ? ` data-k="${echap(cible.k)}"` : ""}>${ICONE(RETOUR, 18)}<span>${echap(cible.texte)}</span></button>`);
    }
  }
  // 2 bis (v5.50). Sur téléphone, le retour monte dans la barre du haut, à la place du logo : le titre est au même
  // endroit sur tous les écrans. Les flèches « ‹ › » d'une fiche passent à droite du titre, à côté de ⋯.
  retourEnHaut(head);
  const fleches = wrap.querySelector(".n4-rnav .n4-fleches");
  if (fleches) {
    const zoneF = head.querySelector(":scope > .actions") || head.appendChild(Object.assign(document.createElement("div"), { className: "actions" }));
    zoneF.prepend(fleches);
    wrap.querySelectorAll(".n4-rnav").forEach((n) => { if (!n.querySelector("button")) n.remove(); });
  }

  // 3. Puce d'année.
  wrap.querySelectorAll("label.yr").forEach(puceAnnee);

  // 3 bis. Écran-sujet : une barre d'outils juste sous les onglets (v5.48). L'année, le choix de vue (segment), la
  // recherche et les puces de filtre y sont rangés dans cet ordre : ils commencent au même endroit sur chaque onglet.
  if (sujet) barreOutils(wrap, head);

  // 4. Boutons : un principal, le reste dans ⋯.
  if (head.dataset.g) return;
  head.dataset.g = "1";
  const zone = head.querySelector(":scope > .actions") || head.appendChild(Object.assign(document.createElement("div"), { className: "actions" }));
  const boutons = [...zone.children].filter((el) => el.matches("button, a.btn"));
  const tri = trierBoutons(boutons.map((b) => ({ principal: b.matches(".main, .honey"), garder: b.matches(".g-garder, .g-puce"), menu: b.textContent.trim() === "⋯" })));
  const autres = tri.autres.map((i) => boutons[i]);
  // Barres du bas propres à l'écran : un seul bouton, les autres rejoignent ⋯.
  const pied = wrap.querySelector(":scope .op-pied, :scope .n4-rbarre");
  if (pied && !pied.dataset.g) {
    pied.dataset.g = "1";
    pied.classList.add("g-barre");
    const bs = [...pied.querySelectorAll(":scope > button, :scope > a.btn")];
    const p = bs.find((b) => b.matches(".main, .honey")) || bs[bs.length - 1];
    bs.filter((b) => b !== p && !b.matches(".g-plus-bas")).forEach((b) => { autres.push(b); b.remove(); });
    if (p) p.classList.add("main");
    // Ordinateur : la barre du bas laisse place au même bouton (et au « + ») dans l'en-tête, à droite.
    pied.classList.add("g-tel");
    const copies = [p, pied.querySelector(":scope > .g-plus-bas"), pied.querySelector(":scope > .g-autres")].filter(Boolean).map((b) => b.cloneNode(true));
    copies.forEach((c) => { c.classList.add("g-ordi"); if (c.matches(".g-plus-bas")) c.classList.replace("g-plus-bas", "g-plus"); });
    zone.append(...copies);
  }
  if (tri.menu >= 0) boutons[tri.menu].classList.add("g-plus");
  else if (autres.length) {
    autres.forEach((b) => b.remove());
    const garde = autres;
    // Un écran qui a son propre menu ⋯ sur téléphone le marque data-g-menu (Ruchers) : celui du gabarit sert sur ordinateur.
    zone.insertAdjacentHTML("beforeend", `<button type="button" class="g-plus${zone.querySelector("[data-g-menu]") ? " g-ordi" : ""}" data-act="gactions" aria-label="Plus d’actions">${ICONE(PLUS, 24)}</button>`);
    zone.querySelector(".g-plus")._g = garde;
  }
  const principal = tri.principal >= 0 ? boutons[tri.principal] : null;
  if (principal && !pied) {
    principal.classList.add("g-ordi");
    const barre = document.createElement("div");
    barre.className = "g-barre g-tel";
    const copie = principal.cloneNode(true);
    copie.classList.remove("g-ordi", "honey", "sm");
    copie.classList.add("main");
    barre.append(copie);
    wrap.append(barre);
  }
}

if (typeof ACT != "undefined") {
  Object.assign(ACT, {
    gactions: (_v, _k, el) => feuilleActions(document.querySelector(".wrap .head h1")?.textContent || "Actions",
      el?._g || [...(el?.parentElement?.querySelector(":scope > .g-autres")?.children || [])].map((b) => b.cloneNode(true))),
    gchoisir: (i) => lancer(i),
    gannee: () => feuilleAnnee(),
    ganneechoix: (a) => choisirAnnee(a),
  });
}
