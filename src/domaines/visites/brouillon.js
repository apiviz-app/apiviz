// Apiviz — brouillon de visite persistant (v5.43, AP-FEAT-040, AP-US-044, maquette du 15 nov. 2026).
// La visite en cours (complète ou express) est gardée sur le téléphone, par colonie, à chaque saisie : un appel, une
// application fermée par le système ou un rechargement ne la perdent plus. À la réouverture, l'accueil propose
// « Reprendre la visite de Ruche 4 » (Reprendre / Oublier). Un brouillon expire au bout de 48 h.
//
// Stockage : la base locale du hors ligne (IndexedDB « apidoo-hors-ligne », magasin « kv », offline.js), une ligne par
// exploitation. Effacée à la déconnexion avec le reste (purgerLocal, app.js). Sans IndexedDB : repli en mémoire.
// Effacé : à l'enregistrement, à « Annuler », à « Visite complète » depuis l'express, à « Oublier ».
// Pas de brouillon tant que rien n'a été saisi (pas de brouillon fantôme), ni pendant une tournée (elle garde le sien).
// Globales lues à l'appel seulement : S, HL, EX, esc, byId, go, render, readVisitForm.
import { proposerTacheEssaimage } from "./essaimage.js";

export const DUREE_BROUILLON_MS = 48 * 3600 * 1000;

// ---------- Règles pures (testées : tests/unitaires/visites.test.mjs) ----------

/** Clés d'une visite complète qui ne disent rien de ce qui a été saisi. */
const TECHNIQUES = new Set(["debut", "date_visite", "ruche_id", "ruches", "multi", "etat", "varroa_methode"]);

/** Nombre de points saisis dans une visite complète, par rapport à son état d'ouverture. */
export function pointsComplete(visite, depart) {
  if (!visite || !depart) return 0;
  let n = 0;
  for (const k of new Set([...Object.keys(visite), ...Object.keys(depart)])) {
    if (TECHNIQUES.has(k)) continue;
    if (k === "q") n += Object.keys(visite.q || {}).filter((a) => Number(visite.q[a]) !== Number(depart.q?.[a] || 0)).length;
    else if (String(visite[k] ?? "") !== String(depart[k] ?? "")) n++;
  }
  return n;
}

/** Nombre de points saisis dans une visite express (champs touchés, plus la note). */
export const pointsExpress = (ve) => (ve ? ve.touches.length + (String(ve.note || "").trim() ? 1 : 0) : 0);

/** Garde les brouillons de moins de 48 h. */
export function valides(liste, maintenant = Date.now()) {
  return Object.fromEntries(Object.entries(liste || {}).filter(([, b]) => b && maintenant - b.at < DUREE_BROUILLON_MS));
}

/** Le brouillon le plus récent : { rucheId, ...brouillon } ou null. */
export function plusRecent(liste) {
  const l = Object.entries(liste || {}).sort((a, b) => b[1].at - a[1].at);
  return l.length ? { rucheId: l[0][0], ...l[0][1] } : null;
}

/** « 10 h 42 », « hier à 18 h 05 ». */
export function quand(at, maintenant = Date.now()) {
  const d = new Date(at), auj = new Date(maintenant);
  const h = `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === auj.toDateString()) return h;
  const hier = new Date(maintenant); hier.setDate(hier.getDate() - 1);
  return d.toDateString() === hier.toDateString() ? `hier à ${h}` : `le ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")} à ${h}`;
}

// ---------- Stockage ----------

let liste = null; // copie en mémoire, chargée à la première lecture
let chargement = null;
const cle = () => "brouillons-visite:" + (typeof EX != "undefined" ? EX.courante() : "");
const kv = () => (typeof HL != "undefined" ? HL.kv : null);

function charger() {
  if (liste) return Promise.resolve(liste);
  if (!chargement) {
    chargement = Promise.resolve(kv()?.lire(cle())).catch(() => null)
      .then((o) => { liste = valides(o?.liste); return liste; })
      .finally(() => { chargement = null; });
  }
  return chargement;
}
const ecrire = () => Promise.resolve(kv()?.mettre({ k: cle(), liste })).catch(() => {});

/** Oublie le brouillon d'une colonie (visite enregistrée, annulée, ou « Oublier »). */
export async function oublier(rucheId) {
  if (!rucheId) return;
  await charger();
  if (!liste[rucheId]) return;
  delete liste[rucheId];
  await ecrire();
}

// ---------- Garde pendant la saisie ----------

const departs = new WeakMap(); // visite complète → copie à l'ouverture (rien saisi = pas de brouillon)
const copie = (o) => JSON.parse(JSON.stringify(o));

/** Note l'état d'ouverture d'une visite complète (appelé au rendu de l'écran « visite »). */
export function noterDepart() {
  if (typeof S == "undefined" || !S.visite || departs.has(S.visite)) return;
  const { debut, ...v } = S.visite;
  departs.set(S.visite, copie(v));
}

