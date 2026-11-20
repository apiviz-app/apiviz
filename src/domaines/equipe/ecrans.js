// Apiviz — écrans de l'équipe et de la saison (v5.61, maquettes « Nouveautés » 5 et 7 validées le 17 nov. 2026).
// L'onglet « Courbes » de la fiche d'une ruche (maquette 6) est dans src/domaines/colonies/courbes.js.
import { ecran as ecranFil, actions as actionsFil } from "./fil.js";
import { ecran as ecranSaison, ecranBilan, actions as actionsSaison } from "./saison.js";

export default [
  // Fil de l'équipe : ce que chacun a saisi, notes, demandes « @Prénom » qui deviennent des tâches (migration 030).
  { id: "fil", titre: "Fil de l’équipe", rubrique: "plus", rendu: () => ecranFil(), actions: actionsFil },
  // Ma saison (v5.69) : la saison en cours en un écran — phase et frise, priorité d'API, quatre chiffres et leurs
  // aperçus, raccourcis. Le bilan de l'année (v5.61 : kilos, pots, argent, kilos par ruche, ce qu'API retient,
  // partager ou imprimer) s'ouvre depuis le raccourci « Bilan ».
  { id: "masaison", titre: "Ma saison", rubrique: "clients", rendu: () => ecranSaison(), actions: actionsSaison },
  { id: "msbilan", titre: "Bilan de la saison", rubrique: "clients", rendu: () => ecranBilan() }, // ses gestes sont déclarés avec « masaison »
];
