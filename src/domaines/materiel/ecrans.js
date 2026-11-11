// Apiviz — écrans du domaine matériel (IT-03). L'écran Matériel est le catalogue d'articles (v5.30, catalogue.js ;
// l'ancien viewMateriel d'app.js sans la migration 018), complété par la section « Ruches physiques » (IT-06,
// src/domaines/colonies/contenants.js), visible seulement si le suivi est activé.
import { completerMateriel, actions } from "../colonies/contenants.js";
import { ecran as ecranCatalogue, actions as actionsCatalogue, remplace as remplaceCatalogue } from "./catalogue.js";

export default [
  { id: "materiel", titre: "Matériel", rubrique: "plus", rendu: () => { ecranCatalogue(); completerMateriel(); },
    actions: { ...actions, ...actionsCatalogue }, remplace: remplaceCatalogue },
  { id: "fournisseurs", titre: "Fournisseurs", rubrique: "plus", rendu: () => viewFournisseurs() },
];
