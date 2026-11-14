// Apiviz — écran Ruchers : liste des colonies en trois présentations, choisies dans la barre (v5.40, maquettes
// « Réagencement mobile » validées le 14 nov. 2026 : B « liste dense groupée par rucher » et C « alvéoles » ; le
// tableau des v5.37 reste la troisième présentation, par défaut sur ordinateur).
//   - Une seule barre sous les onglets : « Filtrer et trier » (feuille du bas sur téléphone, panneau à gauche sur
//     ordinateur), raccourcis en puces avec leur nombre, choix Liste / Alvéoles / Tableau. Recherche : la loupe de la
//     barre du haut sur téléphone, un champ sur ordinateur.
//   - Liste : une ligne de 54 px par colonie (état, nom, raison ou force et reine, varroa et jours), rangée par rucher
//     sous un en-tête fin (nom, nombre, « Tournée » ou « Visiter », météo en une ligne). Toucher ouvre la fiche.
//   - Alvéoles : une tuile par colonie, couleur de l'état, raison en clair ; même rangement par rucher.
//   - Sélection par appui long (ou ⋯ › Sélectionner) : la barre devient « N sélectionnées · Déplacer · Visite groupée ».
//   - Sur téléphone, le titre laisse la place : Nouveau rucher, Ajouter des ruches, Déplacer, Sélectionner et Exporter
//     passent dans le bouton ⋯ des onglets.
// Règles (lignes, filtres, tri, synthèse, regroupement) : src/domaines/colonies/tableau.js. Les globales d'app.js
// (S, shell, esc, render, ACT, toast, csv, redessiner, UX, MT, N4) ne sont lues qu'à l'appel.
import * as T from "../colonies/tableau.js";
import { MARQUAGES, couleurMarquage } from "../colonies/reines.js";
import { tauxVarroa } from "../sante/regles.js";
import { n, dfr } from "../../noyau/format.js";

const CLE = "apiviz-ruches-presentation"; // v5.40 ; l'ancienne clé (v5.37) ne sert plus qu'aux colonnes
const ANCIENNE = "apiviz-ruches-affichage";
const AFFS = ["liste", "alveoles", "tableau"];
const e = (t) => esc(t);
const plur = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;

const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch { return {}; } };
function garderPrefs() {
  const t = S.tb;
  try { localStorage.setItem(CLE, JSON.stringify({ aff: t.aff, grouper: t.grouper, cols: t.cols, compact: t.compact })); } catch { /* navigation privée */ }
}

/** État de l'affichage (gardé entre deux rendus) ; préférences relues sur l'appareil. */
export function etat() {
  if (!S.tb) {
    const p = { ...lire(ANCIENNE), ...lire(CLE) };
    // Sur ordinateur, la place permet d'afficher aussi Rucher et À faire dès le départ.
    const large = typeof matchMedia == "function" && matchMedia("(min-width:1024px)").matches;
    const cols = Object.fromEntries(T.COLONNES.map((c) => [c.id, typeof p.cols?.[c.id] === "boolean" ? p.cols[c.id] : c.defaut || large]));
    // Présentation : celle choisie sur cet appareil depuis la v5.40 ; sinon la liste sur téléphone, le tableau sur ordinateur.
    const aff = AFFS.includes(lire(CLE).aff) ? lire(CLE).aff : large ? "tableau" : "liste";
    S.tb = { aff, grouper: p.grouper !== false, cols, compact: !!p.compact,
      q: "", f: T.filtresVides(), tri: "niveau", sens: 1, sel: [], choix: false, feuille: null, fiche: null };
  }
  return S.tb;
}

// ---------- Icônes ----------
const svg = (d, t = 18) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const I = {
  liste: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  alveoles: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  tableau: "M4 4h16v16H4zM4 10h16M4 15h16M10 4v16",
  points: "M5 12h.01M12 12h.01M19 12h.01",
  cherche: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  filtres: "M4 6h16M7 12h10M10 18h4",
  colonnes: "M4 4h16v16H4zM10 4v16M15 4v16",
  croix: "M6 6l12 12M18 6L6 18",
  telecharger: "M12 4v11M7 10l5 5 5-5M5 20h14",
};

// ---------- Morceaux ----------
const ton = (niveau) => T.NIVEAUX[niveau].ton;
const pastille = (l) => `<span class="tb-pt bg-${ton(l.niveau)}" aria-hidden="true"></span>`;
const etiquette = (l, court = false) => `<span class="tag ${ton(l.niveau)}">${court && l.niveau === "watch" ? "À voir" : T.NIVEAUX[l.niveau].libelle}</span>`;
const reineHtml = (l) => {
  if (l.orpheline) return '<span class="tb-alerte">Absente</span>';
  if (!l.reine) return '<span class="tb-rien">–</span>';
  const c = MARQUAGES[l.marquage]?.[1] || "";
  return `<span class="tb-reine"><span class="tb-marque" style="background:${e(c || "transparent")}" title="${e(MARQUAGES[l.marquage]?.[0] || "")}" aria-hidden="true"></span>${l.reine}</span>`;
};
const forceHtml = (l) => !l.force ? '<span class="tb-rien">–</span>'
  : `<span class="tb-force" data-n="${T.FORCES.indexOf(l.force) + 1}"><span class="tb-barres" aria-hidden="true"><i></i><i></i><i></i></span>${e(l.force)}</span>`;
