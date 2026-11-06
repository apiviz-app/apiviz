// Apidoo — démarrage du noyau (IT-03, AP-FEAT-002). Chargé en dernier (module, après tous les scripts « defer »).
// Ajoute la table des écrans à window.Noyau (créé par src/passerelle.js) et enregistre les écrans migrés.
// render() d'app.js consulte Noyau.ecran(route) avant son ancienne liste.
import * as routeur from "./noyau/routeur.js";
import * as actions from "./noyau/actions.js";
import { ecrans } from "./domaines/index.js";

for (const def of ecrans) routeur.enregistrer(def);

Object.assign(window.Noyau, {
  ecran: routeur.ecran,
  ecranEnregistre: routeur.ecranEnregistre,
  ecrans: routeur.liste,
  ancien: routeur.ancien,
  proprietaireAction: actions.proprietaire,
});
