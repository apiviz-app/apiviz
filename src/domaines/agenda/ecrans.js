// Apidoo — écrans du domaine agenda (IT-03), migrés sans changement.
export default [
  // Agenda et tâches : app.js.
  { id: "agenda", titre: "Agenda", rubrique: "plus", rendu: () => ECRANS_APP.viewAgenda() },
  // Rappels et conseils du mois : essentiels.js.
  { id: "rappels", titre: "Rappels", rubrique: "dash", rendu: () => ES.VUES.rappels() },
  { id: "saison", titre: "Ce mois-ci", rubrique: "dash", rendu: () => ES.VUES.saison() },
];