const varroaTexte = (l) => (l.varroa !== null ? `${n(l.varroa, 1)} %` : l.varroaBrut !== null ? `${l.varroaBrut} var.` : "–");
const visiteTexte = (l) => (l.jours === null ? "Jamais" : `${l.jours} j`);
const dateCourte = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");

function cellule(id, l) {
  switch (id) {
    case "niveau": return { html: etiquette(l, true) };
    case "force": return { html: forceHtml(l) };
    case "reine": return { html: reineHtml(l) };
    case "varroa": return { html: e(varroaTexte(l)), alerte: l.alertes.varroa, rien: l.varroa === null && l.varroaBrut === null };
    case "provisions": return { html: l.provisions ? e(l.provisions) + (l.poids !== null ? `<span class="tb-plus"> · ${n(l.poids, 1)} kg</span>` : "") : "–", alerte: l.alertes.provisions, rien: !l.provisions };
    case "visite": return { html: e(visiteTexte(l)) + (l.derniere ? `<span class="tb-plus"> · ${dateCourte(l.derniere)}</span>` : ""), alerte: l.alertes.visite };
    case "rucher": return { html: e(l.rucher) };
    case "afaire": return { html: l.raisons.length ? e(l.raisons.map((x) => x.texte).join(" · ")) : "–", rien: !l.raisons.length, ton: l.raisons.length ? ton(l.niveau) : "" };
    default: return { html: "" };
  }
}

function enTete(id, libelle, t) {
  const actif = t.tri === id;
  return `<button type="button" class="tb-tri" data-act="tbtri" data-v="${id}" aria-label="Trier par ${e(libelle.toLowerCase())}">${e(libelle)}<span class="tb-fl ${actif ? "on" : ""}" aria-hidden="true">${actif ? (t.sens === 1 ? "↓" : "↑") : "↕"}</span></button>`;
}

function tableau(ls, cols, t, sel) {
  const tous = ls.length > 0 && ls.every((l) => sel.has(l.id));
  const sortDe = (id) => (t.tri === id ? (t.sens === 1 ? "descending" : "ascending") : "none");
  const tete = `<div class="tb-ligne tb-tete" role="row">
      <div class="tb-c tb-c-nom" role="columnheader" aria-sort="${sortDe("nom")}"><input type="checkbox" class="tb-coche" data-act="tbtout" aria-label="Tout sélectionner" ${tous ? "checked" : ""}>${enTete("nom", "Colonie", t)}</div>
      ${cols.map((c) => `<div class="tb-c tb-c-${c.id}" role="columnheader" aria-sort="${sortDe(c.id)}">${enTete(c.id, c.libelle, t)}</div>`).join("")}
      <div class="tb-c tb-fin" aria-hidden="true"></div></div>`;
  const lignes = ls.map((l) => {
    const coche = sel.has(l.id);
    return `<div class="tb-ligne${coche ? " coche" : ""}${t.fiche === l.id ? " ouverte" : ""}" role="row">
      <div class="tb-c tb-c-nom" role="rowheader"><input type="checkbox" class="tb-coche" data-act="tbcoche" data-v="${e(l.id)}" aria-label="Sélectionner ${e(l.nom)}" ${coche ? "checked" : ""}>
        <button type="button" class="tb-nom" data-act="tbouvrir" data-v="${e(l.id)}">${pastille(l)}<span class="tb-nom-t"><b>${e(l.nom)}</b><span class="tb-sous">${e([l.code, l.rucher].filter(Boolean).join(" · "))}</span></span><span class="tb-code">${e(l.code)}</span></button></div>
      ${cols.map((c) => { const x = cellule(c.id, l); return `<div class="tb-c tb-c-${c.id}${x.alerte ? " alerte" : ""}${x.rien ? " rien" : ""}${x.ton ? " t-" + x.ton : ""}" role="cell">${x.html}</div>`; }).join("")}
      <div class="tb-c tb-fin" aria-hidden="true"></div></div>`;
  }).join("");
  const s = T.synthese(ls);
  const synth = ls.length ? `<div class="tb-ligne tb-synthese" role="row">
      <div class="tb-c tb-c-nom" role="rowheader"><b>Synthèse</b><span>${plur(ls.length, "colonie")}</span></div>
      ${cols.map((c) => `<div class="tb-c tb-c-${c.id}" role="cell">${e(s[c.id])}</div>`).join("")}
      <div class="tb-c tb-fin" aria-hidden="true"></div></div>` : "";
  const vide = ls.length ? "" : `<div class="tb-vide"><p>Aucune colonie ne correspond à ces filtres.</p><button type="button" class="btn" data-act="tbeffacer">Effacer les filtres</button></div>`;
  return `<div class="tb-boite" tabindex="0" aria-label="Tableau des colonies : fais défiler pour voir toutes les colonnes">
    <div class="tb-table" role="table" aria-label="Colonies" aria-rowcount="${ls.length + 1}">${tete}${lignes}${vide}
      <div class="tb-reste" aria-hidden="true"><div class="tb-c tb-c-nom"></div></div>${synth}</div></div>`;
}

