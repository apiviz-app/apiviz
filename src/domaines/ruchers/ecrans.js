// Apidoo — écrans du domaine ruchers (IT-03).
export default [
  // Carte des ruches : ux.js (UX.carte), migrée sans changement.
  { id: "carte", titre: "Carte", rubrique: "ruches", rendu: () => UX.carte() },
  // Fiche d'un rucher : alveoles.js (AL.vueRucher), migrée sans changement.
  { id: "rucher", titre: "Rucher", rubrique: "ruches", rendu: () => AL.vueRucher() },
];
