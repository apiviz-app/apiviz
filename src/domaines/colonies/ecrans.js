// Apiviz — écrans du domaine colonies (IT-03, complété en IT-06).
import { completerFiche, actions } from "./fiche.js";
import { completerApercu } from "./apercu.js";
import { completerLignee, actions as actionsLignee } from "./lignee.js";
import { completerFiche as completerExpress } from "../visites/express.js";

export default [
  // Fiche d'une ruche : ux.js (journal de cartes), complétée par Alvéoles (courbe de poids ouverte, en-tête), puis par
  // fiche.js (IT-06 : statut, emplacements successifs, rucher d'une visite à sa date, ruche physique), puis par
  // apercu.js (v5.25, maquettes : ce qu'en dit API, courbe de poids resserrée, journal qui entre), puis par lignee.js
  // (IT-07 : en-tête de la colonie, onglets « Santé » et « Reine & lignée » ; le journal unifié est dans ux.js), puis par
  // visites/express.js (v5.32 : bouton « Visite express » quand la ruche a déjà une visite).
  { id: "ruche", titre: "Ruche", rubrique: "ruches", rendu: () => { UX.ecrans.fiche(); AL.completerFiche(); completerFiche(); completerApercu(); completerLignee(); completerExpress(); }, actions: { ...actions, ...actionsLignee } },
];
