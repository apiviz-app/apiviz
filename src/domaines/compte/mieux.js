// Apiviz — mieux connaître ses utilisateurs (v5.86, maquette « apiviz — Onboarding irréprochable », écran 11 et tableau
// de bord « Mes utilisateurs », validés par Pierre-Louis le 24 nov. 2026 ; migration 039).
//   - Carte « Pour mieux te connaître » sur l'accueil, 14 jours après l'inscription : une question à la fois
//     (ancienneté, statut, tranche d'âge, attente), « Passer », « Ne plus demander » ; à la fin, la comparaison avec son
//     département (comparaison_departement, à partir de 5 personnes).
//   - Jours d'utilisation : la rubrique de chaque écran ouvert, envoyée par noter_activite() (rien si la personne a
//     refusé les statistiques ; le serveur le vérifie aussi).
//   - Tableau de bord « Mes utilisateurs » (route utilisateurs), réservé à l'équipe Apiviz (est_admin_apiviz), et sa
//     ligne dans Réglages.
// Sans 039 : pas de carte, rien de noté, pas de tableau de bord. Globales lues à l'appel : S, sb, esc, shell, ES, go,
// render, toast, fail, PF.
import * as R from "./regles-mieux.js";
import { lieu } from "./regles-profil.js";

const e = (t) => (typeof esc == "function" ? esc(t) : String(t ?? ""));
const email = () => String(S.session?.user?.email || "").toLowerCase();
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } return v; };
const cleFin = () => `apiviz-mieux-fin-${email()}`;
const st = { repondues: 0, passees: [], comparaison: null, vue: false, admin: null, adminDe: "", stats: null, jours: 30, chargement: false, erreur: "", activite: { jour: "", envoyees: new Set(), attente: new Set(), minuterie: null, coupe: false } };

const profil = () => window.PF?.moi?.() || null;
const sans039 = () => !!window.PF?.etat?.()?.sans039;
const exemple = () => S.session?.user?.id === "exemple" || !!document.querySelector(".ex-bandeau");

// ---------- Carte « Pour mieux te connaître » ----------
function questionsDeLaCarte() {
  const p = profil() || {};
  return R.restantes(p).filter((x) => !st.passees.includes(x.k));
}

function carte() {
  const p = profil();
  if (st.vue && st.comparaison !== undefined) return carteMerci();
  if (!R.carteDue({ profil: p, finLocale: !!memo(cleFin()), sans039: sans039() })) return "";
  const qs = questionsDeLaCarte();
  if (!qs.length) { finir(); return carteMerci(); }
  const total = R.restantes(p).length + st.passees.length + st.repondues, faites = total - qs.length, q = qs[0];
  return `<section class="card mc" aria-live="polite"><div class="u-entete"><h2>Pour mieux te connaître</h2><span class="pp-compte">${faites + 1} sur ${total}</span></div>
    <div class="mc-barres" aria-hidden="true">${Array.from({ length: total }, (_, j) => `<i class="${j < faites ? "on" : ""}"></i>`).join("")}</div>
    <b class="mc-q">${e(q.q)}</b>
    <div class="mc-choix">${q.choix.map(([v, t]) => `<button type="button" class="mc-c" data-act="mcrepondre" data-k="${q.k}" data-v="${e(v)}">${e(t)}</button>`).join("")}</div>
    <span class="mc-pourquoi">${e(q.pourquoi)}</span>
    <div class="mc-bas"><button type="button" class="link" data-act="mcpasser" data-v="${q.k}">Passer</button><button type="button" class="link" data-act="mcstop">Ne plus demander</button></div>
  </section>`;
}

