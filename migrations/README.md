# Migrations de la base Apidoo

## Recréer une base

Point d'entrée unique : `000-structure-au-3-nov-2026.sql`, puis les migrations **dans cet ordre** :

```
000 → 004 → 005 → 006 → 007 → 009 → 008 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017 → 018 → 019
```

- **009 avant 008** : c'est l'ordre réel des deux bases, et il est obligatoire. 008 ajoute `exploitation_id` à
  `ruche_evenements`, table créée par 009 ; appliquée avant, 008 échoue (« relation public.ruche_evenements does not exist »).
- 000 recrée la base telle qu'elle était au 3 novembre 2026 après 007 ; 004 à 007 sont relançables et n'y changent rien.
- Les migrations 001 à 003 n'existent pas dans ce dépôt : elles sont comprises dans 000.
- `schema.sql` (racine) n'est plus à utiliser : il décrit la toute première version et renvoie ici.
- Ne jamais lancer 000 sur une base qui contient des données.

Contrôle sans toucher aucune base : `node scripts/rejouer-migrations.mjs migrations/releves/<relevé>.json`
(prérequis : `npm i @electric-sql/pglite@0.2` hors du dépôt). Le script rejoue 000 puis les migrations dans l'ordre
ci-dessus sur une base Postgres vide en mémoire, jusqu'à la `derniere_migration` indiquée dans le relevé, et compare la
structure obtenue au relevé (tables, colonnes, vue, fonctions, politiques, espace de stockage).
**« Vérifier » le lance sur chaque relevé de `releves/`** à chaque pull request (IT-02, AP-TECH-015).

| Relevé | Bases | Jusqu'à | Résultat |
|---|---|---|---|
| `structure-2026-11-06.json` | `apidoo` et `apidoo-test` | 011 | aucun écart |
| `structure-2026-11-06-apres-012.json` | `apidoo` et `apidoo-test` | 012 | aucun écart ; les 19 fonctions ont la même empreinte (corps, mode, `search_path`, droits) sur les deux bases |
| `structure-2026-11-06-recette-apres-013.json` | `apidoo-test` seulement | 013 | avant 013 : identique à « apres-012 » ; après : uniquement les ajouts de 013, empreinte de `journaliser_erreur` identique au fichier |
| `structure-2026-11-06-apres-013.json` | `apidoo` et `apidoo-test` | 013 | aucun écart ; production avant 013 identique à « apres-012 », après 013 identique à la recette |
| `structure-2026-11-06-recette-apres-014.json` | `apidoo-test` seulement | 014 | avant 014 : identique à « apres-013 » ; après : uniquement les ajouts de 014 |
| `structure-2026-11-06-recette-apres-015.json` | `apidoo-test` seulement | 015 | avant 015 : six empreintes identiques à « recette-apres-014 » ; après : uniquement les ajouts de 015 ; `controler-structure.mjs` : identique aux fichiers |
| `structure-2026-11-06-recette-apres-016.json` | `apidoo-test` seulement | 016 | avant 016 : six empreintes identiques au rejeu des fichiers 000 à 015 ; après : six empreintes identiques au rejeu de 000 à 016 (listes lues sur la base) |

## État des migrations

