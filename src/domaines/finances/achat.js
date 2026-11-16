// Apiviz — achat en plusieurs lignes (v5.30, maquettes du 11 nov. 2026, migration 018).
// Une facture = un achat : fournisseur, date, numéro de facture, puis une ligne par article choisi dans le catalogue
// (ou un nouvel article, ou une ligne sans article comme des frais de port). v5.38 : plus d'Opex / Capex à l'écran ; le
// stock monte à l'enregistrement. Envoi par enregistrer_achat() en passant par la file d'envoi (offline.js) :
// sans réseau, l'achat est gardé et montré tout de suite. Sans la migration 018, l'ancienne fiche « dépense ».
// Globales d'app.js lues à l'appel : S, esc, n, eur, today, sheet, $sheet, $sheetForm, toast, refresh, render, cfg,
// fournOpts, depenseForm. Brouillon (clic à côté, Échap) : celui d'ergonomie.js, les champs ont un nom.
import * as R from "../materiel/regles.js";
import { stockSuivi } from "../materiel/catalogue.js";
import { champsAchatAssocies } from "./entre-associes.js";
import { MAX_PUCES, plat } from "../../noyau/choisir.js";
import { ouvrirFacture, ouvrirOuSaisir } from "./facture.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const nouvelId = () => crypto.randomUUID();

/** État de la feuille (gardé pendant qu'elle est ouverte). */
const etat = () => S.achat;

/** Ouvre la feuille d'achat, éventuellement avec un article déjà choisi. */
export function ouvrir(prerempli = {}) {
  if (!stockSuivi()) return depenseForm(null, prerempli);
  S.achat = { id: nouvelId(), date: today(), fournisseur_id: prerempli.fournisseur_id || "", piece: "", lignes: [] };
  // Liste de courses (v5.38) : plusieurs lignes déjà remplies.
  for (const l of prerempli.lignes || []) S.achat.lignes.push({ id: nouvelId(), article_id: l.article_id, quantite: l.quantite ?? "", montant: l.montant ?? "" });
  if (prerempli.article_id) ajouterArticle(prerempli.article_id);
  else if (prerempli.libelle) S.achat.lignes.push({ id: nouvelId(), libelle: prerempli.libelle, quantite: "", montant: "", libre: true });
  sheet({
    title: "Ajouter un achat",
    fields: [],
    label: "Enregistrer l’achat",
    submit: enregistrer,
  });
  $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", `<div class="st-achat-corps"></div><div class="st-associes">${champsAchatAssocies(null)}</div>`);
  const corps = $sheetForm.querySelector(".st-achat-corps");
  corps?.addEventListener("input", majChiffres);
  corps?.addEventListener("change", (ev) => rattacherSiExistant(ev.target));
  // S.achat reste après fermeture : le brouillon d'ergonomie.js (clic à côté, Échap) peut reprendre la saisie.
  $sheet.addEventListener("close", () => corps?.removeEventListener("input", majChiffres), { once: true });
  dessiner();
}

// Relit les champs tapés avant de redessiner (comme lire() de deplacer.js).
function lire() {
  const a = etat(), q = (sel) => $sheetForm.querySelector(sel);
  if (!a || !q("#st_date")) return a;
  Object.assign(a, { date: q("#st_date").value, fournisseur_id: q("#st_four").value, piece: q("#st_piece").value });
  for (const l of a.lignes) {
    const z = (k) => q(`[data-ligne="${l.id}"][data-k="${k}"]`);
    if (z("quantite")) l.quantite = z("quantite").value;
    if (z("montant")) l.montant = z("montant").value;
    if (z("libelle")) l.libelle = z("libelle").value;
    if (l.article) {
      if (z("nom")) l.article.nom = z("nom").value;
    }
  }
  return a;
}

/** Suggestions du nom d'un nouvel article (composant Choisir, forme B) : tes articles d'abord, avec leur stock, pour
 *  éviter un doublon ; puis le catalogue de départ. */
