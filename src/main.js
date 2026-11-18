// Apiviz — démarrage du noyau (IT-03, AP-FEAT-002). Chargé en dernier (module, après tous les scripts « defer »).
// Ajoute la table des écrans à window.Noyau (créé par src/passerelle.js) et enregistre les écrans migrés.
// render() d'app.js affiche Noyau.ecran(route).
import * as routeur from "./noyau/routeur.js";
import * as actions from "./noyau/actions.js";
import { ecrans } from "./domaines/index.js";
import * as choisir from "./noyau/choisir.js";
import * as gabarit from "./noyau/gabarit.js";
import { nbAVoir } from "./domaines/ruchers/vue-tableau.js";
import * as historique from "./noyau/historique.js";

for (const def of ecrans) {
  routeur.enregistrer(def);
  // Actions déclarées par l'écran (IT-05) : une seule déclaration, contrôlée par noyau/actions.js.
  if (def.actions) actions.enregistrerActions(ACT, def.id, def.actions, { remplace: def.remplace || [] });
}

Object.assign(window.Noyau, {
  ecran: routeur.ecran,
  ecrans: routeur.liste,
  proprietaireAction: actions.proprietaire,
  // Compteur « N à voir » du menu latéral (navigation-ordi.js, v5.50).
  ruches: { nbAVoir },
});

// Champs à suggestions transformés en puces ou en liste sous le champ (v5.41).
choisir.demarrer();
window.Noyau.choisir = choisir;

// Gabarit d'écran commun (v5.43) : en-tête, retour, bouton principal en bas, ⋯, puce d'année. Déclaré en dernier :
// il passe après tous les autres crochets « après le rendu », sur l'écran tel qu'ils l'ont laissé.
window.Noyau.crochets.sur("apresRendu", "gabarit", () => gabarit.appliquer());
window.Noyau.gabarit = gabarit;

// Retour en arrière (v5.64) : après le gabarit, qui pose le lien « ‹ » que l'historique renomme.
window.Noyau.crochets.sur("apresRendu", "historique", () => historique.apresRendu());
window.Noyau.historique = historique;
