// Apidoo — écrans du domaine finances (IT-03).
export default [
  // Dépenses : app.js, complétées par ergonomie.js (chiffres et filtre par poste).
  { id: "compta", titre: "Dépenses", rubrique: "plus", rendu: () => { ECRANS_APP.viewCompta(); ER.completerDepenses(); } },
  // Bilan : app.js (la comparaison avec l'année précédente vient d'ux.js par pilotFin).
  { id: "pilotage", titre: "Bilan", rubrique: "plus", rendu: () => ECRANS_APP.viewPilotage() },
  // Prévisions et budget : app.js, migré sans changement.
  { id: "previsions", titre: "Prévisions", rubrique: "plus", rendu: () => ECRANS_APP.viewPrevisions() },
];
