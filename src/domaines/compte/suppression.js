// Apiviz — mes données et suppression du compte (v5.88, maquette « apiviz — Onboarding irréprochable », écrans 12 à
// 14, validés par Pierre-Louis le 24 nov. 2026 ; migration 041, fonction serveur « supprimer-comptes »).
//   - Route « mesdonnees » (Réglages › Tes données, Mon profil) : ce qu'Apiviz garde, tout télécharger, effacer ses
//     réponses, statistiques, « Supprimer mon compte et mes données ».
//   - Route « suppression » : pour chaque exploitation partagée, la laisser aux autres ou (responsable) la supprimer pour
//     tout le monde ; ce qui sera supprimé ; factures à garder ; « Télécharger d'abord ».
//   - Route « confirmersuppression » : mot de passe redemandé, compte désactivé tout de suite, effacement dans 30 jours,
//     annulable ; écran final.
//   - Pendant les 30 jours : à la connexion, seul l'écran « Ton compte sera supprimé le … » (annuler ou se déconnecter).
//   - Bandeau de l'accueil pour les autres membres d'une exploitation qui sera supprimée pour tout le monde.
//   - v5.90 (migration 042) : une fois par jour, signaler_activite() note le jour d'ouverture (durée de conservation :
//     comptes sans activité depuis 3 ans) et annule un préavis d'inactivité en cours (« Bon retour ») ; après une
//     demande de suppression, la fonction serveur « courriels » envoie la confirmation par e-mail.
// Sans 041 : l'ancienne suppression immédiate (profil.js, migration 022) reste proposée. Globales lues à l'appel : S, sb,
// esc, shell, ES, $app, go, render, toast, fail, ACT, EX, PF, today, dfr.
import * as R from "./regles-suppression.js";

const e = (t) => (typeof esc == "function" ? esc(t) : String(t ?? ""));
const email = () => String(S.session?.user?.email || "").toLowerCase();
const st = { apercu: null, choix: {}, verifie: "", demande: undefined, pour: "", annonces: null, annoncesDe: "", fait: null, erreur: "", sans041: false, occupe: false };
const ICONE = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const jourSignale = { email: "", jour: "", coupe: false };
const sansFonction = (err) => /PGRST202|42883|function|ma_suppression|demander_suppression|suppressions_annoncees/i.test(`${err?.code} ${err?.message}`);

// ---------- 12. Mes données ----------
function ecranMesDonnees() {
  const d = S.d || {}, p = window.PF?.moi?.() || {};
  const n = R.compter(d, p);
  const ligne = (t, v) => `<div class="sd-l"><span>${e(t)}</span><b>${e(v)}</b></div>`;
  shell("Mes données", "", "", `<div class="sd">
    <p class="small sd-intro">Tout ce qu'Apiviz garde sur toi, et ce que tu peux en faire.</p>
    <section class="card sd-liste">${ligne("Colonies et ruchers", n.colonies)}${ligne("Visites et notes", n.visites)}${ligne("Photos", n.photos)}${ligne("Récoltes, ventes, dépenses", n.gestion)}${ligne("Réponses de profil", n.reponses)}</section>
    <section class="card sd-actions">
      <button type="button" class="btn sd-btn" data-act="pftelecharger">${ICONE("M12 4v11M7 10l5 5 5-5M5 20h14")}Télécharger toutes mes données</button>
      <span class="small">Ton profil et la sauvegarde complète de l'exploitation ouverte (fichiers JSON).</span>
      <button type="button" class="btn sd-btn" data-act="pfeffacer">${ICONE("M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3")}Effacer mes réponses de profil</button>
      <span class="small">Ton compte et tes ruches restent.</span>
      <div class="pf-l sd-stats"><span style="color:var(--ink)">Compter mes réponses dans les statistiques d'ensemble</span><button type="button" class="pf-sw" role="switch" aria-checked="${p.stats_ok !== false}" aria-label="Compter mes réponses dans les statistiques d'ensemble" data-act="pfbascule" data-v="stats_ok"></button></div>
    </section>
    <section class="card sd-danger"><b>Supprimer mon compte</b><span class="small">${st.sans041 ? "Ton compte et toutes tes données, définitivement." : "Ton compte et toutes tes données, définitivement, après 30 jours pour changer d'avis."}</span>
      <button type="button" class="btn sd-rouge" data-act="${st.sans041 ? "pfsupprimer" : "sdcommencer"}">Supprimer mon compte et mes données</button></section>
    <a class="link sd-politique" href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a>
  </div>`);
  ES.retour("go", "reglages", "‹ Réglages");
}

