// Apidoo — écrans du domaine production (IT-03).
export default [
  // Stock de miel : app.js, complété par nav4.js (récoltes) puis par essentiels.js (fiche de lot, étiquettes).
  { id: "miel", titre: "Miel", rubrique: "ventes", rendu: () => { viewMiel(); N4.completerMiel(); ES.completerMiel(); } },
  // Fiche de lot : essentiels.js, migrée sans changement.
  { id: "lot", titre: "Lot", rubrique: "miel", rendu: () => ES.VUES.lot() },
  // Récolte et traçabilité : v3.js, migrée sans changement.
  { id: "recolte", titre: "Récolte", rubrique: "miel", rendu: () => V3.vues.recolte() },
];
