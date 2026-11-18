// Apiviz — écran « API » (IT-24, AP-FEAT-107 et 108) : questions en langage naturel sur ses données, réponses en
// quatre blocs (faits datés avec liens vers les fiches, hypothèses, recommandations, informations manquantes).
// - Feuille du bouton API : un champ « Demande à API… » en tête, quand la fonction serveur est disponible.
//   Sinon rien ne change : « Bientôt, API répondra à tes questions » reste (retour arrière : ASSISTANT_ACTIF=non).
// - Écran « api » : la conversation, gardée en mémoire seulement (rien n'est enregistré, ni ici ni sur le serveur),
//   effacée au changement d'exploitation ou au rechargement.
// - API est en lecture seule : aucune saisie n'est faite depuis cet écran (IT-25).
// Globales lues à l'appel : S, sb, esc, shell, render, go, toast, $sheet, $sheetForm, ACT, Apiviz.
import { connu, demander, etat } from "./client.js";
import { rendreReponse, SUGGESTIONS } from "./rendu.js";
import { modeParDefaut, majGouttes } from "../compte/offre.js";
import { gouttesTexte, etatGouttes } from "../compte/regles-offre.js";

const fil = { cle: "", echanges: [], mode: null };
const mode = () => fil.mode || modeParDefaut();
const cleExploitation = () => (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";
const enLigne = () => typeof navigator == "undefined" || navigator.onLine !== false;

function verifierCle() {
  const c = cleExploitation();
  if (c !== fil.cle) { fil.cle = c; fil.echanges = []; }
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
  return `<article class="as-ech">${q}<div class="as-rep">${rendreReponse(x.reponse, { esc, d: S.d })}${cout(x.gouttes)}</div></article>`;
}

function vue() {
  verifierCle();
  const st = connu();
  if (!st) etat().then(() => { if (S.route === "api") render(); });
  const vide = !fil.echanges.length;
  const actif = !!(st && st.actif);
  const tete = `<section class="as-tete card">${Apiviz.compagnon(humeur(fil.echanges, enLigne()), 56)}<div>
      <p>${actif ? (vide ? "Pose-moi une question sur tes ruches, ton miel ou tes comptes. Je lis tes données et je te dis d’où viennent mes réponses." : "Une autre question ?")
        : st ? "Bientôt, API répondra à tes questions sur tes ruches, ton miel et tes comptes." : "Un instant, je me prépare…"}</p>
      ${actif && restant(st) ? `<span class="small">${esc(restant(st))}</span>` : ""}</div>
      ${actif && st.gouttes !== null && st.gouttes !== undefined ? `<button type="button" class="as-gouttes ${etatGouttes(st.gouttes)}" data-act="go" data-v="offre" aria-label="Gouttes d'API : ${esc(gouttesTexte(st.gouttes))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>${esc(String(Math.max(0, Math.round(st.gouttes))))}</button>` : ""}</section>`;
  const suggestions = actif && vide
    ? `<div class="as-sugg" aria-label="Exemples de questions">${SUGGESTIONS.map((s, i) => `<button type="button" class="as-puce" data-act="apisugg" data-v="${i}">${esc(s)}</button>`).join("")}</div>` : "";
  const enCours = fil.echanges.some((x) => x.enCours);
  const champ = actif
    ? `<form class="as-form" data-form="api"><label class="sr" for="asTexte">Ta question à API</label>
        <textarea id="asTexte" rows="2" maxlength="1000" placeholder="${enLigne() ? "Demande à API…" : "Sans réseau, API ne peut pas répondre"}" ${enLigne() ? "" : "disabled"}></textarea>
        <button type="submit" class="btn main" ${enCours || !enLigne() ? "disabled" : ""}>Demander</button>
        ${st.gouttes !== null && st.gouttes !== undefined ? `<div class="as-modes" role="group" aria-label="Type de réponse">${[["rapide", "Rapide"], ["approfondi", "Approfondie"]].map(([m, t]) =>
          `<button type="button" class="as-mode ${mode() === m ? "on" : ""}" aria-pressed="${mode() === m}" data-act="apimode" data-v="${m}">${t}</button>`).join("")}<span class="small">${mode() === "rapide" ? "moins d’1 goutte" : "environ 2 à 4 gouttes"}</span></div>` : ""}</form>
       <p class="small as-note">API peut se tromper : vérifie dans tes fiches. Tes questions ne sont pas conservées.</p>` : "";
  shell("API", "", !vide ? `<button type="button" class="btn" data-act="apinouveau">Nouvelle conversation</button>` : "",
    `<div class="as-ecran">${tete}${suggestions}<div class="as-fil">${fil.echanges.map(echange).join("")}</div>${champ}</div>`);
  const f = document.querySelector(".as-form");
  if (f) {
    f.addEventListener("submit", (e) => { e.preventDefault(); envoyer(f.querySelector("textarea").value); });
    const t = f.querySelector("textarea");
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); envoyer(t.value); } });
  }
  document.querySelector(".as-ech:last-child")?.scrollIntoView({ block: "start", behavior: "auto" });
}

