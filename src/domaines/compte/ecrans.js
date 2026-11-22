// Apiviz — écrans transversaux : gestion, réglages, membres, activité, recherche (IT-03).
import { actions as actionsReglages, remplace } from "./apparence.js";
import { actions as actionsDonnees } from "./donnees.js";
import { ecranProfil, completerMembres, actions as actionsProfil } from "./profil.js";
import { completerGestion, actions as actionsAssocies } from "../finances/entre-associes.js";
import { ecranSynchronisation } from "./synchronisation.js";
import { ecrans as ecransOffre } from "./offre.js";
import { completerReglages as completerSons, actions as actionsSons } from "../retours/reglages.js";
import { completerReglages as completerApi } from "../assistant/reglages-api.js";
import { completerReglages as completerPhotos } from "../photos/ecrans.js";
export default [
  // Gestion (route « plus ») : ergonomie.js (blocs), complétée par la carte « Entre associés » (v5.29). Les actions
  // déclarées ici servent aussi à l'écran « Entre associés » (src/domaines/finances/ecrans.js).
  { id: "plus", titre: "Gestion", rubrique: "plus", rendu: () => { ER.ecranGestion(); completerGestion(); }, actions: actionsAssocies },
  // Réglages : essentiels.js. v5.38 : cinq groupes en lignes (Toi, L'exploitation, Sur le terrain, Affichage, Tes
  // données) ; plus de « Listes », ni de bloc « Toi » ou « Associés ». Couleur du bandeau : apparence.js (aperçu).
  // v5.68 : « Objectif de récolte » (L'exploitation) et « Sons et vibrations » (Affichage), src/domaines/retours/reglages.js.
  // v5.71 : groupe « API » (Offre et gouttes, Ce qu'API sait de toi, Voix d'API, Conseils d'API), src/domaines/assistant/reglages-api.js.
  // IT-11 : ligne « Espace photos » et avertissement à 80 % dans L'exploitation (src/domaines/photos/ecrans.js).
  { id: "reglages", titre: "Réglages", rubrique: "plus", rendu: () => { ES.ecranReglages(); completerSons(); completerApi(); completerPhotos(); }, actions: { ...actionsReglages, ...actionsDonnees, ...actionsSons }, remplace },
  // Exploitation et membres : exploitations.js.
  // v5.38 : prénom et nom des membres (noms_membres, migration 021) et personnes sans compte (profil.js).
  { id: "membres", titre: "Exploitation et membres", rubrique: "plus", rendu: () => { EX.vue(); completerMembres(); }, actions: actionsProfil },
  // Mon profil (v5.38, Réglages › Toi) : identité, réponses de l'inscription, choix, données.
  { id: "profil", titre: "Mon profil", rubrique: "plus", rendu: () => ecranProfil() },
  // Activité récente et recherche : v3.js.
  { id: "activite", titre: "Activité récente", rubrique: "plus", rendu: () => V3.vues.activite() },
  { id: "recherche", titre: "Rechercher", rubrique: "plus", rendu: () => V3.vues.recherche() },
  // Synchronisation (IT-09, AP-FEAT-045) : ce qui attend sur ce téléphone, par exploitation. Ouvert depuis le bandeau
  // hors ligne, la fiche « En attente d'envoi » et le menu du compte.
  { id: "synchronisation", titre: "Synchronisation", rubrique: "plus", rendu: () => ecranSynchronisation() },
  // Offres et gouttes d'API (IT-27, migration 029) : Mon offre, Choisir une offre, Recharger (offre.js).
  ...ecransOffre,
];
