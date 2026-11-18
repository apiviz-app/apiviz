// Apiviz — vitrine de l'écran Ventes (v5.66, maquette « Ventes · nouveau rendu » du 18 nov. 2026, validée).
// Remplace le grand pot d'Alvéoles (.al-pots) et la carte « À vendre » par une carte par produit : dessin (pot de la
// taille du format, bouteille, pain de cire…), nom, format et lot, stock, prix ou « Prix à fixer », et un « + » qui ouvre
// la vente avec ce produit déjà compté. « Ajouter un produit » en dernière carte. « Aucune vente » devient une phrase
// qui dit qu'un client n'est pas nécessaire avant de vendre.
// Règles : clients-regles.js (vitrine). Globales lues à l'appel : S, esc, eur, n, ACT, Regles, redessiner. Styles : 65-ventes-clients.css.
import { vitrine, taillePot } from "./clients-regles.js";
import { icone, iconeDe } from "../production/produit.js";

const e = (t) => esc(t);
const lecteur = () => document.documentElement.classList.contains("lecteur");

/** Dessins des produits (pleins, aux couleurs de la charte) ; les autres catégories gardent leur icône au trait. */
const POT = {
  petit: '<rect x="22" y="12" width="20" height="6" rx="3" fill="#1E2B24"/><rect x="18" y="20" width="28" height="34" rx="7" fill="#E3A008" stroke="#1E2B24" stroke-width="3"/><rect x="23" y="30" width="18" height="13" rx="3" fill="#FFF8E7"/><path d="M29 36.5l1.6-2.8h2.8l1.6 2.8-1.6 2.8h-2.8z" fill="#E3A008"/>',
  moyen: '<rect x="21" y="7" width="22" height="6" rx="3" fill="#1E2B24"/><rect x="15" y="15" width="34" height="42" rx="8" fill="#E3A008" stroke="#1E2B24" stroke-width="3"/><rect x="21" y="28" width="22" height="15" rx="3" fill="#FFF8E7"/><path d="M29 35.5l1.6-2.8h2.8l1.6 2.8-1.6 2.8h-2.8z" fill="#E3A008"/>',
  grand: '<rect x="20" y="4" width="24" height="7" rx="3" fill="#1E2B24"/><rect x="12" y="13" width="40" height="46" rx="9" fill="#E3A008" stroke="#1E2B24" stroke-width="3"/><rect x="19" y="27" width="26" height="16" rx="3" fill="#FFF8E7"/><path d="M29 35l1.6-2.8h2.8l1.6 2.8-1.6 2.8h-2.8z" fill="#E3A008"/>',
};
const DESSINS = {
  Hydromel: '<rect x="27" y="4" width="10" height="6" rx="2" fill="#1E2B24"/><path d="M28 10h8v9c0 3 9 6 9 14v21a5 5 0 0 1-5 5H24a5 5 0 0 1-5-5V33c0-8 9-11 9-14z" fill="#C27A12" stroke="#1E2B24" stroke-width="3" stroke-linejoin="round"/><rect x="23" y="36" width="18" height="13" rx="2" fill="#FFF8E7"/><path d="M28 42.5h8" stroke="#C27A12" stroke-width="2.4" stroke-linecap="round"/>',
  Cire: '<path d="M18 18h28l10 14-10 14H18L8 32z" fill="#F2D27A" stroke="#1E2B24" stroke-width="3" stroke-linejoin="round"/><path d="M22 27h20M22 32h20M22 37h20" stroke="#C9A646" stroke-width="2" stroke-linecap="round"/>',
  Bougie: '<path d="M32 6c3 4 4 7 0 11-4-4-3-7 0-11z" fill="#E3A008" stroke="#1E2B24" stroke-width="2"/><path d="M32 17v5" stroke="#1E2B24" stroke-width="2.4" stroke-linecap="round"/><rect x="21" y="22" width="22" height="34" rx="4" fill="#F2D27A" stroke="#1E2B24" stroke-width="3"/><path d="M21 31h22M21 40h22M21 49h22" stroke="#C9A646" stroke-width="2"/>',
};
const FONDS = { Miel: "#FBEFC9", Hydromel: "#F3E4CF", Cire: "#FFF8E7", Bougie: "#FFF8E7" };