// ---------- 13. Avant de supprimer ----------
async function chargerApercu() {
  st.erreur = "";
  const r = await sb.rpc("compte_a_supprimer");
  if (r.error) { st.apercu = { erreur: true }; st.erreur = "Impossible de préparer la suppression : réessaie avec du réseau."; }
  else st.apercu = r.data || { effacees: [], quittees: [], photos: [] };
  if (S.route === "suppression" || S.route === "confirmersuppression") render();
}

function ecranAvant() {
  if (!st.apercu) { chargerApercu(); shell("Avant de supprimer", "", "", '<p class="small" role="status">Préparation…</p>'); return ES.retour("go", "mesdonnees", "‹ Mes données"); }
  const a = st.apercu;
  const partagees = (a.quittees || []).map((x) => {
    const autres = R.listeNoms(x.autres || []);
    const choix = st.choix[x.id] || "laisser";
    const opt = (v, t, d, ok = true) => `<button type="button" class="sd-choix${choix === v ? " on" : ""}" role="radio" aria-checked="${choix === v}" data-act="sdchoix" data-k="${e(x.id)}" data-v="${v}" ${ok ? "" : "disabled"}><span class="sd-rond" aria-hidden="true"></span><span><b>${e(t)}</b><span>${e(d)}</span></span></button>`;
    return `<section class="card sd-partage"><b>${e(x.nom)} est partagée avec ${e(autres)}. Que devient-elle ?</b>
      <div role="radiogroup" aria-label="${e(x.nom)}">${opt("laisser", `La laisser à ${autres}`, "Ruches, visites et ventes restent pour eux. Ton nom devient « Ancien membre ».")}
      ${opt("tout", "La supprimer pour tout le monde", x.role === "responsable" ? "Les autres membres sont prévenus dans Apiviz et ont 30 jours pour télécharger les données." : "Réservé aux responsables de l'exploitation.", x.role === "responsable")}</div></section>`;
  }).join("");
  const supp = R.ceQuiPart(a, st.choix);
  shell("Avant de supprimer", "", "", `<div class="sd">
    ${st.erreur ? `<p class="ob-err" role="alert">${e(st.erreur)}</p>` : ""}
    ${partagees}
    <section class="card"><b>Ce qui sera supprimé</b><ul class="sd-x">${supp.map((t) => `<li>${ICONE("M6 6l12 12M18 6L6 18", 18)}<span>${e(t)}</span></li>`).join("")}</ul></section>
    <section class="sd-factures"><b>Pense à tes factures</b><span>Tu dois les conserver plusieurs années : télécharge-les avant, Apiviz ne pourra plus te les rendre.</span></section>
    <div class="sd-fin"><button type="button" class="btn block" data-act="pftelecharger">Télécharger d'abord mes données</button>
      <button type="button" class="btn block sd-rouge-plein" data-act="sdcontinuer" ${a.erreur ? "disabled" : ""}>Continuer</button></div>
  </div>`);
  ES.retour("go", "mesdonnees", "‹ Mes données");
}

// ---------- 14. Confirmer ----------
function ecranConfirmer() {
  const f = st.fait;
  if (f) {
    shell("Suppression demandée", "", "", `<div class="sd sd-centre">
      <span class="sd-ok" aria-hidden="true">${ICONE("M5 12l5 5L20 7", 36)}</span>
      <h2 class="sd-titre">C'est noté${window.PF?.prenom?.() ? `, ${e(window.PF.prenom())}` : ""}</h2>
      <p>Ton compte est désactivé. Toutes tes données seront effacées le <b>${e(R.dateLongue(f.effacement_le))}</b>.</p>
      <p class="small">D'ici là, reconnecte-toi avec ton adresse et ton mot de passe pour annuler.</p>
      <p class="small">Merci d'avoir pris soin de tes abeilles avec Apiviz.</p>
      <div class="sd-fin"><button type="button" class="btn main block" data-act="sdfermer">Fermer</button>
        <button type="button" class="link" data-act="sdannuler">Annuler la suppression</button></div></div>`);
    return;
  }
  const quand = R.dateLongue(R.dans30(new Date()));
  const etape = (n, html) => `<div class="sd-etape"><span aria-hidden="true">${n}</span><span>${html}</span></div>`;
  shell("Confirmer la suppression", "", "", `<form class="sd" data-form="sdconfirmer" onsubmit="return false">
    <h2 class="sd-titre">Confirme que c'est bien toi</h2><p class="small">Par sécurité, on te redemande ton mot de passe.</p>
    <label>Mot de passe<input type="password" name="motdepasse" autocomplete="current-password" required></label>
    <section class="card sd-etapes">${etape(1, "Ton compte est <b>désactivé tout de suite</b> : plus personne ne peut s'y connecter.")}
      ${etape(2, "Pendant <b>30 jours</b>, tu peux encore changer d'avis en te reconnectant.")}
      ${etape(3, `Le <b>${e(quand)}</b>, tout est effacé, puis les sauvegardes techniques dans les jours qui suivent.`)}</section>
    ${st.erreur ? `<p class="ob-err" role="alert">${e(st.erreur)}</p>` : ""}
    <div class="sd-fin"><button type="button" class="btn block sd-rouge-plein" data-act="sdsupprimer" ${st.occupe ? "disabled" : ""}>${st.occupe ? "Un instant…" : "Supprimer définitivement"}</button>
      <button type="button" class="link" data-act="sdgarder">Finalement, je garde mon compte</button></div></form>`);
  ES.retour("go", "suppression", "‹ Retour");
}

