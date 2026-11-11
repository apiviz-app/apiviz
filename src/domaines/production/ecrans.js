// Apiviz — écrans du domaine production (IT-03).
import { ecran as ecranMiseEnPots, actions as actionsMiseEnPots, remplace as remplaceMiseEnPots } from "./mise-en-pots.js";
import { completerLot } from "./lot.js";

export default [
  // Stock de miel : app.js, complété par nav4.js (récoltes) puis par essentiels.js (fiche de lot, étiquettes).
  // « Nouveau lot » ouvre la mise en pots (v5.30), déclarée ci-dessous.
  { id: "miel", titre: "Miel", rubrique: "ventes", rendu: () => { viewMiel(); N4.completerMiel(); ES.completerMiel(); } },
  // Fiche de lot : essentiels.js, complétée par lot.js (v5.30 : « D'où vient ce pot », récolte, achats, mise en pots, ventes).
  { id: "lot", titre: "Lot", rubrique: "miel", rendu: () => { ES.VUES.lot(); completerLot(); } },
  // Récolte et traçabilité : v3.js, migrée sans changement.
  { id: "recolte", titre: "Récolte", rubrique: "miel", rendu: () => V3.vues.recolte() },
  // Mise en pots (v5.30, migration 018) : pots vides, couvercles, étiquettes et miel deviennent un lot de pots de miel.
  { id: "miseenpots", titre: "Mise en pots", rubrique: "miel", rendu: ecranMiseEnPots, actions: actionsMiseEnPots, remplace: remplaceMiseEnPots },
];
