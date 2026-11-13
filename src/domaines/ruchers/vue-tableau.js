// Apiviz — écran Ruchers, affichage « Tableau » (v5.37, maquettes « Affichage des ruches » validées le 13 nov. 2026,
// pistes 5 et 6). Bascule « Par rucher / Tableau » en haut de l'écran Ruchers ; le choix est gardé sur l'appareil.
//   - Téléphone : recherche, bouton Filtres (feuille du bas), filtres actifs en puces, colonnes au choix, tri par
//     en-tête, colonne Colonie et en-tête fixes, synthèse fixée en bas, cases à cocher et barre d'actions groupées,
//     fiche rapide (feuille du bas), affichage en cartes avec les mêmes filtres.
//   - Ordinateur (1 024 px et plus) : filtres toujours visibles à gauche, menu Colonnes, Compact, Exporter, fiche
//     rapide à droite.
// Règles (lignes, filtres, tri, synthèse) : src/domaines/colonies/tableau.js. Les globales d'app.js (S, shell, esc,
// render, go, ACT, toast, csv, redessiner, UX) ne sont lues qu'à l'appel.
import * as T from "../colonies/tableau.js";
import { MARQUAGES, couleurMarquage } from "../colonies/reines.js";
import { tauxVarroa } from "../sante/regles.js";
import { n, dfr } from "../../noyau/format.js";

const CLE = "apiviz-ruches-affichage";
const e = (t) => esc(t);
const plur = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;

function lirePrefs() { try { return JSON.parse(localStorage.getItem(CLE) || "{}") || {}; } catch { return {}; } }
function garderPrefs() {
  const t = S.tb;
  try { localStorage.setItem(CLE, JSON.stringify({ vue: t.vue, aff: t.aff, cols: t.cols, compact: t.compact })); } catch { /* navigation privée */ }
}

/** État de l'affichage (gardé entre deux rendus) ; préférences relues sur l'appareil. */
export function etat() {
  if (!S.tb) {
    const p = lirePrefs();
    // Sur ordinateur, la place permet d'afficher aussi Rucher et À faire dès le départ.
    const large = typeof matchMedia == "function" && matchMedia("(min-width:1024px)").matches;
    const cols = Object.fromEntries(T.COLONNES.map((c) => [c.id, typeof p.cols?.[c.id] === "boolean" ? p.cols[c.id] : c.defaut || large]));
    S.tb = { vue: p.vue === "tableau" ? "tableau" : "rucher", aff: p.aff === "cartes" ? "cartes" : "tableau", cols, compact: !!p.compact,
      q: "", f: T.filtresVides(), tri: "niveau", sens: 1, sel: [], feuille: null, fiche: null };
  }
  return S.tb;
}
export const vueTableau = () => etat().vue === "tableau";

// ---------- Icônes ----------
const svg = (d, t = 18) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const I = {
  rucher: "M12 2l8.5 5v10L12 22l-8.5-5V7z",
  tableau: "M4 4h16v16H4zM4 10h16M4 15h16M10 4v16",
  cartes: "M4 4h16v7H4zM4 14h16v6H4z",
  cherche: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  filtres: "M4 6h16M7 12h10M10 18h4",
  colonnes: "M4 4h16v16H4zM10 4v16M15 4v16",
  croix: "M6 6l12 12M18 6L6 18",
  telecharger: "M12 4v11M7 10l5 5 5-5M5 20h14",
};

/** Bascule « Par rucher / Tableau », posée en haut de l'écran Ruchers dans les deux affichages. */
export function bascule() {
  const v = etat().vue;
  const b = (k, t, ic) => `<button type="button" data-act="tbvue" data-v="${k}" aria-pressed="${v === k}" class="${v === k ? "on" : ""}">${svg(ic, 16)}<span>${t}</span></button>`;
  return `<div class="tb-vues" role="group" aria-label="Affichage des ruches">${b("rucher", "Par rucher", I.rucher)}${b("tableau", "Tableau", I.tableau)}</div>`;
}
/** Ajoute la bascule à l'affichage « Par rucher » (nav4.js), après les onglets s'il y en a. */
export function poserBascule() {
  if (!S.d?.ruches?.length) return;
  const wrap = document.querySelector(".wrap");
  const apres = wrap?.querySelector(":scope > .subtabs") || wrap?.querySelector(":scope > .head");
  apres?.insertAdjacentHTML("afterend", bascule());
}

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

