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
- **Fond de carte OpenStreetMap** (AP-TECH-099, politique lue le 6 nov. 2026 sur
  <https://operations.osmfoundation.org/policies/tiles/>, page non datée) : `tile.openstreetmap.org` est un service
  sans garantie ; l'usage commercial n'y est ni permis ni interdit explicitement, mais un service commercial doit
  s'attendre à perdre l'accès à tout moment, et la page renvoie vers des fournisseurs payants. Exigences : HTTPS,
  attribution visible (faite : « © OpenStreetMap » sur la carte et sous la carte), en-tête Referer valide pour le web,
  User-Agent propre à l'application pour une application installée, respect du cache ; téléchargement en masse et
  « carte hors ligne » interdits. Apiviz est conforme pour le site tant que l'usage reste modeste. **À trancher avant
  les applications des stores (IT-30) et l'abonnement payant** : passer à un fournisseur de tuiles qui autorise
  l'usage commercial (ou des tuiles hébergées), la vue web de Capacitor ne permettant pas un User-Agent propre simple.
- **Environnements** : un seul dépôt, voir `PROCESSUS.md`. La racine porte la configuration de production, `environnements/recette/` celle de la recette.
- **Créneaux météo** (`meteo.js`, `SEUILS`), cherchés entre 10 h et 16 h sur 3 jours :
  - Température : 15 °C pour une visite normale ([BeekeepingInsider](https://beekeepinginsider.com/whats-the-ideal-hive-inspection-temperature/)), 13 °C pour une visite rapide (55 °F, [Utah State University](https://extension.usu.edu/answers/articles/how-often-should-i-inspect-my-beehive)).
  - Pluie : ces sources disent de ne pas ouvrir sous la pluie, sans chiffre. Apiviz refuse dès 30 % de risque ou de la pluie prévue.
  - Vent : elles disent d'éviter le vent, sans chiffre. Apiviz refuse dès 25 km/h. Ces deux valeurs sont des choix, à ajuster à l'usage.