function carteMerci() {
  const c = st.comparaison, p = profil() || {};
  const t = R.texteComparaison(c, lieu(p.code_postal));
  if (!st.vue) return "";
  return `<section class="card mc mc-merci" aria-live="polite"><span class="tag ok">Merci ${e(p.prenom || "")}</span>
    ${t ? `<b class="mc-q">${e(t.titre)}</b><span class="mc-pourquoi">Apiculteurs d'Apiviz du département, chiffres d'ensemble</span>
      <div class="mc-comp"><div><span>Toi</span><b>${e(t.moi)}</b></div><i role="img" aria-label="${e(t.moi)}"><i style="width:${t.part}%"></i></i>
      <div><span>En moyenne dans le département</span><b>${e(t.moyenne)}</b></div><i class="gris" role="img" aria-label="${e(t.moyenne)}"><i style="width:${t.partMoyenne}%"></i></i></div>
      <span class="mc-pourquoi">Affiché parce qu'au moins 5 apiculteurs du département ont répondu (${t.personnes}).</span>`
    : `<p class="mc-pourquoi">Tes réponses aident à améliorer Apiviz. La comparaison avec ton département viendra quand au moins 5 apiculteurs y auront répondu.</p>`}
    <div class="mc-bas"><span class="small">Modifiable dans Réglages › Mon profil.</span><button type="button" class="link" data-act="mcfermer">Fermer</button></div></section>`;
}

async function finir(stop = false) {
  memo(cleFin(), new Date().toISOString());
  try { await window.PF?.enregistrer?.({ mieux_connaitre_fin: new Date().toISOString() }); } catch { /* gardé sur l'appareil */ }
  if (stop) { st.vue = false; return render(); }
  st.vue = true; st.comparaison = null;
  try { const r = await sb.rpc("comparaison_departement"); st.comparaison = r.error ? null : r.data; } catch { st.comparaison = null; }
  if (S.route === "dash") render();
}

function placerCarte() {
  if (S.route !== "dash" || !S.d || exemple() || document.querySelector(".mc")) return;
  const html = carte();
  if (!html) return;
  const apres = document.querySelector(".pp-aide") || document.querySelector(".dm-guide.pp") || document.querySelector(".ac-api");
  if (apres) apres.insertAdjacentHTML("afterend", html);
}

// ---------- Jours d'utilisation ----------
function noter() {
  const a = st.activite;
  if (a.coupe || !S.session || !S.d || exemple() || sans039() || profil()?.stats_ok === false) return;
  const r = R.rubriqueDe(S.route);
  if (!r) return;
  const jour = new Date().toISOString().slice(0, 10);
  if (a.jour !== jour) { a.jour = jour; a.envoyees = new Set(); }
  if (a.envoyees.has(r) || a.attente.has(r)) return;
  a.attente.add(r);
  clearTimeout(a.minuterie);
  a.minuterie = setTimeout(envoyer, 4000);
}
async function envoyer() {
  const a = st.activite, rubriques = [...a.attente];
  if (!rubriques.length || navigator.onLine === false) return;
  a.attente = new Set();
  const plateforme = typeof window.Plateforme?.nom == "string" ? window.Plateforme.nom : "web";
  try {
    const r = await sb.rpc("noter_activite", { p_rubriques: rubriques, p_plateforme: ["web", "ios", "android"].includes(plateforme) ? plateforme : "web" });
    if (r.error) { if (/noter_activite|PGRST202|404|function/i.test(`${r.error.code} ${r.error.message}`)) a.coupe = true; return; }
    rubriques.forEach((x) => a.envoyees.add(x));
  } catch { rubriques.forEach((x) => a.attente.add(x)); }
}

// ---------- Tableau de bord « Mes utilisateurs » ----------
async function estAdmin() {
  if (st.adminDe === email() && st.admin !== null) return st.admin;
  st.adminDe = email();
  try { const r = await sb.rpc("est_admin_apiviz"); st.admin = !r.error && r.data === true; } catch { st.admin = false; }
  return st.admin;
}

const FL = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
/** Réglages : « Mes utilisateurs (équipe) », pour les administrateurs seulement. */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector('[data-act="mcadmin"]')) return;
  const poser = () => {
    if (S.route !== "reglages" || document.querySelector('[data-act="mcadmin"]')) return;
    document.querySelector(".rg-donnees")?.insertAdjacentHTML("beforeend", `<button type="button" class="rg-l" data-act="mcadmin"><span class="rg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></span><span class="rg-t"><b>Mes utilisateurs</b><span>Équipe Apiviz : statistiques d'ensemble</span></span>${FL}</button>`);
  };
  if (st.admin === true && st.adminDe === email()) return poser();
  if (st.admin === null || st.adminDe !== email()) estAdmin().then((ok) => ok && poser());
}

