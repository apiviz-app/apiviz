// Apidoo — écrans du domaine ruchers (IT-03, complétés en IT-05).
import { completerFiche, actions } from "./fiche.js";

export default [
  // Liste des ruchers : nav4.js (un bloc par rucher de la table, y compris sans colonie, IT-05), complétée par
  // Alvéoles (météo et poids sur chaque bloc).
  { id: "ruches", titre: "Ruchers", rubrique: "ruches", rendu: () => { N4.ecranRuchers(); AL.completerRuchers(); } },
  // Carte des ruchers : ux.js (UX.carte), un repère par rucher à la position du rucher (IT-05).
  { id: "carte", titre: "Carte", rubrique: "ruches", rendu: () => UX.carte() },
  // Fiche d'un rucher : alveoles.js (AL.vueRucher), complétée par fiche.js (Infos, renommer, archiver ; IT-05).
  // Ses actions (rc*) sont déclarées ici, une seule fois.
  { id: "rucher", titre: "Rucher", rubrique: "ruches", rendu: () => { AL.vueRucher(); completerFiche(); }, actions },
];
