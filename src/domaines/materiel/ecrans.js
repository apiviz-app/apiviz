// Apiviz — écrans du domaine matériel (IT-03). L'écran Matériel (catalogue.js, refait en v5.38 : tableau ou liste,
// stock au doigt) est complété par la section « Ruches physiques » (IT-06, src/domaines/colonies/contenants.js),
// visible seulement si le suivi est activé. v5.38 : Inventaire et Liste de courses, deux écrans de Matériel.
import { completerMateriel, actions } from "../colonies/contenants.js";
import { ecran as ecranCatalogue, actions as actionsCatalogue, remplace as remplaceCatalogue } from "./catalogue.js";
import { ecran as ecranInventaire, actions as actionsInventaire } from "./inventaire.js";
import { ecran as ecranCourses, actions as actionsCourses } from "./courses.js";

export default [
  { id: "materiel", titre: "Matériel", rubrique: "plus", rendu: () => { ecranCatalogue(); completerMateriel(); },
    actions: { ...actions, ...actionsCatalogue }, remplace: remplaceCatalogue },
  { id: "inventaire", titre: "Inventaire", rubrique: "plus", rendu: () => ecranInventaire(), actions: actionsInventaire },
  { id: "courses", titre: "Liste de courses", rubrique: "plus", rendu: () => ecranCourses(), actions: actionsCourses },
  { id: "fournisseurs", titre: "Fournisseurs", rubrique: "plus", rendu: () => viewFournisseurs() },
];