async function chargerStats() {
  st.chargement = true; st.erreur = "";
  try {
    const r = await sb.rpc("admin_stats_utilisateurs", { p_jours: st.jours });
    if (r.error) throw r.error;
    st.stats = r.data;
  } catch (err) {
    st.stats = null;
    st.erreur = /42501|Réservé/.test(`${err.code} ${err.message}`) ? "Réservé à l'équipe Apiviz." : /admin_stats|PGRST202|function/i.test(`${err.code} ${err.message}`) ? "La base doit être mise à jour (migration 039)." : "Les chiffres n'ont pas pu être chargés.";
  } finally { st.chargement = false; }
  if (S.route === "utilisateurs") render();
}

const ligneBarre = (x, colonne = false) => `<div class="mu-r${colonne ? " w" : ""}" title="${e(`${x.nom} : ${x.texte}${x.detail ? ` · reviennent ${x.detail}` : ""}`)}"><span>${e(x.nom)}</span><span class="mu-t"><i style="width:${x.part}%"></i></span><span class="mu-v">${e(x.texte)}</span>${colonne ? `<span class="mu-v mu-d">${e(x.detail)}</span>` : ""}</div>`;
const vide = '<p class="small">Pas encore assez de réponses (groupes de moins de 5 personnes masqués).</p>';

