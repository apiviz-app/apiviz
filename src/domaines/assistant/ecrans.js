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
// - v5.71 (maquettes « Espace API dans l'appli actuelle » du 20 nov. 2026) : l'écran devient l'espace API. Bonjour et
//   « Pour aujourd'hui » en tête (aujourdhui.js), micro à côté du champ, haut-parleur dans l'en-tête (lecture à voix
//   haute, voix-api.js), ⋯ : Mains libres, Ce qu'API sait de toi, Voix d'API (ecoute.js, reglages-api.js). Sous chaque
//   réponse : « Écouter », le coût réel, et « Ajouter à l'agenda » quand un conseil donne sa date. Au-dessus du champ, le
//   volet des gouttes dit ce que coûtera la question avant de l'envoyer ; à l'envoi, les gouttes partent vers API.
//   Feuille du bouton API : grand micro « Parle à API », « Ouvrir l'espace API » ; appui long sur le bouton : API écoute.
// Globales lues à l'appel : S, sb, esc, shell, render, go, toast, sheet, today, $sheet, $sheetForm, ACT, Apiviz, AC.
import { connu, demander, etat, etaitActif } from "./client.js";
import { rendreReponse, SUGGESTIONS } from "./rendu.js";
import { modeParDefaut, majGouttes, offreConnue, charger as chargerOffre } from "../compte/offre.js";
import { gouttesTexte, etatGouttes } from "../compte/regles-offre.js";
import * as H from "./historique.js";
import * as C from "./compagnon.js";
import * as Voix from "./voix-api.js";
import * as Ecoute from "./ecoute.js";
import * as J from "./aujourdhui.js";
import { ecrans as ecransReglages, actions as actionsReglages } from "./reglages-api.js";
import { actions as actionsAgenda } from "./agenda-api.js";

