// Apidoo — écrans transversaux : gestion, réglages, membres, activité, recherche (IT-03).
export default [
  // Gestion (route « plus ») : ergonomie.js (blocs), seule implémentation encore utilisée.
  { id: "plus", titre: "Gestion", rubrique: "plus", rendu: () => ER.ecranGestion() },
  // Réglages : essentiels.js (blocs), qui reprend le formulaire d'app.js quand on l'ouvre.
  { id: "reglages", titre: "Réglages", rubrique: "plus", rendu: () => ES.ecranReglages() },
  // Exploitation et membres : exploitations.js.
  { id: "membres", titre: "Exploitation et membres", rubrique: "plus", rendu: () => EX.vue() },
  // Activité récente et recherche : v3.js.
  { id: "activite", titre: "Activité récente", rubrique: "plus", rendu: () => V3.vues.activite() },
  { id: "recherche", titre: "Rechercher", rubrique: "plus", rendu: () => V3.vues.recherche() },
];