/** Dessin d'un produit (64 × 64), ou son icône au trait pour une catégorie sans dessin. */
export function dessin(p, taille = 80) {
  const svg = (corps) => `<svg width="${taille}" height="${taille}" viewBox="0 0 64 64" aria-hidden="true">${corps}</svg>`;
  if (p.categorie === "Miel") return svg(POT[taillePot(p.lot)]);
  if (DESSINS[p.categorie]) return svg(DESSINS[p.categorie]);
  return icone(iconeDe(p.categorie), Math.round(taille * 0.5));
}
export const fond = (p) => (p.epuise ? "#E9ECE4" : FONDS[p.categorie] || "#EDF0E8");

function carte(p) {
  const nom = p.categorie === "Miel" ? (/^miel\b/i.test(p.nom) ? p.nom : `Miel ${p.nom.charAt(0).toLowerCase()}${p.nom.slice(1)}`) : p.nom;
  const sous = [p.format, p.codes[0] ? `lot ${p.codes[0]}${p.codes.length > 1 ? "…" : ""}` : ""].filter(Boolean).join(" · ");
  const prix = p.epuise ? '<span class="tag">Épuisé</span>'
    : p.prixAFixer ? (lecteur() ? '<span class="tag watch">Prix à fixer</span>' : `<button type="button" class="tag watch vt-prix" data-act="vtprix" data-v="${e(p.lot.id)}">Prix à fixer</button>`)
    : `<span class="tag good">${e(eur(p.prix))}</span>`;
  const plus = !p.epuise && !lecteur()
    ? `<button type="button" class="vt-plus" data-act="vtvendre" data-v="${e(p.lot.id)}" aria-label="Vendre ${e(nom)} ${e(p.format)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>` : "";
  return `<article class="vt-carte${p.epuise ? " vt-epuise" : ""}">
    <div class="vt-dessin" style="background:${fond(p)}">${dessin(p)}${plus}</div>
    <div class="vt-info"><b>${e(nom)}</b><span class="small">${e(sous)}</span>
      <span class="vt-bas"><span class="vt-q"><b>${e(n(p.restants, 0))}</b> <span class="small">${e(Regles.produits.uniteLot(p.lot, p.restants))}</span></span>${prix}</span>
      ${p.bas && !p.epuise ? '<span class="tag watch vt-bas-stock">Stock bas</span>' : ""}</div></article>`;
}

/** Complète l'onglet Ventes (après ux.js et Alvéoles). */
export function completerVitrine() {
  if (S.route !== "clients") return;
  const wrap = document.querySelector(".wrap");
  const titre = [...(wrap?.querySelectorAll("h2.u-titre") || [])].find((h) => h.textContent.trim() === "Dernières ventes");
  if (!wrap || !titre || wrap.querySelector(".vt-vitrine")) return;
  wrap.querySelector(".al-pots")?.remove();
  [...wrap.querySelectorAll("section.card")].find((s) => s.querySelector("h2")?.textContent.trim() === "À vendre")?.remove();
  const produits = vitrine(S.d.lots || []);
  const ajout = lecteur() ? "" : `<button type="button" class="vt-ajout" data-act="newproduit"><span class="vt-alv" aria-hidden="true">${icone("plus", 22)}</span><b>Ajouter un produit</b><span class="small">Cire, bougies, pollen, savon…</span></button>`;
  const html = produits.length || ajout
    ? `<section class="vt-vitrine" aria-label="En vitrine"><div class="u-entete"><h2>En vitrine</h2><button type="button" class="link" data-act="go" data-v="miel">Tout le stock</button></div>
      <div class="vt-grille">${produits.map(carte).join("")}${ajout}</div></section>` : "";
  titre.insertAdjacentHTML("beforebegin", html);
  // Aucune vente : une phrase utile plutôt qu'un vide.
  const vide = titre.nextElementSibling;
  if (vide?.matches("p.small") && /Aucune vente/.test(vide.textContent)) {
    vide.outerHTML = `<section class="card vt-sans-vente"><span class="vt-alv" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg></span><div><b>Pas encore de vente.</b>
      <p class="small">Pas besoin de créer un client avant : tu le choisis ou tu le crées pendant la vente, ou tu vends sans client au marché.</p></div></section>`;
  }
}

export const actions = {
  /** « + » d'une carte : nouvelle vente avec ce produit déjà compté une fois. */
  vtvendre: (id) => {
    ACT.newvente();
    const lot = (S.d.lots || []).find((l) => l.id === id);
    if (lot && Number(lot.pots_restants) > 0 && S.vente) { S.vente.q[id] = 1; redessiner("vente"); }
  },
  /** « Prix à fixer » : la fiche du lot, pour donner un prix. */
  vtprix: (id) => ACT.editlot(id),
};
