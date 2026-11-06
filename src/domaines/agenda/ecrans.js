// Apidoo — écrans du domaine agenda (IT-03). Implémentations : essentiels.js (rappels, conseils du mois).
export default [
  { id: "rappels", titre: "Rappels", rubrique: "dash", rendu: () => ES.VUES.rappels() },
  { id: "saison", titre: "Ce mois-ci", rubrique: "dash", rendu: () => ES.VUES.saison() },
];
