// Apiviz — formats (IT-03, AP-FEAT-013). Fonctions pures : aucune dépendance au navigateur ni à l'état.
// Reprises telles quelles d'app.js ; testées par tests/unitaires/format.test.mjs.

const ENTITES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Texte sûr à insérer dans du HTML. */
export const esc = (valeur) => String(valeur ?? "").replace(/[&<>"']/g, (car) => ENTITES[car]);

/** Nombre à la française (espace des milliers, virgule), `decimales` chiffres au plus après la virgule. */
export const n = (valeur, decimales = 1) =>
  Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: decimales });
export const eur = (montant) => n(montant, 2) + " €";
export const eur0 = (montant) => n(montant, 0) + " €";

/** Date du jour (AAAA-MM-JJ) dans le fuseau du téléphone. */
export const today = (maintenant = new Date()) =>
  new Date(maintenant - maintenant.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

/** 2026-11-06 → 06/11/2026 ; vide → tiret. */
export const dfr = (date) => (date ? date.slice(8, 10) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4) : "–");
/** 2026-11-06 → 06/11 ; vide → tiret. */
export const dshort = (date) => (date ? date.slice(8, 10) + "/" + date.slice(5, 7) : "–");

export const byId = (liste, id) => liste.find((element) => element.id === id);
/** Somme de `valeurDe(élément)` ; les valeurs vides ou non numériques comptent pour 0. */
export const sum = (liste, valeurDe) => liste.reduce((total, element) => total + Number(valeurDe(element) || 0), 0);
/** Jours écoulés depuis `date` (AAAA-MM-JJ). */
export const days = (date, maintenant = new Date()) => Math.floor((new Date(today(maintenant)) - new Date(date)) / 864e5);
export const yr = (date) => Number(String(date).slice(0, 4));
/** Mois de 0 (janvier) à 11. */
export const mo = (date) => Number(String(date).slice(5, 7)) - 1;
/** Valeur de champ de formulaire → nombre, ou null si le champ est vide. */
export const num = (valeur) => (valeur === "" || valeur === void 0 || valeur === null ? null : Number(valeur));
export const orNull = (valeur) => valeur || null;

/** Haut d'axe « rond » pour les graphiques : 1, 2, 2,5, 5 ou 10 × une puissance de 10. */
export function niceMax(valeur) {
  if (valeur <= 0) return 1;
  const puissance = 10 ** Math.floor(Math.log10(valeur));
  return [1, 2, 2.5, 5, 10].map((palier) => palier * puissance).find((palier) => palier >= valeur);
}