function suggestionsArticles() {
  const arts = S.d.articles || [], vus = new Set(arts.map((a) => plat(a.nom)));
  return [
    ...arts.map((a) => ({ valeur: a.nom, detail: `${R.FAMILLES[R.famille(a)] || "Article"} · ${R.quantite(a.stock, a.unite)} en stock` })),
    ...R.CATALOGUE.filter((k) => !vus.has(plat(k.nom))).map((k) => ({ valeur: k.nom, detail: `${R.FAMILLES[k.famille] || "Article"} · catalogue` })),
  ];
}

/** Nouvel article dont le nom est celui d'un article existant : la ligne passe sur l'article existant (pas de doublon). */
function rattacherSiExistant(cible) {
  if (cible?.dataset?.k !== "nom") return;
  const a = lire(), l = a?.lignes.find((x) => x.id === cible.dataset.ligne);
  const art = l?.article && (S.d.articles || []).find((x) => plat(x.nom) === plat(cible.value));
  if (!art) return;
  if (a.lignes.some((x) => x.article_id === art.id)) a.lignes = a.lignes.filter((x) => x !== l);
  else { delete l.article; l.article_id = art.id; }
  dessiner();
  toast(`« ${art.nom} » est déjà dans ton stock : la ligne y est rattachée`);
}

// ---------- Feuille de choix des articles (forme C, au-delà de 8 articles) ----------
function feuilleArticles() {
  lire();
  const a = etat();
  const arts = (S.d.articles || []).slice().sort((x, y) => String(x.nom).localeCompare(String(y.nom), "fr", { numeric: true }));
  const choix = new Set(a.lignes.map((l) => l.article_id).filter(Boolean));
  const familles = [...new Set(arts.map((x) => R.famille(x)))].sort((x, y) => Object.keys(R.FAMILLES).indexOf(x) - Object.keys(R.FAMILLES).indexOf(y));
  let filtre = "", texte = "";
  const el = document.createElement("div");
  el.className = "ch-feuille";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Choisir des articles");
  const ligneArt = (x) => {
    const bas = R.aCommander(x);
    return `<label class="ch-ligne"><input type="checkbox" data-ch-art="${e(x.id)}" ${choix.has(x.id) ? "checked" : ""}><span class="t"><b>${e(x.nom)}</b><span class="small">${e(R.FAMILLES[R.famille(x)] || "")}${x.unite && x.unite !== "unité" ? " · au " + e(x.unite) : ""}</span></span><span class="ch-stock${bas ? " bas" : ""}">${e(R.quantite(x.stock, x.unite))}${bas ? " · à racheter" : ""}</span></label>`;
  };
  const corps = () => {
    const t = plat(texte);
    const vis = arts.filter((x) => (!filtre || R.famille(x) === filtre) && (!t || plat(x.nom).includes(t)));
    if (!vis.length) return `<p class="ch-vide">Aucun article ne correspond. « + Nouvel article » pour le créer.</p>`;
    const aRacheter = !t && !filtre ? vis.filter(R.aCommander) : [];
    const groupes = familles.map((f) => [f, vis.filter((x) => R.famille(x) === f)]).filter(([, l]) => l.length);
    return (aRacheter.length ? `<p class="ch-groupe">À racheter</p>${aRacheter.map(ligneArt).join("")}` : "")
      + groupes.map(([f, l]) => `<p class="ch-groupe">${e(R.FAMILLES[f] || "Autres articles")}</p>${l.filter((x) => !aRacheter.includes(x)).map(ligneArt).join("")}`).join("");
  };
  const pied = () => `${choix.size ? `Valider · ${choix.size} article${choix.size > 1 ? "s" : ""}` : "Valider"}`;
  el.innerHTML = `<div class="ch-feuille-tete">
      <div class="ch-feuille-titre"><button type="button" class="ch-fermer" data-ch-fermer="1" aria-label="Fermer sans changer">×</button><h3>Choisir des articles</h3><span style="width:44px"></span></div>
      <input type="search" class="ch-recherche" placeholder="Rechercher un article" aria-label="Rechercher un article" autocomplete="off">
      <div class="ch-familles" role="group" aria-label="Familles"><button type="button" class="on" data-ch-fam="">Tout</button>${familles.map((f) => `<button type="button" data-ch-fam="${e(f)}">${e(R.FAMILLES[f] || f)}</button>`).join("")}</div>
    </div>
    <div class="ch-feuille-corps">${corps()}</div>
    <div class="ch-feuille-pied"><button type="button" class="btn" data-ch-nouveau="1">+ Nouvel article</button><button type="button" class="btn main" data-ch-valider="1">${pied()}</button></div>`;
  const fermer = () => el.remove();
  const rafraichir = () => { el.querySelector(".ch-feuille-corps").innerHTML = corps(); };
  el.addEventListener("input", (ev) => {
    if (ev.target.matches(".ch-recherche")) { texte = ev.target.value; rafraichir(); }
  });
  el.addEventListener("change", (ev) => {
    const id = ev.target.dataset?.chArt;
    if (!id) return;
    if (ev.target.checked) choix.add(id); else choix.delete(id);
    el.querySelector("[data-ch-valider]").textContent = pied();
  });
  el.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.chFermer) return fermer();
    if (b.dataset.chFam !== undefined) {
      filtre = b.dataset.chFam;
      el.querySelectorAll("[data-ch-fam]").forEach((x) => x.classList.toggle("on", x === b));
      return rafraichir();
    }
    if (b.dataset.chNouveau) { fermer(); return actions.stachnouveau(); }
    if (b.dataset.chValider) {
      const avant = new Set(etat().lignes.map((l) => l.article_id).filter(Boolean));
      for (const id of choix) if (!avant.has(id)) ajouterArticle(id);
      for (const id of avant) if (!choix.has(id)) ajouterArticle(id); // ajouterArticle retire une ligne déjà là
      fermer();
      dessiner();
    }
  });
  el.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); fermer(); } });
  ($sheet.open ? $sheet : document.body).append(el);
  setTimeout(() => el.querySelector(".ch-fermer")?.focus(), 30);
}