function garder() {
  if (typeof S == "undefined" || !S.session || S.tournee || S.busy) return; // S.busy : enregistrement en cours
  let rucheId, b;
  if (S.route === "visite" && S.visite) {
    if (typeof readVisitForm == "function" && document.getElementById("v_date")) readVisitForm();
    noterDepart();
    const { debut, ...v } = S.visite, depart = departs.get(S.visite);
    const points = pointsComplete(v, depart);
    if (!points || !v.ruche_id) return;
    rucheId = v.ruche_id;
    b = { genre: "complete", data: copie(v), depart, points, ecoule: debut ? Date.now() - debut : 0 };
  } else if (S.route === "visiteexpress" && S.ve) {
    const z = document.getElementById("ve_note");
    if (z) S.ve.note = z.value;
    const points = pointsExpress(S.ve);
    if (!points) return;
    const { debut, ...ve } = S.ve;
    rucheId = ve.ruche_id;
    b = { genre: "express", data: copie(ve), points, ecoule: Date.now() - debut };
  } else return;
  charger().then(() => {
    liste[rucheId] = { ...b, commence: liste[rucheId]?.commence || Date.now(), at: Date.now() };
    return ecrire();
  });
}

let minuterie = null;
const plusTard = () => { clearTimeout(minuterie); minuterie = setTimeout(garder, 400); };

// ---------- Accueil : « Reprendre la visite de Ruche 4 » ----------

const depuis = (at) => { const q = quand(at); return /^\d/.test(q) ? "à " + q : q; };
function carte(b) {
  const r = byId(S.d.ruches, b.rucheId);
  if (!r) return "";
  const autres = Object.keys(liste).length - 1;
  return `<section class="card bv-carte" aria-label="Visite en cours">
    <div class="bv-tete"><span class="bv-hex" aria-hidden="true"></span><div><b>Reprendre la visite de ${esc(r.nom)}</b>
      <p class="small">Commencée ${esc(depuis(b.commence || b.at))} · ${b.points} point${b.points > 1 ? "s" : ""} noté${b.points > 1 ? "s" : ""} · gardée 48 h${autres > 0 ? ` · ${autres} autre${autres > 1 ? "s" : ""} visite${autres > 1 ? "s" : ""} en cours` : ""}</p></div></div>
    <div class="bv-deux"><button type="button" class="btn main" data-act="bvreprendre" data-v="${esc(r.id)}">Reprendre</button>
      <button type="button" class="btn" data-act="bvoublier" data-v="${esc(r.id)}">Oublier</button></div></section>`;
}

/** Ajoute la carte en haut de l'accueil s'il y a un brouillon (lecture locale : la carte arrive aussitôt après). */
export function completerAccueil() {
  charger().then(() => {
    const wrap = document.querySelector(".wrap");
    if (S.route !== "dash" || !wrap || wrap.querySelector(".bv-carte") || !S.d) return;
    for (const id of Object.keys(liste)) if (!byId(S.d.ruches, id)) delete liste[id]; // colonie supprimée entre-temps
    const b = plusRecent(liste);
    if (b) wrap.insertAdjacentHTML("afterbegin", carte(b));
  });
}

/** Rouvre le brouillon d'une colonie là où il en était (la durée reprend où elle s'était arrêtée). */
export async function reprendre(rucheId) {
  await charger();
  const b = liste[rucheId];
  if (!b || !byId(S.d.ruches, rucheId)) { await oublier(rucheId); return render(); }
  const debut = Date.now() - (b.ecoule || 0);
  if (b.genre === "express") {
    S.ve = { ...b.data, ouvert: null, debut };
    go("visiteexpress");
  } else {
    S.visite = { ...b.data, q: b.data.q || {}, debut };
    if (b.depart) departs.set(S.visite, b.depart); // les points se comptent toujours depuis l'ouverture
    go("visite");
  }
}

export const actions = {
  bvreprendre: (id) => reprendre(id),
  bvoublier: async (id) => { await oublier(id); document.querySelector(".bv-carte")?.remove(); if (S.route === "dash") completerAccueil(); },
};

/** Installé une fois au chargement (src/domaines/visites/ecrans.js). */
export function installer() {
  if (typeof document == "undefined") return;
  document.addEventListener("input", () => { if (S.route === "visite" || S.route === "visiteexpress") plusTard(); }, true);
  document.addEventListener("click", () => { if (S.route === "visite" || S.route === "visiteexpress") plusTard(); }, true);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") garder(); });
  addEventListener("pagehide", garder);
  // Pont pour les scripts classiques (visites-groupees.js, nav4.js) : oublier après enregistrement ou annulation.
  window.VB = { oublier, essaimage: (id) => proposerTacheEssaimage(id) };
}
