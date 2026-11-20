// Apiviz — parler à API (v5.71, maquettes « Espace API dans l'appli actuelle » du 20 nov. 2026, écrans 1 et 4).
//   - ecouter() : la fenêtre « API t'écoute… » (micro de la feuille du bouton API, de l'Accueil, de l'écran API, et
//     appui long sur le bouton API). Toucher : on parle, l'écoute s'arrête au silence ou sur « Envoyer ». Appui long :
//     on parle tant qu'on appuie, relâcher envoie.
//   - mainsLibres() : plein écran sombre, pour le rucher avec des gants. On parle, API répond en réponse rapide et la
//     lit à voix haute ; toucher n'importe où pour reparler ; Pause, Répéter, Terminer en gros boutons. L'écran reste
//     allumé.
// Reconnaissance vocale du navigateur, après l'information « Avant de dicter » de la visite à la voix (VX.avantDictee) ;
// lecture à voix haute par le téléphone (voix-api.js).
// Globales lues à l'appel : Apiviz, esc, toast, ACT, VX.
import * as Voix from "./voix-api.js";
import { texteReponse } from "./compagnon.js";

const Reco = () => (typeof window != "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
/** Vrai si le navigateur sait écouter. */
export const peutEcouter = () => !!Reco();
const horsLigne = () => typeof navigator != "undefined" && navigator.onLine === false;
const consentir = (suite) => (typeof VX != "undefined" && VX.avantDictee ? VX.avantDictee(suite) : suite());
const MICRO = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const ICONES = {
  pause: "M8 5v14M16 5v14",
  repeter: "M4 11a8 8 0 0 1 14-4.5L20 9M20 4v5h-5M20 13a8 8 0 0 1-14 4.5L4 15M4 20v-5h5",
  fin: "M6 6l12 12M18 6L6 18",
};
const ic = (k, t = 28) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONES[k]}"/></svg>`;

/** Bouton micro réutilisé par la feuille, l'Accueil et l'écran API. */
export const boutonMicro = (act, label = "Parler à API", cls = "") => (peutEcouter() ? `<button type="button" class="ae-micro ${cls}" data-act="${act}" aria-label="${esc(label)}">${MICRO}</button>` : "");

// ---------- Fenêtre « API t'écoute » ----------
let dlg = null, reco = null, verrou = null;
const E = { texte: "", prov: "", maintenu: false, surTexte: null, fini: false, erreur: "" };

function fenetre(id, cls) {
  let d = document.getElementById(id);
  if (!d) {
    d = document.createElement("dialog"); d.id = id; d.className = cls;
    document.body.append(d);
    // Le dialogue est hors de #app : ses boutons d'action sont relayés ici (comme la visite à la voix).
    d.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-act]");
      if (b && ACT[b.dataset.act]) { ev.stopPropagation(); ACT[b.dataset.act](b.dataset.v, b.dataset.k, b); return; }
      if (id === "apiMains") toucherScene(ev);
    });
  }
  return d;
}

function arreterReco() {
  const r = reco; reco = null;
  if (r) { r.onresult = null; r.onerror = null; r.onend = null; try { r.stop(); } catch { /* déjà arrêtée */ } }
}

function dessinerEcoute() {
  if (!dlg) return;
  const t = (E.texte + " " + E.prov).trim();
  dlg.querySelector(".ae-dit").textContent = t ? `« ${t} »` : E.erreur || (E.maintenu ? "Parle tant que tu appuies…" : "Parle, je t’écoute…");
  dlg.querySelector(".ae-dit").classList.toggle("vide", !t);
  const env = dlg.querySelector('[data-act="aeenvoyer"]');
  if (env) env.disabled = !t;
}

function demarrer(surFin) {
  const R = Reco();
  if (!R) return;
  const r = new R();
  r.lang = "fr-FR"; r.continuous = false; r.interimResults = true;
  r.onresult = (ev) => {
    let prov = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) E.texte = `${E.texte} ${t.trim()}`.trim(); else prov += t;
    }
    E.prov = prov.trim();
    surFin.partiel?.();
  };
  r.onerror = (ev) => {
    if (ev.error === "no-speech" || ev.error === "aborted") return;
    E.erreur = ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Autorise le micro pour parler à API." : "Je n’entends pas. Réessaie.";
  };
  r.onend = () => { reco = null; E.texte = `${E.texte} ${E.prov}`.trim(); E.prov = ""; surFin.fin?.(); };
  reco = r;
  try { r.start(); } catch { reco = null; E.erreur = "Je n’arrive pas à ouvrir le micro."; surFin.fin?.(); }
}

