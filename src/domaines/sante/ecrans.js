// Apiviz — écrans du domaine santé (IT-03 ; IT-12, migration 036 : maquette « IT-12 Santé : varroa et observations
// sanitaires » du 23 nov. 2026). Chaque écran est défini ici une seule fois ; ses actions sont déclarées avec lui.
//   - « varroa » : Ruchers › Santé, bascule Comptages / Seuils (ecran.js). Remplace V3.vues.varroa (v3.js), qui n'est
//     plus appelé. Le seuil se règle dans l'onglet lui-même (plus de feuille « Seuil d'alerte varroa » dans ⋯).
//   - « comptage » : Compter le rucher, écran de saisie pas à pas (comptage.js).
//   - « signalement » : Aide au signalement d'un signe noté (signes.js) ; la feuille « Noter un signe » est une action.
import { ecran as ecranSante, actions as actionsSante } from "./ecran.js";
import { ecran as ecranComptage, actions as actionsComptage } from "./comptage.js";
import { ecranSignalement, actions as actionsSignes } from "./signes.js";

export default [
  { id: "varroa", titre: "Santé", rubrique: "ruches", rendu: () => ecranSante(), actions: { ...actionsSante, ...actionsSignes } },
  { id: "comptage", titre: "Compter le rucher", rubrique: "ruches", rendu: () => ecranComptage(), actions: actionsComptage },
  { id: "signalement", titre: "Aide au signalement", rubrique: "ruches", rendu: () => ecranSignalement() },
];

// Rubrique de la barre du bas : Ruches allumé pendant un comptage ou l'aide au signalement.
if (typeof GROUP != "undefined") Object.assign(GROUP, { comptage: "ruches", signalement: "ruches" });
