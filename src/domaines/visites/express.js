// Apiviz — écran « Visite express » (v5.32, AP-FEAT-037, maquettes du 12 nov. 2026, migration 020).
// La visite part des valeurs de la précédente ; on ne touche que ce qui a changé. Chaque ligne dit « repris »,
// « pareil » ou « changé » ; la reine n'est jamais reprise (à revoir à chaque visite, comme dans la tournée).
// Enregistrer passe par creer_visite et la file d'envoi (offline.js), avec observes (champs touchés) et duree_s.
// Sans la migration 020, la base ignore ces deux champs : la visite est enregistrée comme une visite complète.
// Après l'enregistrement : la ruche suivante du même rucher pas encore vue ce jour, sinon la fiche de la ruche.
// Globales d'app.js lues à l'appel : S, esc, n, dfr, today, shell, render, toast, go, byId, lastVisit, apresVisites, ACT, GROUP.
import { CHAMPS_EXPRESS, departExpress, etatChamp, resumeExpress, chargeExpress, rucheSuivante, jourMoisCourt, dureeTexte, vide } from "./regles.js";
import { proposerTacheEssaimage } from "./essaimage.js";
import { oublier as oublierBrouillon } from "./brouillon.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
const ETIQUETTE = { repris: "repris", vu: "pareil", change: "changé", "non vu": "à regarder" };
const poidsTexte = (x) => (x === "" || x === null || x === undefined ? "Non pesée" : `${n(Number(x))} kg`);
const texte = (k, v) => (k === "poids_kg" ? poidsTexte(v) : k === "reine" && v === "Non cherchée" ? "Pas cherchée"
  : k === "force" ? (vide(v) ? "—" : `${v} sur 5`) : vide(v) ? "—" : v);
// Chrono de la saisie (AP-TECH-128) : le texte suit chaque seconde sans redessiner l'écran.
let chrono = null;
function suivreChrono() {
  clearInterval(chrono);
  chrono = setInterval(() => {
    const z = document.getElementById("ve_chrono");
    if (!z || !S.ve) return clearInterval(chrono);
    z.lastChild.textContent = dureeTexte((Date.now() - S.ve.debut) / 1000);
  }, 1000);
}
const ICONE_CHRONO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>';

/** Ouvre la visite express d'une ruche (ou la visite complète s'il n'y a encore aucune visite à reprendre). */
export function ouvrir(rucheId) {
  const r = byId(S.d.ruches, rucheId);
  if (!r) return;
  const der = lastVisit(r.id);
  if (!der) return ACT.newvisite(r.id);
  const depart = departExpress(der, r);
  S.ve = { id: nouvelId(), ruche_id: r.id, date_base: der.date_visite, depart, valeurs: { ...depart }, touches: [], ouvert: null, note: "", debut: Date.now() };
  go("visiteexpress");
}

/** Reprend une visite express gardée en brouillon (brouillon.js). */
export function reprendre(ve) {
  S.ve = ve;
  go("visiteexpress");
}

function ligne(c) {
  const f = S.ve, etat = etatChamp(c.k, f.valeurs, f.depart, f.touches), ouvert = f.ouvert === c.k;
  const avant = etat === "change" && !vide(f.depart[c.k]) ? `<s>${e(texte(c.k, f.depart[c.k]))}</s> → ` : "";
  // « comme le 12/05 » sous une valeur reprise qui existe (AP-TECH-127).
  const sous = etat === "repris" && !vide(f.depart[c.k]) && c.k !== "etat" ? `<small class="ve-comme">comme le ${e(jourMoisCourt(f.date_base))}</small>` : "";
  const corps = !ouvert ? "" : c.choix
    ? `<div class="seg ve-choix" role="group" aria-label="${e(c.nom)}" style="grid-template-columns:repeat(${c.choix.length},minmax(0,1fr))">${c.choix.map((x) => `<button type="button" class="${f.valeurs[c.k] === x ? "on" : ""}${x === "Operculées" ? " ve-alerte" : ""}" aria-pressed="${f.valeurs[c.k] === x}" data-act="vechoix" data-k="${c.k}" data-v="${e(x)}">${e(c.k === "force" ? x : texte(c.k, x))}</button>`).join("")}</div>`
    : `<div class="ve-poids"><button type="button" class="ve-pas" data-act="vepoids" data-v="-0.5" aria-label="Retirer 500 g">−</button>
        <input id="ve_poids" class="ve-poids-i" type="number" inputmode="decimal" step="0.1" min="0" value="${e(f.valeurs.poids_kg)}" placeholder="kg" aria-label="Poids en kilos">
        <button type="button" class="ve-pas" data-act="vepoids" data-v="0.5" aria-label="Ajouter 500 g">+</button></div>`;
  return `<li class="ve-ligne ${etat === "change" ? "ve-modifie" : ""} ${ouvert ? "ve-ouvert" : ""}">
    <button type="button" class="ve-tete" data-act="veouvrir" data-v="${c.k}" aria-expanded="${ouvert}">
      <span class="ve-nom">${e(c.nom)}</span><span class="ve-val">${avant}${e(texte(c.k, f.valeurs[c.k]))}${sous}</span>
      <span class="ve-etat ve-${etat.replace(" ", "-")}">${ETIQUETTE[etat]}</span></button>${corps}${c.k === "cellules_royales" && f.valeurs[c.k] === "Operculées"
        ? '<p class="ve-essaimage">Cellules operculées : l’essaimage peut être proche. Je te proposerai une tâche à l’enregistrement.</p>' : ""}</li>`;
}

