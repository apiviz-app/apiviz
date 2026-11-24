// Apiviz — carte de fidélité (v5.78, migration 038, maquette « Idées pour vendre plus », idée 1, validée le 24 nov. 2026).
// Règles pures, testées par tests/unitaires/fidelite.test.mjs ; les scripts classiques les lisent par
// window.Regles.fidelite.
//
// Pas de table : un tampon par article payé depuis le début de la carte (réglage `fidelite` : { actif, tampons,
// depuis }). Une carte pleine donne l'article suivant offert (le moins cher du panier), gardé dans
// ventes.remise_fidelite ; l'article offert ne compte pas comme tampon. Les clients sans nom (« Vente au marché ») n'ont pas de carte.

export const DEFAUT = { actif: false, tampons: 10, depuis: "" };
export const CLIENT_MARCHE = "Vente au marché";

/** Réglage lu dans cfg().fidelite, borné (2 à 50 tampons). */
export function reglage(c) {
  const f = { ...DEFAUT, ...((c && c.fidelite) || {}) };
  const t = Math.round(Number(f.tampons));
  return { actif: !!f.actif, tampons: Number.isFinite(t) ? Math.min(50, Math.max(2, t)) : DEFAUT.tampons, depuis: String(f.depuis || "") };
}

/** Le client a-t-il une carte ? (un client nommé, pas la vente au marché) */
export const aUneCarte = (client) => !!client && String(client.nom || "").trim() !== "" && client.nom !== CLIENT_MARCHE;

/**
 * Carte d'un client : { tampons (sur la carte en cours), unites (tampons cumulés), gagnees, utilisees, dispo, n }.
 * ventes et lignes : celles de l'exploitation ; seules celles du client, depuis le début de la carte, comptent.
 */
export function carte(client, ventes, lignes, r) {
  const n = r.tampons;
  if (!aUneCarte(client)) return null;
  const vs = (ventes || []).filter((v) => v.client_id === client.id && (!r.depuis || String(v.date_vente) >= r.depuis));
  const ids = new Set(vs.map((v) => v.id));
  const utilisees = vs.filter((v) => Number(v.remise_fidelite) > 0).length;
  const achetes = (lignes || []).filter((l) => ids.has(l.vente_id)).reduce((t, l) => t + (Number(l.quantite) || 0), 0);
  const unites = Math.max(0, achetes - utilisees);
  const gagnees = Math.floor(unites / n);
  return { tampons: unites - gagnees * n, unites, gagnees, utilisees, dispo: Math.max(0, gagnees - utilisees), n };
}

/**
 * La carte avec la vente en cours : { tampons, dispo, proposer, pleine } après la vente.
 * articles : articles du panier ; recompense : la récompense est donnée dans cette vente (un article offert, sans
 * tampon). Une récompense se donne sur un article acheté après une carte pleine : avec 8 tampons sur 10, il faut
 * 3 articles (2 payés remplissent la carte, le 3e est offert).
 * proposer : la récompense peut être donnée dans cette vente ; pleine : la carte est pleine à la fin de la vente,
 * le prochain article sera offert.
 */
export function avecVente(c, articles, recompense = false) {
  if (!c) return null;
  const q = Math.max(0, Number(articles) || 0);
  const proposer = !recompense && q >= 1 && Math.floor((c.unites + q - 1) / c.n) - c.utilisees >= 1;
  const unites = c.unites + q - (recompense ? 1 : 0);
  const gagnees = Math.floor(unites / c.n), utilisees = c.utilisees + (recompense ? 1 : 0);
  const dispo = Math.max(0, gagnees - utilisees);
  return { tampons: unites - gagnees * c.n, dispo, proposer, pleine: dispo >= 1, n: c.n };
}

/** « 8 sur 10 » */
export const texte = (c) => (c ? `${c.tampons} sur ${c.n}` : "");
