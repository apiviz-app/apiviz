// Apiviz — écran « Produit » (v5.65, maquettes « Produits de la ruche » du 18 nov. 2026, migration 032).
// Étape 1 : « Que veux-tu vendre ? », un modèle par produit (miel, hydromel, cire, bougie…) ou un produit libre. Le
// miel ouvre la mise en pots (récolte, pots vides, étiquettes), comme avant. Étape 2 : nom, unité, format, prix,
// quantité en stock, numéro de lot, DDM et alerte de stock bas, puis creer_produit() par la file d'envoi (hors ligne
// compris). Le même écran modifie un produit existant (« editlot » sur un lot qui n'est pas du miel).
// Globales d'app.js lues à l'appel : S, sb, esc, n, eur, today, shell, render, refresh, toast, go, write, lotForm.
// Styles : styles/64-produits.css.
import * as P from "./produits.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const lecteur = () => document.documentElement.classList.contains("lecteur");

// Icônes au trait de la charte (grille 24, trait 1,9, sans remplissage).
const ICONES = {
  pot: '<path d="M8 3h8v3H8z"/><path d="M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M7 11h10"/>',
  bouteille: '<path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z"/><path d="M8 13h8"/>',
  alveole: '<path d="M7 5h10l4 7-4 7H7l-4-7z"/><path d="M9 12h6"/>',
  bougie: '<path d="M9 10h6v11H9z"/><path d="M12 10V8"/><path d="M12 3c1.6 1.6 1.6 3.2 0 4.4c-1.6-1.2-1.6-2.8 0-4.4z"/>',
  goutte: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
  pollen: '<circle cx="9" cy="10" r="3"/><circle cx="15" cy="10" r="3"/><circle cx="12" cy="15.5" r="3"/>',
  gateau: '<path d="M4 10h16v9H4z"/><path d="M4 10l2-4h12l2 4"/><path d="M9 14.5h6"/>',
  abeille: '<ellipse cx="12" cy="14" rx="4" ry="6"/><path d="M8 13h8M8.5 16.5h7"/><path d="M10 8c-2-3-6-2-5 1M14 8c2-3 6-2 5 1"/>',
  coffret: '<path d="M5 9h14v11H5z"/><path d="M4 9h16V6H4z"/><path d="M12 6v14"/>',
  flacon: '<path d="M5 4h9l5 5v11H5z"/><path d="M14 4v5h5"/><path d="M9 14h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
export const icone = (nom, taille = 26) =>
  `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom] || ICONES.plus}</svg>`;
export const iconeDe = (categorie) => P.modeleDe(categorie)?.icone || "plus";

/** État de la saisie : nouveau produit (étape 1, puis 2) ou produit existant (étape 2). */
function nouveau() {
  return { etape: 1, id: crypto.randomUUID(), categorie: "", libre: false, nom: "", unite: "pièce", format_libelle: "", prix: "",
    quantite: "", code: "", date: today(), ddm: "", seuil: "" };
}
const depuisLot = (l) => ({ etape: 2, existant: true, id: l.id, categorie: P.categorieDe(l), libre: !P.modeleDe(P.categorieDe(l)),
  nom: l.miel || "", unite: l.unite || "pièce", format_libelle: l.format_libelle || "", prix: l.prix ?? "", quantite: l.pots_initiaux ?? "",
  vendus: Number(l.pots_vendus || 0), code: l.code || "", date: l.date_mise_en_pot || "", ddm: l.ddm || "", seuil: l.seuil ?? "" });

function lire() {
  const f = S.pr, q = (id) => document.getElementById(id);
  if (!f || f.etape !== 2 || !q("pr_nom")) return f;
  Object.assign(f, { nom: q("pr_nom").value, format_libelle: q("pr_format").value, prix: q("pr_prix").value, quantite: q("pr_quantite").value,
    code: q("pr_code").value, ddm: q("pr_ddm").value, seuil: q("pr_seuil").value });
  if (q("pr_categorie")) f.categorie = q("pr_categorie").value;
  return f;
}

function etape1() {
  const tuile = (m) => `<button type="button" class="pr-modele" data-act="prmodele" data-v="${e(m.categorie)}">${icone(m.icone)}<span>${e(m.categorie)}</span></button>`;
  shell("Nouveau produit", "Choisis un modèle : Apiviz prépare les formats. Tu pourras tout changer.", '<button type="button" class="btn" data-act="prannuler">Annuler</button>',
    `<div class="pr-ecran">
      <div class="pr-modeles" role="group" aria-label="Modèles de produit">${P.MODELES.map(tuile).join("")}
        <button type="button" class="pr-modele pr-libre" data-act="prmodele" data-v="">${icone("plus")}<span>Produit libre</span></button></div>
      <p class="small">Le miel passe par la mise en pots : Apiviz retire du stock le miel en vrac, les pots et les étiquettes.</p>
    </div>`);
  const h = document.querySelector(".wrap .head h1");
  if (h) h.textContent = "Que veux-tu vendre ?";
}

function etape2() {
  const f = S.pr, m = P.modeleDe(f.categorie), vendus = f.vendus || 0;
  const unites = [...new Set([...(m ? [m.unite] : []), ...P.UNITES])];
  const formats = [...new Set([...(m?.formats || []), ...(S.d.lots || []).filter((l) => P.categorieDe(l) === f.categorie).map((l) => l.format_libelle).filter(Boolean)])];
  const titre = f.existant ? `Modifier ${f.nom || f.categorie}` : `Nouveau produit : ${f.categorie || "produit libre"}`;
  const pret = String(f.nom).trim() && String(f.categorie).trim() && String(f.quantite).trim() !== "" && String(f.code).trim();
  shell(titre, m?.suivi ? `Apiviz suivra : ${m.suivi.toLowerCase()}` : "", f.existant ? "" : '<button type="button" class="btn" data-act="prretour">Changer de modèle</button>',
    `<div class="form pr-ecran">
      <section class="card stack">
        <div class="pr-tete"><span class="pr-alv" aria-hidden="true">${icone(iconeDe(f.categorie), 22)}</span>
          ${f.libre ? `<label class="pr-grand">Type de produit<input id="pr_categorie" value="${e(f.categorie)}" maxlength="40" autocomplete="off" required placeholder="Savon, nougat, gaufres de cire…"></label>`
            : `<b class="pr-cat">${e(f.categorie)}</b>`}</div>
        <label>Nom du produit<input id="pr_nom" value="${e(f.nom)}" maxlength="80" autocomplete="off" required></label>
        <div><span class="pr-lab" id="pr_unite_l">Se vend à la pièce, au pot…</span>
          <div class="seg pr-unites" role="group" aria-labelledby="pr_unite_l">${unites.map((u) => `<button type="button" class="${u === f.unite ? "on" : ""}" aria-pressed="${u === f.unite}" data-act="prunite" data-v="${e(u)}">${e(u.charAt(0).toUpperCase() + u.slice(1))}</button>`).join("")}</div></div>
        <div class="two"><label>Format<input id="pr_format" value="${e(f.format_libelle)}" maxlength="40" list="pr_formats" autocomplete="off" placeholder="75 cl, pain de 250 g…"></label>
          <label>Prix de vente (€)<input id="pr_prix" type="number" inputmode="decimal" step="0.01" min="0" value="${e(f.prix)}"></label></div>
        <datalist id="pr_formats">${formats.map((x) => `<option value="${e(x)}">`).join("")}</datalist>
      </section>
      <section class="card stack"><h2>En stock</h2>
        <div class="two"><label>${f.existant ? "Quantité de départ" : "Combien en as-tu ?"}<input id="pr_quantite" type="number" inputmode="numeric" step="1" min="${vendus}" value="${e(f.quantite)}" required></label>
          <label>Numéro de lot<input id="pr_code" value="${e(f.code)}" maxlength="30" autocomplete="off" required></label></div>
        ${vendus ? `<p class="small">Déjà vendus : ${e(P.quantiteLot({ unite: f.unite }, vendus))}.</p>` : ""}
        <div class="two"><label>Date de durabilité minimale (facultatif)<input id="pr_ddm" type="date" value="${e(f.ddm)}"></label>
          <label>Me prévenir sous (facultatif)<input id="pr_seuil" type="number" inputmode="numeric" step="1" min="0" value="${e(f.seuil)}" placeholder="5"></label></div>
      </section>
      ${f.categorie === "Hydromel" ? '<p class="pr-note">C’est une boisson alcoolisée : vérifie tes obligations auprès des douanes avant de vendre.</p>' : ""}
      ${lecteur() ? "" : `<button type="button" class="btn main block" data-act="prvalider" ${pret && !S.busy ? "" : "disabled"}>${f.existant ? "Enregistrer" : "Créer le produit"}</button>`}
      ${f.existant && !vendus && !lecteur() ? '<button type="button" class="link pr-suppr" data-act="prsupprimer">Supprimer ce produit</button>' : ""}
    </div>`);
  // Le bouton suit la saisie sans redessiner l'écran (le clavier reste ouvert).
  const maj = () => {
    const g = lire(), b = document.querySelector('[data-act="prvalider"]');
    if (b) b.disabled = !(String(g.nom).trim() && String(g.categorie).trim() && String(g.quantite).trim() !== "" && String(g.code).trim()) || S.busy;
  };
  document.querySelectorAll(".pr-ecran input").forEach((x) => x.addEventListener("input", maj));
}

/** L'écran « produit ». */
export function ecran() {
  if (!S.pr) S.pr = nouveau();
  return S.pr.etape === 1 ? etape1() : etape2();
}

/** Ouvre la création d'un produit (étape 1). */
export function ouvrir() { S.pr = nouveau(); go("produit"); }

function choisir(categorie) {
  if (categorie === "Miel") { S.pr = null; return ACT.newlot(); }
  const m = P.modeleDe(categorie), f = S.pr || nouveau();
  Object.assign(f, { etape: 2, categorie: categorie || "", libre: !categorie, nom: categorie || "", unite: m?.unite || "pièce",
    format_libelle: m?.formats?.[0] || "", code: P.prochainCodeProduit(S.d.lots, categorie || "Produit") });
  const dernier = (S.d.lots || []).filter((l) => P.categorieDe(l) === categorie).at(-1);
  if (dernier) Object.assign(f, { nom: dernier.miel || f.nom, unite: dernier.unite || f.unite, format_libelle: dernier.format_libelle || f.format_libelle, prix: dernier.prix ?? "" });
  render();
}

async function valider(_v, _k, bouton) {
  const f = lire();
  if (!f.existant && f.libre) f.code = String(f.code).trim() || P.prochainCodeProduit(S.d.lots, f.categorie);
  const p = P.produitAEnvoyer(f);
  if ((S.d.lots || []).some((l) => l.code === p.code && l.id !== p.id)) throw new Error(`Le lot ${p.code} existe déjà : choisis un autre numéro.`);
  if (bouton) bouton.disabled = true;
  S.busy = true;
  try {
    if (f.existant) {
      if (p.quantite < (f.vendus || 0)) throw new Error(`Déjà ${f.vendus} vendus : la quantité de départ ne peut pas être plus petite.`);
      const ligne = { code: p.code, categorie: p.categorie, miel: p.nom, unite: p.unite, format_libelle: p.format_libelle, prix: p.prix,
        pots_initiaux: p.quantite, ddm: p.ddm, seuil: p.seuil };
      S.pr = null; S.lotId = p.id; S.route = "lot";
      await write(sb.from("lots").update(ligne).eq("id", p.id), "Produit enregistré");
      return;
    }
    const { error, local } = await appel("creer_produit", { p });
    if (error) throw error;
    S.pr = null; S.lotId = p.id; S.route = "lot";
    if (local) {
      P.appliquerProduit(S.d, p, { _attente: true });
      typeof HL != "undefined" && HL.garderDonnees();
      render(); toast("Gardé sur le téléphone : envoi au retour du réseau");
    } else { await refresh(); toast(`${p.nom} : ${P.quantiteLot(p, p.quantite)} en stock`); }
  } finally { S.busy = false; if (bouton?.isConnected) bouton.disabled = false; }
}

// Pas de fenêtre du navigateur (elle bloque l'app) : un second appui dans les 4 secondes confirme (comme l'inventaire).
let armer = 0;
async function supprimer() {
  const f = S.pr;
  if (!f?.existant || f.vendus) return;
  if (Date.now() - armer > 4000) { armer = Date.now(); return toast(`Touche encore pour supprimer ${f.nom} (lot ${f.code})`); }
  armer = 0;
  S.pr = null; S.route = "miel";
  await write(sb.from("lots").delete().eq("id", f.id), "Produit supprimé");
}

/** Actions ; « editlot » ouvre ce même écran pour un produit qui n'est pas du miel, l'ancienne fiche sinon. */
export const actions = {
  newproduit: () => ouvrir(),
  // v5.67 : « Ajouter » de l'onglet Stock (feuille), et le nouveau lot d'un produit depuis sa carte.
  stajouter: () => feuilleAjouter(),
  stchoix: (act) => { if ($sheet.open) $sheet.close(); ACT[act]?.(); },
  stnouveau: (categorie) => { if (categorie === "Miel") return ACT.newlot(); S.pr = nouveau(); go("produit"); choisir(categorie); },
  prmodele: (v) => choisir(v),
  prunite: (u) => { lire(); S.pr.unite = u; render(); },
  prretour: () => { lire(); S.pr.etape = 1; render(); },
  prannuler: () => { S.pr = null; go("miel"); },
  prvalider: valider,
  prsupprimer: supprimer,
  editlot: (id) => {
    const l = (S.d.lots || []).find((x) => x.id === id);
    if (l && !P.estMiel(l)) { S.pr = depuisLot(l); return go("produit"); }
    return lotForm(l);
  },
};
export const remplace = ["editlot"];

/**
 * Complément de l'écran « miel » (onglet Stock). v5.67 (maquettes « Produits : mise en pots, lots, clients » du 20 nov.
 * 2026) : une carte par produit avec ses lots en vignettes, deux par ligne (numéro, prix, jauge de ce qui reste, DDM) ;
 * un toucher ouvre la fiche du lot. Remplace « Tes produits » suivi du tableau des lots, qui répétait les mêmes produits
 * et faisait une fiche de cinq lignes par lot sur téléphone. La vignette pointillée ajoute un lot du produit (le miel :
 * la mise en pots).
 */
export function completerStock() {
  if (S.route !== "miel") return;
  const wrap = document.querySelector(".wrap");
  if (!wrap || wrap.querySelector(".pr-catalogue")) return;
  const groupes = P.catalogue(S.d.lots);
  const tableau = wrap.querySelector("section.card.tbl");
  if (!groupes.length && !tableau) return;
  const html = `<div class="pr-catalogue" aria-label="Tes produits">${groupes.map(carteProduit).join("")}</div>`;
  if (tableau) tableau.replaceWith(...gabarit(html));
  else wrap.insertAdjacentHTML("beforeend", html);
}
const gabarit = (html) => { const t = document.createElement("template"); t.innerHTML = html; return [...t.content.childNodes]; };
const ddmCourte = (d) => (d ? `${d.slice(5, 7)}/${d.slice(2, 4)}` : "");

/** Une carte produit : en-tête (alvéole, nom, formats, quantité) et vignettes des lots, les plus récents d'abord. */
function carteProduit(g) {
  const miel = g.categorie === "Miel", lots = [...g.lots].reverse();
  const formats = [...new Set(g.lots.map(P.formatLot).filter(Boolean))].join(", ");
  const sous = [`${g.lots.length} lot${g.lots.length > 1 ? "s" : ""}`, formats].filter(Boolean).join(" · ");
  const bas = g.bas ? `<span class="tag watch">${g.bas > 1 ? `${g.bas} lots bas` : "Stock bas"}</span>` : "";
  const ajout = lecteur() ? "" : `<button type="button" class="pr-lot pr-lot-ajout" data-act="${miel ? "newlot" : "stnouveau"}" data-v="${e(g.categorie)}">${icone("plus", 18)}<span>${miel ? "Mettre en pots" : "Nouveau lot"}</span></button>`;
  return `<section class="card pr-produit">
    <div class="pr-ligne"><span class="pr-alv" aria-hidden="true">${icone(iconeDe(g.categorie), 20)}</span>
      <span class="pr-ligne-t"><b class="pr-cat">${e(g.categorie)}</b><span class="small">${e(sous)}</span></span>
      <span class="pr-ligne-q"><b>${e(P.quantiteLot(g.lots[0], g.restants))}</b>${bas}</span></div>
    <div class="pr-lots">${lots.map(vignette).join("")}${ajout}</div></section>`;
}

/** Vignette d'un lot : numéro et prix, nom et format, jauge de ce qui reste, restants et DDM. */
function vignette(l) {
  const reste = Math.max(0, Number(l.pots_restants ?? 0)), total = Math.max(reste, Number(l.pots_initiaux || 0), 1);
  const nom = [P.nomLot(l), P.formatLot(l)].filter(Boolean).join(" · ");
  const ddm = ddmCourte(l.ddm);
  return `<button type="button" class="pr-lot${P.stockBas(l) ? " pr-lot-bas" : ""}${reste ? "" : " pr-lot-vide"}" data-act="erlot" data-v="${e(l.id)}" aria-label="Lot ${e(l.code)}, ${e(nom)}, ${e(P.quantiteLot(l, reste))} sur ${e(n(total, 0))}">
    <span class="pr-lot-h"><b>${e(l.code)}</b><span class="small">${Number(l.prix) > 0 ? e(eur(l.prix)) : "Prix à fixer"}</span></span>
    <span class="pr-lot-n">${e(nom)}</span>
    <span class="pr-jauge" aria-hidden="true"><i style="width:${Math.round((reste / total) * 100)}%"></i></span>
    <span class="pr-lot-b"><span>${e(n(reste, 0))} / ${e(n(total, 0))}</span>${ddm ? `<span>DDM ${e(ddm)}</span>` : ""}</span></button>`;
}

/** Feuille « Ajouter au stock » (v5.67) : la seule porte pour créer, à la place de « Nouveau lot » et « Ajouter un produit ». */
function feuilleAjouter() {
  const opt = (act, ic, t, s, cls = "") => `<button type="button" class="pr-choix${cls}" data-act="stchoix" data-v="${act}"><span class="pr-alv" aria-hidden="true">${icone(ic, 22)}</span><span class="pr-choix-t"><b>${t}</b><span class="small">${s}</span></span><span aria-hidden="true">›</span></button>`;
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="u-entete"><h2>Ajouter au stock</h2><button type="button" class="link" data-act="closesheet">Fermer</button></div>
    <div class="pr-choix-l">${opt("newlot", "pot", "Mettre du miel en pots", "Le miel récolté, les pots vides, couvercles et étiquettes deviennent des pots de miel.")}
    ${opt("newproduit", "bouteille", "Autre produit", "Hydromel, pain d’épices, cire, bougies… : un nouveau produit ou un nouveau lot.")}
    ${opt("mpdeja", "pot", "Pots de miel déjà prêts", "Sans rien retirer du stock de matériel.", " pr-choix-discret")}</div>`;
  if (!$sheet.open) $sheet.showModal();
}
