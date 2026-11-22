// Apiviz — actions groupées sur plusieurs colonies (IT-10, AP-FEAT-042, migration 034). Règles pures.
// Une action (+1 hausse, état, tâche) est préparée ici, montrée tout de suite à l'écran, puis envoyée après 5 s si
// personne n'a touché « Annuler ». L'envoi passe par la file d'envoi (appliquer_action_groupee) : sans réseau, elle
// part au retour du réseau, et son identifiant empêche qu'elle soit appliquée deux fois.
// Testées par tests/unitaires/groupe.test.mjs. Lues par vue-tableau.js.

export const DELAI_ANNULER_MS = 5000;
export const ACTIONS = { hausse: "Poser une hausse", etat: "Changer l'état", tache: "Ajouter une tâche" };
export const ETATS = ["Bonne", "À surveiller", "Critique"];

const pluriel = (n, un, plusieurs = un + "s") => `${n} ${n > 1 ? plusieurs : un}`;

/** Erreur en français si l'action n'est pas complète ; "" sinon. */
export function verifier(action, ids, valeur = {}) {
  if (!Array.isArray(ids) || !ids.length) return "Choisis au moins une colonie.";
  if (ids.length > 500) return "Pas plus de 500 colonies à la fois.";
  if (action === "hausse") return Number.isInteger(valeur.delta ?? 1) && (valeur.delta ?? 1) !== 0 ? "" : "Indique combien de hausses poser.";
  if (action === "etat") return ETATS.includes(valeur.etat) ? "" : "Choisis un état.";
  if (action === "tache") return String(valeur.titre || "").trim() ? "" : "Indique la tâche à faire.";
  return "Action inconnue.";
}

/** Ce qu'on envoie à appliquer_action_groupee. L'identifiant vient de l'appelant (crypto.randomUUID()). */
export function preparer(id, action, ids, valeur = {}) {
  const v = action === "hausse" ? { delta: valeur.delta ?? 1 }
    : action === "etat" ? { etat: valeur.etat }
    : { titre: String(valeur.titre || "").trim().slice(0, 200), ...(valeur.echeance ? { echeance: valeur.echeance } : {}) };
  return { id, action, ruches: [...new Set(ids)], valeur: v };
}

/** Le message du toast : « Hausse posée sur 10 colonies. » */
export function message(p) {
  const n = p.ruches.length, sur = `sur ${pluriel(n, "colonie")}`;
  if (p.action === "hausse") {
    const d = p.valeur.delta;
    return d > 0 ? `${d > 1 ? `${d} hausses posées` : "Hausse posée"} ${sur}.` : `${pluriel(-d, "hausse")} retirée${-d > 1 ? "s" : ""} ${sur}.`;
  }
  if (p.action === "etat") return `État « ${p.valeur.etat} » ${sur}.`;
  return `Tâche « ${p.valeur.titre} » ajoutée ${sur}.`;
}

/**
 * Ce que l'action change sur les colonies affichées, pour le montrer avant l'envoi, et de quoi revenir en arrière.
 * Rend { apres: [{ id, champs }], avant: [{ id, champs }] } ; une tâche ne change pas la colonie (rien à montrer).
 */
export function effet(ruches, p) {
  const par = new Map((ruches || []).map((r) => [r.id, r]));
  const apres = [], avant = [];
  for (const id of p.ruches) {
    const r = par.get(id);
    if (!r) continue;
    if (p.action === "hausse") {
      apres.push({ id, champs: { hausses: Math.max((r.hausses || 0) + p.valeur.delta, 0) } });
      avant.push({ id, champs: { hausses: r.hausses || 0 } });
    } else if (p.action === "etat") {
      apres.push({ id, champs: { etat: p.valeur.etat } });
      avant.push({ id, champs: { etat: r.etat } });
    }
  }
  return { apres, avant };
}

/**
 * Une saisie d'IT-10 encore dans la file d'envoi, ajoutée aux données affichées (offline.js), comme le fera la base :
 * appliquer_action_groupee, ranger_ruches ou noter_etiquettes (migration 034).
 */
export function appliquerEnAttente(d, nom, p) {
  const ruches = d?.ruches || [];
  if (nom === "appliquer_action_groupee") {
    if (p.action === "tache") {
      d.taches = d.taches || [];
      p.ruches.forEach((r, i) => {
        const id = `${p.id}-${i}`;
        if (!d.taches.some((t) => t.id === id)) d.taches.push({ id, titre: p.valeur.titre, echeance: p.valeur.echeance || null, ruche_id: r, assigne: "", faite: false, faite_le: null, _attente: true });
      });
    } else appliquer(ruches, effet(ruches, p).apres);
  } else if (nom === "ranger_ruches") {
    appliquer(ruches, (p.ruches || []).map((id, i) => ({ id, champs: { ordre_pose: i + 1 } })));
  } else if (nom === "noter_etiquettes") {
    appliquer(ruches, (p.ruches || []).map((id) => ({ id, champs: { etiquette_imprimee_le: p.date || new Date().toISOString().slice(0, 10) } })));
  }
  return d;
}

/** Libellé d'une saisie en attente, pour la liste « À envoyer ». */
export function libelleEnAttente(nom, p) {
  const n = (p.ruches || []).length, col = `${n} colonie${n > 1 ? "s" : ""}`;
  if (nom === "appliquer_action_groupee") return [`${ACTIONS[p.action] || "Action groupée"} · ${col}`, message(p).replace(/\.$/, "").toLowerCase()];
  if (nom === "ranger_ruches") return ["Ordre de pose", col + " rangées"];
  return ["Étiquettes QR", col + " imprimées"];
}

/** Applique une liste { id, champs } aux colonies (en place), comme le fait l'écran. */
export function appliquer(ruches, changements) {
  const par = new Map((ruches || []).map((r) => [r.id, r]));
  for (const c of changements) { const r = par.get(c.id); if (r) Object.assign(r, c.champs); }
  return ruches;
}