/** Une seule visite, deux modes (v5.44, rationalisation) : « Express » (3 touches, reprend la précédente) ou
 *  « Complète ». La bascule est en tête des deux écrans de saisie et garde la ruche. */
export function bascule(mode) {
  return `<div class="cp-bascule ve-mode" role="tablist" aria-label="Type de visite">
    <button type="button" role="tab" aria-selected="${mode === "express"}" data-act="${mode === "express" ? "vemodeactif" : "vemodeexpress"}">Express</button>
    <button type="button" role="tab" aria-selected="${mode === "complete"}" data-act="${mode === "complete" ? "vemodeactif" : "vecomplete"}">Complète</button></div>`;
}

/** Visite complète d'une seule ruche déjà visitée : la bascule Express / Complète en tête du formulaire. */
export function completerVisite() {
  const id = S.visite?.ruche_id, wrap = document.querySelector(".wrap");
  if (!id || !wrap || S.tournee || (S.visite.ruches || []).length > 1 || !lastVisit(id) || wrap.querySelector(".ve-mode")) return;
  (wrap.querySelector(":scope > .head") || wrap.firstElementChild)?.insertAdjacentHTML("afterend", bascule("complete"));
}

/** L'écran « visiteexpress ». */
export function ecran() {
  const f = S.ve;
  const r = f && byId(S.d.ruches, f.ruche_id);
  if (!r) { S.ve = null; return go("ruches"); }
  const res = resumeExpress(f.valeurs, f.depart, f.touches), suivante = rucheSuivante(S.d, r.id, today());
  const total = CHAMPS_EXPRESS.length;
  const resume = [res.changes ? `${res.changes} changement${res.changes > 1 ? "s" : ""}` : "Aucun changement",
    res.repris ? `${res.repris} reprise${res.repris > 1 ? "s" : ""}` : "",
    res.aRegarder ? `${res.aRegarder} à regarder` : ""].filter(Boolean).join(" · ");
  shell(r.nom, `Visite express · ${total} points`, "",
    `${bascule("express")}<div class="ve">
      <div class="ve-api"><span class="ve-api-i" aria-hidden="true"></span>
        <p>Je reprends ta visite du ${e(dfr(f.date_base))}. Touche seulement ce qui a changé.</p></div>
      <ul class="ve-liste" aria-label="Ce que tu notes">${CHAMPS_EXPRESS.map(ligne).join("")}</ul>
      <label class="ve-note">Note (facultatif)<textarea id="ve_note" rows="2" placeholder="Ce que tu as remarqué">${e(f.note)}</textarea></label>
      <div class="ve-bas"><p class="ve-resume" aria-live="polite">${e(resume)}</p><span class="ve-chrono" id="ve_chrono" role="timer" aria-label="Durée de la visite">${ICONE_CHRONO}<span>${e(dureeTexte((Date.now() - f.debut) / 1000))}</span></span></div>
      <button type="button" class="btn main block ve-ok" data-act="veenregistrer" ${S.busy ? "disabled" : ""}>${suivante ? `Enregistrer et passer à ${e(suivante.nom)}` : "Enregistrer la visite"}</button>
      ${suivante ? `<button type="button" class="link ve-seul" data-act="veenregistrer" data-v="seul">Enregistrer et revenir à la ruche</button>` : ""}
    </div>`);
  const h = document.querySelector(".wrap .head h1");
  if (h) h.closest(".head")?.classList.add("ve-tete-ecran");
  document.getElementById("ve_poids")?.addEventListener("input", (ev) => {
    f.valeurs.poids_kg = ev.target.value === "" ? "" : Number(ev.target.value);
    if (!f.touches.includes("poids_kg")) f.touches.push("poids_kg");
  });
  document.getElementById("ve_note")?.addEventListener("input", (ev) => { f.note = ev.target.value; });
  suivreChrono();
}

