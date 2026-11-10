// Apiviz — écrans du domaine matériel (IT-03). Implémentations d'app.js ; l'écran Matériel est complété par la section
// « Ruches physiques » (IT-06, src/domaines/colonies/contenants.js), visible seulement si le suivi est activé.
import { completerMateriel, actions } from "../colonies/contenants.js";

export default [
  { id: "materiel", titre: "Matériel", rubrique: "plus", rendu: () => { viewMateriel(); completerMateriel(); }, actions },
  { id: "fournisseurs", titre: "Fournisseurs", rubrique: "plus", rendu: () => viewFournisseurs() },
];
