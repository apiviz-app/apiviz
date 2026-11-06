// Apidoo — table des écrans (IT-03, AP-FEAT-002).
// Chaque écran est enregistré une seule fois : { id, titre, rubrique, rendu }. render() d'app.js consulte cette table
// (seule liste des écrans depuis la fin d'IT-03 ; le drapeau ?ancien=1 de la transition a été retiré).

const ecrans = new Map();

/** Enregistre un écran. Un identifiant ne peut être enregistré qu'une fois : pas de surcharge possible. */
export function enregistrer(def) {
  if (!def || typeof def.id !== "string" || typeof def.rendu !== "function") throw new Error("Écran mal décrit : id et rendu sont obligatoires");
  if (ecrans.has(def.id)) throw new Error(`L'écran « ${def.id} » est déjà enregistré`);
  ecrans.set(def.id, Object.freeze({ titre: "", rubrique: "", ...def }));
}

/** L'écran enregistré pour cette route, ou null. */
export const ecran = (id) => ecrans.get(id) || null;
/** Identifiants enregistrés, dans l'ordre d'enregistrement. */
export const liste = () => [...ecrans.keys()];

/** Pour les tests unitaires seulement. */
export function _reinitialiser() { ecrans.clear(); }
