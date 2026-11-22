// Apiviz — ordre de passage d'une tournée (IT-10, AP-FEAT-041, migration 034). Règles pures, sans DOM ni réseau.
// Deux ordres : « pose » (la place de chaque colonie dans le rucher, pour ne pas marcher pour rien) et « priorite »
// (les critiques d'abord, puis à surveiller, puis les moins récemment vues : l'ordre de la tournée v5.11).
// Testées par tests/unitaires/ordre-tournee.test.mjs. Lues par tournee.js via window.Regles.tournee.

export const ORDRES = { pose: "Ordre de pose", priorite: "Priorité" };

/** 0 critique, 1 à surveiller, 2 en forme (état de la colonie, comme les puces de la tournée). */
export const niveau = (r) => (r?.etat === "Critique" ? 0 : r?.etat === "À surveiller" ? 1 : 2);

/** Une colonie demande de l'attention : elle est signalée dans la tournée, quel que soit l'ordre choisi. */
export const prioritaire = (r) => niveau(r) < 2;

const nomCompare = (a, b) => String(a?.nom || "").localeCompare(String(b?.nom || ""), "fr", { numeric: true });
const pose = (r) => (Number.isInteger(r?.ordre_pose) && r.ordre_pose > 0 ? r.ordre_pose : Infinity);

/** Ordre de pose : la place notée d'abord ; les colonies pas encore rangées après, par nom (« Ruche 2 » avant « Ruche 10 »). */
export function comparerPose(a, b) {
  const pa = pose(a), pb = pose(b);
  return pa !== pb ? (pa < pb ? -1 : 1) : nomCompare(a, b);
}

/**
 * Les identifiants dans l'ordre demandé.
 * @param ids     colonies de la tournée
 * @param ruches  colonies de l'exploitation (id, nom, etat, ordre_pose)
 * @param ordre   « pose » ou « priorite »
 * @param derniere (id) → date de la dernière visite (« 2026-11-04 ») ou "" si jamais visitée
 */
export function ordonner(ids, ruches, ordre = "priorite", derniere = () => "") {
  const par = new Map((ruches || []).map((r) => [r.id, r]));
  const r = (id) => par.get(id) || { id };
  return [...ids].sort((a, b) => {
    if (ordre === "pose") return comparerPose(r(a), r(b));
    return niveau(r(a)) - niveau(r(b)) || String(derniere(a) || "").localeCompare(String(derniere(b) || "")) || comparerPose(r(a), r(b));
  });
}

/** Ordre proposé à l'ouverture : la pose dès qu'une colonie du rucher est rangée, sinon la priorité (comme avant). */
export function ordreParDefaut(ids, ruches, choisi) {
  if (choisi === "pose" || choisi === "priorite") return choisi;
  const par = new Map((ruches || []).map((r) => [r.id, r]));
  return ids.some((id) => Number.isFinite(pose(par.get(id)))) ? "pose" : "priorite";
}

/** Déplace l'élément i à la place j (glisser une ligne, ou ↑ ↓). Rend une nouvelle liste. */
export function deplacer(liste, i, j) {
  const l = [...liste];
  if (i < 0 || i >= l.length || j < 0 || j >= l.length || i === j) return l;
  const [x] = l.splice(i, 1);
  l.splice(j, 0, x);
  return l;
}

/** Les colonies d'un rucher dans l'ordre de pose actuel, pour l'écran « Ordre de pose ». */
export const rangees = (ruches) => [...(ruches || [])].sort(comparerPose);
