// Apiviz — écrans du domaine ruchers (IT-03, complétés en IT-05).
import { completerFiche, actions } from "./fiche.js";
import { ecran as ecranDeplacer, actions as actionsDeplacer } from "./deplacer.js";
import * as Tableau from "./vue-tableau.js";

export default [
  // Liste des ruchers : nav4.js (un bloc par rucher de la table, y compris sans colonie, IT-05), complétée par
  // Alvéoles (météo et poids sur chaque bloc).
  // Filtre des ruches sorties par statut (IT-06, AP-TECH-109), déclaré ici.
  // Liste, alvéoles ou tableau (v5.40) : vue-tableau.js, présentation choisie dans la barre et gardée sur l'appareil.
  // Sans rucher ni colonie : l'accueil « Crée ton premier rucher » de nav4.js.
  { id: "ruches", titre: "Ruchers", rubrique: "ruches",
    rendu: () => {
      if (S.d?.ruches?.length || UX.lieux().some((l) => l.cle)) return Tableau.ecran();
      N4.ecranRuchers(); AL.completerRuchers();
    },
    actions: { clfsortie: (v) => { S.filtreSortie = v; render(); }, ...Tableau.actions } },
  // Carte des ruchers : ux.js (UX.carte), un repère par rucher à la position du rucher (IT-05).
  { id: "carte", titre: "Carte", rubrique: "ruches", rendu: () => UX.carte() },
  // Fiche d'un rucher : alveoles.js (AL.vueRucher), complétée par fiche.js (Infos, renommer, archiver ; IT-05).
  // Ses actions (rc*) sont déclarées ici, une seule fois.
  { id: "rucher", titre: "Rucher", rubrique: "ruches", rendu: () => { AL.vueRucher(); completerFiche(); }, actions },
  // Déplacer des colonies (IT-06, transhumance) : deplacer.js, seule implémentation. L'ancienne fenêtre de la v5.10
  // (essentiels.js, ACT.erdeplacer) reste derrière le drapeau « apidoo-deplacement-v510 » pour le retour arrière.
  { id: "deplacer", titre: "Déplacer des colonies", rubrique: "ruches", rendu: ecranDeplacer, actions: actionsDeplacer },
];
