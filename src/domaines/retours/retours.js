// Apiviz — retours de réussite branchés sur l'application (v5.68, maquettes du 20 nov. 2026).
//   - niveau 1 : chaque choix (puces, segments, interrupteurs, compteurs) rebondit et fait « tic » ;
//   - niveau 2 : chaque bulle de réussite (« Visite enregistrée », « Vente encaissée »…) joue deux notes et vibre ;
//     la coche et les éclats restent ceux de mouvement.js ; une erreur joue un son grave, une annulation redescend ;
//   - visite express : un rayon d'alvéoles se remplit à mesure que les points sont regardés ;
//   - fin de tournée : chaque ruche s'allume en jouant sa note, puis un accord ; « 9 min de moins que la dernière fois » ;
//   - récolte : le pot se remplit, les kilos défilent, la saison avance vers l'objectif ;
//   - retour du réseau : une abeille emporte les saisies vers le nuage.
// Réglages : Réglages › Sons et vibrations (reglages.js). Rien n'est envoyé en base, sauf l'objectif de récolte.
// Globales lues à l'appel : S, esc, n, cfg, toast, ACT.
import * as Son from "./sons.js";
import { estReussite } from "./regles.js";
import { CHAMPS_EXPRESS, etatChamp } from "../visites/regles.js";
import { saison } from "../production/saison.js";

let silence = 0;
/** La prochaine bulle de réussite (dans les 4 s) ne joue pas le niveau 2 : un retour plus riche la remplace. */
export const taire = (ms = 4000) => { silence = Date.now() + ms; };

// ---------- Niveau 2 : les bulles ----------
const ENVOI = /saisies? envoyées?/i, ANNULE = /annulée|retirée|rétabli|abandonnée/i;
function brancherBulles() {
  const avant = window.toast;
  if (typeof avant !== "function" || avant.rtBranche) return;
  const nouveau = function (message, erreur) {
    const r = avant.apply(this, arguments);
    try {
      const m = String(message || "");
      if (erreur) { Son.jouer("refus"); Son.vibrer("refus"); }
      else if (ENVOI.test(m)) abeille();
      else if (ANNULE.test(m)) { Son.jouer("annule"); Son.vibrer("annule"); }
      else if (estReussite(m, erreur) && Date.now() > silence) Son.niveau(2);
    } catch { /* un retour ne doit jamais casser une saisie */ }
    return r;
  };
  nouveau.rtBranche = true;
  window.toast = nouveau;
}

// ---------- Niveau 1 : les choix ----------
const CHOIX = '.seg button, .chips button, [aria-pressed], [role="tab"], [role="switch"], [role="radio"], .ve-pas, .stepper button, input[type="checkbox"], input[type="radio"]';
function brancherToucher() {
  addEventListener("pointerdown", Son.deverrouiller, { capture: true, passive: true });
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest?.(CHOIX);
    if (!el || el.disabled || el.closest(".rt-reglages, .rt-rayon")) return;
    Son.niveau(1);
    el.classList.remove("rt-tap"); void el.offsetWidth; el.classList.add("rt-tap");
    setTimeout(() => el.classList?.remove("rt-tap"), 400);
  }, true);
}

// ---------- Retour du réseau : l'abeille ----------
const ABEILLE = '<svg viewBox="0 0 44 34" width="44" height="34" aria-hidden="true"><g class="rt-ailes"><ellipse cx="18" cy="9" rx="8" ry="9"/><ellipse cx="27" cy="10" rx="6" ry="7"/></g><ellipse class="rt-corps" cx="22" cy="22" rx="14" ry="9"/><rect x="18" y="13" width="4" height="18"/><rect x="25" y="13.5" width="4" height="17"/><circle cx="35" cy="21" r="4.5"/></svg>';
export function abeille() {
  Son.jouer("envoi"); Son.vibrer("envoi");
  if (Son.maintenant().anim === "aucune") return;
  document.querySelectorAll(".rt-abeille").forEach((x) => x.remove());
  const b = document.createElement("div");
  b.className = "rt-abeille"; b.innerHTML = ABEILLE;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1800);
}

// ---------- Visite express : le rayon des points regardés ----------
let rayonVu = { id: null, n: 0 };
function rayonExpress() {
  const f = S.ve, place = document.querySelector(".wrap .ve-api");
  if (S.route !== "visiteexpress" || !f || !place) return;
  document.querySelector(".rt-progres")?.remove();
  const faits = CHAMPS_EXPRESS.map((c) => etatChamp(c.k, f.valeurs, f.depart, f.touches) !== "non vu");
  const nb = faits.filter(Boolean).length, total = faits.length, avant = rayonVu.id === f.id ? rayonVu.n : nb;
  const cases = Array.from({ length: total }, (_, i) => `<i class="${i < nb ? "on" : ""}${i < nb && i >= avant ? " rt-pop" : ""}"></i>`).join("");
  place.insertAdjacentHTML("afterend", `<div class="rt-progres" role="img" aria-label="${nb} points regardés sur ${total}"><span class="rt-cases" aria-hidden="true">${cases}</span><b>${nb === total ? "Tout est regardé" : `${nb} sur ${total} regardés`}</b></div>`);
  if (nb === total && avant < total) Son.jouer("ok");
  rayonVu = { id: f.id, n: nb };
}