// Raccourcis de la barre : « Toutes », puis jusqu'à trois alertes (À voir d'abord). Une puce active se retire d'un
// toucher ; les filtres de la feuille restent.
const RACCOURCIS = [
  ["avoir", "À voir", (l) => l.niveau !== "ok"], ["varroa", "Varroa", (l) => l.alertes.varroa], ["absente", "Sans reine", (l) => l.orpheline],
  ["visite", `Sans visite ${T.JOURS_SANS_VISITE} j`, (l) => l.alertes.visite], ["provisions", "Provisions faibles", (l) => l.alertes.provisions],
];
const raccourciActif = (f, k) => (k === "avoir" ? f.niveaux.length === 2 && f.niveaux.includes("urg") && f.niveaux.includes("watch")
  : k === "absente" ? f.reines.includes("absente") : !!f[k]);
function puces(t, toutes) {
  const nf = T.nbFiltres(t.f);
  const choix = RACCOURCIS.map(([k, lib, fn]) => [k, lib, toutes.filter(fn).length]).filter(([k, , n]) => n || raccourciActif(t.f, k));
  const garde = [...choix.filter(([k]) => raccourciActif(t.f, k)), ...choix.filter(([k]) => !raccourciActif(t.f, k))].slice(0, 3);
  const p = (act, v, lib, n, on) => `<button type="button" class="tb-puce${on ? " on" : ""}" data-act="${act}" data-v="${v}" aria-pressed="${on}">${e(lib)}<span>${n}</span></button>`;
  return p("tbeffacer", "", "Toutes", toutes.length, !nf && !t.q) + garde.map(([k, lib, n]) => p("tbsugg", k, lib, n, raccourciActif(t.f, k))).join("");
}

// ---------- Liste (B) et alvéoles (C) ----------
const hex = (l) => `<span class="tb-hex bg-${ton(l.niveau)}" aria-hidden="true">${l.niveau === "urg" ? "!" : l.niveau === "watch" ? "•" : ""}</span>`;
const rondSel = (on) => `<span class="tb-rond-sel${on ? " on" : ""}" aria-hidden="true">${on ? svg("M5 12l5 5 9-10", 14) : ""}</span>`;
function sousLigne(l) {
  const kg = l.poids !== null ? ` · <span class="al-kg">${e(n(l.poids, 1))} kg</span>` : "";
  if (l.raisons.length) return `<span class="t-${ton(l.niveau)}">${e(l.raisons[0].texte)}</span>${kg}`;
  const bouts = [l.force, l.orpheline ? "" : l.reine ? `reine ${l.reine}` : "", l.jours === null ? "jamais visitée" : ""].filter(Boolean);
  return e(bouts.join(" · ") || "en bon état") + kg;
}
function ligneListe(l, sel, choix) {
  const on = sel.has(l.id);
  const fin = choix ? "" : `<span class="tb-l-fin"><span class="${l.alertes.varroa ? "tb-alerte" : ""}">${e(varroaTexte(l))}</span><span class="${l.alertes.visite ? "tb-alerte" : ""}">${e(visiteTexte(l))}</span></span>`;
  return `<button type="button" class="n4-ruche tb-l tb-cible${on ? " coche" : ""}" data-act="ruche" data-v="${e(l.id)}" data-id="${e(l.id)}"${choix ? ` aria-pressed="${on}"` : ""}>
    ${choix ? rondSel(on) : hex(l)}<span class="tb-l-t"><b>${e(l.nom)}${l.code ? ` <span class="tb-l-code">${e(l.code)}</span>` : ""}</b><span class="tb-l-s">${sousLigne(l)}</span></span>${fin}</button>`;
}
function tuile(l, sel, choix) {
  const on = sel.has(l.id);
  return `<button type="button" class="tb-tuile tb-cible t-${ton(l.niveau)}${on ? " coche" : ""}" data-act="ruche" data-v="${e(l.id)}" data-id="${e(l.id)}"${choix ? ` aria-pressed="${on}"` : ""}
    aria-label="${e(`${l.nom}${l.code ? " " + l.code : ""}, ${T.NIVEAUX[l.niveau].libelle}, ${T.court(l)}`)}">${choix ? rondSel(on) : ""}<b>${e(l.code || l.nom)}</b><span class="tb-tuile-n">${e(l.code ? l.nom : "")}</span><span class="tb-tuile-r">${e(T.court(l))}</span></button>`;
}
// En-tête d'un rucher : nom (vers la fiche du rucher), nombre et « à voir », action du rucher, météo en une ligne.
function enteteRucher(g, nbVus) {
  const rs = g.lieu?.rs || [], k = g.cle;
  const avoir = g.lignes.filter((l) => l.niveau !== "ok").length;
  const action = !k ? "" : rs.length > 1 ? `<button type="button" class="btn sm main" data-act="v3tournee" data-v="${e(k)}">Tournée</button>`
    : rs.length ? `<button type="button" class="btn sm main" data-act="newvisite" data-v="${e(rs[0].id)}">Visiter</button>`
    : `<button type="button" class="btn sm" data-act="rcajouter" data-v="${e(k)}">Ajouter des ruches ici</button>`;
  const nb = rs.length ? (nbVus < rs.length ? `${nbVus} sur ${rs.length}` : plur(rs.length, "colonie")) : "aucune colonie pour l’instant";
  return `<div class="tb-gr-t">${k ? `<button type="button" class="tb-gr-nom" data-act="alrucher" data-v="${e(k)}">${e(g.nom)}</button>` : `<span class="tb-gr-nom">${e(g.nom)}</span>`}
      <span class="tb-gr-nb">${nb}${avoir ? ` · <b>${avoir} à voir</b>` : ""}</span>${action}</div>
    ${k ? `<div class="tb-gr-m mt-ligne" data-k="${e(k)}">${typeof MT != "undefined" ? MT.ligne(k, rs) : ""}</div>` : ""}`;
}
function groupes(t, vues) {
  if (!t.grouper) return [{ cle: null, nom: "", lignes: vues }];
  const ruchers = UX.lieux().map((l) => ({ cle: l.cle, nom: l.nom, ids: l.rs.map((r) => r.id), lieu: l }));
  return T.grouper(vues, ruchers, { garderVides: !T.nbFiltres(t.f) && !t.q });
}
function listeOuAlveoles(t, vues, sel) {
  const choix = t.choix || sel.size > 0;
  if (!vues.length) return `<div class="tb-vide tb-vide-liste"><p>Aucune colonie ne correspond à ces filtres.</p><button type="button" class="btn" data-act="tbeffacer">Effacer les filtres</button></div>`;
  const corps = (ls) => t.aff === "alveoles" ? `<div class="tb-grille">${ls.map((l) => tuile(l, sel, choix)).join("")}</div>`
    : `<div class="tb-liste">${ls.map((l) => ligneListe(l, sel, choix)).join("")}</div>`;
  return groupes(t, vues).map((g) => g.cle === null ? corps(g.lignes)
    : `<section class="tb-gr" data-k="${e(g.cle)}" aria-label="${e(g.nom)}">${enteteRucher(g, g.lignes.length)}${g.lignes.length ? corps(g.lignes) : ""}</section>`).join("");
}

