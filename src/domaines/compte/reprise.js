// Apiviz — reprendre son carnet (v5.85, maquette « apiviz — Onboarding irréprochable », écrans 5 et 6, validée par
// Pierre-Louis le 24 nov. 2026). Après le premier rucher (parcours d'arrivée) et depuis Réglages › Tes données :
//   - route « reprendre » : photographier son carnet (API le lit : fonction serveur « lire-carnet »), importer un
//     tableur (CSV, Excel, LibreOffice : tu choisis les colonnes), ou partir de zéro ;
//   - route « carnet » : ce qui a été compris, une question seulement en cas de doute, ce que deviennent les ruches
//     (reprises, renommées, ajoutées) ; « Importer » écrit tout, « Annuler l'import » défait tout.
// Rien n'est écrit en base avant « Importer ». Règles pures : regles-reprise.js et lire-carnet/regles.js.
// Globales lues à l'appel : S, sb, esc, $app, go, render, toast, fail, loadAll, byId, today, dshort, APIDOO, Noyau.
import * as R from "./regles-reprise.js";

const e = (t) => (typeof esc == "function" ? esc(t) : String(t ?? ""));
const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const exploitation = () => (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";
const enLigne = () => typeof navigator == "undefined" || navigator.onLine !== false;
const PAGES_MAX = 6, COTE_MAX = 2000, TAILLE_MAX = 10 * 1024 * 1024;
const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const ICONE = (d, t = 24) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const FL = ICONE("M9 5l7 7-7 7", 20);

const st = () => (S.reprise ||= { pieces: [], carnet: null, source: "", fichier: "", lignes: null, colonnes: {}, choix: {}, etat: "", message: "", fait: null });
let dispo = null, dispoDe = "";

// ---------- Fonction serveur ----------
async function appeler(corps) {
  const { data } = await sb.auth.getSession();
  const jeton = data?.session?.access_token;
  if (!jeton) throw Object.assign(new Error("Connecte-toi pour donner ton carnet à API."), { code: "connexion" });
  const x = exploitation();
  const rep = await fetch(`${window.APIDOO.url}/functions/v1/lire-carnet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}`, apikey: window.APIDOO.key, ...(x ? { "x-exploitation": x } : {}) },
    body: JSON.stringify(corps),
  });
  const j = await rep.json().catch(() => ({}));
  if (!rep.ok) throw Object.assign(new Error(j.erreur || "API n'a pas pu lire ton carnet. Réessaie dans un instant."), { code: j.code || String(rep.status) });
  return j;
}
/** La lecture des photos est-elle possible ici ? (fonction déployée, clé présente, réseau) */
async function photoPossible() {
  if (!enLigne()) return false;
  if (dispo !== null && dispoDe === exploitation()) return dispo;
  try { dispo = (await appeler({ etat: true })).actif === true; } catch { dispo = false; }
  dispoDe = exploitation();
  return dispo;
}

// ---------- Fichiers ----------
const base64 = (blob) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(blob); });
async function photoAllegee(f) {
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, COTE_MAX / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    if (blob) return { blob, type: "image/jpeg" };
  } catch { /* format que le navigateur ne redessine pas : envoyé tel quel s'il est accepté */ }
  return { blob: f, type: f.type };
}
function chargerXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = XLSX_URL; s.onload = () => ok(window.XLSX); s.onerror = () => ko(new Error("Le lecteur de fichiers Excel n'a pas pu se charger : vérifie le réseau, ou enregistre ton fichier en CSV.")); document.head.append(s); });
}
async function lireTableur(f) {
  const nom = f.name || "tableur";
  if (/\.(csv|txt)$/i.test(nom) || /csv|text\/plain/.test(f.type)) return R.lireCsv(await f.text());
  const X = await chargerXlsx();
  const classeur = X.read(await f.arrayBuffer(), { type: "array", cellDates: true });
  const feuille = classeur.Sheets[classeur.SheetNames[0]];
  return X.utils.sheet_to_json(feuille, { header: 1, raw: true, defval: "" }).filter((l) => l.some((x) => String(x).trim() !== ""));
}

