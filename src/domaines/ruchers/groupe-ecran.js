// Apiviz — actions groupées depuis la sélection des colonies (IT-10, AP-US-046, migration 034).
// Feuille « N colonies choisies » : Poser une hausse, Changer l'état ou Ajouter une tâche, puis un bouton qui dit ce
// qui va se passer (« Poser une hausse sur 10 colonies »). L'effet se voit tout de suite ; un message « Annuler · 5 s »
// reste en haut de l'écran, et l'action n'est envoyée qu'à la fin du délai. Elle est gardée sur le téléphone dès le
// départ (clé apidoo-groupe-attente) : si l'application se ferme pendant les 5 s, elle part au prochain lancement.
// L'envoi passe par la file d'envoi (appliquer_action_groupee) ; sans réseau, il part au retour du réseau.
// Règles : src/domaines/colonies/groupe.js. Globales d'app.js lues à l'appel : S, esc, render, toast, refresh, $sheet,
// $sheetForm, HL, sb.
import * as G from "../colonies/groupe.js";

const CLE = "apiviz-groupe-attente";
const e = (t) => esc(t);
const ic = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const CROIX = "M18 6L6 18M6 6l12 12", COCHE = "M5 12l5 5 9-10";
const BASE_ANCIENNE = /PGRST202|Could not find the function|appliquer_action_groupee/;
const pluriel = (n) => `${n} colonie${n > 1 ? "s" : ""}`;
const exCourante = () => (typeof EX != "undefined" && EX.courante?.()) || "";
// Gardée avec son exploitation : elle ne part que dans celle où elle a été faite.
const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || "null"); } catch { return null; } };
const garder = (p) => { try { p ? localStorage.setItem(CLE, JSON.stringify({ p, ex: exCourante() })) : localStorage.removeItem(CLE); } catch { /* navigation privée */ } };

let enCours = null; // { p, avant, minuterie, decompte }

