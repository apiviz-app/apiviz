// Apiviz — écran « API » (IT-24, AP-FEAT-107 et 108) : questions en langage naturel sur ses données, réponses en
// quatre blocs (faits datés avec liens vers les fiches, hypothèses, recommandations, informations manquantes).
// - Feuille du bouton API : un champ « Demande à API… » en tête, quand la fonction serveur est disponible.
//   Sinon rien ne change : « Bientôt, API répondra à tes questions » reste (retour arrière : ASSISTANT_ACTIF=non).
// - Écran « api » (v5.62, maquettes « Tes échanges » et « Une conversation » du 18 nov. 2026) : sans conversation
//   ouverte, la page de tes échanges (poser une question, conseils pas encore faits, recherche, historique par jour) ;
//   avec une conversation, les questions et réponses, la zone pour écrire en bas. La zone pour écrire s'agrandit quand
//   on la touche. Chaque échange est gardé (migration 031), visible de son auteur seul ; sans la migration, la
//   conversation reste en mémoire comme avant.
// - API est en lecture seule : aucune saisie n'est faite depuis cet écran (IT-25).
// Globales lues à l'appel : S, sb, esc, shell, render, go, toast, sheet, $sheet, $sheetForm, ACT, Apiviz.
import { connu, demander, etat } from "./client.js";
import { rendreReponse, SUGGESTIONS } from "./rendu.js";
import { modeParDefaut, majGouttes } from "../compte/offre.js";
import { gouttesTexte, etatGouttes } from "../compte/regles-offre.js";
import * as H from "./historique.js";

const fil = { cle: "", echanges: [], mode: null, conv: null, ruche: null, rucheFeuille: null, recherche: "",
  hist: { cle: null, chargement: false, lignes: [], absent: false, erreur: "" } };
const mode = () => fil.mode || modeParDefaut();
const cleExploitation = () => (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";
const enLigne = () => typeof navigator == "undefined" || navigator.onLine !== false;

function verifierCle() {
  const c = cleExploitation();
  if (c !== fil.cle) { fil.cle = c; fil.echanges = []; fil.conv = null; fil.ruche = null; fil.hist = { cle: null, chargement: false, lignes: [], absent: false, erreur: "" }; }
}

/** Humeur du compagnon : il réfléchit pendant le calcul, répond, s'inquiète en cas d'erreur, dort sans réseau. */
export function humeur(echanges, enligne = true) {
  if (!enligne) return "horsligne";
  const der = echanges[echanges.length - 1];
  if (!der) return "bonjour";
  if (der.enCours) return "reflexion";
  if (der.erreur) return "attention";
  return "repond";
}

const restant = (st) => (st && Number.isInteger(st.restant) ? `${st.restant} question${st.restant > 1 ? "s" : ""} encore possible${st.restant > 1 ? "s" : ""} aujourd’hui` : "");

/** Coût d'une réponse, sous la réponse (IT-27) : le juste prix se voit. */
const cout = (g) => (g && Number.isFinite(Number(g.cout))
  ? `<p class="as-cout"><span>Réponse ${g.mode === "rapide" ? "rapide" : "approfondie"}</span><span class="as-cout-g">${esc(gouttesTexte(g.cout))}</span></p>` : "");

function echange(x) {
  const q = `<p class="as-q">${esc(x.question)}</p>`;
  if (x.erreur && x.code === "gouttes") return `<article class="as-ech">${q}<div class="as-rep as-erreur as-epuise" role="alert"><p>${esc(x.erreur)}</p>
    <div class="as-gestes"><button type="button" class="btn honey" data-act="go" data-v="recharge">Recharger</button><button type="button" class="btn" data-act="go" data-v="offres">Voir les offres</button></div></div></article>`;
  if (x.enCours) return `<article class="as-ech">${q}<div class="as-rep as-attente" aria-busy="true"><i></i><i></i><i></i><span class="small">API lit tes données…</span></div></article>`;
  if (x.erreur) return `<article class="as-ech">${q}<div class="as-rep as-erreur" role="alert"><p>${esc(x.erreur)}</p><button type="button" class="btn" data-act="apireessayer" data-v="${fil.echanges.indexOf(x)}">Réessayer</button></div></article>`;
  return `<article class="as-ech">${q}<div class="as-rep">${rendreReponse(x.reponse, { esc, d: S.d })}${conseilsReponse(x)}${cout(x.gouttes)}</div></article>`;
}

const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16)));
const absente = (err) => ["42P01", "PGRST205", "PGRST202"].includes(err?.code);
const nomRuche = (id) => (id && (S.d?.ruches || []).find((r) => r.id === id)?.nom) || "";
const dateCourte = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }); };
const heure = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h "); };

