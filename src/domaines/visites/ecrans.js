// Apiviz — écrans du domaine visites (IT-03).
import { completerSaisieVisite } from "../ventes/saisie.js";
import { ecran as ecranExpress, actions as actionsExpress } from "./express.js";
export default [
  // Formulaire de visite : ux.js (sections repliables), complété par la visite à la voix (voix.js), puis par
  // ventes/saisie.js (v5.26 : stock restant et compteurs qui rebondissent, comme dans la vente).
  { id: "visite", titre: "Nouvelle visite", rubrique: "ruches", rendu: (...a) => { UX.ecrans.visite(...a); VX.completerVisite(...a); completerSaisieVisite(); } },
  // Tournée en parcours : tournee.js, migrée sans changement.
  { id: "tournee", titre: "Tournée", rubrique: "ruches", rendu: () => TN.vue() },
  // Visite express (v5.32, AP-FEAT-037, migration 020) : reprend la visite précédente, on ne touche que ce qui change.
  // Ouverte depuis la fiche d'une ruche (bouton ajouté par express.js, completerFiche).
  { id: "visiteexpress", titre: "Visite express", rubrique: "ruches", rendu: ecranExpress, actions: actionsExpress },
];
