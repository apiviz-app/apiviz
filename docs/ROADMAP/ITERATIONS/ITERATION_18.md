<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-18 — Récolte, extraction, lots et traçabilité

| | |
|---|---|
| Identifiant | IT-18 |
| Phase | Phase 5 — Production et traçabilité |
| Taille | L |
| Hypothèse de taille | Chaîne existante par code texte ; ajout de l'entité extraction et des colonies contributrices, reprise des codes. |
| Migration | `027` |

## 1. Objectif

Tracer chaque pot jusqu'aux colonies et à la récolte, et calculer les rendements.

## 2. Résultat utilisateur attendu

Récolte → extraction → lots → étiquettes ; d'un pot vendu, remonter au rucher ; rendements par rucher, miellée, année.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-068 | Récolte rattachée au rucher et aux colonies | P1 | PARTIEL |
| AP-FEAT-069 | Extraction (lot de miellerie) | P1 | PARTIEL |
| AP-FEAT-070 | Mise en lots contrôlée | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-071 | Traçabilité ascendante et descendante | P1 | PARTIEL |
| AP-FEAT-072 | Rendements | P2 | PARTIEL |
| AP-FEAT-073 | Étiquettes de pots conformes | P1 | EXISTANT MAIS À AMÉLIORER |

## 4. User stories associées

- **AP-US-075** (AP-FEAT-068) — En tant qu'apiculteur, je veux noter la récolte de printemps du Verger afin de calculer le rendement du rucher.
- **AP-US-076** (AP-FEAT-069) — En tant qu'apiculteur, je veux regrouper deux récoltes dans une extraction afin de tracer mon miel.
- **AP-US-077** (AP-FEAT-070) — En tant qu'apiculteur, je veux créer mes lots de 500 g et 250 g depuis une extraction afin que tout soit cohérent.
- **AP-US-078** (AP-FEAT-071) — En tant qu'apiculteur, je veux savoir à quels clients j'ai vendu un lot afin de pouvoir les prévenir.
- **AP-US-079** (AP-FEAT-072) — En tant qu'apiculteur, je veux comparer le rendement de mes ruchers afin de décider où poser mes colonies.
- **AP-US-081** (AP-FEAT-073) — En tant qu'apiculteur, je veux imprimer des étiquettes conformes afin de vendre en règle.

## 5. Tâches techniques

- AP-TECH-225 (AP-FEAT-068) — Colonnes recoltes.
- AP-TECH-226 (AP-FEAT-068) — Table recolte_colonies.
- AP-TECH-227 (AP-FEAT-068) — Formulaire en deux niveaux.
- AP-TECH-228 (AP-FEAT-069) — Table extractions + liaison.
- AP-TECH-229 (AP-FEAT-069) — Reprise des codes.
- AP-TECH-230 (AP-FEAT-069) — Écran Extraction.
- AP-TECH-231 (AP-FEAT-070) — Fonction SQL.
- AP-TECH-232 (AP-FEAT-070) — Écran depuis la fiche extraction.
- AP-TECH-233 (AP-FEAT-071) — Requêtes de remontée.
- AP-TECH-234 (AP-FEAT-071) — Fiche de lot enrichie.
- AP-TECH-235 (AP-FEAT-071) — Export de traçabilité.
- AP-TECH-236 (AP-FEAT-072) — Vue rendements_annuels.
- AP-TECH-237 (AP-FEAT-072) — Écran.
- AP-TECH-240 (AP-FEAT-073) — Recherche de la source officielle (DGCCRF, règlement UE).
- AP-TECH-241 (AP-FEAT-073) — Contrôle des champs requis.
- AP-TECH-242 (AP-FEAT-073) — Formats d'étiquettes supplémentaires.

## 6. Fichiers et modules potentiellement concernés

- `migrations/027-production.sql`
- `src/domaines/production`
- `etiquettes.js`

## 7. Évolutions SQL nécessaires

Migration 027 : extractions, recolte_colonies, recoltes.rucher_id/miellee, lots.extraction_id, mettre_en_lots().

## 8. Dépendances

- Itérations préalables : IT-05, IT-13.
- Fonctionnalités prérequises : AP-FEAT-025, AP-FEAT-054.

## 9. Risques

- Mentions d'étiquetage incorrectes.
- AP-FEAT-073 : Mention manquante.

## 10. Plan de tests

- Reprise des codes d'extraction existants.
- Traçabilité descendante d'une récolte vers ses ventes.
- AP-FEAT-068 : Colonies facultatives.
- AP-FEAT-069 : Reprise sur jeu de test.
- AP-FEAT-070 : Test SQL de dépassement.
- AP-FEAT-071 : e2e sur jeu complet.
- AP-FEAT-072 : Unitaires.
- AP-FEAT-073 : Relecture contre la source.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Mentions d'étiquette vérifiées contre une source officielle datée.

## 12. Définition de terminé

- [ ] Le parcours utilisateur fonctionne sur téléphone et ordinateur.
- [ ] Les règles métier des user stories sont respectées.
- [ ] Les données sont correctement enregistrées (vérifiées en base de recette).
- [ ] Les permissions sont contrôlées (tests SQL si la base change).
- [ ] Les erreurs sont gérées et affichées en français.
- [ ] Les 18 tests de bout en bout et les nouveaux tests passent.
- [ ] Les régressions sont vérifiées (liste « À vérifier » du CHANGELOG).
- [ ] CHANGELOG, migrations/README.md et le backlog (statuts) sont à jour.
- [ ] Les limites connues sont documentées.

## 13. Livrables

- Code sur une branche `claude/…` et pull request vers `main`.
- Migration `migrations/027-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Colonne texte extraction conservée.

## 16. Éléments à préserver

- Fiche de lot v5.10
- Stock de pots calculé

## 17. Hors périmètre

- Analyses pollen en laboratoire

## 18. Itération suivante

[IT-19 — Stocks par mouvements et matériel](ITERATION_19.md)
