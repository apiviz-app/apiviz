// Apiviz — écrans transversaux : gestion, réglages, membres, activité, recherche (IT-03).
import { completerReglages, actions as actionsReglages, remplace } from "./apparence.js";
export default [
  // Gestion (route « plus ») : ergonomie.js (blocs), seule implémentation encore utilisée.
  { id: "plus", titre: "Gestion", rubrique: "plus", rendu: () => ER.ecranGestion() },
  // Réglages : essentiels.js (blocs), qui reprend le formulaire d'app.js quand on l'ouvre, complété par apparence.js
  // (v5.28 : bloc « Toi » pour le prénom, couleur du bandeau choisie avec un aperçu).
  { id: "reglages", titre: "Réglages", rubrique: "plus", rendu: () => { ES.ecranReglages(); completerReglages(); }, actions: actionsReglages, remplace },
  // Exploitation et membres : exploitations.js.
  { id: "membres", titre: "Exploitation et membres", rubrique: "plus", rendu: () => EX.vue() },
  // Activité récente et recherche : v3.js.
  { id: "activite", titre: "Activité récente", rubrique: "plus", rendu: () => V3.vues.activite() },
  { id: "recherche", titre: "Rechercher", rubrique: "plus", rendu: () => V3.vues.recherche() },
];
