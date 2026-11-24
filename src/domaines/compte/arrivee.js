// Apiviz — parcours d'arrivée (v5.84, maquette « apiviz — Onboarding irréprochable », validée par Pierre-Louis le
// 24 nov. 2026 : « Je valide la globalité de ce que tu m'as proposé »).
//   1. Bienvenue (avant le compte, une fois par appareil) : la promesse, « Créer mon compte », « Voir une exploitation
//      d'exemple », « J'ai déjà un compte ».
//   1 bis. Faisons connaissance : API se présente en quatre diapositives animées (au rucher, au bureau, les offres de
//      la migration 029), qui défilent seules ou au toucher ; « Passer » à tout moment.
//   8. Première visite guidée (route « premierevisite ») : quatre questions avec le conseil d'API, « Pas au rucher ? ».
//   9. Bravo (route « bravo ») : jalon « Première visite », enchaîner avec la ruche suivante, rappels proposés.
//   Le compte (2), « Tu en es où ? » (3), le premier rucher (4), l'exploitation d'exemple (7) et « Mes premiers pas »
//   (10) complètent app.js, profil.js et demarrage.js.
// Globales lues à l'appel : S, sb, esc, $app, render, go, toast, fail, today, byId, cfg, loadAll, apresVisites, ACT, HL.
import * as R from "./regles-arrivee.js";
import { TYPES as TYPES_R } from "./regles-notifications.js";

const e = (t) => (typeof esc == "function" ? esc(t) : String(t ?? ""));
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } return v; };
const calme = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const st = { ecran: "bienvenue", diapo: 0, minuteur: null };
const DUREE_DIAPO = 6000;