// Menu ⋯ (téléphone) : les boutons du titre, la sélection et l'export.
function menu(t) {
  if (t.feuille !== "menu") return "";
  const b = (act, v, lib) => `<button type="button" class="btn tb-menu-b" data-act="${act}"${v !== null ? ` data-v="${e(v)}"` : ""}>${lib}</button>`;
  return `<section class="tb-menu" role="dialog" aria-modal="true" aria-label="Plus d’actions">
    ${b("rcnouveau", null, "Nouveau rucher")}${b("newruches", null, "Ajouter des ruches")}${typeof ACT.dpouvrir == "function" ? b("dpouvrir", "", "Déplacer des colonies") : ""}
    ${b("tbchoix", null, "Sélectionner des colonies")}<button type="button" class="tb-menu-b tb-menu-lien" data-act="tbexport">Exporter (tableur)</button>
  </section>`;
}

function filtres(t, toutes, nbVus) {
  const o = T.options(toutes), f = t.f;
  const opt = (act, k, x, on, extra = "") => `<button type="button" class="tb-opt${on ? " on" : ""}" data-act="${act}" data-k="${k}" data-v="${e(x.v)}" aria-pressed="${on}"><span class="tb-case" aria-hidden="true"></span>${extra}<span class="tb-opt-t">${e(x.libelle)}</span>${x.n !== "" ? `<span class="tb-opt-n">${x.n}</span>` : ""}</button>`;
  const groupe = (titre, html) => `<fieldset class="tb-groupe"><legend>${titre}</legend><div class="tb-opts">${html}</div></fieldset>`;
  const marque = (k) => /^\d+$/.test(k) ? `<span class="tb-marque" style="background:${MARQUAGES[couleurMarquage(Number(k))]?.[1] || "transparent"}" aria-hidden="true"></span>` : k === "absente" ? '<span class="tb-marque vide" aria-hidden="true"></span>' : "";
  const TRIS = [["niveau", "Urgence"], ["nom", "Nom"], ["varroa", "Varroa"], ["visite", "Dernière visite"], ["provisions", "Provisions"], ["force", "Force"]];
  const tri = TRIS.map(([k, lib]) => `<button type="button" class="tb-opt tb-opt-tri${t.tri === k ? " on" : ""}" data-act="tbtri" data-v="${k}" aria-pressed="${t.tri === k}"><span class="tb-rond" aria-hidden="true"></span><span class="tb-opt-t">${lib}</span>${t.tri === k ? `<span class="tb-opt-n" aria-label="${t.sens === 1 ? "ce qui demande de l’attention d’abord" : "ordre inversé"}">${t.sens === 1 ? "↓" : "↑"}</span>` : ""}</button>`).join("");
  const inter = (act, lib, aide, on) => `<button type="button" class="tb-inter${on ? " on" : ""}" role="switch" aria-checked="${on}" data-act="${act}"><span class="tb-opt-t">${lib}<span class="small">${aide}</span></span><span class="tb-case" aria-hidden="true"></span></button>`;
  const colonnesTel = t.aff === "tableau" ? `<details class="tb-plie tb-tel"><summary>Colonnes du tableau<span class="small">${T.COLONNES.filter((c) => t.cols[c.id]).length} affichées</span></summary>
      <div class="tb-opts">${T.COLONNES.map((c) => opt("tbcol", "", { v: c.id, libelle: c.libelle, n: "" }, !!t.cols[c.id])).join("")}</div>${inter("tbcompact", "Lignes compactes", "Plus de colonies à l’écran", t.compact)}</details>` : "";
  return `<section class="tb-filtres${t.feuille === "filtres" ? " ouverte" : ""}" aria-label="Filtrer et trier" ${t.feuille === "filtres" ? 'role="dialog" aria-modal="true"' : ""}>
    <div class="tb-feuille-t"><h2>Filtrer et trier</h2><button type="button" class="link" data-act="tbeffacer">Tout effacer</button></div>
    ${groupe("Trier par", tri)}
    ${o.ruchers.length > 1 ? groupe("Rucher", o.ruchers.map((x) => opt("tbfiltre", "ruchers", x, f.ruchers.includes(x.v))).join("")) : ""}
    ${groupe("État", o.niveaux.map((x) => opt("tbfiltre", "niveaux", x, f.niveaux.includes(x.v), `<span class="tb-pt bg-${T.NIVEAUX[x.v].ton}" aria-hidden="true"></span>`)).join(""))}
    ${groupe("Seuils d’alerte", o.seuils.map((x) => opt("tbseuil", "", x, !!f[x.v])).join(""))}
    <details class="tb-plie"${f.reines.length ? " open" : ""}><summary>Reine<span class="small">${f.reines.length ? f.reines.map(T.libelleReine).join(", ") : "Toutes"}</span></summary>
      <div class="tb-opts">${o.reines.map((x) => opt("tbfiltre", "reines", x, f.reines.includes(x.v), marque(x.v))).join("")}</div></details>
    ${t.aff !== "tableau" ? inter("tbgrouper", "Grouper par rucher", "Un en-tête par rucher, avec la tournée et la météo", t.grouper) : ""}
    ${colonnesTel}
    <button type="button" class="btn honey block tb-voir" data-act="tbfermer">Voir ${plur(nbVus, "colonie")}</button>
  </section>`;
}