function ecranUtilisateurs() {
  const periodes = [[30, "30 derniers jours"], [365, "12 mois"], [3650, "Depuis le début"]];
  const filtre = `<div class="mu-periodes" role="group" aria-label="Période">${periodes.map(([j, t]) => `<button type="button" class="btn sm${st.jours === j ? " main" : ""}" data-act="mcperiode" data-v="${j}" aria-pressed="${st.jours === j}">${t}</button>`).join("")}</div>`;
  if (st.admin === false) { shell("Mes utilisateurs", "", "", `<div class="mu"><p class="small">Réservé à l'équipe Apiviz.</p></div>`); return ES.retour("go", "reglages", "‹ Réglages"); }
  if (st.admin === null) { estAdmin().then(() => S.route === "utilisateurs" && render()); }
  if (!st.stats && !st.chargement && !st.erreur && st.admin) chargerStats();
  const t = R.tableau(st.stats);
  const corps = st.erreur ? `<p class="ob-err" role="alert">${e(st.erreur)}</p>` : !t ? '<p class="small" role="status">Chargement…</p>' : `
    <div class="mu-kpi">${t.chiffres.map((c) => `<div class="card mu-k"><span>${e(c.nom)}</span><b>${e(c.valeur)}</b><span class="small">${e(c.detail)}</span></div>`).join("")}</div>
    <div class="mu-grille">
      <section class="card mu-s"><h2>Parcours d'arrivée</h2><p class="small">Inscrits des ${st.stats.jours} derniers jours, étape par étape</p>${t.parcours.length ? t.parcours.map((x) => ligneBarre(x)).join("") : vide}${t.perte ? `<p class="mu-note">${e(t.perte)}</p>` : ""}</section>
      <section class="card mu-s"><h2>Comment ils nous ont connus</h2><p class="small">Part des inscrits ; à droite, part qui revient après 30 jours</p>${t.sources.length ? `<div class="mu-r w mu-en"><span>Source</span><span></span><span class="mu-v">Inscrits</span><span class="mu-v">Reviennent</span></div>${t.sources.map((x) => ligneBarre(x, true)).join("")}` : vide}${t.sourcesAutres ? `<p class="small">${t.sourcesAutres} réponses dans de petits groupes, non montrées.</p>` : ""}</section>
    </div>
    <div class="mu-grille trois">
      <section class="card mu-s"><h2>Qui sont-ils ?</h2><p class="small">Nombre de colonies</p>${t.colonies.length ? t.colonies.map((x) => ligneBarre(x)).join("") : vide}
        ${t.vendent !== null && t.vendent !== undefined ? `<div class="mu-r mu-sep"><span>Exploitations qui vendent</span><span class="mu-t"><i style="width:${t.vendent}%"></i></span><span class="mu-v">${t.vendent} %</span></div>` : ""}
        ${t.attentes.length ? `<p class="small mu-sep">Ce qu'ils attendent d'abord</p>${t.attentes.map((x) => ligneBarre(x)).join("")}` : ""}</section>
      <section class="card mu-s"><h2>Où sont-ils ?</h2><p class="small">Départements les plus représentés</p>${t.departements.length ? t.departements.map((x) => ligneBarre(x)).join("") : vide}</section>
      <section class="card mu-s"><h2>Ce qu'ils utilisent</h2><p class="small">Part des actifs de la période qui ont ouvert chaque rubrique</p>${t.rubriques.length ? t.rubriques.map((x) => ligneBarre(x)).join("") : vide}</section>
    </div>
    <div class="mu-grille">
      <section class="card mu-s"><h2>Taux de réponse aux questions</h2><p class="small">Pour savoir quelle question gêne ou ne sert à rien</p>${t.reponses.length ? t.reponses.map((x) => ligneBarre(x)).join("") : vide}</section>
      <section class="card mu-s mu-garde"><h2>Garde-fous</h2><ul>
        <li>Statistiques d'ensemble uniquement : aucun nom, aucune adresse sur cet écran.</li>
        <li>Tout groupe de moins de 5 personnes est masqué ou regroupé.</li>
        <li>${t.refus !== null && t.refus !== undefined ? `Les ${t.refus} % qui ont désactivé « statistiques » ne sont pas comptés.` : "Les personnes qui ont désactivé « statistiques » ne sont pas comptées."}</li>
        <li>Réponses facultatives ; une réponse effacée disparaît des chiffres.</li>
        <li>Réservé aux administrateurs Apiviz.</li></ul></section>
    </div>`;
  shell("Mes utilisateurs", "", "", `<div class="mu"><div class="mu-tete"><span class="small">Équipe Apiviz</span>${filtre}</div>${corps}</div>`);
  ES.retour("go", "reglages", "‹ Réglages");
}

export const ecrans = [
  { id: "utilisateurs", titre: "Mes utilisateurs", rubrique: "plus", rendu: () => ecranUtilisateurs() },
];

export const actions = {
  mcrepondre: async (v, k) => {
    if (!R.QUESTIONS.some((x) => x.k === k)) return;
    try { await window.PF?.enregistrer?.({ [k]: v }); st.repondues++; } catch (err) { return fail(err); }
    window.Retours?.niveau?.(1);
    render();
  },
  mcpasser: (k) => { st.passees.push(k); render(); },
  mcstop: () => finir(true),
  mcfermer: () => { st.vue = false; st.comparaison = undefined; render(); },
  mcadmin: () => { st.stats = null; st.erreur = ""; go("utilisateurs"); },
  mcperiode: (j) => { st.jours = Number(j) || 30; st.stats = null; st.erreur = ""; chargerStats(); render(); },
};

if (typeof window != "undefined" && window.Noyau?.crochets) {
  window.Noyau.crochets.sur("apresRendu", "mieux-connaitre", () => { placerCarte(); noter(); });
}
if (typeof window != "undefined") window.Mieux = { etat: () => st, envoyer };