// ---------- Écran « reprendre » (5) ----------
function ecranReprendre() {
  const r = st(), nouveau = !!S.arReprise;
  const rucher = S.arReprise?.rucher, nb = S.arReprise?.nb;
  const option = (act, fond, icone, titre, detail, extra = "") => `<button type="button" class="rp-option" data-act="${act}"${extra}><span class="rp-ic" style="background:${fond}">${icone}</span><span class="rp-t"><b>${e(titre)}</b><span>${e(detail)}</span></span>${FL}</button>`;
  const pages = r.pieces.length ? `<section class="rp-pages"><b>${r.pieces.length} page${r.pieces.length > 1 ? "s" : ""} prête${r.pieces.length > 1 ? "s" : ""}</b>
      <div class="rp-vignettes">${r.pieces.map((p, i) => p.apercu ? `<img src="${p.apercu}" alt="Page ${i + 1}">` : `<span class="rp-pdf">PDF</span>`).join("")}</div>
      <div class="rp-deux">${r.pieces.length < PAGES_MAX && r.pieces[0]?.type !== "application/pdf" ? '<button type="button" class="btn" data-act="rpphoto">Ajouter une page</button>' : ""}<button type="button" class="btn main" data-act="rplire">Lire ${r.pieces.length > 1 ? `les ${r.pieces.length} pages` : "la page"}</button></div>
      <button type="button" class="ar-lien sombre" data-act="rpvider">Recommencer</button></section>` : "";
  const corps = r.etat === "lecture"
    ? `<section class="rp-attente" role="status"><span class="ar-api-mini" aria-hidden="true">API</span><div><b>API lit ton carnet…</b><p class="ar-petit">Une page prend une vingtaine de secondes. Reste sur cet écran.</p></div></section>`
    : `${pages || `<div class="rp-options">
        ${option("rpphoto", "var(--honeysoft)", ICONE("M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"), "Photographier mon carnet", dispo === false ? "La lecture des photos n'est pas encore disponible ici" : "API lit tes pages et te montre ce qu'il a compris", dispo === false ? " disabled" : "")}
        ${option("rptableur", "#E3EDF7", ICONE("M4 4h16v16H4zM4 10h16M4 15h16M10 4v16"), "Importer un tableur", "Excel, LibreOffice ou CSV : tu choisis les colonnes")}
        ${option("rpzero", "#EEF0EA", ICONE("M12 5v14M5 12h14"), "Je pars de zéro", nouveau ? "Parfait pour commencer avec une visite" : "Rien à reprendre")}
      </div>`}
      ${r.message ? `<p class="ob-err" role="alert">${e(r.message)}</p>` : ""}
      <section class="rp-garde"><b>Rien n'est enregistré sans toi</b><span>Tu vérifies chaque ruche avant d'importer, et tu peux tout annuler ensuite.</span></section>`;
  $app.innerHTML = `<div class="ar ar-clair" data-ecran="reprendre"><main class="ar-corps ar-centre">
    ${nouveau ? `<section class="rp-pret"><span class="rp-coche" aria-hidden="true">${ICONE("M5 12l5 5L20 7", 22)}</span><span><b>${e(rucher || "Ton rucher")} est prêt</b><span>${nb > 1 ? `${nb} ruches créées, de Ruche 1 à Ruche ${nb}` : "1 ruche créée"}</span></span></section>`
      : '<header class="rp-retour"><button type="button" class="ar-lien sombre" data-act="rpfermer">‹ Retour</button></header>'}
    <div class="rp-titre"><h1 class="ar-titre-c">Tu as déjà un carnet ou un tableur ?</h1><p class="ar-petit">Inutile de tout ressaisir : Apiviz reprend tes ruches et tes visites.</p></div>
    ${corps}
    <div class="ar-fin">${r.etat === "lecture" ? "" : `<button type="button" class="ar-lien sombre" data-act="rpzero">${nouveau ? "Plus tard, depuis Réglages › Tes données" : "Fermer"}</button>`}</div>
    <input type="file" id="rpPhoto" accept="image/*,application/pdf" multiple hidden><input type="file" id="rpTableur" accept=".csv,.txt,.xlsx,.xls,.ods,text/csv" hidden>
  </main></div>`;
  $app.querySelector("#rpPhoto").addEventListener("change", (ev) => recevoirPhotos([...ev.target.files]));
  $app.querySelector("#rpTableur").addEventListener("change", (ev) => recevoirTableur(ev.target.files[0]));
  if (dispo === null || dispoDe !== exploitation()) photoPossible().then(() => { if (S.route === "reprendre" && !st().pieces.length && st().etat !== "lecture") ecranReprendre(); });
}