function colonnes(t) {
  if (t.feuille !== "colonnes") return "";
  const ligne = (act, v, lib, aide, on) => `<button type="button" class="tb-opt${on ? " on" : ""}" role="switch" aria-checked="${on}" data-act="${act}" data-v="${v}"><span class="tb-case" aria-hidden="true"></span><span class="tb-opt-t">${e(lib)}<span class="small">${e(aide)}</span></span></button>`;
  return `<section class="tb-colonnes" role="dialog" aria-modal="true" aria-label="Colonnes">
    <div class="tb-feuille-t"><h2>Colonnes</h2><button type="button" class="link" data-act="tbfermer">Terminé</button></div>
    <p class="small">La colonne Colonie reste toujours affichée.</p>
    <div class="tb-opts">${T.COLONNES.map((c) => ligne("tbcol", c.id, c.libelle, c.aide, !!t.cols[c.id])).join("")}
    ${ligne("tbcompact", "", "Lignes compactes", "Plus de colonies à l’écran", t.compact)}</div>
  </section>`;
}

function fiche(t, toutes) {
  const l = t.fiche && toutes.find((x) => x.id === t.fiche);
  if (!l) return "";
  const m = (lib, html, alerte) => `<div class="tb-mesure${alerte ? " alerte" : ""}"><span>${lib}</span><b>${html}</b></div>`;
  const resume = (v) => [v.activite ? `activité ${v.activite.toLowerCase()}` : "", v.provisions ? `provisions ${v.provisions.toLowerCase()}` : "",
    v.varroa != null ? (tauxVarroa(v) !== null ? `varroa ${n(tauxVarroa(v), 1)} %` : `${v.varroa} varroas`) : "", v.note || ""].filter(Boolean).join(" · ");
  return `<aside class="tb-fiche" role="dialog" aria-modal="true" aria-labelledby="tb_fiche_t">
    <div class="tb-fiche-t"><div><p class="small">${e([l.rucher, l.code].filter(Boolean).join(" · "))}</p><h2 id="tb_fiche_t">${e(l.nom)}</h2></div>
      ${etiquette(l)}<button type="button" class="tb-x" data-act="tbfermer" aria-label="Fermer la fiche">${svg(I.croix)}</button></div>
    ${l.raisons.length ? `<ul class="tb-raisons">${l.raisons.map((x) => `<li class="t-${ton(x.niveau)}">${e(x.texte)}</li>`).join("")}</ul>` : ""}
    <div class="tb-mesures tb-mesures-3">${m("Force", e(l.force || "–"))}${m("Reine", l.orpheline ? "Absente" : l.reine ? reineHtml(l) : "Non notée", l.orpheline)}${m("Varroa", e(varroaTexte(l)), l.alertes.varroa)}
      ${m("Provisions", e(l.provisions || "–") + (l.poids !== null ? ` · ${n(l.poids, 1)} kg` : ""), l.alertes.provisions)}${m("Dernière visite", l.derniere ? e(dfr(l.derniere)) : "Jamais", l.alertes.visite)}${m("Rucher", e(l.rucher))}</div>
    <h3 class="tb-fiche-s">Dernières visites</h3>
    ${l.visites.length ? `<ul class="tb-histo">${l.visites.map((v) => `<li><b>${e(dfr(v.date_visite))}</b><span>${e(resume(v) || "Visite notée")}</span></li>`).join("")}</ul>` : '<p class="small">Pas encore de visite.</p>'}
    <div class="tb-fiche-b"><button type="button" class="btn honey" data-act="newvisite" data-v="${e(l.id)}">Commencer la visite</button><button type="button" class="btn" data-act="ruche" data-v="${e(l.id)}">Fiche complète</button></div>
  </aside>`;
}

