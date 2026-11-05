<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-14 — Nourrissement

| | |
|---|---|
| Identifiant | IT-14 |
| Phase | Phase 3 — Santé et conduite du rucher |
| Taille | M |
| Hypothèse de taille | Opération sur le même socle que les traitements. |
| Migration | `023` |

## 1. Objectif

Enregistrer un nourrissement groupé avec quantités, coût et objectif.

## 2. Résultat utilisateur attendu

Nourrir 15 colonies en une saisie, stock et coût mis à jour, historique par colonie.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-059 | Opération de nourrissement groupée | P1 | PARTIEL |
| AP-FEAT-060 | Bilan de nourrissement | P2 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-066** (AP-FEAT-059) — En tant qu'apiculteur, je veux nourrir 15 colonies avec 1 kg de candi chacune afin de le noter en une fois.
- **AP-US-067** (AP-FEAT-060) — En tant qu'apiculteur, je veux connaître le coût du nourrissement de l'hiver afin de préparer mon budget.

## 5. Tâches techniques

- AP-TECH-201 (AP-FEAT-059) — Champs nourrissement des opérations.
- AP-TECH-202 (AP-FEAT-059) — Mouvement de stock.
- AP-TECH-203 (AP-FEAT-059) — Écran Nourrir.
- AP-TECH-204 (AP-FEAT-059) — Intrants de visite → opération (compatibilité).
- AP-TECH-205 (AP-FEAT-060) — Vue d'agrégat.
- AP-TECH-206 (AP-FEAT-060) — Écran bilan.

## 6. Fichiers et modules potentiellement concernés

- `migrations/023-nourrissement.sql`
- `src/domaines/nourrissement`

## 7. Évolutions SQL nécessaires

Migration 023 : champs nourrissement des opérations, lien dépense.

## 8. Dépendances

- Itérations préalables : IT-12.
- Fonctionnalités prérequises : AP-FEAT-051.

## 9. Risques

- Double décompte avec les intrants de visite.

## 10. Plan de tests

- Un nourrissement saisi dans une visite ne décompte qu'une fois.
- AP-FEAT-059 : Un seul mouvement par nourrissement.
- AP-FEAT-060 : Calculs sur jeu de démo.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Rapport « quantités par colonie et par saison ».

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
- Migration `migrations/023-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Additive.

## 16. Éléments à préserver

- visite_intrants et déclencheur de stock

## 17. Hors périmètre

- Pesée connectée

## 18. Itération suivante

[IT-15 — Tâches récurrentes, calendrier et notifications](ITERATION_15.md)
