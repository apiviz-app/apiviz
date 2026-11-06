// Apidoo — écrans du domaine visites (IT-03).
export default [
  // Formulaire de visite : ux.js (sections repliables), complété par la visite à la voix (voix.js).
  { id: "visite", titre: "Nouvelle visite", rubrique: "ruches", rendu: (...a) => { UX.ecrans.visite(...a); VX.completerVisite(...a); } },
  // Tournée en parcours : tournee.js, migrée sans changement.
  { id: "tournee", titre: "Tournée", rubrique: "ruches", rendu: () => TN.vue() },
];