| Fichier | Contenu | `apidoo-test` (recette) | `apidoo` (production) |
|---|---|---|---|
| 000-structure-au-3-nov-2026.sql | Base de départ (état après 007) | 3 nov. 2026 | — (base créée avant ce fichier) |
| 004-photos-visites.sql | Table `visite_photos`, espace « photos-visites », `photos_espace()` | 3 nov. 2026 (regroupée « 004_a_007 ») | 3 nov. 2026 |
| 005-securite-et-ping.sql | `est_membre()` réservée aux connectés, fonction `ping()` | 3 nov. 2026 (regroupée) | 3 nov. 2026 (en deux temps : 005 puis `ping`) |
| 006-hors-ligne.sql | `creer_visite` et `creer_vente` acceptent un identifiant fourni par le téléphone | 3 nov. 2026 (regroupée) | 3 nov. 2026 |
| 007-registre.sql | Visites : dose, fin de traitement prévue, ordonnance gardée | 3 nov. 2026 (regroupée) | 3 nov. 2026 |
| 009-colonie-varroa-recolte-livraison.sql | Reine, hausses, équipement, événements de ruche, méthode varroa, récolte et traçabilité, note de livraison | 3 nov. 2026, partie 6 relancée le 6 nov. 2026 (écart E1 corrigé) | 3 nov. 2026 |
| 008-exploitations.sql | Plusieurs exploitations : membres avec rôles, invitations, données séparées par exploitation | 3 nov. 2026 | présente, **date inconnue** (appliquée hors historique, écart E2) |
| 010-registre-factures.sql | Déplacements et interventions au registre, numéro de facture | 5 nov. 2026 | 5 nov. 2026 |
| 011-invitation-avant-connexion.sql | Le nom de l'exploitation s'affiche sur le lien d'invitation avant la connexion | 5 nov. 2026 | 5 nov. 2026 |
| 012-correctifs.sql | Adresse, code postal, ville, SIRET des clients ; `regler()` (réglages clé par clé) ; `ajouter_stock()` (entrée de stock atomique et idempotente) ; `photos_orphelines()` (lecture seule). Additive, ne casse pas l'ancienne version | 6 nov. 2026 (vérifiée : deux `regler` simultanés gardent les deux clés, refus hors exploitation, `ajouter_stock` renvoyé deux fois = une dépense) | 6 nov. 2026 (IT-02, relevé avant/après : structure identique à la recette) |
| 013-noyau-resume-et-journal.sql | Vue `colonies_resume` (dernière visite, dernier poids, dernier comptage varroa, nombre de visites par colonie ; `security_invoker`) ; table `journal_erreurs` (RLS sans politique : aucun accès par l'API) ; `journaliser_erreur()` (écriture regroupée par minute, e-mails masqués, purge à 90 jours). Additive, ne casse pas l'ancienne version (IT-03) | 6 nov. 2026 (relevé avant/après ; `revoke` de la vue relancé à part après ajout au fichier) | 6 nov. 2026 (accord du responsable ; relevé avant/après, structure identique à la recette) |
| (correction E5, sans fichier) | `revoke execute … from public` sur `creer_visite` et `creer_vente` : aligne la recette sur la production | 6 nov. 2026 (entrée d'historique `e5_retrait_execution_public`) | déjà dans cet état |

| 014-roles-audit.sql | Rôle `lecteur` (politiques séparées lecture / ajout / modification / suppression sur les 16 tables et l'espace photos) ; invitations avec `role`, `usages_max`, `usages`, `revoque_le` (vérifiés par `rejoindre()` ; `invitation_info()` renvoie aussi `etat` et `role`) ; `creer_visite` et `creer_vente` contrôlent ruche, client, articles et lots ; 14 clés étrangères composites « même exploitation » ; `incoherences_exploitation()` ; table `journal_audit` (déclencheur `auditer()`, lecture par les responsables, purge à 1 an) et `restaurer()` ; `exploitations.demo`, `creer_exploitation_demo()`, `indicateurs_usage()` ; `empreinte_structure()` (lisible sans connexion, empreintes md5 seulement). Additive, ne casse pas l'ancienne version (IT-04) | 6 nov. 2026 (relevé avant/après `releves/structure-2026-11-06-recette-apres-014.json` ; empreintes identiques au rejeu ; aucune incohérence, 14 clés validées) | en place (structure vérifiée le 11 nov. 2026) |
| 015-ruchers.sql | Table `ruchers` (nom unique par exploitation sans tenir compte de la casse ni des espaces, position, accès, propriétaire et téléphone, capacité, environnement, ressources, point d'eau, notes, `archive_le` ; RLS lire / ajouter / modifier / supprimer comme 014 ; audit) ; `ruches.rucher_id` (clé simple et composite « même exploitation ») ; reprise des textes `ruches.rucher` normalisés (graphie la plus fréquente, position moyenne des ruches placées) ; déclencheurs de synchronisation dans les deux sens (`ruches_rucher_sync`, `ruchers_apres`, `ruches_position_rucher`, `ruchers_avant`) ; `creer_rucher()` et `placer_rucher()` (idempotentes, `security invoker`) ; `rucher_cle()`. Additive, **ne casse pas l'ancienne version** : le texte `ruches.rucher` reste rempli et à jour (IT-05) | 6 nov. 2026 (relevé avant/après `releves/structure-2026-11-06-recette-apres-015.json` ; 8 colonies reprises dans 2 ruchers, aucune sans rucher ; aucune incohérence ; renommage et écriture « ancienne version » vérifiés dans un bloc annulé) | en place (structure vérifiée le 11 nov. 2026) |
| 016-emplacements-contenants.sql | Extension `btree_gist` (schéma `extensions`) ; `ruches.statut` (active, orpheline, morte, réunie, vendue, perdue), `origine`, `date_creation`, `code`, reprise depuis `sortie` et déclencheur sortie ↔ statut ; `sortie` accepte « Perdue » ; tables `deplacements`, `colonie_emplacements` (contrainte d'exclusion : pas de chevauchement), `contenants`, `colonie_contenants` (une colonie par caisse et une caisse par colonie à la fois), RLS et audit comme 014 ; `ruche_evenements.deplacement_id` ; reprise des événements « deplacement » de 010 (texte inchangé) et un emplacement ouvert par colonie ; déclencheur de suivi de l'emplacement (y compris l'ancienne version) ; `deplacer_colonies()`, `changer_statut()`, `affecter_contenant()` (idempotentes, `security invoker`), `rucher_a_date()`. Additive, **ne casse pas l'ancienne version** (IT-06) | 6 nov. 2026 (relevé avant/après `releves/structure-2026-11-06-recette-apres-016.json` ; empreintes identiques au rejeu ; 8 emplacements, 0 déplacement à reprendre, registre inchangé ; déplacement essayé dans un bloc annulé) | en place (structure vérifiée le 11 nov. 2026 : `apidoo` en est exactement à 016) |
| 017-associes.sql | `depenses.achete_par` et `ventes.vendu_par` (entre associés : qui a acheté, qui a vendu) ; `creer_vente()` enregistre aussi `vendu_par`. Additive, ne casse pas l'ancienne version | 11 nov. 2026 | 12 nov. 2026 (empreinte identique au rejeu après 017) |
| 018-stock-mouvements.sql | Catalogue : `articles.famille`, `contenance_g`, `duree_amort`, `poste` (Opex/Capex = `articles.type`), reprise déduite du nom ; `depenses.achat_id`, `piece` (achat en plusieurs lignes) ; table `mouvements_stock` (ouverture, entrée, consommation, ajustement, inventaire, rebut ; origine reprise, achat, visite, mise en pots, saisie ; dépense, lot, visite ; RLS et audit comme 014) ; `articles.stock` = somme des mouvements (déclencheurs `mouvements_appliquer` et `articles_stock_journal`, une écriture directe du stock devient un ajustement) ; `maj_stock_achat`, `maj_stock_intrant`, `ajouter_stock` par des mouvements ; reprise d'un mouvement d'ouverture par article ; `enregistrer_achat()` et `mettre_en_pots()` (idempotentes, `security invoker`) ; `rattachements()` + 3. Additive, **ne casse pas l'ancienne version** (v5.30) | 11 nov. 2026, relevé `structure-2026-11-11-recette-apres-019.json` | 12 nov. 2026, accord de Pierre-Louis (empreinte identique au rejeu après 018 ; stock inchangé, 257, repris en 3 mouvements d'ouverture) |
| 019-reines-liens.sql | Tables `reines` (année de naissance, marquage, origine, en place du … au …, statut, clippée, notes ; une seule « en place » par colonie) et `colonie_liens` (parent, enfant, division / essaim / réunion, date, événement ; anti-cycle sur la descendance) ; RLS et audit comme 014 ; `couleur_marquage()`, `changer_reine()`, `corriger_reine()` (idempotentes, `security invoker`) ; déclencheurs `ruches_reine` (l'ancienne version écrit encore `annee_reine`) et `lien` sur `ruche_evenements` ; reprise depuis `annee_reine` / `reine_origine` / `reine_introduite` et `autre_ruche_id`. Additive, ne casse pas l'ancienne version | 11 nov. 2026, relevé `structure-2026-11-11-recette-apres-019.json` | 12 nov. 2026, accord de Pierre-Louis (empreinte identique au rejeu après 019 ; 1 reine reprise, 0 lien, aucune incohérence) |

En attente pour la production : aucune. Le 12 nov. 2026, avec l'accord de Pierre-Louis, 017, 018 et 019 ont été appliquées sur `apidoo` une par une, l'empreinte de structure vérifiée identique au rejeu des fichiers après chacune ; données inchangées (6 ruches, 3 articles, stock 257, 3 dépenses).
`select * from public.incoherences_exploitation();` **après** la migration (ou la requête équivalente avant) : une ligne
non nulle signifie qu'une clé composite est restée « non validée » (la migration passe quand même et l'écrit en
avertissement). Production relevée le 6 nov. 2026 : 0 visite, 0 vente, 7 récoltes, 1 dépense, aucune donnée d'une autre
exploitation possible (une seule exploitation).

Tests SQL sur une base en mémoire (IT-04, AP-FEAT-008) : `sh tests/sql/lancer.sh` lance tous les `tests/sql/test_*.mjs` et
les contrôles de structure ; « Vérifier » les lance dans un job à part (« Tests SQL »).

| Fichier | Ce qu'il vérifie |
|---|---|
| `tests/sql/socle.mjs` | Socle commun : Postgres en mémoire, `auth.jwt()` simulé, ordre des migrations, deux exploitations avec une ligne dans chaque table |
| `test_isolation.mjs` | Matrice tables × rôles × opérations (360 vérifications depuis 016) : un membre de A avec l'en-tête de B ne lit ni n'écrit rien ; membre écrit, lecteur non ; fonctions refusées au lecteur ; rattachements croisés refusés ; visiteur non connecté |
| `test_014.mjs` | Relance de 010 à 014, invitations (usage unique, révocation, expiration, liens anciens), audit et restauration, purge, migration sur données incohérentes, démo, empreinte |
| `test_016.mjs` | Relance de 016, reprise (sortie → statut, événements « deplacement » de 010, emplacements), registre identique avant/après, déplacement de 12 colonies atomique et idempotent, chevauchement refusé, `rucher_a_date`, ancienne version (texte du rucher, sortie), statut, ruches physiques (transfert, occupation), lecteur et autre exploitation refusés |
| `test_018.mjs` | Reprise (famille, contenance, mouvement d'ouverture sans double compte), stock = somme des mouvements après achat (créé, modifié, supprimé), visite, entrée, écriture directe de l'ancienne version, mise en pots et correction à la main ; achat en plusieurs lignes (Opex, Capex, service, nouvel article) ; mise en pots tout ou rien ; idempotence ; lecteur et autre exploitation refusés |
| `test_019.mjs` | Reprise des reines et des liens sur un jeu varié, relance, couleur de marquage, `changer_reine` (clôture, idempotence, contrôles, tout ou rien), une seule reine en place, `corriger_reine`, écriture directe de `annee_reine` par l'ancienne version, liens créés par le journal, anti-cycle, lecteur, visiteur, autre exploitation |
| `test_appliquer.mjs` | Mise à jour automatique d'une base (`scripts/appliquer-migrations.mjs`) : base reconnue à sa structure (016, ou 017 avec une fonction indentée autrement), seules les migrations suivantes appliquées, simulation sans écriture, relance sans rien rejouer, base modifiée à la main refusée, migration en échec annulée en entier puis reprise |
| `test_015.mjs` | Relance de 015, reprise sur un jeu varié (casse, espaces, vide), renommage d'un rucher de 8 colonies, écriture de l'ancienne version par le texte, archivage, position, `creer_rucher` et `placer_rucher` (idempotence, lecteur refusé), rattachement croisé refusé |
| `test_demo.mjs` | Chargement de l'exploitation de démonstration par les mêmes opérations que `scripts/demo.mjs` |
| `test_012.mjs`, `test_013.mjs`, `test_donnees_essai.mjs` | Migrations 012 et 013, scripts d'essai de `tests/production` |

Ajouter une migration : l'ajouter à `ORDRE` dans `tests/sql/socle.mjs` **et** dans `scripts/rejouer-migrations.mjs`,
et à `RELANCABLES` si elle est relançable. La matrice d'isolation doit rester verte ; toute nouvelle table qui porte
`exploitation_id` s'ajoute à `TABLES` et à `donnees()` du socle.

**Contrôle de structure avant production** (AP-TECH-042) : `node scripts/controler-structure.mjs config.js` rejoue les
migrations en mémoire et compare `empreinte_structure()` à la base de production, avec la clé publique (aucune écriture).
La mise en ligne en production le lance et refuse de partir en cas d'écart ; la case « migrations faites » a disparu.

## Relevé des deux bases — 6 novembre 2026

Fait en lecture seule (requêtes `select` sur les catalogues et `count(*)`), sur `apidoo` (`xkucyqzlqfeyuomrtjbu`)
et `apidoo-test` (`zaaaiqyhxehvgowlgztx`). Structure détaillée : `releves/structure-2026-11-06.json`.

### Structure

Empreintes calculées catégorie par catégorie sur les deux bases :

| Catégorie | Nombre | Identique sur les deux bases |
|---|---|---|
| Colonnes (`public`) | 186 | oui |
| Contraintes | 82 | oui |
| Index | 55 | oui |
| Déclencheurs | 5 | oui |
| Vue (`lots_stock`, `security_invoker`) | 1 | oui |
| Politiques RLS (`public` et `storage`) | 27 | oui |
| Tables avec RLS activée | 20 sur 20 | oui |
| Droits accordés à `anon` et `authenticated` | 40 | oui |
| Espace de stockage (`photos-visites`, privé, 2 Mo, jpeg/webp) | 1 | oui |
| Fonctions | 16 | **non** : 10 ne diffèrent que par les fins de ligne Windows (texte collé dans l'éditeur SQL), **2 diffèrent vraiment** (écart E1) |

Les 16 fonctions ont toutes `search_path` fixé à vide. En `security definer` : `est_membre`, `est_responsable`,
`mes_exploitations`, `creer_exploitation`, `rejoindre`, `invitation_info`, `peut_photo`, `photos_espace`.
En `security invoker` : `creer_visite`, `creer_vente`, `numeroter_facture`, `exploitation_courante`, `mon_email`,
`ping`, `maj_stock_intrant`, `maj_stock_achat`.

### Politiques RLS (identiques sur les deux bases)

Toutes s'appliquent au rôle `authenticated` ; `anon` n'a aucune politique, donc aucun accès aux lignes.

| Table | Politique | Opération | Règle |
|---|---|---|---|
| `articles`, `budgets`, `clients`, `depenses`, `fournisseurs`, `lots`, `recoltes`, `reglages`, `ruche_evenements`, `ruches`, `taches`, `vente_lignes`, `ventes`, `visite_intrants`, `visite_photos`, `visites` | `exploitation_courante` | toutes | `exploitation_id = (select exploitation_courante())`, en lecture comme en écriture |
| `exploitations` | `voir` | lecture | `est_membre(id)` |
| `exploitations` | `renommer` | modification | `est_responsable(id)` |
| `invitations` | `responsables` | toutes | `est_responsable(exploitation_id)` |
| `membres` | `voir` | lecture | `est_membre(exploitation_id)` |
| `membres` | `ajouter` | ajout | responsable de l'exploitation, et rôle `membre` seulement |
| `membres` | `changer` | modification | responsable, et pas sa propre ligne |
| `membres` | `retirer` | suppression | responsable (pas sa propre ligne), ou un membre qui se retire lui-même |
| `membres_v1` | aucune | — | RLS activée sans politique : plus aucun accès (ancienne liste gardée pour mémoire par 008) |
| `storage.objects` | `photos_visites_lire`, `_ajouter`, `_modifier`, `_supprimer` | chacune la sienne | espace `photos-visites` et `peut_photo(name)` (le dossier de la photo appartient à l'exploitation courante) |

### Plafond de lignes et inscriptions

Relevés par Pierre-Louis dans le tableau de bord Supabase le 6 nov. 2026 (non lisibles en SQL) :

| Réglage | `apidoo` | `apidoo-test` |
|---|---|---|
| Settings › API › Max rows | **1 000** | **1 000** |
| Authentication › « Allow new users to sign up » | **activé** | **activé** |

Conséquence du plafond : une requête de `loadAll()` ne renvoie jamais plus de 1 000 lignes, sans erreur.
La plus grosse table compte aujourd'hui 8 lignes : aucun risque immédiat, voir AP-BUG-002 (IT-01).

### Volumétrie (nombre exact de lignes)

| Table | `apidoo` | `apidoo-test` |
|---|---|---|
| `exploitations` | 1 | 2 |
| `membres` | 2 | 6 |
| `membres_v1` | 2 | 5 |
| `invitations` | 0 | 0 |
| `ruches` | 6 | 8 |
| `ruche_evenements` | 0 | 0 |
| `visites` | 0 | 2 |
| `visite_intrants` | 0 | 1 |
| `visite_photos` | 0 | 0 |
| `recoltes` | 7 | 1 |
| `lots` | 2 | 1 |
| `clients` | 1 | 2 |
| `ventes` | 0 | 2 |
| `vente_lignes` | 0 | 2 |
| `depenses` | 1 | 1 |
| `fournisseurs` | 0 | 1 |
| `articles` | 2 | 1 |
| `taches` | 0 | 1 |
| `budgets` | 0 | 1 |
| `reglages` | 1 | 2 |
| Espace photos : fichiers / octets | 0 / 0 | 0 / 0 |
| Comptes (`auth.users`) | 3 | 1 |

### Écarts constatés

- **E1 — Recette : `creer_visite` et `creer_vente` en retard sur 009.** Sur `apidoo-test`, la 009 enregistrée dans
  l'historique ne contient pas la nouvelle version de ces deux fonctions (section 6 du fichier). Les colonnes
  existent, mais la recette n'enregistre pas `varroa_methode` ni `varroa_abeilles` à la création d'une visite, ni
  `livraison` à la création d'une vente : ces valeurs envoyées par l'application sont ignorées sans message.
  La production et les fichiers ont la bonne version. Correction proposée (hors périmètre d'IT-00) :
  relancer `009-colonie-varroa-recolte-livraison.sql` sur `apidoo-test` (relançable, n'ajoute rien d'autre). Suivi : AP-BUG-008.
  **Corrigé le 6 nov. 2026** (accord du responsable) en relançant **la partie 6 seulement** (entrée d'historique
  `009_relance_fonctions_ap_bug_008`) ; empreintes de `creer_visite` et `creer_vente` identiques à la production.
  Attention : « relançable » n'est vrai que sur une base sans 008. Après 008, relancer 009 en entier remettrait la vue
  `lots_stock` en version 009 et recréerait des politiques `membres_tout` (avec `est_membre()`, supprimée par 008) ;
  un essai a échoué sur ce point et a été entièrement annulé.
- **E2 — Production : 008 absente de l'historique des migrations.** La structure de 008 est bien en place, mais elle a
  été appliquée par l'éditeur SQL : sa date n'est pas connue. Aucune action nécessaire ; à savoir avant tout outil
  qui se fierait à l'historique de Supabase.
- **E3 — Fins de ligne.** 10 fonctions de la production ont des fins de ligne Windows. Sans effet sur le comportement.
- **E4 — Historiques différents.** La recette regroupe 004 à 007 en une seule entrée ; la production sépare 006 en deux
  (`006_ping`, `006_hors_ligne`). Sans effet : seule la structure compte, et elle est identique.
- **E5 — Recette : `creer_visite` et `creer_vente` exécutables par tous (`PUBLIC`).** Constaté le 6 nov. 2026, antérieur
  à la correction de E1 (droits conservés par `create or replace`). La production ne donne ce droit qu'à `authenticated`
  et `service_role`. Sans effet pratique (security invoker, aucune politique pour `anon`). Correction possible :
  `revoke execute on function public.creer_visite(jsonb), public.creer_vente(jsonb) from public;` sur `apidoo-test`
  (accord requis). **Corrigé le 6 nov. 2026** (IT-02, accord du responsable) : vérifié ensuite, `anon` ne peut plus
  les exécuter, `authenticated` et `service_role` oui, comme en production. `maj_stock_achat`, `maj_stock_intrant` et `numeroter_facture` sont exécutables par tous sur les deux bases.

### Points de vigilance (hors périmètre, à décider)

- Inscriptions ouvertes sur les deux projets : la production compte 3 comptes pour 2 membres. Un inconnu peut créer un
  compte et sa propre exploitation (`creer_exploitation`), sans voir les données des autres (RLS).
- Le rôle `anon` garde sur toutes les tables les droits accordés par défaut par Supabase (y compris `TRUNCATE`, que la RLS
  ne couvre pas). L'API REST ne propose pas `TRUNCATE` ; un retrait de ces droits serait plus sûr (AP-EPIC-004).
- `membres_v1` peut être supprimée une fois la bascule vers 008 confirmée sans retour arrière.
