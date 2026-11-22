# Documentation technique

- **Application** : PWA en JavaScript sans framework. Sources découpées, regroupées à l'assemblage (sans dépendance).
  `index.html` (coquille), `styles/` (feuilles de style), `src/` (noyau et règles, modules ES), `config.js`, puis `app.js`
  (cœur) et 20 scripts classiques. Ordre de chargement (celui de `index.html`, tous en `defer`, exécutés dans l'ordre) :
  `src/passerelle.js` (module : `window.Regles`, `window.Noyau.journal` et `.crochets`), `config.js`, puis :

  | # | Fichier | Objet global | Rôle |
  |---|---|---|---|
  | 0 | `mouvement.js` | `Mouvement`, `<mv-eveil>`, `<mv-logo>`, `<mv-oeil>` | Animations du logo, du symbole et d'API (sans dépendance, avant `app.js` pour l'écran de chargement) |
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
- **Règles pures** (AP-FEAT-013) : `src/noyau/format.js`, `src/domaines/{finances,sante,meteo,visites,ruchers,colonies}/regles.js`, sans
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
- **Migrations** : `migrations/`, numérotées, uniquement additives. Recréer une base : 000 puis 004 à 015, **009 avant 008** ; état réel des deux bases et contrôle par `scripts/rejouer-migrations.mjs` : `migrations/README.md`. `schema.sql` n'est plus utilisé.
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
- **File hors ligne v2** (IT-09, v5.56, migration 026) : les règles de la file sont dans `src/donnees/file.js`
  (`window.Regles.file`, fonctions pures testées par `tests/unitaires/file.test.mjs`) ; `offline.js` garde le stockage
  (IndexedDB `apidoo-hors-ligne[-recette]`, magasins `kv` et `file`), l'envoi et l'affichage. Format d'une opération :
  `{ id, v: 2, type: "rpc" | "insert", nom/args ou table/lignes, op: creer | modifier | supprimer, table, cible,
  depend_de, ex, cree, statut, resume }`. Une correction d'une ligne déjà envoyée part par `modifier_saisie({ table, id,
  champs, avant, version })`, une suppression par `supprimer_saisie({ table, id, version })` ; une correction d'une
  saisie pas encore envoyée est fusionnée dans sa création (`corrigerCreation`), deux corrections de la même ligne en une
  (`modification` avec `existante`). Ordre d'envoi : `cree`, et une opération ne part pas tant qu'une opération dont
  elle dépend (`depend_de`, calculé d'après les identifiants cités) est dans la file. Réponse `{ statut: "conflit" }` :
  `statut: "conflit"` et `reponse` gardés, fiche `HL.ficheConflit` (`Regles.file.versions` / `resoudre`), actions
  `hlconflit`, `hlgarder`, `hlforcer`. Listes blanches identiques des deux côtés (`MODIFIABLES`, `SUPPRIMABLES` /
  `colonnes_modifiables()`), vérifiées par un test. Au démarrage, les opérations sans `v` (file v1) sont reprises au
  format 2 (`reprendre`). Retour arrière par téléphone : `localStorage["apidoo-file-v1"] = "1"`. Une saisie ne part que
  dans son exploitation (`ex`) ; `HL.nbIci()` pour l'exploitation ouverte, `HL.nb()` pour toutes (déconnexion).
  Écran `synchronisation` (`src/domaines/compte/synchronisation.js`, lit `HL.etat()`), bloc du menu du compte
  `HL.blocCompte()`. La file des photos reste dans `photos.js` (base `apidoo-photos`) : une photo attend que sa visite
  soit partie (`HL.enAttente`, créations seulement).
- **Déconnexion** (IT-01) : `ACT.logout` → `ficheDeconnexion()` si `HL.nb() > 0`, sinon `deconnecter()` :
  `signOut` (repli `scope: "local"`), `purgerLocal()` (ferme puis supprime les bases du téléphone, retire les clés
  `apidoo-*` de l'environnement, vide `S`), rechargement. Jamais sur un `SIGNED_OUT` automatique (session expirée).
  Limite : recette et production partagent l'origine ; quelques clés sans suffixe (`apidoo-exploitation`…) sont
  communes aux deux.
- **Écritures à plusieurs** (IT-01) : `saveCfg` appelle `regler(p_modifs)` (fusion en base, `null` retire la clé),
  l'entrée de stock `ajouter_stock(p)` ; repli sur l'ancienne écriture si la migration 012 manque.
- **Rôles et accès** (IT-04, migration 014) : `responsable` (invite, retire, restaure), `membre` (lit et écrit),
  `lecteur` (lit seulement). Chaque table métier a quatre politiques : `lire` (`exploitation_courante()`), `ajouter`,
  `modifier`, `supprimer` (`exploitation_ecriture()` : l'exploitation courante seulement si `peut_ecrire()`). Les
  fonctions d'écriture appellent `exiger_ecriture()` (message « lecture seule »). Interface : liste blanche
  `ACTIONS_LECTEUR` (`src/domaines/compte/regles.js`) ; la classe `lecteur` sur `<html>` et la règle CSS générée
  masquent les boutons de saisie ; le répartiteur de clics d'`app.js` refuse toute autre action (`EX.autorise`).
  Toute nouvelle action est donc interdite au lecteur tant qu'elle n'est pas ajoutée à la liste.
- **Invitations** (IT-04) : `invitations.role`, `usages_max` (null = illimité), `usages`, `revoque_le` ;
  `rejoindre()` refuse un lien révoqué, expiré ou épuisé ; une personne déjà membre ne consomme pas d'usage.
- **Intégrité entre exploitations** (IT-04, AP-FEAT-009) : `creer_visite`/`creer_vente` vérifient sous RLS que la ruche,
  le client, les articles et les lots sont de l'exploitation courante ; 14 clés étrangères composites
  `(x_id, exploitation_id)` → `(id, exploitation_id)` (liste dans `rattachements()`). **Règle pour toute nouvelle table**
  (AP-TECH-076) : une colonne qui référence un objet métier se double d'une clé composite avec `exploitation_id`.
- **Journal d'audit** (IT-04, AP-FEAT-019) : déclencheur `audit` (fonction `auditer()`) sur les 16 tables métier, après
  modification ou suppression : ancienne ligne en `jsonb`, auteur, date, identifiant de transaction (une suppression en
  cascade partage le sien). Pas de trace pour un changement de stock seul. Lecture : responsables, écran Activité
  (« Supprimé récemment », 30 jours). `restaurer(id)` : visites (avec intrants), ventes (avec lignes, si les pots sont
  là), dépenses. Purge à 1 an à chaque écriture.
- **Données de démonstration** (IT-04, AP-FEAT-018) : `tests/demo/exploitation-demo.json` → `tests/demo/operations.mjs`
  → `scripts/demo.mjs` (API, compte d'essai en variables d'environnement, refuse la production) ou `tests/sql/test_demo.mjs`.
  `exploitations.demo` ; `indicateurs_usage()` les exclut.
- **Confidentialité** (IT-04, AP-FEAT-021) : `docs/CONFIDENTIALITE.md` (source) et `confidentialite.html` (page publiée,
  sans script) ; `tests/unitaires/confidentialite.test.mjs` échoue si un nouveau service tiers apparaît dans le code
  sans y être cité. Dictée : `VX.avantDictee()` montre l'information une fois (clé `apidoo-dictee-info`).
- **Ruchers** (IT-05, migration 015) : table `ruchers` (position, accès, propriétaire, capacité, environnement,
  ressources, point d'eau, notes, `archive_le`) et `ruches.rucher_id` (vide = « Sans rucher »). Le texte
  `ruches.rucher` reste rempli : des déclencheurs le tiennent à jour dans les deux sens tant que l'ancienne version
  existe (renommer un rucher réécrit ses colonies ; un texte saisi retrouve ou crée le rucher ; placer un rucher
  recopie sa position sur ses colonies ; des colonies placées une à une recalculent la position du rucher). Côté
  application, `U.ruchers()` garde sa clé texte pour les anciens modules ; l'écran Ruchers, la fiche et la carte
  passent par `Regles.ruchers.lieux()` (table, avec repli sur le texte si la base n'a pas 015). Actions `rc*`
  déclarées par l'écran « rucher » (`src/domaines/ruchers/ecrans.js`, enregistrées par `src/main.js` via
  `noyau/actions.js`). `creer_rucher` et `placer_rucher` passent par la file d'envoi hors ligne. Renommer, modifier
  les infos et archiver demandent le réseau (message clair sinon).
- **Reines et filiation** (IT-07, migration 019) : `reines` garde l'historique (une seule ligne `en_place` par colonie,
  index unique partiel) ; `changer_reine()` clôt la reine en place à la date d'introduction de la nouvelle, crée la
  nouvelle, écrit la ligne « reine » du journal et recopie la reine en place dans `ruches.annee_reine`,
  `reine_origine`, `reine_introduite` (lecture par l'ancienne version, retour arrière). L'application n'écrit plus ces
  colonnes. Le déclencheur `ruches_reine` suit une écriture de l'ancienne version ; il se tait quand `changer_reine()`
  écrit elle-même (variable de transaction `apidoo.reine_sync`). `colonie_liens` est alimentée par un déclencheur sur
  `ruche_evenements` (division, essaimage récupéré, réunion) ; l'anti-cycle ne porte que sur la descendance (une
  réunion dans la colonie mère est permise). Côté téléphone : `Regles.reines` (`src/domaines/colonies/reines.js`),
  avec repli sur les colonnes de la ruche et sur `autre_ruche_id` si la base n'a pas 019. Écran « ruche » : `ux.js`
  pose les onglets et le journal unifié, `src/domaines/colonies/lignee.js` remplit l'en-tête et les onglets « Santé »
  et « Reine & lignée » (actions `rn*`).
- **Emplacements, déplacements, ruches physiques** (IT-06, migration 016) : `colonie_emplacements` dit où était chaque
  colonie, par période `[du, au)` (contrainte d'exclusion `btree_gist` : jamais deux emplacements à la fois). Tout
  changement de `ruches.rucher_id` (nouvelle version par `deplacer_colonies()`, ancienne version par le texte) passe par
  le déclencheur `ruches_emplacement` ; `deplacer_colonies()` lui transmet sa date et son déplacement par deux
  variables de transaction (`apidoo.deplacement_date`, `apidoo.deplacement_id`). Le registre des mouvements reste fait
  des lignes `ruche_evenements` (une par colonie, lisibles par l'ancienne version), reliées à `deplacements` par
  `deplacement_id` ; l'application les lit par `Regles.colonies.lignesMouvements()`. `ruches.statut` remplace
  progressivement `sortie` (déclencheur dans les deux sens). Écran `deplacer` (`src/domaines/ruchers/deplacer.js`) ;
  compléments de la fiche colonie et de Matériel dans `src/domaines/colonies/` ; les trois fonctions passent par la
  file d'envoi hors ligne (`offline.js` les rejoue sur les données gardées). Ruches physiques derrière le réglage
  `contenants` (désactivé par défaut). Ancienne fenêtre de déplacement : drapeau `apidoo-deplacement-v510`.
- **Stock par mouvements** (v5.30, migration 018, AP-FEAT-075) : `mouvements_stock` note chaque changement de stock
  (type ouverture, entrée, consommation, ajustement, inventaire, rebut ; origine reprise, achat, visite, mise en pots,
  saisie ; rattaché à sa dépense, son lot ou sa visite). `articles.stock` en est la somme : `mouvements_appliquer` met
  le stock à jour à chaque mouvement ajouté, modifié ou supprimé ; `articles_stock_journal` note en ajustement toute
  écriture directe du stock (ancienne version). Deux drapeaux de transaction (`apidoo.stock_par_mouvement`,
  `apidoo.stock_note_seul`) évitent la boucle entre les deux. Achats (`maj_stock_achat`) et visites
  (`maj_stock_intrant`) passent par des mouvements. `enregistrer_achat(p)` (lignes d'une facture reliées par
  `depenses.achat_id`) et `mettre_en_pots(p)` (lot + consommations, tout ou rien) sont idempotentes et passent par la
  file d'envoi hors ligne (`Regles.stock.appliquerAchat` / `appliquerMiseEnPots` sur le téléphone). Opex/Capex =
  `articles.type` (Consommable / Équipement) ; la nature de la dépense en découle (Consommable, Immobilisation avec
  `duree_amort`, Service pour une ligne sans article). Côté application : tables facultatives absentes notées dans
  `S.absentes` ; sans `mouvements`, Matériel, « Nouveau lot » et « Ajouter une dépense » gardent les anciens écrans.
- **Visite rapide** (v5.49, IT-08 réduite, migration 023) : `visites.force`, `oeufs_vus`, `cellules_royales` ;
  `observes` et `duree_s` de 020 disent ce qui a été vu et combien de temps. Les neuf points de la visite express sont
  dans `CHAMPS_EXPRESS` (`src/domaines/visites/regles.js`) : `repris` (valeur de la dernière visite comme départ) ou non
  (reine, œufs, cellules : à regarder). L'essaimage (`alertesEssaimage`, `tacheEssaimage`) se lit sur la dernière visite
  de chaque colonie active : carte de l'accueil (`visites/essaimage.js`), raison « essaimage » du tableau
  (`colonies/tableau.js`), tâche proposée par `write()` (file d'envoi). Brouillon de visite (`visites/brouillon.js`) :
  une ligne `brouillons-visite:<exploitation>` dans le magasin `kv` de la base locale du hors ligne (`HL.kv`),
  `{ <ruche_id>: { genre, data, depart, points, ecoule, commence, at } }`, gardée 400 ms après chaque saisie et quand
  la page passe en arrière-plan ; expirée à 48 h ; effacée à la déconnexion avec la base. Pont `window.VB` (`oublier`,
  `essaimage`) pour `visites-groupees.js` et `nav4.js`. Tournée : `MODELES` de `tournee.js` (Standard, Hiver) ; en Hiver,
  les champs non demandés sont repris de la dernière visite et `observes` ne contient que ce qui a été touché ; durée
  par ruche (`duree_ms` de chaque fiche, comptée en modes questions et manuel ; inconnue en dictée libre).
- **Retours de réussite** (v5.68, sans migration) : `src/domaines/retours/`. Règles pures `regles.js` (préférences,
  sons de chaque ambiance en notes `[Hz, départ, durée, onde, volume]`, motifs de vibration, `estReussite`, rayon de la
  saison, 12 jalons calculés depuis visites, récoltes et ventes ; tests `tests/unitaires/retours.test.mjs`). `sons.js` :
  préférences de l'appareil (clé `apiviz-retours`), sons fabriqués par Web Audio (aucun fichier, marche hors ligne ; le
  contexte est réveillé au premier toucher), `navigator.vibrate`, classe `rt-anim-*` sur `<html>`. `retours.js` habille
  `toast()` (réussite → niveau 2, erreur, annulation, « saisies envoyées » → abeille), écoute les choix (niveau 1),
  ajoute les points regardés de la visite express et la fin de tournée en musique (crochet `apresRendu` « retours »),
  et expose `window.Retours` (`v3.js` appelle `Retours.taire()` puis `Retours.recolte()`). `jalons.js` : carte du
  rayon (complément de l'accueil), écran `jalons`, annonce d'un nouveau jalon (ids annoncés et vus gardés sur l'appareil,
  par exploitation et saison). `reglages.js` : « Sons et vibrations » et « Objectif de récolte »
  (`reglages.data.objectif_recolte`, par `saveCfg`). Styles : `styles/66-retours.css`.
- **Fond de carte et adresses : IGN** (v5.73, décision D-09). Plan IGN (WMTS de la Géoplateforme,
  `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`, grille `PM`) et le géocodage (`/geocodage/search` et `/reverse`) sont gratuits,
  sans clé, sous Licence Ouverte Etalab : usage commercial permis, source à citer (« © IGN – Plan IGN » sur la carte et
  sous la carte). Limite : 50 requêtes par seconde et par adresse IP. Adresses dans `src/domaines/ruchers/regles.js`
  (`FOND_CARTE`, `urlCherche`, `urlCommune`) et `src/domaines/ventes/clients-regles.js`. Ne pas utiliser les SCAN 25 /
  SCAN 100 de l'IGN (licence payante pour l'usage numérique grand public). Remplace `tile.openstreetmap.org` et Nominatim
  (politique de l'OSMF : applications très utilisées interdites sans accord, aucun service commercial).
- **Polices** (v5.73) : hébergées avec le site (`styles/00-polices.css`, `styles/polices/`, SIL OFL 1.1), plus de
  Google Fonts.
- **Météo** : Open-Meteo, gratuit pour un usage **non commercial** seulement. À remplacer avant toute offre payante :
  API publique de Météo-France (Licence Ouverte, compte gratuit) par une fonction serveur avec cache par rucher, ou offre
  Standard d'Open-Meteo (payante).
- **Environnements** : un seul dépôt, voir `PROCESSUS.md`. La racine porte la configuration de production, `environnements/recette/` celle de la recette.
- **Créneaux météo** (`meteo.js`, `SEUILS`), cherchés entre 10 h et 16 h sur 3 jours :
  - Température : 15 °C pour une visite normale ([BeekeepingInsider](https://beekeepinginsider.com/whats-the-ideal-hive-inspection-temperature/)), 13 °C pour une visite rapide (55 °F, [Utah State University](https://extension.usu.edu/answers/articles/how-often-should-i-inspect-my-beehive)).
  - Pluie : ces sources disent de ne pas ouvrir sous la pluie, sans chiffre. Apiviz refuse dès 30 % de risque ou de la pluie prévue.
  - Vent : elles disent d'éviter le vent, sans chiffre. Apiviz refuse dès 25 km/h. Ces deux valeurs sont des choix, à ajuster à l'usage.

## Assistant API (IT-24, v5.51)

API répond en lecture seule aux questions sur les données de l'exploitation. Même code en recette et en production.

| Élément | Fichier | Rôle |
|---|---|---|
| Fonction serveur | `supabase/functions/assistant/index.ts` | Reçoit la question, vérifie la connexion, l'appartenance à l'exploitation (`est_membre`) et le plafond, appelle Claude |
| Boucle | `…/boucle.js` | Lectures puis réponse : au plus 6 appels au modèle, un outil à chaque tour, « repondre » imposé au dernier, format redemandé une fois |
| Outils de lecture | `…/outils.js` | Instantané (colonies, dernières visites, tâches, miel en stock) envoyé avec chaque question, puis 12 lectures typées : visites, santé, reines, événements, récoltes, lots, ventes, clients, dépenses et budget, matériel, tâches, météo |
| Règles | `…/regles.js` | Schéma de la réponse en quatre blocs, contrôle du format, retrait des références inventées et des recommandations sanitaires non sourcées ou chiffrées |
| Consignes | `…/consignes.js` | Texte fixe envoyé au modèle (mis en cache) : rôle, quatre blocs, interdits sanitaires, raisonnement de saison |
| Écran | `src/domaines/assistant/` | Champ dans la feuille du bouton API (questions sur la ruche quand elle est ouverte depuis sa fiche), écran `api` : « Tes échanges » (historique, conseils pas encore faits, recherche) et la conversation, rendu des quatre blocs |
| Historique | `api_echanges` (migration 031), `…/historique.js` | Chaque échange répondu est gardé par l'application (pas par la fonction, qui n'écrit rien), visible de son auteur seul ; sans la migration, la conversation reste en mémoire |
| Compteur | `migrations/024-assistant-usage.sql` | Plafond de questions par personne et par jour |

**Sécurité.** Chaque lecture passe par le jeton de l'utilisateur et l'en-tête `x-exploitation` : la RLS s'applique, API ne
voit que ce que voit l'utilisateur. Aucun outil n'écrit. Une exploitation dont on n'est pas membre reçoit une réponse fixe,
sans appel au modèle. La clé Claude ne quitte jamais le serveur.

**Secrets de la fonction** (Supabase › Edge Functions › Secrets, un jeu par projet, jamais dans le dépôt) :
`ANTHROPIC_API_KEY` (clé de l'espace de travail « Apiviz recette » ou « Apiviz production », chacun avec sa limite de
dépense), et facultatifs `ASSISTANT_MODELE` (défaut `claude-sonnet-5-5`), `ASSISTANT_PLAFOND` (défaut 30),
`ASSISTANT_ACTIF` (`non` coupe API : l'application revient à « Bientôt » ; c'est le retour arrière d'IT-24).

**Déploiement.** Recette : `apidoo-test`, par Claude (accès Supabase), avec la migration 024. Production : même code sur
`apidoo` avec la migration 024, après l'accord de Pierre-Louis. La mise en ligne GitHub ne déploie pas encore les
fonctions serveur (il lui faudrait un jeton `SUPABASE_ACCESS_TOKEN`).

**Qualité des réponses.** `tests/assistant/questions.json` : 30 questions de référence (semaine, colonies, santé, hiver,
météo, miel, ventes, finances, matériel, écriture refusée, consignes contournées, suite de conversation, autre
exploitation). `scripts/evaluer-api.mjs` les rejoue sur la recette avec un compte d'essai et écrit un rapport à relire.
À relancer après toute modification des consignes ou des outils.

**Coût.** Tarifs de l'API Claude relevés le 16 nov. 2026 : Sonnet 5.5 à 2 $ / 10 $ par million de jetons (lecture du
cache à 0,10 $), Haiku 5.5 à 0,10 $ / 0,50 $. Une question coûte de l'ordre de 2 à 4 centimes avec Sonnet. Les jetons de
chaque question sont écrits dans le journal de la fonction (Supabase › Edge Functions › assistant › Logs).


## Offres et gouttes d'API (IT-27, première partie, v5.59)

Décidé le 18 nov. 2026 (maquette « Apiviz — Offres et IA ») : **1 goutte = 1 centime d'euro de coût IA réel**, gouttes
partagées par l'exploitation, trois offres, pas encore de paiement.

| Élément | Où | Rôle |
|---|---|---|
| Catalogue | table `offres` (migration 029) | prix TTC en centimes, gouttes du mois, limites affichées, jours d'essai. Modifiable à l'éditeur SQL seulement : un prix change sans nouvelle version |
| Abonnement | table `abonnements` | une ligne par exploitation (offre, statut essai / actif / résilié, échéance, canal manuel / web / apple / google). Sans ligne ou échue : Découverte |
| Gouttes | table `gouttes_mouvements` | dépenses (négatives) et recharges ; réserve « forfait » (remise à neuf le 1er du mois, heure de Paris, sans écriture) ou « recharge » (cumulée) |
| Coût réel | `supabase/functions/*/gouttes.js` | tarifs Claude par million de jetons, relevés le 18 nov. 2026 ; même fichier dans les deux fonctions (test `gouttes.test.mjs`) |
| Écrans | `src/domaines/compte/offre.js`, `regles-offre.js` | Mon offre, Choisir une offre, Recharger ; bloc Équipe Apiviz |

**Déroulé d'une question.** La fonction lit `gouttes_disponibles()` ; à zéro ou moins, refus 402 `gouttes` avant tout
appel au modèle et avant le plafond du jour. Sinon elle appelle Claude Sonnet (Approfondie) ou Claude Haiku (Rapide,
`mode: "rapide"`), additionne les jetons de tous les tours, convertit le coût en gouttes (`GOUTTES_EUR_PAR_USD`, 0,91 par
défaut) et appelle `gouttes_debiter` (forfait d'abord, puis recharge ; la dernière réponse peut faire passer un peu sous
zéro). Une réponse en échec n'est pas débitée. Le plafond de 30 questions par jour et par personne reste en place,
contre les emballements. Sans migration 029, les fonctions se comportent comme avant (pas de gouttes).

**Secrets ajoutés** (facultatifs) : `ASSISTANT_MODELE_RAPIDE` (« claude-haiku-5-5 »), `GOUTTES_EUR_PAR_USD` (0,91).

**Équipe Apiviz.** `administrateurs_apiviz` est remplie à la main (éditeur SQL), jamais par l'application ni par une
migration. Ses adresses voient le bloc « Équipe Apiviz » de Mon offre : poser une offre (`admin_definir_offre`),
créditer ou retirer des gouttes (`admin_crediter_gouttes`). Tant que le paiement n'existe pas, c'est le seul moyen
d'activer une offre payée ou une recharge.

**Suite (IT-27, deuxième partie).** Paiement web (prestataire D-14) et achats intégrés : chaque canal écrira dans
`abonnements` et `gouttes_mouvements` par une fonction serveur idempotente, colonne `canal` et `externe`. Les écrans ne
changent pas : seul le bouton « Payer » sera branché.

## Lecture des factures par API (v5.52)

« Ajouter un achat » propose de donner la facture (photo ou PDF) à API ; l'apiculteur valide le relevé, puis l'achat est
enregistré par `enregistrer_achat()` (migration 018), exactement comme une saisie à la main.

| Élément | Fichier | Rôle |
|---|---|---|
| Fonction serveur | `supabase/functions/lire-facture/index.ts` | Vérifie la connexion, l'appartenance (`est_membre`) et le plafond (`assistant_consommer`, partagé avec les questions), lit articles et fournisseurs avec le jeton de l'utilisateur, appelle Claude avec la facture (bloc `document` pour un PDF, `image` pour une photo) et l'outil `facture` imposé |
| Règles | `…/regles.js` | Consignes, schéma de l'outil, contrôle des pièces (PDF seul, ou 1 à 4 images, 10 Mo), `normaliser()` (identifiants connus seulement, montant TTC par ligne, lignes sans quantité ou sans montant à vérifier, date pas dans le futur, contrôle des totaux à 5 centimes) |
| Écran | `src/domaines/finances/facture.js` | Source, pages photographiées, lecture, validation, intégration, dans la feuille du bas ; photos réduites à 2 000 px en JPEG |
| Règles de l'écran | `src/domaines/finances/facture-regles.js` | État de validation, lignes à vérifier, stock avant → après, achat envoyé à `enregistrer_achat` |

**Secrets** : ceux de la fonction `assistant` (`ANTHROPIC_API_KEY`, `ASSISTANT_PLAFOND`) ; facultatifs `FACTURE_MODELE`
(à défaut `ASSISTANT_MODELE`, puis `claude-sonnet-5-5`) et `FACTURE_ACTIF` (`non` coupe la lecture : retour arrière).
`ASSISTANT_ACTIF=non` la coupe aussi. **Aucune écriture** par la fonction ; la facture n'est pas conservée.
**Déploiement** : comme `assistant`, par Claude (accès Supabase), `apidoo-test` d'abord, `apidoo` après accord.
**Coût** : une facture d'une page coûte de l'ordre de 2 à 5 centimes avec Sonnet ; jetons écrits dans le journal de la fonction.

## Photos de fiche et nettoyage du stockage (IT-11, v5.74)

Une photo (`visite_photos`, migration 034) est rattachée à une **visite**, une **colonie** (`colonie_id`) ou un
**rucher** (`rucher_id`), au moins un des trois. Pendant une visite, « Rattacher à » garde la visite et ajoute la colonie
ou le rucher de la colonie ; depuis une fiche, la photo n'a pas de visite. Toutes passent par la même file d'envoi
(`photos.js`, IndexedDB `apidoo-photos`) : fichier d'abord, puis ligne, après la visite, la colonie ou le rucher s'ils
sont eux-mêmes en attente. Chemins du stockage `photos-visites` : `<exploitation>/<visite>/<photo>.jpg` (inchangé),
`<exploitation>/colonies/<colonie>/<photo>.jpg`, `<exploitation>/ruchers/<rucher>/<photo>.jpg` ; les règles d'accès du
stockage (014, `peut_photo_ecrire`) lisent le premier dossier.

| Élément | Fichier | Rôle |
|---|---|---|
| Règles | `src/domaines/photos/regles.js` (`Regles.photos`) | HEIC, message de repli, chemin, rattachement, espace et alerte à 80 %, libellés du journal |
| Écrans | `src/domaines/photos/ecrans.js` | Ligne et avertissement des Réglages, écran `stockage` (Espace photos), photos de la fiche rucher |
| Photos | `photos.js` | Réduction, file d'envoi, `PH.galerie(type, id)` (fiches), détection de 034 (`apidoo-photos-034`), alerte du responsable une fois par jour et par appareil |
| Fonction serveur | `supabase/functions/nettoyer-stockage/index.ts` et `regles.js` | Liste `photos_a_nettoyer(7)`, retire par lots de 100 par l'API du stockage, écrit une ligne par exploitation dans `nettoyages_stockage`, efface le journal de plus de 90 jours ; ne renvoie que des nombres |
| Planification | `.github/workflows/nettoyer-stockage.yml` | Chaque nuit (2 h 23 UTC) ; à la main avec « Simuler » (coché par défaut) |

**Quota** : 1 Go, celui de l'offre gratuite Supabase pour **tout le projet**. `photos_espace()` (008) mesure la part de
l'exploitation choisie : l'alerte à 80 % est donc par exploitation. Avec plusieurs exploitations sur un même projet, la
somme peut dépasser le quota avant qu'une exploitation n'atteigne 80 % (limite connue, à revoir avec l'offre payante).

**Ce que le nettoyage ne touche jamais** : un fichier qui a une ligne dans `visite_photos` ; un fichier de moins de
7 jours (une photo en cours d'envoi a son fichier avant sa ligne) ; un fichier hors du dossier d'une exploitation
existante (anciens chemins d'avant 008) ; tout autre stockage (factures). Double contrôle : la fonction SQL, puis
`parExploitation()` côté serveur.

**Mise en service, par base** (`apidoo-test` d'abord, `apidoo` avec l'accord de Pierre-Louis) :
1. Migration 034 appliquée.
2. `supabase functions deploy nettoyer-stockage --no-verify-jwt --project-ref <ref>` (la clé partagée remplace le jeton).
3. Secret de la fonction : `NETTOYAGE_CLE` = une valeur aléatoire d'au moins 24 caractères (`openssl rand -hex 24`),
   jamais écrite dans le dépôt ni dans une conversation.
4. Secret GitHub de même valeur : `NETTOYAGE_CLE_RECETTE` ou `NETTOYAGE_CLE_PRODUCTION`.
5. Actions › Nettoyage du stockage › Run workflow, « Simuler » coché : le journal de l'écran Espace photos montre un essai.

**Retour arrière** : Actions › Nettoyage du stockage › Disable workflow, ou `NETTOYAGE_ACTIF=non` dans les secrets de la
fonction (effet immédiat, sans redéploiement). L'application continue sans journal ; rien d'autre ne dépend de la fonction.
