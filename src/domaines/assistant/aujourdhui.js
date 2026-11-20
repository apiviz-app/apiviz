// Apiviz — « Pour aujourd'hui » d'API (v5.70) : ce que l'Accueil, l'écran API et l'agenda lisent des données de
// l'application pour les règles pures de compagnon.js (priorité du jour, météo déjà chargée, priorités de la saison,
// matériel sous le seuil, tâches en retard, conseils d'API pas encore faits).
// Préférences « Conseils d'API » (Réglages › API) : sur cet appareil, nombre de lignes (1 ou 3) et carte de l'Accueil.
// Globales lues à l'appel : S, esc, cfg, today, UX, MT, AL, write, sb.
import * as C from "./compagnon.js";
import * as V from "../equipe/suivi-saison.js";
import * as H from "./historique.js";
import { saison as saisonProduits } from "../production/saison.js";
import { boutonMicro, peutEcouter } from "./ecoute.js";
import { connu, etat } from "./client.js";

const reglages = () => (typeof cfg == "function" ? cfg() : {}) || {};
const auj = () => (typeof today == "function" ? today() : new Date().toISOString().slice(0, 10));

// ---------- Préférences « Conseils d'API » ----------
const CLE = "apiviz.api.conseils";
export function prefsConseils() {
  try { const p = JSON.parse(localStorage.getItem(CLE) || "{}"); return { lignes: p.lignes === 1 ? 1 : 3, accueil: p.accueil !== false }; } catch { return { lignes: 3, accueil: true }; }
}
export function ecrirePrefs(p) {
  try { localStorage.setItem(CLE, JSON.stringify({ lignes: p.lignes === 1 ? 1 : 3, accueil: p.accueil !== false })); } catch { /* navigation privée */ }
}

// ---------- Ce que l'on sait aujourd'hui ----------
/** Conseils d'API pas encore faits (lignes de l'historique tenues par l'écran API). */
let lignesHistorique = [];
export const suivreHistorique = (l) => { lignesHistorique = Array.isArray(l) ? l : []; };
export const conseilsOuverts = () => H.conseilsAFaire(lignesHistorique, new Date(), 9).filter((c) => !c.sanitaire);

const prioritaire = () => (S.d?.ruches || []).find((x) => x.etat === "Critique") || (S.d?.ruches || []).find((x) => x.etat !== "Bonne");

/** La priorité du jour telle que l'Accueil la dit (phrase d'API, d'où elle vient, la ruche). */
export function prioriteDuJour() {
  const d = S.d;
  if (!d?.ruches?.length || !d.visites?.length) return null;
  const r = prioritaire();
  const pesees = r ? d.visites.filter((v) => v.ruche_id === r.id && v.poids_kg).length : 0;
  const titre = typeof AL != "undefined" && AL.phrase ? AL.phrase() : r ? `${r.nom} est à surveiller.` : "Tout va bien au rucher.";
  return { titre, sous: r ? (pesees > 1 ? `D’après ${pesees} pesées de ${r.nom}` : `D’après la dernière visite de ${r.nom}`) : "D’après tes dernières visites",
    ruche_id: r?.id || null, nom: r?.nom || "", etat: r?.etat || "Bonne" };
}

/** Le meilleur créneau déjà connu (la météo n'est jamais chargée ici), le plus tôt d'abord. */
export function creneaux() {
  if (typeof UX == "undefined" || typeof MT == "undefined") return [];
  return UX.ruchers().map(([cle, rs]) => ({ cle, nom: UX.nomRucher(cle), rs, c: MT.creneauConnu(cle, rs) }))
    .filter((x) => x.c).map((x) => ({ cle: x.cle, nom: x.nom, jour: x.c.jour, h: x.c.h, temp: x.c.temp, n: x.c.n }));
}

/** Priorités de la saison (Ma saison), marquées quand elles sont déjà dans l'agenda ; celles faites retirées. */
export function prioritesSaison() {
  const d = S.d;
  if (!d) return [];
  try {
    const s = V.suivi(d, new Date().getFullYear(), auj(), reglages());
    let attente = 0;
    try { attente = saisonProduits(d).attente || 0; } catch { attente = 0; }
    const t = d.taches || [];
    return V.priorites(s, { attente }).filter((p) => !t.some((x) => x.faite && x.titre === p.titre)).map((p) => ({ ...p, dejaAgenda: t.some((x) => !x.faite && x.titre === p.titre) }));
  } catch { return []; }
}

/** Articles suivis en stock, sous leur seuil. */
export const sousSeuil = () => (S.d?.articles || []).filter((a) => !a.archive && a.stock != null && Number(a.seuil) > 0 && Number(a.stock) < Number(a.seuil));
const enRetard = () => (S.d?.taches || []).filter((t) => !t.faite && t.echeance && t.echeance < auj()).length;

/** Les lignes « Pour aujourd'hui ». max : le réglage Conseils d'API par défaut. */
export function lignes({ max = prefsConseils().lignes, priorite = prioriteDuJour() } = {}) {
  const c = creneaux().filter((x) => x.n === 2).sort((a, b) => a.jour.localeCompare(b.jour) || b.temp - a.temp)[0] || null;
  return C.lignesDuJour({ aujourdhui: auj(), max, priorite, creneau: c, priorites: prioritesSaison(), sousSeuil: sousSeuil(), retard: enRetard(), conseils: conseilsOuverts().length });
}