const fil = { cle: "", echanges: [], mode: null, conv: null, ruche: null, rucheFeuille: null, recherche: "", lit: null, envol: false,
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

const GOUTTE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 2.5c3.5 4.6 6.5 8.3 6.5 12a6.5 6.5 0 0 1-13 0c0-3.7 3-7.4 6.5-12z" fill="currentColor"/><ellipse cx="9.4" cy="14.2" rx="1.5" ry="2.4" fill="#FFF8E7" opacity=".85"/></svg>';
/** Coût d'une réponse, sous la réponse (IT-27) : le juste prix se voit. v5.71 : coût réel et ce qui était prévu. */
const cout = (g) => { const c = C.coutTexte(g); return c ? `<p class="as-cout"><span class="as-cout-g">${GOUTTE}${esc(c.reel)}</span><span>${esc(c.prevu)}</span></p>` : ""; };

// ---------- Lecture à voix haute ----------
const ONDE = `<span class="as-onde" aria-hidden="true">${"<i></i>".repeat(12)}</span>`;
const LIRE = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 4l13 8-13 8z"/></svg>';
const STOP = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 6h4v12H7zM13 6h4v12h-4z"/></svg>';
const boutonEcouter = (x) => (Voix.disponible() && x.reponse ? `<button type="button" class="as-ecouter${fil.lit === x.id ? " on" : ""}" data-act="apiecouter" data-v="${esc(x.id)}" aria-pressed="${fil.lit === x.id}">
  <span class="as-ec-ic">${fil.lit === x.id ? STOP : LIRE}</span><span class="as-ec-t">${fil.lit === x.id ? "Arrêter" : "Écouter"}</span>${ONDE}</button>` : "");
function majEcouter() {
  document.querySelectorAll('[data-act="apiecouter"]').forEach((b) => {
    const on = b.dataset.v === fil.lit;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    b.querySelector(".as-ec-ic").innerHTML = on ? STOP : LIRE;
    b.querySelector(".as-ec-t").textContent = on ? "Arrêter" : "Écouter";
  });
}
function lireReponse(x) {
  if (!x?.reponse) return;
  Voix.parler(C.texteReponse(x.reponse), { surDebut: () => { fil.lit = x.id; majEcouter(); }, surFin: () => { if (fil.lit === x.id) fil.lit = null; majEcouter(); } });
}

function echange(x) {
  const q = `<p class="as-q">${esc(x.question)}</p>`;
  if (x.erreur && x.code === "gouttes") return `<article class="as-ech">${q}<div class="as-rep as-erreur as-epuise" role="alert"><p>${esc(x.erreur)}</p>
    <div class="as-gestes"><button type="button" class="btn honey" data-act="go" data-v="recharge">Recharger</button><button type="button" class="btn" data-act="go" data-v="offres">Voir les offres</button></div></div></article>`;
  if (x.enCours) return `<article class="as-ech">${q}<div class="as-rep as-attente" aria-busy="true"><i></i><i></i><i></i><span class="small">API lit tes données…</span></div></article>`;
  if (x.erreur) return `<article class="as-ech">${q}<div class="as-rep as-erreur" role="alert"><p>${esc(x.erreur)}</p><button type="button" class="btn" data-act="apireessayer" data-v="${fil.echanges.indexOf(x)}">Réessayer</button></div></article>`;
  const rep = rendreReponse(x.reponse, { esc, d: S.d }).replace("</p>", `</p>${boutonEcouter(x)}${courbeReponse(x)}`);
  const local = x.local ? `<p class="as-cout as-local"><span class="as-cout-g">${x.attente ? "En attente du réseau" : "Répondu sur le téléphone"}</span><span>${x.attente ? "Je te réponds dès qu’il revient, sans rien te demander" : "Sans réseau, sans goutte"}</span></p>` : "";
  return `<article class="as-ech">${q}<div class="as-rep${x.attente ? " as-en-attente" : ""}">${rep}${conseilsReponse(x)}${apprendreHtml(x)}${local || cout(x.gouttes)}</div></article>`;
}

// ---------- v5.72 : la courbe de la ruche dans la réponse ----------
const SUJET_POIDS = /poids|pes|r[ée]serve|provision|faible|mange|perd|lourd|l[ée]g[èe]re|nourri|candy|\bkg\b|kilo|hiver/i;
/** Ruche dont parle l'échange : celle de la conversation, sinon celle nommée dans la question ou la réponse. */
const rucheEchange = (x) => (fil.ruche ? (S.d?.ruches || []).find((r) => r.id === fil.ruche) : null) || C.rucheDuTexte(`${x.question} ${x.reponse?.resume || ""}`, S.d?.ruches || []);
function courbeReponse(x) {
  if (!x.reponse || !S.d || !SUJET_POIDS.test(`${x.question} ${x.reponse.resume || ""}`)) return "";
  const r = rucheEchange(x), s = r ? C.serieRuche(S.d, r.id) : null;
  if (!s) return "";
  const L = 300, Hh = 96, g = 16, n = s.points.length, ecartKg = Math.max(1, s.max - s.min);
  const X = (i) => Math.round(g + (i * (L - 2 * g)) / Math.max(1, n - 1));
  const Y = (v) => Math.round(10 + ((s.max - v) * (Hh - 26)) / ecartKg);
  const chemin = (k) => s.points.map((p, i) => (p[k] === null ? null : `${X(i)},${Y(p[k])}`)).filter(Boolean);
  const moy = chemin("moyenne"), der = s.points[n - 1], prem = s.points[0];
  const fr = (v) => String(v).replace(".", ",");
  const jourC = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const resume = `Poids de ${s.nom} : ${fr(prem.kg)} kg le ${jourC(prem.date)}, ${fr(der.kg)} kg le ${jourC(der.date)}${der.moyenne !== null ? ` ; moyenne du rucher ${fr(der.moyenne)} kg` : ""}.`;
  return `<figure class="as-courbe"><svg viewBox="0 0 ${L} ${Hh}" role="img" aria-label="${esc(resume)}">
    <line x1="${g}" y1="${Hh - 16}" x2="${L - g}" y2="${Hh - 16}" class="as-c-axe"/>
    ${moy.length > 1 ? `<polyline points="${moy.join(" ")}" class="as-c-moy"/>` : ""}
    <polyline points="${chemin("kg").join(" ")}" class="as-c-ruche"/>
    <circle cx="${X(n - 1)}" cy="${Y(der.kg)}" r="4.5" class="as-c-point"/>
    <text x="${g}" y="${Hh - 3}" class="as-c-date">${esc(jourC(prem.date))}</text><text x="${L - g}" y="${Hh - 3}" text-anchor="end" class="as-c-date">${esc(jourC(der.date))}</text>
    <text x="${Math.min(X(n - 1), L - g)}" y="${Math.max(12, Y(der.kg) - 9)}" text-anchor="end" class="as-c-val">${esc(fr(der.kg))} kg</text>
  </svg><figcaption><span class="as-c-l ruche">${esc(s.nom)}</span>${moy.length ? '<span class="as-c-l moy">Moyenne du rucher</span>' : ""}<span class="small">D’après tes pesées</span></figcaption></figure>`;
}

// ---------- v5.72 : la mémoire qui apprend ----------
function apprendreHtml(x) {
  const a = x.apprendre;
  if (!a || a.fait) return a?.fait === "oui" ? `<p class="as-appris">${Apiviz.compagnon("fait", 26)}C’est noté. Tu le retrouves dans « Ce qu’API sait de toi ».</p>` : "";
  return `<div class="as-apprendre" role="group" aria-label="API propose de retenir">${Apiviz.compagnon("repond", 30)}<p>${esc(a.texte)}</p>
    <div class="as-gestes"><button type="button" class="btn sm" data-act="apiretenir" data-v="${esc(x.id)}">Oui, retiens-le</button><button type="button" class="link" data-act="apioublierproposition" data-v="${esc(x.id)}">Non</button></div></div>`;
}
/** Ce que la question dit de tes façons de faire, si c'est différent de ce que l'appli sait déjà. */
function aRetenir(question) {
  const a = C.apprentissage(question);
  if (!a || typeof cfg != "function" || document.documentElement.classList.contains("lecteur")) return null;
  return Number(cfg()[a.cle]) === Number(a.valeur) ? null : a;
}

// ---------- v5.72 : sans réseau ----------
const CLE_ATTENTE = "apiviz.api.attente";
const enAttente = () => { try { const l = JSON.parse(localStorage.getItem(CLE_ATTENTE) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; } };
const ecrireAttente = (l) => { try { localStorage.setItem(CLE_ATTENTE, JSON.stringify(l.slice(-5))); } catch { /* navigation privée */ } };
/** Le réseau revient : les questions en attente partent, l'une après l'autre (API disponible seulement). */
async function reprendreAttente() {
  const l = enAttente();
  if (!l.length || !enLigne() || fil.echanges.some((x) => x.enCours)) return;
  const st = await etat().catch(() => null);
  if (!st?.actif) return;
  ecrireAttente([]);
  fil.echanges = fil.echanges.filter((x) => !x.attente);
  for (const a of l) await envoyer(a.question, a.ruche || null, { reprise: true });
  toast(l.length > 1 ? `API a répondu à tes ${l.length} questions en attente` : "API a répondu à ta question en attente");
}
if (typeof window != "undefined") window.addEventListener("online", () => { reprendreAttente(); });

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
    J.suivreHistorique(h.lignes);
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

// ---------- Volet des gouttes (v5.71) ----------
const CLE_VOLET = "apiviz.api.volet";
// Ouvert par défaut sur la page de tes échanges ; replié dans une conversation (la zone pour écrire y est fixée en bas
// et ne doit pas cacher la réponse). Chaque endroit garde le dernier choix sur l'appareil.
const cleVolet = (bas) => `${CLE_VOLET}${bas ? ".conversation" : ""}`;
const voletOuvert = (bas = false) => { try { const v = localStorage.getItem(cleVolet(bas)); return v === null ? !bas : v === "1"; } catch { return !bas; } };
const CHEVRON = '<svg class="gv-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const goutteG = (t) => `<i class="gv-g" style="--t:${t}px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c3.5 4.6 6.5 8.3 6.5 12a6.5 6.5 0 0 1-13 0c0-3.7 3-7.4 6.5-12z"/><ellipse cx="9.4" cy="14.2" rx="1.5" ry="2.4"/></svg></i>`;

/** Le volet au-dessus du champ : ce que coûtera la question, la jauge, Rapide ou Approfondie. */
function volet(st, bas = false) {
  const o = offreConnue();
  if (!o) chargerOffre().then((x) => { if (x && S.route === "api") render(); }).catch(() => {});
  const forfait = Number(o?.gouttes?.forfait) || 0;
  const v = C.voletGouttes({ mode: mode(), restant: st.gouttes, forfait, aujourdhui: typeof today == "function" ? today() : null });
  const ouvert = voletOuvert(bas);
  const modes = v.vide ? "" : `<div class="as-modes gv-modes" role="group" aria-label="Type de réponse">${["rapide", "approfondi"].map((m) => {
    const e = C.ESTIMATIONS[m], on = mode() === m;
    return `<button type="button" class="as-mode gv-mode ${on ? "on" : ""}" aria-pressed="${on}" data-act="apimode" data-v="${m}"><b><span class="gv-mini" aria-hidden="true">${(m === "rapide" ? [12] : [12, 12, 12]).map(goutteG).join("")}</span>${e.nom}</b><span class="gv-est">${e.texte}</span><span class="gv-det">${e.detail}</span></button>`;
  }).join("")}</div>`;
  const jauge = v.connu ? `<div class="gv-jauge"><div class="gv-jl"><b>Tes gouttes</b><span>${esc(v.jauge)}</span></div>
      <div class="gv-barre" role="meter" aria-label="Gouttes restantes" aria-valuemin="0" aria-valuemax="${Math.max(forfait, Math.ceil(v.restant))}" aria-valuenow="${Math.round(v.restant)}"><i class="gv-reste" style="width:${v.restePct}%"></i>${v.prisPct ? `<i class="gv-pris" style="left:${v.prisDepuis}%;width:${v.prisPct}%"></i>` : ""}</div>
      ${!v.vide && v.apres !== null ? `<p class="small">Après cette question, il t’en restera environ ${v.apres}.</p>` : ""}</div>` : "";
  return `<div class="gv gv-${v.etat}${ouvert ? " ouvert" : ""}">
    <button type="button" class="gv-tete" data-act="apivolet" data-v="${bas ? "conversation" : ""}" aria-expanded="${ouvert}" aria-controls="gvCorps">
      <span class="gv-gouttes${v.vide ? " sec" : ""}" aria-hidden="true">${v.gouttes.map(goutteG).join("")}</span>
      <span class="gv-t"><b>${esc(v.titre)}</b><span>${esc(v.sous)}${ouvert ? "" : " · touche pour changer"}</span></span>${CHEVRON}</button>
    <div class="gv-corps" id="gvCorps"${ouvert ? "" : " hidden"}>${modes}${jauge}
      ${v.alerte ? `<div class="gv-alerte">${Apiviz.compagnon("attention", 30)}<span>${esc(v.alerte)}</span><button type="button" class="btn sm" data-act="apimode" data-v="rapide">Passer en Rapide</button></div>` : ""}
      ${v.vide ? '<div class="gv-deux"><button type="button" class="btn main" data-act="go" data-v="recharge">Recharger</button><button type="button" class="btn" data-act="go" data-v="offres">Voir les offres</button></div>' : ""}
      <p class="gv-puces"><span>1 goutte = 1 centime</span>${Voix.disponible() ? "<span>Voix d’API gratuite</span>" : ""}<span>Pas de réponse, pas de goutte</span></p>
    </div></div>`;
}

/** À l'envoi : les gouttes du volet s'envolent vers la pastille de l'en-tête (au-dessus de l'écran, qui se redessine). */
function envolerGouttes() {
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("rt-anim-aucune")) return;
  const vers = document.querySelector(".as-gouttes")?.getBoundingClientRect();
  document.querySelectorAll(".gv-gouttes .gv-g").forEach((g, i) => {
    const r = g.getBoundingClientRect();
    if (!r.width) return;
    const c = g.cloneNode(true);
    c.classList.add("gv-vol");
    Object.assign(c.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, animationDelay: `${i * 0.12}s` });
    c.style.setProperty("--dx", `${vers ? vers.left + vers.width / 2 - (r.left + r.width / 2) : -40}px`);
    c.style.setProperty("--dy", `${vers ? vers.top + vers.height / 2 - (r.top + r.height / 2) : -300}px`);
    document.body.append(c);
    setTimeout(() => c.remove(), 1400);
  });
}

