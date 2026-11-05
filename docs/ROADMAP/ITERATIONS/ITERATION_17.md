<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-17 — Élevage des reines

| | |
|---|---|
| Identifiant | IT-17 |
| Phase | Phase 4 — Multiplication et élevage |
| Taille | L |
| Hypothèse de taille | Module nouveau, réservé au niveau Professionnel ; délais paramétrables, jamais imposés. |
| Migration | `026` |

## 1. Objectif

Suivre les séries d'élevage de reines et la réussite par lignée.

## 2. Résultat utilisateur attendu

Créer une série au greffage, calendrier des étapes calculé, tâches générées, taux de réussite.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-064 | Séries d'élevage de reines | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-065 | Calendrier d'élevage calculé | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-066 | Lignées et reines souches | P3 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-071** (AP-FEAT-064) — En tant qu'apiculteur éleveur, je veux créer une série de 30 greffons afin de suivre chaque étape.
- **AP-US-072** (AP-FEAT-065) — En tant qu'apiculteur éleveur, je veux voir le calendrier de ma série afin de ne rater aucune étape.
- **AP-US-073** (AP-FEAT-066) — En tant qu'apiculteur éleveur, je veux rattacher mes reines à une lignée afin de comparer mes lignées.

## 5. Tâches techniques

- AP-TECH-215 (AP-FEAT-064) — Tables lignees, series_elevage, serie_etapes.
- AP-TECH-216 (AP-FEAT-064) — Écrans Série.
- AP-TECH-217 (AP-FEAT-064) — Création des reines à l'introduction.
- AP-TECH-218 (AP-FEAT-065) — Délais paramétrables avec source.
- AP-TECH-219 (AP-FEAT-065) — Génération des tâches.
- AP-TECH-220 (AP-FEAT-065) — Recalcul si date modifiée.
- AP-TECH-221 (AP-FEAT-066) — Table lignees.
- AP-TECH-222 (AP-FEAT-066) — Choix de lignée sur la reine.

## 6. Fichiers et modules potentiellement concernés

- `migrations/026-elevage.sql`
- `src/domaines/elevage`

## 7. Évolutions SQL nécessaires

Migration 026 : lignees, series_elevage, serie_etapes ; reines.lignee_id, mere_id, serie_id.

## 8. Dépendances

- Itérations préalables : IT-07, IT-15.
- Fonctionnalités prérequises : AP-FEAT-032, AP-FEAT-090.

## 9. Risques

- Délais biologiques présentés comme exacts.

## 10. Plan de tests

- Série complète de bout en bout sur données de test.
- Délais modifiables, valeur par défaut sourcée.
- AP-FEAT-064 : Série complète sur données de test.
- AP-FEAT-065 : Délais modifiables, source affichée.
- AP-FEAT-066 : Unitaires.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Statistiques de réussite par lignée.

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
- Migration `migrations/026-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Module masqué par réglage.

## 16. Éléments à préserver

- Reines (IT-07)

## 17. Hors périmètre

- Insémination instrumentale détaillée

## 18. Itération suivante

[IT-18 — Récolte, extraction, lots et traçabilité](ITERATION_18.md)
