# Documentation technique

- **Application** : PWA en JavaScript sans framework. Sources découpées, regroupées à l'assemblage (sans dépendance).
  `index.html` (coquille), `styles/` (feuilles de style), `src/` (noyau et règles, modules ES), `config.js`, puis `app.js`
  (cœur) et 19 scripts classiques. Ordre de chargement (celui de `index.html`, tous en `defer`, exécutés dans l'ordre) :
  `src/passerelle.js` (module : `window.Regles`, `window.Noyau.journal` et `.crochets`), `config.js`, puis :

  | # | Fichier | Objet global | Rôle |
  |---|---|---|---|
  | 1 | `app.js` | — (`S`, `sb`, `ACT`…) | Cœur : données, `render()` et `shell()`, formulaires, actions |
  | 2 | `photos.js` | `PH` | Photos de visite, réduction, envoi différé |
  | 3 | `registre.js` | `RG` | Registre d'élevage, impression, export |
  | 4 | `rappels.js` | `RP` | Rappels |
  | 5 | `visites-groupees.js` | `VR` | Visite de plusieurs ruches d'un coup |
  | 6 | `etiquettes.js` | `ET` | Étiquettes de pots |
  | 7 | `exploitations.js` | `EX` | Plusieurs exploitations, membres, invitations |
  | 8 | `ux.js` | `UX` | Fiche ruche, visite, ventes, carte |
  | 9 | `offline.js` | `HL` | Hors ligne et file d'envoi |
  | 10 | `v3.js` | `V3` | Colonie, varroa, récolte, livraison, recherche |
  | 11 | `nav4.js` | `N4` | Navigation, liste des ruchers |
  | 12 | `meteo.js` | `MT` | Météo et créneaux de visite par rucher |
  | 13 | `api-compagnon.js` | `<api-compagnon>` | Le compagnon API (élément graphique, sans dépendance) |
  | 14 | `alveoles.js` | `AL` | Interface Alvéoles, rubriques, fiche rucher |
  | 15 | `voix.js` | `VX` | Visite à la voix |
  | 16 | `ergonomie.js` | `ER` | Gestion en blocs, recherche, brouillons, annulation, raccourcis |
  | 17 | `essentiels.js` | `ES` | Météo par heure, réglages en blocs, registre complet, factures, conseils du mois |
  | 18 | `tournee.js` | `TN` | Tournée en parcours |
  | 19 | `demarrage.js` | — | Prise en main, premier rucher, guide de démarrage |

  et enfin `src/main.js` (module) qui enregistre les écrans.
- **Noyau d'écrans** (IT-03, AP-FEAT-002) : chaque écran est enregistré **une seule fois** dans
  `src/domaines/<domaine>/ecrans.js` (`{ id, titre, rubrique, rendu }`), 30 écrans. `render()` d'`app.js` affiche
  `Noyau.ecran(S.route)` (route inconnue → accueil). Enregistrer deux fois le même identifiant lève une erreur.
  Il n'y a plus de surcharge `window.render`, `window.shell` ni `window.view*` : ce que les modules faisaient avant ou
  après passe par des **crochets nommés** (`src/noyau/crochets.js`) : `avantRendu`, `apresRendu`, `avantCoquille`,
  `apresCoquille`. « avant » : du dernier module chargé au premier ; « après » : du premier au dernier (l'ordre des
  anciennes chaînes). Un écran ne se modifie qu'à un endroit : sa fonction de rendu.
- **Règles pures** (AP-FEAT-013) : `src/noyau/format.js`, `src/domaines/{finances,sante,meteo,visites}/regles.js`, sans
  navigateur ni base ; testées par `tests/unitaires/` (`npm test`, aussi dans « Vérifier »). Les scripts classiques les
  appellent par `window.Regles` (passerelle à retirer quand ils seront migrés).
- **Assemblage** (`scripts/assembler-site.sh`) : copie le site (racine, `src/`, `styles/`), puis
  `scripts/regrouper.py` regroupe les feuilles de `styles/` en `styles/apidoo.css` et les modules de `src/` en
  `src/apidoo.js` (un exemplaire de chaque module ; l'ouverture n'est pas ralentie par 60 fichiers), puis
  `scripts/generer-coquille.py` écrit la liste des fichiers gardés hors ligne dans `sw.js` et la version
  (`apidoo-<date du commit>-<commit>`, préfixe `recette-` en recette) dans `sw.js` et `<meta name="apidoo-version">`.
  Plus rien à tenir à la main dans `sw.js`. Les garde-fous (base de recette jamais en production et inversement)
  couvrent tous les sous-dossiers.
- **Styles** (AP-FEAT-015) : `styles/jetons.css` (couleurs, rayons, ombres), `styles/composants/feuille.css`
  (fenêtres), puis les rubriques d'origine dans l'ordre de la cascade. Tant que le découpage par composant n'est pas
  fini (IT-03b), garder l'ordre des `<link>` d'`index.html`.
- **Ton** : `docs/CHARTE_DE_TON.md` ; contrôle automatique `tests/unitaires/ton.test.mjs`.
- **Source de `app.js`** : la source d'origine n'existe plus. La version lisible a été reconstituée en novembre 2026
  (IT-00) par formatage Prettier (`.prettierrc`) puis renommage des variables locales, chaque étape vérifiée par
  `scripts/comparer-ast.js` (même arbre syntaxique) et par les 18 tests.
- **Mobile** : un seul code pour le web et le téléphone. Aujourd'hui installé depuis le site ; cible (révision du 6 nov. 2026) : applications iOS et Android construites avec Capacitor et publiées sur les stores, site sur un domaine propre. Voir `MOBILE.md` et `ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md`.
- **Configuration** : `config.js` (adresse et clé publique Supabase, environnement).
- **Données** : Supabase (Postgres + Auth + Storage). Depuis la migration 008, chaque donnée porte un `exploitation_id` ;
  la RLS de chaque table compare cette colonne à `exploitation_courante()` (exploitation choisie dans l'en-tête
  `x-exploitation`, dont l'utilisateur doit être membre). Créations atomiques par `creer_visite` et `creer_vente`.
  L'API renvoie au plus 1 000 lignes par requête (« Max rows ») ; détail dans `migrations/README.md`.
- **Migrations** : `migrations/`, numérotées, uniquement additives. Recréer une base : 000 puis 004 à 013, **009 avant 008** ; état réel des deux bases et contrôle par `scripts/rejouer-migrations.mjs` : `migrations/README.md`. `schema.sql` n'est plus utilisé.
- **Tests** : `tests/` (Playwright, base Supabase simulée), voir `tests/README.md`. Lancés automatiquement sur chaque pull request de la recette. Tests SQL des migrations (Postgres en mémoire) : `tests/sql/`, lancés par `tests/lancer.sh`. La base simulée
  rend au plus 1 000 lignes par requête, comme Supabase.
- **Après une visite** (IT-03, AP-FEAT-014) : `creer_visite` puis mise à jour locale par
  `Regles.visites.appliquerVisite()` (visite, intrants, stock, état de la ruche ; même calcul que la file hors ligne),
  sans relire les tables. Vue `colonies_resume` (013, dernière visite par colonie) prête pour le chargement ciblé
  (IT-03b).
- **Lecture des données** (IT-01) : `lireTout(table, tri)` dans `app.js` lit par tranches de 1 000 (`range`), tri
  complété par une clé unique (`id`, ou `annee, poste` pour `budgets`), total `count=exact` comme garde-fou. `loadAll`
  et `PH.load` l'utilisent. Une lecture incomplète est notée au journal et signalée à l'écran.
- **Erreurs** (IT-01) : `fail(e)` affiche `messageErreur(e)` (codes SQLSTATE, PostgREST et Auth traduits ; messages
  `raise exception` en français affichés tels quels ; sinon message par défaut) et passe le détail à `journaliser()`.
  Le journal est gardé sur l'appareil (clé `apidoo-journal`, 50 entrées) et, depuis IT-03 (AP-FEAT-016), une copie
  part en base par `journaliser_erreur(p)` (013) : version, écran, message (e-mails et identifiants masqués, 500
  caractères), regroupés par empreinte et par minute (compteur) ; les erreurs non rattrapées (`error`, `unhandledrejection`) aussi.
  Table `journal_erreurs` sans aucune politique : illisible par l'API, consultée dans l'éditeur SQL de Supabase.
  Purge des lignes de plus de 90 jours à chaque écriture.
- **File hors ligne** (IT-01) : une saisie refusée par le serveur prend `statut: "quarantaine"` (motif, date) au lieu
  d'être supprimée ; elle n'est plus appliquée aux chiffres, les suivantes partent. `HL.nbCorriger()`, pastille du
  bandeau et fiche « À corriger » (`HL.ficheCorriger`, actions `hlmodifier`, `hlrenvoyer`, `hlabandonner`). Une vente
  ou une visite corrigée garde son identifiant : `HL.rpc` remplace la saisie d'origine.
- **Déconnexion** (IT-01) : `ACT.logout` → `ficheDeconnexion()` si `HL.nb() > 0`, sinon `deconnecter()` :
  `signOut` (repli `scope: "local"`), `purgerLocal()` (ferme puis supprime les bases du téléphone, retire les clés
  `apidoo-*` de l'environnement, vide `S`), rechargement. Jamais sur un `SIGNED_OUT` automatique (session expirée).
  Limite : recette et production partagent l'origine ; quelques clés sans suffixe (`apidoo-exploitation`…) sont
  communes aux deux.
- **Écritures à plusieurs** (IT-01) : `saveCfg` appelle `regler(p_modifs)` (fusion en base, `null` retire la clé),
  l'entrée de stock `ajouter_stock(p)` ; repli sur l'ancienne écriture si la migration 012 manque.
- **Environnements** : un seul dépôt, voir `PROCESSUS.md`. La racine porte la configuration de production, `environnements/recette/` celle de la recette.
- **Créneaux météo** (`meteo.js`, `SEUILS`), cherchés entre 10 h et 16 h sur 3 jours :
  - Température : 15 °C pour une visite normale ([BeekeepingInsider](https://beekeepinginsider.com/whats-the-ideal-hive-inspection-temperature/)), 13 °C pour une visite rapide (55 °F, [Utah State University](https://extension.usu.edu/answers/articles/how-often-should-i-inspect-my-beehive)).
  - Pluie : ces sources disent de ne pas ouvrir sous la pluie, sans chiffre. Apidoo refuse dès 30 % de risque ou de la pluie prévue.
  - Vent : elles disent d'éviter le vent, sans chiffre. Apidoo refuse dès 25 km/h. Ces deux valeurs sont des choix, à ajuster à l'usage.