function ajouterArticle(id) {
  const a = etat();
  if (a.lignes.some((l) => l.article_id === id)) { a.lignes = a.lignes.filter((l) => l.article_id !== id); return; }
  a.lignes.push({ id: nouvelId(), article_id: id, quantite: "", montant: "" });
}

function dessiner() {
  const a = etat(), corps = $sheetForm.querySelector(".st-achat-corps");
  if (!a || !corps) return;
  const arts = (S.d.articles || []).slice().sort((x, y) => (R.aCommander(y) - R.aCommander(x)) || String(x.nom).localeCompare(String(y.nom), "fr", { numeric: true }));
  const pris = new Set(a.lignes.map((l) => l.article_id).filter(Boolean));
  const total = a.lignes.reduce((s, l) => s + (Number(String(l.montant).replace(",", ".")) || 0), 0);
  corps.innerHTML = `
    <div class="two"><label>Fournisseur<select id="st_four" name="st_four">${fournOpts().map(([v, t]) => `<option value="${e(v)}" ${String(v) === String(a.fournisseur_id) ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label>
      <label>Date<input type="date" id="st_date" name="st_date" value="${e(a.date)}" max="${e(today())}" required></label></div>
    <label>Numéro de la facture (facultatif)<input id="st_piece" name="st_piece" value="${e(a.piece)}" autocomplete="off" placeholder="F-2026-123"></label>
    <div class="st-choix"><span class="small">Choisis dans tes articles</span>
      ${arts.length > MAX_PUCES
        ? `<button type="button" class="st-choisir" data-act="stachfeuille">Choisir dans tes articles <span>${pris.size ? `${pris.size} choisi${pris.size > 1 ? "s" : ""} ›` : `${arts.length} articles ›`}</span></button>`
        : ""}
      <div class="st-puces" role="group" aria-label="Articles">${arts.length > MAX_PUCES ? "" : arts.map((x) => `<button type="button" class="${pris.has(x.id) ? "on" : ""}" aria-pressed="${pris.has(x.id)}" data-act="stachart" data-v="${e(x.id)}">${e(x.nom)}</button>`).join("")}
        <button type="button" class="st-tiret" data-act="stachnouveau">+ Nouvel article</button>
        <button type="button" class="st-tiret" data-act="stachlibre">+ Frais, service</button></div></div>
    ${a.lignes.length ? `<section class="st-lignes" aria-label="Lignes de la facture">${a.lignes.map(ligne).join("")}</section>`
      : '<p class="small st-astuce">Touche un article pour l’ajouter : une ligne par article de la facture.</p>'}
    <datalist id="st_catalogue">${suggestionsArticles().map((o) => `<option value="${e(o.valeur)}" label="${e(o.detail)}">`).join("")}</datalist>
    <p class="st-info">Le stock monte dès que tu enregistres, et la facture reste liée à chaque mouvement.</p>
    <p class="st-total"><span>Total</span><b>${e(eur(total))}</b></p>
    <p class="small st-erreur" role="alert"></p>`;
}

// Pendant la frappe : total et « Stock +N » mis à jour sans redessiner (le curseur reste dans le champ).
function majChiffres() {
  const a = lire();
  if (!a) return;
  const total = a.lignes.reduce((s, l) => s + (Number(String(l.montant).replace(",", ".")) || 0), 0);
  const t = $sheetForm.querySelector(".st-total b");
  if (t) t.textContent = eur(total);
  for (const l of a.lignes) {
    const tags = $sheetForm.querySelector(`[data-ligne="${l.id}"]`)?.closest(".st-ligne")?.querySelector(".st-tags");
    if (!tags || l.libre) continue;
    const q = Number(String(l.quantite).replace(",", ".")) || 0, el = tags.querySelector(".good");
    if (q > 0 && el) el.textContent = `Stock +${n(q, 2)}`;
    else if (q > 0) tags.insertAdjacentHTML("beforeend", `<span class="u-chip good">Stock +${e(n(q, 2))}</span>`);
    else el?.remove();
  }
}

function ligne(l) {
  const art = l.article_id ? (S.d.articles || []).find((x) => x.id === l.article_id) : null;
  const A = (k, extra = "") => `data-ligne="${e(l.id)}" data-k="${k}" name="l_${e(l.id)}_${k}" ${extra}`;
  const fam = l.libre ? "" : R.FAMILLES[art ? R.famille(art) : R.famille({ nom: l.article?.nom || "" })] || "";
  const unite = (art || l.article)?.unite || "unité";
  const q = Number(String(l.quantite).replace(",", ".")) || 0;
  const tete = art ? `<b>${e(art.nom)}</b>`
    : l.article ? `<input ${A("nom", 'list="st_catalogue"')} value="${e(l.article.nom)}" placeholder="Nom du nouvel article" aria-label="Nom du nouvel article" autocomplete="off">`
      : `<input ${A("libelle")} value="${e(l.libelle || "")}" placeholder="Frais de port, livraison…" aria-label="Libellé" autocomplete="off">`;
  return `<div class="st-ligne">
    <div class="st-ligne-t">${tete}<button type="button" class="st-ote" data-act="stachote" data-v="${e(l.id)}" aria-label="Retirer cette ligne">×</button></div>
    <div class="two">${l.libre ? "" : `<label>Quantité${unite !== "unité" ? ` (${e(unite)})` : ""}<input type="number" inputmode="decimal" step="0.01" min="0.01" ${A("quantite")} value="${e(l.quantite)}"></label>`}
      <label>Montant (€)<input type="number" inputmode="decimal" step="0.01" min="0" ${A("montant")} value="${e(l.montant)}"></label></div>
    <div class="st-tags">${l.libre ? '<span class="u-chip">Sans stock</span>' : fam ? `<span class="u-chip">${e(fam)}</span>` : ""}${!l.libre && q > 0 ? `<span class="u-chip good">Stock +${e(n(q, 2))}</span>` : ""}</div>
  </div>`;
}

async function enregistrer() {
  const a = lire();
  const nombre = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
  const p = {
    id: a.id, date: a.date || today(), fournisseur_id: a.fournisseur_id || null, piece: a.piece.trim(),
    // Entre associés (v5.29) : qui a acheté, avec quel argent.
    achete_par: $sheetForm.querySelector('[name="achete_par"]:checked, select[name="achete_par"]')?.value || "", paye_par: $sheetForm.querySelector('[name="paye_par"]:checked, select[name="paye_par"]')?.value || "",
    lignes: a.lignes.map((l) => {
      const base = { id: l.id, montant: nombre(l.montant) };
      if (l.article_id) return { ...base, article_id: l.article_id, quantite: nombre(l.quantite), categorie: poste((S.d.articles || []).find((x) => x.id === l.article_id)) };
      if (l.article) {
        const k = R.CATALOGUE.find((c) => c.nom.toLowerCase() === l.article.nom.trim().toLowerCase());
        const fam = k?.famille || R.famille({ nom: l.article.nom });
        const type = R.typeDeFamille(fam);
        const article = { id: l.article.id, nom: l.article.nom.trim(), type, famille: fam, unite: k?.unite || "unité",
          contenance_g: k?.contenance_g || R.contenance({ nom: l.article.nom }), duree_amort: type === "Équipement" ? 5 : null, poste: poste({ famille: fam }) };
        return { ...base, article, quantite: nombre(l.quantite), categorie: article.poste };
      }
      return { ...base, libelle: (l.libelle || "").trim(), categorie: /port|livraison|transport|exp[ée]dition/i.test(l.libelle || "") ? "Frais" : "Autre" };
    }),
  };
  const err = R.controleAchat(p);
  if (err) { const z = $sheetForm.querySelector(".st-erreur"); if (z) z.textContent = err; throw new Error(err); }
  const { error, local } = await appel("enregistrer_achat", { p });
  if (error) throw error;
  const entrees = p.lignes.filter((l) => l.quantite).length;
  if (local) {
    R.appliquerAchat(S.d, p, { _attente: true });
    typeof HL != "undefined" && HL.garderDonnees();
    render(); toast("Gardé sur le téléphone : envoi au retour du réseau");
  } else {
    await refresh();
    toast(entrees ? `Achat enregistré, ${entrees} article${entrees > 1 ? "s" : ""} en stock` : "Achat enregistré");
  }
}

/** Poste de dépense d'un article : le sien, sinon celui de sa famille (v5.38 : plus de liste de postes à tenir). */
function poste(art) {
  return art?.poste || R.posteDeFamille(R.famille(art || {}));
}

/** Actions de la feuille d'achat ; « newdepense » ouvre l'achat (remplace l'ancienne fiche dépense d'app.js).
 *  v5.52 : sans préremplissage, elle propose d'abord de donner la facture à API (facture.js), quand il est disponible. */
const prerempli = (v) => v && typeof v === "object" && Object.keys(v).length > 0;
export const actions = {
  newdepense: (v) => (prerempli(v) ? ouvrir(v) : ouvrirOuSaisir(() => ouvrir({}))),
  newfacture: () => ouvrirFacture(() => ouvrir({})),
  stachart: (id) => { lire(); ajouterArticle(id); dessiner(); },
  stachfeuille: () => feuilleArticles(),
  stachnouveau: () => { lire(); etat().lignes.push({ id: nouvelId(), article: { id: nouvelId(), nom: "" }, quantite: "", montant: "" }); dessiner(); $sheetForm.querySelector(".st-ligne:last-child input")?.focus(); },
  stachlibre: () => { lire(); etat().lignes.push({ id: nouvelId(), libelle: "", quantite: "", montant: "", libre: true }); dessiner(); $sheetForm.querySelector(".st-ligne:last-child input")?.focus(); },
  stachote: (id) => { lire(); etat().lignes = etat().lignes.filter((l) => l.id !== id); dessiner(); },
};
export const remplace = ["newdepense"];
