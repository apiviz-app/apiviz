// Apiviz — écrans du domaine ventes (IT-03).
import { completerSaisieVente } from "./saisie.js";
export default [
  // Clients et ventes : ux.js (cartes, reçu, relance), complété par Alvéoles (pots par format).
  { id: "clients", titre: "Ventes", rubrique: "ventes", rendu: () => { UX.ecrans.clients(); AL.completerClients(); } },
  // Nouvelle vente : app.js, complétée par v3.js (remise, livraison), par Alvéoles (clients récents), puis par
  // saisie.js (v5.26, maquettes : barre d'enregistrement fixe avec le total, stock restant, compteurs qui rebondissent).
  { id: "vente", titre: "Nouvelle vente", rubrique: "ventes", rendu: () => { viewVente(); V3.completerVente(); AL.completerVente(); completerSaisieVente(); } },
  // Facture : essentiels.js, migrée sans changement.
  { id: "facture", titre: "Facture", rubrique: "clients", rendu: () => ES.VUES.facture() },
];
