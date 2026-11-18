// Apiviz — écrans de l'équipe et de la saison (v5.59, maquettes « Nouveautés » 5 et 7 validées le 17 nov. 2026).
// L'onglet « Courbes » de la fiche d'une ruche (maquette 6) est dans src/domaines/colonies/courbes.js.
import { ecran as ecranFil, actions as actionsFil } from "./fil.js";
import { ecran as ecranSaison, actions as actionsSaison } from "./saison.js";

export default [
  // Fil de l'équipe : ce que chacun a saisi, notes, demandes « @Prénom » qui deviennent des tâches (migration 029).
  { id: "fil", titre: "Fil de l’équipe", rubrique: "plus", rendu: () => ecranFil(), actions: actionsFil },
  // Ma saison : kilos, pots vendus, argent, kilos par ruche, ce qu'API retient ; partager ou imprimer.
  { id: "masaison", titre: "Ma saison", rubrique: "clients", rendu: () => ecranSaison(), actions: actionsSaison },
];
