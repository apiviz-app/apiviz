// Apiviz — Réglages › API (v5.71, maquette « Réglages : un groupe API qui réunit tout » du 20 nov. 2026).
//   - Groupe « API » entre « L'exploitation » et « Sur le terrain » : Offre et gouttes d'API (déplacée), Ce qu'API sait de
//     toi, Voix d'API, Conseils d'API.
//   - « Ce qu'API sait de toi » (écran apimemoire) : tes façons de faire telles qu'API les lit (réglages et saisies),
//     chacune avec son geste pour la changer ; ce qu'API lit, ce qu'il garde ; effacer tes échanges.
//   - « Voix d'API » : feuille où chaque choix s'essaie aussitôt (comme Sons et vibrations), propre à cet appareil.
//   - « Conseils d'API » : « Pour aujourd'hui » sur l'Accueil ou la priorité seule, une ou trois lignes ; cet appareil.
// Globales lues à l'appel : S, esc, cfg, shell, sheet, render, toast, $sheetForm, ACT, UX.
import * as Voix from "./voix-api.js";
import { prefsConseils, ecrirePrefs } from "./aujourdhui.js";
import { seuilVarroa } from "../sante/regles.js";

const FL = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const ic = (d) => `<span class="rg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;
const P = {
  memoire: "M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9zM9 12h6M12 9v6",
  voix: "M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12",
  conseils: "M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
};
const ligne = (act, v, icone, titre, sous, valeur) => `<button type="button" class="rg-l" data-act="${act}"${v ? ` data-v="${esc(v)}"` : ""}>${icone}<span class="rg-t"><b>${esc(titre)}</b><span>${esc(sous)}</span></span>${valeur ? `<span class="rg-v">${esc(valeur)}</span>` : FL}</button>`;
const reglages = () => (typeof cfg == "function" ? cfg() : {}) || {};
const fr = (x) => String(Math.round(Number(x) * 10) / 10).replace(".", ",");
const resumeConseils = (p) => [p.accueil ? (p.lignes === 1 ? "La priorité sur l’Accueil" : "Trois choses utiles sur l’Accueil") : "La priorité seule",
  p.notif ? "un conseil par jour" : "", p.lundi ? "point du lundi" : ""].filter(Boolean).join(" · ");

/** Après le rendu de « reglages » : le groupe API, avec la ligne « Offre et gouttes d'API » déplacée dedans. */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector(".rg-api")) return;
  const titres = [...document.querySelectorAll(".rg-groupes h2.rg-g")];
  const terrain = titres.find((h) => h.textContent.trim() === "Sur le terrain");
  if (!terrain) return;
  terrain.insertAdjacentHTML("beforebegin", `<h2 class="rg-g rg-g-api">${typeof Apiviz != "undefined" ? Apiviz.compagnon("repos", 24) : ""}API</h2><div class="rg-bloc rg-api">
    ${ligne("go", "apimemoire", ic(P.memoire), "Ce qu’API sait de toi", `${seuilVarroa(reglages()) ? `Seuil varroa ${fr(seuilVarroa(reglages()))} %` : "Seuils varroa"}, tes traitements, ta météo de visite`)}
    ${Voix.disponible() ? ligne("apivoix", "", ic(P.voix), "Voix d’API", Voix.resume(Voix.lire())) : ""}
    ${ligne("apiconseilsreglage", "", ic(P.conseils), "Conseils d’API", resumeConseils(prefsConseils()))}
  </div>`);
  const offre = document.querySelector('.rg-l[data-v="offre"]');
  if (offre) document.querySelector(".rg-api").prepend(offre);
}

// ---------- Ce qu'API sait de toi ----------
function dernierTraitement() {
  const v = (S.d?.visites || []).filter((x) => String(x.traitement || "").trim()).sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)))[0];
  return v ? { quoi: String(v.traitement).trim(), quand: new Date(`${String(v.date_visite).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) } : null;
}

