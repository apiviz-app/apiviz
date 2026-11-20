// Apiviz — écran d'accueil (IT-03). Une seule définition : l'accueil d'ux.js, complété par l'interface Alvéoles
// (phrase du jour), par la prise en main (guide, premier succès), puis sur téléphone par la mise en page
// des maquettes (accueil.js, v5.24), puis (v5.49) la carte « Essaimage à surveiller » et « Reprendre la visite de… »
// (src/domaines/visites/essaimage.js et brouillon.js), puis (v5.68) le rayon de la saison et l'annonce d'un nouveau
// jalon (src/domaines/retours/jalons.js), dans cet ordre.
// La feuille du bouton API (suggestion du jour, v5.27) est installée ici : elle s'ouvre depuis tous les écrans,
// mais reprend la priorité de l'accueil ; ses deux gestes sont déclarés avec l'accueil.
import { installer, actions } from "./feuille-api.js";
import { completerAccueil as completerEssaimage } from "../visites/essaimage.js";
import { completerAccueil as completerBrouillon } from "../visites/brouillon.js";
import { completerAccueil as completerRayon } from "../retours/jalons.js";

installer();

export default [
  { id: "dash", titre: "Accueil", rubrique: "dash", rendu: () => { UX.ecrans.accueil(); AL.completerAccueil(); DM.completerAccueil(); AC.completerAccueil(); completerEssaimage(); completerBrouillon(); completerRayon(); }, actions },
];
