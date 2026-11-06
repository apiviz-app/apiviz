# Documentation technique

- **Application** : PWA en JavaScript sans framework ni étape de compilation, publiée par GitHub Pages.
  `index.html` (styles), `config.js`, puis `app.js` (cœur) et 19 modules qui complètent ou remplacent ses écrans.
  Ordre de chargement (celui de `index.html`, qui compte) :

  | # | Fichier | Objet global | Rôle |
  |---|---|---|---|
  | 1 | `app.js` | — (`S`, `sb`, `ACT`…) | Cœur : données, écrans d'origine, formulaires, actions |
  | 2 | `photos.js` | `PH` | Photos de visite, réduction, envoi différé |
  | 3 | `registre.js` | `RG` | Registre d'élevage, impression, export |
  | 4 | `rappels.js` | `RP` | Rappels |
  | 5 | `visites-groupees.js` | `VR` | Visite de plusieurs ruches d'un coup |
  | 6 | `etiquettes.js` | `ET` | Étiquettes de pots |
  | 7 | `exploitations.js` | `EX` | Plusieurs exploitations, membres, invitations |
  | 8 | `ux.js` | `UX` | Interface v2 |
  | 9 | `offline.js` | `HL` | Hors ligne et file d'envoi |
  | 10 | `v3.js` | `V3` | Colonie, varroa, récolte, livraison |
  | 11 | `nav4.js` | `N4` | Navigation v4 |
  | 12 | `meteo.js` | `MT` | Météo et créneaux de visite par rucher |
  | 13 | `api-compagnon.js` | `<api-compagnon>` | Le compagnon API (élément graphique, sans dépendance) |
  | 14 | `alveoles.js` | `AL` | Interface Alvéoles, rubriques, fiche rucher |
  | 15 | `voix.js` | `VX` | Visite à la voix |
  | 16 | `ergonomie.js` | `ER` | Gestion en blocs, recherche, brouillons, annulation, raccourcis |
  | 17 | `essentiels.js` | `ES` | Météo par heure, réglages en blocs, registre complet, factures, conseils du mois |
  | 18 | `tournee.js` | `TN` | Tournée en parcours |
  | 19 | `demarrage.js` | — | Prise en main, premier rucher, guide de démarrage |

  `sw.js` garde l'application sur le téléphone ; sa `VERSION` change à chaque version publiée.
- **Surcharges** : les modules remplacent des fonctions de `app.js` par `window.<nom> = …` ; la dernière chargée gagne.
  Cela ne fonctionne que parce que ces fonctions sont déclarées dans `app.js` par `function <nom>()` au premier niveau :
  ne jamais les y transformer en `const` ni les renommer. Relevé du 6 nov. 2026 :

  | Fonction de `app.js` | Remplacée successivement par |
  |---|---|
  | `render` | rappels, ux, v3, nav4, alveoles, ergonomie, essentiels |
  | `shell` | v3, nav4, alveoles, ergonomie, essentiels |
  | `viewRuches` | v3, nav4, alveoles |
  | `viewDash` | alveoles, demarrage |
  | `viewVente` | v3, alveoles |
  | `viewMiel` | nav4, essentiels |
  | `viewPlus` | nav4, ergonomie |
  | `loadAll` | offline, v3 |
  | `viewRuche`, `viewClients`, `toast` | alveoles |
  | `viewVisite` | voix |
  | `sheet`, `viewCompta` | ergonomie |
  | `viewReglages` | essentiels |
  | `boot` | ux |
  | `lotForm`, `todos`, `readVisitForm`, `readSaleForm` | v3 |

  Actions redéfinies : `ACT.go` (ux, v3, alveoles), `uvsuppr` (ux, nav4), `uronglet` et `utout` (ux, alveoles),
  `uvente` (ux, essentiels), `v3tournee` (v3, tournee), `delvisite`, `delvente`, `cancel` (app, nav4).
- **Source de `app.js`** : la source d'origine n'existe plus. La version lisible a été reconstituée en novembre 2026
  (IT-00) par formatage Prettier (`.prettierrc`) puis renommage des variables locales, chaque étape vérifiée par
  `scripts/comparer-ast.js` (même arbre syntaxique) et par les 18 tests.
- **Mobile** : un seul code pour le web et le téléphone. Aujourd'hui installé depuis le site ; cible (révision du 6 nov. 2026) : applications iOS et Android construites avec Capacitor et publiées sur les stores, site sur un domaine propre. Voir `MOBILE.md` et `ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md`.
- **Configuration** : `config.js` (adresse et clé publique Supabase, environnement).
- **Données** : Supabase (Postgres + Auth + Storage). Depuis la migration 008, chaque donnée porte un `exploitation_id` ;
  la RLS de chaque table compare cette colonne à `exploitation_courante()` (exploitation choisie dans l'en-tête
  `x-exploitation`, dont l'utilisateur doit être membre). Créations atomiques par `creer_visite` et `creer_vente`.
  L'API renvoie au plus 1 000 lignes par requête (« Max rows ») ; détail dans `migrations/README.md`.
- **Migrations** : `migrations/`, numérotées, uniquement additives. Recréer une base : 000 puis 004 à 012, **009 avant 008** ; état réel des deux bases et contrôle par `scripts/rejouer-migrations.mjs` : `migrations/README.md`. `schema.sql` n'est plus utilisé.
- **Tests** : `tests/` (Playwright, base Supabase simulée), voir `tests/README.md`. Lancés automatiquement sur chaque pull request de la recette. Tests SQL des migrations (Postgres en mémoire) : `tests/sql/`, lancés par `tests/lancer.sh`. La base simulée
  rend au plus 1 000 lignes par requête, comme Supabase.
- **Lecture des données** (IT-01) : `lireTout(table, tri)` dans `app.js` lit par tranches de 1 000 (`range`), tri
  complété par une clé unique (`id`, ou `annee, poste` pour `budgets`), total `count=exact` comme garde-fou. `loadAll`
  et `PH.load` l'utilisent. Une lecture incomplète est notée au journal et signalée à l'écran.
- **Erreurs** (IT-01) : `fail(e)` affiche `messageErreur(e)` (codes SQLSTATE, PostgREST et Auth traduits ; messages
  `raise exception` en français affichés tels quels ; sinon message par défaut) et passe le détail à `journaliser()`.
  Le journal est pour l'instant sur l'appareil (clé `apidoo-journal`, 50 entrées) ; IT-03 le branchera sur
  `journal_erreurs`.
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
