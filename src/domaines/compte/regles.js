// Apiviz — règles des rôles (IT-04, AP-FEAT-011). Fonctions pures, testées par tests/unitaires/compte.test.mjs.
// La base refuse déjà toute écriture d'un lecteur (migration 014) ; ces règles servent à l'interface :
// n'afficher aucun bouton de saisie et refuser poliment une action qui en serait une.

export const ROLES = Object.freeze({
  responsable: "responsable",
  membre: "membre",
  lecteur: "lecteur",
});

/** Libellé d'un rôle, pour l'écran Membres et le menu du compte. */
export const libelleRole = (role) => ({ responsable: "Responsable", membre: "Membre", lecteur: "Lecture seule" })[role] || "Membre";

/** Vrai si ce rôle peut saisir et modifier des données. */
export const peutEcrire = (role) => role === "responsable" || role === "membre";

/**
 * Actions permises à un lecteur : navigation, consultation, impression, exports, compte, aide.
 * Liste blanche : toute action qui n'y est pas (y compris une action ajoutée plus tard) est masquée et refusée.
 */
export const ACTIONS_LECTEUR = Object.freeze([
  // Navigation et consultation
  "go", "ruche", "cancel", "closesheet", "n4voisine", "uonglet", "utfiltre", "utout", "alrucher", "allent", "alclient",
  "erlot", "erposte", "ermois", "ermeteo", "ermjour", "ertoutvu", "uvente", "phvoir", "phfermer", "stfiltre",
  "eadetail", // écran « Entre associés » (v5.32) : consultation
  // Ruchers en tableau (v5.36) : affichage, filtres, tri, colonnes, fiche rapide, export (la sélection reste une saisie)
  "tbvue", "tbaff", "tbfeuille", "tbfermer", "tbfiltre", "tbseuil", "tbsugg", "tbeffacer", "tbcol", "tbcompact", "tbtri", "tbouvrir", "tbexport",
  // Impression et exports (rien n'est modifié)
  "exp", "erimprimer", "rgprint", "etiq", "v3copierdecla",
  // Compte, exploitation, affichage
  "authmode", "logout", "decoforcer", "decoenvoyer", "n4compte", "n4expl", "n4q", "n4soleil", "n4installer", "n4plustard",
  "v3soleil", "exouvrir", "exquitter", "excopier",
  // Prise en main (mémorisée sur l'appareil seulement)
  "dmexemple", "dmconnexion", "dmastuce", "dmbravo", "dmmasquer", "dminstaller", "dmarrivee", "dmsortie",
  // File hors ligne : un lecteur peut abandonner une saisie bloquée
  "hlcorriger", "hlabandonner",
]);

const permises = new Set(ACTIONS_LECTEUR);

/** Vrai si l'action (data-act, et data-v pour n4q qui relaie une autre action) est permise à ce rôle. */
export function actionPermise(role, act, v) {
  if (peutEcrire(role) || !role) return true;
  if (!permises.has(act)) return false;
  if (act === "n4q") return permises.has(v);
  return true;
}

/** Règle CSS qui masque les boutons de saisie et rend inertes les autres éléments cliquables d'action interdite. */
export function styleLecteur() {
  const pas = ACTIONS_LECTEUR.map((a) => `:not([data-act="${a}"])`).join("");
  return `html.lecteur [data-act]${pas}{pointer-events:none;cursor:default;text-decoration:none}
html.lecteur :is(.btn,.fab,.chips button,.check,.ph-x,.stepper .ctl button,.seg button,.dm-choix,.n4-ligne,.u-trois button)[data-act]${pas},
html.lecteur [data-act="n4q"]${ACTIONS_LECTEUR.map((a) => `:not([data-v="${a}"])`).join("")},
html.lecteur .bottom [data-v="saisir"],html.lecteur :is([data-act^="new"],[data-act^="del"],[data-act$="suppr"],[data-act="sheetdel"]),
html.lecteur .fab,html.lecteur .ph-add,html.lecteur [data-v3d],html.lecteur .u-trois{display:none!important}`;
}
