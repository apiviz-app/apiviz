// Apidoo — écrans du domaine colonies (IT-03, complété en IT-06).
import { completerFiche, actions } from "./fiche.js";

export default [
  // Fiche d'une ruche : ux.js (journal de cartes), complétée par Alvéoles (courbe de poids ouverte, en-tête), puis par
  // fiche.js (IT-06 : statut, emplacements successifs, rucher d'une visite à sa date, ruche physique).
  { id: "ruche", titre: "Ruche", rubrique: "ruches", rendu: () => { UX.ecrans.fiche(); AL.completerFiche(); completerFiche(); }, actions },
];