// ---------- Écran ----------
let calculs = null;
function calculer() {
  const t = etat();
  const toutes = T.lignes(S.d, { seuil: UX.seuilVarroa(), aujourdhui: new Date() });
  const vues = T.trier(T.filtrer(toutes, t.f, t.q), t.tri, t.sens);
  calculs = { toutes, vues };
  return calculs;
}

/** L'écran Ruchers (liste, alvéoles ou tableau). */
export function ecran() {
  const t = etat();
  const { toutes, vues } = calculer();
  const ids = new Set(vues.map((l) => l.id));
  t.sel = t.sel.filter((id) => toutes.some((l) => l.id === id));
  const sel = new Set(t.sel.filter((id) => ids.has(id)));
  const cols = T.COLONNES.filter((c) => t.cols[c.id]);
  const nf = T.nbFiltres(t.f) - (raccourciActif(t.f, "avoir") ? 1 : 0); // « À voir » (urgent + à surveiller) compte pour un
  const nbR = UX.lieux().filter((l) => l.cle).length;
  const sous = vues.length === toutes.length ? `${plur(toutes.length, "colonie")} · ${plur(nbR, "rucher")}` : `${vues.length} sur ${plur(toutes.length, "colonie")}`;
  const aff = (k, lib, ic) => `<button type="button" data-act="tbaff" data-v="${k}" aria-pressed="${t.aff === k}" aria-label="${lib}" title="${lib}" class="${t.aff === k ? "on" : ""}">${svg(ic)}</button>`;
  const enSelection = t.choix || sel.size > 0;
  const barre = enSelection ? `<div class="tb-barre tb-selection" role="region" aria-label="Sélection">
      <button type="button" class="tb-x" data-act="tbvider" aria-label="Quitter la sélection">${svg(I.croix)}</button>
      <span class="tb-sel-t">${sel.size ? `${sel.size} ${sel.size > 1 ? "sélectionnées" : "sélectionnée"}` : "Touche les colonies"}</span>
      ${sel.size ? `<button type="button" class="btn" data-act="tbdeplacer">Déplacer</button><button type="button" class="btn honey" data-act="tbvisite">${sel.size > 1 ? "Visite groupée" : "Visiter"}</button>` : ""}</div>`
    : `<div class="tb-barre">
      <button type="button" class="tb-bouton tb-bfiltres" data-act="tbfeuille" data-v="filtres" aria-haspopup="dialog" aria-label="Filtrer et trier${nf ? ` (${nf} filtre${nf > 1 ? "s" : ""})` : ""}">${svg(I.filtres)}${nf ? `<span class="tb-nb">${nf}</span>` : ""}</button>
      <label class="tb-cherche tb-ordi">${svg(I.cherche)}<span class="tb-cache">Chercher une colonie</span><input id="tb_q" type="search" value="${e(t.q)}" placeholder="Nom ou code…" autocomplete="off" enterkeyhint="search"></label>
      <div class="tb-puces" role="group" aria-label="Raccourcis">${puces(t, toutes)}</div>
      ${t.aff === "tableau" ? `<div class="tb-ancre tb-ordi"><button type="button" class="tb-bouton" data-act="tbfeuille" data-v="colonnes" aria-haspopup="dialog" aria-expanded="${t.feuille === "colonnes"}">${svg(I.colonnes)}<span>Colonnes</span></button>${colonnes(t)}</div>
        <button type="button" class="tb-bouton tb-ordi" data-act="tbcompact" aria-pressed="${t.compact}">Compact</button>` : ""}
      <button type="button" class="tb-bouton tb-ordi" data-act="tbexport">${svg(I.telecharger)}<span>Exporter</span></button>
      <div class="tb-aff" role="group" aria-label="Présentation">${aff("liste", "Liste", I.liste)}${aff("alveoles", "Alvéoles", I.alveoles)}${aff("tableau", "Tableau", I.tableau)}</div>
    </div>`;
  const voile = t.feuille || t.fiche ? `<button type="button" class="tb-voile${t.feuille === "colonnes" ? " leger" : ""}${t.fiche ? " pour-fiche" : ""}" data-act="tbfermer" aria-label="Fermer" tabindex="-1"></button>` : "";
  const entete = '<button class="btn" data-act="rcnouveau">Nouveau rucher</button><button class="btn" data-act="newruches">Ajouter des ruches</button>'
    + (typeof ACT.dpouvrir == "function" ? '<button class="btn" data-act="dpouvrir" data-v="">Déplacer</button>' : "");
  const principal = t.aff === "tableau" ? tableau(vues, cols, t, sel) : listeOuAlveoles(t, vues, sel) + (typeof N4 != "undefined" && N4.basRuchers ? N4.basRuchers() : "");
  shell("Ruchers", sous, entete, `<div class="tb${t.compact ? " compact" : ""}${enSelection ? " avec-sel" : ""}" data-aff="${t.aff}">
      ${barre}
      <div class="tb-corps">
        ${filtres(t, toutes, vues.length)}
        <div class="tb-principal">${principal}</div>
      </div>
      ${voile}${fiche(t, toutes)}${menu(t)}
    </div>`);
  // Téléphone : bouton ⋯ dans la rangée des onglets (le titre et ses boutons sont masqués).
  document.querySelector(".wrap > .subtabs")?.insertAdjacentHTML("beforeend",
    `<button type="button" class="tb-plus" data-act="tbfeuille" data-v="menu" aria-haspopup="dialog" aria-expanded="${t.feuille === "menu"}" aria-label="Plus d’actions">${svg(I.points, 22)}</button>`);
  apresRendu();
}

