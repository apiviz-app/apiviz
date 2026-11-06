// Apidoo — écrans du domaine registre (IT-03), migrés sans changement.
export default [
  // Registre d'élevage : essentiels.js (ES.VUES.registre, autour de RG.vue).
  { id: "registre", titre: "Registre d’élevage", rubrique: "plus", rendu: () => ES.VUES.registre() },
  // Déclaration annuelle des ruches : v3.js.
  { id: "declaration", titre: "Déclaration des ruches", rubrique: "plus", rendu: () => V3.vues.declaration() },
];
