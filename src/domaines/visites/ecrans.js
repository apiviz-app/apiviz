// Apiviz — écrans du domaine visites (IT-03).
import { completerSaisieVisite } from "../ventes/saisie.js";
import { ecran as ecranExpress, actions as actionsExpress, completerVisite as basculeVisite } from "./express.js";
import { installer as installerBrouillon, noterDepart, actions as actionsBrouillon } from "./brouillon.js";
import { actions as actionsCorriger } from "./corriger.js";

// Brouillon de visite persistant (v5.49, AP-FEAT-040) : garde à chaque saisie, pont window.VB pour les anciens scripts.
installerBrouillon();
export default [
  // Formulaire de visite : ux.js (sections repliables), complété par la visite à la voix (voix.js), puis par
  // ventes/saisie.js (v5.26 : stock restant et compteurs qui rebondissent, comme dans la vente).
  // v5.49 : noterDepart() retient l'état d'ouverture (pas de brouillon tant que rien n'est saisi).
  // Gestes « Reprendre » et « Oublier » de la carte de l'accueil (brouillon.js) déclarés ici, avec la visite.
  // IT-09 : « Corriger » une visite déjà enregistrée (corriger.js), y compris sans réseau ; déclarée avec la visite.
  { id: "visite", titre: "Nouvelle visite", rubrique: "ruches", rendu: (...a) => { UX.ecrans.visite(...a); VX.completerVisite(...a); completerSaisieVisite(); basculeVisite(); noterDepart(); },
    actions: { ...actionsBrouillon, ...actionsCorriger } },
  // Tournée en parcours : tournee.js, migrée sans changement.
  { id: "tournee", titre: "Tournée", rubrique: "ruches", rendu: () => TN.vue() },
  // Visite express (v5.32, AP-FEAT-037, migration 020) : reprend la visite précédente, on ne touche que ce qui change.
  // Ouverte depuis la fiche d'une ruche (bouton ajouté par express.js, completerFiche).
  { id: "visiteexpress", titre: "Visite express", rubrique: "ruches", rendu: ecranExpress, actions: actionsExpress },
];