/** Envoie une question et affiche la réponse quand elle arrive. */
export async function envoyer(texte) {
  const question = String(texte || "").trim();
  if (!question || fil.echanges.some((x) => x.enCours)) return;
  if (!enLigne()) { toast("Sans réseau, API ne peut pas répondre. Réessaie une fois connecté."); return; }
  verifierCle();
  const historique = fil.echanges.filter((x) => x.reponse).slice(-4).map((x) => ({ question: x.question, resume: x.reponse.resume }));
  const x = { question, enCours: true };
  fil.echanges.push(x);
  if (S.route === "api") render(); else go("api");
  try {
    const r = await demander(question, historique, connu()?.gouttes !== null && connu()?.gouttes !== undefined ? mode() : undefined);
    x.reponse = r.reponse; x.gouttes = r.gouttes || null;
    if (r.gouttes) majGouttes(r.gouttes.restant);
  }
  catch (e) { x.erreur = e.message || "API n'a pas pu répondre."; x.code = e.code || ""; }
  x.enCours = false;
  if (S.route === "api") render();
}

// ---------- Feuille du bouton API ----------
function poserChamp(st) {
  if (!st || !st.actif || !$sheet.open || $sheetForm.querySelector(".as-champ") || !$sheetForm.querySelector(".n4-tuiles")) return;
  const b = $sheetForm.querySelector(".al-bientot");
  if (b) b.textContent = "Bientôt, API lira aussi tes factures.";
  const avant = $sheetForm.querySelector(".al-cherche") || $sheetForm.querySelector(".n4-tuiles");
  avant.insertAdjacentHTML("beforebegin", `<div class="as-champ"><label class="sr" for="asQ">Demande à API</label>
    <input id="asQ" type="text" enterkeyhint="send" autocomplete="off" maxlength="1000" placeholder="Demande à API…">
    <button type="button" class="btn main" data-act="apiposer">Demander</button></div>`);
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

export const actions = {
  apiposer: () => {
    const q = document.getElementById("asQ")?.value || "";
    if (!q.trim()) return document.getElementById("asQ")?.focus();
    $sheet.close();
    envoyer(q);
  },
  apisugg: (i) => envoyer(SUGGESTIONS[Number(i)]),
  apimode: (m) => {
    const t = document.getElementById("asTexte")?.value || "";
    fil.mode = m === "rapide" ? "rapide" : "approfondi"; render();
    const c = document.getElementById("asTexte"); if (c && t) { c.value = t; c.focus(); }
  },
  apinouveau: () => { fil.echanges = []; render(); setTimeout(() => document.getElementById("asTexte")?.focus(), 0); },
  apireessayer: (i) => {
    const x = fil.echanges[Number(i)];
    if (!x) return;
    fil.echanges.splice(Number(i), 1);
    envoyer(x.question);
  },
};

export default [{ id: "api", titre: "API", rubrique: "saisir", rendu: vue, actions }];
