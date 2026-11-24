// Apiviz — écrans transversaux : gestion, réglages, membres, activité, recherche (IT-03).
import { actions as actionsReglages, remplace } from "./apparence.js";
import { actions as actionsDonnees } from "./donnees.js";
import { ecranProfil, completerMembres, actions as actionsProfil } from "./profil.js";
import { completerGestion, actions as actionsAssocies } from "../finances/entre-associes.js";
import { ecranSynchronisation } from "./synchronisation.js";
import { ecrans as ecransOffre } from "./offre.js";
import { ecrans as ecransArrivee, actions as actionsArrivee } from "./arrivee.js";
import { completerReglages as completerRubriques, actions as actionsRubriques } from "./rubriques.js";
import { ecrans as ecransReprise, actions as actionsReprise, completerReglages as completerReprise } from "./reprise.js";
import { ecrans as ecransMieux, actions as actionsMieux, completerReglages as completerMieux } from "./mieux.js";
import { actions as actionsNotif } from "./notifications.js";
import { ecrans as ecransSuppression, actions as actionsSuppression, completerReglages as completerSuppression } from "./suppression.js";
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
  // v5.84 : ligne « Rubriques affichées » dans L'exploitation (rubriques.js). v5.85 : « Reprendre un carnet ou un
  // tableur » dans Tes données (reprise.js). v5.86 : « Mes utilisateurs » pour l'équipe Apiviz (mieux.js).
  // v5.87 : actions de la carte « Même quand Apiviz est fermée » de l'écran Rappels (notifications.js). v5.88 : ligne
  // « Mes données » dans Tes données (suppression.js).
  { id: "reglages", titre: "Réglages", rubrique: "plus", rendu: () => { ES.ecranReglages(); completerSons(); completerApi(); completerPhotos(); completerRubriques(); completerReprise(); completerMieux(); completerSuppression(); }, actions: { ...actionsReglages, ...actionsDonnees, ...actionsSons, ...actionsRubriques, ...actionsNotif }, remplace },
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
  // Parcours d'arrivée (v5.84) : bienvenue et « Faisons connaissance » avant le compte (crochet avantRendu), première
  // visite guidée et « Bravo » après la création du rucher (arrivee.js). Les actions servent aussi avant la connexion.
  ...ecransArrivee.map((d, i) => (i ? d : { ...d, actions: actionsArrivee })),
  // Reprendre son carnet (v5.85) : photo lue par API (fonction lire-carnet) ou tableur, puis vérification (reprise.js).
  ...ecransReprise.map((d, i) => (i ? d : { ...d, actions: actionsReprise })),
  // Mieux connaître ses utilisateurs (v5.86, migration 039) : carte de l'accueil à J+14, jours d'utilisation, tableau de
  // bord « Mes utilisateurs » de l'équipe (mieux.js). Les actions de la carte servent sur l'accueil.
  ...ecransMieux.map((d) => ({ ...d, actions: actionsMieux })),
  // Mes données et suppression du compte en 30 jours (v5.88, migration 041) : suppression.js. Les actions servent aussi
  // sur l'écran « Ton compte sera supprimé » et sur le bandeau de l'accueil.
  ...ecransSuppression.map((d, i) => (i ? d : { ...d, actions: actionsSuppression })),
];