// ---------- Rendu ----------
const ICONES = {
  priorite: "M12 2l8.5 5v10L12 22l-8.5-5V7z",
  soleil: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  saison: "M4 20c8 0 14-6 16-16C10 6 4 12 4 20zM4 20l8-8",
  panier: "M3 5h3l2 11h11l2-8H7M9 20v.5M18 20v.5",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  api: "M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z",
  tournee: "M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6.5 16.5l4-8.5M13.5 8l4 8.5",
};
const ic = (k) => `<span class="aj-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONES[k] || ICONES.api}"/></svg></span>`;

/** Une ligne : icône, texte (la priorité garde l'id acPhrase, mis à jour quand la météo arrive), geste. */
export function ligneHtml(l, { id = false } = {}) {
  return `<div class="aj-l aj-${esc(l.id.replace(/\d+$/, ""))}">${ic(l.icone)}<span class="aj-t"><b${id && l.id === "priorite" ? ' id="acPhrase"' : ""}>${esc(l.titre)}</b>${l.sous ? `<span class="small">${esc(l.sous)}</span>` : ""}</span>
    <button type="button" class="btn${l.principal ? " main" : ""} aj-b" data-act="${esc(l.act)}" data-v="${esc(l.v)}">${esc(l.bouton)}</button></div>`;
}

/**
 * Carte « Pour aujourd'hui » de l'Accueil (remplace la priorité seule, v5.24) : API, le micro, les lignes, la tournée
 * proposée s'il y en a une (avec « Plus tard »), et « Tout voir dans l'espace API ».
 * tournee : { act, v, texte, bouton } ou null.
 */
export function carteAccueil({ tournee = null, humeur = "repos", micro = false } = {}) {
  const p = prioriteDuJour(), max = prefsConseils().lignes;
  // Trois lignes au plus, tournée comprise : la carte reste d'un coup d'œil sur un téléphone.
  const l = lignes({ priorite: p, max: tournee ? Math.max(1, max - 1) : max });
  const t = tournee ? `<div class="aj-l aj-tournee">${ic("tournee")}<span class="aj-t"><b>${esc(tournee.texte)}</b><span class="small">Proposée d’après tes ruchers</span></span>
      <span class="aj-deux"><button type="button" class="btn aj-b" data-act="${esc(tournee.act)}" data-v="${esc(tournee.v)}">${esc(tournee.bouton || "Commencer")}</button><button type="button" class="link ac-plustard" data-act="n4plustard">Plus tard</button></span></div>` : "";
  return `<section class="ac-api ac-jour${p && p.etat === "Bonne" ? " calme" : ""}" aria-labelledby="ajTitre">
    <div class="aj-tete">${typeof AL != "undefined" ? AL.compagnon(humeur, 40) : ""}<h2 id="ajTitre">Pour aujourd’hui</h2>${micro ? boutonMicro("apimicro", "Parler à API", "aj-micro") : ""}</div>
    <div class="aj-lignes">${l.map((x) => ligneHtml(x, { id: true })).join("")}${t}</div>
    <div class="aj-pied"><button type="button" class="link aj-tout" data-act="go" data-v="api">Tout voir dans l’espace API<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>
  </section>`;
}

/** La même liste, en plus court, en tête de l'écran API. */
export function listeEcran() {
  const l = lignes();
  return l.length ? `<section class="as-jour" aria-label="Pour aujourd’hui"><h2 class="as-jour-t">Pour aujourd’hui</h2>${l.map((x) => ligneHtml({ ...x, principal: false })).join("")}</section>` : "";
}

/** Après le rendu de l'Accueil : le micro de la carte, quand API est disponible ici (et pas en lecture seule). */
export function completerAccueil() {
  const tete = document.querySelector(".ac-jour .aj-tete");
  if (!tete || !peutEcouter() || document.documentElement.classList.contains("lecteur")) return;
  const poser = (st) => { if (st?.actif && S.route === "dash" && tete.isConnected && !tete.querySelector(".ae-micro")) tete.insertAdjacentHTML("beforeend", boutonMicro("apimicro", "Parler à API", "aj-micro")); };
  const st = connu();
  if (st) poser(st); else etat().then(poser);
}

// Pour accueil.js et voix.js (scripts classiques) : la carte « Pour aujourd'hui », le réglage qui la montre, et ce
// qu'API remarque à la relecture d'une visite à la voix.
if (typeof window != "undefined") { window.Noyau = window.Noyau || {}; window.Noyau.espaceApi = { carteAccueil, prefsConseils, remarquesVoix: C.remarquesVoix }; }

// ---------- Gestes ----------
export const actions = {
  /** « Planifier » un bon créneau : la feuille Tâche, préremplie (visite du rucher, ce jour-là). */
  apiplanifier: (v) => {
    const [jour, h, cle] = String(v).split("|");
    ACT.newtache();
    const titre = document.querySelector("#sheetForm [name=titre]"), date = document.querySelector("#sheetForm [name=echeance]");
    if (titre) titre.value = `Visite · ${typeof UX != "undefined" ? UX.nomRucher(cle) : cle}${h ? ` (vers ${h} h)` : ""}`;
    if (date) { date.value = jour; date.dispatchEvent(new Event("input", { bubbles: true })); date.dispatchEvent(new Event("change", { bubbles: true })); }
  },
  /** « + Agenda » d'une priorité de la saison : la tâche, tout de suite. */
  apiprio: async (i) => {
    const p = prioritesSaison()[Number(i)];
    if (!p || p.dejaAgenda) return;
    await write(sb.from("taches").insert({ id: globalThis.crypto?.randomUUID?.(), titre: p.titre, ruche_id: p.ruche_id || null, echeance: C.plusJours(auj(), 2) }), "Ajouté à l’agenda");
  },
};