// ---------- Zone pour écrire ----------
/** La zone pour écrire : une ligne au repos, elle s'agrandit quand on la touche et suit la longueur du texte. */
function zoneEcrire(st, { bas = false } = {}) {
  const enCours = fil.echanges.some((x) => x.enCours);
  // v5.72 : sans réseau, le champ reste ouvert (réponses du téléphone, sinon la question attend) ; plus de gouttes : grisé.
  const epuise = enLigne() && st.gouttes !== null && st.gouttes !== undefined && Number(st.gouttes) <= 0;
  const place = epuise ? "Plus de gouttes : recharge pour reposer une question" : !enLigne() ? "Sans réseau : je réponds avec ce qu’il y a sur le téléphone"
    : fil.echanges.length ? "Une autre question ?" : fil.ruche ? `Une question sur ${nomRuche(fil.ruche)}…` : "Pose ta question à API…";
  const n = enAttente().length;
  return `<form class="as-form${bas ? " as-bas" : ""}${epuise ? " epuise" : ""}" data-form="api">${enLigne() && st.gouttes !== null && st.gouttes !== undefined ? volet(st, bas) : ""}${n && !enLigne() ? `<p class="as-file small">${n > 1 ? `${n} questions attendent` : "1 question attend"} le réseau</p>` : ""}<label class="sr" for="asTexte">Ta question à API</label>
    <div class="as-ligne"><div class="as-saisie"><textarea id="asTexte" rows="1" maxlength="1000" enterkeyhint="send" placeholder="${esc(place)}" ${epuise ? "disabled" : ""}></textarea>
    <button type="submit" class="btn main as-envoyer" aria-label="Demander" ${enCours || epuise ? "disabled" : ""}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span>Demander</span></button></div>
    ${enLigne() && !enCours && !epuise ? Ecoute.boutonMicro("apimicro", "Parler à API", "as-micro") : ""}</div></form>`;
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
  // v5.71 : le volet des gouttes peut agrandir la zone ; la conversation garde la place de la voir en entier au-dessus.
  if (f.classList.contains("as-bas")) document.documentElement.style.setProperty("--as-h", `${Math.round(f.getBoundingClientRect().height)}px`);
}

