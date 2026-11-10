// Apiviz — règles sanitaires (IT-03, AP-FEAT-013). Fonctions pures, reprises d'ux.js.
// Aucun seuil nouveau : le seuil par défaut (3 %) est celui d'ux.js depuis la v2 ; il se règle dans Réglages.

/**
 * Taux d'infestation d'un comptage : varroas pour 100 abeilles.
 * null si le comptage est incomplet (pas d'abeilles comptées) ou fait par la méthode Lange (chute, pas de taux).
 */
export const tauxVarroa = (v) =>
  v && v.varroa != null && v.varroa_abeilles > 0 && v.varroa_methode !== "Lange" ? (v.varroa / v.varroa_abeilles) * 100 : null;

/** Seuil d'alerte réglé par l'exploitation (réglages.varroaSeuil), 3 % sinon. */
export const seuilVarroa = (reglages) => Number(reglages?.varroaSeuil) || 3;
