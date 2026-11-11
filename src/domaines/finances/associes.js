// Apiviz — comptes entre associés (chantier des écrans, étape 7, v5.29). Fonctions pures, testées par
// tests/unitaires/associes.test.mjs. Données (migration 017) :
//   achat : achete_par (qui l'a fait), paye_par (l'associé qui a payé de ses fonds propres, ou « Société ») ;
//   vente : vendu_par (qui l'a faite), encaisse_par (l'associé qui a récolté l'argent, ou « Société »).
// Une ligne de l'ancienne version peut porter « Caisse commune » : c'est la société.
// Principe, à parts égales : l'argent qu'un associé avance pour la société, la société le lui doit ; l'argent de la
// société qu'il garde après une vente, il le doit à la société. Entre deux associés, celui à qui la société doit le
// plus reçoit de l'autre la moitié de l'écart, et ils sont à égalité.
import { venteTotal } from "./regles.js";

export const SOCIETE = "Société";
const propre = (x) => String(x ?? "").trim();
/** « Société », « Caisse commune » (ancienne version) : l'argent de la société. */
export const estSociete = (x) => ["societe", "société", "caisse commune", "caisse"].includes(propre(x).toLowerCase());

/**
 * Associés à proposer dans les formulaires : la liste des réglages si elle est remplie, sinon les noms déjà notés sur
 * les achats et les ventes ; « moi » (le prénom de cet appareil) en premier s'il est connu.
 */
export function associesConnus(d, reglages = {}, moi = "") {
  const liste = Array.isArray(reglages.associes) ? reglages.associes.map(propre).filter(Boolean) : [];
  const vus = liste.length ? liste : [
    ...(d.depenses || []).flatMap((x) => [x.achete_par, x.paye_par]),
    ...(d.ventes || []).flatMap((x) => [x.vendu_par, x.encaisse_par]),
  ].map(propre).filter((x) => x && !estSociete(x));
  const m = propre(moi);
  const tous = [...new Set([...(m ? [m] : []), ...vus])];
  return tous.sort((a, b) => (a === m ? -1 : b === m ? 1 : a.localeCompare(b, "fr")));
}

/**
 * Pour chaque associé : achats faits, argent avancé de ses fonds propres, ventes faites, argent de vente récolté,
 * et solde vis-à-vis de la société (positif : la société lui doit ; négatif : il doit à la société).
 */
export function soldesAssocies(d, noms) {
  const memeNom = (a, b) => propre(a).toLowerCase() === propre(b).toLowerCase();
  return noms.map((nom) => {
    const achats = (d.depenses || []).filter((x) => memeNom(x.achete_par, nom));
    const avance = (d.depenses || []).filter((x) => memeNom(x.paye_par, nom)).reduce((t, x) => t + Number(x.montant || 0), 0);
    const ventes = (d.ventes || []).filter((x) => memeNom(x.vendu_par, nom));
    const encaisse = (d.ventes || []).filter((x) => x.paye && memeNom(x.encaisse_par, nom)).reduce((t, x) => t + venteTotal(d, x), 0);
    const r = (x) => Math.round(x * 100) / 100;
    return { nom, achats: achats.length, avance: r(avance), ventes: ventes.length, encaisse: r(encaisse), solde: r(avance - encaisse) };
  });
}

/**
 * Ce qu'il faut pour être à égalité, entre deux associés : { de, a, montant } ou null (à égalité, ou un seul associé).
 * Au-delà de deux, chacun règle avec la société : la carte dit alors seulement qui a avancé le plus.
 */
export function reglementEntreAssocies(soldes) {
  if (soldes.length !== 2) return null;
  const [x, y] = [...soldes].sort((a, b) => b.solde - a.solde);
  const montant = Math.round(((x.solde - y.solde) / 2) * 100) / 100;
  return montant >= 0.01 ? { de: y.nom, a: x.nom, montant } : null;
}