function finEcoute() {
  if (!dlg?.open || E.fini) return;
  if (E.texte) return envoyerEcoute();
  dessinerEcoute();
  dlg.querySelector("api-compagnon")?.setAttribute("etat", "attention");
  const p = dlg.querySelector(".ae-pied");
  if (p && !E.maintenu) p.innerHTML = `<button type="button" class="btn" data-act="aefermer">Annuler</button><button type="button" class="btn main" data-act="aereessayer">Réessayer</button>`;
  if (E.maintenu) setTimeout(fermerEcoute, 1200);
}

function envoyerEcoute() {
  const t = `${E.texte} ${E.prov}`.trim(), suite = E.surTexte;
  E.fini = true;
  fermerEcoute();
  if (t && suite) suite(t);
}

function fermerEcoute() {
  arreterReco();
  if (dlg?.open) dlg.close();
}

/**
 * Ouvre « API t'écoute… ». surTexte(texte) reçoit ce qui a été dit. maintenu : appui long (relâcher envoie).
 */
export function ecouter({ surTexte, maintenu = false, titre = "API t’écoute…" } = {}) {
  if (!peutEcouter()) return toast("Ce téléphone ne sait pas écouter : écris ta question.");
  if (horsLigne()) return toast("Sans réseau, API ne peut pas répondre. Réessaie une fois connecté.");
  const ouvrir = () => {
    Voix.arreter();
    Object.assign(E, { texte: "", prov: "", maintenu, surTexte, fini: false, erreur: "" });
    dlg = fenetre("apiEcoute", "ae-dlg");
    dlg.innerHTML = `<div class="ae-carte" role="group" aria-label="${esc(titre)}">
      <div class="ae-tete">${Apiviz.compagnon("ecoute", 56)}<div><b>${esc(titre)}</b><span class="small">${maintenu ? "Relâche pour envoyer" : "L’écoute s’arrête quand tu te tais"}</span></div></div>
      <p class="ae-dit vide" aria-live="polite"></p>
      <div class="ae-onde" aria-hidden="true">${"<i></i>".repeat(18)}</div>
      ${maintenu ? "" : `<div class="ae-pied"><button type="button" class="btn" data-act="aefermer">Annuler</button><button type="button" class="btn main" data-act="aeenvoyer" disabled>Envoyer</button></div>`}
    </div>`;
    dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); fermerEcoute(); }, { once: true });
    if (!dlg.open) dlg.showModal();
    dessinerEcoute();
    demarrer({ partiel: dessinerEcoute, fin: finEcoute });
  };
  if (maintenu && !(typeof VX != "undefined" && VX.dicteeAcceptee?.())) return consentir(() => toast("C’est prêt : reste appuyé sur API et parle."));
  consentir(ouvrir);
}

/** Appui long relâché : l'écoute s'arrête, ce qui a été dit part. */
export function relacher() {
  if (!dlg?.open || !E.maintenu) return;
  if (reco) { try { reco.stop(); } catch { finEcoute(); } } else finEcoute();
}

// ---------- Mains libres ----------
let M = null;

function dessinerMains() {
  const d = document.getElementById("apiMains");
  if (!d || !M) return;
  const humeur = M.phase === "ecoute" ? "ecoute" : M.phase === "reflexion" ? "reflexion" : M.phase === "erreur" ? "attention" : M.phase === "lecture" ? "repond" : "repos";
  d.innerHTML = `<div class="am-haut"><span class="am-puce"><i></i>Mains libres${M.lieu ? ` · ${esc(M.lieu)}` : ""}</span><span class="am-cout">${esc(M.cout)}</span></div>
    <div class="am-dit">${M.dit ? `<span class="am-lab">Tu as dit</span><p>« ${esc(M.dit)} »</p>` : `<p class="am-aide">${M.phase === "ecoute" ? "Parle, je t’écoute…" : "Touche n’importe où pour parler"}</p>`}</div>
    <div class="am-scene"><span class="am-ondes${M.phase === "ecoute" || M.phase === "lecture" ? " on" : ""}" aria-hidden="true"></span>${Apiviz.compagnon(humeur, 112, "sombre")}</div>
    ${M.reponse ? `<div class="am-rep" aria-live="polite"><span class="am-lab">${M.phase === "lecture" ? "API répond à voix haute" : "API a répondu"}</span><p>${esc(M.reponse)}</p>${M.source ? `<span class="am-src">${esc(M.source)}</span>` : ""}</div>`
      : M.phase === "reflexion" ? `<div class="am-rep"><p class="am-aide">API lit tes données…</p></div>` : M.erreur ? `<div class="am-rep"><p>${esc(M.erreur)}</p></div>` : ""}
    <p class="am-touche">${M.phase === "ecoute" ? "J’écoute…" : M.phase === "reflexion" ? "Un instant…" : "Touche n’importe où pour reparler"}</p>
    <div class="am-gros">
      <button type="button" class="am-b" data-act="ampause">${ic("pause")}<span>Pause</span></button>
      <button type="button" class="am-b" data-act="amrepeter" ${M.reponse ? "" : "disabled"}>${ic("repeter")}<span>Répéter</span></button>
      <button type="button" class="am-b am-fin" data-act="amfin">${ic("fin")}<span>Terminer</span></button>
    </div>`;
}