const lireNote = () => { const z = document.getElementById("ve_note"); if (z && S.ve) S.ve.note = z.value; };
function toucher(k) { if (!S.ve.touches.includes(k)) S.ve.touches.push(k); }

async function enregistrer(mode, _k, bouton) {
  const f = S.ve;
  if (!f || S.busy) return;
  lireNote();
  const p = chargeExpress({ id: f.id, ruche_id: f.ruche_id, date_visite: today(), valeurs: f.valeurs, touches: f.touches, note: f.note, debut: f.debut });
  if (bouton) bouton.disabled = true;
  S.busy = true;
  try {
    const { data: vid, error, local } = await appel("creer_visite", { p });
    if (error) throw error;
    const suivante = mode === "seul" ? null : rucheSuivante(S.d, f.ruche_id, today());
    S.ve = null;
    oublierBrouillon(f.ruche_id);
    S.ruche = f.ruche_id; S.route = "ruche";
    await apresVisites([{ ...p, id: vid || p.id }], local);
    toast(local ? "Visite gardée sur le téléphone" : `Visite enregistrée${p.duree_s ? ` en ${dureeTexte(p.duree_s)}` : ""}`);
    if (p.cellules_royales === "Operculées") proposerTacheEssaimage(f.ruche_id, suivante ? () => ouvrir(suivante.id) : null);
    else if (suivante) ouvrir(suivante.id);
  } finally { S.busy = false; if (bouton?.isConnected) bouton.disabled = false; }
}

/** Fiche d'une ruche active déjà visitée : « Visite express » devient le bouton principal ; « Visite complète »
 *  rejoint les autres actions du bouton + (gabarit commun v5.43 : un seul bouton principal). */
export function completerFiche() {
  const r = S.ruche && byId(S.d.ruches, S.ruche);
  if (!r || r.sortie || !lastVisit(r.id)) return;
  const barre = document.querySelector(".n4-rbarre");
  if (!barre || barre.querySelector('[data-act="veruche"]')) return;
  const v = barre.querySelector(':scope > [data-act="newvisite"]');
  if (!v) return;
  v.insertAdjacentHTML("beforebegin", `<button class="btn main" data-act="veruche" data-v="${e(r.id)}">Visite express</button>`);
  v.classList.remove("main", "honey", "ghost");
  v.textContent = "Visite complète";
  barre.querySelector(".g-autres")?.prepend(v);
}

if (typeof GROUP != "undefined") GROUP.visiteexpress = "ruches";

export const actions = {
  veruche: (id) => ouvrir(id),
  veouvrir: (k) => { lireNote(); S.ve.ouvert = S.ve.ouvert === k ? null : k; render(); if (S.ve.ouvert === "poids_kg") document.getElementById("ve_poids")?.focus(); },
  vechoix: (v, k) => {
    lireNote();
    const c = CHAMPS_EXPRESS.find((x) => x.k === k);
    // Champ qui peut rester vide (force, œufs, cellules) : un second toucher sur la valeur choisie l'efface.
    if (c?.vide && S.ve.touches.includes(k) && S.ve.valeurs[k] === v) { S.ve.valeurs[k] = S.ve.depart[k]; S.ve.touches = S.ve.touches.filter((x) => x !== k); S.ve.ouvert = null; }
    else { S.ve.valeurs[k] = v; toucher(k); S.ve.ouvert = null; }
    render();
  },
  vepoids: (pas) => {
    lireNote();
    const f = S.ve, x = f.valeurs.poids_kg === "" ? Number(f.depart.poids_kg) || 0 : Number(f.valeurs.poids_kg);
    f.valeurs.poids_kg = Math.max(0, Math.round((x + Number(pas)) * 10) / 10); toucher("poids_kg"); render();
  },
  veenregistrer: enregistrer,
  vecomplete: () => { const id = S.ve?.ruche_id; S.ve = null; oublierBrouillon(id); ACT.newvisite(id); },
  vemodeexpress: () => { const id = S.visite?.ruche_id; if (id) ouvrir(id); },
  "vemodeactif": () => {},
};
