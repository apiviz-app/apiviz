// Apiviz — donner une facture à API (v5.52, maquettes « Import de facture » validées le 16 nov. 2026).
// Quatre étapes dans la feuille du bas :
//   1. Source : « Prendre en photo » (appareil photo, une ou plusieurs pages) ou « Importer un fichier » (PDF, PNG, JPG,
//      10 Mo au plus), ou « Saisir toi-même » (la feuille « Ajouter un achat » d'achat.js) ;
//   2. Lecture : la fonction serveur « lire-facture » envoie la facture et ton catalogue à Claude, et rend un relevé ;
//   3. Validation : chaque ligne, rapprochée d'un article (ou nouvel article, ou sans stock), avec le stock avant et
//      après ; les lignes douteuses bloquent l'intégration tant qu'elles ne sont pas réglées ; qui a acheté, avec quel
//      argent (entre associés, v5.29) ;
//   4. Intégration : enregistrer_achat() (migration 018, file d'envoi d'offline.js), puis le résumé des mouvements.
// Rien n'est écrit en base avant la validation. Règles pures : facture-regles.js.
// Globales d'app.js lues à l'appel : S, esc, eur, today, $sheet, $sheetForm, toast, refresh, render, fournOpts, ACT,
// sb, APIDOO, HL, Apiviz.
import * as R from "../materiel/regles.js";
import * as V from "./facture-regles.js";
import { champsAchatAssocies } from "./entre-associes.js";
import { SOCIETE } from "./associes.js";

const e = (t) => esc(t);
const nouvelId = () => crypto.randomUUID();
// Même règle que stockSuivi() de catalogue.js (redite ici : catalogue.js importe ce module, pas d'import circulaire).
const stockSuivi = () => !S.absentes?.has("mouvements");
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const exploitation = () => (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";
const enLigne = () => typeof navigator == "undefined" || navigator.onLine !== false;
const quant = (q, unite) => R.quantite(q, unite);
const nombre = (v) => (v === "" || v == null ? 0 : Number(String(v).replace(",", ".")) || 0);
const PAGES_MAX = 4, TAILLE_MAX = 10 * 1024 * 1024, COTE_MAX = 2000;

// ---------- Fonction serveur ----------
let dispo = null, cleDispo = "", enVol = null;

async function appeler(corps) {
  const { data } = await sb.auth.getSession();
  const jeton = data?.session?.access_token;
  if (!jeton) throw Object.assign(new Error("Connecte-toi pour donner ta facture à API."), { code: "connexion" });
  const x = exploitation();
  const rep = await fetch(`${window.APIDOO.url}/functions/v1/lire-facture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}`, apikey: window.APIDOO.key, ...(x ? { "x-exploitation": x } : {}) },
    body: JSON.stringify(corps),
  });
  const j = await rep.json().catch(() => ({}));
  if (!rep.ok) throw Object.assign(new Error(j.erreur || "API n'a pas pu lire ta facture. Réessaie dans un instant."), { code: j.code || String(rep.status) });
  return j;
}

/** La lecture de facture est-elle disponible ici ? Un échec vaut « non » et n'est pas gardé. */
export function disponible() {
  if (!enLigne()) return Promise.resolve(false);
  if (dispo !== null && cleDispo === exploitation()) return Promise.resolve(dispo);
  if (enVol) return enVol;
  const cle = exploitation();
  enVol = appeler({ etat: true })
    .then((r) => { dispo = r.actif === true; cleDispo = cle; return dispo; })
    // Réponse du serveur (fonction absente, refus) : gardée pour la session. Panne réseau : redemandée la prochaine fois.
    .catch((err) => { if (err?.code && err.code !== "connexion") { dispo = false; cleDispo = cle; } return false; })
    .finally(() => { enVol = null; });
  return enVol;
}
/** Disponibilité déjà connue et positive (sans appel) : pour les écrans dessinés d'un coup (Matériel, feuille d'API). */
export const dispoConnue = () => dispo === true && cleDispo === exploitation();
/** Pour les tests : oublie la disponibilité. */
export function _oublier() { dispo = null; cleDispo = ""; enVol = null; }

const peutEcrire = () => !document.documentElement.classList.contains("lecteur");

