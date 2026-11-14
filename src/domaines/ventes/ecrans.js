// Apiviz — écrans du domaine ventes (IT-03).
import { completerSaisieVente } from "./saisie.js";
import { completerClients as clientsTableau, actions as actionsClients } from "./clients-tableau.js";
import { completerVente as associesVente } from "../finances/entre-associes.js";
export default [
  // Clients et ventes : ux.js (cartes, reçu, relance), complété par Alvéoles (pots par format).
  // v5.38 : l'onglet Clients en tableau ou en liste, avec étiquettes (clients-tableau.js).
  { id: "clients", titre: "Ventes", rubrique: "ventes", rendu: () => { UX.ecrans.clients(); AL.completerClients(); clientsTableau(); }, actions: actionsClients },
  // Nouvelle vente : app.js, complétée par v3.js (remise, livraison), par Alvéoles (clients récents), puis par
  // entre-associes.js (v5.29 : vendu par, argent récolté par), puis par saisie.js (v5.26, maquettes : barre
  // d'enregistrement fixe avec le total, stock restant, compteurs qui rebondissent).
  { id: "vente", titre: "Nouvelle vente", rubrique: "ventes", rendu: () => { viewVente(); V3.completerVente(); AL.completerVente(); associesVente(); completerSaisieVente(); } },
  // Facture : essentiels.js, migrée sans changement.
  { id: "facture", titre: "Facture", rubrique: "clients", rendu: () => ES.VUES.facture() },
];