async function recevoirPhotos(fichiers) {
  const r = st();
  r.message = "";
  for (const f of fichiers) {
    if (r.pieces.length >= PAGES_MAX) { r.message = `${PAGES_MAX} pages au plus à la fois : lis-les, puis recommence pour les suivantes.`; break; }
    const pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
    if (f.size > TAILLE_MAX) { r.message = "Fichier trop lourd : 10 Mo au plus."; continue; }
    if (pdf) { r.pieces = [{ type: "application/pdf", donnees: (await base64(f)).split(",")[1], nom: f.name }]; break; }
    if (!/^image\//.test(f.type)) { r.message = "Format non pris en charge : photo ou PDF."; continue; }
    if (r.pieces[0]?.type === "application/pdf") r.pieces = [];
    const { blob, type } = await photoAllegee(f);
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) { r.message = "Cette photo n'a pas pu être préparée. Essaie en JPG."; continue; }
    const url = await base64(blob);
    r.pieces.push({ type, donnees: url.split(",")[1], apercu: url, nom: f.name });
  }
  ecranReprendre();
}

async function lirePhotos() {
  const r = st();
  if (!r.pieces.length) return;
  r.etat = "lecture"; r.message = "";
  ecranReprendre();
  try {
    const rep = await appeler({ pieces: r.pieces.map((p) => ({ type: p.type, donnees: p.donnees })) });
    if (rep.gouttes) { window.Noyau?.offre?.maj?.(rep.gouttes.restant); toast(`Carnet lu par API : ${window.Noyau?.offre?.gouttes?.(rep.gouttes.cout) || rep.gouttes.cout + " gouttes"}.`); }
    r.etat = "";
    if (!rep.carnet?.lisible || !rep.carnet.ruches?.length) { r.message = rep.carnet?.raison || "Je ne trouve aucune ruche sur ces pages. Essaie une photo plus nette, bien à plat."; return ecranReprendre(); }
    Object.assign(r, { carnet: rep.carnet, source: "photo", choix: {}, lignes: null, fait: null });
    go("carnet");
  } catch (err) {
    r.etat = "";
    r.message = !enLigne() || err instanceof TypeError ? "Pas de réseau pour lire ton carnet. Réessaie quand tu en as." : err.message;
    ecranReprendre();
  }
}

async function recevoirTableur(f) {
  const r = st();
  if (!f) return;
  r.message = "";
  try {
    const lignes = await lireTableur(f);
    if (lignes.length < 2) throw new Error("Ce fichier est vide, ou n'a qu'une ligne.");
    Object.assign(r, { lignes, fichier: f.name || "tableur", colonnes: R.detecterColonnes(lignes[0]), source: "tableur", choix: {}, fait: null, pieces: [] });
    r.carnet = R.tableurVersCarnet(lignes, r.colonnes, today());
    go("carnet");
  } catch (err) { r.message = err.message || "Ce fichier n'a pas pu être lu."; ecranReprendre(); }
}

// ---------- Écran « carnet » (6) ----------
const existantes = () => (S.d?.ruches || []).filter((x) => !x.sortie).map((x) => ({ id: x.id, nom: x.nom, rucher: x.rucher || "" }));
const visitees = () => new Set((S.d?.visites || []).map((v) => v.ruche_id));

