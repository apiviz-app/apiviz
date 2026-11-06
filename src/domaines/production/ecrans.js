// Apidoo — écrans du domaine production (IT-03), migrés sans changement.
export default [
  // Fiche de lot : essentiels.js.
  { id: "lot", titre: "Lot", rubrique: "miel", rendu: () => ES.VUES.lot() },
  // Récolte et traçabilité : v3.js.
  { id: "recolte", titre: "Récolte", rubrique: "miel", rendu: () => V3.vues.recolte() },
];