function memoire() {
  const c = reglages(), s = typeof MT != "undefined" ? MT.SEUILS : null, t = dernierTraitement();
  const nbR = (S.d?.ruches || []).length, nbL = typeof UX != "undefined" ? UX.ruchers().length : 0;
  const item = (titre, valeur, source, act, v, geste = "Modifier") => `<div class="mm-l"><span class="mm-t"><span class="small">${esc(titre)}</span><b>${esc(valeur)}</b>${source ? `<span class="small mm-src">${esc(source)}</span>` : ""}</span>
    ${act ? `<button type="button" class="link mm-geste" data-act="${act}"${v ? ` data-v="${esc(v)}"` : ""}>${esc(geste)}</button>` : ""}</div>`;
  const obj = Number(c.objectif_recolte) || 0, hiver = Number(c.hiverPoids) || 0;
  // v5.72 : ce qu'API a retenu en parlant avec toi (apiAppris : clé → date), avec « Oublier ».
  const appris = c.apiAppris && typeof c.apiAppris == "object" ? c.apiAppris : {};
  const dateAppris = (k) => new Date(`${appris[k]}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const source = (k, sinon) => (appris[k] ? `Appris le ${dateAppris(k)} en parlant avec API` : sinon);
  const geste = (k, act, libelle = "Modifier") => (appris[k] ? ["apioublier", k, "Oublier"] : [act, "", libelle]);
  shell("Ce qu’API sait de toi", "Tes façons de faire, telles qu’API les lit", "", `<div class="mm-ecran">
    <section class="card mm-intro">${typeof Apiviz != "undefined" ? Apiviz.compagnon("repos", 44) : ""}<p>Je réponds avec <b>tes</b> données et <b>tes</b> réglages, jamais avec une méthode toute faite. Si quelque chose est faux ici, corrige-le : mes conseils suivront. Dis-moi aussi tes façons de faire en me parlant (« mon seuil varroa est de 2 % ») : je te proposerai de les retenir.</p></section>
    <h2 class="rg-g">Tes façons de faire</h2><div class="rg-bloc mm-bloc">
      ${item("Seuil d’alerte varroa", seuilVarroa(c) ? `${fr(seuilVarroa(c))} varroas pour 100 abeilles` : (S.d?.seuils || []).length ? "Seuils sourcés, par méthode et période" : "Aucun seuil choisi",
        source("varroaSeuil", c.varroaSeuil ? "Ton réglage, source non notée" : "Pas de seuil par défaut : ajoute celui de ton GDSA ou de ton technicien, avec sa source"), ...geste("varroaSeuil", "saversseuils", "Voir les seuils"))}
      ${item("Dernier traitement noté", t ? t.quoi : "Aucun traitement noté", t ? `Le ${t.quand}, d’après tes visites` : "Note-le dans la visite : je saurai quand reparler du varroa", t ? "" : null)}
      ${item("Poids d’alerte en hiver", hiver ? `${fr(hiver)} kg` : "Pas fixé", source("hiverPoids", hiver ? "Ton réglage" : "Dis-le-moi : « en hiver, je m’alerte sous 18 kg »"), ...(appris.hiverPoids ? geste("hiverPoids") : ["", ""]))}
      ${item("Objectif de récolte", obj ? `${obj} kg` : "Pas fixé", source("objectif_recolte", obj ? "Ton réglage" : ""), ...geste("objectif_recolte", "rtobjectif", obj ? "Modifier" : "Fixer"))}
      ${s ? item("Météo pour ouvrir", `Dès ${s.ouvrir} °C, vent sous ${s.vent} km/h`, "Tes seuils de météo de visite", "errgmeteo") : ""}
    </div>
    <h2 class="rg-g">Ce que je lis</h2><div class="rg-bloc mm-bloc">
      ${item("Ton exploitation", `${nbR} ruche${nbR > 1 ? "s" : ""}${nbL ? ` · ${nbL} rucher${nbL > 1 ? "s" : ""}` : ""}`, "Visites, pesées, traitements, récoltes, ventes, dépenses, stock et agenda", "")}
      ${item("Ce que je fais", "Je lis, je propose, tu valides", "Je n’enregistre rien seul : chaque tâche passe par ton accord", "")}
    </div>
    <h2 class="rg-g">Ce que je garde</h2><div class="rg-bloc mm-bloc">
      ${item("Tes échanges avec API", "Visibles de toi seul", "Ni revendus ni utilisés pour entraîner un modèle", "apieffacertout", "", "Tout effacer")}
      ${item("La voix", "Sur ton téléphone", "La lecture à voix haute ne quitte pas ton téléphone et ne coûte aucune goutte", Voix.disponible() ? "apivoix" : "", "", "Régler")}
    </div></div>`);
  document.querySelector(".wrap")?.classList.add("rg-ecran");
}

// ---------- Voix d'API ----------
let essai = null;
const segments = (cle, options, actif, titre) => `<div class="rt-titre">${esc(titre)}</div><div class="seg rt-seg" role="radiogroup" aria-label="${esc(titre)}" style="grid-template-columns:repeat(${options.length},minmax(0,1fr))">${options.map(([v, l]) =>
  `<button type="button" role="radio" aria-checked="${v === actif}" class="${v === actif ? "on" : ""}" data-act="apivoixregle" data-k="${cle}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;
function corpsVoix() {
  const p = essai, lecture = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 4l13 8-13 8z"/></svg>';
  return `<div class="rt-reglages av-reglages">
    ${segments("lecture", Object.entries(Voix.LECTURES), p.lecture, "Lire les réponses à voix haute")}
    <p class="small">${p.lecture === "mains" ? "API répond à voix haute quand tu lui parles au micro, et en mains libres." : p.lecture === "toujours" ? "API lit aussi les réponses aux questions écrites." : "Réponses écrites seulement ; le mode mains libres lit quand même."}</p>
    <div class="rt-titre">Voix</div>
    <div class="rt-ambiances" role="radiogroup" aria-label="Voix">${Object.entries(Voix.VOIX).map(([k, [nom, d]]) =>
      `<button type="button" role="radio" aria-checked="${p.voix === k}" class="rt-ambiance${p.voix === k ? " on" : ""}" data-act="apivoixregle" data-k="voix" data-v="${k}"><span class="rt-lire" aria-hidden="true">${lecture}</span><span><b>${esc(nom)}</b><span>${esc(d)}</span></span></button>`).join("")}</div>
    ${segments("vitesse", Object.entries(Voix.VITESSES), p.vitesse, "Vitesse")}
    <p class="small">Les voix viennent de ton téléphone : elles marchent sans réseau et ne coûtent aucune goutte.</p>
  </div>`;
}
function ouvrirVoix() {
  essai = Voix.lire();
  let garde = false;
  sheet({ title: "Voix d’API", intro: "Chaque choix s’essaie tout de suite. Ils restent propres à cet appareil.", fields: [], label: "Enregistrer",
    submit: async () => { garde = true; Voix.ecrire(essai); render(); toast("Voix d’API réglée"); } });
  $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", corpsVoix());
  document.getElementById("sheet")?.addEventListener("close", () => { if (!garde) Voix.arreter(); essai = null; }, { once: true });
}
function reglerVoix(v, k) {
  if (!essai || !k) return;
  essai = Voix.normaliser({ ...essai, [k]: v });
  const z = $sheetForm.querySelector(".av-reglages");
  if (z) z.outerHTML = corpsVoix();
  if (k !== "lecture") Voix.parler("Bonjour, je suis API. Voilà comment je te lirai mes réponses.", { p: essai });
}

// ---------- Conseils d'API ----------
let essaiC = null;
function corpsConseils() {
  const p = essaiC;
  const choix = (k, opts, actif, titre) => `<div class="rt-titre">${esc(titre)}</div><div class="seg rt-seg" role="radiogroup" aria-label="${esc(titre)}" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map(([v, l]) =>
    `<button type="button" role="radio" aria-checked="${String(v) === String(actif)}" class="${String(v) === String(actif) ? "on" : ""}" data-act="apiconseilsregle" data-k="${k}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;
  return `<div class="rt-reglages ac-reglages">
    ${choix("accueil", [["oui", "Pour aujourd’hui"], ["non", "La priorité seule"]], p.accueil ? "oui" : "non", "Sur l’Accueil")}
    ${p.accueil ? choix("lignes", [[1, "Une ligne"], [3, "Trois lignes"]], p.lignes, "Combien de choses à la fois") : ""}
    ${choix("notif", [["oui", "Un par jour au plus"], ["non", "Jamais"]], p.notif ? "oui" : "non", "Me prévenir d’un conseil")}
    ${choix("lundi", [["oui", "Le lundi"], ["non", "Non"]], p.lundi ? "oui" : "non", "Le point de la semaine")}
    <p class="small">Les conseils arrivent dans tes Rappels (la cloche), et en notification si tu les as autorisées dans Réglages › Rappels. Jamais pendant une visite.</p>
    <p class="small">API ne parle que de ce qui vient de tes données : priorité du jour, bon créneau météo, priorités de la saison, matériel sous le seuil, tâches en retard, conseils pas encore faits.</p>
  </div>`;
}
function ouvrirConseils() {
  essaiC = prefsConseils();
  sheet({ title: "Conseils d’API", intro: "Ce qu’API te montre et t’envoie de lui-même. Propre à cet appareil.", fields: [], label: "Enregistrer",
    submit: async () => { ecrirePrefs(essaiC); render(); toast("Conseils d’API réglés"); } });
  $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", corpsConseils());
  document.getElementById("sheet")?.addEventListener("close", () => { essaiC = null; }, { once: true });
}
function reglerConseils(v, k) {
  if (!essaiC) return;
  if (k === "accueil") essaiC.accueil = v === "oui";
  if (k === "lignes") essaiC.lignes = Number(v) === 1 ? 1 : 3;
  if (k === "notif") essaiC.notif = v === "oui";
  if (k === "lundi") essaiC.lundi = v === "oui";
  const z = $sheetForm.querySelector(".ac-reglages");
  if (z) z.outerHTML = corpsConseils();
}

/** v5.72 : oublier ce qu'API a retenu en parlant avec toi (le réglage revient à sa valeur par défaut). */
async function oublier(cle) {
  const c = reglages(), appris = { ...(c.apiAppris || {}) };
  if (!cle || !appris[cle]) return;
  delete appris[cle];
  try { await saveCfg({ [cle]: null, apiAppris: Object.keys(appris).length ? appris : null }, "C’est oublié"); } catch { toast("Je n’ai pas pu l’oublier. Réessaie."); }
}

export const actions = {
  apioublier: oublier,
  apivoix: ouvrirVoix, apivoixregle: reglerVoix,
  apiconseilsreglage: ouvrirConseils, apiconseilsregle: reglerConseils,
};

export const ecrans = [
  { id: "apimemoire", titre: "Ce qu’API sait de toi", rubrique: "plus", rendu: memoire },
];
