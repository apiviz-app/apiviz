// Apiviz — gouttes d'API (IT-27, migration 029) : coût réel d'une réponse du modèle, en gouttes.
// 1 goutte = 1 centime d'euro de ce que l'IA coûte vraiment. Même fichier dans assistant/ et lire-facture/ (chaque
// fonction serveur est déployée avec ses seuls fichiers) ; tests/unitaires/gouttes.test.mjs vérifie qu'ils sont identiques.
//
// Tarifs Claude en dollars par million de jetons, relevés le 18 nov. 2026 sur
// https://platform.claude.com/docs/en/about-claude/pricing. À relire à chaque changement de prix : la goutte doit suivre
// le coût réel, à la hausse comme à la baisse.
// Haiku 5.5 a deux tranches : au-delà de 100 000 jetons lus par requête (cache compris), le tarif est 5 fois plus haut.

export const TARIFS = {
  "claude-sonnet-5-5": { entree: 2, ecriture: 2.5, lecture: 0.1, sortie: 10 },
  "claude-haiku-5-5": { entree: 0.1, ecriture: 0.125, lecture: 0.01, sortie: 0.5, seuil: 100000, multiple: 5 },
};

/** Taux de conversion par défaut (BCE, 18 nov. 2026 : 1 € = 1,098 $). Réglage GOUTTES_EUR_PAR_USD. */
export const EUR_PAR_USD = 0.91;

/** Tarif d'un modèle ; un modèle inconnu est compté au tarif le plus cher connu, jamais gratuitement. */
export function tarif(modele) {
  return TARIFS[modele] || Object.values(TARIFS).reduce((a, b) => (b.sortie > a.sortie ? b : a));
}

/**
 * Coût en dollars d'un appel (ou de la somme de plusieurs appels), d'après le champ usage de l'API Messages.
 * output_tokens comprend la réflexion du modèle, facturée au tarif de sortie.
 */
export function coutUsd(modele, usage = {}) {
  const t = tarif(modele);
  const n = (k) => Math.max(0, Number(usage[k]) || 0);
  const lus = n("input_tokens") + n("cache_creation_input_tokens") + n("cache_read_input_tokens");
  const m = t.seuil && lus > t.seuil ? t.multiple : 1;
  return (n("input_tokens") * t.entree + n("cache_creation_input_tokens") * t.ecriture
    + n("cache_read_input_tokens") * t.lecture + n("output_tokens") * t.sortie) * m / 1e6;
}

/** Gouttes à retirer pour cet usage : au centième de goutte, 0,01 au minimum. */
export function gouttes(modele, usage, eurParUsd = EUR_PAR_USD) {
  const taux = Number(eurParUsd) > 0 ? Number(eurParUsd) : EUR_PAR_USD;
  return Math.max(0.01, Math.round(coutUsd(modele, usage) * taux * 100 * 100) / 100);
}

/** Usage additionné de plusieurs appels (la boucle de l'assistant en fait parfois trois ou quatre). */
export function additionner(...usages) {
  const s = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for (const u of usages) for (const k of Object.keys(s)) s[k] += Number(u?.[k]) || 0;
  return s;
}

/** Message affiché quand l'exploitation n'a plus de gouttes. */
export const MESSAGE_EPUISE = "Tes gouttes du mois sont épuisées. Le reste d'Apiviz fonctionne normalement ; recharge ou change d'offre pour reparler à API.";
