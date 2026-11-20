// Apiviz — retours de réussite et jalons (v5.68, maquettes « Interactivité et satisfaction » du 20 nov. 2026).
// Installe les sons, vibrations et animations (retours.js) au chargement ; l'écran « jalons » (Accueil › Jalons).
// Le rayon de la saison est ajouté par l'écran d'accueil (src/domaines/accueil/ecrans.js), les deux lignes des
// réglages par l'écran « reglages » (src/domaines/compte/ecrans.js).
import { installer, apresRendu, fermer } from "./retours.js";
import { ecran, actions } from "./jalons.js";

installer();
window.Noyau.crochets.sur("apresRendu", "retours", apresRendu);

export default [
  { id: "jalons", titre: "Jalons", rubrique: "dash", rendu: () => ecran(), actions: { ...actions, rtfermer: fermer } },
];
