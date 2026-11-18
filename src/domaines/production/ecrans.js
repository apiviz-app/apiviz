// Apiviz — écrans du domaine production (IT-03).
import { ecran as ecranMiseEnPots, actions as actionsMiseEnPots, remplace as remplaceMiseEnPots } from "./mise-en-pots.js";
import { completerLot } from "./lot.js";
import { ecran as ecranProduit, actions as actionsProduit, remplace as remplaceProduit, completerStock } from "./produit.js";
import { ecran as ecranRecoltes, actions as actionsRecoltes } from "./recoltes.js";
import { ecran as ecranRecolte, actions as actionsRecolte, remplace as remplaceRecolte } from "./recolte.js";

export default [
  // Stock de miel : app.js, complété par nav4.js (récoltes) puis par essentiels.js (fiche de lot, étiquettes).
  // « Nouveau lot » ouvre la mise en pots (v5.30), déclarée ci-dessous.
  // v5.65 (migration 032) : les produits par catégorie et « Ajouter un produit » (produit.js), avant le tableau des lots.
  // v5.66 : les récoltes (N4.completerMiel) passent dans l'onglet Récoltes, déclaré ci-dessous.
  { id: "miel", titre: "Produits", rubrique: "ventes", rendu: () => { viewMiel(); ES.completerMiel(); completerStock(); } },
  // Récoltes (v5.66, maquette du 18 nov. 2026) : saison, miel à mettre en pots, récoltes et productions, clients à prévenir.
  { id: "recoltes", titre: "Produits", rubrique: "ventes", rendu: ecranRecoltes, actions: actionsRecoltes },
  // Fiche de lot : essentiels.js, complétée par lot.js (v5.30 : « D'où vient ce pot », récolte, achats, mise en pots, ventes).
  { id: "lot", titre: "Lot", rubrique: "miel", rendu: () => { ES.VUES.lot(); completerLot(); } },
  // Récolte et traçabilité : v3.js, migrée sans changement.
  // v5.66 : affichage en deux étapes (recolte.js : ruches en alvéoles et poids, puis mise en pots) ; l'enregistrement
  // reste celui de v3.js (formulaire « v3recolte »).
  { id: "recolte", titre: "Récolte", rubrique: "miel", rendu: ecranRecolte, actions: actionsRecolte, remplace: remplaceRecolte },
  // Mise en pots (v5.30, migration 018) : pots vides, couvercles, étiquettes et miel deviennent un lot de pots de miel.
  { id: "miseenpots", titre: "Mise en pots", rubrique: "miel", rendu: ecranMiseEnPots, actions: actionsMiseEnPots, remplace: remplaceMiseEnPots },
  // Produit (v5.65, migration 032) : hydromel, cire, bougies… créés ou modifiés sans passer par la mise en pots.
  { id: "produit", titre: "Produit", rubrique: "miel", rendu: ecranProduit, actions: actionsProduit, remplace: remplaceProduit },
];
