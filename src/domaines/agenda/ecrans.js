// Apiviz — écrans du domaine agenda (IT-03), migrés sans changement.
// v5.80 : « Préparer ma sortie » (sortie.js), ouvert depuis l'Agenda.
import { ecran as ecranSortie, completerAgenda, actions as actionsSortie } from "./sortie.js";
export default [
  // Agenda et tâches : app.js.
  { id: "agenda", titre: "Agenda", rubrique: "plus", rendu: () => { viewAgenda(); completerAgenda(); } },
  { id: "sortie", titre: "Préparer ma sortie", rubrique: "plus", rendu: () => ecranSortie(), actions: actionsSortie },
  // Rappels et conseils du mois : essentiels.js.
  { id: "rappels", titre: "Rappels", rubrique: "dash", rendu: () => ES.VUES.rappels() },
  { id: "saison", titre: "Ce mois-ci", rubrique: "dash", rendu: () => ES.VUES.saison() },
];