function cartes(ls, sel) {
  if (!ls.length) return `<div class="tb-vide tb-vide-cartes"><p>Aucune colonie ne correspond à ces filtres.</p><button type="button" class="btn" data-act="tbeffacer">Effacer les filtres</button></div>`;
  const m = (lib, txt, alerte) => `<div class="tb-mesure${alerte ? " alerte" : ""}"><span>${lib}</span><b>${e(txt)}</b></div>`;
  return `<div class="tb-cartes">${ls.map((l) => `<div class="tb-carte${sel.has(l.id) ? " coche" : ""}">
      <div class="tb-carte-t"><input type="checkbox" class="tb-coche" data-act="tbcoche" data-v="${e(l.id)}" aria-label="Sélectionner ${e(l.nom)}" ${sel.has(l.id) ? "checked" : ""}>
        <button type="button" class="tb-nom" data-act="tbouvrir" data-v="${e(l.id)}">${pastille(l)}<span class="tb-nom-t"><b>${e(l.nom)}</b><span class="tb-sous">${e([l.code, l.rucher].filter(Boolean).join(" · "))}</span></span>${etiquette(l)}</button></div>
      ${l.raisons.length ? `<p class="tb-raison t-${ton(l.niveau)}">${e(l.raisons.map((x) => x.texte).join(" · "))}</p>` : ""}
      <div class="tb-mesures">${m("Force", l.force || "–")}${m("Varroa", varroaTexte(l), l.alertes.varroa)}${m("Provisions", l.provisions || "–", l.alertes.provisions)}${m("Visite", l.jours === null ? "Jamais" : `il y a ${l.jours} j`, l.alertes.visite)}</div>
    </div>`).join("")}</div>`;
}

function puces(t, toutes) {
  const f = t.f;
  if (!T.nbFiltres(f)) {
    const nb = (fn) => toutes.filter(fn).length;
    const sugg = [["avoir", "À voir", nb((l) => l.niveau !== "ok")], ["varroa", "Varroa au-dessus du seuil", nb((l) => l.alertes.varroa)],
      ["provisions", "Provisions faibles", nb((l) => l.alertes.provisions)], ["absente", "Sans reine", nb((l) => l.orpheline)]].filter(([, , k]) => k);
    return sugg.length ? `<div class="tb-puces" role="group" aria-label="Raccourcis de filtre"><span class="tb-puces-t">Raccourcis</span>${sugg
      .map(([v, lib, k]) => `<button type="button" class="tb-puce" data-act="tbsugg" data-v="${v}">${e(lib)} <span>${k}</span></button>`).join("")}</div>` : "";
  }
  const actives = [
    ...f.ruchers.map((v) => ["tbfiltre", "ruchers", v, v]),
    ...f.niveaux.map((v) => ["tbfiltre", "niveaux", v, T.NIVEAUX[v].libelle]),
    ...f.reines.map((v) => ["tbfiltre", "reines", v, v === "absente" ? "Sans reine" : v === "inconnue" ? "Reine non notée" : "Reine " + v]),
    ...["varroa", "provisions", "visite"].filter((k) => f[k]).map((k) => ["tbseuil", "", k, { varroa: "Varroa au-dessus du seuil", provisions: "Provisions faibles", visite: `Pas visitée depuis ${T.JOURS_SANS_VISITE} j` }[k]]),
  ];
  return `<div class="tb-puces" role="group" aria-label="Filtres actifs">${actives.map(([a, k, v, lib]) => `<button type="button" class="tb-puce on" data-act="${a}" data-k="${k}" data-v="${e(v)}" aria-label="Retirer le filtre ${e(lib)}">${e(lib)}${svg(I.croix, 14)}</button>`).join("")}
    <button type="button" class="link tb-effacer" data-act="tbeffacer">Tout effacer</button></div>`;
}