const OK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
const PLUS = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const API_HEX = `<svg class="ar-api" width="96" height="106" viewBox="0 0 84 92" aria-hidden="true"><path d="M42 3l37 21v44L42 89 5 68V24z" fill="#E3A008"/><circle cx="31" cy="42" r="5" fill="#1E2B24"/><circle cx="53" cy="42" r="5" fill="#1E2B24"/><path d="M30 57q12 10 24 0" stroke="#1E2B24" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
const ALVEOLES = `<svg class="ar-fond" aria-hidden="true" viewBox="0 0 390 360" fill="none" stroke="currentColor" stroke-width="2"><path d="M60 40l34 20v40l-34 20-34-20V60z"/><path d="M128 40l34 20v40l-34 20-34-20V60z"/><path d="M94 100l34 20v40l-34 20-34-20v-40z"/><path d="M296 70l34 20v40l-34 20-34-20V90z"/><path d="M330 130l34 20v40l-34 20-34-20v-40z"/><path d="M262 130l34 20v40l-34 20-34-20v-40z"/><path class="ar-miel" d="M196 150l34 20v40l-34 20-34-20v-40z"/></svg>`;
const ICONE = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

// ---------- Avant le compte : bienvenue et « Faisons connaissance » ----------

function etatAccueil() {
  let invitation = "";
  let modeChoisi = false;
  try { invitation = localStorage.getItem("apidoo-invitation") || ""; modeChoisi = !!sessionStorage.getItem("dm-creer"); } catch { /* navigation privée */ }
  return { session: !!S.session, recuperation: !!S.recovery, invitation: !!invitation, message: !!S.authMsg, dejaVue: !!memo(R.CLE_BIENVENUE), modeChoisi };
}

function arreterMinuteur() { clearTimeout(st.minuteur); st.minuteur = null; }

function ecranBienvenue() {
  arreterMinuteur();
  $app.innerHTML = `<div class="ar ar-sombre" data-ecran="bienvenue">${ALVEOLES}
    <div class="ar-in">
      <p class="ar-marque">apiviz</p>
      <div class="ar-bas">
        <div class="ar-txt"><h1 class="ar-titre">Ton carnet de rucher, prêt en 2 minutes.</h1>
          <p class="ar-sous">Visites au doigt, même sans réseau. Tes colonies, tes récoltes et tes ventes au même endroit.</p></div>
        <ul class="ar-atouts">
          <li>${OK}Une visite en moins d’une minute</li><li>${OK}Marche au rucher, sans réseau</li><li>${OK}Offre Découverte gratuite</li>
        </ul>
        <div class="ar-boutons">
          <button type="button" class="btn honey block" data-act="arcreer">Créer mon compte</button>
          <button type="button" class="btn block ar-contour" data-act="arexemple">Voir une exploitation d’exemple</button>
          <button type="button" class="ar-lien" data-act="arconnexion">J’ai déjà un compte</button>
        </div>
      </div>
    </div></div>`;
}

/** Diapositives de « Faisons connaissance » : HTML de chacune (les délais d'apparition sont dans les styles). */
function diapositive(i) {
  if (i === 0) return `<div class="ar-diapo">${API_HEX}<h1 class="ar-titre ar-m" style="--d:.2s">Bonjour ! Moi, c’est API.</h1>
    <p class="ar-sous ar-m" style="--d:.4s">Je suis ton compagnon de rucher. Faisons connaissance : en 20 secondes, je te montre ce que je sais faire.</p></div>`;
  if (i === 1) {
    const l = [["M9 11V5a3 3 0 016 0v6M6 11h12l-1 9H7z", "Au doigt : reine, couvain, provisions"], ["M9 3h6v11H9zM5 11a7 7 0 0014 0", "À la voix, les mains dans la ruche"], ["M12 3l7 4v8l-7 4-7-4V7z", "Météo et tournée de chaque rucher"]];
    return `<div class="ar-diapo"><p class="ar-oeil ar-m">Au rucher</p><h1 class="ar-titre ar-m" style="--d:.1s">Une visite en moins d’une minute, même sans réseau.</h1>
      <div class="ar-cartes">${l.map(([d, t], k) => `<div class="ar-carte ar-m" style="--d:${0.35 + k * 0.2}s"><span class="ar-pastille">${ICONE(d)}</span><span>${t}</span></div>`).join("")}</div></div>`;
  }
  if (i === 2) {
    const etapes = [["M5 9h14l-1 11H6zM8 9V6a4 4 0 0 1 8 0v3", "Récolte"], ["M7 8h10l1 12H6zM8 4h8v4H8z", "Lots"], ["M8 3h8M7 6h10l1 3v11H6V9z", "Ventes"], ["M4 20V10M12 20V4M20 20v-7", "Bilan"]];
    return `<div class="ar-diapo"><p class="ar-oeil ar-m">Au bureau</p><h1 class="ar-titre ar-m" style="--d:.1s">De la ruche au pot, tout est relié.</h1>
      <div class="ar-chaine">${etapes.map(([d, t], k) => `${k ? `<span class="ar-fleche ar-m" style="--d:${0.3 + k * 0.3 - 0.15}s" aria-hidden="true">›</span>` : ""}<span class="ar-maillon ar-p" style="--d:${0.3 + k * 0.3}s">${ICONE(d)}<b>${t}</b></span>`).join("")}</div>
      <p class="ar-sous ar-m" style="--d:1.5s">Récoltes, lots, ventes et bilan de saison se remplissent avec ce que tu notes déjà au rucher.</p></div>`;
  }
  let d = 0.15;
  const ligne = (t, icone) => { d += 0.15; return `<li class="ar-l" style="--d:${d.toFixed(2)}s"><span class="ar-ok">${icone}</span>${e(t)}</li>`; };
  const cartes = R.OFFRES.map((o, k) => {
    const avant = k ? `<span class="ar-tout">Tout ${e(R.OFFRES[k - 1].nom)}, et en plus :</span>` : "";
    const html = `<div class="ar-offre ${k ? "ar-plus" : "ar-gratuit"} ar-m" style="--d:${d.toFixed(2)}s"><div class="ar-offre-t"><b>${e(o.nom)}</b><b class="ar-prix">${e(R.prixOffre(o))}</b></div>
      <span class="ar-limite">${e(R.limitesOffre(o))}</span>${avant}<ul>${o.plus.map((t) => ligne(t, k ? PLUS : OK)).join("")}</ul></div>`;
    d += 0.15;
    return html;
  }).join("");
  return `<div class="ar-diapo ar-offres"><h1 class="ar-titre ar-m">Gratuit pour commencer. Plus loin quand tu veux.</h1>${cartes}
    <p class="ar-note ar-m" style="--d:${(d + 0.1).toFixed(2)}s">Tu changes d’offre quand tu veux, tes données te suivent. Prix à l’année : 2 mois offerts.</p></div>`;
}

function ecranConnaissance() {
  arreterMinuteur();
  const i = st.diapo, dernier = i === 3, auto = !calme();
  const barres = [0, 1, 2, 3].map((k) => `<button type="button" class="ar-barre${k < i ? " faite" : k === i ? " on" : ""}" data-act="ardiapo" data-v="${k}" aria-label="Diapositive ${k + 1} sur 4"${k === i ? ' aria-current="step"' : ""}><i${k === i && auto && !dernier ? ` style="animation-duration:${DUREE_DIAPO}ms"` : ""}></i></button>`).join("");
  $app.innerHTML = `<div class="ar ar-sombre ar-histoire" data-ecran="connaissance" data-diapo="${i}">
    <div class="ar-haut"><div class="ar-barres">${barres}</div>
      <div class="ar-entete"><span class="ar-marque">apiviz</span><button type="button" class="ar-lien" data-act="arpasser">Passer</button></div></div>
    <button type="button" class="ar-scene" data-act="arsuivant" aria-label="${dernier ? "Dernière diapositive" : "Diapositive suivante"}">${diapositive(i)}</button>
    <div class="ar-pied">${dernier ? '<button type="button" class="btn honey block" data-act="arcommencer">Commencer gratuitement</button>'
      : '<button type="button" class="btn block ar-contour" data-act="arsuivant">Suivant</button>'}
      <span class="ar-aide">${dernier ? "Sans carte bancaire : l’offre Découverte est gratuite." : "Touche l’écran pour avancer"}</span></div>
  </div>`;
  if (auto && !dernier) st.minuteur = setTimeout(() => { if (document.querySelector('[data-ecran="connaissance"]')) { st.diapo = Math.min(3, st.diapo + 1); ecranConnaissance(); } }, DUREE_DIAPO);
}

/** Fin de la bienvenue : la page de connexion, en mode « Créer mon compte » ou « Se connecter ». */
function versCompte(mode) {
  arreterMinuteur();
  memo(R.CLE_BIENVENUE, "1");
  S.authMode = mode;
  S.authMsg = "";
  st.ecran = "bienvenue"; st.diapo = 0;
  render();
}

function avantRendu() {
  if (S.session || S.recovery) { arreterMinuteur(); return; }
  if (!R.doitAccueillir(etatAccueil())) return;
  if (st.ecran === "connaissance") ecranConnaissance(); else ecranBienvenue();
  return true;
}
if (typeof window != "undefined" && window.Noyau?.crochets) window.Noyau.crochets.sur("avantRendu", "arrivee", avantRendu);

// ---------- Première visite guidée (écran 8) ----------

const prenom = () => (window.PF?.prenom?.() || "").trim();
const nomRucher = (r) => r?.rucher || (S.d?.ruchers || []).find((x) => x.id === r?.rucher_id)?.nom || "";
const premiereRuche = () => (S.d?.ruches || []).filter((r) => !r.sortie).find((r) => !(S.d.visites || []).some((v) => v.ruche_id === r.id)) || (S.d?.ruches || [])[0];

/** Ouvre la visite guidée d'une ruche (la première sans visite, par défaut). */
export function ouvrirVisite(rucheId) {
  const r = (rucheId && byId(S.d.ruches, rucheId)) || premiereRuche();
  if (!r) { toast("Ajoute d’abord une ruche", true); return; }
  S.arVisite = { ruche_id: r.id, i: 0, reponses: [], debut: Date.now(), premiere: !(S.d.visites || []).length, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) };
  go("premierevisite");
}

function ecranVisite() {
  const f = S.arVisite, r = f && byId(S.d.ruches, f.ruche_id);
  if (!r) { go("dash"); return; }
  const fini = f.i >= R.QUESTIONS_VISITE.length, q = R.QUESTIONS_VISITE[Math.min(f.i, R.QUESTIONS_VISITE.length - 1)];
  const duree = Math.max(1, Math.round((Date.now() - f.debut) / 1000));
  const dureeTxt = duree < 60 ? `${duree} s` : `${Math.floor(duree / 60)} min ${String(duree % 60).padStart(2, "0")} s`;
  const barres = R.QUESTIONS_VISITE.map((_, k) => `<span class="${k < f.reponses.length ? "on" : ""}"></span>`).join("");
  const faits = f.reponses.filter((x) => x.i !== null).map((x) => R.QUESTIONS_VISITE.find((y) => y.k === x.k).choix[x.i].t);
  const choix = fini ? "" : `<div class="ar-choix" role="group" aria-label="${e(q.question)}">${q.choix.map((c, k) => `<button type="button" class="ar-choisir" data-act="arrepondre" data-v="${k}"><b>${e(c.t)}</b>${c.d ? `<span>${e(c.d)}</span>` : ""}</button>`).join("")}</div>
    <button type="button" class="ar-lien sombre" data-act="arrepondre" data-v="">Passer cette question</button>`;
  $app.innerHTML = `<div class="ar ar-clair" data-ecran="premierevisite">
    <header class="ar-tete"><button type="button" class="ar-icone" data-act="arfermervisite" aria-label="Fermer">${ICONE("M6 6l12 12M18 6L6 18")}</button>
      <b>${e(r.nom)}${nomRucher(r) ? ` · ${e(nomRucher(r))}` : ""}</b><span class="ar-icone" aria-hidden="true"></span></header>
    <main class="ar-corps">
      <div class="ar-etape"><div class="ar-prog">${barres}</div><span class="ar-oeil-c">${f.premiere ? "Ta première visite" : "Visite guidée"} · question ${fini ? 4 : f.i + 1} sur 4</span></div>
      <section class="ar-conseil"><span class="ar-api-mini" aria-hidden="true">API</span><span>${e(fini ? "Les prochaines fois, la visite express repartira de celle-ci : tu ne toucheras que ce qui a changé." : q.conseil)}</span></section>
      <h1 class="ar-question">${e(fini ? `C’est tout ! ${dureeTxt}.` : q.question)}</h1>
      ${choix}
      ${faits.length ? `<div class="ar-faits">${faits.map((t) => `<span class="ar-fait">${e(t)}</span>`).join("")}</div>` : ""}
      <div class="ar-fin">${fini ? '<button type="button" class="btn main block" data-act="arenregistrer">Enregistrer la visite</button>' : ""}
        ${f.premiere ? '<button type="button" class="ar-lien sombre" data-act="arplustard">Pas au rucher ? Programmer ma première visite</button>' : ""}</div>
    </main></div>`;
}

async function enregistrerVisite(_v, _k, bouton) {
  const f = S.arVisite;
  if (!f || S.busy) return;
  const p = R.chargeVisite({ id: f.id, ruche_id: f.ruche_id, date_visite: today(), reponses: f.reponses, debut: f.debut });
  if (bouton) bouton.disabled = true;
  S.busy = true;
  try {
    const appel = typeof HL != "undefined" ? HL.rpc("creer_visite", { p }) : sb.rpc("creer_visite", { p });
    const { data: vid, error, local } = await appel;
    if (error) throw error;
    if (typeof apresVisites == "function") await apresVisites([{ ...p, id: vid || p.id }], local);
    S.arBravo = { ruche_id: f.ruche_id, premiere: f.premiere, local: !!local };
    S.arVisite = null;
    window.Retours?.niveau?.(3);
    go("bravo");
  } catch (err) { fail(err); }
  finally { S.busy = false; if (bouton?.isConnected) bouton.disabled = false; }
}

/** « Pas au rucher ? » : une tâche pour demain, « Première visite de Ruche 1 », puis l'accueil. */
async function programmer() {
  const f = S.arVisite, r = f && byId(S.d.ruches, f.ruche_id);
  const demain = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  try {
    const t = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), titre: `Première visite de ${r?.nom || "ma ruche"}`, echeance: demain, ruche_id: r?.id || null };
    const res = await sb.from("taches").insert(t);
    if (res.error) throw res.error;
    S.arVisite = null;
    S.route = "dash";
    await loadAll();
    render();
    toast("C’est noté pour demain, dans l’agenda");
  } catch (err) { fail(err); }
}

// ---------- Bravo et rappels (écran 9) ----------

const PREFS_RAPPELS = "apiviz-rappels-envoyes";
export const prefsRappels = () => { try { return { visites: true, meteo: true, saison: true, ...JSON.parse(memo(PREFS_RAPPELS) || "{}") }; } catch { return { visites: true, meteo: true, saison: true }; } };
const TYPES_RAPPELS = TYPES_R; // regles-notifications.js (v5.87 : mêmes types pour les rappels app fermée)

/** Bloc « Qu'apiviz te prévienne au bon moment ? » : exemple, trois types, deux rappels par semaine au plus. */
export function blocRappels() {
  const p = prefsRappels();
  return `<section class="ar-rappels"><h2>Qu’apiviz te prévienne au bon moment ?</h2>
    <div class="ar-notif"><span class="ar-notif-ic" aria-hidden="true">a</span><span><b>apiviz · samedi 9 h</b><span>Beau créneau samedi au rucher : doux et sans vent. Des ruches à voir.</span></span></div>
    <div class="ar-types">${TYPES_RAPPELS.map(([k, t, d]) => `<div class="ar-type"><span><b>${t}</b><span>${d}</span></span><button type="button" class="ar-sw" role="switch" aria-checked="${p[k] !== false}" aria-label="${t}" data-act="arrappel" data-v="${k}"></button></div>`).join("")}</div>
    <p class="ar-petit">Deux rappels par semaine au plus. Modifiable dans Réglages › Rappels et notifications.</p></section>`;
}

function ecranBravo() {
  const b = S.arBravo || {}, r = byId(S.d.ruches, b.ruche_id);
  // Le bandeau « C'est noté » de l'accueil (demarrage.js) ferait doublon avec cet écran.
  memo(`apidoo-dm-bravo-${typeof EX != "undefined" ? EX.courante() : ""}`, "1");
  const ruches = (S.d.ruches || []).filter((x) => !x.sortie);
  const suivante = ruches.find((x) => x.id !== b.ruche_id && !(S.d.visites || []).some((v) => v.ruche_id === x.id));
  const notif = typeof Notification != "undefined" && Notification.permission === "default";
  const p = prenom();
  $app.innerHTML = `<div class="ar ar-clair" data-ecran="bravo"><main class="ar-corps ar-centre">
    <div class="ar-bravo"><svg class="ar-jalon" role="img" aria-label="Jalon Première visite" width="62" height="68" viewBox="0 0 84 92"><path d="M42 3l37 21v44L42 89 5 68V24z" fill="#E3A008" stroke="#1E2B24" stroke-width="3"/><path d="M28 47l10 10 19-21" fill="none" stroke="#1E2B24" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${b.premiere ? '<span class="ar-tag">Jalon débloqué · Première visite</span>' : ""}
      <h1 class="ar-titre-c">Bravo${p ? ` ${e(p)}` : ""}, ${e(r?.nom || "ta ruche")} est suivie !</h1>
      ${b.local ? '<p class="ar-petit">Visite gardée sur le téléphone : elle partira au retour du réseau.</p>' : ""}</div>
    ${suivante ? `<button type="button" class="btn block" data-act="arenchainer" data-v="${e(suivante.id)}">Enchaîner avec ${e(suivante.nom)}</button>` : ""}
    ${b.premiere && notif ? blocRappels() : ""}
    <div class="ar-fin">${b.premiere && notif ? '<button type="button" class="btn main block" data-act="aractiver">Activer les rappels</button><button type="button" class="ar-lien sombre" data-act="araccueil">Pas maintenant</button>'
      : '<button type="button" class="btn main block" data-act="araccueil">Continuer</button>'}</div>
  </main></div>`;
}

async function activerRappels() {
  try {
    const choix = await Notification.requestPermission();
    if (choix === "granted") { memo("apidoo-notif", "1"); window.Notifications?.abonner?.(prefsRappels()).catch?.(() => {}); toast("Rappels activés"); }
    else toast("Rappels non activés : tu pourras le faire dans Réglages", true);
  } catch { /* navigateur sans notifications */ }
  versAccueil();
}
function versAccueil() { S.arBravo = null; S.route = "dash"; render(); }

// ---------- Exploitation d'exemple : trois bulles de découverte (écran 7) ----------

const bul = { i: 0 };
function nettoyerBulles() {
  document.querySelectorAll(".ex-bulle, .ex-voile").forEach((x) => x.remove());
  document.querySelectorAll(".ex-cible").forEach((x) => x.classList.remove("ex-cible"));
}
function montrerBulle() {
  nettoyerBulles();
  const b = R.BULLES_EXEMPLE[bul.i];
  if (!b) return;
  const cible = b.cible.map((s) => document.querySelector(s)).find((x) => x && x.getClientRects().length);
  if (cible) { cible.classList.add("ex-cible"); cible.scrollIntoView?.({ block: "center", behavior: calme() ? "auto" : "smooth" }); }
  const r = cible?.getBoundingClientRect(), bas = r && r.top > window.innerHeight * 0.55;
  const pos = !r ? "top:30%" : bas ? `bottom:${Math.max(16, window.innerHeight - r.top + 12)}px` : `top:${Math.min(window.innerHeight - 220, r.bottom + 12)}px`;
  document.body.insertAdjacentHTML("beforeend", `<div class="ex-voile" data-act="exfin"></div><div class="ex-bulle" role="dialog" aria-label="${e(b.titre)}" style="${pos}">
    <span class="ex-n">${bul.i + 1} sur ${R.BULLES_EXEMPLE.length}</span><b>${e(b.titre)}</b><p>${e(b.texte)}</p>
    <div><button type="button" data-act="exfin">Passer</button><button type="button" class="ex-suivant" data-act="exsuivant">${bul.i === R.BULLES_EXEMPLE.length - 1 ? "J’ai compris" : "Suivant"}</button></div></div>`);
  document.querySelector(".ex-suivant")?.focus({ preventScroll: true });
}
/** Lance les bulles une fois l'accueil d'exemple dessiné. */
export function bulles() { bul.i = 0; setTimeout(montrerBulle, 400); }

// ---------- Écrans et actions ----------

export const ecrans = [
  { id: "premierevisite", titre: "Première visite", rubrique: "ruches", rendu: () => ecranVisite() },
  { id: "bravo", titre: "Bravo", rubrique: "dash", rendu: () => ecranBravo() },
];

export const actions = {
  arcreer: () => { st.ecran = "connaissance"; st.diapo = 0; memo(R.CLE_BIENVENUE, null); render(); },
  arconnexion: () => versCompte("in"),
  arexemple: () => { arreterMinuteur(); memo(R.CLE_BIENVENUE, "1"); return ACT.dmexemple?.(); },
  arsuivant: () => { if (st.diapo >= 3) return; st.diapo += 1; ecranConnaissance(); },
  ardiapo: (v) => { st.diapo = Math.max(0, Math.min(3, Number(v) || 0)); ecranConnaissance(); },
  arpasser: () => versCompte("up"),
  arcommencer: () => versCompte("up"),
  arvisite: (v) => ouvrirVisite(v),
  arrepondre: (v) => {
    const f = S.arVisite;
    if (!f || f.i >= R.QUESTIONS_VISITE.length) return;
    f.reponses.push({ k: R.QUESTIONS_VISITE[f.i].k, i: v === "" || v === undefined ? null : Number(v) });
    f.i += 1;
    window.Retours?.niveau?.(1);
    ecranVisite();
  },
  arenregistrer: enregistrerVisite,
  arplustard: () => programmer(),
  arfermervisite: () => { S.arVisite = null; go("dash"); },
  arenchainer: (id) => { S.arBravo = null; ouvrirVisite(id); },
  arrappel: (k, _x, bouton) => {
    const p = prefsRappels(); p[k] = p[k] === false; memo(PREFS_RAPPELS, JSON.stringify(p));
    if (bouton) bouton.setAttribute("aria-checked", String(p[k] !== false));
  },
  aractiver: () => activerRappels(),
  exsuivant: () => { bul.i += 1; montrerBulle(); },
  exfin: () => { bul.i = R.BULLES_EXEMPLE.length; nettoyerBulles(); },
  araccueil: () => versAccueil(),
  arquestion: (i) => {
    const q = R.QUESTIONS_AIDE[Number(i)] || "";
    if (typeof window.quickSheet != "function") return;
    window.quickSheet();
    // Le champ « Demande à API » arrive avec la feuille (src/domaines/assistant/ecrans.js) : on y met la question.
    let n = 0;
    const remplir = () => { const z = document.getElementById("asQ"); if (z) { z.value = q; z.focus(); } else if (n++ < 20) setTimeout(remplir, 50); };
    remplir();
  },
};

if (typeof window != "undefined") window.Arrivee = { ouvrirVisite, blocRappels, prefsRappels, bulles, etat: () => st };