/** Historique de la personne connectée (migration 031) : chargé une fois par exploitation. */
async function chargerHistorique(force = false) {
  const h = fil.hist;
  if (h.chargement || (!force && h.cle === fil.cle)) return;
  if (typeof sb == "undefined") return;
  h.chargement = true;
  try {
    const r = await sb.from("api_echanges").select("id,conversation_id,ruche_id,question,reponse,mode,cout,conseils_suivis,created_at").order("created_at", { ascending: false }).limit(300);
    if (absente(r.error)) Object.assign(h, { absent: true, lignes: [], erreur: "" });
    else if (r.error) h.erreur = "Tes échanges n’ont pas pu être chargés. Vérifie le réseau.";
    else Object.assign(h, { lignes: Array.isArray(r.data) ? r.data : [], absent: false, erreur: "" });
    h.cle = fil.cle;
  } catch { h.erreur = "Tes échanges n’ont pas pu être chargés. Vérifie le réseau."; }
  finally { h.chargement = false; }
  if (S.route === "api" && !fil.echanges.length) render();
}

/** Garde un échange répondu (sans bloquer l'écran : un échec laisse la conversation en mémoire). */
async function garder(x) {
  if (fil.hist.absent || typeof sb == "undefined") return;
  const ligne = { id: x.id, conversation_id: fil.conv, ruche_id: fil.ruche || null, question: x.question, reponse: x.reponse,
    mode: x.gouttes?.mode === "rapide" || x.gouttes?.mode === "approfondi" ? x.gouttes.mode : "", cout: Number.isFinite(Number(x.gouttes?.cout)) ? Number(x.gouttes.cout) : null,
    created_at: x.created_at || new Date().toISOString() };
  try {
    const r = await sb.from("api_echanges").insert(ligne);
    if (absente(r?.error)) { fil.hist.absent = true; return; }
    if (r?.error) return;
    if (!fil.hist.lignes.some((l) => l.id === ligne.id)) fil.hist.lignes.unshift({ ...ligne, conseils_suivis: [] });
  } catch { /* hors ligne : la conversation reste en mémoire */ }
}

// ---------- Zone pour écrire ----------
/** La zone pour écrire : une ligne au repos, elle s'agrandit quand on la touche et suit la longueur du texte. */
function zoneEcrire(st, { bas = false } = {}) {
  const enCours = fil.echanges.some((x) => x.enCours);
  const place = fil.echanges.length ? "Une autre question ?" : fil.ruche ? `Une question sur ${nomRuche(fil.ruche)}…` : "Pose ta question à API…";
  return `<form class="as-form${bas ? " as-bas" : ""}" data-form="api"><label class="sr" for="asTexte">Ta question à API</label>
    <div class="as-saisie"><textarea id="asTexte" rows="1" maxlength="1000" enterkeyhint="send" placeholder="${enLigne() ? esc(place) : "Sans réseau, API ne peut pas répondre"}" ${enLigne() ? "" : "disabled"}></textarea>
    <button type="submit" class="btn main as-envoyer" aria-label="Demander" ${enCours || !enLigne() ? "disabled" : ""}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span>Demander</span></button></div>
    ${st.gouttes !== null && st.gouttes !== undefined ? `<div class="as-modes" role="group" aria-label="Type de réponse">${[["rapide", "Rapide"], ["approfondi", "Approfondie"]].map(([m, t]) =>
      `<button type="button" class="as-mode ${mode() === m ? "on" : ""}" aria-pressed="${mode() === m}" data-act="apimode" data-v="${m}">${t}</button>`).join("")}<span class="small">${mode() === "rapide" ? "moins d’1 goutte" : "environ 2 à 4 gouttes"}</span></div>` : ""}</form>`;
}