function filtres(t, toutes, nbVus) {
  const o = T.options(toutes), f = t.f;
  const opt = (act, k, x, on, extra = "") => `<button type="button" class="tb-opt${on ? " on" : ""}" data-act="${act}" data-k="${k}" data-v="${e(x.v)}" aria-pressed="${on}"><span class="tb-case" aria-hidden="true"></span>${extra}<span class="tb-opt-t">${e(x.libelle)}</span><span class="tb-opt-n">${x.n}</span></button>`;
  const groupe = (titre, html) => `<fieldset class="tb-groupe"><legend>${titre}</legend><div class="tb-opts">${html}</div></fieldset>`;
  const marque = (k) => /^\d+$/.test(k) ? `<span class="tb-marque" style="background:${MARQUAGES[couleurMarquage(Number(k))]?.[1] || "transparent"}" aria-hidden="true"></span>` : k === "absente" ? '<span class="tb-marque vide" aria-hidden="true"></span>' : "";
  return `<section class="tb-filtres${t.feuille === "filtres" ? " ouverte" : ""}" aria-label="Filtres" ${t.feuille === "filtres" ? 'role="dialog" aria-modal="true"' : ""}>
    <div class="tb-feuille-t"><h2>Filtres</h2><button type="button" class="link" data-act="tbeffacer">Réinitialiser</button></div>
    ${o.ruchers.length > 1 ? groupe("Rucher", o.ruchers.map((x) => opt("tbfiltre", "ruchers", x, f.ruchers.includes(x.v))).join("")) : ""}
    ${groupe("État", o.niveaux.map((x) => opt("tbfiltre", "niveaux", x, f.niveaux.includes(x.v), `<span class="tb-pt bg-${T.NIVEAUX[x.v].ton}" aria-hidden="true"></span>`)).join(""))}
    ${groupe("Reine", o.reines.map((x) => opt("tbfiltre", "reines", x, f.reines.includes(x.v), marque(x.v))).join(""))}
    ${groupe("Seuils d’alerte", o.seuils.map((x) => opt("tbseuil", "", x, !!f[x.v])).join(""))}
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

/** L'écran Ruchers en affichage « Tableau ». */
export function ecran() {
  const t = etat();
  const { toutes, vues } = calculer();
  const ids = new Set(vues.map((l) => l.id));
  t.sel = t.sel.filter((id) => toutes.some((l) => l.id === id));
  const sel = new Set(t.sel.filter((id) => ids.has(id)));
  const cols = T.COLONNES.filter((c) => t.cols[c.id]);
  const nf = T.nbFiltres(t.f);
  const nbR = new Set(toutes.map((l) => l.rucher)).size;
  const sous = vues.length === toutes.length ? `${plur(toutes.length, "colonie")} · ${plur(nbR, "rucher")}` : `${vues.length} sur ${plur(toutes.length, "colonie")}`;
  const aff = (k, lib, ic) => `<button type="button" data-act="tbaff" data-v="${k}" aria-pressed="${t.aff === k}" aria-label="${lib}" class="${t.aff === k ? "on" : ""}">${svg(ic)}</button>`;
  const selection = sel.size ? `<div class="tb-selection" role="region" aria-label="Sélection">
      <button type="button" class="tb-x" data-act="tbvider" aria-label="Annuler la sélection">${svg(I.croix)}</button>
      <span class="tb-sel-t">${sel.size} ${sel.size > 1 ? "sélectionnées" : "sélectionnée"}</span>
      <button type="button" class="btn" data-act="tbdeplacer">Déplacer</button>
      <button type="button" class="btn honey" data-act="tbvisite">${sel.size > 1 ? "Visite groupée" : "Visiter"}</button></div>` : "";
  const voile = t.feuille || t.fiche ? `<button type="button" class="tb-voile${t.feuille === "colonnes" ? " leger" : ""}${t.fiche ? " pour-fiche" : ""}" data-act="tbfermer" aria-label="Fermer" tabindex="-1"></button>` : "";
  shell("Ruchers", sous, '<button class="btn" data-act="newruches">Ajouter des ruches</button>', `${bascule()}
    <div class="tb${t.compact ? " compact" : ""}${sel.size ? " avec-sel" : ""}" data-aff="${t.aff}">
      <div class="tb-barre">
        <label class="tb-cherche">${svg(I.cherche)}<span class="tb-cache">Chercher une colonie</span><input id="tb_q" type="search" value="${e(t.q)}" placeholder="Nom ou code…" autocomplete="off" enterkeyhint="search"></label>
        <button type="button" class="tb-bouton fonce tb-bfiltres" data-act="tbfeuille" data-v="filtres" aria-haspopup="dialog">${svg(I.filtres)}<span>Filtres</span>${nf ? `<span class="tb-nb">${nf}</span>` : ""}</button>
        <div class="tb-ancre"><button type="button" class="tb-bouton" data-act="tbfeuille" data-v="colonnes" aria-haspopup="dialog" aria-expanded="${t.feuille === "colonnes"}" aria-label="Choisir les colonnes">${svg(I.colonnes)}<span class="tb-ordi">Colonnes</span></button>${colonnes(t)}</div>
        <button type="button" class="tb-bouton tb-ordi" data-act="tbcompact" aria-pressed="${t.compact}">Compact</button>
        <button type="button" class="tb-bouton tb-ordi" data-act="tbexport">${svg(I.telecharger)}<span>Exporter</span></button>
        <div class="tb-aff" role="group" aria-label="Présentation">${aff("cartes", "Afficher en cartes", I.cartes)}${aff("tableau", "Afficher en tableau", I.tableau)}</div>
      </div>
      ${puces(t, toutes)}
      <div class="tb-corps">
        ${filtres(t, toutes, vues.length)}
        <div class="tb-principal">${selection}${t.aff === "cartes" ? cartes(vues, sel) : tableau(vues, cols, t, sel)}</div>
      </div>
      ${voile}${fiche(t, toutes)}
    </div>`);
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
addEventListener("resize", () => { if (typeof S != "undefined" && S.route === "ruches" && S.tb?.vue === "tableau") ajuster(); });
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
}

function fermer() {
  const t = etat(), avant = t.fiche;
  t.feuille = null; t.fiche = null; render();
  if (avant) document.querySelector(`.tb-nom[data-v="${CSS.escape(avant)}"]`)?.focus({ preventScroll: true });
}
const basculer = (l, v) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
const idsVus = () => { const t = etat(), vus = new Set((calculs || calculer()).vues.map((l) => l.id)); return t.sel.filter((id) => vus.has(id)); };

/** Actions de l'affichage « Tableau » (consultation, permises au lecteur, sauf sélection et actions groupées). */
export const actions = {
  tbvue: (v) => { const t = etat(); t.vue = v === "tableau" ? "tableau" : "rucher"; t.feuille = t.fiche = null; garderPrefs(); render(); },
  tbaff: (v) => { const t = etat(); t.aff = v === "cartes" ? "cartes" : "tableau"; garderPrefs(); render(); },
  tbfeuille: (v) => { const t = etat(); t.feuille = t.feuille === v ? null : v; t.fiche = null; render(); },
  tbfermer: () => fermer(),
  tbfiltre: (v, k) => { const t = etat(); if (!["ruchers", "niveaux", "reines"].includes(k)) return; t.f = { ...t.f, [k]: basculer(t.f[k], v) }; render(); },
  tbseuil: (v) => { const t = etat(); if (!["varroa", "provisions", "visite"].includes(v)) return; t.f = { ...t.f, [v]: !t.f[v] }; render(); },
  tbsugg: (v) => {
    const t = etat(), f = T.filtresVides();
    if (v === "avoir") f.niveaux = ["urg", "watch"]; else if (v === "absente") f.reines = ["absente"]; else if (v in f) f[v] = true;
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
  tbvider: () => { etat().sel = []; render(); },
  tbvisite: () => {
    const ids = idsVus();
    if (!ids.length) return;
    etat().sel = [];
    ACT.newvisite(ids[0]);
    if (ids.length > 1 && S.visite) { S.visite.multi = true; S.visite.ruches = [...ids]; S.visite.ruche_id = ids[0]; redessiner("visite"); }
  },
  tbdeplacer: () => {
    const ids = idsVus();
    if (!ids.length) return;
    etat().sel = [];
    ACT.dpouvrir("");
    if (S.dp) { S.dp.sel = [...ids]; render(); }
  },
};