/**
 * « Ajouter un achat » sans préremplissage : la feuille Source si API peut lire les factures (réponse en 1,5 s au
 * plus), sinon `repli` (la saisie à la main).
 */
export async function ouvrirOuSaisir(repli, { direct = false } = {}) {
  poser();
  if (!stockSuivi() || !enLigne() || !peutEcrire()) return repli();
  const ok = direct && dispoConnue() ? true : await Promise.race([disponible(), new Promise((r) => setTimeout(() => r(false), 1500))]);
  if (!ok) return repli();
  S.facture = S.facture?.etape === "validation" ? S.facture : { etape: "source", pieces: [], repli };
  S.facture.repli = repli;
  dessiner();
  if (!$sheet.open) $sheet.showModal();
}

/** « Donner une facture à API » (v5.53) : la feuille Source directement, sans passer par « Dépense ». */
export const ouvrirFacture = (repli) => ouvrirOuSaisir(repli, { direct: true });

/** La facture est-elle proposée ici (Matériel suivi, réseau, droit d'écrire, API disponible) ? Sans appel. */
export const factureProposee = () => stockSuivi() && enLigne() && peutEcrire() && dispoConnue();

/** Ligne « Donner une facture à API » de la feuille du bouton API (src/domaines/accueil/feuille-api.js). */
export const ligneFacture = () => `<button type="button" class="fx-entree" data-act="n4q" data-v="newfacture">
  <span class="fx-ic">${icone("photo")}</span><span class="fx-t"><b>Donner une facture à API</b><span>Photo ou PDF, il remplit ton stock</span></span>${icone("suite")}</button>`;

// ---------- Rendu ----------
const ETAPES = { source: 1, pages: 1, analyse: 2, erreur: 2, validation: 3, fait: 4 };
const NOMS_ETAPES = { 1: "Nouvel achat", 2: "Lecture", 3: "Validation", 4: "Intégration" };

