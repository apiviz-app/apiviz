// Apiviz — écrans du domaine ventes (IT-03).
import { completerSaisieVente } from "./saisie.js";
import { completerClients as clientsTableau, actions as actionsClients } from "./clients-tableau.js";
import { completerVente as associesVente } from "../finances/entre-associes.js";
import { ecran as ecranCaisse, actions as actionsCaisse } from "./caisse.js";
import { ecran as ecranCommandes, actions as actionsCommandes } from "./commandes.js";
import { completerVitrine, actions as actionsVitrine } from "./vitrine.js";
import { completerPourQui, actions as actionsPourQui } from "./pour-qui.js";
import { installer as installerFiche, actions as actionsFiche } from "./fiche-client.js";

// v5.66 : fiche client (initiales, puces, adresses proposées, goûts, « prévenir »), à la place de clientForm() d'app.js.
installerFiche();

// Outils de terrain (v5.57) : « Caisse du marché » dans les actions de Miel (le gabarit la range dans ⋯).
const versCaisse = () => {
  if (document.documentElement.classList.contains("lecteur")) return;
  document.querySelector(".wrap > .head > .actions")?.insertAdjacentHTML("beforeend", '<button type="button" class="btn" data-act="cscaisse">Caisse du marché</button>');
};
export default [
  // Clients et ventes : ux.js (cartes, reçu, relance), complété par Alvéoles (pots par format).
  // v5.38 : l'onglet Clients en tableau ou en liste, avec étiquettes (clients-tableau.js).
  // v5.66 : la vitrine des produits (vitrine.js) remplace le grand pot d'Alvéoles ; plus besoin d'un client pour l'afficher.
  { id: "clients", titre: "Ventes", rubrique: "ventes", rendu: () => { UX.ecrans.clients(); AL.completerClients(); completerVitrine(); clientsTableau(); versCaisse(); }, actions: { ...actionsClients, ...actionsCaisse, ...actionsVitrine, ...actionsFiche } },
  // Nouvelle vente : app.js, complétée par v3.js (remise, livraison), par Alvéoles (clients récents), puis par
  // entre-associes.js (v5.29 : vendu par, argent récolté par), puis par saisie.js (v5.26, maquettes : barre
  // d'enregistrement fixe avec le total, stock restant, compteurs qui rebondissent).
  // v5.66 : puis par pour-qui.js (le client se choisit dans la feuille « Pour qui ? », avec recherche ; vente sans client).
  { id: "vente", titre: "Nouvelle vente", rubrique: "ventes", rendu: () => { viewVente(); V3.completerVente(); AL.completerVente(); associesVente(); completerSaisieVente(); completerPourQui(); }, actions: actionsPourQui },
  // Facture : essentiels.js, migrée sans changement.
  { id: "facture", titre: "Facture", rubrique: "clients", rendu: () => ES.VUES.facture() },
  // Caisse du marché (v5.57) : un toucher par pot, total, mode de paiement, vente gardée sans réseau.
  { id: "caisse", titre: "Caisse du marché", rubrique: "clients", rendu: () => ecranCaisse() },
  // Commandes en ligne (v5.57, migration 027) : la page de commande des clients et les commandes reçues.
  { id: "commandes", titre: "Commandes", rubrique: "clients", rendu: () => ecranCommandes(), actions: actionsCommandes },
];
