// Apiviz — écrans transversaux : gestion, réglages, membres, activité, recherche (IT-03).
import { completerReglages, actions as actionsReglages, remplace } from "./apparence.js";
import { completerGestion, completerReglages as associesReglages, actions as actionsAssocies } from "../finances/entre-associes.js";
export default [
  // Gestion (route « plus ») : ergonomie.js (blocs), complétée par la carte « Entre associés » (v5.29).
  { id: "plus", titre: "Gestion", rubrique: "plus", rendu: () => { ER.ecranGestion(); completerGestion(); }, actions: actionsAssocies },
  // Réglages : essentiels.js (blocs), qui reprend le formulaire d'app.js quand on l'ouvre, complété par apparence.js
  // (v5.28 : bloc « Toi » pour le prénom, couleur du bandeau choisie avec un aperçu).
  { id: "reglages", titre: "Réglages", rubrique: "plus", rendu: () => { ES.ecranReglages(); completerReglages(); associesReglages(); }, actions: actionsReglages, remplace },
  // Exploitation et membres : exploitations.js.
  { id: "membres", titre: "Exploitation et membres", rubrique: "plus", rendu: () => EX.vue() },
  // Activité récente et recherche : v3.js.
  { id: "activite", titre: "Activité récente", rubrique: "plus", rendu: () => V3.vues.activite() },
  { id: "recherche", titre: "Rechercher", rubrique: "plus", rendu: () => V3.vues.recherche() },
];
