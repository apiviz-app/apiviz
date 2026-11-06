// Apidoo — table des écrans (IT-03, AP-FEAT-002).
// Chaque écran est enregistré une seule fois : { id, titre, rubrique, rendu }. render() d'app.js consulte cette table
// avant son ancienne liste ; un écran non enregistré garde l'ancien chemin (transition « étrangleur », doc 03 §3).
// Drapeau ?ancien=1 (gardé pour l'onglet en cours) : la table est ignorée, l'ancien chemin sert partout.
// Le drapeau et l'ancien chemin disparaissent à la fin d'IT-03.

const ecrans = new Map();

/** Enregistre un écran. Un identifiant ne peut être enregistré qu'une fois : pas de surcharge possible. */
export function enregistrer(def) {
  if (!def || typeof def.id !== "string" || typeof def.rendu !== "function") throw new Error("Écran mal décrit : id et rendu sont obligatoires");
  if (ecrans.has(def.id)) throw new Error(`L'écran « ${def.id} » est déjà enregistré`);
  ecrans.set(def.id, Object.freeze({ titre: "", rubrique: "", ...def }));
}

let drapeau = null;
/** Vrai si l'application est ouverte avec ?ancien=1 (ou l'a été depuis l'ouverture de l'onglet). */
export function ancien(recherche = globalThis.location?.search || "", memoire = globalThis.sessionStorage) {
  if (drapeau !== null) return drapeau;
  const q = new URLSearchParams(recherche).get("ancien");
  try {
    if (q !== null) memoire.setItem("apidoo-ancien", q === "1" ? "1" : "");
    drapeau = memoire.getItem("apidoo-ancien") === "1";
  } catch {
    drapeau = q === "1";
  }
  return drapeau;
}

/** L'écran enregistré pour cette route, ou null (route inconnue, ou drapeau ?ancien=1). */
export const ecran = (id) => (ancien() ? null : ecrans.get(id) || null);
/** L'écran enregistré, même avec ?ancien=1 : pour les routes qui n'ont pas d'ancienne chaîne. */
export const ecranEnregistre = (id) => ecrans.get(id) || null;
/** Identifiants enregistrés, dans l'ordre d'enregistrement. */
export const liste = () => [...ecrans.keys()];

/** Pour les tests unitaires seulement. */
export function _reinitialiser() { ecrans.clear(); drapeau = null; }
