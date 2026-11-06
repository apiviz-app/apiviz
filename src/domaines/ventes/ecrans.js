// Apidoo — écrans du domaine ventes (IT-03).
export default [
  // Clients et ventes : ux.js (cartes, reçu, relance), complété par Alvéoles (pots par format).
  { id: "clients", titre: "Ventes", rubrique: "ventes", rendu: () => { UX.ecrans.clients(); AL.completerClients(); } },
  // Nouvelle vente : app.js, complétée par v3.js (remise, livraison) puis par Alvéoles (clients récents).
  { id: "vente", titre: "Nouvelle vente", rubrique: "ventes", rendu: () => { viewVente(); V3.completerVente(); AL.completerVente(); } },
  // Facture : essentiels.js, migrée sans changement.
  { id: "facture", titre: "Facture", rubrique: "clients", rendu: () => ES.VUES.facture() },
];