// ---------- Feuille ----------
const st = () => S.ag;
function libelleBouton(s) {
  const n = s.ids.length;
  if (s.action === "hausse") return `Poser une hausse sur ${pluriel(n)}`;
  if (s.action === "etat") return `Passer ${pluriel(n)} en « ${s.etat || "…"} »`;
  return `Ajouter la tâche à ${pluriel(n)}`;
}
function dessiner() {
  const s = st();
  if (!s) return;
  $sheetForm.onsubmit = (ev) => { ev.preventDefault(); valider(); };
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>${pluriel(s.ids.length)} choisie${s.ids.length > 1 ? "s" : ""}</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic(CROIX, 22)}</button></div>
    <div class="field"><div class="t">Que veux-tu faire ?</div><div class="chips ag-actions" role="group" aria-label="Action">${Object.entries(G.ACTIONS).map(([k, l]) => `<button type="button" class="${s.action === k ? "on" : ""}" aria-pressed="${s.action === k}" data-act="agchoix" data-v="${k}">${l}</button>`).join("")}</div></div>
    ${s.action === "etat" ? `<div class="field"><div class="t">Nouvel état</div><div class="seg" role="group" aria-label="Nouvel état">${G.ETATS.map((x) => `<button type="button" class="${s.etat === x ? "on" : ""}" aria-pressed="${s.etat === x}" data-act="agetat" data-v="${e(x)}">${e(x)}</button>`).join("")}</div></div>` : ""}
    ${s.action === "tache" ? `<label>Tâche<input id="ag_titre" maxlength="200" value="${e(s.titre || "")}" placeholder="Poser la grille à reine" required></label>
      <label>À faire avant le<input id="ag_echeance" type="date" value="${e(s.echeance || "")}"></label>` : ""}
    <p class="small">Tu pourras annuler pendant 5 secondes.${typeof HL != "undefined" && HL.horsLigne?.() ? " Sans réseau, l’action part au retour du réseau." : ""}</p>
    <button class="btn main block">${e(libelleBouton(s))}</button>`;
  if (!$sheet.open) $sheet.showModal();
}

export function ouvrir(ids) {
  if (!ids.length) return;
  S.ag = { ids: [...ids], action: "hausse", etat: "", titre: "", echeance: "" };
  $sheet.addEventListener("close", () => { S.ag = null; }, { once: true });
  dessiner();
}

function valider() {
  const s = st();
  if (!s) return;
  if (s.action === "tache") {
    s.titre = $sheetForm.querySelector("#ag_titre")?.value || "";
    s.echeance = $sheetForm.querySelector("#ag_echeance")?.value || "";
  }
  const valeur = s.action === "etat" ? { etat: s.etat } : s.action === "tache" ? { titre: s.titre, echeance: s.echeance } : { delta: 1 };
  const err = G.verifier(s.action, s.ids, valeur);
  if (err) return toast(err, true);
  const p = G.preparer(crypto.randomUUID(), s.action, s.ids, valeur);
  S.ag = null;
  $sheet.close();
  if (typeof S.tb == "object" && S.tb) { S.tb.sel = []; S.tb.choix = false; }
  lancer(p);
}

// ---------- Délai d'annulation, puis envoi ----------
function bulle(texte) {
  document.querySelector(".ag-toast")?.remove();
  const b = document.createElement("div");
  b.className = "ag-toast";
  b.setAttribute("role", "status");
  b.innerHTML = `${ic(COCHE)}<span class="ag-t">${e(texte)}</span><button type="button" class="ag-annuler" data-act="agannuler">Annuler · <span class="ag-s">5</span> s</button>`;
  document.body.appendChild(b);
  return b;
}

function lancer(p) {
  if (enCours) envoyer(); // une action précédente encore dans son délai part tout de suite
  const { apres, avant } = G.effet(S.d.ruches, p);
  G.appliquer(S.d.ruches, apres);
  // L'action est marquée « dans son délai » AVANT le rendu : sinon reprendre() (après chaque rendu) la trouverait
  // gardée sur le téléphone sans délai en cours et l'enverrait aussitôt, sans laisser le temps d'annuler.
  let reste = G.DELAI_ANNULER_MS / 1000;
  enCours = {
    p, avant,
    decompte: setInterval(() => { reste -= 1; const s = document.querySelector(".ag-toast .ag-s"); if (s) s.textContent = String(Math.max(reste, 0)); }, 1000),
    minuterie: setTimeout(envoyer, G.DELAI_ANNULER_MS),
  };
  garder(p);
  render();
  bulle(G.message(p));
}

function finir() {
  if (!enCours) return null;
  clearTimeout(enCours.minuterie); clearInterval(enCours.decompte);
  document.querySelector(".ag-toast")?.remove();
  const x = enCours; enCours = null;
  return x;
}

export function annuler() {
  const x = finir();
  if (!x) return;
  G.appliquer(S.d.ruches, x.avant);
  garder(null);
  render();
  toast("Action annulée.");
}

async function envoyer(p = null, avant = []) {
  if (!p) { const x = finir(); if (!x) return; p = x.p; avant = x.avant; }
  const appel = typeof HL != "undefined" ? HL.rpc : (n, a) => sb.rpc(n, a);
  let r;
  try { r = await appel("appliquer_action_groupee", { p }); } catch (err) { r = { error: err }; }
  if (r.error) {
    // Refus (droits, base pas à jour) : rien n'a été appliqué, l'écran revient comme avant.
    garder(null);
    G.appliquer(S.d.ruches, avant);
    render();
    return toast(BASE_ANCIENNE.test(`${r.error.code} ${r.error.message}`) ? "La base doit être mise à jour pour les actions groupées (migration 034)." : r.error.message || "L’action n’a pas pu être enregistrée.", true);
  }
  garder(null);
  if (r.local) {
    // Gardée dans la file d'envoi : offline.js la remontre à chaque rechargement, jusqu'à l'envoi.
    if (p.action === "tache") G.appliquerEnAttente(S.d, "appliquer_action_groupee", p);
    typeof HL != "undefined" && HL.garderDonnees?.();
    render();
  } else if (typeof refresh == "function") await refresh();
}

/** Au lancement : une action restée dans son délai d'annulation (application fermée) part maintenant. */
export function reprendre() {
  const g = lire();
  if (!g?.p || enCours || !S.session || !Array.isArray(S.d?.ruches) || (g.ex || "") !== exCourante()) return;
  garder(null);
  envoyer(g.p, []);
}

export const actions = {
  agchoix: (v) => { const s = st(); if (!s || !G.ACTIONS[v]) return; if (s.action === "tache") s.titre = $sheetForm.querySelector("#ag_titre")?.value || s.titre; s.action = v; dessiner(); },
  agetat: (v) => { const s = st(); if (!s || !G.ETATS.includes(v)) return; s.etat = v; dessiner(); },
  agannuler: () => annuler(),
};

if (typeof window != "undefined" && window.Noyau?.crochets) window.Noyau.crochets.sur("apresRendu", "groupe-attente", reprendre);