async function supprimer() {
  const mdp = $app.querySelector("[name=motdepasse]")?.value || "";
  st.erreur = "";
  if (!mdp) { st.erreur = "Écris ton mot de passe."; return render(); }
  if (navigator.onLine === false) { st.erreur = "Il faut du réseau pour supprimer ton compte."; return render(); }
  st.occupe = true; render();
  try {
    const v = await sb.auth.signInWithPassword({ email: S.session.user.email, password: mdp });
    if (v.error) { st.erreur = "Mot de passe incorrect."; return; }
    const r = await sb.rpc("demander_suppression", { p_choix: R.choixEnvoyes(st.apercu, st.choix), p_confirmation: "SUPPRIMER" });
    if (r.error) {
      if (sansFonction(r.error)) { st.sans041 = true; st.erreur = "La base doit être mise à jour pour la suppression en 30 jours. En attendant : Mon profil › Supprimer mon compte (suppression immédiate)."; return; }
      throw r.error;
    }
    st.fait = r.data; st.demande = r.data; st.pour = email();
    // Confirmation par e-mail (042) : sans attendre, sans bloquer si Brevo n'est pas configuré.
    sb.functions?.invoke?.("courriels", { body: { nature: "suppression-demandee" } })?.catch?.(() => {});
  } catch (err) { st.erreur = typeof messageErreur == "function" ? messageErreur(err) : String(err?.message || err); }
  finally { st.occupe = false; render(); }
}

// ---------- Pendant les 30 jours : seul cet écran ----------
async function verifierDemande() {
  if (st.pour === email()) return;
  st.pour = email();
  try {
    const r = await sb.rpc("ma_suppression");
    st.demande = r.error ? null : r.data || null;
    if (r.error && sansFonction(r.error)) st.sans041 = true;
  } catch { st.demande = null; }
  // Préavis d'inactivité (042) : revenir suffit à garder le compte, pas d'écran d'attente.
  if (st.demande?.motif === "inactivite") { st.demande = null; jourSignale.jour = ""; }
  render();
}

// Jour d'ouverture (042), une fois par jour et par compte ; annule un préavis d'inactivité.
async function signaler() {
  const jour = new Date().toISOString().slice(0, 10);
  if (jourSignale.coupe || (jourSignale.email === email() && jourSignale.jour === jour)) return;
  jourSignale.email = email(); jourSignale.jour = jour;
  try {
    const r = await sb.rpc("signaler_activite");
    if (r.error) { if (/signaler_activite|PGRST202|42883|404/i.test(`${r.error.code} ${r.error.message}`)) jourSignale.coupe = true; return; }
    if (r.data === true) { st.demande = null; toast("Bon retour ! Ton compte est gardé."); }
  } catch { jourSignale.jour = ""; }
}

function ecranEnAttente() {
  const d = st.demande;
  $app.innerHTML = `<div class="ar ar-clair" data-ecran="compte-a-supprimer"><main class="ar-corps ar-centre">
    <div class="sd sd-centre"><span class="sd-ok attente" aria-hidden="true">${ICONE("M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", 34)}</span>
      <h1 class="ar-titre-c">Ton compte sera supprimé le ${e(R.dateLongue(d.effacement_le))}</h1>
      <p class="ar-petit">Tu as demandé la suppression de ton compte et de tes données le ${e(R.dateLongue(d.demande_le))}. Tu peux encore changer d'avis.</p></div>
    <div class="ar-fin"><button type="button" class="btn main block" data-act="sdannuler">Annuler la suppression</button>
      <button type="button" class="ar-lien sombre" data-act="sdfermer">Me déconnecter</button></div>
  </main></div>`;
}