// ---------- Fin de tournée ----------
const lireJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const ecrireJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function bilanTournee() {
  const b = S.tn?.bilan;
  if (S.route !== "tournee" || S.tn?.etape !== "bilan" || !b) return;
  const liste = document.querySelector(".tn-remplit"), chiffres = document.querySelector(".tn-chiffres");
  if (!b.rtFete) {
    b.rtFete = true;
    // Comparaison avec la dernière tournée du même rucher, au même nombre de ruches vues.
    const nb = b.ids.filter((id) => b.fiches[id]?.etat === "enregistree").length;
    const rucher = (S.d.ruches.find((r) => r.id === b.ids[0]) || {}).rucher || "";
    const cle = `apidoo-tournee-${rucher}`, prec = lireJson(cle);
    if (prec && prec.nb === nb && prec.minutes > b.minutes) b.rtMieux = `${prec.minutes - b.minutes} min de moins que la dernière fois`;
    if (nb) ecrireJson(cle, { nb, minutes: b.minutes });
    const lignes = liste ? [...liste.querySelectorAll(".tn-l")] : [];
    if (liste) { lignes.forEach((l, i) => l.style.setProperty("--i", i)); liste.classList.add("rt-allume"); }
    const hexes = lignes.filter((l) => l.querySelector(".tn-hex"));
    hexes.forEach((_, i) => setTimeout(() => { Son.note(i); Son.vibrer("tap"); }, 300 + i * 150));
    setTimeout(() => Son.niveau(3), 450 + hexes.length * 150);
  }
  if (b.rtMieux && chiffres && !document.querySelector(".rt-mieux")) chiffres.insertAdjacentHTML("afterend", `<p class="rt-mieux">${esc(b.rtMieux)}</p>`);
}

// ---------- Récolte : le pot qui se remplit ----------
const fmt = (x) => (typeof n === "function" ? n(x, 1) : String(Math.round(x * 10) / 10).replace(".", ","));
/** Écran de fête après une récolte : { kg, miel, date }. Appelé par v3.js une fois la récolte enregistrée. */
export function recolte({ kg, miel, date } = {}) {
  kg = Number(kg) || 0;
  if (!(kg > 0)) return;
  Son.jouer("miel"); Son.vibrer("miel");
  setTimeout(() => Son.niveau(3), 1500);
  const s = saison(S.d, Number(String(date || "").slice(0, 4)) || new Date().getFullYear());
  const obj = Number(typeof cfg === "function" ? cfg().objectif_recolte : 0) || 0;
  const pct = (x) => Math.max(0, Math.min(100, Math.round((x / obj) * 100)));
  const pots = Math.floor(kg / 0.5);
  const anim = Son.maintenant().anim !== "aucune";
  document.querySelector(".rt-fete")?.remove();
  const el = document.createElement("div");
  el.className = "rt-fete rt-recolte";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Récolte enregistrée");
  el.innerHTML = `<div class="rt-fete-c">
    <div class="rt-pot" aria-hidden="true"><i class="rt-coulee"></i><i class="rt-couvercle"></i><i class="rt-col"></i>
      <div class="rt-bocal"><div class="rt-miel"><i class="rt-vague"></i></div><div class="rt-kg"><b id="rtKg">${anim ? "0" : esc(fmt(kg))}</b><small>kg</small></div></div></div>
    <h2>Belle récolte !</h2>
    <p class="rt-sous">${esc([miel || "Miel", fmt(kg) + " kg", typeof dfr === "function" && date ? dfr(date) : ""].filter(Boolean).join(" · "))}</p>
    <section class="rt-saison"><div class="rt-saison-l"><b>Saison ${s.annee}</b><span><em>+${esc(fmt(kg))} kg</em><b>${esc(fmt(s.recolte))} kg</b></span></div>
      ${obj ? `<div class="rt-jauge" style="--de:${pct(s.recolte - kg)}%;--a:${pct(s.recolte)}%"><i></i></div><div class="rt-saison-l small"><span>Objectif : ${esc(fmt(obj))} kg</span><span>${pots ? `≈ ${pots} pots de 500 g` : ""}</span></div>`
        : `<p class="small">${pots ? `≈ ${pots} pots de 500 g. ` : ""}Fixe un objectif de récolte dans Réglages pour suivre ta saison.</p>`}</section>
    <button type="button" class="btn honey block" data-act="rtfermer">Continuer</button></div>`;
  document.body.appendChild(el);
  el.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fermer(); });
  el.querySelector("button")?.focus({ preventScroll: true });
  // Jamais bloquant : le voile laisse passer les touchers et l'écran se ferme seul.
  setTimeout(() => { if (el.isConnected) el.remove(); }, 6000);
  if (anim) {
    const debut = performance.now() + 200, z = el.querySelector("#rtKg");
    const pas = (t) => {
      if (!z.isConnected) return;
      const p = Math.max(0, Math.min(1, (t - debut) / 1600));
      z.textContent = fmt(kg * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
}
export function fermer() { document.querySelector(".rt-fete")?.remove(); }

export function apresRendu() {
  if (typeof S !== "undefined" && S.route !== "dash") document.querySelector(".rt-jalon")?.remove(); // l'annonce reste sur l'accueil
  rayonExpress();
  bilanTournee();
}

/** Installé une fois, au chargement (src/domaines/retours/ecrans.js). */
export function installer() {
  Son.appliquerClasses();
  matchMedia?.("(prefers-reduced-motion:reduce)").addEventListener?.("change", Son.appliquerClasses);
  brancherToucher();
  // toast() d'app.js existe déjà : les modules s'exécutent après les scripts « defer ».
  brancherBulles();
  window.Retours = { niveau: Son.niveau, jouer: Son.jouer, vibrer: Son.vibrer, taire, recolte, abeille, fermer };
}