function ecranCarnet() {
  const r = st();
  if (!r.carnet) { go("reprendre"); return; }
  if (r.fait) return ecranFait();
  const c = r.carnet, res = R.resume(c), doutes = c.ruches.map((x, i) => [x, i]).filter(([x]) => x.a_verifier);
  const sansReponse = doutes.filter(([, i]) => !(i in r.choix)).length;
  const plan = R.planImport(existantes(), visitees(), c, r.choix);
  const nbRuches = c.ruches.filter((x, i) => !(x.a_verifier && r.choix[i] === null)).length;
  const statut = (x, i) => {
    if (x.a_verifier && r.choix[i] === null) return ["Ignorée", "gris"];
    const nom = x.a_verifier && r.choix[i] ? r.choix[i] : x.nom;
    if (plan.creer.some((y) => y.nom === nom)) return ["Ajoutée", "miel"];
    const ren = plan.renommer.find((y) => y.nom === nom);
    if (ren) return [`Reprend ${ren.ancien}`, "vert"];
    return ["Compris", "vert"];
  };
  const tete = r.source === "photo"
    ? `<div class="rp-pile" aria-hidden="true">${r.pieces.slice(0, 3).map((p) => p.apercu ? `<img src="${p.apercu}" alt="">` : '<span class="rp-pdf">PDF</span>').join("")}</div><div><h1 class="ar-titre-c rp-h">${r.pieces.length} page${r.pieces.length > 1 ? "s" : ""} lue${r.pieces.length > 1 ? "s" : ""}</h1><span class="ar-petit">${e(R.texteImport(res.ruches, res.visites))} reconnues</span></div>`
    : `<span class="rp-ic" style="background:#E3EDF7">${ICONE("M4 4h16v16H4zM4 10h16M4 15h16M10 4v16")}</span><div><h1 class="ar-titre-c rp-h">${e(r.fichier)}</h1><span class="ar-petit">${e(R.texteImport(res.ruches, res.visites))} trouvées</span></div>`;
  const colonnes = r.source === "tableur" ? `<details class="rp-colonnes"${r.colonnes.ruche === undefined ? " open" : ""}><summary>Colonnes du tableur</summary>
      <div class="rp-grille">${R.COLONNES.map((k) => `<label>${e(k.nom)}${k.k === "ruche" ? " *" : ""}<select data-col="${k.k}"><option value="">—</option>${(r.lignes?.[0] || []).map((h, j) => `<option value="${j}" ${r.colonnes[k.k] === j ? "selected" : ""}>${e(String(h) || `Colonne ${j + 1}`)}</option>`).join("")}</select></label>`).join("")}</div></details>` : "";
  const questions = doutes.map(([x, i]) => {
    const props = x.propositions?.length ? x.propositions : [x.nom];
    return `<section class="rp-doute${i in r.choix ? " repondu" : ""}"><div class="rp-doute-t"><b>Une question</b><span class="tag watch">${i in r.choix ? "réglé" : "doute"}</span></div>
      <p>${e(x.raison || `Le nom « ${x.nom} » est peu lisible.`)}</p><p><b>${props.length > 1 ? `C'est ${props.map((p) => `« ${e(p)} »`).join(" ou ")} ?` : `C'est bien « ${e(props[0])} » ?`}</b></p>
      <div class="rp-deux">${props.map((p) => `<button type="button" class="rp-puce${r.choix[i] === p ? " on" : ""}" data-act="rpchoix" data-k="${i}" data-v="${e(p)}">${e(p)}</button>`).join("")}<button type="button" class="rp-puce${r.choix[i] === null ? " on" : ""}" data-act="rpchoix" data-k="${i}" data-v="">Ignorer</button></div></section>`;
  }).join("");
  const liste = c.ruches.slice(0, 3).map((x, i) => {
    const [t, ton] = statut(x, i), der = x.visites[x.visites.length - 1];
    return `<div class="rp-ligne"><span class="rp-hexa" aria-hidden="true">${e(x.nom.replace(/^ruche\s*/i, "R").slice(0, 4))}</span><span class="rp-l"><b>${e(x.nom)}${x.rucher ? ` · ${e(x.rucher)}` : ""}</b><span>${x.visites.length ? `${x.visites.length} visite${x.visites.length > 1 ? "s" : ""} · dernière le ${e(dshort(der.date))}` : "Sans visite datée"}</span></span><span class="rp-tag ${ton}">${e(t)}</span></div>`;
  }).join("");
  const ren = plan.renommer.length, cre = plan.creer.length;
  const explication = [ren ? `${ren} ruche${ren > 1 ? "s" : ""} créée${ren > 1 ? "s" : ""} d'office ${ren > 1 ? "prennent" : "prend"} les noms du carnet` : "", cre ? `${cre} ruche${cre > 1 ? "s" : ""} ${cre > 1 ? "sont ajoutées" : "est ajoutée"}` : ""].filter(Boolean).join(" ; ");
  const bloque = sansReponse > 0 || !plan.visites.length && !cre && !ren;
  $app.innerHTML = `<div class="ar ar-clair" data-ecran="carnet"><header class="ar-tete"><button type="button" class="ar-lien sombre" data-act="rpretour">‹ Retour</button><span></span></header>
    <main class="ar-corps rp-carnet">
      <div class="rp-entete">${tete}</div>
      ${!c.lisible ? `<p class="ob-err" role="alert">${e(c.raison)}</p>` : ""}
      ${colonnes}${questions}
      ${c.ruches.length ? `<section class="rp-liste">${liste}${c.ruches.length > 3 ? `<div class="rp-autres">+ ${c.ruches.length - 3} autre${c.ruches.length > 4 ? "s" : ""} ruche${c.ruches.length > 4 ? "s" : ""}</div>` : ""}</section>` : ""}
      ${explication ? `<p class="ar-petit">${e(explication)}.</p>` : ""}
      <div class="ar-fin">
        <button type="button" class="btn main block" data-act="rpimporter" ${bloque ? "disabled" : ""}>${sansReponse ? `Réponds ${sansReponse > 1 ? `aux ${sansReponse} questions` : "à la question"} d'abord` : `Importer ${e(R.texteImport(nbRuches, plan.visites.length))}`}</button>
        <button type="button" class="ar-lien sombre" data-act="rpautre">${r.source === "photo" ? "Reprendre une photo" : "Choisir un autre fichier"}</button>
      </div>
    </main></div>`;
  $app.querySelectorAll("select[data-col]").forEach((s) => s.addEventListener("change", () => {
    const v = s.value === "" ? undefined : Number(s.value);
    if (v === undefined) delete r.colonnes[s.dataset.col]; else r.colonnes[s.dataset.col] = v;
    r.carnet = R.tableurVersCarnet(r.lignes, r.colonnes, today());
    ecranCarnet();
    $app.querySelector(".rp-colonnes")?.setAttribute("open", "");
  }));
}

async function importer(_v, _k, bouton) {
  const r = st();
  if (!r.carnet || S.busy) return;
  if (!enLigne()) return toast("Il faut du réseau pour importer ton carnet", true);
  const plan = R.planImport(existantes(), visitees(), r.carnet, r.choix);
  if (bouton) { bouton.disabled = true; bouton.textContent = "Import en cours…"; }
  S.busy = true;
  const fait = { renommees: [], creees: [], visites: [] };
  try {
    for (const x of plan.renommer) {
      const res = await sb.from("ruches").update({ nom: x.nom }).eq("id", x.id);
      if (res.error) throw res.error;
      fait.renommees.push(x);
    }
    const ids = {};
    if (plan.creer.length) {
      const lignes = plan.creer.map((x) => ({ id: (ids[x.cle] = nouvelId()), nom: x.nom, rucher: x.rucher }));
      const res = await sb.from("ruches").insert(lignes);
      if (res.error) throw res.error;
      fait.creees.push(...lignes.map((l) => l.id));
    }
    for (const { ruche, visite } of plan.visites) {
      const rid = ids[ruche] || ruche, ru = byId(S.d.ruches, rid);
      const p = R.chargeVisite(visite, { id: nouvelId(), ruche_id: rid, etat: ru?.etat || "Bonne" });
      const res = await sb.rpc("creer_visite", { p });
      if (res.error) throw res.error;
      fait.visites.push(p.id);
    }
    fait.texte = R.texteImport(new Set([...fait.renommees.map((x) => x.id), ...fait.creees, ...plan.visites.map((v) => ids[v.ruche] || v.ruche)]).size, fait.visites.length);
    r.fait = fait;
    await loadAll();
    window.Retours?.niveau?.(3);
    render();
  } catch (err) {
    r.fait = null;
    await defaire(fait).catch(() => {});
    fail(err);
    toast("L'import s'est arrêté : rien n'a été gardé. Réessaie.", true);
  } finally { S.busy = false; }
}

/** Défait un import : visites, ruches ajoutées, noms d'origine. */
async function defaire(f) {
  if (f.visites.length) { const r = await sb.from("visites").delete().in("id", f.visites); if (r.error) throw r.error; }
  if (f.creees.length) { const r = await sb.from("ruches").delete().in("id", f.creees); if (r.error) throw r.error; }
  for (const x of f.renommees) { const r = await sb.from("ruches").update({ nom: x.ancien }).eq("id", x.id); if (r.error) throw r.error; }
}

function ecranFait() {
  const f = st().fait;
  $app.innerHTML = `<div class="ar ar-clair" data-ecran="carnet-fait"><main class="ar-corps ar-centre">
    <div class="ar-bravo"><span class="rp-coche grand" aria-hidden="true">${ICONE("M5 12l5 5L20 7", 34)}</span>
      <h1 class="ar-titre-c">Ton carnet est repris</h1><p class="ar-petit">${e(f.texte)} dans Apiviz. Chaque visite garde la mention « repris du carnet ».</p></div>
    <div class="ar-fin"><button type="button" class="btn main block" data-act="rpcontinuer">Continuer</button>
      <button type="button" class="ar-lien sombre" data-act="rpannuler">Annuler l'import</button></div>
  </main></div>`;
}

function terminer(versVisite) {
  const nouveau = !!S.arReprise;
  S.reprise = null; S.arReprise = null;
  if (nouveau && versVisite && window.Arrivee) return window.Arrivee.ouvrirVisite();
  go("dash");
}

const FLR = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
/** Réglages › Tes données : « Reprendre un carnet ou un tableur » (responsables et membres). */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector('[data-act="rpouvrir"]')) return;
  if (document.documentElement.classList.contains("lecteur")) return;
  document.querySelector(".rg-donnees")?.insertAdjacentHTML("afterbegin", `<button type="button" class="rg-l" data-act="rpouvrir"><span class="rg-ic" aria-hidden="true">${ICONE("M4 4h16v16H4zM4 10h16M4 15h16M10 4v16", 20)}</span><span class="rg-t"><b>Reprendre un carnet ou un tableur</b><span>Photo de ton carnet, Excel ou CSV</span></span>${FLR}</button>`);
}

/** Après le premier rucher (demarrage.js) : l'écran « reprendre », avec le bandeau « Le Verger est prêt ». */
export function apresRucher({ rucher, nb } = {}) {
  S.reprise = null;
  S.arReprise = { rucher, nb };
  go("reprendre");
}

export const ecrans = [
  { id: "reprendre", titre: "Reprendre mon carnet", rubrique: "plus", rendu: () => ecranReprendre() },
  { id: "carnet", titre: "Carnet lu", rubrique: "plus", rendu: () => ecranCarnet() },
];

export const actions = {
  rpphoto: () => document.getElementById("rpPhoto")?.click(),
  rptableur: () => document.getElementById("rpTableur")?.click(),
  rplire: () => lirePhotos(),
  rpvider: () => { st().pieces = []; st().message = ""; ecranReprendre(); },
  rpzero: () => terminer(true),
  rpfermer: () => terminer(false),
  rpretour: () => { const r = st(); r.carnet = null; r.fait = null; go("reprendre"); },
  rpautre: () => { const r = st(), photo = r.source === "photo"; Object.assign(r, { carnet: null, pieces: [], lignes: null, fait: null, message: "" }); go("reprendre"); setTimeout(() => document.getElementById(photo ? "rpPhoto" : "rpTableur")?.click(), 50); },
  rpchoix: (v, k) => { const r = st(); r.choix[Number(k)] = v === "" ? null : v; ecranCarnet(); },
  rpimporter: importer,
  rpcontinuer: () => terminer(false),
  rpannuler: async () => {
    const f = st().fait;
    if (!f) return;
    try { await defaire(f); st().fait = null; await loadAll(); toast("Import annulé : tout est comme avant"); go("reprendre"); } catch (err) { fail(err); }
  },
  rpouvrir: () => { S.arReprise = null; S.reprise = null; go("reprendre"); },
};

if (typeof window != "undefined") window.Reprise = { apresRucher, ouvrir: () => actions.rpouvrir() };
