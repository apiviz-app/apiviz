<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-00 — Mise à plat de l'existant

> Réalisé le 6 nov. 2026, version v5.15 (branche `claude/it-00-mise-a-plat`), en attente de fusion et de recette.

| | |
|---|---|
| Identifiant | IT-00 |
| Phase | Phase 0 — Sécuriser et maîtriser l'existant |
| Taille | S |
| Hypothèse de taille | Travail de lecture, de relevé et de documentation ; aucune fonctionnalité nouvelle. Dépend de l'accès aux deux projets Supabase en lecture. |
| Migration | aucune |

## 1. Objectif

Disposer d'une source lisible du cœur, d'un relevé fidèle des deux bases et d'une documentation de base exacte.

## 2. Résultat utilisateur attendu

Aucun changement visible. L'équipe sait exactement ce qui tourne en production et en recette.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-001 | Source lisible du cœur app.js | P0 | OBSOLÈTE |
| AP-FEAT-003 | Documentation de base fidèle | P0 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-004 | Relevé de l'état réel des bases | P0 | PARTIEL |

## 4. User stories associées

- **AP-US-001** (AP-FEAT-001) — En tant que développeur, je veux disposer de la source lisible de app.js afin de corriger le cœur sans risque.
- **AP-US-002** (AP-FEAT-003) — En tant que développeur, je veux un point d'entrée unique et exact pour recréer la base afin de monter un environnement de test fiable.
- **AP-US-003** (AP-FEAT-004) — En tant que responsable d'exploitation, je veux savoir quelles migrations sont appliquées sur chaque base afin de décider de la bascule en connaissance de cause.
- **AP-US-004** (AP-FEAT-004) — En tant que développeur, je veux connaître le plafond de lignes de l'API afin d'évaluer le risque de données tronquées.

## 5. Tâches techniques

- AP-TECH-001 (AP-FEAT-001) — Demander la source d'origine (décision D-01).
- AP-TECH-002 (AP-FEAT-001) — À défaut : formater avec Prettier, renommer les identifiants d'une lettre par écran.
- AP-TECH-003 (AP-FEAT-001) — Ajouter un en-tête expliquant la provenance.
- AP-TECH-004 (AP-FEAT-001) — Lancer les 18 tests.
- AP-TECH-005 (AP-FEAT-003) — Remplacer schema.sql par un renvoi vers 000 + migrations.
- AP-TECH-006 (AP-FEAT-003) — Corriger les statuts de 010 et 011.
- AP-TECH-007 (AP-FEAT-003) — Documenter l'ordre 009 puis 008.
- AP-TECH-008 (AP-FEAT-003) — Mettre à jour docs/TECHNIQUE.md (liste des modules).
- AP-TECH-009 (AP-FEAT-004) — Compléter le relevé du 5 nov. 2026 (tables, fonctions, volumétrie faits) par les politiques RLS détaillées.
- AP-TECH-010 (AP-FEAT-004) — Relever Max rows (tableau de bord Supabase › API) et réglages Auth (inscriptions ouvertes ?).
- AP-TECH-011 (AP-FEAT-004) — Compter les lignes par table et l'espace photos.
- AP-TECH-012 (AP-FEAT-004) — Écrire le rapport dans migrations/README.md.

## 6. Fichiers et modules potentiellement concernés

- `app.js (source lisible)`
- `schema.sql`
- `migrations/README.md`
- `migrations/a-appliquer-en-production.txt`
- `docs/TECHNIQUE.md`
- `docs/ROADMAP/01_AUDIT_EXISTANT.md`

## 7. Évolutions SQL nécessaires

Aucune migration. Relevés en lecture seule (structure, migrations appliquées, volumétrie, plafond de lignes).

## 8. Dépendances

- Itérations préalables : aucune.
- Fonctionnalités prérequises : aucune hors itération.

## 9. Risques

- Dé-minification qui change le comportement (ordre d'évaluation, noms).
- Relevé fait sur la mauvaise base.

## 10. Plan de tests

- Les 18 tests de bout en bout passent avant et après la dé-minification.
- Comparaison du relevé de structure avec 000 + migrations.
- AP-FEAT-001 : 18 tests e2e avant/après ; diff fonctionnel nul.
- AP-FEAT-003 : Relecture ; recréation d'une base de test depuis 000 + migrations.
- AP-FEAT-004 : Comparaison automatique relevé ↔ fichiers.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Source lisible de app.js committée, tests verts.
- Relevé des deux bases ajouté à migrations/README.md.
- schema.sql remplacé par un renvoi.

## 12. Définition de terminé

- [ ] Le parcours utilisateur fonctionne sur téléphone et ordinateur.
- [x] Les règles métier des user stories sont respectées.
- [ ] Les données sont correctement enregistrées (vérifiées en base de recette) — sans objet ici ; voir AP-BUG-008 pour la recette.
- [x] Les permissions sont contrôlées (tests SQL si la base change) — base inchangée ; politiques RLS relevées.
- [ ] Les erreurs sont gérées et affichées en français.
- [x] Les 18 tests de bout en bout et les nouveaux tests passent.
- [ ] Les régressions sont vérifiées (liste « À vérifier » du CHANGELOG).
- [x] CHANGELOG, migrations/README.md et le backlog (statuts) sont à jour.
- [x] Les limites connues sont documentées.

## 13. Livrables

- Code sur une branche `claude/…` et pull request vers `main`.
- Aucune migration.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Revert des commits (aucune donnée touchée).

## 16. Éléments à préserver

- Comportement exact de app.js
- Garde-fous d'assemblage

## 17. Hors périmètre

- Toute modification fonctionnelle
- Toute migration

## 18. Itération suivante

[IT-01 — Correctifs de fiabilité](ITERATION_01.md)