// Hauteur du tableau : jusqu'en bas de l'écran (au-dessus de la barre du bas et de la barre de sélection), pour que
// l'en-tête et la synthèse restent visibles et que seul le tableau défile.
function ajuster() {
  const b = document.querySelector(".tb-boite");
  if (!b) return;
  // Barres fixées en bas (barre du bas du téléphone, barre de sélection) : le tableau s'arrête au-dessus.
  let limite = window.innerHeight;
  for (const x of document.querySelectorAll(".bottom, .tb-selection")) {
    const st = getComputedStyle(x);
    if (st.position === "fixed" && st.display !== "none" && st.visibility !== "hidden") limite = Math.min(limite, x.getBoundingClientRect().top);
  }
  const haut = b.getBoundingClientRect().top + window.scrollY;
  b.style.height = Math.max(220, limite - haut - 12) + "px";
}
addEventListener("resize", () => { if (typeof S != "undefined" && S.route === "ruches" && S.tb?.aff === "tableau") ajuster(); });

// Sélection par appui long (liste, alvéoles) ; en sélection, un toucher coche ou décoche au lieu d'ouvrir la fiche.
let appui = null, ignorerClic = false;
const cibleSel = (ev) => (typeof S != "undefined" && S.route === "ruches" && S.tb && !document.documentElement.classList.contains("lecteur")
  ? ev.target.closest?.(".tb-cible") : null);
function cocher(id) { const t = etat(); t.sel = basculer(t.sel, id); if (!t.sel.length) t.choix = false; render(); }
const finAppui = () => { if (appui) { clearTimeout(appui.minuterie); appui = null; } };
addEventListener("pointerdown", (ev) => {
  ignorerClic = false; // le clic qui suit un appui long n'arrive pas toujours (ligne redessinée sous le doigt)
  const c = cibleSel(ev);
  if (!c || ev.button > 0) return;
  appui = { x: ev.clientX, y: ev.clientY, minuterie: setTimeout(() => { appui = null; ignorerClic = true; navigator.vibrate?.(15); etat().choix = true; cocher(c.dataset.id); }, 450) };
});
addEventListener("pointermove", (ev) => { if (appui && Math.hypot(ev.clientX - appui.x, ev.clientY - appui.y) > 10) finAppui(); });
addEventListener("pointerup", finAppui);
addEventListener("pointercancel", finAppui);
addEventListener("contextmenu", (ev) => { if (cibleSel(ev)) ev.preventDefault(); });
addEventListener("click", (ev) => {
  const c = cibleSel(ev);
  if (!c) return;
  const t = etat();
  if (ignorerClic) { ignorerClic = false; ev.preventDefault(); ev.stopImmediatePropagation(); return; }
  if (t.choix || t.sel.length) { ev.preventDefault(); ev.stopImmediatePropagation(); cocher(c.dataset.id); }
}, true);

addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape" || typeof S == "undefined" || S.route !== "ruches" || !S.tb || !(S.tb.feuille || S.tb.fiche)) return;
  ev.preventDefault(); fermer();
});

