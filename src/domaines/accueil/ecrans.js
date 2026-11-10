// Apiviz — écran d'accueil (IT-03). Une seule définition : l'accueil d'ux.js, complété par l'interface Alvéoles
// (phrase du jour), par la prise en main (guide, premier succès), puis sur téléphone par la mise en page
// des maquettes (accueil.js, v5.24), dans cet ordre.
export default [
  { id: "dash", titre: "Accueil", rubrique: "dash", rendu: () => { UX.ecrans.accueil(); AL.completerAccueil(); DM.completerAccueil(); AC.completerAccueil(); } },
];
