// Apiviz — écrans du domaine finances (IT-03).
// Entre associés (v5.29) : installé ici ; ses compléments sont appelés par les écrans vente, Gestion et Réglages.
import { installer } from "./entre-associes.js";

installer();
import { actions as actionsAchat, remplace as remplaceAchat } from "./achat.js";

export default [
  // Dépenses : app.js, complétées par ergonomie.js (chiffres et filtre par poste).
  // « Ajouter une dépense » ouvre l'achat en plusieurs lignes (v5.30, achat.js), déclaré ici.
  { id: "compta", titre: "Dépenses", rubrique: "plus", rendu: () => { viewCompta(); ER.completerDepenses(); }, actions: actionsAchat, remplace: remplaceAchat },
  // Bilan : app.js (la comparaison avec l'année précédente vient d'ux.js par pilotFin).
  { id: "pilotage", titre: "Bilan", rubrique: "plus", rendu: () => viewPilotage() },
  // Prévisions et budget : app.js, migré sans changement.
  { id: "previsions", titre: "Prévisions", rubrique: "plus", rendu: () => viewPrevisions() },
];
