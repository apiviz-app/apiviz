// Apidoo — écran d'accueil (IT-03). Une seule définition : l'accueil d'ux.js, complété par l'interface Alvéoles
// (phrase du jour) puis par la prise en main (guide, premier succès), dans cet ordre.
export default [
  { id: "dash", titre: "Accueil", rubrique: "dash", rendu: () => { UX.ecrans.accueil(); AL.completerAccueil(); DM.completerAccueil(); } },
];