function ecouterMains() {
  if (!M || horsLigne()) { if (M) { M.phase = "erreur"; M.erreur = "Pas de réseau : API ne peut pas répondre ici."; dessinerMains(); } return; }
  Voix.arreter();
  Object.assign(E, { texte: "", prov: "", erreur: "" });
  M.phase = "ecoute"; M.dit = ""; dessinerMains();
  demarrer({
    partiel: () => { M.dit = `${E.texte} ${E.prov}`.trim(); const p = document.querySelector("#apiMains .am-dit"); if (p) p.innerHTML = `<span class="am-lab">Tu as dit</span><p>« ${esc(M.dit)} »</p>`; },
    fin: () => {
      if (!M) return;
      const t = E.texte.trim();
      if (!t) { M.phase = "pause"; M.erreur = E.erreur || ""; dessinerMains(); return; }
      M.dit = t; poserMains(t);
    },
  });
}

async function poserMains(t) {
  M.phase = "reflexion"; M.reponse = ""; M.source = ""; M.erreur = ""; dessinerMains();
  const r = await M.poser(t).catch((e) => ({ erreur: e?.message || "API n’a pas pu répondre." }));
  if (!M) return;
  if (!r || r.erreur || !r.reponse) { M.phase = "erreur"; M.erreur = r?.erreur || "API n’a pas pu répondre."; dessinerMains(); return; }
  M.reponse = texteReponse(r.reponse);
  const f = (r.reponse.faits || []).find((x) => x.date);
  M.source = f ? `D’après tes données du ${new Date(`${f.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "";
  lireMains();
}

function lireMains() {
  if (!M?.reponse) return;
  M.phase = "lecture"; dessinerMains();
  Voix.parler(M.reponse, { surFin: () => { if (M && M.phase === "lecture") { M.phase = "pret"; dessinerMains(); } } });
}

function toucherScene(ev) {
  if (!M || ev.target.closest("button")) return;
  if (["pret", "pause", "erreur", "lecture"].includes(M.phase)) ecouterMains();
}

/**
 * Ouvre le mode mains libres. poser(texte) pose la question à API et renvoie { reponse } ou { erreur } ;
 * cout : ce que coûte une question, affiché en haut (« Rapide · moins d'1 goutte par question ») ; lieu : rucher ou ruche.
 */
export function mainsLibres({ poser, cout = "", lieu = "", surFin } = {}) {
  if (!peutEcouter()) return toast("Ce téléphone ne sait pas écouter : écris ta question.");
  consentir(() => {
    M = { phase: "pret", dit: "", reponse: "", source: "", erreur: "", poser, cout, lieu, surFin };
    const d = fenetre("apiMains", "am-dlg");
    d.addEventListener("cancel", (ev) => { ev.preventDefault(); ACT.amfin(); }, { once: true });
    if (!d.open) d.showModal();
    navigator.wakeLock?.request?.("screen").then((w) => { verrou = w; }).catch(() => {});
    ecouterMains();
  });
}

function finirMains() {
  arreterReco(); Voix.arreter();
  verrou?.release?.().catch?.(() => {}); verrou = null;
  const suite = M?.surFin;
  M = null;
  const d = document.getElementById("apiMains");
  if (d?.open) d.close();
  suite?.();
}

export const actions = {
  aeenvoyer: () => envoyerEcoute(),
  aefermer: () => { E.fini = true; fermerEcoute(); },
  aereessayer: () => { const s = E.surTexte; ecouter({ surTexte: s }); },
  ampause: () => { if (!M) return; arreterReco(); Voix.arreter(); M.phase = "pause"; dessinerMains(); },
  amrepeter: () => lireMains(),
  amfin: () => finirMains(),
};