function avantRendu() {
  if (!S.session || S.recovery || S.session.user?.id === "exemple") return;
  signaler();
  if (st.pour !== email()) { verifierDemande(); return; }
  if (st.demande && !st.fait) { ecranEnAttente(); return true; }
}

// ---------- Bandeau des autres membres ----------
async function chargerAnnonces() {
  const ex = typeof EX != "undefined" ? EX.courante() : "";
  if (st.annoncesDe === ex) return;
  st.annoncesDe = ex;
  try { const r = await sb.rpc("suppressions_annoncees"); st.annonces = r.error ? [] : r.data || []; } catch { st.annonces = []; }
  if (S.route === "dash") render();
}
function bandeau() {
  if (S.route !== "dash" || !S.d || document.querySelector(".sd-annonce")) return;
  const ex = typeof EX != "undefined" ? EX.courante() : "";
  if (st.annoncesDe !== ex) { chargerAnnonces(); return; }
  const a = (st.annonces || []).find((x) => x.exploitation_id === ex);
  if (!a) return;
  document.querySelector(".wrap .ac-hero")?.insertAdjacentHTML("beforebegin", `<section class="card sd-annonce" role="status"><b>${e(a.nom)} sera supprimée le ${e(R.dateLongue(a.effacement_le))}</b>
    <span>${e(a.par)} a demandé sa suppression pour tout le monde. Télécharge les données d'ici là si tu veux les garder.</span>
    <button type="button" class="btn sm" data-act="sdsauvegarde">Télécharger la sauvegarde</button></section>`);
}

const FL = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
/** Réglages › Tes données : « Mes données et suppression du compte ». */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector('[data-act="sdouvrir"]')) return;
  document.querySelector(".rg-donnees")?.insertAdjacentHTML("afterbegin", `<button type="button" class="rg-l" data-act="sdouvrir"><span class="rg-ic" aria-hidden="true">${ICONE("M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z")}</span><span class="rg-t"><b>Mes données</b><span>Ce qu'Apiviz garde, télécharger, supprimer mon compte</span></span>${FL}</button>`);
}

export const ecrans = [
  { id: "mesdonnees", titre: "Mes données", rubrique: "plus", rendu: () => ecranMesDonnees() },
  { id: "suppression", titre: "Avant de supprimer", rubrique: "plus", rendu: () => ecranAvant() },
  { id: "confirmersuppression", titre: "Confirmer la suppression", rubrique: "plus", rendu: () => ecranConfirmer() },
];

export const actions = {
  sdouvrir: () => go("mesdonnees"),
  sdcommencer: () => { st.apercu = null; st.choix = {}; st.fait = null; st.erreur = ""; go("suppression"); },
  sdchoix: (v, k) => { if (["laisser", "tout"].includes(v)) st.choix[k] = v; render(); },
  sdcontinuer: () => { st.erreur = ""; go("confirmersuppression"); },
  sdsupprimer: () => supprimer(),
  sdgarder: () => { st.erreur = ""; go("mesdonnees"); },
  sdannuler: async () => {
    try { const r = await sb.rpc("annuler_suppression"); if (r.error) throw r.error; } catch (err) { return fail(err); }
    st.demande = null; st.fait = null;
    toast("Suppression annulée : ton compte est gardé");
    S.route = "dash"; render();
  },
  sdfermer: async () => {
    // Après la demande : toutes les sessions de ce compte sont fermées, sur tous les appareils.
    try { await sb.auth.signOut({ scope: "global" }); } catch { /* fermée sur l'appareil par deconnecter() */ }
    if (typeof deconnecter == "function") deconnecter(); else location.replace(location.pathname);
  },
  sdsauvegarde: () => { if (typeof EXP != "undefined" && EXP.json) EXP.json(); },
};

if (typeof window != "undefined" && window.Noyau?.crochets) {
  window.Noyau.crochets.sur("avantRendu", "compte-a-supprimer", avantRendu);
  window.Noyau.crochets.sur("apresRendu", "suppression-annoncee", bandeau);
}
if (typeof window != "undefined") window.Suppression = { etat: () => st };
