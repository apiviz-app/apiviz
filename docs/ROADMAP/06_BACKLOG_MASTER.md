<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# 06 — Backlog master

**Source de vérité** du projet. Les fiches d'itérations et les prompts renvoient à ces identifiants.

Statuts de départ : ceux de l'audit (`01_AUDIT_EXISTANT.md`). Valeur métier 1–5 · Complexité XS/S/M/L/XL · Risque de réalisation Faible/Moyen/Élevé.

Conventions de mise à jour : voir `README.md` §3.


**Totaux :** 19 domaines · 47 epics · 125 fonctionnalités · 8 anomalies · 141 user stories · 408 tâches techniques (révision du 6 nov. 2026 « application web et stores » : AP-FEAT-122 à 125, AP-US-136 à 141, AP-TECH-380 à 408 ; voir `12_DISTRIBUTION_ET_MONETISATION.md`).


## Sommaire

- **D01 Socle technique et qualité** : AP-EPIC-001 Maîtrise de l'existant, AP-EPIC-002 Noyau applicatif et performance, AP-EPIC-035 Qualité et tests, AP-EPIC-036 Supervision et exploitation, AP-EPIC-039 Données de démonstration
- **D02 Comptes, exploitations et sécurité** : AP-EPIC-003 Exploitations, membres et rôles, AP-EPIC-004 Sécurité, confidentialité et RGPD
- **D03 Ruchers et emplacements** : AP-EPIC-005 Ruchers en entité, AP-EPIC-006 Emplacements et transhumance
- **D04 Colonies, ruches physiques et reines** : AP-EPIC-007 Colonies et contenants, AP-EPIC-008 Reines, AP-EPIC-009 Fiche colonie et historique biologique
- **D05 Visites et terrain** : AP-EPIC-010 Visite rapide et modèles, AP-EPIC-011 Tournée et visites en série, AP-EPIC-012 Hors ligne et synchronisation, AP-EPIC-013 Photos, voix et QR codes
- **D06 Santé, varroa et traitements** : AP-EPIC-014 Suivi varroa, AP-EPIC-015 Traitements, AP-EPIC-016 Maladies et observations sanitaires
- **D07 Nourrissement** : AP-EPIC-017 Nourrissement
- **D08 Multiplication et élevage** : AP-EPIC-018 Événements biologiques, AP-EPIC-019 Généalogie, AP-EPIC-020 Élevage des reines, AP-EPIC-021 Sélection et lignées
- **D09 Production et traçabilité** : AP-EPIC-022 Récolte et extraction, AP-EPIC-023 Lots et traçabilité, AP-EPIC-038 Étiquetage
- **D10 Matériel et stocks** : AP-EPIC-024 Stocks et mouvements, AP-EPIC-025 Matériel et équipements
- **D11 Finances** : AP-EPIC-026 Dépenses, recettes et budget, AP-EPIC-027 Coûts de production et rentabilité
- **D12 Clients et commercialisation** : AP-EPIC-028 Clients, produits et commandes, AP-EPIC-029 Factures et paiements
- **D13 Calendrier, tâches et rappels** : AP-EPIC-030 Tâches et calendrier, AP-EPIC-031 Rappels et notifications
- **D14 Météo et environnement** : AP-EPIC-032 Météo et environnement
- **D15 Réglementation et documents** : AP-EPIC-033 Déclaration et registre, AP-EPIC-034 Documents et justificatifs, AP-EPIC-037 Exports et portabilité
- **D16 Pilotage et tableau de bord** : AP-EPIC-040 Tableau de bord, AP-EPIC-041 Statistiques et comparaisons
- **D17 Assistant intelligent API** : AP-EPIC-042 Assistant en lecture, AP-EPIC-043 Assistant : actions et analyses
- **D18 Expérience utilisateur transversale** : AP-EPIC-044 Navigation, cohérence et ton, AP-EPIC-045 Prise en main, aide et recherche
- **D19 SaaS et distribution** : AP-EPIC-046 Plans et abonnements, AP-EPIC-047 Distribution et international

---

# D01 — Socle technique et qualité


## AP-EPIC-001 — Maîtrise de l'existant

Rendre le code et la base lisibles, documentés et alignés avec la réalité, puis réunifier recette et production.


### AP-FEAT-001 — Source lisible du cœur app.js

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-001 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-00-mise-a-plat` (v5.15), en attente de fusion puis de recette |
| Priorité | P0 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-00](ITERATIONS/ITERATION_00.md) |
| Dépendances | — |
| Modules impactés | `app.js` |

**Description.** Remplacer le fichier minifié par une source lisible, versionnée et relisible en revue.

**Problème résolu.** Aucune correction du cœur n'est relisible ; le risque de régression est maximal.

**Risques.** Dé-minification qui modifie le comportement.

**Tests nécessaires.** 18 tests e2e avant/après ; diff fonctionnel nul.

**User stories et critères d'acceptation**

- **AP-US-001** — En tant que développeur, je veux disposer de la source lisible de app.js afin de corriger le cœur sans risque.
  - GIVEN la source d'origine existe chez le responsable · WHEN elle est committée à la place du fichier minifié · THEN les 18 tests passent sans modification
  - GIVEN la source d'origine est introuvable · WHEN le fichier est reformaté (Prettier) et les variables courtes renommées par lots · THEN chaque lot de renommage est un commit séparé et les tests passent

**Tâches techniques**

- AP-TECH-001 — Demander la source d'origine (décision D-01).
- AP-TECH-002 — À défaut : formater avec Prettier, renommer les identifiants d'une lettre par écran.
- AP-TECH-003 — Ajouter un en-tête expliquant la provenance.
- AP-TECH-004 — Lancer les 18 tests.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-003 — Documentation de base fidèle

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-001 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-00-mise-a-plat` (v5.15), en attente de fusion puis de recette |
| Priorité | P0 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-00](ITERATIONS/ITERATION_00.md) |
| Dépendances | — |
| Modules impactés | `schema.sql`, `migrations/README.md`, `migrations/a-appliquer-en-production.txt`, `docs/TECHNIQUE.md` |

**Description.** Remplacer schema.sql obsolète, aligner migrations/README.md et la liste d'attente, documenter l'ordre 009 → 008.

**Problème résolu.** Recréer une base à partir de schema.sql produit une base fausse.

**Risques.** Aucun.

**Tests nécessaires.** Relecture ; recréation d'une base de test depuis 000 + migrations.

**User stories et critères d'acceptation**

- **AP-US-002** — En tant que développeur, je veux un point d'entrée unique et exact pour recréer la base afin de monter un environnement de test fiable.
  - GIVEN un projet Supabase vide · WHEN j'applique 000 puis les migrations dans l'ordre documenté · THEN la structure obtenue est identique au relevé de la recette

**Tâches techniques**