// ---------- Écran ----------
function tete(st, actif, vide) {
  const p = typeof AC != "undefined" && AC.prenom ? AC.prenom() : "";
  const bonjour = actif && vide ? `<b class="as-bonjour">${new Date().getHours() < 18 ? "Bonjour" : "Bonsoir"}${p ? ` ${esc(p)}` : ""}</b>` : "";
  return `<section class="as-tete card${vide ? "" : " mini"}">${Apiviz.compagnon(humeur(fil.echanges, enLigne()), vide ? 56 : 40)}<div>${bonjour}
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
  return `<div class="as-ecran as-accueil">${tete(st, actif, true)}${S.d ? J.listeEcran() : ""}${actif ? zoneEcrire(st) : ""}${suggestions}${afaire}${cherche}
    ${h.erreur ? `<p class="small" role="alert">${esc(h.erreur)}</p>` : ""}<div class="as-liste">${listeHistorique(trouvees)}</div>${pied}</div>`;
}

function conseilsReponse(x) {
  if (!x.reponse || !x.id) return "";
  const l = H.conseilsOuverts(x).filter(({ r }) => !r.sanitaire);
  const auj = typeof today == "function" ? today() : null;
  return l.length ? `<div class="as-taches">${l.map(({ r, i }) => {
    const d = auj ? C.dateConseil(r.texte, auj) : null;
    return `<button type="button" class="btn" data-act="apiconseil" data-v="${esc(x.id)}:${i}">Créer la tâche « ${esc(H.titreConseil(r.texte))} »</button>${d ? `<button type="button" class="btn as-agenda" data-act="apiagenda" data-v="${esc(x.id)}:${i}">Ajouter à l’agenda · ${esc(C.jourCourt(d))}</button>` : ""}`;
  }).join("")}</div>` : "";
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

const HP = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>';
const HP_NON = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6"/></svg>';
/** En-tête : le haut-parleur reste en vue ; le reste part dans ⋯ (gabarit commun). */
function entete(actif, vide) {
  const lit = Voix.lire().lecture === "toujours";
  return [
    Voix.disponible() && actif ? `<button type="button" class="btn g-garder as-hp${lit ? " on" : ""}" data-act="apihp" aria-pressed="${lit}" aria-label="Lire chaque réponse à voix haute : ${lit ? "oui" : "non"}">${lit ? HP : HP_NON}</button>` : "",
    actif && Ecoute.peutEcouter() ? '<button type="button" class="btn" data-act="apimains">Mains libres</button>' : "",
    '<button type="button" class="btn" data-act="go" data-v="apimemoire">Ce qu’API sait de toi</button>',
    Voix.disponible() ? '<button type="button" class="btn" data-act="apivoix">Voix d’API</button>' : "",
    !vide ? '<button type="button" class="btn" data-act="apinouveau">Nouvelle conversation</button>' : "",
  ].join("");
}

function vue() {
  verifierCle();
  // v5.72 : sans réseau, si API était disponible ici, l'espace reste ouvert (réponses du téléphone, questions en attente).
  const st = connu() || (!enLigne() && etaitActif() ? { actif: true, restant: null, plafond: null, gouttes: null, horsLigne: true } : null);
  // v5.71 : l'état d'API peut dater d'avant une recharge ou un changement d'offre (Mon offre) : la pastille et le
  // volet suivent les gouttes de l'offre quand elles sont connues.
  const o = offreConnue();
  if (st && st.gouttes !== null && st.gouttes !== undefined && o && Number.isFinite(Number(o.gouttes?.total))) st.gouttes = Number(o.gouttes.total);
  if (!st && enLigne()) etat().then(() => { if (S.route === "api") render(); });
  if (enLigne() && enAttente().length) setTimeout(reprendreAttente, 0);
  const vide = !fil.echanges.length;
  const actif = !!(st && st.actif);
  shell("API", vide ? "Tes échanges" : "", entete(actif, vide), vide ? accueil(st, actif) : conversation(st, actif));
  brancherZone();
  if (fil.envol) { fil.envol = false; document.querySelector(".as-gouttes")?.classList.add("gv-saute"); }
  const c = document.getElementById("asCherche");
  if (c) c.addEventListener("input", () => {
    fil.recherche = c.value;
    const l = document.querySelector(".as-liste");
    if (l) l.innerHTML = listeHistorique(H.chercher(H.conversations(fil.hist.lignes), fil.hist.lignes, fil.recherche));
  });
  if (!vide) document.querySelector(".as-ech:last-child")?.scrollIntoView({ block: "start", behavior: "auto" });
}

/**
 * Envoie une question et affiche la réponse quand elle arrive. rucheId : question posée depuis la fiche d'une ruche.
 * o.dite : question dite au micro (la réponse est lue à voix haute, sauf réglage « Jamais ») ; o.mode : mode imposé
 * (mains libres : rapide) ; o.silence : ne pas lire (mains libres lit lui-même). Renvoie l'échange.
 */
export async function envoyer(texte, rucheId = null, o = {}) {
  const question = String(texte || "").trim();
  if (!question || fil.echanges.some((x) => x.enCours)) return null;
  if (!enLigne()) return repondreSansReseau(question, rucheId);
  verifierCle();
  Voix.arreter();
  if (S.route === "api") envolerGouttes();
  if (!fil.echanges.length) { fil.conv = uuid(); fil.ruche = rucheId || fil.ruche || null; }
  const historique = fil.echanges.filter((x) => x.reponse).slice(-4).map((x) => ({ question: x.question, resume: x.reponse.resume }));
  const x = { id: uuid(), question, enCours: true, conseils_suivis: [] };
  fil.echanges.push(x);
  if (S.route === "api") render(); else go("api");
  try {
    const r = await demander(H.avecRuche(question, nomRuche(fil.ruche)), historique, connu()?.gouttes !== null && connu()?.gouttes !== undefined ? o.mode || mode() : undefined);
    x.reponse = r.reponse; x.gouttes = r.gouttes || null;
    if (r.gouttes) { majGouttes(r.gouttes.restant); fil.envol = true; }
    x.created_at = new Date().toISOString();
    x.apprendre = aRetenir(question);
    garder(x);
  }
  catch (e) { x.erreur = e.message || "API n'a pas pu répondre."; x.code = e.code || ""; }
  x.enCours = false;
  if (S.route === "api") render();
  if (x.reponse && !o.silence && Voix.doitLire(Voix.lire(), !!o.dite)) lireReponse(x);
  return x;
}

/**
 * v5.72 : sans réseau, API répond sur le téléphone ce qu'il peut (dernière visite, poids, reine, traitement, stock,
 * tâches, seuil varroa) ; sinon la question attend le réseau et part toute seule quand il revient.
 */
function repondreSansReseau(question, rucheId) {
  if (!S.d) { toast("Sans réseau, API ne peut pas répondre. Réessaie une fois connecté."); return null; }
  if (!fil.echanges.length) { fil.conv = uuid(); fil.ruche = rucheId || fil.ruche || null; }
  const q = H.avecRuche(question, nomRuche(fil.ruche));
  const rep = C.reponseLocale(q, S.d, { seuil: typeof UX != "undefined" ? UX.seuilVarroa() : 3, aujourdhui: typeof today == "function" ? today() : null });
  const x = { id: uuid(), question, local: true, conseils_suivis: [], apprendre: aRetenir(question),
    reponse: rep || { resume: "Pas de réseau ici : je garde ta question et je te réponds dès qu’il revient.", faits: [], hypotheses: [], recommandations: [], manques: [] } };
  if (!rep) { x.attente = true; ecrireAttente([...enAttente(), { question, ruche: fil.ruche || null }]); }
  fil.echanges.push(x);
  if (S.route === "api") render(); else go("api");
  return x;
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
  J.suivreHistorique(fil.hist.lignes);
  if (!conv || fil.conv === conv) { fil.echanges = []; fil.conv = null; fil.ruche = null; }
  $sheet.close();
  toast(conv ? "Conversation effacée" : "Historique effacé");
  if (S.route === "api") render();
}

// ---------- Feuille du bouton API ----------
const MICRO = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
function poserChamp(st) {
  if (!st || !st.actif || !$sheet.open || $sheetForm.querySelector(".as-champ") || !$sheetForm.querySelector(".n4-tuiles")) return;
  const b = $sheetForm.querySelector(".al-bientot");
  if (b) b.textContent = "Bientôt, API lira aussi tes factures.";
  const avant = $sheetForm.querySelector(".al-cherche") || $sheetForm.querySelector(".n4-tuiles");
  // v5.62 : ouverte depuis la fiche d'une ruche, la feuille propose des questions sur cette ruche.
  const r = S.route === "ruche" && S.ruche ? (S.d?.ruches || []).find((x) => x.id === S.ruche) : null;
  fil.rucheFeuille = r ? r.id : null;
  // v5.71 : en tête, le grand micro « Parle à API » (touche et parle) ; le lien mène à l'espace API, avec ses conseils.
  const n = J.conseilsOuverts().length;
  const parle = Ecoute.peutEcouter() ? `<div class="as-parle"><button type="button" class="as-parle-b" data-act="apiparle" aria-label="${r ? `Parle à API de ${esc(r.nom)}` : "Parle à API"}">${MICRO}</button>
      <span class="as-parle-t"><b>Parle à API</b><span class="small">Touche et parle${Voix.disponible() ? ", il te répond à voix haute" : ""}</span></span>
      <button type="button" class="as-mains" data-act="apimainsfeuille">Mains libres</button></div>` : "";
  avant.insertAdjacentHTML("beforebegin", `<div class="as-champ-bloc${r ? " sur-ruche" : ""}">${parle}<div class="as-champ"><label class="sr" for="asQ">${r ? `Demande à API sur ${esc(r.nom)}` : "Demande à API"}</label>
    <input id="asQ" type="text" enterkeyhint="send" autocomplete="off" maxlength="1000" placeholder="${r ? `Question sur ${esc(r.nom)}…` : "Demande à API…"}">
    <button type="button" class="btn main" data-act="apiposer">Demander</button></div>
    ${r ? `<div class="as-qruche">${H.questionsRuche(r.nom).map((q, i) => `<button type="button" class="as-puce" data-act="apiqruche" data-v="${i}">${esc(q)}</button>`).join("")}</div>` : ""}
    <button type="button" class="as-vers" data-act="apiechanges"><span>Ouvrir l’espace API</span>${n ? `<span class="as-nb">${n} conseil${n > 1 ? "s" : ""}</span>` : ""}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>`);
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
  installerAppuiLong();
}

/**
 * v5.71 : appui long sur le bouton API (barre du bas, menu sur ordinateur) : API écoute tout de suite, sans ouvrir la
 * feuille, comme un talkie-walkie ; relâcher envoie. Un toucher simple ouvre la feuille comme avant.
 */
function installerAppuiLong() {
  if (typeof document == "undefined" || document.documentElement.dataset.apiAppui) return;
  document.documentElement.dataset.apiAppui = "1";
  let minuteur = null, long = false, bloquer = false;
  const cible = (ev) => ev.target?.closest?.('.bottom [data-v="saisir"], .side [data-v="saisir"]');
  document.addEventListener("pointerdown", (ev) => {
    if (!cible(ev) || ev.button > 0) return;
    const st = connu();
    if (!st) { etat(); return; }
    if (!st.actif || !Ecoute.peutEcouter() || !enLigne() || document.documentElement.classList.contains("lecteur")) return;
    long = false; clearTimeout(minuteur);
    minuteur = setTimeout(() => {
      long = true; bloquer = true;
      navigator.vibrate?.(15);
      Ecoute.ecouter({ maintenu: true, surTexte: (t) => { nouvelle(); envoyer(t, null, { dite: true }); } });
    }, 450);
  }, true);
  const lacher = () => {
    clearTimeout(minuteur); minuteur = null;
    if (long) { long = false; Ecoute.relacher(); setTimeout(() => { bloquer = false; }, 700); }
  };
  document.addEventListener("pointerup", lacher, true);
  document.addEventListener("pointercancel", lacher, true);
  document.addEventListener("click", (ev) => { if (bloquer && cible(ev)) { ev.preventDefault(); ev.stopImmediatePropagation(); bloquer = false; } }, true);
  document.addEventListener("contextmenu", (ev) => { if (cible(ev)) ev.preventDefault(); }, true);
}
installer();

/** Repart sans conversation ouverte (rucheId : la prochaine question porte sur cette ruche). */
function nouvelle(rucheId = null) { fil.echanges = []; fil.conv = null; fil.ruche = rucheId || null; }

/** Tâche préremplie d'après un conseil ; avec date : l'échéance dite par le conseil. */
function tacheConseil(v, avecDate) {
  const c = conseil(v);
  if (!c) return;
  const titre = H.titreConseil(c.r.texte);
  ACT.newtache(c.x.ruche_id || "");
  const champ = $sheetForm.querySelector("[name=titre]");
  if (champ) champ.value = titre;
  const d = avecDate && typeof today == "function" ? C.dateConseil(c.r.texte, today()) : null;
  const date = $sheetForm.querySelector("[name=echeance]");
  if (d && date) { date.value = d; date.dispatchEvent(new Event("input", { bubbles: true })); date.dispatchEvent(new Event("change", { bubbles: true })); }
  // Le conseil est noté comme suivi une fois la tâche enregistrée (pas si la feuille est fermée sans enregistrer).
  $sheet.addEventListener("close", () => { if ((S.d?.taches || []).some((t) => t.titre === (champ?.value || titre))) suivre(c.x, c.i); }, { once: true });
}

/** Mains libres : chaque question part en réponse rapide, API la lit lui-même. */
function ouvrirMains() {
  const st = connu();
  Ecoute.mainsLibres({
    poser: async (t) => { const x = await envoyer(t, fil.echanges.length ? null : fil.ruche, { mode: "rapide", silence: true, dite: true }); return !x ? { erreur: "API est encore en train de répondre." } : x.erreur ? { erreur: x.erreur } : { reponse: x.reponse }; },
    cout: st && st.gouttes !== null && st.gouttes !== undefined ? `Rapide · ${C.ESTIMATIONS.rapide.texte} par question` : "",
    lieu: nomRuche(fil.ruche),
    surFin: () => { if (S.route === "api") render(); },
  });
}

export const actions = {
  // v5.72 : la mémoire qui apprend.
  apiretenir: async (id) => {
    const x = fil.echanges.find((y) => y.id === id), a = x?.apprendre;
    if (!a) return;
    const appris = { ...((typeof cfg == "function" && cfg().apiAppris) || {}), [a.cle]: typeof today == "function" ? today() : new Date().toISOString().slice(0, 10) };
    try { await saveCfg({ [a.cle]: a.valeur, apiAppris: appris }, "API s’en souviendra"); a.fait = "oui"; }
    catch { toast("Je n’ai pas pu l’enregistrer. Réessaie."); }
    if (S.route === "api") render();
  },
  apioublierproposition: (id) => { const x = fil.echanges.find((y) => y.id === id); if (x?.apprendre) x.apprendre.fait = "non"; render(); },
  apimainsfeuille: () => { $sheet.close(); ouvrirMains(); },
  // v5.71 : parler à API.
  apiparle: () => { const r = fil.rucheFeuille; $sheet.close(); Ecoute.ecouter({ surTexte: (t) => { nouvelle(r); envoyer(t, r, { dite: true }); } }); },
  apimicro: () => Ecoute.ecouter({ surTexte: (t) => { if (S.route !== "api") nouvelle(); envoyer(t, null, { dite: true }); } }),
  apimains: () => ouvrirMains(),
  apihp: () => { const p = Voix.lire(); p.lecture = p.lecture === "toujours" ? "mains" : "toujours"; Voix.ecrire(p); if (p.lecture !== "toujours") Voix.arreter(); toast(p.lecture === "toujours" ? "API lira chaque réponse à voix haute" : "API lira seulement quand tu lui parles"); render(); },
  apiecouter: (id) => {
    const x = fil.echanges.find((y) => y.id === id);
    if (fil.lit === id) { Voix.arreter(); fil.lit = null; majEcouter(); return; }
    lireReponse(x);
  },
  apivolet: (v) => {
    const bas = v === "conversation", ouvert = !voletOuvert(bas);
    try { localStorage.setItem(cleVolet(bas), ouvert ? "1" : "0"); } catch { /* navigation privée */ }
    const t = document.getElementById("asTexte")?.value || "";
    render();
    const c = document.getElementById("asTexte"); if (c && t) c.value = t;
  },
  ...Ecoute.actions,
  ...J.actions,
  ...actionsReglages,
  ...actionsAgenda,
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
  apiconseil: (v) => tacheConseil(v, false),
  // v5.71 : la même tâche, avec l'échéance que le conseil donne (« avant samedi »).
  apiagenda: (v) => tacheConseil(v, true),
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

export default [{ id: "api", titre: "API", rubrique: "saisir", rendu: vue, actions }, ...ecransReglages];