let minuterie = 0;
function apresRendu() {
  ajuster();
  const t = etat();
  const q = document.getElementById("tb_q");
  q?.addEventListener("input", () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      const pos = q.selectionStart;
      t.q = q.value; render();
      const q2 = document.getElementById("tb_q");
      if (q2) { q2.focus({ preventScroll: true }); try { q2.setSelectionRange(pos, pos); } catch { /* type search */ } }
    }, 180);
  });
  // Feuille ou fiche ouverte : le focus y va (clavier, lecteur d'écran).
  if (t.fiche) document.querySelector(".tb-fiche .tb-x")?.focus({ preventScroll: true });
  else if (t.feuille === "filtres") document.querySelector(".tb-filtres.ouverte .tb-opt")?.focus({ preventScroll: true });
  else if (t.feuille === "colonnes") document.querySelector(".tb-colonnes .tb-opt")?.focus({ preventScroll: true });
  else if (t.feuille === "menu") document.querySelector(".tb-menu .btn")?.focus({ preventScroll: true });
}

function fermer() {
  const t = etat(), avant = t.fiche;
  const fm = t.feuille === "menu" ? ".tb-plus" : t.feuille === "filtres" ? ".tb-bfiltres" : t.feuille === "colonnes" ? '[data-act="tbfeuille"][data-v="colonnes"]' : null;
  t.feuille = null; t.fiche = null; render();
  if (avant) document.querySelector(`.tb-nom[data-v="${CSS.escape(avant)}"]`)?.focus({ preventScroll: true });
  else if (fm) document.querySelector(fm)?.focus({ preventScroll: true });
}
const basculer = (l, v) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
const idsVus = () => { const t = etat(), vus = new Set((calculs || calculer()).vues.map((l) => l.id)); return t.sel.filter((id) => vus.has(id)); };

/** Actions de l'affichage « Tableau » (consultation, permises au lecteur, sauf sélection et actions groupées). */
export const actions = {
  tbaff: (v) => { const t = etat(); if (!AFFS.includes(v)) return; t.aff = v; t.feuille = t.fiche = null; garderPrefs(); render(); },
  tbgrouper: () => { const t = etat(); t.grouper = !t.grouper; garderPrefs(); render(); },
  tbfeuille: (v) => { const t = etat(); t.feuille = t.feuille === v ? null : v; t.fiche = null; render(); },
  tbfermer: () => fermer(),
  tbfiltre: (v, k) => { const t = etat(); if (!["ruchers", "niveaux", "reines"].includes(k)) return; t.f = { ...t.f, [k]: basculer(t.f[k], v) }; render(); },
  tbseuil: (v) => { const t = etat(); if (!["varroa", "provisions", "visite"].includes(v)) return; t.f = { ...t.f, [v]: !t.f[v] }; render(); },
  tbsugg: (v) => {
    const t = etat(), f = { ...t.f }, on = raccourciActif(f, v);
    if (v === "avoir") f.niveaux = on ? [] : ["urg", "watch"];
    else if (v === "absente") f.reines = on ? f.reines.filter((x) => x !== "absente") : [...f.reines, "absente"];
    else if (["varroa", "provisions", "visite"].includes(v)) f[v] = !on;
    t.f = f; render();
  },
  tbeffacer: () => { const t = etat(); t.f = T.filtresVides(); t.q = ""; render(); },
  tbcol: (v) => { const t = etat(); if (!(v in t.cols)) return; t.cols = { ...t.cols, [v]: !t.cols[v] }; garderPrefs(); render(); },
  tbcompact: () => { const t = etat(); t.compact = !t.compact; garderPrefs(); render(); },
  tbtri: (v) => { const t = etat(); t.sens = t.tri === v ? -t.sens : 1; t.tri = v; render(); },
  tbouvrir: (id) => { const t = etat(); t.fiche = id; t.feuille = null; render(); },
  tbexport: () => {
    const { entetes, lignes } = T.exporter((calculs || calculer()).vues);
    csv("colonies", entetes, lignes); toast("Fichier préparé");
  },
  // Sélection et actions groupées (saisie : pas pour le lecteur).
  tbcoche: (id) => { const t = etat(); t.sel = basculer(t.sel, id); render(); },
  tbtout: () => {
    const t = etat(), vus = (calculs || calculer()).vues.map((l) => l.id), tous = vus.length && vus.every((id) => t.sel.includes(id));
    t.sel = tous ? t.sel.filter((id) => !vus.includes(id)) : [...new Set([...t.sel, ...vus])]; render();
  },
  tbvider: () => { const t = etat(); t.sel = []; t.choix = false; render(); },
  tbchoix: () => { const t = etat(); t.choix = true; t.feuille = null; if (t.aff === "tableau") t.aff = "liste"; render(); },
  tbvisite: () => {
    const ids = idsVus();
    if (!ids.length) return;
    etat().sel = []; etat().choix = false;
    ACT.newvisite(ids[0]);
    if (ids.length > 1 && S.visite) { S.visite.multi = true; S.visite.ruches = [...ids]; S.visite.ruche_id = ids[0]; redessiner("visite"); }
  },
  tbdeplacer: () => {
    const ids = idsVus();
    if (!ids.length) return;
    etat().sel = []; etat().choix = false;
    ACT.dpouvrir("");
    if (S.dp) { S.dp.sel = [...ids]; render(); }
  },
};
