// Apiviz — crochets du rendu et de la coquille (IT-03, AP-FEAT-002).
// Remplacent les surcharges en chaîne de window.render et window.shell : chaque module déclare ce qu'il fait
// avant ou après, sous un nom, et render() / shell() d'app.js les appellent dans un ordre fixe et lisible.
//
// Ordre (le même que celui des anciennes chaînes, où le dernier script chargé enveloppait les précédents) :
//   - « avant… » : du dernier module chargé au premier ;
//   - « après… » : du premier module chargé au dernier.
// Moments :
//   avantRendu()        renvoie true pour arrêter le rendu (ex. squelette de chargement) ; les « après » tournent quand même
//   apresRendu()
//   avantCoquille(args) peut modifier les arguments de shell(titre, sous-titre, actions, contenu, surtitre) et les renvoyer
//   apresCoquille(args)

const MOMENTS = ["avantRendu", "apresRendu", "avantCoquille", "apresCoquille"];
const listes = Object.fromEntries(MOMENTS.map((m) => [m, []]));

/** Déclare un crochet. Un même nom ne peut être déclaré qu'une fois par moment. */
export function sur(moment, nom, fn) {
  const l = listes[moment];
  if (!l) throw new Error(`Moment inconnu : « ${moment} »`);
  if (typeof fn !== "function") throw new Error(`Crochet « ${nom} » : une fonction est attendue`);
  if (l.some((c) => c.nom === nom)) throw new Error(`Crochet « ${nom} » déjà déclaré pour « ${moment} »`);
  l.push({ nom, fn });
}

const ordre = (moment) => (moment.startsWith("avant") ? [...listes[moment]].reverse() : listes[moment]);

/** Lance les crochets du rendu. Pour avantRendu : vrai si l'un d'eux a arrêté le rendu. */
export function lancer(moment, ...args) {
  for (const c of ordre(moment)) if (c.fn(...args) === true && moment === "avantRendu") return true;
  return false;
}

/** Crochets de la coquille : avantCoquille transforme les arguments, apresCoquille les reçoit. */
export function coquille(moment, args) {
  let a = args;
  for (const c of ordre(moment)) {
    const r = c.fn(a);
    if (moment === "avantCoquille" && Array.isArray(r)) a = r;
  }
  return a;
}

/** Noms déclarés, dans l'ordre d'appel : pour la documentation et les tests. */
export const noms = (moment) => ordre(moment).map((c) => c.nom);
export function _reinitialiser() { MOMENTS.forEach((m) => (listes[m].length = 0)); }
