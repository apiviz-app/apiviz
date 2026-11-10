// Apiviz — démarrage du noyau (IT-03, AP-FEAT-002). Chargé en dernier (module, après tous les scripts « defer »).
// Ajoute la table des écrans à window.Noyau (créé par src/passerelle.js) et enregistre les écrans migrés.
// render() d'app.js affiche Noyau.ecran(route).
import * as routeur from "./noyau/routeur.js";
import * as actions from "./noyau/actions.js";
import { ecrans } from "./domaines/index.js";

for (const def of ecrans) {
  routeur.enregistrer(def);
  // Actions déclarées par l'écran (IT-05) : une seule déclaration, contrôlée par noyau/actions.js.
  if (def.actions) actions.enregistrerActions(ACT, def.id, def.actions, { remplace: def.remplace || [] });
}

Object.assign(window.Noyau, {
  ecran: routeur.ecran,
  ecrans: routeur.liste,
  proprietaireAction: actions.proprietaire,
});
