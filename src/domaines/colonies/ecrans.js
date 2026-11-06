// Apidoo — écrans du domaine colonies (IT-03).
export default [
  // Fiche d'une ruche : ux.js (journal de cartes), complétée par Alvéoles (courbe de poids ouverte, en-tête).
  { id: "ruche", titre: "Ruche", rubrique: "ruches", rendu: () => { UX.ecrans.fiche(); AL.completerFiche(); } },
];