function entete(n) {
  return `<div class="fx-tete"><div class="fx-tete-l"><h2>${e(NOMS_ETAPES[n])}</h2><span class="small">Étape ${n} sur 4</span></div>
    <div class="fx-etapes" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<span class="${i <= n ? "on" : ""}"></span>`).join("")}</div></div>`;
}

function dessiner() {
  const f = S.facture;
  if (!f) return;
  const n = ETAPES[f.etape] || 1;
  const corps = { source, pages, analyse, erreur: erreurLecture, validation, fait }[f.etape]();
  $sheetForm.innerHTML = `<div class="fx" data-etape="${e(f.etape)}">${entete(n)}${corps}</div>`;
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
}

function choixSource() {
  return `<div class="fx-choix">
      <label class="fx-source fx-photo"><input type="file" accept="image/*" capture="environment" data-fx-fichier="photo" class="fx-cache">
        <span class="fx-ic">${icone("photo")}</span><span class="fx-t"><b>Prendre en photo</b><span>Facture papier ou ticket, plusieurs pages possibles</span></span>${icone("suite")}</label>
      <label class="fx-source"><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" data-fx-fichier="fichier" class="fx-cache">
        <span class="fx-ic">${icone("fichier")}</span><span class="fx-t"><b>Importer un fichier</b><span>PDF, PNG ou JPG, 10 Mo au plus</span></span>${icone("suite")}</label>
    </div>`;
}

function source() {
  const f = S.facture;
  const recents = derniersAchats();
  return `<p class="fx-say">Donne ta facture à API, il la lit pour toi.</p>
    <p class="small fx-sous">Il retrouve le fournisseur et les lignes. Rien n'entre dans ton stock avant ta validation.</p>
    ${choixSource()}
    ${f.message ? `<p class="fx-alerte" role="alert">${e(f.message)}</p>` : ""}
    <div class="fx-api">${Apiviz.compagnon("repos", 34)}<p>Pour une photo nette : facture à plat, bonne lumière, les quatre coins visibles.</p></div>
    ${recents.length ? `<section class="fx-recents" aria-label="Derniers achats"><h3>Derniers achats</h3><ul>${recents.map((r) => `<li><span><b>${e(r.fournisseur)}</b><span class="small">${e(dateCourte(r.date))}${r.piece ? ` · n° ${e(r.piece)}` : ""}</span></span><b class="fx-num">${e(eur(r.total))}</b></li>`).join("")}</ul></section>` : ""}
    <button type="button" class="link fx-soi" data-fx="soi">Ou saisir toi-même, même sans réseau</button>`;
}

function pages() {
  const f = S.facture;
  return `<p class="fx-say">${f.pieces.length > 1 ? `${f.pieces.length} pages prêtes.` : "Photo prête."}</p>
    <p class="small fx-sous">Ta facture a une autre page ? Ajoute-la avant de la donner à API.</p>
    <ul class="fx-pages">${f.pieces.map((p, i) => `<li><img src="${e(p.apercu)}" alt="Page ${i + 1}"><span>Page ${i + 1}</span><button type="button" class="fx-ote" data-fx="otepage" data-v="${i}" aria-label="Retirer la page ${i + 1}">×</button></li>`).join("")}
      ${f.pieces.length < PAGES_MAX ? `<li class="fx-plus"><label><input type="file" accept="image/*" capture="environment" data-fx-fichier="photo" class="fx-cache">${icone("plus")}<span>Page ${f.pieces.length + 1}</span></label></li>` : ""}</ul>
    ${f.message ? `<p class="fx-alerte" role="alert">${e(f.message)}</p>` : ""}
    <div class="fx-pied"><button type="button" class="btn main" data-fx="lire">Donner à API</button><button type="button" class="btn" data-fx="recommencer">Recommencer</button></div>`;
}

function carteFichier(f) {
  const p = f.pieces[0], pdf = p?.type === "application/pdf";
  const taille = f.pieces.reduce((t, x) => t + x.taille, 0);
  return `<div class="fx-fichier">${pdf ? `<span class="fx-vignette fx-pdf">PDF</span>` : `<img class="fx-vignette" src="${e(p.apercu)}" alt="">`}
    <span class="fx-t"><b>${e(pdf ? p.nom : f.pieces.length > 1 ? `${f.pieces.length} photos` : "Photo de la facture")}</b><span class="small">${pdf ? "PDF" : "Photo"} · ${e(poids(taille))}</span></span></div>`;
}

function etape(etat, titre, detail) {
  const signe = etat === "fait" ? `<span class="fx-alv fait">${icone("coche")}</span>` : etat === "encours" ? '<span class="fx-alv encours"></span>' : etat === "attention" ? '<span class="fx-alv attention">!</span>' : '<span class="fx-alv"></span>';
  return `<li class="fx-etape ${etat}">${signe}<span><b>${e(titre)}</b>${detail ? `<span class="small">${e(detail)}</span>` : ""}</span></li>`;
}

function analyse() {
  const f = S.facture, r = f.resultat;
  const tete = `<div class="fx-api-grand">${Apiviz.compagnon(r ? "fait" : "reflexion", 64)}<div><p class="fx-say">${r ? "J'ai lu ta facture." : "Je lis ta facture."}</p><p class="small fx-sous">${r ? "Vérifie le résultat avant de l'intégrer." : "Une quinzaine de secondes en général."}</p></div></div>`;
  let liste;
  if (!r) {
    liste = etape("fait", "Facture envoyée", f.pieces.length > 1 ? `${f.pieces.length} pages` : "") + etape("encours", "Lecture par API", "Fournisseur, lignes, montants")
      + etape("", "Rapprochement avec ton stock", "") + etape("", "Contrôle des totaux", "");
  } else {
    const arts = r.lignes.filter((l) => l.article_id).length, nv = r.lignes.filter((l) => l.nouvel_article).length, libres = r.lignes.filter((l) => l.sans_stock).length;
    const four = r.fournisseur?.id ? `${r.fournisseur.nom}, déjà dans tes fournisseurs` : r.fournisseur?.nom ? `${r.fournisseur.nom}, nouveau fournisseur` : "Pas trouvé sur la facture";
    const rap = [arts && `${arts} article${arts > 1 ? "s" : ""} retrouvé${arts > 1 ? "s" : ""}`, nv && `${nv} nouveau${nv > 1 ? "x" : ""}`, libres && `${libres} sans stock`].filter(Boolean).join(", ");
    const c = r.controle || {}, doutes = r.lignes.filter((l) => l.a_verifier).length;
    liste = etape("fait", "Facture lue", r.numero ? `N° ${r.numero}${r.date ? ` du ${dateLongue(r.date)}` : ""}` : r.date ? `Du ${dateLongue(r.date)}` : "")
      + etape("fait", "Fournisseur", four)
      + etape(doutes ? "attention" : "fait", `${r.lignes.length} ligne${r.lignes.length > 1 ? "s" : ""} trouvée${r.lignes.length > 1 ? "s" : ""}`, doutes ? `${doutes} à vérifier` : "")
      + etape("fait", "Rapprochement avec ton stock", rap)
      + etape(c.coherent === false ? "attention" : "fait", "Contrôle des totaux", c.coherent === true ? `Total cohérent : ${eur(c.somme)}` : c.coherent === false ? `Écart de ${eur(Math.abs(c.ecart))} avec le total de la facture` : "Total absent de la facture");
  }
  return `${tete}${carteFichier(f)}<ol class="fx-suivi" aria-live="polite">${liste}</ol>
    <p class="small fx-sous">Rien n'est encore enregistré. Tu valides à l'étape suivante.</p>
    <div class="fx-pied">${r ? '<button type="button" class="btn main" data-fx="voir">Voir le résultat</button>' : ""}<button type="button" class="btn" data-fx="annuler">Annuler</button></div>`;
}

function erreurLecture() {
  const f = S.facture;
  return `<div class="fx-api-grand">${Apiviz.compagnon("attention", 64)}<div><p class="fx-say">${e(f.erreur?.titre || "Je n'ai pas pu lire ta facture.")}</p><p class="small fx-sous">${e(f.erreur?.texte || "")}</p></div></div>
    ${f.pieces.length ? carteFichier(f) : ""}
    <div class="fx-pied">${f.erreur?.reessayer !== false ? '<button type="button" class="btn main" data-fx="lire">Réessayer</button>' : ""}<button type="button" class="btn" data-fx="recommencer">Changer de photo ou de fichier</button>
      <button type="button" class="link fx-soi" data-fx="soi">Saisir toi-même</button></div>`;
}

function optionsCible(l, d) {
  const arts = (d.articles || []).slice().sort((x, y) => String(x.nom).localeCompare(String(y.nom), "fr", { numeric: true }));
  const o = (v, t) => `<option value="${e(v)}" ${l.cible === v ? "selected" : ""}>${e(t)}</option>`;
  return `<optgroup label="Tes articles">${arts.map((a) => o(`article:${a.id}`, `${a.nom} · ${quant(a.stock, a.unite)}`)).join("")}</optgroup>
    ${o("nouveau", "Nouvel article")}${o("libre", "Sans stock (frais, service)")}`;
}

function puceStock(l, d) {
  if (l.cible === "libre") return '<span class="u-chip">Sans stock</span>';
  const art = V.articleDe(l, d), q = nombre(l.quantite);
  const unite = art ? art.unite : l.articleNouveau.unite;
  const avant = art ? Number(art.stock) || 0 : 0;
  return `${art ? "" : '<span class="u-chip">Nouvel article</span>'}<span class="fx-stock">${e(quant(avant, unite))} → ${e(quant(avant + q, unite))}</span>`;
}

function ligne(l, d) {
  const verif = l.a_verifier && !l.confirme;
  const art = V.articleDe(l, d), unite = art ? art.unite : l.articleNouveau.unite;
  const A = (k) => `data-l="${e(l.id)}" data-k="${k}"`;
  return `<div class="fx-ligne${verif ? " fx-verif" : ""}" data-ligne="${e(l.id)}">
    <div class="fx-l-t"><span class="fx-lib">${e(l.libelle || "Ligne")}</span><button type="button" class="fx-ote" data-fx="oteligne" data-v="${e(l.id)}" aria-label="Retirer cette ligne">×</button></div>
    <label>Dans ton stock<select ${A("cible")}>${optionsCible(l, d)}</select></label>
    ${l.cible === "nouveau" ? `<label>Nom du nouvel article<input ${A("nom")} value="${e(l.articleNouveau.nom)}" autocomplete="off"></label>` : ""}
    <div class="two">${l.cible === "libre" ? "" : `<label>Quantité${unite && unite !== "unité" ? ` (${e(unite)})` : ""}<input type="number" inputmode="decimal" step="0.01" min="0.01" ${A("quantite")} value="${e(l.quantite)}"></label>`}
      <label>Montant TTC (€)<input type="number" inputmode="decimal" step="0.01" min="0" ${A("montant")} value="${e(l.montant)}"></label></div>
    <div class="fx-tags" data-puce="${e(l.id)}">${puceStock(l, d)}</div>
    ${verif ? `<div class="fx-a-verifier"><p>À vérifier : ${e(l.raison)}</p>
      <div class="fx-props" role="group" aria-label="Lectures possibles">${l.propositions.map((q) => `<button type="button" data-fx="prop" data-v="${e(l.id)}" data-q="${e(q)}">${e(quant(q, unite))}</button>`).join("")}
        <button type="button" class="fx-ok" data-fx="confirme" data-v="${e(l.id)}">C'est bon</button></div></div>` : ""}
  </div>`;
}

function blocTotaux(v) {
  const c = V.controle(v), t = v.totaux || {};
  const msg = c.coherent === true ? ["good", "Total cohérent avec la facture"] : c.coherent === false ? ["watch", `Écart de ${eur(Math.abs(c.ecart))} avec le total de la facture (${eur(c.ttc)})`] : ["", "Total absent de la facture : vérifie les montants"];
  return `${t.ht != null ? `<p class="fx-tot"><span>Total HT</span><span>${e(eur(t.ht))}</span></p>` : ""}${t.tva != null ? `<p class="fx-tot"><span>TVA</span><span>${e(eur(t.tva))}</span></p>` : ""}
    <p class="fx-tot fx-ttc"><span>Total de tes lignes</span><b class="fx-somme">${e(eur(c.somme))}</b></p>
    <p class="small fx-coherence ${msg[0]}">${e(msg[1])}</p>`;
}

function validation() {
  const v = S.facture.validation, d = S.d, reste = V.aVerifier(v).length;
  const fours = fournOpts();
  const nouveau = v.fournisseur_id === "nouveau";
  return `<p class="fx-say">${reste ? (reste > 1 ? `${reste} lignes à vérifier, le reste est prêt.` : "Une ligne à vérifier, le reste est prêt.") : "Tout est prêt, vérifie et valide."}</p>
    <p class="small fx-sous">D'après ta facture et ton stock actuel. Corrige ce qui doit l'être.</p>
    <section class="fx-carte">
      <label>Fournisseur<select data-k="fournisseur">${fours.map(([id, nom]) => `<option value="${e(id)}" ${String(id) === String(v.fournisseur_id) ? "selected" : ""}>${e(nom)}</option>`).join("")}
        ${v.fournisseurNouveau.nom || nouveau ? `<option value="nouveau" ${nouveau ? "selected" : ""}>Nouveau : ${e(v.fournisseurNouveau.nom || "à nommer")}</option>` : ""}</select></label>
      ${nouveau ? `<label>Nom du nouveau fournisseur<input data-k="fournom" value="${e(v.fournisseurNouveau.nom)}" autocomplete="off"></label>` : ""}
      <div class="two"><label>N° de facture<input data-k="piece" value="${e(v.piece)}" autocomplete="off"></label>
        <label>Date<input type="date" data-k="date" value="${e(v.date)}" max="${e(today())}"></label></div>
    </section>
    <section class="fx-lignes" aria-label="Lignes de la facture"><div class="fx-lignes-t"><h3>Lignes (${v.lignes.length})</h3><span class="small">Stock avant → après</span></div>
      ${v.lignes.map((l) => ligne(l, d)).join("")}
      <button type="button" class="fx-ajout" data-fx="ajoutligne">${icone("plus")}Ajouter une ligne oubliée</button></section>
    <section class="fx-carte fx-totaux">${blocTotaux(v)}</section>
    <section class="fx-associes">${champsAchatAssocies(null)}</section>
    <p class="small st-erreur fx-err" role="alert"></p>
    <div class="fx-pied">${reste ? `<button type="button" class="btn" disabled>${e(V.controleValidation(v))}</button>` : '<button type="button" class="btn main" data-fx="integrer">Valider et intégrer au stock</button>'}
      <button type="button" class="btn" data-fx="annuler">Abandonner cette facture</button></div>`;
}

function fait() {
  const r = S.facture.fait;
  return `<div class="fx-api-grand">${Apiviz.compagnon("fait", 64)}<div><p class="fx-say">${r.local ? "C'est gardé sur ton téléphone." : "C'est dans ton stock."}</p>
      <p class="small fx-sous">${e(`${r.lignes} ligne${r.lignes > 1 ? "s" : ""} intégrée${r.lignes > 1 ? "s" : ""}, achat de ${eur(r.total)} ajouté aux comptes.${r.local ? " Envoi au retour du réseau." : ""}`)}</p></div></div>
    ${r.mouvements.length ? `<ul class="fx-mvts">${r.mouvements.map((m) => `<li><span>${e(m.nom)}</span>${m.nouveau ? '<span class="u-chip">Créé</span>' : ""}<b>+${e(quant(m.ajout, m.unite))} · ${e(quant(m.apres, m.unite))}</b></li>`).join("")}</ul>` : ""}
    ${r.paiement ? `<p class="fx-carte fx-paie">${e(r.paiement)}</p>` : ""}
    <div class="fx-pied"><button type="button" class="btn main" data-fx="stock">Voir le stock</button><button type="button" class="btn" data-fx="autre">Ajouter une autre facture</button></div>`;
}

// ---------- Fichiers ----------
const lireBase64 = (blob) => new Promise((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => ko(new Error("Fichier illisible."));
  r.readAsDataURL(blob);
});

/** Photo ramenée à 2 000 px au plus et en JPEG : plus légère à envoyer, aussi lisible pour API. */
async function photoAllegee(fichier) {
  try {
    const img = await createImageBitmap(fichier);
    const k = Math.min(1, COTE_MAX / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    if (blob) return { blob, type: "image/jpeg" };
  } catch { /* format que le navigateur ne sait pas redessiner : envoyé tel quel s'il est accepté */ }
  return { blob: fichier, type: fichier.type };
}

async function recevoir(fichier, mode) {
  const f = S.facture;
  if (!fichier) return;
  f.message = "";
  const pdf = fichier.type === "application/pdf" || /\.pdf$/i.test(fichier.name || "");
  if (!pdf && !/^image\//.test(fichier.type)) { f.message = "Format non pris en charge : PDF, PNG ou JPG."; return dessiner(); }
  if (fichier.size > TAILLE_MAX) { f.message = "Fichier trop lourd : 10 Mo au plus."; return dessiner(); }
  if (pdf) {
    const url = await lireBase64(fichier);
    f.pieces = [{ type: "application/pdf", donnees: url.split(",")[1], nom: fichier.name || "facture.pdf", taille: fichier.size }];
    return lire();
  }
  const { blob, type } = await photoAllegee(fichier);
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) { f.message = "Cette photo n'a pas pu être préparée. Essaie en JPG ou en PNG."; return dessiner(); }
  const url = await lireBase64(blob);
  const piece = { type, donnees: url.split(",")[1], apercu: url, nom: fichier.name || "photo.jpg", taille: blob.size };
  if (mode === "fichier") { f.pieces = [piece]; return lire(); }
  if (f.pieces.some((p) => p.type === "application/pdf")) f.pieces = [];
  f.pieces.push(piece);
  f.etape = "pages";
  dessiner();
}

// ---------- Lecture ----------
async function lire() {
  const f = S.facture;
  f.etape = "analyse"; f.resultat = null; f.erreur = null;
  dessiner();
  const jeton = (f.jeton = nouvelId());
  try {
    const r = await appeler({ pieces: f.pieces.map((p) => ({ type: p.type, donnees: p.donnees })) });
    if (S.facture !== f || f.jeton !== jeton) return; // abandonnée entre-temps
    if (!r.facture?.lisible) {
      f.etape = "erreur";
      f.erreur = { titre: "Je n'arrive pas à lire cette facture.", texte: r.facture?.raison || "Essaie avec une photo plus nette, ou le PDF.", reessayer: false };
    } else {
      f.resultat = r.facture;
    }
  } catch (err) {
    if (S.facture !== f || f.jeton !== jeton) return;
    f.etape = "erreur";
    const hors = !enLigne() || err instanceof TypeError;
    f.erreur = { titre: hors ? "Pas de réseau pour lire ta facture." : "Je n'ai pas pu lire ta facture.",
      texte: hors ? "Réessaie quand tu as du réseau, ou saisis l'achat toi-même : il partira au retour du réseau." : err.message,
      reessayer: !["plafond", "pieces", "fichier", "inactif"].includes(err.code) };
  }
  if ($sheet.open && $sheetForm.querySelector(".fx")) dessiner();
}

// ---------- Validation ----------
function majChiffres() {
  const v = S.facture?.validation;
  if (!v) return;
  const tot = $sheetForm.querySelector(".fx-totaux");
  if (tot) tot.innerHTML = blocTotaux(v);
  for (const l of v.lignes) {
    const z = $sheetForm.querySelector(`[data-puce="${l.id}"]`);
    if (z) z.innerHTML = puceStock(l, S.d);
  }
}

function saisie(ev) {
  const f = S.facture, v = f?.validation, t = ev.target;
  if (!v || !t.dataset) return;
  const k = t.dataset.k, l = t.dataset.l ? v.lignes.find((x) => x.id === t.dataset.l) : null;
  if (k === "piece") v.piece = t.value;
  else if (k === "date") v.date = t.value;
  else if (k === "fournom") v.fournisseurNouveau.nom = t.value;
  else if (l && k === "quantite") l.quantite = t.value;
  else if (l && k === "montant") l.montant = t.value;
  else if (l && k === "nom") l.articleNouveau.nom = t.value;
  else return;
  if (ev.type === "input") majChiffres();
}

function changement(ev) {
  const v = S.facture?.validation, t = ev.target;
  if (t.dataset?.fxFichier) { const fic = t.files?.[0]; t.value = ""; return recevoir(fic, t.dataset.fxFichier).catch((err) => { S.facture.message = err.message; dessiner(); }); }
  if (!v) return;
  if (t.dataset.k === "fournisseur") { v.fournisseur_id = t.value; return dessiner(); }
  if (t.dataset.k === "cible") {
    const l = v.lignes.find((x) => x.id === t.dataset.l);
    if (l) { l.cible = t.value; dessiner(); }
    return;
  }
  saisie(ev);
}

async function integrer() {
  const f = S.facture, v = f.validation, d = S.d;
  const zone = $sheetForm.querySelector(".fx-err"), bouton = $sheetForm.querySelector('[data-fx="integrer"]');
  const dire = (m) => { if (zone) zone.textContent = m; };
  const achete_par = $sheetForm.querySelector('[name="achete_par"]:checked')?.value || "";
  const paye_par = $sheetForm.querySelector('[name="paye_par"]:checked')?.value || "";
  const err = V.controleValidation(v);
  if (err) return dire(err);
  const p = V.versAchat(v, d, { achete_par, paye_par });
  const err2 = R.controleAchat(p);
  if (err2) return dire(err2);
  const mouvements = V.mouvementsPrevus(v, d), total = V.somme(v);
  if (bouton) { bouton.disabled = true; bouton.textContent = "Intégration…"; bouton.setAttribute("aria-busy", "true"); }
  try {
    if (v.fournisseur_id === "nouveau") {
      const { error } = await sb.from("fournisseurs").insert({ id: v.fournisseurNouveau.id, nom: v.fournisseurNouveau.nom.trim() });
      if (error && error.code !== "23505") throw error;
      v.fournisseur_id = v.fournisseurNouveau.id; // une seconde tentative ne le recrée pas
      d.fournisseurs ||= [];
      if (!d.fournisseurs.some((x) => x.id === v.fournisseur_id)) d.fournisseurs.push({ id: v.fournisseur_id, nom: v.fournisseurNouveau.nom.trim() });
    }
    const { error, local } = await appel("enregistrer_achat", { p });
    if (error) throw error;
    if (local) { R.appliquerAchat(S.d, p, { _attente: true }); typeof HL != "undefined" && HL.garderDonnees(); }
    f.fait = { local: !!local, lignes: p.lignes.length, total, mouvements, paiement: V.phrasePaiement(achete_par, paye_par, total, SOCIETE, eur) };
    f.etape = "fait";
    dessiner();
    if (local) render(); else await refresh();
  } catch (e2) {
    if (bouton) { bouton.disabled = false; bouton.textContent = "Valider et intégrer au stock"; bouton.removeAttribute("aria-busy"); }
    dire(typeof messageErreur == "function" ? messageErreur(e2) : e2.message || "L'intégration n'a pas abouti. Réessaie.");
  }
}

function clic(ev) {
  if (!$sheetForm.querySelector(".fx")) return;
  const b = ev.target.closest("[data-fx]");
  const f = S.facture;
  if (!b || !f) return;
  const act = b.dataset.fx, v = f.validation;
  const ligneDe = () => v?.lignes.find((x) => x.id === b.dataset.v);
  switch (act) {
    case "soi": { const repli = f.repli; S.facture = null; $sheet.close(); return repli?.(); }
    case "lire": return f.pieces.length ? lire() : null;
    case "recommencer": f.pieces = []; f.message = ""; f.etape = "source"; return dessiner();
    case "otepage": f.pieces.splice(Number(b.dataset.v), 1); f.etape = f.pieces.length ? "pages" : "source"; return dessiner();
    case "annuler": S.facture = null; return $sheet.close();
    case "voir": f.validation = V.etatValidation(f.resultat, S.d, nouvelId, today()); f.etape = "validation"; dessiner(); return $sheetForm.closest("dialog")?.scrollTo?.(0, 0);
    case "prop": { const l = ligneDe(); if (l) { l.quantite = Number(b.dataset.q); l.confirme = true; } return dessiner(); }
    case "confirme": { const l = ligneDe(); if (l) l.confirme = true; return dessiner(); }
    case "oteligne": v.lignes = v.lignes.filter((x) => x.id !== b.dataset.v); return dessiner();
    case "ajoutligne": v.lignes.push({ id: nouvelId(), libelle: "Ligne ajoutée", cible: "nouveau", articleNouveau: { id: nouvelId(), nom: "", famille: "autre", unite: "unité" }, quantite: "", montant: "", a_verifier: false, raison: "", propositions: [], confirme: false }); return dessiner();
    case "integrer": return integrer();
    case "stock": S.facture = null; $sheet.close(); return ACT.go("materiel");
    case "autre": S.facture = { etape: "source", pieces: [], repli: f.repli }; return dessiner();
  }
}

// Écouteurs posés une fois sur la feuille : ils ne servent que quand elle montre une facture (.fx), et survivent au
// brouillon d'ergonomie.js (qui remet le contenu de la feuille tel quel).
let poses = false;
export function poser() {
  if (poses || typeof $sheetForm == "undefined") return;
  poses = true;
  $sheetForm.addEventListener("click", clic);
  $sheetForm.addEventListener("change", (ev) => { if ($sheetForm.querySelector(".fx")) changement(ev); });
  $sheetForm.addEventListener("input", (ev) => { if ($sheetForm.querySelector(".fx")) saisie(ev); });
}

// ---------- Petits outils ----------
function derniersAchats() {
  const fours = new Map((S.d?.fournisseurs || []).map((x) => [x.id, x.nom]));
  const groupes = new Map();
  for (const x of S.d?.depenses || []) {
    const k = x.achat_id || x.id;
    const g = groupes.get(k) || { date: x.date_depense, piece: x.piece || "", fournisseur: fours.get(x.fournisseur_id) || x.libelle || "Achat", total: 0 };
    g.total += Number(x.montant) || 0;
    groupes.set(k, g);
  }
  return [...groupes.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
}
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function dateLongue(iso) {
  const [a, m, j] = String(iso || "").split("-").map(Number);
  return a && m && j ? `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}` : "";
}
const dateCourte = (iso) => dateLongue(iso).replace(/ \d{4}$/, "");
const poids = (o) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

function icone(nom) {
  const t = (d, w = 24) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return {
    photo: t('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 26),
    fichier: t('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M12 11v6"/><path d="M9.5 14.5L12 17l2.5-2.5"/>', 26),
    suite: t('<path d="M9 5l7 7-7 7"/>', 20),
    plus: t('<path d="M12 5v14M5 12h14"/>', 18),
    coche: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  }[nom] || "";
}