function brancherZone() {
  const f = document.querySelector(".as-form");
  if (!f) return;
  const t = f.querySelector("textarea");
  const ajuster = () => { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight + 2, Math.round(window.innerHeight * 0.5))}px`; };
  f.addEventListener("submit", (e) => { e.preventDefault(); envoyer(t.value); });
  t.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); envoyer(t.value); } });
  t.addEventListener("focus", () => { f.classList.add("grand"); ajuster(); });
  t.addEventListener("input", ajuster);
  t.addEventListener("blur", () => setTimeout(() => { if (!t.value.trim() && document.activeElement !== t) { f.classList.remove("grand"); t.style.height = ""; } }, 150));
  // Hauteur de la barre du bas : la zone fixée en bas de la conversation se pose juste au-dessus.
  const barre = document.querySelector(".bottom");
  if (f.classList.contains("as-bas")) document.documentElement.style.setProperty("--as-bas", `${barre && getComputedStyle(barre).display !== "none" ? barre.getBoundingClientRect().height : 0}px`);
}

// ---------- Écran ----------
function tete(st, actif, vide) {
  return `<section class="as-tete card${vide ? "" : " mini"}">${Apiviz.compagnon(humeur(fil.echanges, enLigne()), vide ? 56 : 40)}<div>
      <p>${actif ? (vide ? "Pose-moi une question sur tes ruches, ton miel ou tes comptes. Je lis tes données et je te dis d’où viennent mes réponses." : "Une autre question ?")
        : st ? "Bientôt, API répondra à tes questions sur tes ruches, ton miel et tes comptes." : "Un instant, je me prépare…"}</p>
      ${actif && restant(st) ? `<span class="small">${esc(restant(st))}</span>` : ""}</div>
      ${actif && st.gouttes !== null && st.gouttes !== undefined ? `<button type="button" class="as-gouttes ${etatGouttes(st.gouttes)}" data-act="go" data-v="offre" aria-label="Gouttes d'API : ${esc(gouttesTexte(st.gouttes))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>${esc(String(Math.max(0, Math.round(st.gouttes))))}</button>` : ""}</section>`;
}

function listeHistorique(convs) {
  if (!convs.length) return fil.recherche ? '<p class="small as-rien">Aucun échange ne contient ces mots.</p>' : "";
  return H.grouper(convs).map(([p, l]) => `<section class="as-groupe"><h2 class="as-periode">${esc(p)}</h2><ul class="as-hist">${l.map((c) => {
    const r = nomRuche(c.ruche_id);
    const sous = [`${c.n} question${c.n > 1 ? "s" : ""}`, c.aFaire ? `${c.aFaire} conseil${c.aFaire > 1 ? "s" : ""} à faire` : "", p === "Aujourd’hui" || p === "Hier" ? heure(c.quand) : dateCourte(c.quand)].filter(Boolean).join(" · ");
    return `<li><button type="button" data-act="apiouvrir" data-v="${esc(c.id)}"><span class="as-h-t"><b>${esc(c.titre)}</b><span class="small">${esc(sous)}</span></span>${r ? `<span class="tag">${esc(r)}</span>` : ""}</button></li>`;
  }).join("")}</ul></section>`).join("");
}

function accueil(st, actif) {
  const h = fil.hist;
  if (actif && h.cle !== fil.cle) chargerHistorique();
  const convs = H.conversations(h.lignes);
  const trouvees = H.chercher(convs, h.lignes, fil.recherche);
  const conseils = H.conseilsAFaire(h.lignes);
  const suggestions = actif && !convs.length
    ? `<div class="as-sugg" aria-label="Exemples de questions">${SUGGESTIONS.map((s, i) => `<button type="button" class="as-puce" data-act="apisugg" data-v="${i}">${esc(s)}</button>`).join("")}</div>` : "";
  const afaire = conseils.length ? `<section class="as-afaire" aria-labelledby="as_af"><h2 id="as_af">Conseillé par API, pas encore fait</h2>
      ${conseils.map((c) => `<div class="as-af"><span>${esc(H.titreConseil(c.texte))}${c.ruche_id && nomRuche(c.ruche_id) ? ` <span class="small">· ${esc(nomRuche(c.ruche_id))}</span>` : ""}</span>
        <button type="button" class="btn" data-act="apiconseil" data-v="${esc(c.echange)}:${c.i}">Créer la tâche</button>
        <button type="button" class="as-ecarter" data-act="apiecarter" data-v="${esc(c.echange)}:${c.i}" aria-label="Écarter ce conseil : ${esc(H.titreConseil(c.texte))}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join("")}</section>` : "";
  const cherche = convs.length > 3 || fil.recherche ? `<label class="as-cherche"><span class="sr">Chercher dans tes échanges</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>
      <input id="asCherche" type="search" autocomplete="off" placeholder="Chercher : varroa, Ruche 5, miel…" value="${esc(fil.recherche)}"></label>` : "";
  const pied = !actif ? "" : h.absent ? '<p class="small as-note">API peut se tromper : vérifie dans tes fiches. Tes échanges seront gardés avec la prochaine mise à jour de l’application.</p>'
    : `<p class="small as-note">API peut se tromper : vérifie dans tes fiches. Tes échanges ne sont visibles que par toi.${convs.length ? ' <button type="button" class="link" data-act="apieffacertout">Effacer tout l’historique</button>' : ""}</p>`;
  return `<div class="as-ecran as-accueil">${tete(st, actif, true)}${actif ? zoneEcrire(st) : ""}${suggestions}${afaire}${cherche}
    ${h.erreur ? `<p class="small" role="alert">${esc(h.erreur)}</p>` : ""}<div class="as-liste">${listeHistorique(trouvees)}</div>${pied}</div>`;
}

function conseilsReponse(x) {
  if (!x.reponse || !x.id) return "";
  const l = H.conseilsOuverts(x).filter(({ r }) => !r.sanitaire);
  return l.length ? `<div class="as-taches">${l.map(({ r, i }) => `<button type="button" class="btn" data-act="apiconseil" data-v="${esc(x.id)}:${i}">Créer la tâche « ${esc(H.titreConseil(r.texte))} »</button>`).join("")}</div>` : "";
}

function conversation(st, actif) {
  const premier = fil.echanges[0];
  const r = nomRuche(fil.ruche);
  const quand = premier?.created_at ? `${dateCourte(premier.created_at)}` : "Aujourd’hui";
  return `<div class="as-ecran as-conv">
    <button type="button" class="link as-retour" data-act="apiretour"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Tes échanges</button>
    <p class="as-titre" role="heading" aria-level="2">${esc(premier?.question || "")}</p>
    <p class="small as-quand">${esc(quand)}${r ? ` · à propos de <button type="button" class="link" data-act="ruche" data-v="${esc(fil.ruche)}">${esc(r)}</button>` : ""}</p>
    ${tete(st, actif, false)}
    <div class="as-fil">${fil.echanges.map(echange).join("")}</div>
    ${fil.conv && !fil.hist.absent && fil.echanges.some((x) => x.reponse) ? '<button type="button" class="link as-effacer" data-act="apieffacer">Effacer cette conversation</button>' : ""}
    ${actif ? zoneEcrire(st, { bas: true }) : ""}</div>`;
}

function vue() {
  verifierCle();
  const st = connu();
  if (!st) etat().then(() => { if (S.route === "api") render(); });
  const vide = !fil.echanges.length;
  const actif = !!(st && st.actif);
  shell("API", vide ? "Tes échanges" : "", !vide ? `<button type="button" class="btn" data-act="apinouveau">Nouvelle conversation</button>` : "",
    vide ? accueil(st, actif) : conversation(st, actif));
  brancherZone();
  const c = document.getElementById("asCherche");
  if (c) c.addEventListener("input", () => {
    fil.recherche = c.value;
    const l = document.querySelector(".as-liste");
    if (l) l.innerHTML = listeHistorique(H.chercher(H.conversations(fil.hist.lignes), fil.hist.lignes, fil.recherche));
  });
  if (!vide) document.querySelector(".as-ech:last-child")?.scrollIntoView({ block: "start", behavior: "auto" });
}

/** Envoie une question et affiche la réponse quand elle arrive. rucheId : question posée depuis la fiche d'une ruche. */
export async function envoyer(texte, rucheId = null) {
  const question = String(texte || "").trim();
  if (!question || fil.echanges.some((x) => x.enCours)) return;
  if (!enLigne()) { toast("Sans réseau, API ne peut pas répondre. Réessaie une fois connecté."); return; }
  verifierCle();
  if (!fil.echanges.length) { fil.conv = uuid(); fil.ruche = rucheId || fil.ruche || null; }
  const historique = fil.echanges.filter((x) => x.reponse).slice(-4).map((x) => ({ question: x.question, resume: x.reponse.resume }));
  const x = { id: uuid(), question, enCours: true, conseils_suivis: [] };
  fil.echanges.push(x);
  if (S.route === "api") render(); else go("api");
  try {
    const r = await demander(H.avecRuche(question, nomRuche(fil.ruche)), historique, connu()?.gouttes !== null && connu()?.gouttes !== undefined ? mode() : undefined);
    x.reponse = r.reponse; x.gouttes = r.gouttes || null;
    if (r.gouttes) majGouttes(r.gouttes.restant);
    x.created_at = new Date().toISOString();
    garder(x);
  }
  catch (e) { x.erreur = e.message || "API n'a pas pu répondre."; x.code = e.code || ""; }
  x.enCours = false;
  if (S.route === "api") render();
}

/** Un conseil (« idEchange:numéro ») : la ligne et le conseil. */
function conseil(v) {
  const [idx, n] = String(v).split(":");
  const x = fil.hist.lignes.find((l) => l.id === idx) || fil.echanges.find((l) => l.id === idx);
  const r = x?.reponse?.recommandations?.[Number(n)];
  return x && r ? { x, i: Number(n), r } : null;
}

/** Note un conseil comme suivi (tâche créée ou écarté), ici et dans l'historique. */
async function suivre(x, i) {
  const suivis = [...new Set([...(Array.isArray(x.conseils_suivis) ? x.conseils_suivis : []), i])];
  for (const l of [fil.hist.lignes.find((y) => y.id === x.id), fil.echanges.find((y) => y.id === x.id)]) if (l) l.conseils_suivis = suivis;
  if (!fil.hist.absent && typeof sb != "undefined") { try { await sb.from("api_echanges").update({ conseils_suivis: suivis }).eq("id", x.id); } catch { /* réessayé à la prochaine fois */ } }
  if (S.route === "api") render();
}

async function effacer(conv) {
  if (typeof sb == "undefined") return;
  const q = sb.from("api_echanges").delete();
  const r = await (conv ? q.eq("conversation_id", conv) : q.neq("conversation_id", "00000000-0000-0000-0000-000000000000"));
  if (r?.error && !absente(r.error)) { toast("L’historique n’a pas pu être effacé. Vérifie le réseau."); return; }
  fil.hist.lignes = conv ? fil.hist.lignes.filter((l) => l.conversation_id !== conv) : [];
  if (!conv || fil.conv === conv) { fil.echanges = []; fil.conv = null; fil.ruche = null; }
  $sheet.close();
  toast(conv ? "Conversation effacée" : "Historique effacé");
  if (S.route === "api") render();
}

// ---------- Feuille du bouton API ----------
function poserChamp(st) {
  if (!st || !st.actif || !$sheet.open || $sheetForm.querySelector(".as-champ") || !$sheetForm.querySelector(".n4-tuiles")) return;
  const b = $sheetForm.querySelector(".al-bientot");
  if (b) b.textContent = "Bientôt, API lira aussi tes factures.";
  const avant = $sheetForm.querySelector(".al-cherche") || $sheetForm.querySelector(".n4-tuiles");
  // v5.62 : ouverte depuis la fiche d'une ruche, la feuille propose des questions sur cette ruche.
  const r = S.route === "ruche" && S.ruche ? (S.d?.ruches || []).find((x) => x.id === S.ruche) : null;
  fil.rucheFeuille = r ? r.id : null;
  avant.insertAdjacentHTML("beforebegin", `<div class="as-champ-bloc${r ? " sur-ruche" : ""}"><div class="as-champ"><label class="sr" for="asQ">${r ? `Demande à API sur ${esc(r.nom)}` : "Demande à API"}</label>
    <input id="asQ" type="text" enterkeyhint="send" autocomplete="off" maxlength="1000" placeholder="${r ? `Question sur ${esc(r.nom)}…` : "Demande à API…"}">
    <button type="button" class="btn main" data-act="apiposer">Demander</button></div>
    ${r ? `<div class="as-qruche">${H.questionsRuche(r.nom).map((q, i) => `<button type="button" class="as-puce" data-act="apiqruche" data-v="${i}">${esc(q)}</button>`).join("")}</div>` : ""}
    <button type="button" class="link as-vers" data-act="apiechanges">Tes échanges avec API</button></div>`);
  $sheetForm.onsubmit = (e) => { e.preventDefault(); ACT.apiposer(); };
}

/** Enveloppe la feuille du bouton API (après feuille-api.js) : champ de question quand API est disponible. */
export function installer() {
  if (typeof window == "undefined" || typeof window.quickSheet != "function" || window.quickSheet.asApi) return;
  const avant = window.quickSheet;
  const feuille = function () {
    avant();
    const st = connu();
    if (st) poserChamp(st); else etat().then(poserChamp);
  };
  feuille.asApi = true;
  feuille.faApi = avant.faApi;
  window.quickSheet = feuille;
}
installer();

/** Repart sans conversation ouverte (rucheId : la prochaine question porte sur cette ruche). */
function nouvelle(rucheId = null) { fil.echanges = []; fil.conv = null; fil.ruche = rucheId || null; }

export const actions = {
  apiposer: () => {
    const q = document.getElementById("asQ")?.value || "";
    if (!q.trim()) return document.getElementById("asQ")?.focus();
    $sheet.close();
    nouvelle(fil.rucheFeuille);
    envoyer(q, fil.rucheFeuille);
  },
  apiqruche: (i) => {
    const r = (S.d?.ruches || []).find((x) => x.id === fil.rucheFeuille);
    if (!r) return;
    $sheet.close();
    nouvelle(r.id);
    envoyer(H.questionsRuche(r.nom)[Number(i)], r.id);
  },
  apiechanges: () => { $sheet.close(); nouvelle(); go("api"); },
  apiretour: () => { nouvelle(); render(); },
  apiouvrir: (conv) => {
    const l = H.echangesDe(fil.hist.lignes, conv);
    if (!l.length) return;
    fil.conv = conv; fil.ruche = (l.find((x) => x.ruche_id) || {}).ruche_id || null;
    fil.echanges = l.map((x) => ({ id: x.id, question: x.question, reponse: x.reponse, created_at: x.created_at, conseils_suivis: x.conseils_suivis || [],
      gouttes: x.cout !== null && x.cout !== undefined ? { cout: x.cout, mode: x.mode } : null }));
    render();
  },
  apiconseil: (v) => {
    const c = conseil(v);
    if (!c) return;
    const titre = H.titreConseil(c.r.texte);
    ACT.newtache(c.x.ruche_id || "");
    const champ = $sheetForm.querySelector("[name=titre]");
    if (champ) champ.value = titre;
    // Le conseil est noté comme suivi une fois la tâche enregistrée (pas si la feuille est fermée sans enregistrer).
    $sheet.addEventListener("close", () => { if ((S.d?.taches || []).some((t) => t.titre === (champ?.value || titre))) suivre(c.x, c.i); }, { once: true });
  },
  apiecarter: (v) => { const c = conseil(v); if (c) suivre(c.x, c.i); },
  apieffacer: () => {
    const conv = fil.conv;
    if (!conv) return;
    sheet({ title: "Effacer cette conversation ?", intro: "Ses questions et réponses sont effacées pour de bon. Les tâches déjà créées restent.", fields: [], label: "Effacer", submit: () => effacer(conv) });
  },
  apieffacertout: () => sheet({ title: "Effacer tout l’historique ?", intro: "Toutes tes conversations avec API sont effacées pour de bon. Les tâches déjà créées restent.", fields: [], label: "Tout effacer", submit: () => effacer(null) }),
  apisugg: (i) => { nouvelle(); envoyer(SUGGESTIONS[Number(i)]); },
  apimode: (m) => {
    const t = document.getElementById("asTexte")?.value || "";
    fil.mode = m === "rapide" ? "rapide" : "approfondi"; render();
    const c = document.getElementById("asTexte"); if (c && t) { c.value = t; c.focus(); }
  },
  apinouveau: () => { nouvelle(); render(); setTimeout(() => document.getElementById("asTexte")?.focus(), 0); },
  apireessayer: (i) => {
    const x = fil.echanges[Number(i)];
    if (!x) return;
    fil.echanges.splice(Number(i), 1);
    envoyer(x.question);
  },
};

export default [{ id: "api", titre: "API", rubrique: "saisir", rendu: vue, actions }];