- AP-TECH-005 — Remplacer schema.sql par un renvoi vers 000 + migrations.
- AP-TECH-006 — Corriger les statuts de 010 et 011.
- AP-TECH-007 — Documenter l'ordre 009 puis 008.
- AP-TECH-008 — Mettre à jour docs/TECHNIQUE.md (liste des modules).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-004 — Relevé de l'état réel des bases

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-001 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-00-mise-a-plat` (v5.15), en attente de fusion puis de recette |
| Priorité | P0 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-00](ITERATIONS/ITERATION_00.md) |
| Dépendances | — |
| Modules impactés | `migrations/README.md` |

**Description.** Relever, en lecture seule, structure, migrations appliquées, plafond de lignes, réglages Auth et volumétrie des deux projets.

**Problème résolu.** On ne sait pas exactement ce qui tourne en production ; une migration peut être appliquée deux fois ou oubliée.

**Risques.** Lecture sur la mauvaise base.

**Tests nécessaires.** Comparaison automatique relevé ↔ fichiers.

**User stories et critères d'acceptation**

- **AP-US-003** — En tant que responsable d'exploitation, je veux savoir quelles migrations sont appliquées sur chaque base afin de décider de la bascule en connaissance de cause.
  - GIVEN l'accès en lecture aux deux projets · WHEN le relevé est fait · THEN migrations/README.md indique pour chaque migration l'état réel daté, et les écarts sont listés
- **AP-US-004** — En tant que développeur, je veux connaître le plafond de lignes de l'API afin d'évaluer le risque de données tronquées.
  - GIVEN le relevé est fait · WHEN je consulte le rapport · THEN il indique Max rows de chaque projet et le nombre de lignes des plus grosses tables

**Tâches techniques**

- AP-TECH-009 — Compléter le relevé du 5 nov. 2026 (tables, fonctions, volumétrie faits) par les politiques RLS détaillées.
- AP-TECH-010 — Relever Max rows (tableau de bord Supabase › API) et réglages Auth (inscriptions ouvertes ?).
- AP-TECH-011 — Compter les lignes par table et l'espace photos.
- AP-TECH-012 — Écrire le rapport dans migrations/README.md.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-008 — Recette : méthode varroa et livraison non enregistrées

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-001 |
| Statut actuel | EN PRODUCTION — corrigé le 6 nov. 2026 sur `apidoo-test` (partie 6 de 009 seulement, voir description) ; constaté au relevé du 6 nov. 2026 (IT-00, écart E1) |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | AP-FEAT-004 |
| Modules impactés | base `apidoo-test`, `migrations/009` |

**Description.** Sur `apidoo-test`, la 009 enregistrée ne contient pas la section 6 (nouvelles versions de `creer_visite` et `creer_vente`). Correction : relancer **la partie 6 seulement** de `009-colonie-varroa-recolte-livraison.sql` sur `apidoo-test`. Relancer le fichier entier est **à proscrire** sur une base où 008 est passée : il remettrait la vue `lots_stock` en version 009 et tenterait de recréer les politiques `membres_tout` avec `est_membre()`, que 008 a supprimée (essai du 6 nov. 2026 : échec, entièrement annulé).

**Problème résolu.** En recette, `varroa_methode`, `varroa_abeilles` (visite) et `livraison` (vente) sont ignorés sans message : une vérification faite en recette peut conclure à tort à un défaut de l'application, ou masquer un vrai défaut. La production est correcte.

**Risques.** Aucun sur les données : la fonction remplacée est celle des fichiers et de la production.

**Tests nécessaires.** Après correction, empreinte des fonctions identique entre les deux bases (requête du relevé) ; une visite avec méthode varroa saisie en recette garde la méthode.

**User stories et critères d'acceptation**

- **AP-US-135** — En tant que responsable d'exploitation, je veux que la recette se comporte comme la production afin que mes vérifications soient fiables.
  - GIVEN la 009 relancée sur `apidoo-test` · WHEN je compare les empreintes des fonctions des deux bases (fins de ligne ignorées) · THEN elles sont identiques

**Tâches techniques**

- AP-TECH-378 — ~~Relancer 009 sur `apidoo-test`~~ Fait le 6 nov. 2026 avec l'accord du responsable : partie 6 de 009 (`creer_visite`, `creer_vente`), entrée d'historique `009_relance_fonctions_ap_bug_008` ; empreintes identiques à la production.
- AP-TECH-379 — Ajouter à la vérification de mise en ligne une comparaison d'empreintes des fonctions entre recette et production.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-005 — Réalignement base de production / version publiée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-001 |
| Statut actuel | FAIT (6 nov. 2026, IT-02) — 010, 011 et 012 sur les deux bases, structure identique aux fichiers ; déplacement, intervention et facture validés en production ; CHANGELOG, GUIDE et contrôle de structure à jour. v5.16 publiée en recette puis en production le 6 nov. 2026 |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-02](ITERATIONS/ITERATION_02.md) |
| Dépendances | AP-FEAT-004, AP-FEAT-006, AP-BUG-001 |
| Modules impactés | `migrations`, `mise-en-ligne.yml`, `docs/PROCESSUS.md` |

**Description.** Appliquer 010, 011, 012 sur les deux bases (la v5.14 est déjà publiée en production avec 008) et corriger la documentation d'état.

**Problème résolu.** La version publiée appelle des colonnes et fonctions absentes (010) : déplacements, interventions et factures échouent en production ; la documentation dit l'inverse de la réalité.

**Risques.** Écart non détecté.

**Tests nécessaires.** Relevé de structure avant/après.

**User stories et critères d'acceptation**

- **AP-US-005** — En tant que responsable d'exploitation, je veux que la base de production corresponde à la version publiée afin que toutes les fonctions visibles marchent.
  - GIVEN la v5.14 publiée et une sauvegarde du jour · WHEN j'applique 010, 011 et 012 sur apidoo · THEN Déplacer des ruches, Noter une intervention et Créer la facture fonctionnent en production
  - GIVEN le relevé après migration · WHEN je compare apidoo et apidoo-test · THEN les deux structures sont identiques et migrations/README.md l'indique avec la date

**Tâches techniques**

- AP-TECH-013 — Appliquer 010 puis 011 sur apidoo-test, puis sur apidoo (accord du responsable). **Fait le 5 nov. 2026.**
- AP-TECH-014 — Corriger migrations/README.md, a-appliquer-en-production.txt et les statuts « à essayer en recette » du CHANGELOG. **Fait le 6 nov. 2026 (IT-02)** ; 012 appliquée sur `apidoo` le même jour, liste d'attente vide.
- AP-TECH-015 — Ajouter au workflow de mise en ligne un contrôle automatique de structure (IT-04). **Partiel, 6 nov. 2026 (IT-02)** : « Vérifier » rejoue les migrations et compare à chaque relevé de `migrations/releves/` ; la comparaison directe avec les bases réelles reste pour IT-04 (secret de connexion).
- AP-TECH-016 — Mettre à jour GUIDE.md (v5). **Fait le 6 nov. 2026 (IT-02).**
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-002 — Noyau applicatif et performance

Remplacer l'empilement de surcharges par un noyau d'écrans enregistrés et une couche de données ciblée.


### AP-FEAT-002 — Noyau d'écrans enregistrés

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-002 |
| Statut actuel | FAIT — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : table des écrans (src/noyau/routeur.js), 30 écrans enregistrés une fois dans src/domaines/*/ecrans.js, crochets à la place des surcharges, plus aucune réaffectation de window.render/shell/view* ; scénario etapes_nk |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-001 |
| Modules impactés | `index.html`, `app.js`, `tous les modules` |

**Description.** Routeur et table d'écrans uniques ; chaque écran a une seule implémentation ; actions par écran.

**Problème résolu.** Sept surcharges de render() et cinq de shell() rendent chaque évolution risquée.

**Risques.** Régression d'écran peu couvert.

**Tests nécessaires.** 18 e2e + captures.

**User stories et critères d'acceptation**

- **AP-US-006** — En tant que développeur, je veux enregistrer un écran à un seul endroit afin de le modifier sans effet de bord.
  - GIVEN le noyau en place · WHEN j'enregistre l'écran « ruches » · THEN render() l'utilise et aucune autre définition n'est appelée
  - GIVEN un écran pas encore migré · WHEN j'y navigue · THEN l'ancien chemin est utilisé, sans erreur
- **AP-US-007** — En tant qu'apiculteur, je veux une application qui se comporte toujours pareil afin de ne pas être surpris.
  - GIVEN une même action ouverte depuis l'accueil, la fiche ou le bouton API · WHEN je l'utilise · THEN le même formulaire s'ouvre avec les mêmes valeurs

**Tâches techniques**

- AP-TECH-017 — Créer src/noyau (routeur, état, actions, composants, format).
- AP-TECH-018 — Passer index.html en modules ES.
- AP-TECH-019 — Migrer écran par écran, un commit chacun.
- AP-TECH-020 — Supprimer les réaffectations window.*.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-007 — Retrait des modules et écrans obsolètes

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-002 |
| Statut actuel | PARTIEL — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : code recouvert retiré après mesure de couverture (≈ 330 lignes : écrans d'app.js, ux.js, nav4.js, v3.js) ; aucun module entier n'est obsolète (chacun porte encore un écran ou un service). Purge des règles CSS orphelines : IT-03b |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `ux.js`, `nav4.js`, `app.js`, `index.html`, `sw.js` |

**Description.** Supprimer les implémentations recouvertes (écrans de app.js, ux.js, nav4.js) et les styles inutilisés.

**Problème résolu.** Code mort et CSS en couches alourdissent l'app et trompent les relecteurs.

**Risques.** Suppression d'un code encore appelé.

**Tests nécessaires.** Couverture de code e2e (Chrome) avant suppression.

**User stories et critères d'acceptation**

- **AP-US-008** — En tant que développeur, je veux ne garder que le code exécuté afin de maintenir moins de code.
  - GIVEN la couverture des 18 tests · WHEN une fonction n'est jamais appelée et est recouverte · THEN elle est supprimée et les tests passent

**Tâches techniques**

- AP-TECH-021 — Mesurer la couverture JS avec Playwright.
- AP-TECH-022 — Supprimer par module, un commit chacun.
- AP-TECH-023 — Retirer les fichiers de index.html et sw.js.
- AP-TECH-024 — Purger les règles CSS orphelines.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-014 — Chargement ciblé et paginé des données

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-002 |
| Statut actuel | PARTIEL — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : une seule requête après une visite (scénario etapes_dl), vue colonies_resume en base (013). Lecture ciblée et paginée par domaine (src/donnees/acces.js, AP-TECH-026/027) : IT-03b |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-002, AP-BUG-002 |
| Modules impactés | `app.js loadAll/refresh`, `offline.js`, `v3.js` |

**Description.** Remplacer loadAll() par des lectures par domaine, paginées, et la relecture complète après écriture par une mise à jour locale.

**Problème résolu.** Tout est relu à chaque écriture, et au-delà du plafond de lignes les données anciennes disparaissent.

**Risques.** Écran qui affiche des données périmées.

**Tests nécessaires.** Mesure du nombre de requêtes par écriture ; jeu de 5 000 visites.

**User stories et critères d'acceptation**

- **AP-US-009** — En tant qu'apiculteur, je veux une application rapide même avec beaucoup d'historique afin de travailler au rucher sans attendre.
  - GIVEN 300 colonies et 5 000 visites · WHEN j'ouvre l'application · THEN l'accueil s'affiche en moins de 3 s sur une connexion 4G simulée
  - GIVEN je viens d'enregistrer une visite · WHEN l'écran se met à jour · THEN une seule requête est faite, pas une relecture de toutes les tables

**Tâches techniques**

- AP-TECH-025 — Vue colonies_resume.
- AP-TECH-026 — Module donnees/acces.js (lire, paginer, mettre à jour l'état).
- AP-TECH-027 — Migration domaine par domaine.
- AP-TECH-028 — Mesure en CI du nombre de requêtes.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-015 — Styles par composant

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-002 |
| Statut actuel | PARTIEL — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : styles sortis d'index.html (styles/jetons.css, composant Feuille, 35 rubriques dans l'ordre de la cascade), regroupés à l'assemblage ; découpage par composant des autres règles et suppression des règles redéfinies (AP-TECH-031) : IT-03b |
| Priorité | P2 |
| Valeur métier | 2/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `index.html`, `styles/` |

**Description.** Extraire les styles d'index.html en jetons, composants et écrans, au fil de la migration des écrans.

**Problème résolu.** 35 couches de styles se redéfinissent ; chaque retouche visuelle a des effets ailleurs.

**Risques.** Régression visuelle.

**Tests nécessaires.** Captures de référence.

**User stories et critères d'acceptation**

- **AP-US-010** — En tant que développeur, je veux modifier un composant à un seul endroit afin de garder une interface cohérente.
  - GIVEN le composant Feuille migré · WHEN je change sa marge · THEN seules les feuilles changent sur les captures

**Tâches techniques**

- AP-TECH-029 — Créer styles/jetons.css (couleurs, espaces, rayons).
- AP-TECH-030 — Extraire par composant avec l'écran migré.
- AP-TECH-031 — Supprimer les règles redéfinies.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-017 — Service worker à liste générée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-002 |
| Statut actuel | FAIT — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : liste et version (date + commit) générées à l'assemblage (scripts/generer-coquille.py), test unitaire et ouverture hors ligne vérifiée par etapes_hl sur le site assemblé |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Moyen |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | — |
| Modules impactés | `sw.js`, `scripts/assembler-site.sh` |

**Description.** Générer la liste des fichiers à garder hors ligne et la version depuis index.html à l'assemblage.

**Problème résolu.** Un module oublié dans sw.js casse l'app hors ligne sans que les tests le voient.

**Risques.** Cache invalide.

**Tests nécessaires.** Test e2e hors ligne après assemblage.

**User stories et critères d'acceptation**

- **AP-US-011** — En tant que développeur, je veux ne plus maintenir sw.js à la main afin d'éviter un oubli.
  - GIVEN un nouveau fichier ajouté à index.html · WHEN le site est assemblé · THEN sw.js le contient et la version change

**Tâches techniques**

- AP-TECH-032 — Script d'assemblage : extraire les scripts et styles de index.html.
- AP-TECH-033 — Version = date + commit.
- AP-TECH-034 — Test e2e : ouverture hors ligne.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-002 — Données tronquées au-delà du plafond de lignes

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-002 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : lecture paginée de toutes les tables, scénario etapes_pg |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | AP-FEAT-004 |
| Modules impactés | `app.js loadAll` |

**Description.** Détecter et signaler immédiatement le plafond atteint ; pagination des tables à forte croissance (visites, intrants, lignes de vente).

**Problème résolu.** Au-delà de la limite de l'API, les données anciennes disparaissent silencieusement des écrans et du registre.

**Risques.** Ralentissement.

**Tests nécessaires.** e2e avec 1 500 visites simulées.

**User stories et critères d'acceptation**

- **AP-US-012** — En tant qu'apiculteur, je veux voir tout mon historique afin d'avoir un registre complet.
  - GIVEN 1 500 visites dans la base et un plafond à 1 000 · WHEN j'ouvre l'application · THEN les 1 500 visites sont chargées (pagination) et le registre les compte toutes

**Tâches techniques**

- AP-TECH-035 — Lecture paginée par range pour visites, visite_intrants, vente_lignes, ruche_evenements.
- AP-TECH-036 — Alerte dans journal_erreurs si une page pleine n'est pas suivie.
- AP-TECH-037 — Test e2e avec mock à plafond.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-035 — Qualité et tests

Tester ce qui ne l'est pas : SQL, RLS, règles métier pures.


### AP-FEAT-008 — Tests SQL et RLS en CI

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-035 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : tests/sql (socle, matrice d'isolation 285 vérifications, 014, démo), job « Tests SQL », contrôle de structure avant production ; en attente de fusion |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | AP-FEAT-003 |
| Modules impactés | `tests/sql`, `.github/workflows/verifier.yml` |

**Description.** Lancer un Postgres local en CI, appliquer 000 + migrations, et vérifier politiques, fonctions et contraintes.

**Problème résolu.** Une régression de règle d'accès passerait la CI actuelle (base simulée).

**Risques.** Écart entre Supabase et Postgres pur (auth.jwt, storage).

**Tests nécessaires.** La suite elle-même.

**User stories et critères d'acceptation**

- **AP-US-013** — En tant que développeur, je veux un test qui échoue si une exploitation voit les données d'une autre afin de ne jamais livrer une fuite.
  - GIVEN deux exploitations A et B avec des données · WHEN un membre de A lit chaque table avec l'en-tête de B · THEN aucune ligne n'est renvoyée et toute écriture est refusée
  - GIVEN une migration nouvelle · WHEN la CI tourne · THEN 000 + toutes les migrations s'appliquent deux fois sans erreur (relançables)

**Tâches techniques**

- AP-TECH-038 — Image Postgres avec schéma auth simulé (auth.jwt via request.jwt.claims).
- AP-TECH-039 — Scripts de test en SQL (assertions) ou pgTAP.
- AP-TECH-040 — Matrice tables × rôles × opérations.
- AP-TECH-041 — Job CI dédié.
- AP-TECH-042 — Contrôle automatique de structure avant mise en ligne production (remplace la case « migrations faites »).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-013 — Tests unitaires des règles métier

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-035 |
| Statut actuel | FAIT — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : fin, rythme, taux varroa, créneaux météo, formats dans src/ ; tests node --test dans « Vérifier » (moins d'une seconde) |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `src/noyau/format.js`, `src/domaines/*/regles.js`, `tests/unitaires` |

**Description.** Tester sans navigateur les fonctions pures : formats, finances (fin, rythme), taux varroa, créneaux météo, numérotation.

**Problème résolu.** Les calculs financiers et sanitaires ne sont vérifiés qu'indirectement.

**Risques.** Aucun.

**Tests nécessaires.** node --test en CI.

**User stories et critères d'acceptation**

- **AP-US-014** — En tant que développeur, je veux des tests rapides sur les calculs afin de détecter une erreur de calcul en quelques secondes.
  - GIVEN les fonctions extraites · WHEN je lance npm test · THEN les tests s'exécutent en moins de 10 s, dans la CI aussi

**Tâches techniques**

- AP-TECH-043 — Extraire fin(), rythme(), tauxVarroa(), créneaux.
- AP-TECH-044 — Écrire les tests (cas limites : année vide, division par zéro).
- AP-TECH-045 — Ajouter au workflow Vérifier.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-036 — Supervision et exploitation

Voir les erreurs et la santé du service en production.


### AP-FEAT-006 — Sauvegardes automatiques et restauration testée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-036 |
| Statut actuel | REPORTÉ — décision du 6 nov. 2026 : pas de sauvegarde automatique ni de restauration pour le moment (D-03 non tranchée) |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-02](ITERATIONS/ITERATION_02.md) |
| Dépendances | — |
| Modules impactés | `.github/workflows`, `Supabase` |

**Description.** Sauvegarde quotidienne de la base et des photos, chiffrée, hors du dépôt public, avec procédure de restauration testée.

**Problème résolu.** L'offre gratuite n'a pas de sauvegarde automatique : une erreur de migration est irréversible.

**Risques.** Fuite d'une sauvegarde.

**Tests nécessaires.** Restauration complète sur un projet vide.

**User stories et critères d'acceptation**

- **AP-US-015** — En tant que responsable d'exploitation, je veux une sauvegarde quotidienne restaurable afin de ne jamais perdre les données de l'exploitation.
  - GIVEN la sauvegarde planifiée · WHEN elle s'exécute · THEN un fichier chiffré est déposé hors du dépôt public et l'échec envoie une alerte
  - GIVEN une sauvegarde · WHEN je suis la procédure de restauration · THEN un projet vide retrouve toutes les données et les photos

**Tâches techniques**

- AP-TECH-046 — Choisir le stockage (décision D-03).
- AP-TECH-047 — Workflow planifié pg_dump + copie du stockage, chiffrement (clé en secret).
- AP-TECH-048 — Rétention 30 jours.
- AP-TECH-049 — Procédure écrite et testée dans docs/PROCESSUS.md.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-016 — Journal des erreurs de production

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-036 |
| Statut actuel | FAIT — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : table journal_erreurs et journaliser_erreur() (013, appliquée sur les deux bases), regroupement par minute, e-mails masqués, purge à 90 jours ; scénario etapes_je. Lecture par l'éditeur SQL (écran réservé : hors périmètre, décision du 6 nov. 2026) |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `app.js fail()`, `migrations/013` |

**Description.** Enregistrer les erreurs du navigateur (version, écran, message) dans une table consultable par le responsable technique.

**Problème résolu.** Les erreurs des utilisateurs sont invisibles.

**Risques.** Données personnelles dans les messages.

**Tests nécessaires.** Erreur provoquée en test → ligne créée sans e-mail.

**User stories et critères d'acceptation**

- **AP-US-016** — En tant que développeur, je veux voir les erreurs rencontrées par les utilisateurs afin de corriger avant qu'on me les signale.
  - GIVEN une erreur JavaScript chez un utilisateur · WHEN elle survient · THEN une ligne est écrite avec version, écran et message, sans e-mail ni donnée métier
  - GIVEN 50 erreurs identiques en une minute · WHEN elles surviennent · THEN elles sont regroupées (compteur), pas 50 lignes

**Tâches techniques**

- AP-TECH-050 — Table journal_erreurs (insert seul pour authenticated).
- AP-TECH-051 — window.onerror, unhandledrejection, fail().
- AP-TECH-052 — Écran de lecture réservé.
- AP-TECH-053 — Purge à 90 jours.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-039 — Données de démonstration

Jeux de données reproductibles, clairement séparés des données réelles.


### AP-FEAT-018 — Données de démonstration reproductibles

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D01 Socle technique et qualité |
| Epic parent | AP-EPIC-039 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : tests/demo/exploitation-demo.json, scripts/demo.mjs (refuse la production), exploitations.demo ; chargement sur apidoo-test à faire avec un compte d'essai ; en attente de fusion |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | — |
| Modules impactés | `tests/donnees_v2.txt`, `demarrage.js`, `scripts/` |

**Description.** Un script génère une exploitation de démonstration réaliste (marquée), utilisée par la recette, les tests et le rucher d'exemple.

**Problème résolu.** Les données de test sont dispersées (tests, recette) et le rucher d'exemple est codé dans l'interface.

**Risques.** Données de démo mélangées aux réelles.

**Tests nécessaires.** Indicateurs réels sans ligne de démo.

**User stories et critères d'acceptation**

- **AP-US-017** — En tant que développeur, je veux générer la même exploitation de démonstration partout afin de tester sur des données réalistes.
  - GIVEN le script · WHEN je le lance sur apidoo-test · THEN une exploitation « Démo » est créée avec 3 ruchers, 20 colonies, 2 saisons, marquée demo = true
  - GIVEN la production · WHEN le script est lancé par erreur · THEN il refuse de s'exécuter

**Tâches techniques**

- AP-TECH-054 — Format de données unique (JSON).
- AP-TECH-055 — Script d'insertion via les fonctions SQL.
- AP-TECH-056 — Colonne exploitations.demo.
- AP-TECH-057 — Refus si URL de production.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D02 — Comptes, exploitations et sécurité


## AP-EPIC-003 — Exploitations, membres et rôles

Accès multi-personnes maîtrisé : invitations, rôles, journal.


### AP-FEAT-010 — Invitations maîtrisées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-003 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : rôle et usages du lien, liste des liens actifs, Révoquer, rejoindre() vérifie (014) ; en attente de fusion |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | AP-FEAT-008 |
| Modules impactés | `migrations/014`, `exploitations.js` |

**Description.** Invitation avec rôle choisi, nombre d'usages, expiration et révocation depuis l'app.

**Problème résolu.** Un lien transféré donne un accès complet à n'importe qui pendant 14 jours.

**Risques.** Liens existants rendus invalides.

**Tests nécessaires.** Tests SQL des cas épuisé/révoqué/expiré.

**User stories et critères d'acceptation**

- **AP-US-018** — En tant que responsable d'exploitation, je veux créer un lien valable pour une seule personne afin de contrôler qui rejoint l'exploitation.
  - GIVEN un lien à usage unique · WHEN une deuxième personne l'ouvre · THEN elle voit « Ce lien a déjà servi » et n'est pas ajoutée
  - GIVEN un lien actif · WHEN je le révoque dans Membres · THEN il est refusé immédiatement

**Tâches techniques**

- AP-TECH-058 — Colonnes role, usages_max, usages, revoque_le.
- AP-TECH-059 — rejoindre() les vérifie.
- AP-TECH-060 — Liste des liens actifs avec bouton Révoquer.
- AP-TECH-061 — Liens existants : usages_max null = illimité jusqu'à expiration.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-011 — Rôle lecteur

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-003 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : rôle lecteur appliqué par la base (politiques séparées) et l'interface (liste blanche d'actions) ; en attente de fusion |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | AP-FEAT-008 |
| Modules impactés | `migrations/014`, `politiques RLS`, `interface (boutons masqués)` |

**Description.** Rôle en lecture seule (conjoint, comptable, mentor) appliqué par la base.

**Problème résolu.** Tout invité peut aujourd'hui modifier et supprimer toutes les données.

**Risques.** Bouton visible qui échoue.

**Tests nécessaires.** Tests SQL écriture refusée.

**User stories et critères d'acceptation**

- **AP-US-019** — En tant que responsable d'exploitation, je veux inviter quelqu'un en lecture seule afin de partager sans risque.
  - GIVEN un membre lecteur · WHEN il essaie d'enregistrer une visite · THEN la base refuse et l'interface n'affiche aucun bouton de saisie

**Tâches techniques**

- AP-TECH-062 — Ajouter 'lecteur' au contrôle de rôle.
- AP-TECH-063 — Politiques séparées select / insert-update-delete.
- AP-TECH-064 — Interface : masquer les actions.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-012 — Rôle saisonnier et droits fins

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-003 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-26](ITERATIONS/ITERATION_26.md) |
| Dépendances | AP-FEAT-011 |
| Modules impactés | `migrations/033`, `politiques` |

**Description.** Rôle limité aux tournées et visites des ruchers attribués ; fonction peut(action) dans les politiques.

**Problème résolu.** Une exploitation pro ne peut pas donner un accès terrain sans exposer ventes et finances.

**Risques.** Complexité des politiques.

**Tests nécessaires.** Matrice de droits testée.

**User stories et critères d'acceptation**

- **AP-US-020** — En tant que responsable d'exploitation, je veux donner à un saisonnier l'accès aux visites d'un rucher seulement afin de l'équiper sans exposer mes chiffres.
  - GIVEN un saisonnier sur le rucher Verger · WHEN il ouvre l'application · THEN il voit les colonies du Verger, peut les visiter, ne voit ni ventes ni dépenses

**Tâches techniques**

- AP-TECH-065 — Table membre_ruchers.
- AP-TECH-066 — Fonction peut(action, rucher).
- AP-TECH-067 — Politiques réécrites avec peut().
- AP-TECH-068 — Navigation réduite pour ce rôle.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-022 — Journal d'activité par membre

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-003 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-26](ITERATIONS/ITERATION_26.md) |
| Dépendances | AP-FEAT-019 |
| Modules impactés | `écran Activité (v3)` |

**Description.** Qui a fait quoi et quand, filtrable par membre, à partir du journal d'audit et des auteurs déjà enregistrés.

**Problème résolu.** À plusieurs, on ne sait pas qui a modifié ou supprimé.

**Risques.** Volume.

**Tests nécessaires.** Affichage sur jeu de démo.

**User stories et critères d'acceptation**

- **AP-US-021** — En tant que responsable d'exploitation, je veux voir l'activité d'un membre afin de comprendre une modification.
  - GIVEN le journal d'audit · WHEN je filtre sur un membre · THEN je vois ses créations, modifications et suppressions des 90 derniers jours

**Tâches techniques**

- AP-TECH-069 — Vue activite unifiée.
- AP-TECH-070 — Filtre membre dans l'écran Activité.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-023 — Gérer ses exploitations

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-003 |
| Statut actuel | PARTIEL |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-26](ITERATIONS/ITERATION_26.md) |
| Dépendances | — |
| Modules impactés | `exploitations.js` |

**Description.** Renommer, archiver, quitter, transférer la responsabilité d'une exploitation.

**Problème résolu.** Impossible de passer la main ou de fermer une exploitation proprement.

**Risques.** Exploitation sans responsable.

**Tests nécessaires.** Tests SQL : au moins un responsable.

**User stories et critères d'acceptation**

- **AP-US-022** — En tant que responsable d'exploitation, je veux transférer la responsabilité à un autre membre afin de passer la main.
  - GIVEN deux responsables · WHEN l'un se retire · THEN l'autre reste seul responsable ; le dernier responsable ne peut pas partir

**Tâches techniques**

- AP-TECH-071 — Fonction transferer_responsabilite().
- AP-TECH-072 — Contrainte : ≥ 1 responsable.
- AP-TECH-073 — Archivage (lecture seule).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-004 — Sécurité, confidentialité et RGPD

Intégrité des données entre exploitations, traçabilité des modifications, droits des personnes.


### AP-FEAT-009 — Intégrité entre exploitations

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-004 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : contrôles dans creer_visite/creer_vente, 14 clés composites, incoherences_exploitation() ; en attente de fusion |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | AP-FEAT-008 |
| Modules impactés | `creer_visite`, `creer_vente`, `nouvelles tables` |

**Description.** Vérifier l'exploitation des objets référencés dans les fonctions creer_* puis clés étrangères composites sur les nouvelles tables.

**Problème résolu.** Les clés étrangères ignorent la RLS : un objet peut être rattaché à une colonie d'une autre exploitation.

**Risques.** Contrainte ajoutée sur données existantes incohérentes.

**Tests nécessaires.** Test SQL de rattachement croisé refusé.

**User stories et critères d'acceptation**

- **AP-US-023** — En tant que responsable d'exploitation, je veux la garantie qu'aucune donnée n'est rattachée à une autre exploitation afin d'avoir confiance dans l'isolation.
  - GIVEN un UUID de colonie d'une autre exploitation · WHEN creer_visite est appelée avec · THEN la fonction refuse avec « Ruche introuvable »

**Tâches techniques**

- AP-TECH-074 — Contrôle d'existence sous RLS dans creer_visite.
- AP-TECH-075 — Requête de détection d'incohérences existantes.
- AP-TECH-076 — Contraintes composites pour toutes les tables créées après 014.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-019 — Journal d'audit des modifications sensibles

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-004 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : journal_audit, restaurer() (visites, ventes, dépenses), « Supprimé récemment » dans Activité, purge à 1 an ; en attente de fusion |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | — |
| Modules impactés | `migrations/014` |

**Description.** Déclencheur générique qui garde l'ancienne valeur, l'auteur et la date sur suppression et modification des tables métier.

**Problème résolu.** Une suppression accidentelle est définitive et sans trace.

**Risques.** Volume de la table.

**Tests nécessaires.** Test SQL : suppression → ligne d'audit.

**User stories et critères d'acceptation**

- **AP-US-024** — En tant que responsable d'exploitation, je veux retrouver ce qui a été supprimé afin de réparer une erreur.
  - GIVEN une visite supprimée · WHEN je consulte l'audit · THEN je vois son contenu, l'auteur et la date, et je peux la restaurer depuis Activité

**Tâches techniques**

- AP-TECH-077 — Table journal_audit (jsonb avant).
- AP-TECH-078 — Déclencheur sur tables métier.
- AP-TECH-079 — Restauration simple pour visites, ventes, dépenses.
- AP-TECH-080 — Purge à 1 an.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-020 — Suppression du compte et de l'exploitation

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-004 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Élevé |
| Itération cible | [IT-28](ITERATIONS/ITERATION_28.md) (avancée depuis IT-26 le 6 nov. 2026 : exigée par Apple, règle 5.1.1(v)) |
| Dépendances | — (l'export actuel suffit ; AP-FEAT-024 l'enrichira en IT-26) |
| Modules impactés | `supabase/functions`, `src/domaines/compte` |

**Description.** Suppression demandée depuis l'app, délai de grâce de 30 jours, photos comprises.

**Problème résolu.** Droit à l'effacement non outillé.

**Risques.** Suppression par erreur.

**Tests nécessaires.** Test : suppression puis annulation pendant le délai.

**User stories et critères d'acceptation**

- **AP-US-025** — En tant qu'apiculteur, je veux supprimer mon compte et mes données afin d'exercer mon droit.
  - GIVEN je suis seul responsable d'une exploitation · WHEN je demande la suppression · THEN on me propose d'exporter d'abord, puis tout est supprimé après 30 jours sauf annulation

**Tâches techniques**

- AP-TECH-081 — Fonction demander_suppression().
- AP-TECH-082 — Tâche planifiée de suppression effective.
- AP-TECH-083 — E-mail de confirmation.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-021 — Mentions de confidentialité et services tiers

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-004 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-04-securite-base` (v5.18, migration 014 appliquée sur apidoo-test) : docs/CONFIDENTIALITE.md, confidentialite.html, information avant la première dictée ; responsable du traitement à compléter (D-13) ; en attente de fusion |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-04](ITERATIONS/ITERATION_04.md) |
| Dépendances | — |
| Modules impactés | `voix.js`, `docs/CONFIDENTIALITE.md`, `écran compte` |

**Description.** Politique de confidentialité, information à la première utilisation de la dictée, des cartes et de la météo.

**Problème résolu.** L'audio de la dictée part chez Google sans information ; aucune politique publiée.

**Risques.** Formulation juridique.

**Tests nécessaires.** Relecture.

**User stories et critères d'acceptation**

- **AP-US-026** — En tant qu'apiculteur, je veux savoir où partent mes données afin de décider en connaissance de cause.
  - GIVEN première utilisation de la dictée · WHEN je touche le micro · THEN un message explique que le navigateur peut envoyer l'audio à son fournisseur, avec le choix de continuer ou de saisir au doigt

**Tâches techniques**

- AP-TECH-084 — Rédiger la politique (hébergeur, services tiers, durées).
- AP-TECH-085 — Message unique avant la 1re dictée.
- AP-TECH-086 — Lien dans Compte et dans la présentation.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-003 — Données gardées après la déconnexion

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D02 Comptes, exploitations et sécurité |
| Epic parent | AP-EPIC-004 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : purge à la déconnexion, scénario etapes_dc |
| Priorité | P0 |
| Valeur métier | 4/5 |
| Complexité | XS |
| Risque | Moyen |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `offline.js`, `photos.js`, `exploitations.js`, `ACT.logout` |

**Description.** Purger IndexedDB (données, photos en attente) et les clés localStorage de l'exploitation à la déconnexion, après avertissement si une file existe.

**Problème résolu.** Sur un appareil partagé, la personne suivante a accès aux clients et ventes en cache.

**Risques.** Perte d'une file non envoyée.

**Tests nécessaires.** Scénario e2e déconnexion.

**User stories et critères d'acceptation**

- **AP-US-027** — En tant qu'apiculteur, je veux que mes données disparaissent de l'appareil quand je me déconnecte afin de protéger mes clients.
  - GIVEN aucune saisie en attente · WHEN je me déconnecte · THEN IndexedDB et les clés apidoo-* sont vidées
  - GIVEN 3 saisies en attente · WHEN je me déconnecte · THEN on me prévient et je choisis « envoyer d'abord » ou « supprimer quand même »

**Tâches techniques**

- AP-TECH-087 — Fonction purgerLocal().
- AP-TECH-088 — Avertissement si HL.nb() > 0.
- AP-TECH-089 — Test e2e.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D03 — Ruchers et emplacements


## AP-EPIC-005 — Ruchers en entité

Le rucher devient un objet à part entière, avec position et informations d'accès.


### AP-FEAT-025 — Table des ruchers et reprise

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D03 Ruchers et emplacements |
| Epic parent | AP-EPIC-005 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-05](ITERATIONS/ITERATION_05.md) |
| Dépendances | AP-FEAT-008, AP-FEAT-002 |
| Modules impactés | `migrations/015`, `meteo.js`, `carte`, `demarrage.js` |

**Description.** Créer la table ruchers, reprendre les valeurs de ruches.rucher et leur position moyenne, lier chaque colonie.

**Problème résolu.** Le rucher n'est qu'un texte : pas de position, pas d'informations d'accès, renommage fastidieux.

**Risques.** Doublons à la reprise.

**Tests nécessaires.** Reprise sur jeu varié ; ancienne app compatible.

**User stories et critères d'acceptation**

- **AP-US-028** — En tant qu'apiculteur, je veux renommer un rucher en une fois afin de garder mes noms à jour.
  - GIVEN le rucher Verger avec 8 colonies · WHEN je le renomme « Verger du haut » · THEN les 8 colonies affichent le nouveau nom, y compris dans l'ancienne version
- **AP-US-029** — En tant qu'apiculteur, je veux placer le rucher sur la carte plutôt que chaque ruche afin de gagner du temps.
  - GIVEN un rucher sans position · WHEN je le place · THEN toutes ses colonies ont la météo de ce lieu

**Tâches techniques**

- AP-TECH-090 — Migration 015 + déclencheur de synchronisation du texte.
- AP-TECH-091 — Normalisation des noms (trim, casse) à la reprise.
- AP-TECH-092 — Écrans Ruchers sur la table.
- AP-TECH-093 — Rucher en 3 questions crée une ligne ruchers.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-026 — Fiche rucher complète

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D03 Ruchers et emplacements |
| Epic parent | AP-EPIC-005 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-05](ITERATIONS/ITERATION_05.md) |
| Dépendances | AP-FEAT-025 |
| Modules impactés | `fiche rucher (alveoles.js)` |

**Description.** Accès, propriétaire, contact, capacité, environnement, ressources, point d'eau, photos, notes ; archivage.

**Problème résolu.** Les informations utiles pour aller au rucher (code du portail, propriétaire) sont dans des notes ou nulle part.

**Risques.** Aucun.

**Tests nécessaires.** e2e fiche rucher.

**User stories et critères d'acceptation**

- **AP-US-030** — En tant qu'apiculteur, je veux noter les consignes d'accès d'un rucher afin de les retrouver sur place ou les transmettre.
  - GIVEN un rucher avec consignes d'accès · WHEN un membre ouvre la fiche · THEN il voit accès, propriétaire avec bouton d'appel, et l'itinéraire

**Tâches techniques**

- AP-TECH-094 — Champs de la table.
- AP-TECH-095 — Section Infos repliée.
- AP-TECH-096 — Archivage au lieu de suppression.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-027 — Carte globale des ruchers

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D03 Ruchers et emplacements |
| Epic parent | AP-EPIC-005 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-05](ITERATIONS/ITERATION_05.md) |
| Dépendances | AP-FEAT-025 |
| Modules impactés | `ux.js carte`, `Leaflet` |

**Description.** Carte de tous les ruchers (et non des ruches), état agrégé, itinéraire.

**Problème résolu.** La carte actuelle place des ruches ; avec la table ruchers, la carte doit refléter les lieux.

**Risques.** Tuiles OSM : conditions d'usage.

**Tests nécessaires.** e2e carte.

**User stories et critères d'acceptation**

- **AP-US-031** — En tant qu'apiculteur, je veux voir tous mes ruchers sur une carte avec leur état afin d'organiser ma tournée.
  - GIVEN 3 ruchers placés · WHEN j'ouvre la carte · THEN chaque rucher a un repère coloré selon le pire état de ses colonies et son nombre de colonies

**Tâches techniques**

- AP-TECH-097 — Repères par rucher.
- AP-TECH-098 — Couleur agrégée.
- AP-TECH-099 — Vérifier les conditions des tuiles OSM pour un usage commercial.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-006 — Emplacements et transhumance

Historique des emplacements et déplacements de lots de colonies.


### AP-FEAT-028 — Historique des emplacements

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D03 Ruchers et emplacements |
| Epic parent | AP-EPIC-006 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-06](ITERATIONS/ITERATION_06.md) |
| Dépendances | AP-FEAT-025 |
| Modules impactés | `migrations/016` |

**Description.** colonie_emplacements avec périodes sans chevauchement ; le rucher d'une visite se lit à sa date.

**Problème résolu.** Après un déplacement, l'historique des visites semble avoir eu lieu dans le nouveau rucher.

**Risques.** Historique antérieur inconnu.

**Tests nécessaires.** Test SQL chevauchement refusé.

**User stories et critères d'acceptation**

- **AP-US-032** — En tant qu'apiculteur, je veux savoir où était une colonie à une date donnée afin d'interpréter correctement son historique et le registre.
  - GIVEN une colonie déplacée le 1er juin du Verger au Bois · WHEN je consulte sa visite du 15 mai · THEN la visite indique le Verger

**Tâches techniques**

- AP-TECH-100 — Table + contrainte d'exclusion.
- AP-TECH-101 — Reprise : un emplacement ouvert par colonie depuis date_installation.
- AP-TECH-102 — Fonction rucher_a_date().
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-029 — Déplacement groupé (transhumance)

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D03 Ruchers et emplacements |
| Epic parent | AP-EPIC-006 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-06](ITERATIONS/ITERATION_06.md) |
| Dépendances | AP-FEAT-028 |
| Modules impactés | `essentiels.js (Déplacer des ruches)`, `registre` |

**Description.** Fonction deplacer_colonies() : N colonies, date, destination, motif ; alimente le registre des mouvements.

**Problème résolu.** La v5.10 note des déplacements comme événements, sans changer l'emplacement des colonies.

**Risques.** Double saisie avec l'événement 010.

**Tests nécessaires.** Atomicité, registre avant/après.

**User stories et critères d'acceptation**

- **AP-US-033** — En tant qu'apiculteur, je veux déplacer 12 colonies vers le rucher d'été en une opération afin de noter une transhumance en 30 secondes.
  - GIVEN 12 colonies cochées au Verger · WHEN je les déplace vers Lande le 20 juin · THEN les 12 sont au Lande, une ligne de déplacement est créée et apparaît au registre
  - GIVEN une coupure réseau pendant l'envoi · WHEN l'opération est renvoyée · THEN elle n'est appliquée qu'une fois

**Tâches techniques**

- AP-TECH-103 — Fonction SQL idempotente.
- AP-TECH-104 — Écran Déplacer (sélecteur de colonies).
- AP-TECH-105 — Reprise des événements « deplacement » de 010.
- AP-TECH-106 — Registre lit deplacements.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D04 — Colonies, ruches physiques et reines


## AP-EPIC-007 — Colonies et contenants

Distinguer la colonie biologique de la ruche physique.


### AP-FEAT-030 — Colonie : statut et origine

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D04 Colonies, ruches physiques et reines |
| Epic parent | AP-EPIC-007 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-06](ITERATIONS/ITERATION_06.md) |
| Dépendances | AP-FEAT-025 |
| Modules impactés | `migrations/016`, `v3.js sortie` |

**Description.** statut (active, orpheline, morte, réunie, vendue, perdue) remplaçant sortie, origine, date de création, code court.

**Problème résolu.** Le cycle de vie n'est pas structuré ; les colonies mortes faussent les indicateurs.

**Risques.** Reprise de sortie.

**Tests nécessaires.** Reprise sortie → statut.

**User stories et critères d'acceptation**

- **AP-US-034** — En tant qu'apiculteur, je veux marquer une colonie orpheline afin de la retrouver dans les priorités.
  - GIVEN une colonie active · WHEN je la passe orpheline · THEN elle apparaît dans les alertes de l'accueil avec une tâche de remérage proposée
- **AP-US-035** — En tant qu'apiculteur, je veux que les colonies mortes ne comptent plus afin d'avoir des chiffres justes.
  - GIVEN 2 colonies mortes sur 20 · WHEN j'ouvre l'accueil · THEN 18 colonies actives sont comptées et l'historique des mortes reste consultable

**Tâches techniques**

- AP-TECH-107 — Colonnes et reprise depuis sortie.
- AP-TECH-108 — Déclencheur sortie ↔ statut pour l'ancienne app.
- AP-TECH-109 — Filtres par statut.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-031 — Ruches physiques (contenants)

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D04 Colonies, ruches physiques et reines |
| Epic parent | AP-EPIC-007 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-06](ITERATIONS/ITERATION_06.md) |
| Dépendances | AP-FEAT-030 |
| Modules impactés | `migrations/016`, `fiche colonie`, `matériel` |

**Description.** Contenants avec type et état, historique d'occupation par colonie ; facultatif (niveau Professionnel).

**Problème résolu.** Impossible de suivre le matériel de ruches et les transferts de colonie d'une caisse à une autre.

**Risques.** Complexité pour l'amateur.

**Tests nécessaires.** Niveau Essentiel : aucun écran contenant.

**User stories et critères d'acceptation**

- **AP-US-036** — En tant qu'apiculteur professionnel, je veux transférer une colonie dans une ruche neuve afin de suivre mes caisses.
  - GIVEN la colonie A dans le contenant 12 · WHEN je la transfère dans le 31 · THEN le 12 devient libre, le 31 occupé, l'historique de la colonie est intact

**Tâches techniques**

- AP-TECH-110 — Tables contenants, colonie_contenants.
- AP-TECH-111 — Fonction affecter_contenant().
- AP-TECH-112 — Lien avec articles (équipement).
- AP-TECH-113 — Masqué hors niveau Professionnel.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-008 — Reines

Historique des reines de chaque colonie.


### AP-FEAT-032 — Historique des reines

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D04 Colonies, ruches physiques et reines |
| Epic parent | AP-EPIC-008 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-07](ITERATIONS/ITERATION_07.md) |
| Dépendances | AP-FEAT-030 |
| Modules impactés | `migrations/017`, `v3.js reine` |

**Description.** Table reines (naissance, marquage, origine, en place du/au, statut) et changer_reine() ; reprise des colonnes actuelles.

**Problème résolu.** Changer la reine écrase l'ancienne : impossible d'évaluer une reine dans le temps.

**Risques.** Données incomplètes.

**Tests nécessaires.** Reprise ; clôture.

**User stories et critères d'acceptation**

- **AP-US-037** — En tant qu'apiculteur, je veux enregistrer une nouvelle reine sans perdre l'ancienne afin de comparer mes reines.
  - GIVEN une reine 2024 en place · WHEN j'enregistre une reine 2026 introduite le 10 mai · THEN la 2024 est clôturée au 10 mai, la 2026 est en place, les deux figurent dans l'onglet Reine

**Tâches techniques**

- AP-TECH-114 — Table, contrainte « une seule en place ».
- AP-TECH-115 — Reprise depuis annee_reine/reine_origine/reine_introduite.
- AP-TECH-116 — Formulaire reine → changer_reine().
- AP-TECH-117 — Couleur de marquage dérivée de l'année.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-009 — Fiche colonie et historique biologique

Une fiche qui raconte toute la vie de la colonie.


### AP-FEAT-033 — Liens de filiation entre colonies

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D04 Colonies, ruches physiques et reines |
| Epic parent | AP-EPIC-009 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-07](ITERATIONS/ITERATION_07.md) |
| Dépendances | AP-FEAT-030 |
| Modules impactés | `migrations/017` |

**Description.** colonie_liens (parent, enfant, type) reprise depuis les événements existants.

**Problème résolu.** La filiation est un texte (« Nouvelle ruche : … »), inexploitable.

**Risques.** Événements sans autre_ruche_id.

**Tests nécessaires.** Reprise sur jeu de test.

**User stories et critères d'acceptation**

- **AP-US-038** — En tant qu'apiculteur, je veux voir de quelle colonie vient une colonie afin de suivre mes souches.
  - GIVEN une colonie issue d'une division · WHEN j'ouvre sa fiche · THEN je vois « Issue de Ruche 2 le 12 mai » avec un lien

**Tâches techniques**

- AP-TECH-118 — Table + contrôle anti-cycle.
- AP-TECH-119 — Reprise depuis ruche_evenements.autre_ruche_id.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-034 — Fiche colonie complète

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D04 Colonies, ruches physiques et reines |
| Epic parent | AP-EPIC-009 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-07](ITERATIONS/ITERATION_07.md) |
| Dépendances | AP-FEAT-032, AP-FEAT-033 |
| Modules impactés | `alveoles.js viewRuche`, `v3.js` |

**Description.** En-tête (statut, reine, force, varroa, poids), onglets Journal, Santé, Reine & lignée, Production, Photos.

**Problème résolu.** Les informations de la colonie sont réparties entre fiche, journal et onglet Colonie.

**Risques.** Écran chargé.

**Tests nécessaires.** Captures + e2e.

**User stories et critères d'acceptation**

- **AP-US-039** — En tant qu'apiculteur, je veux voir en un coup d'œil où en est une colonie afin de décider quoi faire.
  - GIVEN une colonie avec historique · WHEN j'ouvre sa fiche · THEN l'en-tête montre statut, reine (âge, couleur), force et varroa de la dernière observation, et date de dernière visite

**Tâches techniques**

- AP-TECH-120 — Composant en-tête colonie.
- AP-TECH-121 — Onglets Santé et Reine & lignée.
- AP-TECH-122 — Journal unifié visites + événements + opérations.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-035 — Notes de caractère de la colonie

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D04 Colonies, ruches physiques et reines |
| Epic parent | AP-EPIC-009 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-08](ITERATIONS/ITERATION_08.md) |
| Dépendances | AP-FEAT-034 |
| Modules impactés | `visites`, `fiche colonie` |

**Description.** Douceur, tenue au cadre, propension à l'essaimage, dynamisme (1–5), dernière valeur affichée.

**Problème résolu.** Critères de sélection non suivis.

**Risques.** Aucun.

**Tests nécessaires.** Unitaires.

**User stories et critères d'acceptation**

- **AP-US-040** — En tant qu'apiculteur, je veux noter la douceur d'une colonie lors d'une visite afin de choisir mes colonies à multiplier.
  - GIVEN le champ douceur dans mon modèle de visite · WHEN je note 4 · THEN la fiche colonie affiche douceur 4 et son évolution

**Tâches techniques**

- AP-TECH-123 — Champs dans observations / colonnes.
- AP-TECH-124 — Affichage dans l'onglet Reine & lignée.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D05 — Visites et terrain


## AP-EPIC-010 — Visite rapide et modèles

Visite courante en moins de deux minutes, adaptée à chacun.


### AP-FEAT-037 — Visite rapide pré-remplie

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-010 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-08](ITERATIONS/ITERATION_08.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `visite`, `tournee.js` |

**Description.** La visite reprend les valeurs de la précédente, marquées « reprises » ; seules les valeurs touchées sont « observées ».

**Problème résolu.** Chaque visite oblige à tout ressaisir ; l'objectif de deux minutes n'est atteint qu'en tournée guidée.

**Risques.** Valeur non observée enregistrée comme observée.

**Tests nécessaires.** e2e ; mesure de durée.

**User stories et critères d'acceptation**

- **AP-US-041** — En tant qu'apiculteur, je veux ne saisir que ce qui a changé afin de faire une visite courante en moins de deux minutes.
  - GIVEN une visite précédente avec provisions Bonnes · WHEN j'ouvre une nouvelle visite · THEN Provisions est pré-rempli « Bonnes » avec la mention « comme le 12/05 »
  - GIVEN je ne touche pas à Provisions · WHEN j'enregistre · THEN la visite enregistre provisions comme reprise (non observée) et l'historique le distingue

**Tâches techniques**

- AP-TECH-125 — Champ observes (liste des champs touchés).
- AP-TECH-126 — Pré-remplissage depuis colonies_resume.
- AP-TECH-127 — Affichage « comme le … ».
- AP-TECH-128 — Mesure duree_s.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-038 — Nouveaux champs d'observation

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-010 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-08](ITERATIONS/ITERATION_08.md) |
| Dépendances | — |
| Modules impactés | `migrations/018`, `visite`, `voix.js (mots-clés)` |

**Description.** Force (1–5), œufs vus, cellules royales, cadres de couvain et d'abeilles, comportement.

**Problème résolu.** Les signes d'essaimage et la force ne sont pas notés de façon exploitable.

**Risques.** Formulaire plus long.

**Tests nécessaires.** Champs masquables par modèle.

**User stories et critères d'acceptation**

- **AP-US-042** — En tant qu'apiculteur, je veux noter des cellules royales operculées afin d'anticiper un essaimage.
  - GIVEN une visite avec cellules royales « operculées » · WHEN j'enregistre · THEN une alerte Essaimage apparaît sur l'accueil et une tâche est proposée

**Tâches techniques**

- AP-TECH-129 — Colonnes visites.
- AP-TECH-130 — creer_visite étendue (compatible).
- AP-TECH-131 — Segments dans la visite et la tournée.
- AP-TECH-132 — Vocabulaire de dictée.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-039 — Modèles de visite personnalisables

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-010 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-08](ITERATIONS/ITERATION_08.md) |
| Dépendances | AP-FEAT-038 |
| Modules impactés | `modeles_visite`, `visite`, `tournee.js` |

**Description.** Choisir les champs affichés et leur ordre, ajouter des champs libres ; un modèle par défaut par exploitation.

**Problème résolu.** Chaque apiculteur a ses habitudes ; le formulaire unique est trop long pour certains, trop pauvre pour d'autres.

**Risques.** Données hétérogènes.

**Tests nécessaires.** Champs libres dans observations jsonb.

**User stories et critères d'acceptation**

- **AP-US-043** — En tant qu'apiculteur, je veux un modèle « visite d'hiver » réduit au poids et à l'activité afin d'aller plus vite en hiver.
  - GIVEN le modèle Hiver · WHEN je démarre une tournée avec · THEN seuls poids et activité sont demandés

**Tâches techniques**

- AP-TECH-133 — Table modeles_visite.
- AP-TECH-134 — Éditeur simple (cases à cocher, ordre).
- AP-TECH-135 — Rendu générique des champs libres.
- AP-TECH-136 — Export des champs libres.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-040 — Brouillon de visite persistant

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-010 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-08](ITERATIONS/ITERATION_08.md) |
| Dépendances | — |
| Modules impactés | `ergonomie.js brouillons`, `visite` |

**Description.** La visite en cours est sauvegardée localement en continu et survit au rechargement (aujourd'hui le brouillon disparaît au rechargement).

**Problème résolu.** Un appel, une app fermée par le système : la visite en cours est perdue.

**Risques.** Brouillon fantôme.

**Tests nécessaires.** e2e rechargement.

**User stories et critères d'acceptation**

- **AP-US-044** — En tant qu'apiculteur, je veux retrouver ma visite si l'application se ferme afin de ne pas tout recommencer.
  - GIVEN une visite commencée · WHEN le téléphone ferme l'application · THEN à la réouverture, « Reprendre la visite de Ruche 4 » est proposé

**Tâches techniques**

- AP-TECH-137 — Stockage IndexedDB du brouillon par colonie.
- AP-TECH-138 — Proposition de reprise.
- AP-TECH-139 — Expiration à 48 h.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-011 — Tournée et visites en série

Enchaîner les colonies d'un rucher.


### AP-FEAT-041 — Tournée : enchaînement et ordre

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-011 |
| Statut actuel | EXISTANT ET COHÉRENT |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-10](ITERATIONS/ITERATION_10.md) |
| Dépendances | AP-FEAT-025, AP-FEAT-037 |
| Modules impactés | `tournee.js` |

**Description.** Ordre par priorité ou par position, « suivante » après enregistrement, reprise de tournée (existant v5.11 à conserver et brancher sur les nouvelles entités).

**Problème résolu.** Consolidation : la tournée existe ; elle doit suivre les ruchers et colonies du nouveau modèle.

**Risques.** Régression d'un parcours apprécié.

**Tests nécessaires.** e2e tn.

**User stories et critères d'acceptation**

- **AP-US-045** — En tant qu'apiculteur, je veux enchaîner les colonies d'un rucher dans l'ordre où elles sont posées afin de ne pas marcher pour rien.
  - GIVEN un rucher avec ordre défini · WHEN je lance la tournée · THEN les colonies sont proposées dans l'ordre de pose, les prioritaires signalées

**Tâches techniques**

- AP-TECH-140 — Champ ordre de pose par colonie.
- AP-TECH-141 — Choix de l'ordre (priorité / pose).
- AP-TECH-142 — Conserver les 3 modes.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-042 — Actions groupées sur plusieurs colonies

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-011 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-10](ITERATIONS/ITERATION_10.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `visites-groupees.js`, `listes de colonies` |

**Description.** Depuis une liste : cocher des colonies et appliquer une action (tâche, hausse posée, état, opération).

**Problème résolu.** La visite multiple existe ; d'autres actions répétitives (poser une hausse sur 10 colonies) ne le sont pas.

**Risques.** Action appliquée par erreur.

**Tests nécessaires.** Annulation 5 s.

**User stories et critères d'acceptation**

- **AP-US-046** — En tant qu'apiculteur, je veux poser une hausse sur 10 colonies en une fois afin de gagner du temps pendant la miellée.
  - GIVEN 10 colonies cochées · WHEN j'applique « +1 hausse » · THEN les 10 ont une hausse de plus et un toast propose Annuler

**Tâches techniques**

- AP-TECH-143 — Composant sélecteur de colonies.
- AP-TECH-144 — Actions groupées : hausse, état, tâche.
- AP-TECH-145 — Fonction SQL groupée.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-012 — Hors ligne et synchronisation

Aucune saisie perdue, toutes les saisies terrain possibles sans réseau.


### AP-FEAT-043 — File d'opérations : modifications et suppressions hors ligne

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-012 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-09](ITERATIONS/ITERATION_09.md) |
| Dépendances | AP-BUG-001, AP-FEAT-014 |
| Modules impactés | `offline.js → src/donnees/file.js` |

**Description.** Généraliser la file aux modifications et suppressions des saisies terrain, avec dépendances entre opérations.

**Problème résolu.** Sans réseau, on ne peut ni corriger ni supprimer une saisie.

**Risques.** Ordre et dépendances.

**Tests nécessaires.** 20 opérations mixtes hors ligne.

**User stories et critères d'acceptation**

- **AP-US-047** — En tant qu'apiculteur, je veux corriger une visite au rucher sans réseau afin de ne pas devoir y penser plus tard.
  - GIVEN une visite d'hier déjà envoyée · WHEN je corrige le poids hors ligne · THEN la correction est affichée, marquée « en attente », et envoyée au retour du réseau
- **AP-US-048** — En tant qu'apiculteur, je veux créer une colonie et la visiter sans réseau afin de noter un essaim capturé sur place.
  - GIVEN une colonie créée hors ligne · WHEN je la visite aussitôt · THEN la visite part après la création de la colonie, sans erreur

**Tâches techniques**

- AP-TECH-146 — Format d'opération (type, table, id, données, version attendue, dépend_de).
- AP-TECH-147 — Fonctions SQL modifier_*.
- AP-TECH-148 — Reprise de la file v1.
- AP-TECH-149 — Tests e2e.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-044 — Conflits de modification

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-012 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-09](ITERATIONS/ITERATION_09.md) |
| Dépendances | AP-FEAT-043 |
| Modules impactés | `file.js`, `fonctions modifier_*` |

**Description.** Contrôle de version (modifie_le) ; en cas d'écart, choix présenté entre les deux versions.

**Problème résolu.** À plusieurs, une correction hors ligne peut écraser celle d'un autre sans le savoir.

**Risques.** Écran de conflit incompris.

**Tests nécessaires.** Scénario deux téléphones.

**User stories et critères d'acceptation**

- **AP-US-049** — En tant que membre invité, je veux être prévenu si quelqu'un a modifié la même saisie afin de ne pas effacer son travail.
  - GIVEN deux membres modifient la même visite, l'un hors ligne · WHEN le second envoie · THEN un écran montre les deux versions champ par champ et demande laquelle garder

**Tâches techniques**

- AP-TECH-150 — Colonne modifie_le + déclencheur.
- AP-TECH-151 — Retour « conflit » des fonctions.
- AP-TECH-152 — Écran de choix.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-045 — État de synchronisation lisible

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-012 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-09](ITERATIONS/ITERATION_09.md) |
| Dépendances | AP-FEAT-043 |
| Modules impactés | `offline.js bandeau/section` |

**Description.** Bandeau et écran : en attente, envoyé, à corriger, par exploitation ; saisies d'autres exploitations signalées.

**Problème résolu.** Les saisies d'une autre exploitation attendent sans signal.

**Risques.** Aucun.

**Tests nécessaires.** e2e multi-exploitation.

**User stories et critères d'acceptation**

- **AP-US-050** — En tant qu'apiculteur, je veux savoir si tout est bien parti afin de fermer l'application l'esprit tranquille.
  - GIVEN 2 saisies en attente dans une autre exploitation · WHEN j'ouvre le menu du compte · THEN je vois « 2 saisies en attente dans Rucher Pro » avec un bouton pour y passer

**Tâches techniques**

- AP-TECH-153 — Compteurs par exploitation.
- AP-TECH-154 — Écran Synchronisation.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-001 — Saisie hors ligne perdue sur erreur serveur

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-012 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : quarantaine, fiche « À corriger », scénario etapes_qr |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `offline.js envoyer()` |

**Description.** Au renvoi, une erreur non réseau retire la saisie de la file. Elle doit passer en quarantaine visible et corrigeable.

**Problème résolu.** Une visite ou une vente faite au rucher peut disparaître (ex. stock insuffisant après des ventes faites ailleurs).

**Risques.** Quarantaine qui bloque la file.

**Tests nécessaires.** e2e : renvoi refusé.

**User stories et critères d'acceptation**

- **AP-US-051** — En tant qu'apiculteur, je veux qu'aucune saisie faite sans réseau ne soit perdue afin de faire confiance à l'application au rucher.
  - GIVEN une vente hors ligne de 5 pots alors qu'il n'en reste que 3 · WHEN le réseau revient · THEN la vente est placée dans « À corriger » avec le message, les autres saisies partent
  - GIVEN une saisie en quarantaine · WHEN je la corrige et la renvoie · THEN elle est enregistrée et quitte la quarantaine
  - GIVEN une saisie en quarantaine · WHEN je l'abandonne · THEN on me demande confirmation avant de la supprimer

**Tâches techniques**

- AP-TECH-155 — Statut « quarantaine » dans la file.
- AP-TECH-156 — Écran À corriger (liste, modifier, renvoyer, abandonner).
- AP-TECH-157 — Pastille sur le bandeau.
- AP-TECH-158 — Scénario e2e.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-013 — Photos, voix et QR codes

Les outils du terrain.


### AP-FEAT-046 — QR codes des colonies

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-013 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-10](ITERATIONS/ITERATION_10.md) |
| Dépendances | AP-FEAT-030 |
| Modules impactés | `fiche colonie`, `etiquettes.js (mise en page)`, `routeur` |

**Description.** Code court par colonie (ou contenant), planche A4 de QR, lien ?c=CODE qui ouvre la fiche, hors ligne compris.

**Problème résolu.** Retrouver la bonne fiche au rucher prend du temps et on se trompe de ruche.

**Risques.** QR illisible au soleil.

**Tests nécessaires.** Lecture sur 2 téléphones.

**User stories et critères d'acceptation**

- **AP-US-052** — En tant qu'apiculteur, je veux scanner ma ruche pour ouvrir sa fiche afin de ne plus chercher dans une liste.
  - GIVEN une planche de QR imprimée et collée · WHEN je scanne avec l'appareil photo · THEN Apidoo s'ouvre sur la fiche de la colonie, même sans réseau si l'app est installée
  - GIVEN un QR d'une autre exploitation · WHEN je le scanne · THEN je vois « Cette ruche n'est pas dans ton exploitation »

**Tâches techniques**

- AP-TECH-159 — Génération de codes courts uniques.
- AP-TECH-160 — Bibliothèque QR (CDN autorisé).
- AP-TECH-161 — Planche A4 imprimable.
- AP-TECH-162 — Route ?c= ; scanner intégré si BarcodeDetector disponible.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-047 — Photos fiables sur téléphone

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-013 |
| Statut actuel | À VÉRIFIER |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-11](ITERATIONS/ITERATION_11.md) |
| Dépendances | — |
| Modules impactés | `photos.js` |

**Description.** Vérifier et corriger appareil photo, HEIC, envoi différé ; photos de colonie et de rucher (pas seulement de visite).

**Problème résolu.** Le fonctionnement réel n'a jamais été vérifié sur iPhone ni Android.

**Risques.** HEIC non décodable.

**Tests nécessaires.** Recette manuelle documentée.

**User stories et critères d'acceptation**

- **AP-US-053** — En tant qu'apiculteur, je veux prendre une photo d'iPhone au rucher sans réseau afin d'illustrer ma visite.
  - GIVEN un iPhone hors réseau · WHEN je prends une photo HEIC · THEN elle est réduite, affichée « en attente » et envoyée au retour du réseau

**Tâches techniques**

- AP-TECH-163 — Liste de recette manuelle.
- AP-TECH-164 — Repli si décodage impossible (message clair).
- AP-TECH-165 — Rattachement colonie/rucher.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-048 — Surveillance et nettoyage du stockage

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-013 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-11](ITERATIONS/ITERATION_11.md) |
| Dépendances | AP-BUG-004 |
| Modules impactés | `supabase/functions/nettoyer-stockage`, `photos_espace()` |

**Description.** Alerte à 80 % du quota ; nettoyage serveur des fichiers sans fiche.

**Problème résolu.** L'offre gratuite donne 1 Go ; le dépassement bloquerait les envois.

**Risques.** Suppression d'un fichier utile.

**Tests nécessaires.** Test sur jeu avec orphelins.

**User stories et critères d'acceptation**

- **AP-US-054** — En tant que responsable d'exploitation, je veux être prévenu avant que l'espace photos soit plein afin d'anticiper.
  - GIVEN 800 Mo utilisés sur 1 Go · WHEN j'ouvre les réglages · THEN un avertissement indique l'espace restant et la taille moyenne d'une photo

**Tâches techniques**

- AP-TECH-166 — Edge Function planifiée.
- AP-TECH-167 — Seuil d'alerte.
- AP-TECH-168 — Journal de nettoyage.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-049 — Dictée vocale fiable

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-013 |
| Statut actuel | À VÉRIFIER |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-11](ITERATIONS/ITERATION_11.md) |
| Dépendances | AP-FEAT-021, AP-FEAT-038 |
| Modules impactés | `voix.js`, `tournee.js` |

**Description.** Vérifier la reconnaissance sur iPhone installé et Android, repli micro du clavier, vocabulaire étendu aux nouveaux champs.

**Problème résolu.** La dictée dépend du navigateur et souvent d'internet.

**Risques.** Reconnaissance absente hors ligne.

**Tests nécessaires.** Recette manuelle.

**User stories et critères d'acceptation**

- **AP-US-055** — En tant qu'apiculteur, je veux dicter ma visite avec des gants afin de garder les mains libres.
  - GIVEN Android en ligne · WHEN je dis « force quatre, cellules royales ouvertes » · THEN les champs Force et Cellules royales se remplissent
  - GIVEN pas de reconnaissance disponible · WHEN je touche le micro · THEN on m'explique d'utiliser le micro du clavier dans la note

**Tâches techniques**

- AP-TECH-169 — Recette manuelle iPhone/Android.
- AP-TECH-170 — Vocabulaire des nouveaux champs.
- AP-TECH-171 — Message de repli.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-050 — Note vocale enregistrée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-013 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-25](ITERATIONS/ITERATION_25.md) |
| Dépendances | AP-FEAT-047 |
| Modules impactés | `MediaRecorder`, `stockage` |

**Description.** Enregistrer un court audio dans la visite (quand la dictée échoue), transcrit plus tard par l'assistant.

**Problème résolu.** Sans réseau, la dictée ne marche souvent pas ; l'observation est perdue.

**Risques.** Taille des fichiers.

**Tests nécessaires.** Limite 60 s.

**User stories et critères d'acceptation**

- **AP-US-056** — En tant qu'apiculteur, je veux laisser une note vocale de 30 s afin de ne rien oublier quand je ne peux pas écrire.
  - GIVEN hors réseau · WHEN j'enregistre une note de 30 s · THEN elle est jointe à la visite et envoyée au retour du réseau

**Tâches techniques**

- AP-TECH-172 — MediaRecorder (format compressé).
- AP-TECH-173 — File d'envoi commune.
- AP-TECH-174 — Transcription en IT-25.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-004 — Photos orphelines après suppression d'une ruche

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D05 Visites et terrain |
| Epic parent | AP-EPIC-013 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : fichiers effacés avec la ruche, photos_orphelines() (012), scénario etapes_ph ; nettoyage des orphelins existants : IT-11 |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `photos.js`, `rucheForm del` |

**Description.** Supprimer les fichiers des visites d'une ruche supprimée ; recenser les orphelins existants.

**Problème résolu.** La suppression en cascade efface les fiches photo mais pas les fichiers : quota consommé.

**Risques.** Suppression d'un fichier encore référencé.

**Tests nécessaires.** e2e suppression ruche.

**User stories et critères d'acceptation**

- **AP-US-057** — En tant qu'apiculteur, je veux que supprimer une ruche libère l'espace de ses photos afin de ne pas atteindre le quota.
  - GIVEN une ruche avec 6 photos · WHEN je la supprime · THEN les 6 fichiers sont retirés du stockage et l'espace utilisé baisse

**Tâches techniques**

- AP-TECH-175 — PH.oterRuche() avant suppression.
- AP-TECH-176 — Requête de recensement des orphelins (lecture).
- AP-TECH-177 — Nettoyage définitif en IT-11.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D06 — Santé, varroa et traitements


## AP-EPIC-014 — Suivi varroa

Comptages structurés et seuils sourcés.


### AP-FEAT-051 — Comptage varroa en opération

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-014 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-12](ITERATIONS/ITERATION_12.md) |
| Dépendances | AP-FEAT-008, AP-FEAT-025 |
| Modules impactés | `migrations/021`, `v3.js varroa`, `ux.js tauxVarroa` |

**Description.** Comptage par colonie (méthode, abeilles, varroas, jours pour la chute naturelle), en série sur un rucher ; reprise des comptages des visites.

**Problème résolu.** Le comptage est noyé dans la visite et ne se fait pas en série ; la chute naturelle n'est pas calculée par jour.

**Risques.** Écart de calcul à la reprise.

**Tests nécessaires.** Reprise identique ; unitaires taux.

**User stories et critères d'acceptation**

- **AP-US-058** — En tant qu'apiculteur, je veux compter le varroa sur tout un rucher à la suite afin de décider de traiter.
  - GIVEN 10 colonies au Verger · WHEN je lance un comptage sucre glace · THEN je saisis pour chacune abeilles et varroas, et vois le taux pour 100 abeilles au fur et à mesure
  - GIVEN une chute naturelle de 21 varroas sur 7 jours · WHEN j'enregistre · THEN le résultat affiché est 3 varroas par jour

**Tâches techniques**

- AP-TECH-178 — Tables operations / operation_colonies.
- AP-TECH-179 — Reprise depuis visites.varroa*.
- AP-TECH-180 — Écran Comptage en série.
- AP-TECH-181 — creer_visite crée l'opération si varroa fourni.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-052 — Seuils varroa sourcés par méthode et période

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-014 |
| Statut actuel | PARTIEL |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | S |
| Risque | Élevé |
| Itération cible | [IT-12](ITERATIONS/ITERATION_12.md) |
| Dépendances | AP-FEAT-051 |
| Modules impactés | `ux.js seuilVarroa`, `réglages` |

**Description.** Seuils paramétrables par méthode et par période, chacun avec sa source et sa date ; aucun seuil par défaut sans source.

**Problème résolu.** Le seuil par défaut de 3 % n'a ni source ni période : c'est un conseil sanitaire implicite.

**Risques.** Information sanitaire erronée.

**Tests nécessaires.** Revue des sources (doc 15 §sources).

**User stories et critères d'acceptation**

- **AP-US-059** — En tant qu'apiculteur, je veux connaître l'origine du seuil d'alerte afin de lui faire confiance ou l'adapter.
  - GIVEN un seuil préréglé · WHEN je touche « ? » à côté du seuil · THEN je vois la source, sa date et la période concernée, et je peux choisir celui de mon GDS ou de mon technicien
  - GIVEN aucun seuil choisi · WHEN j'enregistre un comptage · THEN le taux est affiché sans couleur d'alerte et on m'invite à choisir un seuil

**Tâches techniques**

- AP-TECH-182 — Table seuils_varroa (méthode, mois début/fin, valeur, source, url, consulté le).
- AP-TECH-183 — Valeurs initiales uniquement si sourcées (relecture humaine).
- AP-TECH-184 — Couleurs d'alerte conditionnées.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-053 — Évolution et comparaison du varroa

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-014 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-13](ITERATIONS/ITERATION_13.md) |
| Dépendances | AP-FEAT-051, AP-FEAT-054 |
| Modules impactés | `écran Suivi varroa` |

**Description.** Courbe par colonie, synthèse par rucher, avant/après traitement.

**Problème résolu.** On voit une courbe par colonie mais pas l'efficacité d'un traitement ni la situation d'un rucher.

**Risques.** Aucun.

**Tests nécessaires.** Captures.

**User stories et critères d'acceptation**

- **AP-US-060** — En tant qu'apiculteur, je veux voir l'effet de mon traitement afin de juger son efficacité.
  - GIVEN un comptage avant et un après traitement · WHEN j'ouvre l'opération de traitement · THEN je vois le taux moyen avant/après et la baisse en %

**Tâches techniques**

- AP-TECH-185 — Vue avant/après liée à l'opération.
- AP-TECH-186 — Synthèse rucher.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-015 — Traitements

Opérations de traitement multi-colonies et traçables.


### AP-FEAT-054 — Opération de traitement multi-colonies

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-015 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-13](ITERATIONS/ITERATION_13.md) |
| Dépendances | AP-FEAT-051 |
| Modules impactés | `migrations/022`, `registre.js`, `essentiels.js registre` |

**Description.** Une opération : produit, substance active, n° AMM, n° de lot, posologie saisie, voie, dates, ordonnance, vétérinaire ; colonies concernées figées.

**Problème résolu.** Aujourd'hui, un traitement = un champ dans une visite d'une ruche : 20 colonies traitées = 20 saisies, registre fragile.

**Risques.** Registre non conforme ; reprise.

**Tests nécessaires.** Registre avant/après.

**User stories et critères d'acceptation**

- **AP-US-061** — En tant qu'apiculteur, je veux enregistrer un traitement pour tout un rucher en une saisie afin de gagner du temps et tenir mon registre.
  - GIVEN 12 colonies au Verger · WHEN j'enregistre un traitement du 1er septembre, fin prévue le 13 octobre · THEN une opération concerne les 12, le registre la montre, une tâche de retrait est créée au 13 octobre
  - GIVEN une colonie déplacée ensuite · WHEN je consulte l'opération · THEN elle figure toujours dans la liste des colonies traitées à cette date

**Tâches techniques**

- AP-TECH-187 — Champs traitement des opérations.
- AP-TECH-188 — Reprise depuis visites.traitement* (1 opération par visite).
- AP-TECH-189 — Écran Traiter (sélecteur de colonies).
- AP-TECH-190 — Décrément de stock par mouvement.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-055 — Catalogue de produits sanitaires sourcé

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-015 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Élevé |
| Itération cible | [IT-13](ITERATIONS/ITERATION_13.md) |
| Dépendances | AP-FEAT-054 |
| Modules impactés | `produits_sanitaires` |

**Description.** Référentiel des médicaments vétérinaires apicoles autorisés, avec source officielle et date ; ajout libre par l'utilisateur.

**Problème résolu.** Saisir à la main nom, substance et AMM à chaque fois est source d'erreurs.

**Risques.** Référentiel périmé ; posologie inventée.

**Tests nécessaires.** Relecture humaine de chaque fiche, date de vérification.

**User stories et critères d'acceptation**

- **AP-US-062** — En tant qu'apiculteur, je veux choisir mon produit dans une liste afin de ne pas me tromper de substance ni d'AMM.
  - GIVEN le catalogue · WHEN je choisis un produit · THEN substance active et n° AMM se remplissent, la posologie reste à saisir par moi, avec un lien vers la notice officielle

**Tâches techniques**

- AP-TECH-191 — Table + source + date.
- AP-TECH-192 — Aucune posologie pré-remplie.
- AP-TECH-193 — Procédure de mise à jour annuelle (doc 15).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-056 — Suivi de fin de traitement et contrôle

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-015 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-13](ITERATIONS/ITERATION_13.md) |
| Dépendances | AP-FEAT-054 |
| Modules impactés | `taches`, `opérations` |

**Description.** Tâche de retrait générée à la date de fin ; proposition de comptage de contrôle ; résultat noté.

**Problème résolu.** Le retrait des lanières est oublié ; l'efficacité n'est pas mesurée.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-063** — En tant qu'apiculteur, je veux être rappelé de retirer le traitement afin de respecter la durée.
  - GIVEN un traitement avec fin prévue le 13 octobre · WHEN le 13 octobre arrive · THEN une tâche « Retirer le traitement (12 colonies) » est due et une notification part si activée

**Tâches techniques**

- AP-TECH-194 — Génération de tâche à la création.
- AP-TECH-195 — Clôture de l'opération avec résultat.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-016 — Maladies et observations sanitaires

Signes, mortalités et suivi sanitaire.


### AP-FEAT-057 — Observations sanitaires structurées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-016 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Élevé |
| Itération cible | [IT-12](ITERATIONS/ITERATION_12.md) |
| Dépendances | AP-FEAT-038 |
| Modules impactés | `visite`, `fiche colonie onglet Santé` |

**Description.** Signes observés (liste paramétrable : couvain en mosaïque, abeilles traînantes, ailes déformées, frelons…), mortalité, gravité ; jamais de diagnostic automatique.

**Problème résolu.** Les signes de maladie finissent dans la note libre et ne sont pas retrouvables.

**Risques.** Interprétation comme diagnostic.

**Tests nécessaires.** Relecture des libellés.

**User stories et critères d'acceptation**

- **AP-US-064** — En tant qu'apiculteur, je veux noter des ailes déformées sur une colonie afin de suivre son évolution et alerter mon GDS si besoin.
  - GIVEN le signe « ailes déformées » coché à la visite · WHEN j'enregistre · THEN l'onglet Santé de la colonie le montre, daté, sans conclusion automatique

**Tâches techniques**

- AP-TECH-196 — Liste de signes paramétrable (source des libellés).
- AP-TECH-197 — Champ dans la visite.
- AP-TECH-198 — Historique sanitaire par colonie.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-058 — Signalement aux autorités sanitaires (aide)

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D06 Santé, varroa et traitements |
| Epic parent | AP-EPIC-016 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Élevé |
| Itération cible | [IT-12](ITERATIONS/ITERATION_12.md) |
| Dépendances | AP-FEAT-057 |
| Modules impactés | `fiche Santé` |

**Description.** Pour les dangers sanitaires réglementés : fiche d'information sourcée et contacts à joindre, sans automatisme.

**Problème résolu.** L'apiculteur ne sait pas toujours qui prévenir.

**Risques.** Information obsolète.

**Tests nécessaires.** Sources datées.

**User stories et critères d'acceptation**

- **AP-US-065** — En tant qu'apiculteur, je veux savoir qui contacter si je soupçonne une maladie réglementée afin de réagir vite.
  - GIVEN un signe classé réglementé · WHEN je l'enregistre · THEN une fiche affiche la démarche officielle sourcée et datée

**Tâches techniques**

- AP-TECH-199 — Liste des dangers réglementés avec source.
- AP-TECH-200 — Fiche contacts paramétrable par département.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D07 — Nourrissement


## AP-EPIC-017 — Nourrissement

Opérations de nourrissement, quantités et coûts.


### AP-FEAT-059 — Opération de nourrissement groupée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D07 Nourrissement |
| Epic parent | AP-EPIC-017 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-14](ITERATIONS/ITERATION_14.md) |
| Dépendances | AP-FEAT-051 |
| Modules impactés | `migrations/023`, `visite_intrants` |

**Description.** Aliment (article), quantité par colonie, objectif (stimulation, réserves, survie), colonies, date ; stock et coût.

**Problème résolu.** Le nourrissement n'est saisi que par visite et par ruche, sans objectif ni coût.

**Risques.** Double décompte.

**Tests nécessaires.** Un seul mouvement par nourrissement.

**User stories et critères d'acceptation**

- **AP-US-066** — En tant qu'apiculteur, je veux nourrir 15 colonies avec 1 kg de candi chacune afin de le noter en une fois.
  - GIVEN 15 colonies cochées · WHEN j'enregistre 1 kg de candi par colonie · THEN le stock de candi baisse de 15 kg et chaque colonie a une ligne de nourrissement
  - GIVEN un stock de 10 kg seulement · WHEN j'enregistre 15 kg · THEN on m'avertit, et je peux corriger le stock ou enregistrer quand même avec un stock négatif signalé

**Tâches techniques**

- AP-TECH-201 — Champs nourrissement des opérations.
- AP-TECH-202 — Mouvement de stock.
- AP-TECH-203 — Écran Nourrir.
- AP-TECH-204 — Intrants de visite → opération (compatibilité).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-060 — Bilan de nourrissement

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D07 Nourrissement |
| Epic parent | AP-EPIC-017 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-14](ITERATIONS/ITERATION_14.md) |
| Dépendances | AP-FEAT-059 |
| Modules impactés | `statistiques` |

**Description.** Quantités et coûts par colonie, rucher et saison ; colonies les plus nourries.

**Problème résolu.** On ne sait pas combien coûte l'hivernage ni quelles colonies dépendent du nourrissement.

**Risques.** Aucun.

**Tests nécessaires.** Calculs sur jeu de démo.

**User stories et critères d'acceptation**

- **AP-US-067** — En tant qu'apiculteur, je veux connaître le coût du nourrissement de l'hiver afin de préparer mon budget.
  - GIVEN une saison de nourrissements · WHEN j'ouvre le bilan · THEN je vois kg et € par rucher et par colonie, triés

**Tâches techniques**

- AP-TECH-205 — Vue d'agrégat.
- AP-TECH-206 — Écran bilan.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D08 — Multiplication et élevage


## AP-EPIC-018 — Événements biologiques

Division, essaim, réunion, remérage : atomiques et liés.


### AP-FEAT-061 — Opérations biologiques atomiques

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-018 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-16](ITERATIONS/ITERATION_16.md) |
| Dépendances | AP-FEAT-033, AP-FEAT-032 |
| Modules impactés | `v3.js`, `migrations/025` |

**Description.** Fonctions SQL : diviser_colonie, reunir_colonies, enregistrer_essaim (capturé ou perdu), remerer, sortie ; une transaction chacune.

**Problème résolu.** Division, essaimage, réunion se font en 2 à 4 écritures : une coupure laisse un état incohérent.

**Risques.** Écart avec le comportement v3.

**Tests nécessaires.** Test de coupure ; SQL.

**User stories et critères d'acceptation**

- **AP-US-068** — En tant qu'apiculteur, je veux diviser une colonie en une opération sûre afin de ne jamais avoir une demi-division.
  - GIVEN la colonie Ruche 2 · WHEN je la divise en « Ruche 2B » placée au Bois · THEN la fille, le lien, les deux événements et la tâche « contrôler la ponte » sont créés ensemble, ou rien
  - GIVEN deux colonies faibles · WHEN je les réunis · THEN l'absorbée passe au statut réunie, ses visites restent consultables, le lien est créé

**Tâches techniques**

- AP-TECH-207 — 4 fonctions SQL idempotentes.
- AP-TECH-208 — Formulaires v3 branchés dessus.
- AP-TECH-209 — Passage par la file hors ligne.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-062 — Essaim capturé et origine

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-018 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-16](ITERATIONS/ITERATION_16.md) |
| Dépendances | AP-FEAT-061 |
| Modules impactés | `v3.js essaimage` |

**Description.** Créer une colonie depuis un essaim capturé (lieu, date, poids), origine conservée.

**Problème résolu.** Un essaim capturé n'a pas d'origine traçable.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-069** — En tant qu'apiculteur, je veux enregistrer un essaim capturé dans le jardin du voisin afin de suivre cette nouvelle colonie.
  - GIVEN un essaim capturé · WHEN je l'enregistre · THEN une colonie d'origine « essaim capturé » est créée avec lieu et date, et apparaît sans parent dans la généalogie

**Tâches techniques**

- AP-TECH-210 — Formulaire dédié.
- AP-TECH-211 — Champ lieu de capture.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-019 — Généalogie

Voir d'où vient chaque colonie.


### AP-FEAT-063 — Arbre généalogique des colonies

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-019 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-16](ITERATIONS/ITERATION_16.md) |
| Dépendances | AP-FEAT-033, AP-FEAT-061 |
| Modules impactés | `src/domaines/elevage` |

**Description.** Vue arbre (ancêtres et descendants) depuis une colonie, et vue d'ensemble par lignée.

**Problème résolu.** On ne voit pas d'où viennent les colonies ni lesquelles se multiplient bien.

**Risques.** Lisibilité sur téléphone.

**Tests nécessaires.** Rendu sur 3 profondeurs.

**User stories et critères d'acceptation**

- **AP-US-070** — En tant qu'apiculteur, je veux voir la descendance de ma meilleure colonie afin de choisir mes colonies à multiplier.
  - GIVEN une colonie avec 2 générations de filles · WHEN j'ouvre son arbre · THEN je vois les filles et petites-filles avec leur statut, et j'ouvre une fiche d'un geste

**Tâches techniques**

- AP-TECH-212 — Requête récursive.
- AP-TECH-213 — Rendu SVG simple, vertical sur téléphone.
- AP-TECH-214 — Statuts en couleur.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-020 — Élevage des reines

Séries d'élevage et calendrier.


### AP-FEAT-064 — Séries d'élevage de reines

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-020 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | L |
| Risque | Moyen |
| Itération cible | [IT-17](ITERATIONS/ITERATION_17.md) |
| Dépendances | AP-FEAT-032 |
| Modules impactés | `migrations/026`, `src/domaines/elevage` |

**Description.** Série : date de greffage, reine mère, méthode, nombre de cellules ; suivi acceptées, nées, fécondées, en ponte, introduites.

**Problème résolu.** L'élevage se suit sur papier ; les taux de réussite ne sont jamais connus.

**Risques.** Complexité.

**Tests nécessaires.** Série complète sur données de test.

**User stories et critères d'acceptation**

- **AP-US-071** — En tant qu'apiculteur éleveur, je veux créer une série de 30 greffons afin de suivre chaque étape.
  - GIVEN une série du 10 mai · WHEN je saisis 22 cellules acceptées · THEN la série affiche 73 % d'acceptation et l'étape suivante
  - GIVEN des reines nées et fécondées · WHEN j'en introduis une dans une colonie · THEN une reine est créée dans cette colonie, liée à la série et à la mère

**Tâches techniques**

- AP-TECH-215 — Tables lignees, series_elevage, serie_etapes.
- AP-TECH-216 — Écrans Série.
- AP-TECH-217 — Création des reines à l'introduction.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-065 — Calendrier d'élevage calculé

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-020 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-17](ITERATIONS/ITERATION_17.md) |
| Dépendances | AP-FEAT-064, AP-FEAT-090 |
| Modules impactés | `serie_etapes`, `taches` |

**Description.** Dates prévues des étapes calculées depuis le greffage avec des délais paramétrables (valeurs par défaut sourcées) ; tâches générées.

**Problème résolu.** Les étapes d'élevage sont très datées ; une erreur de jour fait perdre la série.

**Risques.** Délais présentés comme exacts.

**Tests nécessaires.** Délais modifiables, source affichée.

**User stories et critères d'acceptation**

- **AP-US-072** — En tant qu'apiculteur éleveur, je veux voir le calendrier de ma série afin de ne rater aucune étape.
  - GIVEN un greffage le 10 mai · WHEN je crée la série · THEN les étapes sont datées selon les délais choisis et chacune génère une tâche ; je peux décaler une étape

**Tâches techniques**

- AP-TECH-218 — Délais paramétrables avec source.
- AP-TECH-219 — Génération des tâches.
- AP-TECH-220 — Recalcul si date modifiée.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-021 — Sélection et lignées

Comparer reines et lignées.


### AP-FEAT-066 — Lignées et reines souches

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-021 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-17](ITERATIONS/ITERATION_17.md) |
| Dépendances | AP-FEAT-064 |
| Modules impactés | `reines`, `lignees` |

**Description.** Lignées, reines souches, filiation reine mère → filles.

**Problème résolu.** La sélection génétique n'est pas suivie.

**Risques.** Aucun.

**Tests nécessaires.** Unitaires.

**User stories et critères d'acceptation**

- **AP-US-073** — En tant qu'apiculteur éleveur, je veux rattacher mes reines à une lignée afin de comparer mes lignées.
  - GIVEN une lignée « Buckfast Verger » · WHEN j'y rattache 8 reines · THEN la lignée liste ses reines et leurs colonies

**Tâches techniques**

- AP-TECH-221 — Table lignees.
- AP-TECH-222 — Choix de lignée sur la reine.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-067 — Performances des reines et lignées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D08 Multiplication et élevage |
| Epic parent | AP-EPIC-021 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-066, AP-FEAT-035, AP-FEAT-069 |
| Modules impactés | `statistiques` |

**Description.** Indicateurs par reine et lignée : production, douceur, varroa, essaimage, survie hivernale ; échantillon affiché.

**Problème résolu.** Choisir ses reproductrices se fait à l'intuition.

**Risques.** Conclusions sur petits échantillons.

**Tests nécessaires.** Effectif affiché, pas de classement sous 3 valeurs.

**User stories et critères d'acceptation**

- **AP-US-074** — En tant qu'apiculteur éleveur, je veux comparer mes lignées sur 2 saisons afin de choisir mes reproductrices.
  - GIVEN deux lignées avec 6 et 2 colonies · WHEN j'ouvre la comparaison · THEN je vois les indicateurs avec l'effectif, et la lignée à 2 colonies est marquée « échantillon trop faible »

**Tâches techniques**

- AP-TECH-223 — Vue d'agrégats par reine/lignée.
- AP-TECH-224 — Règle d'effectif minimal.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D09 — Production et traçabilité


## AP-EPIC-022 — Récolte et extraction

De la hausse au maturateur.


### AP-FEAT-068 — Récolte rattachée au rucher et aux colonies

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-022 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-18](ITERATIONS/ITERATION_18.md) |
| Dépendances | AP-FEAT-025 |
| Modules impactés | `migrations/027`, `recolteForm` |

**Description.** Récolte : rucher, miellée, poids brut et tare, hausses ; colonies contributrices facultatives avec estimation.

**Problème résolu.** La récolte est soit globale soit par ruche, sans rucher ni miellée.

**Risques.** Saisie plus longue.

**Tests nécessaires.** Colonies facultatives.

**User stories et critères d'acceptation**

- **AP-US-075** — En tant qu'apiculteur, je veux noter la récolte de printemps du Verger afin de calculer le rendement du rucher.
  - GIVEN une récolte de 84 kg au Verger, miellée colza · WHEN j'enregistre · THEN le rendement du Verger est mis à jour, et je peux préciser les colonies contributrices ou non

**Tâches techniques**

- AP-TECH-225 — Colonnes recoltes.
- AP-TECH-226 — Table recolte_colonies.
- AP-TECH-227 — Formulaire en deux niveaux.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-069 — Extraction (lot de miellerie)

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-022 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-18](ITERATIONS/ITERATION_18.md) |
| Dépendances | AP-FEAT-068 |
| Modules impactés | `migrations/027` |

**Description.** Entité extraction : code, date, récoltes, kg extraits, humidité, maturateur, filtration, pertes ; reprise des codes texte.

**Problème résolu.** Le lien récolte ↔ lot n'est qu'un code texte.

**Risques.** Codes texte incohérents.

**Tests nécessaires.** Reprise sur jeu de test.

**User stories et critères d'acceptation**

- **AP-US-076** — En tant qu'apiculteur, je veux regrouper deux récoltes dans une extraction afin de tracer mon miel.
  - GIVEN deux récoltes du même jour · WHEN je crée l'extraction E260801-1 avec 120 kg et 17,2 % d'humidité · THEN les deux récoltes y sont liées et les pertes sont calculées (récolté − extrait)

**Tâches techniques**

- AP-TECH-228 — Table extractions + liaison.
- AP-TECH-229 — Reprise des codes.
- AP-TECH-230 — Écran Extraction.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-023 — Lots et traçabilité

Du maturateur au pot vendu.


### AP-FEAT-070 — Mise en lots contrôlée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-023 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-18](ITERATIONS/ITERATION_18.md) |
| Dépendances | AP-FEAT-069 |
| Modules impactés | `lotForm` |

**Description.** mettre_en_lots() crée les lots d'une extraction et refuse de conditionner plus que l'extrait.

**Problème résolu.** Aucune cohérence entre kg extraits et pots remplis.

**Risques.** Aucun.

**Tests nécessaires.** Test SQL de dépassement.

**User stories et critères d'acceptation**

- **AP-US-077** — En tant qu'apiculteur, je veux créer mes lots de 500 g et 250 g depuis une extraction afin que tout soit cohérent.
  - GIVEN une extraction de 120 kg · WHEN je crée 200 pots de 500 g et 80 de 250 g · THEN les lots sont créés et 0 kg reste à conditionner
  - GIVEN 40 kg restants · WHEN je tente de remplir 100 pots de 500 g · THEN on m'indique qu'il manque 10 kg

**Tâches techniques**

- AP-TECH-231 — Fonction SQL.
- AP-TECH-232 — Écran depuis la fiche extraction.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-071 — Traçabilité ascendante et descendante

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-023 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-18](ITERATIONS/ITERATION_18.md) |
| Dépendances | AP-FEAT-069, AP-FEAT-054 |
| Modules impactés | `fiche de lot (essentiels.js)` |

**Description.** D'un pot (lot) : extraction, récoltes, ruchers, colonies, traitements de l'année ; d'une récolte : lots et clients.

**Problème résolu.** En cas de problème sur un lot, retrouver les clients ou l'origine est manuel.

**Risques.** Aucun.

**Tests nécessaires.** e2e sur jeu complet.

**User stories et critères d'acceptation**

- **AP-US-078** — En tant qu'apiculteur, je veux savoir à quels clients j'ai vendu un lot afin de pouvoir les prévenir.
  - GIVEN le lot L26-03 vendu à 7 clients · WHEN j'ouvre sa fiche · THEN je vois les 7 clients avec contact, l'extraction, les ruchers et les traitements de la saison

**Tâches techniques**

- AP-TECH-233 — Requêtes de remontée.
- AP-TECH-234 — Fiche de lot enrichie.
- AP-TECH-235 — Export de traçabilité.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-072 — Rendements

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-023 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-18](ITERATIONS/ITERATION_18.md) |
| Dépendances | AP-FEAT-068 |
| Modules impactés | `statistiques` |

**Description.** Rendement par colonie active, rucher, miellée, type de miel, année ; comparaison.

**Problème résolu.** Le rendement n'est connu que globalement.

**Risques.** Colonies actives mal comptées.

**Tests nécessaires.** Unitaires.

**User stories et critères d'acceptation**

- **AP-US-079** — En tant qu'apiculteur, je veux comparer le rendement de mes ruchers afin de décider où poser mes colonies.
  - GIVEN deux ruchers récoltés · WHEN j'ouvre les rendements · THEN je vois kg par colonie active de chaque rucher, par miellée

**Tâches techniques**

- AP-TECH-236 — Vue rendements_annuels.
- AP-TECH-237 — Écran.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-074 — Produits de la ruche hors miel

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-023 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | AP-FEAT-084 |
| Modules impactés | `produits` |

**Description.** Cire, pollen, propolis, essaims, reines vendus : production et stock.

**Problème résolu.** Seul le miel en pot est géré.

**Risques.** Aucun.

**Tests nécessaires.** e2e vente essaim.

**User stories et critères d'acceptation**

- **AP-US-080** — En tant qu'apiculteur, je veux vendre un essaim afin de garder mes ventes au même endroit.
  - GIVEN un produit « essaim sur 5 cadres » · WHEN je le vends · THEN la vente et la facture le montrent ; la colonie passe au statut vendue si je la choisis

**Tâches techniques**

- AP-TECH-238 — Produits typés.
- AP-TECH-239 — Lien optionnel colonie vendue.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-038 — Étiquetage

Étiquettes de pots conformes et imprimables.


### AP-FEAT-073 — Étiquettes de pots conformes

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D09 Production et traçabilité |
| Epic parent | AP-EPIC-038 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Élevé |
| Itération cible | [IT-18](ITERATIONS/ITERATION_18.md) |
| Dépendances | AP-FEAT-070 |
| Modules impactés | `etiquettes.js` |

**Description.** Vérifier et compléter les mentions de l'étiquette (dénomination, poids net, DDM, lot, origine, coordonnées) contre une source officielle datée.

**Problème résolu.** La conformité des étiquettes actuelles n'est pas vérifiée.

**Risques.** Mention manquante.

**Tests nécessaires.** Relecture contre la source.

**User stories et critères d'acceptation**

- **AP-US-081** — En tant qu'apiculteur, je veux imprimer des étiquettes conformes afin de vendre en règle.
  - GIVEN un lot · WHEN j'imprime ses étiquettes · THEN chaque étiquette porte les mentions listées dans la source officielle datée référencée dans la doc, et un contrôle signale un champ manquant

**Tâches techniques**

- AP-TECH-240 — Recherche de la source officielle (DGCCRF, règlement UE).
- AP-TECH-241 — Contrôle des champs requis.
- AP-TECH-242 — Formats d'étiquettes supplémentaires.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D10 — Matériel et stocks


## AP-EPIC-024 — Stocks et mouvements

Un stock juste, calculé par mouvements.


### AP-FEAT-075 — Journal des mouvements de stock

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D10 Matériel et stocks |
| Epic parent | AP-EPIC-024 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-19](ITERATIONS/ITERATION_19.md) |
| Dépendances | AP-BUG-005 |
| Modules impactés | `migrations/028`, `déclencheurs de stock` |

**Description.** mouvements_stock (entrée, consommation, ajustement, inventaire, rebut) ; stock = somme ; reprise d'un mouvement d'ouverture.

**Problème résolu.** Le stock est écrit directement : impossible de savoir pourquoi il a changé.

**Risques.** Écart de reprise.

**Tests nécessaires.** Stock = somme pour chaque article.

**User stories et critères d'acceptation**

- **AP-US-082** — En tant qu'apiculteur, je veux voir pourquoi mon stock de candi a baissé afin de repérer une erreur.
  - GIVEN un article Candy · WHEN j'ouvre son historique · THEN je vois chaque entrée, consommation et ajustement avec date, origine et auteur

**Tâches techniques**

- AP-TECH-243 — Table + déclencheur de somme.
- AP-TECH-244 — Reprise.
- AP-TECH-245 — Remplacement de maj_stock_intrant et maj_stock_achat.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-076 — Inventaire

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D10 Matériel et stocks |
| Epic parent | AP-EPIC-024 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-19](ITERATIONS/ITERATION_19.md) |
| Dépendances | AP-FEAT-075 |
| Modules impactés | `matériel` |

**Description.** Saisir les quantités comptées ; les écarts deviennent des ajustements.

**Problème résolu.** Les stocks dérivent sans moyen simple de les recaler.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-083** — En tant qu'apiculteur, je veux faire l'inventaire de début de saison afin de repartir de stocks justes.
  - GIVEN 10 articles · WHEN je saisis les quantités comptées · THEN un ajustement est créé pour chaque écart, avec la mention Inventaire du jour

**Tâches techniques**

- AP-TECH-246 — Écran Inventaire.
- AP-TECH-247 — Ajustements groupés.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-078 — Prévision des besoins en matériel

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D10 Matériel et stocks |
| Epic parent | AP-EPIC-024 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-075, AP-FEAT-072 |
| Modules impactés | `statistiques`, `simulateur` |

**Description.** Besoins estimés pour la saison (pots selon production prévue, cire, candi selon colonies) comparés au stock.

**Problème résolu.** Les ruptures de pots arrivent en pleine récolte.

**Risques.** Estimation mal comprise.

**Tests nécessaires.** Hypothèses affichées.

**User stories et critères d'acceptation**

- **AP-US-084** — En tant qu'apiculteur, je veux savoir combien de pots commander afin de ne pas manquer à la récolte.
  - GIVEN une production prévue de 600 kg · WHEN j'ouvre la prévision · THEN je vois les pots nécessaires par format, le stock et la quantité à commander, avec les hypothèses

**Tâches techniques**

- AP-TECH-248 — Calcul depuis le simulateur existant.
- AP-TECH-249 — Écran prévision.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-005 — Écritures écrasées à plusieurs (réglages, entrée de stock)

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D10 Matériel et stocks |
| Epic parent | AP-EPIC-024 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : regler() et ajouter_stock() (012, appliquée sur apidoo-test), scénario etapes_cc |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `app.js saveCfg, ACT.entree`, `migrations/012` |

**Description.** Réglages mis à jour par clé côté SQL (regler()) ; entrée de stock en incrément SQL.

**Problème résolu.** Deux membres qui enregistrent en même temps s'écrasent.

**Risques.** Aucun.

**Tests nécessaires.** Test SQL de deux mises à jour simultanées.

**User stories et critères d'acceptation**

- **AP-US-085** — En tant que membre invité, je veux enregistrer mes réglages sans effacer ceux d'un autre afin de travailler à plusieurs.
  - GIVEN deux membres modifient deux réglages différents en même temps · WHEN ils enregistrent · THEN les deux réglages sont conservés

**Tâches techniques**

- AP-TECH-250 — Fonction regler(cle, valeur) (jsonb_set).
- AP-TECH-251 — Fonction ajouter_stock(article, q).
- AP-TECH-252 — Remplacer les appels.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-025 — Matériel et équipements

Où est le matériel, dans quel état.


### AP-FEAT-077 — Matériel localisé et entretenu

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D10 Matériel et stocks |
| Epic parent | AP-EPIC-025 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-19](ITERATIONS/ITERATION_19.md) |
| Dépendances | AP-FEAT-075 |
| Modules impactés | `articles`, `contenants` |

**Description.** Lieu (miellerie, rucher, garage), état (bon, à réparer, rebut), entretiens datés, affectation à un rucher.

**Problème résolu.** On ne sait pas où sont les hausses ni lesquelles sont à réparer.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-086** — En tant qu'apiculteur, je veux savoir combien de hausses sont au rucher d'été afin de préparer la miellée.
  - GIVEN des hausses réparties · WHEN je filtre par lieu · THEN je vois 14 au Lande, 6 à la miellerie dont 2 à réparer

**Tâches techniques**

- AP-TECH-253 — Colonnes lieu, état.
- AP-TECH-254 — Table entretiens.
- AP-TECH-255 — Filtre par lieu.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D11 — Finances


## AP-EPIC-026 — Dépenses, recettes et budget

Consolider la gestion financière existante.


### AP-FEAT-079 — Justificatifs joints aux dépenses

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D11 Finances |
| Epic parent | AP-EPIC-026 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-20](ITERATIONS/ITERATION_20.md) |
| Dépendances | AP-FEAT-048 |
| Modules impactés | `depenses`, `stockage` |

**Description.** Photo ou PDF de la facture fournisseur attaché à la dépense, stockage privé.

**Problème résolu.** Les justificatifs sont ailleurs (papier, boîte mail).

**Risques.** Quota.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-087** — En tant qu'apiculteur, je veux photographier le ticket d'achat de cire afin de le retrouver pour mon comptable.
  - GIVEN une dépense · WHEN j'ajoute la photo du ticket · THEN la dépense porte une pièce jointe consultable et exportée avec l'export comptable

**Tâches techniques**

- AP-TECH-256 — Espace de stockage privé « justificatifs ».
- AP-TECH-257 — Pièce jointe sur la dépense.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-080 — Export comptable

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D11 Finances |
| Epic parent | AP-EPIC-026 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-20](ITERATIONS/ITERATION_20.md) |
| Dépendances | AP-FEAT-079 |
| Modules impactés | `EXP` |

**Description.** Export CSV des dépenses et recettes de l'année (date, libellé, catégorie, montant, mode, pièce) au format attendu par un comptable ; sans prétention de comptabilité certifiée.

**Problème résolu.** Les exports actuels sont séparés et sans pièces.

**Risques.** Format attendu variable.

**Tests nécessaires.** Ouverture dans un tableur.

**User stories et critères d'acceptation**

- **AP-US-088** — En tant qu'apiculteur, je veux envoyer mes comptes de l'année à mon comptable afin de gagner du temps.
  - GIVEN une année de ventes et dépenses · WHEN je lance l'export comptable · THEN je reçois un CSV recettes-dépenses et un ZIP des justificatifs

**Tâches techniques**

- AP-TECH-258 — Format documenté.
- AP-TECH-259 — Export ZIP.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-082 — Recettes hors ventes

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D11 Finances |
| Epic parent | AP-EPIC-026 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-20](ITERATIONS/ITERATION_20.md) |
| Dépendances | — |
| Modules impactés | `finances` |

**Description.** Subventions, prestations (pollinisation), cotisations reçues.

**Problème résolu.** Le résultat ne tient compte que des ventes de miel.

**Risques.** Aucun.

**Tests nécessaires.** Unitaires.

**User stories et critères d'acceptation**

- **AP-US-089** — En tant qu'apiculteur, je veux noter une aide reçue afin d'avoir un résultat juste.
  - GIVEN une aide de 300 € · WHEN je l'enregistre en recette · THEN le résultat de l'année l'inclut

**Tâches techniques**

- AP-TECH-260 — Table recettes ou type sur ventes.
- AP-TECH-261 — Bilan mis à jour.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-027 — Coûts de production et rentabilité

Coût par kg, par rucher, par colonie.


### AP-FEAT-081 — Coût de revient par kg, rucher et colonie

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D11 Finances |
| Epic parent | AP-EPIC-027 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-20](ITERATIONS/ITERATION_20.md) |
| Dépendances | AP-FEAT-072 |
| Modules impactés | `fin()`, `pilotage` |

**Description.** Ventilation des dépenses par rucher (directe ou au prorata des colonies), coût par kg et par colonie active, marge.

**Problème résolu.** Le coût de revient est global ; on ne sait pas quel rucher est rentable.

**Risques.** Clé de répartition contestable.

**Tests nécessaires.** Calculs sur jeu de démo ; clé affichée.

**User stories et critères d'acceptation**

- **AP-US-090** — En tant qu'apiculteur, je veux savoir combien me coûte un kilo de miel du Verger afin de fixer mes prix.
  - GIVEN des dépenses ventilées et une récolte · WHEN j'ouvre la rentabilité · THEN je vois coût par kg et marge par rucher, et la règle de répartition utilisée

**Tâches techniques**

- AP-TECH-262 — depenses.rucher_id.
- AP-TECH-263 — Vue couts_annuels.
- AP-TECH-264 — Écran rentabilité.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D12 — Clients et commercialisation


## AP-EPIC-028 — Clients, produits et commandes

Vendre à des particuliers et à des professionnels.


### AP-FEAT-083 — Clients professionnels

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-028 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | AP-BUG-007 |
| Modules impactés | `clients` |

**Description.** Type de client, raison sociale, SIRET, TVA intracommunautaire, adresse.

**Problème résolu.** Impossible de vendre proprement à une épicerie ou un restaurant.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-091** — En tant qu'apiculteur, je veux enregistrer une épicerie cliente afin de lui faire des factures.
  - GIVEN un client professionnel · WHEN je le crée · THEN raison sociale, SIRET et adresse sont demandés et repris sur ses factures

**Tâches techniques**

- AP-TECH-265 — Colonnes clients.
- AP-TECH-266 — Formulaire selon le type.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-084 — Catalogue de produits et tarifs

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-028 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | — |
| Modules impactés | `lots`, `ventes` |

**Description.** Produits (pot par format, cire, essaim…), prix par défaut, tarif professionnel, remises.

**Problème résolu.** Le prix vient du lot ; pas de tarif pro ni de remise.

**Risques.** Prix figé sur ventes passées.

**Tests nécessaires.** Prix figés à la vente (déjà le cas).

**User stories et critères d'acceptation**

- **AP-US-092** — En tant qu'apiculteur, je veux appliquer un tarif professionnel afin de vendre en gros.
  - GIVEN un tarif pro de 9 € le pot de 500 g · WHEN je vends à un client pro · THEN le prix proposé est 9 € et reste modifiable

**Tâches techniques**

- AP-TECH-267 — Table produits + tarifs.
- AP-TECH-268 — Lien produit ↔ lot.
- AP-TECH-269 — Remise par vente.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-085 — Commandes et préparation

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-028 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | — |
| Modules impactés | `ventes.livre, livraison` |

**Description.** Statuts à préparer, à livrer, livrée ; liste de préparation ; acompte.

**Problème résolu.** « À livrer » existe mais pas de préparation ni d'acompte.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-093** — En tant qu'apiculteur, je veux préparer les commandes de Noël afin de ne rien oublier.
  - GIVEN 8 commandes à préparer · WHEN j'ouvre la liste de préparation · THEN je vois le total de pots par format et la liste par client, imprimable

**Tâches techniques**

- AP-TECH-270 — Statut commande.
- AP-TECH-271 — Écran préparation.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-089 — Historique client

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-028 |
| Statut actuel | EXISTANT ET COHÉRENT |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | — |
| Modules impactés | `alveoles.js viewClients` |

**Description.** Achats, montants, fréquence, dernière commande (existant), avec relance de fin d'année.

**Problème résolu.** Consolidation dans le nouveau modèle.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-094** — En tant qu'apiculteur, je veux retrouver ce qu'un client achète d'habitude afin de lui proposer sa commande de Noël.
  - GIVEN un client fidèle · WHEN j'ouvre sa fiche · THEN je vois ses achats par année et un bouton Relancer

**Tâches techniques**

- AP-TECH-272 — Brancher sur factures/paiements.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-029 — Factures et paiements

Factures fiables, paiements suivis.


### AP-FEAT-086 — Factures figées et avoirs

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-029 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Élevé |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | AP-BUG-007, AP-FEAT-083 |
| Modules impactés | `migrations/030`, `numeroter_facture`, `essentiels.js` |

**Description.** Facture émise = copie figée (client, lignes, totaux), non modifiable, vente facturée non supprimable ; correction par avoir.

**Problème résolu.** Le numéro et le contenu d'une facture peuvent changer après émission ; la vente peut être supprimée.

**Risques.** Conformité.

**Tests nécessaires.** Tests SQL d'immuabilité.

**User stories et critères d'acceptation**

- **AP-US-095** — En tant qu'apiculteur, je veux corriger une facture déjà remise afin de rester en règle.
  - GIVEN une facture émise · WHEN je tente de la modifier · THEN ce n'est pas possible ; on me propose de faire un avoir
  - GIVEN un avoir sur 2 pots · WHEN je l'émets · THEN il porte son propre numéro, référence la facture, et rétablit le stock

**Tâches techniques**

- AP-TECH-273 — Tables factures, avoirs.
- AP-TECH-274 — Déclencheur d'immuabilité.
- AP-TECH-275 — Reprise des factures v5.10.
- AP-TECH-276 — Mentions vérifiées (source datée).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-087 — Paiements partiels et relances

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-029 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | — |
| Modules impactés | `ventes.paye` |

**Description.** Plusieurs paiements par vente, solde restant, relance (existe) liée au solde.

**Problème résolu.** Une vente est payée ou non, sans acompte.

**Risques.** Reprise de paye.

**Tests nécessaires.** Reprise : paye = un paiement du total.

**User stories et critères d'acceptation**

- **AP-US-096** — En tant qu'apiculteur, je veux noter un acompte afin de suivre ce qui reste dû.
  - GIVEN une vente de 60 € · WHEN j'enregistre 20 € d'acompte · THEN elle affiche 40 € restants et reste dans « À encaisser »

**Tâches techniques**

- AP-TECH-277 — Table paiements.
- AP-TECH-278 — Reprise.
- AP-TECH-279 — Solde calculé.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-088 — Facturation électronique : position et export

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-029 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Élevé |
| Itération cible | [IT-21](ITERATIONS/ITERATION_21.md) |
| Dépendances | AP-FEAT-086 |
| Modules impactés | `factures` |

**Description.** Documenter l'obligation applicable (réception depuis le 1er sept. 2026 pour toutes les entreprises, émission PME au 1er sept. 2027), proposer un export structuré (Factur-X) ou un partenaire agréé selon la décision D-05.

**Problème résolu.** Les apiculteurs professionnels devront émettre leurs factures B2B par une plateforme agréée en 2027.

**Risques.** Mauvaise interprétation réglementaire.

**Tests nécessaires.** Validation par un expert-comptable.

**User stories et critères d'acceptation**

- **AP-US-097** — En tant qu'apiculteur professionnel, je veux savoir si mes factures Apidoo seront valables en 2027 afin de ne pas être en défaut.
  - GIVEN une exploitation professionnelle · WHEN j'ouvre l'aide Facturation · THEN je lis ce qui s'applique à mon cas, sourcé et daté, et comment exporter vers ma plateforme

**Tâches techniques**

- AP-TECH-280 — Note réglementaire sourcée (doc 15).
- AP-TECH-281 — Décision D-05.
- AP-TECH-282 — Export Factur-X ou intégration partenaire.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-007 — Facture sans adresse du client

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D12 Clients et commercialisation |
| Epic parent | AP-EPIC-029 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : adresse, code postal, ville, SIRET (012), facture et export, scénario etapes_fa |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `essentiels.js facture`, `clientForm`, `migrations/012` |

**Description.** Ajouter adresse, code postal, ville au client et à la facture (la facture lit un champ inexistant).

**Problème résolu.** Les factures à des professionnels sont incomplètes.

**Risques.** Aucun.

**Tests nécessaires.** e2e facture.

**User stories et critères d'acceptation**

- **AP-US-098** — En tant qu'apiculteur, je veux que mes factures portent l'adresse du client afin de les remettre à un professionnel.
  - GIVEN un client avec adresse · WHEN j'imprime sa facture · THEN l'adresse complète figure dans le bloc destinataire

**Tâches techniques**

- AP-TECH-283 — Colonnes clients.adresse, code_postal, ville.
- AP-TECH-284 — Formulaire client.
- AP-TECH-285 — Facture.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D13 — Calendrier, tâches et rappels


## AP-EPIC-030 — Tâches et calendrier

Planifier, répéter, répartir.


### AP-FEAT-090 — Tâches récurrentes et générées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D13 Calendrier, tâches et rappels |
| Epic parent | AP-EPIC-030 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-15](ITERATIONS/ITERATION_15.md) |
| Dépendances | — |
| Modules impactés | `taches`, `rappels.js` |

**Description.** Récurrence simple, priorité, assignation à un membre, origine (traitement, élevage, déclaration) ; tâches générées par les opérations.

**Problème résolu.** Les tâches répétitives se ressaisissent ; aucune tâche n'est créée automatiquement.

**Risques.** Avalanche de tâches.

**Tests nécessaires.** Unitaires de récurrence.

**User stories et critères d'acceptation**

- **AP-US-099** — En tant qu'apiculteur, je veux une tâche « peser les ruches » tous les 15 jours en hiver afin de ne plus y penser.
  - GIVEN une tâche récurrente de novembre à février · WHEN je la coche · THEN la suivante est créée 15 jours plus tard, sauf hors période
- **AP-US-100** — En tant que responsable d'exploitation, je veux assigner une tâche à un membre afin de répartir le travail.
  - GIVEN une tâche assignée à Paul · WHEN Paul ouvre l'accueil · THEN elle apparaît dans « À faire » avec son nom

**Tâches techniques**

- AP-TECH-286 — Colonnes recurrence, priorite, assigne_email, origine.
- AP-TECH-287 — Régénération à la complétion.
- AP-TECH-288 — Génération depuis opérations.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-091 — Vue calendrier

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D13 Calendrier, tâches et rappels |
| Epic parent | AP-EPIC-030 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-15](ITERATIONS/ITERATION_15.md) |
| Dépendances | AP-FEAT-090 |
| Modules impactés | `agenda` |

**Description.** Mois et semaine : tâches, opérations, étapes d'élevage, visites passées ; déplacement d'une tâche.

**Problème résolu.** L'agenda est une liste ; on ne voit pas la charge d'une semaine.

**Risques.** Lisibilité mobile.

**Tests nécessaires.** Captures mobiles.

**User stories et critères d'acceptation**

- **AP-US-101** — En tant qu'apiculteur, je veux voir mon mois de mai afin de répartir mes visites.
  - GIVEN des tâches et étapes en mai · WHEN j'ouvre le calendrier · THEN chaque jour montre ses éléments ; sur téléphone, une semaine par écran

**Tâches techniques**

- AP-TECH-289 — Composant calendrier sans dépendance lourde.
- AP-TECH-290 — Vue liste conservée.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-094 — Conseils de saison sourcés

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D13 Calendrier, tâches et rappels |
| Epic parent | AP-EPIC-030 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-15](ITERATIONS/ITERATION_15.md) |
| Dépendances | — |
| Modules impactés | `app.js SAISON`, `essentiels.js conseils du mois` |

**Description.** Les idées du mois (SAISON) deviennent paramétrables par région et citent leur source ; transformables en tâches.

**Problème résolu.** Les conseils sont génériques et non sourcés.

**Risques.** Conseil inadapté à la région.

**Tests nécessaires.** Relecture.

**User stories et critères d'acceptation**

- **AP-US-102** — En tant qu'apiculteur, je veux des conseils adaptés à ma région afin qu'ils soient pertinents.
  - GIVEN une exploitation en Bretagne · WHEN j'ouvre Ce mois-ci · THEN les conseils indiquent leur source et s'adaptent au calendrier choisi

**Tâches techniques**

- AP-TECH-291 — Format de conseils (mois, région, source).
- AP-TECH-292 — Calendrier par défaut neutre.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-031 — Rappels et notifications

Être prévenu même application fermée.


### AP-FEAT-092 — Notifications push

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D13 Calendrier, tâches et rappels |
| Epic parent | AP-EPIC-031 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | L |
| Risque | Moyen |
| Itération cible | [IT-15](ITERATIONS/ITERATION_15.md) |
| Dépendances | AP-FEAT-090 |
| Modules impactés | `sw.js`, `supabase/functions/notifier`, `essentiels.js` |

**Description.** Rappels envoyés par le serveur (tâches du jour, fin de traitement, créneau météo), même application fermée. Push web (VAPID) sur le site ; notifications natives (APNs, FCM) dans les applications iOS et Android.

**Problème résolu.** Les rappels n'apparaissent que quand l'app est ouverte : ils ne rappellent pas.

**Risques.** iPhone exige l'app installée ; fatigue.

**Tests nécessaires.** Recette manuelle.

**User stories et critères d'acceptation**

- **AP-US-103** — En tant qu'apiculteur, je veux recevoir un rappel le matin des tâches du jour afin de ne rien oublier.
  - GIVEN des notifications activées et 2 tâches aujourd'hui · WHEN il est 8 h · THEN je reçois une notification « 2 tâches aujourd'hui » qui ouvre l'écran Rappels

**Tâches techniques**

- AP-TECH-293 — Clés VAPID (secret Supabase).
- AP-TECH-294 — Table abonnements_push.
- AP-TECH-295 — Edge Function planifiée.
- AP-TECH-296 — Gestion push dans sw.js.
- AP-TECH-407 — Notifications natives (APNs, FCM) via le module Capacitor ; jetons dans abonnements_push avec la plateforme.
- AP-TECH-408 — Edge Function notifier : envoi web ou natif selon la plateforme de chaque abonnement.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-093 — Préférences de notification

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D13 Calendrier, tâches et rappels |
| Epic parent | AP-EPIC-031 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-15](ITERATIONS/ITERATION_15.md) |
| Dépendances | AP-FEAT-092 |
| Modules impactés | `réglages` |

**Description.** Choix des sujets, heure, silence, par appareil.

**Problème résolu.** Trop de notifications font tout couper.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-104** — En tant qu'apiculteur, je veux ne recevoir que les fins de traitement afin de garder l'essentiel.
  - GIVEN les préférences · WHEN je coupe Tâches et garde Traitements · THEN seules les fins de traitement sont notifiées

**Tâches techniques**

- AP-TECH-297 — Préférences par abonnement.
- AP-TECH-298 — Respect dans notifier.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D14 — Météo et environnement


## AP-EPIC-032 — Météo et environnement

Météo utile, sourcée, historisée.


### AP-FEAT-095 — Météo enregistrée avec la visite

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D14 Météo et environnement |
| Epic parent | AP-EPIC-032 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-22](ITERATIONS/ITERATION_22.md) |
| Dépendances | AP-FEAT-038 |
| Modules impactés | `meteo.js`, `visites.meteo` |

**Description.** Température, vent, pluie au moment de la visite (observation la plus proche), source et heure.

**Problème résolu.** On ne relie pas comportement de la colonie et conditions.

**Risques.** Hors ligne.

**Tests nécessaires.** Visite hors ligne : « non disponible ».

**User stories et critères d'acceptation**

- **AP-US-105** — En tant qu'apiculteur, je veux retrouver la météo d'une ancienne visite afin de comprendre un comportement agressif.
  - GIVEN une visite en ligne · WHEN je l'enregistre · THEN la météo du moment est enregistrée avec sa source, et affichée dans le journal

**Tâches techniques**

- AP-TECH-299 — Capture au démarrage de la visite.
- AP-TECH-300 — Colonne meteo jsonb.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-096 — Floraisons et miellées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D14 Météo et environnement |
| Epic parent | AP-EPIC-032 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-22](ITERATIONS/ITERATION_22.md) |
| Dépendances | AP-FEAT-025 |
| Modules impactés | `fiche rucher` |

**Description.** Floraisons observées par rucher (date, plante), miellées et leurs dates ; calendrier de production d'une année sur l'autre.

**Problème résolu.** Le calendrier mellifère de chaque rucher n'est pas capitalisé.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-106** — En tant qu'apiculteur, je veux noter le début de la floraison du colza au Verger afin de prévoir mes hausses l'an prochain.
  - GIVEN une floraison notée deux années · WHEN j'ouvre la fiche rucher · THEN je vois les dates comparées d'une année sur l'autre

**Tâches techniques**

- AP-TECH-301 — Table floraisons.
- AP-TECH-302 — Liste de plantes éditable.
- AP-TECH-303 — Rappel l'année suivante.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-097 — Alertes météo et conditions d'usage

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D14 Météo et environnement |
| Epic parent | AP-EPIC-032 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-22](ITERATIONS/ITERATION_22.md) |
| Dépendances | — |
| Modules impactés | `meteo.js`, `ux.js` |

**Description.** Alertes gel, vent fort, canicule par rucher ; vérification des conditions commerciales d'Open-Meteo, Nominatim et tuiles OSM.

**Problème résolu.** Les créneaux existent, pas les alertes ; l'usage commercial de ces services n'est pas vérifié.

**Risques.** Coût imprévu à la commercialisation.

**Tests nécessaires.** Revue des conditions.

**User stories et critères d'acceptation**

- **AP-US-107** — En tant qu'apiculteur, je veux être prévenu d'un coup de vent fort sur un rucher afin de sangler mes ruches.
  - GIVEN un vent prévu de 70 km/h au Lande · WHEN la prévision est mise à jour · THEN une alerte apparaît sur l'accueil, avec la source et l'heure de mise à jour

**Tâches techniques**

- AP-TECH-304 — Seuils d'alerte paramétrables.
- AP-TECH-305 — Note sur les conditions des services (D-09).
- AP-TECH-306 — Suppression du doublon d'appel météo (ux.js).
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D15 — Réglementation et documents


## AP-EPIC-033 — Déclaration et registre

Obligations réglementaires accompagnées et sourcées.


### AP-FEAT-098 — Déclaration annuelle accompagnée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D15 Réglementation et documents |
| Epic parent | AP-EPIC-033 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-13](ITERATIONS/ITERATION_13.md) |
| Dépendances | AP-FEAT-028 |
| Modules impactés | `v3.js declaration` |

**Description.** Rappel pendant la période (1er septembre – 31 décembre), chiffres préparés (colonies, emplacements), historique des déclarations faites, lien officiel.

**Problème résolu.** L'aide existe ; l'historique et les rappels manquent.

**Risques.** Règle qui change.

**Tests nécessaires.** Source datée affichée.

**User stories et critères d'acceptation**

- **AP-US-108** — En tant qu'apiculteur, je veux être rappelé de déclarer mes ruches afin de respecter l'obligation.
  - GIVEN le 1er septembre · WHEN j'ouvre l'accueil · THEN une tâche « Déclarer tes ruches avant le 31 décembre » est proposée, avec le nombre de colonies et la commune de chaque rucher
  - GIVEN la déclaration faite · WHEN je la marque faite · THEN l'historique garde la date et les chiffres déclarés

**Tâches techniques**

- AP-TECH-307 — Tâche générée.
- AP-TECH-308 — Table declarations.
- AP-TECH-309 — Source officielle datée dans l'écran.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-099 — Registre d'élevage vérifié

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D15 Réglementation et documents |
| Epic parent | AP-EPIC-033 |
| Statut actuel | PARTIEL |
| Priorité | P0 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Élevé |
| Itération cible | [IT-13](ITERATIONS/ITERATION_13.md) |
| Dépendances | AP-FEAT-054, AP-FEAT-029 |
| Modules impactés | `registre.js`, `essentiels.js` |

**Description.** Contenu du registre (identification, mouvements, traitements, interventions) vérifié contre les textes en vigueur, avec la date de vérification ; impression et export.

**Problème résolu.** Le registre est bêta et sa conformité n'a jamais été vérifiée contre un texte.

**Risques.** Non-conformité lors d'un contrôle.

**Tests nécessaires.** Relecture par un professionnel (GDS, vétérinaire).

**User stories et critères d'acceptation**

- **AP-US-109** — En tant qu'apiculteur, je veux imprimer un registre complet en cas de contrôle afin d'être en règle.
  - GIVEN une année de traitements et mouvements · WHEN j'imprime le registre · THEN il contient toutes les rubriques exigées par le texte cité en pied de page, avec sa date de vérification

**Tâches techniques**

- AP-TECH-310 — Recherche des textes applicables (doc 15).
- AP-TECH-311 — Matrice rubriques ↔ données.
- AP-TECH-312 — Ajout des champs manquants.
- AP-TECH-313 — Relecture externe.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-100 — Échéances réglementaires et cadre par pays

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D15 Réglementation et documents |
| Epic parent | AP-EPIC-033 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-31](ITERATIONS/ITERATION_31.md) |
| Dépendances | AP-FEAT-098 |
| Modules impactés | `réglementation` |

**Description.** Échéances (déclaration, renouvellement d'ordonnance) paramétrées par pays ; France par défaut.

**Problème résolu.** Les règles sont codées pour la France dans l'interface.

**Risques.** Aucun.

**Tests nécessaires.** Unitaires.

**User stories et critères d'acceptation**

- **AP-US-110** — En tant qu'apiculteur belge, je veux des échéances adaptées à mon pays afin d'utiliser Apidoo hors de France.
  - GIVEN une exploitation en Belgique · WHEN j'ouvre Ce mois-ci · THEN aucune échéance française n'apparaît ; les échéances belges paramétrées sont affichées

**Tâches techniques**

- AP-TECH-314 — Colonne exploitations.pays.
- AP-TECH-315 — Table echeances par pays.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-034 — Documents et justificatifs

Ranger ordonnances, factures, attestations.


### AP-FEAT-101 — Coffre de documents

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D15 Réglementation et documents |
| Epic parent | AP-EPIC-034 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-26](ITERATIONS/ITERATION_26.md) |
| Dépendances | AP-FEAT-079 |
| Modules impactés | `documents`, `stockage` |

**Description.** Ordonnances, attestations, récépissés de déclaration, contrats d'emplacement, rangés et liés (colonie, rucher, opération).

**Problème résolu.** Les justificatifs réglementaires sont dispersés.

**Risques.** Quota.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-111** — En tant qu'apiculteur, je veux joindre l'ordonnance à un traitement afin de la présenter en cas de contrôle.
  - GIVEN un traitement sous ordonnance · WHEN je joins la photo de l'ordonnance · THEN elle est visible depuis l'opération et le registre

**Tâches techniques**

- AP-TECH-316 — Table documents.
- AP-TECH-317 — Stockage privé.
- AP-TECH-318 — Liens.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-037 — Exports et portabilité

Sortir ses données à tout moment.


### AP-FEAT-024 — Export complet de l'exploitation

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D15 Réglementation et documents |
| Epic parent | AP-EPIC-037 |
| Statut actuel | PARTIEL |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Faible |
| Itération cible | [IT-26](ITERATIONS/ITERATION_26.md) |
| Dépendances | — |
| Modules impactés | `supabase/functions/exporter`, `app.js EXP` |

**Description.** Archive ZIP : toutes les tables en JSON et CSV, photos, documents, réimportable.

**Problème résolu.** La sauvegarde JSON actuelle ne contient que les données chargées, sans photos.

**Risques.** Taille.

**Tests nécessaires.** Réimport dans un projet vide.

**User stories et critères d'acceptation**

- **AP-US-112** — En tant qu'apiculteur, je veux récupérer toutes mes données afin de ne jamais être captif.
  - GIVEN une exploitation avec photos · WHEN je demande l'export · THEN je reçois un lien vers une archive contenant toutes les tables et les photos, valable 24 h

**Tâches techniques**

- AP-TECH-319 — Edge Function de génération.
- AP-TECH-320 — Lien signé.
- AP-TECH-321 — Script de réimport documenté.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-102 — Exports métier enrichis

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D15 Réglementation et documents |
| Epic parent | AP-EPIC-037 |
| Statut actuel | EXISTANT ET COHÉRENT |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-26](ITERATIONS/ITERATION_26.md) |
| Dépendances | — |
| Modules impactés | `EXP` |

**Description.** Exports CSV par domaine (colonies, opérations, récoltes, lots) en plus des existants.

**Problème résolu.** Les exports couvrent visites, ventes, dépenses, clients seulement.

**Risques.** Aucun.

**Tests nécessaires.** Ouverture dans un tableur.

**User stories et critères d'acceptation**

- **AP-US-113** — En tant qu'apiculteur, je veux exporter mes traitements de l'année afin de les analyser dans un tableur.
  - GIVEN des opérations · WHEN j'exporte · THEN je reçois un CSV avec une ligne par colonie traitée

**Tâches techniques**

- AP-TECH-322 — Nouveaux exports.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D16 — Pilotage et tableau de bord


## AP-EPIC-040 — Tableau de bord

La bonne information au bon moment.


### AP-FEAT-103 — Accueil selon le niveau d'usage

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D16 Pilotage et tableau de bord |
| Epic parent | AP-EPIC-040 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `alveoles.js viewDash`, `demarrage.js` |

**Description.** Composition de l'accueil selon le niveau (Essentiel, Suivi, Professionnel) ; sections masquables.

**Problème résolu.** Un amateur et un professionnel n'ont pas besoin des mêmes informations.

**Risques.** Fonction cachée introuvable.

**Tests nécessaires.** Captures par niveau.

**User stories et critères d'acceptation**

- **AP-US-114** — En tant qu'apiculteur amateur, je veux un accueil simple afin de ne pas être noyé.
  - GIVEN le niveau Essentiel · WHEN j'ouvre l'accueil · THEN je vois priorité du jour, mes ruchers et À faire ; pas de rendement ni de marge

**Tâches techniques**

- AP-TECH-323 — Réglage de niveau.
- AP-TECH-324 — Sections conditionnelles.
- AP-TECH-325 — Réglage Masquer par section.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-104 — Alertes calculées classées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D16 Pilotage et tableau de bord |
| Epic parent | AP-EPIC-040 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-002, AP-FEAT-052 |
| Modules impactés | `app.js todos`, `rappels`, `alveoles` |

**Description.** Alertes unifiées (sanitaire, essaimage, provisions, orpheline, stocks, échéances, file à corriger), classées par gravité, chacune avec son explication.

**Problème résolu.** Les alertes sont calculées à plusieurs endroits avec des règles différentes (todos(), lentilles, rappels).

**Risques.** Faux positifs.

**Tests nécessaires.** Unitaires par règle.

**User stories et critères d'acceptation**

- **AP-US-115** — En tant qu'apiculteur, je veux comprendre pourquoi une colonie est en alerte afin de décider en connaissance de cause.
  - GIVEN une colonie en alerte varroa · WHEN je touche l'alerte · THEN je lis « Taux 4,2 % au 12/08, au-dessus du seuil 3 % (source…) »

**Tâches techniques**

- AP-TECH-326 — Module regles/alertes.js unique.
- AP-TECH-327 — Remplacer todos() et calculs des lentilles.
- AP-TECH-328 — Tests unitaires.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-041 — Statistiques et comparaisons

Comprendre la saison et la comparer.


### AP-FEAT-105 — Comparaison avec l'année précédente

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D16 Pilotage et tableau de bord |
| Epic parent | AP-EPIC-041 |
| Statut actuel | PARTIEL |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | — |
| Modules impactés | `pilotage` |

**Description.** Production, ventes, dépenses, mortalité, comparées à N-1 (et à date).

**Problème résolu.** Le bilan affiche une évolution des ventes seulement.

**Risques.** Aucun.

**Tests nécessaires.** Unitaires.

**User stories et critères d'acceptation**

- **AP-US-116** — En tant qu'apiculteur, je veux comparer ma saison à la précédente afin de voir si je progresse.
  - GIVEN deux saisons · WHEN j'ouvre le bilan · THEN chaque indicateur affiche N, N-1 et l'écart, à date égale

**Tâches techniques**

- AP-TECH-329 — Vue d'agrégats par année.
- AP-TECH-330 — Composant chiffre comparé.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-106 — Indicateurs colonies et mortalité hivernale

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D16 Pilotage et tableau de bord |
| Epic parent | AP-EPIC-041 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-030 |
| Modules impactés | `statistiques` |

**Description.** Colonies actives, mortes, perdues, réunies, créées ; taux de pertes hivernales.

**Problème résolu.** La mortalité, indicateur clé de l'apiculture, n'est pas calculée.

**Risques.** Définition de « l'hiver ».

**Tests nécessaires.** Période paramétrable.

**User stories et critères d'acceptation**

- **AP-US-117** — En tant qu'apiculteur, je veux connaître mes pertes hivernales afin d'améliorer mon hivernage.
  - GIVEN 20 colonies au 1er novembre, 17 au 1er avril · WHEN j'ouvre les indicateurs · THEN je vois 15 % de pertes hivernales avec la liste des colonies perdues

**Tâches techniques**

- AP-TECH-331 — Calcul sur statuts historisés.
- AP-TECH-332 — Période paramétrable.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D17 — Assistant intelligent API


## AP-EPIC-042 — Assistant en lecture

Questions en langage naturel sur ses données.


### AP-FEAT-107 — Questions sur ses données

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D17 Assistant intelligent API |
| Epic parent | AP-EPIC-042 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 5/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-24](ITERATIONS/ITERATION_24.md) |
| Dépendances | AP-FEAT-008, AP-FEAT-014 |
| Modules impactés | `supabase/functions/assistant`, `alveoles.js compagnon` |

**Description.** Edge Function : modèle de langage + outils de lecture (colonies, visites, opérations, récoltes, ventes, stocks) appelés avec le jeton de l'utilisateur.

**Problème résolu.** Trouver une information demande de naviguer entre plusieurs écrans.

**Risques.** Hallucination ; fuite ; coût.

**Tests nécessaires.** 30 questions de référence ; test de fuite.

**User stories et critères d'acceptation**

- **AP-US-118** — En tant qu'apiculteur, je veux demander « quelles colonies dois-je visiter cette semaine ? » afin de préparer ma semaine.
  - GIVEN des colonies non visitées depuis 3 semaines et une alerte essaimage · WHEN je pose la question · THEN API répond avec la liste justifiée par des faits datés, des liens vers les fiches, et ce qui lui manque pour mieux répondre
  - GIVEN une question sur une exploitation dont je ne suis pas membre · WHEN je la pose · THEN API répond qu'il n'a pas accès à ces données

**Tâches techniques**

- AP-TECH-333 — Choix du modèle et budget (D-07).
- AP-TECH-334 — Outils de lecture typés.
- AP-TECH-335 — Format de réponse en 4 blocs.
- AP-TECH-336 — Plafond d'usage.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-108 — Réponses structurées et sourcées

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D17 Assistant intelligent API |
| Epic parent | AP-EPIC-042 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Élevé |
| Itération cible | [IT-24](ITERATIONS/ITERATION_24.md) |
| Dépendances | AP-FEAT-107 |
| Modules impactés | `assistant` |

**Description.** Toute réponse sépare Faits (avec références), Hypothèses, Recommandations (sourcées si sanitaires) et Informations manquantes.

**Problème résolu.** Sans cela, l'assistant peut présenter une supposition comme un fait.

**Risques.** Non-respect du format.

**Tests nécessaires.** Validation du format sur les 30 questions.

**User stories et critères d'acceptation**

- **AP-US-119** — En tant qu'apiculteur, je veux distinguer ce que dit mes données de ce que suppose API afin de garder mon jugement.
  - GIVEN une question sur l'état sanitaire · WHEN API répond · THEN aucune recommandation de traitement n'apparaît sans source, et les faits renvoient aux saisies

**Tâches techniques**

- AP-TECH-337 — Schéma de réponse JSON.
- AP-TECH-338 — Rendu en 4 blocs.
- AP-TECH-339 — Interdits sanitaires dans les instructions.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-043 — Assistant : actions et analyses

Saisies et préparations proposées, validées par l'utilisateur.


### AP-FEAT-109 — Visite créée depuis une note vocale

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D17 Assistant intelligent API |
| Epic parent | AP-EPIC-043 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 5/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-25](ITERATIONS/ITERATION_25.md) |
| Dépendances | AP-FEAT-107, AP-FEAT-050 |
| Modules impactés | `tournee.js vérification`, `assistant` |

**Description.** Transcription libre → brouillon de visite (une ou plusieurs colonies) présenté dans l'écran de vérification de la tournée.

**Problème résolu.** La dictée par mots-clés est stricte ; parler naturellement serait plus rapide.

**Risques.** Écriture non validée.

**Tests nécessaires.** Aucune écriture sans validation (test).

**User stories et critères d'acceptation**

- **AP-US-120** — En tant qu'apiculteur, je veux dire naturellement ce que je vois afin de remplir la visite sans formulaire.
  - GIVEN « Ruche 3, belle reine marquée, six cadres de couvain, un peu juste en provisions » · WHEN j'envoie la note · THEN un brouillon de visite de Ruche 3 est proposé avec les champs remplis et les doutes marqués « ? », rien n'est enregistré avant ma validation

**Tâches techniques**

- AP-TECH-340 — Extraction structurée.
- AP-TECH-341 — Réutiliser l'écran de vérification.
- AP-TECH-342 — Journal propositions/acceptations.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-110 — Synthèses et données manquantes

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D17 Assistant intelligent API |
| Epic parent | AP-EPIC-043 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-25](ITERATIONS/ITERATION_25.md) |
| Dépendances | AP-FEAT-107 |
| Modules impactés | `assistant` |

**Description.** Synthèse de saison, compte rendu de rucher, détection d'incohérences (poids impossible, colonie sans visite, traitement sans fin).

**Problème résolu.** Le bilan demande de rassembler soi-même les informations.

**Risques.** Aucun.

**Tests nécessaires.** Jeu de démo avec anomalies.

**User stories et critères d'acceptation**

- **AP-US-121** — En tant qu'apiculteur, je veux une synthèse de ma saison en une page afin de la partager avec mon GDS ou ma famille.
  - GIVEN une saison de données · WHEN je demande la synthèse · THEN j'obtiens un document avec chiffres clés, faits marquants et anomalies à vérifier, exportable

**Tâches techniques**

- AP-TECH-343 — Gabarit de synthèse.
- AP-TECH-344 — Règles d'anomalies déterministes + rédaction par le modèle.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-111 — Analyse de photo assistée

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D17 Assistant intelligent API |
| Epic parent | AP-EPIC-043 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P4 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Élevé |
| Itération cible | [IT-25](ITERATIONS/ITERATION_25.md) |
| Dépendances | AP-FEAT-107, AP-FEAT-047 |
| Modules impactés | `assistant`, `photos` |

**Description.** Description d'une photo de cadre (couvain, cellules, présence de varroas visibles) présentée comme hypothèse à confirmer.

**Problème résolu.** Repérer des signes sur une photo demande de l'expérience.

**Risques.** Faux diagnostic.

**Tests nécessaires.** Jamais de diagnostic ; validation scientifique avant toute promesse.

**User stories et critères d'acceptation**

- **AP-US-122** — En tant qu'apiculteur, je veux un second regard sur une photo de cadre afin de ne rien manquer.
  - GIVEN une photo de cadre · WHEN je demande une analyse · THEN API décrit ce qu'il voit en hypothèses, avec un niveau de confiance et l'invitation à vérifier sur place

**Tâches techniques**

- AP-TECH-345 — Prototype interne.
- AP-TECH-346 — Avertissement permanent.
- AP-TECH-347 — Évaluation sur photos annotées.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D18 — Expérience utilisateur transversale


## AP-EPIC-044 — Navigation, cohérence et ton

Une interface stable et homogène.


### AP-FEAT-036 — Messages d'erreur en français

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-044 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : traduction des codes d'erreur, journal sur l'appareil (table journal_erreurs en IT-03), scénario etapes_er |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `app.js fail()` |

**Description.** Table de traduction des erreurs Postgres, PostgREST et Auth, avec action proposée.

**Problème résolu.** Certaines erreurs s'affichent brutes, en anglais.

**Risques.** Message masquant une vraie cause.

**Tests nécessaires.** Unitaires sur les codes connus.

**User stories et critères d'acceptation**

- **AP-US-123** — En tant qu'apiculteur, je veux comprendre une erreur et savoir quoi faire afin de ne pas rester bloqué.
  - GIVEN une erreur de droits (42501) · WHEN elle survient · THEN je lis « Ton rôle ne permet pas cette action » et le détail technique part dans le journal

**Tâches techniques**

- AP-TECH-348 — Dictionnaire code → message.
- AP-TECH-349 — Message par défaut sobre.
- AP-TECH-350 — Détail vers journal_erreurs.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-112 — Charte de ton unique

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-044 |
| Statut actuel | FAIT — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : docs/CHARTE_DE_TON.md, ≈ 80 textes passés au tutoiement, contrôle automatique tests/unitaires/ton.test.mjs |
| Priorité | P2 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | — |
| Modules impactés | `tous les textes` |

**Description.** Tutoiement dans l'application, vouvoiement dans les documents émis ; relecture de tous les textes.

**Problème résolu.** Environ 70 « vous » et 85 « tu » se mélangent.

**Risques.** Aucun.

**Tests nécessaires.** Recherche automatique des formes « vous » en CI.

**User stories et critères d'acceptation**

- **AP-US-124** — En tant qu'apiculteur, je veux une application qui me parle toujours de la même façon afin de m'y sentir à l'aise.
  - GIVEN tous les écrans · WHEN je les parcours · THEN l'application me tutoie partout ; factures et registre vouvoient

**Tâches techniques**

- AP-TECH-351 — Charte dans docs.
- AP-TECH-352 — Relecture.
- AP-TECH-353 — Contrôle grep en CI.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-113 — Arborescence stable et aide à jour

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-044 |
| Statut actuel | FAIT — en production le 6 nov. 2026 (v5.17, IT-03, PR #21) : Registre et déclaration dans Gestion (bloc, lien « ‹ Gestion »), GUIDE.md réécrit, règle de modification dans PROCESSUS.md ; Opérations réservée, écran à créer dans une itération ultérieure |
| Priorité | P1 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-03](ITERATIONS/ITERATION_03.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `nav`, `docs/GUIDE.md` |

**Description.** Geler l'arborescence (doc 05 §2), entrées stables pour Opérations et Registre, GUIDE.md et aide intégrée à jour.

**Problème résolu.** La navigation a changé 4 fois ; l'aide décrit la v4.

**Risques.** Aucun.

**Tests nécessaires.** Relecture.

**User stories et critères d'acceptation**

- **AP-US-125** — En tant qu'apiculteur, je veux retrouver le registre toujours au même endroit afin de ne pas le chercher.
  - GIVEN l'arborescence gelée · WHEN j'ouvre Gestion · THEN Registre et Opérations y sont, et l'aide décrit cette organisation

**Tâches techniques**

- AP-TECH-354 — Mise à jour nav.
- AP-TECH-355 — GUIDE.md réécrit.
- AP-TECH-356 — Règle : toute modification de l'arborescence passe par la roadmap.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-BUG-006 — Nom d'exploitation par défaut codé en dur

| Champ | Valeur |
|---|---|
| Type | Anomalie |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-044 |
| Statut actuel | EN COURS — réalisé le 6 nov. 2026 sur `claude/it-01-correctifs` (v5.16) : nom de l'exploitation par défaut, scénario etapes_fa |
| Priorité | P2 |
| Valeur métier | 1/5 |
| Complexité | XS |
| Risque | Faible |
| Itération cible | [IT-01](ITERATIONS/ITERATION_01.md) |
| Dépendances | — |
| Modules impactés | `app.js DEF` |

**Description.** Remplacer le défaut « Bee's Brothers » par le nom de l'exploitation ou « Mon exploitation ».

**Problème résolu.** Un nouvel utilisateur peut voir le nom d'une autre exploitation.

**Risques.** Aucun.

**Tests nécessaires.** e2e nouveau compte.

**User stories et critères d'acceptation**

- **AP-US-126** — En tant qu'apiculteur, je veux voir le nom de mon exploitation partout afin de ne pas être troublé.
  - GIVEN une exploitation sans réglage de nom · WHEN j'ouvre l'accueil · THEN je vois le nom de l'exploitation, jamais « Bee's Brothers »

**Tâches techniques**

- AP-TECH-357 — Défaut = nom de exploitations.
- AP-TECH-358 — Test.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-045 — Prise en main, aide et recherche

Autonomie des nouveaux utilisateurs.


### AP-FEAT-114 — Recherche globale étendue

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-045 |
| Statut actuel | EXISTANT MAIS À AMÉLIORER |
| Priorité | P2 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `ergonomie.js recherche` |

**Description.** Recherche (Ctrl K) étendue aux ruchers, reines, opérations, lots, factures ; accès vocal.

**Problème résolu.** Les nouvelles entités ne seront pas trouvables sans extension.

**Risques.** Aucun.

**Tests nécessaires.** e2e.

**User stories et critères d'acceptation**

- **AP-US-127** — En tant qu'apiculteur, je veux taper un numéro de lot pour ouvrir sa fiche afin d'aller droit au but.
  - GIVEN le lot L26-03 · WHEN je tape « L26-03 » · THEN la fiche du lot est le premier résultat

**Tâches techniques**

- AP-TECH-359 — Index de recherche par domaine.
- AP-TECH-360 — Résultats typés.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-115 — Aide contextuelle

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-045 |
| Statut actuel | PARTIEL |
| Priorité | P3 |
| Valeur métier | 2/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | — |
| Modules impactés | `composants` |

**Description.** Petit « ? » sur les écrans complexes (registre, seuils, élevage) avec explication et lien vers la source.

**Problème résolu.** Les notions réglementaires et sanitaires demandent des explications.

**Risques.** Aucun.

**Tests nécessaires.** Relecture.

**User stories et critères d'acceptation**

- **AP-US-128** — En tant qu'apiculteur débutant, je veux comprendre ce qu'est le registre d'élevage afin de le tenir correctement.
  - GIVEN l'écran Registre · WHEN je touche « ? » · THEN une explication courte s'affiche avec le lien vers la source officielle

**Tâches techniques**

- AP-TECH-361 — Composant Aide.
- AP-TECH-362 — Textes.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-116 — Prise en main par niveau

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D18 Expérience utilisateur transversale |
| Epic parent | AP-EPIC-045 |
| Statut actuel | EXISTANT ET COHÉRENT |
| Priorité | P3 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Faible |
| Itération cible | [IT-23](ITERATIONS/ITERATION_23.md) |
| Dépendances | AP-FEAT-103 |
| Modules impactés | `demarrage.js` |

**Description.** La prise en main v5.13/5.14 propose le niveau d'usage et l'ajuste ; conserver rucher d'exemple et astuces.

**Problème résolu.** Consolidation : l'onboarding doit intégrer les niveaux d'usage.

**Risques.** Aucun.

**Tests nécessaires.** e2e in.

**User stories et critères d'acceptation**

- **AP-US-129** — En tant qu'apiculteur, je veux choisir mon profil à l'inscription afin d'avoir tout de suite la bonne interface.
  - GIVEN la 3e question de la prise en main · WHEN je choisis « une quarantaine de colonies » · THEN le niveau Suivi est activé et modifiable dans les réglages

**Tâches techniques**

- AP-TECH-363 — Question de profil.
- AP-TECH-364 — Réglage de niveau.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

---

# D19 — SaaS et distribution


## AP-EPIC-046 — Plans et abonnements

Monétisation, le moment venu, sur le web et dans les applications (12 §5).


### AP-FEAT-117 — Offres et limites

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-046 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P4 |
| Valeur métier | 3/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-27](ITERATIONS/ITERATION_27.md) |
| Dépendances | AP-FEAT-020 |
| Modules impactés | `migrations/034` |

**Description.** Offre gratuite et payante(s), limites (colonies, membres, espace photos) appliquées sans bloquer la consultation.

**Problème résolu.** Financer l'infrastructure au-delà de l'offre gratuite.

**Risques.** Frustration.

**Tests nécessaires.** Dépassement : lecture toujours possible.

**User stories et critères d'acceptation**

- **AP-US-130** — En tant que responsable d'exploitation, je veux savoir ce que comprend mon offre afin de choisir en connaissance de cause.
  - GIVEN l'offre gratuite limitée à N colonies · WHEN je crée la colonie N+1 · THEN on m'explique la limite et l'offre supérieure ; rien n'est supprimé ni bloqué en lecture

**Tâches techniques**

- AP-TECH-365 — Décision D-08.
- AP-TECH-366 — Table abonnements.
- AP-TECH-367 — Contrôles dans les fonctions de création.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-118 — Abonnement et paiement

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-046 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P4 |
| Valeur métier | 3/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-27](ITERATIONS/ITERATION_27.md) |
| Dépendances | AP-FEAT-117 |
| Modules impactés | `supabase/functions/facturation` |

**Description.** Essai, souscription, portail client, factures d'abonnement via un prestataire ; webhooks idempotents.

**Problème résolu.** Encaisser sans gérer de données bancaires.

**Risques.** Webhooks rejoués.

**Tests nécessaires.** Rejeu sans double effet.

**User stories et critères d'acceptation**

- **AP-US-131** — En tant que responsable d'exploitation, je veux m'abonner en quelques clics afin de débloquer l'offre.
  - GIVEN l'offre payante · WHEN je m'abonne · THEN le paiement se fait chez le prestataire et mon exploitation passe à l'offre payante dès confirmation

**Tâches techniques**

- AP-TECH-368 — Choix du prestataire.
- AP-TECH-369 — Edge Function webhooks.
- AP-TECH-370 — Portail client.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-119 — Suivi de l'usage

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-046 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P3 |
| Valeur métier | 3/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-27](ITERATIONS/ITERATION_27.md) |
| Dépendances | AP-FEAT-016 |
| Modules impactés | `journal` |

**Description.** Indicateurs produit agrégés et anonymes (doc 00 §8), sans outil tiers de pistage.

**Problème résolu.** Mesurer la réussite produit sans compromettre la confidentialité.

**Risques.** RGPD.

**Tests nécessaires.** Données agrégées seulement.

**User stories et critères d'acceptation**

- **AP-US-132** — En tant que responsable d'exploitation du produit, je veux connaître la durée médiane d'une visite afin de savoir si l'objectif est atteint.
  - GIVEN des visites avec durée · WHEN j'ouvre les indicateurs produit · THEN je vois la médiane par semaine, sans donnée nominative

**Tâches techniques**

- AP-TECH-371 — Vue d'agrégats anonymisés.
- AP-TECH-372 — Mention dans la politique.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-125 — Achats intégrés et droits multicanaux

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-046 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P4 |
| Valeur métier | 3/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-27](ITERATIONS/ITERATION_27.md) |
| Dépendances | AP-FEAT-118, AP-FEAT-120 |
| Modules impactés | `supabase/functions/stores`, `src/domaines/compte`, `ios/`, `android/` |

**Description.** Abonnement vendu aussi par achat intégré dans les applications iOS (obligatoire, règle 3.1.1) et Android ; une seule table de droits par exploitation, alimentée par les trois canaux ; un abonnement acheté sur un canal est reconnu sur tous (règle 3.1.3(b)).

**Problème résolu.** Sans achat intégré, l'application iOS ne peut pas débloquer l'offre payante ; sans droits uniques, un utilisateur paierait deux fois.

**Risques.** Refus Apple ; double abonnement ; commissions et règles qui changent (12 §5).

**Tests nécessaires.** Achats en bac à sable Apple et Google ; reconnaissance sur le web ; résiliation propagée ; rejeu des notifications sans double effet.

**User stories et critères d'acceptation**

- **AP-US-140** — En tant que responsable d'exploitation sur iPhone ou Android, je veux m'abonner dans l'application et retrouver mon abonnement sur le web afin de ne payer qu'une fois.
  - GIVEN je m'abonne par achat intégré sur iPhone · WHEN je me connecte sur le web · THEN mon exploitation est à l'offre payante et aucun paiement ne m'est proposé ; si je résilie dans l'App Store, l'offre prend fin à l'échéance partout

**Tâches techniques**

- AP-TECH-397 — Décision D-14 ; programme Small Business d'Apple ; produits d'abonnement créés dans les deux consoles.
- AP-TECH-398 — Achats intégrés natifs via un module Capacitor, ou service tiers unifiant Apple, Google et web (à évaluer).
- AP-TECH-399 — Edge Functions : notifications serveur App Store et notifications en temps réel Google Play, idempotentes, vers la table abonnements (colonne canal).
- AP-TECH-400 — Restauration des achats ; aucun bouton de paiement externe dans l'app iOS hors pays et autorisations prévus par Apple.
- AP-TECH-401 — CGV et conditions d'abonnement affichées avant l'achat dans les trois canaux.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

## AP-EPIC-047 — Distribution et international

Web sur domaine propre, applications iOS et Android, stores, autres pays (12).


### AP-FEAT-120 — Publication Google Play et App Store

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-047 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P2 (P3 avant la révision du 6 nov. 2026) |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-28](ITERATIONS/ITERATION_28.md) |
| Dépendances | AP-FEAT-123, AP-FEAT-124, AP-FEAT-020 |
| Modules impactés | `ios/`, `android/`, `docs/CONFIDENTIALITE.md` |

**Description.** Publication gratuite des applications construites en IT-30 sur l'App Store et Google Play : fiches, confidentialité, compte de démonstration pour la revue, test fermé Google si compte personnel. La Trusted Web Activity prévue par `docs/MOBILE.md` est abandonnée au profit de Capacitor pour les deux stores.

**Problème résolu.** Être trouvé là où les apiculteurs cherchent des applications ; préalable à la monétisation dans les applications.

**Risques.** Refus Apple (règle 4.2) ; test fermé de 14 jours.

**Tests nécessaires.** Publication effective sur les deux stores.

**User stories et critères d'acceptation**

- **AP-US-133** — En tant qu'apiculteur, je veux installer Apidoo depuis le Play Store afin de le trouver facilement.
  - GIVEN la fiche publiée · WHEN j'installe · THEN Apidoo s'ouvre en plein écran avec mes données
- **AP-US-141** — En tant qu'apiculteur sur iPhone, je veux installer Apidoo depuis l'App Store afin de l'utiliser comme mes autres applications.
  - GIVEN la fiche publiée · WHEN j'installe puis me connecte · THEN je retrouve mes ruchers et je peux saisir une visite sans réseau

**Tâches techniques**

- AP-TECH-373 — ~~Bubblewrap~~ ABANDONNÉ le 6 nov. 2026 (Capacitor pour les deux stores, AP-FEAT-123).
- AP-TECH-374 — assetlinks.json (réalisé avec AP-TECH-394).
- AP-TECH-375 — Test fermé 12 testeurs (inutile avec un compte organisation, D-13).
- AP-TECH-402 — Fiches store : textes, captures téléphone et tablette, catégorie, classification d'âge.
- AP-TECH-403 — Politique de confidentialité publiée ; étiquettes de confidentialité Apple ; section « Sécurité des données » Google.
- AP-TECH-404 — Compte de démonstration pour les équipes de revue, documenté hors dépôt.
- AP-TECH-405 — Notes de revue Apple : fonctions natives et hors ligne mises en avant (règle 4.2).
- AP-TECH-406 — Procédure de publication d'une version mobile dans `10_STRATEGIE_DEPLOIEMENT.md`.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-121 — Internationalisation des textes

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-047 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P4 |
| Valeur métier | 2/5 |
| Complexité | L |
| Risque | Moyen |
| Itération cible | [IT-31](ITERATIONS/ITERATION_31.md) |
| Dépendances | AP-FEAT-002 |
| Modules impactés | `tous les écrans` |

**Description.** Extraction des textes dans des fichiers de langue ; français seul au départ.

**Problème résolu.** Les textes sont dans le code ; aucune traduction possible.

**Risques.** Régression de textes.

**Tests nécessaires.** Captures.

**User stories et critères d'acceptation**

- **AP-US-134** — En tant que développeur, je veux des textes hors du code afin de pouvoir traduire.
  - GIVEN les écrans migrés · WHEN j'extrais les textes · THEN chaque texte vient d'un fichier fr.json et les captures sont identiques

**Tâches techniques**

- AP-TECH-376 — Fonction t().
- AP-TECH-377 — Extraction progressive.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-122 — Domaine propre et hébergement compatible avec un usage commercial

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-047 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | S |
| Risque | Moyen |
| Itération cible | [IT-29](ITERATIONS/ITERATION_29.md) |
| Dépendances | AP-FEAT-005 |
| Modules impactés | `.github/workflows`, `scripts/assembler-site.sh`, `sw.js`, `offline.js` |

**Description.** Publier le site sur un domaine propre (D-11) chez un hébergeur qui autorise un usage commercial (D-12) ; recette sur sous-domaine ; ancienne adresse redirigée sans perte des saisies locales.

**Problème résolu.** Les conditions de GitHub Pages excluent un SaaS commercial ; les données locales sont liées au domaine, donc la bascule est d'autant plus sûre qu'elle est faite tôt ; les applications mobiles ont besoin du domaine.

**Risques.** Saisies locales laissées sur l'ancienne adresse ; liens d'e-mail cassés pendant la transition.

**Tests nécessaires.** Bascule avec file d'envoi non vide ; liens d'e-mail réels ; e2e sur la nouvelle recette.

**User stories et critères d'acceptation**

- **AP-US-136** — En tant qu'apiculteur déjà inscrit, je veux retrouver Apidoo à sa nouvelle adresse sans rien perdre afin de continuer à travailler normalement.
  - GIVEN une visite saisie hors ligne sur l'ancienne adresse · WHEN le réseau revient · THEN la visite est envoyée, puis je suis redirigé vers la nouvelle adresse où je me reconnecte et la retrouve

**Tâches techniques**

- AP-TECH-380 — Décisions D-11 et D-12 ; achat du domaine.
- AP-TECH-381 — Publication par le workflow vers l'hébergeur ; jeton dans les secrets GitHub.
- AP-TECH-382 — Adresses de redirection Supabase Auth des deux projets.
- AP-TECH-383 — Page de bascule sur l'ancienne adresse (file vide d'abord).
- AP-TECH-384 — Désinscription de l'ancien service worker ; en-têtes de sécurité et de cache.
- AP-TECH-385 — Documentation et adresses des tests e2e réels.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-123 — Applications iOS et Android (Capacitor)

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-047 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 5/5 |
| Complexité | L |
| Risque | Élevé |
| Itération cible | [IT-30](ITERATIONS/ITERATION_30.md) |
| Dépendances | AP-FEAT-122, AP-FEAT-005 |
| Modules impactés | `ios/`, `android/`, `src/noyau/plateforme.js`, `photos.js`, `voix.js`, `tournee.js` |

**Description.** Le site assemblé est embarqué dans des applications iOS et Android (Capacitor) ; ouverture hors ligne dès le premier lancement ; appareil photo, QR, géolocalisation et partage natifs ; version minimale acceptée ; builds signés en CI, distribués en test interne.

**Problème résolu.** Être une vraie application (stores, fonctions natives, notifications fiables sur iPhone) sans maintenir un deuxième code.

**Risques.** Écarts de comportement des vues web ; clés de signature ; refus Apple si l'application ressemble à un site.

**Tests nécessaires.** Recette manuelle sur iPhone et Android réels, premier lancement en mode avion.

**User stories et critères d'acceptation**

- **AP-US-137** — En tant qu'apiculteur, je veux ouvrir l'application au rucher sans réseau, même juste après l'avoir installée, afin de saisir ma visite.
  - GIVEN l'application installée et une première connexion faite · WHEN je l'ouvre en mode avion · THEN je saisis une visite, elle part au retour du réseau
- **AP-US-138** — En tant qu'apiculteur, je veux prendre une photo et scanner un QR code avec les outils natifs de mon téléphone afin d'aller vite avec des gants.
  - GIVEN une visite en cours dans l'application · WHEN je touche « Photo » ou « Scanner » · THEN l'outil natif s'ouvre et le résultat revient dans la visite

**Tâches techniques**

- AP-TECH-386 — Projets Capacitor `ios/` et `android/` ; le dossier web assemblé est la seule source.
- AP-TECH-387 — Détection de la plateforme dans le noyau.
- AP-TECH-388 — Modules natifs : appareil photo, QR, géolocalisation, partage.
- AP-TECH-389 — IndexedDB et file d'envoi vérifiées dans les vues web.
- AP-TECH-390 — Version minimale acceptée ; écran « mise à jour nécessaire ».
- AP-TECH-391 — Builds signés par GitHub Actions ; secrets uniquement.
- AP-TECH-392 — Comptes développeur (D-13) ; TestFlight et test interne.
- AP-TECH-393 — Icônes, écran de lancement, zones sûres.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.

### AP-FEAT-124 — Liens de connexion et d'invitation ouverts dans l'application

| Champ | Valeur |
|---|---|
| Type | Fonctionnalité |
| Domaine | D19 SaaS et distribution |
| Epic parent | AP-EPIC-047 |
| Statut actuel | NON IMPLÉMENTÉ |
| Priorité | P1 |
| Valeur métier | 4/5 |
| Complexité | M |
| Risque | Moyen |
| Itération cible | [IT-30](ITERATIONS/ITERATION_30.md) |
| Dépendances | AP-FEAT-122 |
| Modules impactés | `/.well-known/`, `src/domaines/compte` |

**Description.** Les liens des e-mails (confirmation, mot de passe, invitation) ouvrent l'application si elle est installée, le site sinon.

**Problème résolu.** Sans cela, un utilisateur de l'application est renvoyé dans le navigateur et doit se reconnecter.

**Risques.** Configuration des domaines associés ; versions anciennes de l'application.

**Tests nécessaires.** E-mails réels sur iPhone et Android, avec et sans application installée.

**User stories et critères d'acceptation**

- **AP-US-139** — En tant qu'apiculteur invité, je veux que le lien reçu par e-mail ouvre l'application si elle est installée afin de rejoindre l'exploitation sans passer par le navigateur.
  - GIVEN l'application installée et une invitation reçue · WHEN je touche le lien · THEN l'application s'ouvre sur l'écran d'invitation avec le nom de l'exploitation

**Tâches techniques**

- AP-TECH-394 — Fichiers apple-app-site-association et assetlinks.json sur le domaine.
- AP-TECH-395 — Adresses de redirection Supabase Auth de l'application ; traitement des liens à l'ouverture.
- AP-TECH-396 — Repli vers le site sans application installée.
- Définition de terminé globale (`09_STRATEGIE_TESTS.md` §6) respectée.
