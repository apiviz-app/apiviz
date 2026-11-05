<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-12 — Santé : varroa et observations sanitaires

| | |
|---|---|
| Identifiant | IT-12 |
| Phase | Phase 3 — Santé et conduite du rucher |
| Taille | M |
| Hypothèse de taille | Le comptage existe dans la visite ; il devient une opération structurée avec seuils sourcés. |
| Migration | `021` |

## 1. Objectif

Suivre l'infestation et les signes sanitaires par colonie et par rucher, avec des seuils dont la source est affichée.

## 2. Résultat utilisateur attendu

Comptage en série sur un rucher, taux calculé, alerte au-dessus du seuil choisi, observations sanitaires notées.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-051 | Comptage varroa en opération | P1 | PARTIEL |
| AP-FEAT-052 | Seuils varroa sourcés par méthode et période | P0 | PARTIEL |
| AP-FEAT-057 | Observations sanitaires structurées | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-058 | Signalement aux autorités sanitaires (aide) | P3 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-058** (AP-FEAT-051) — En tant qu'apiculteur, je veux compter le varroa sur tout un rucher à la suite afin de décider de traiter.
- **AP-US-059** (AP-FEAT-052) — En tant qu'apiculteur, je veux connaître l'origine du seuil d'alerte afin de lui faire confiance ou l'adapter.
- **AP-US-064** (AP-FEAT-057) — En tant qu'apiculteur, je veux noter des ailes déformées sur une colonie afin de suivre son évolution et alerter mon GDS si besoin.
- **AP-US-065** (AP-FEAT-058) — En tant qu'apiculteur, je veux savoir qui contacter si je soupçonne une maladie réglementée afin de réagir vite.

## 5. Tâches techniques

- AP-TECH-178 (AP-FEAT-051) — Tables operations / operation_colonies.
- AP-TECH-179 (AP-FEAT-051) — Reprise depuis visites.varroa*.
- AP-TECH-180 (AP-FEAT-051) — Écran Comptage en série.
- AP-TECH-181 (AP-FEAT-051) — creer_visite crée l'opération si varroa fourni.
- AP-TECH-182 (AP-FEAT-052) — Table seuils_varroa (méthode, mois début/fin, valeur, source, url, consulté le).
- AP-TECH-183 (AP-FEAT-052) — Valeurs initiales uniquement si sourcées (relecture humaine).
- AP-TECH-184 (AP-FEAT-052) — Couleurs d'alerte conditionnées.
- AP-TECH-196 (AP-FEAT-057) — Liste de signes paramétrable (source des libellés).
- AP-TECH-197 (AP-FEAT-057) — Champ dans la visite.
- AP-TECH-198 (AP-FEAT-057) — Historique sanitaire par colonie.
- AP-TECH-199 (AP-FEAT-058) — Liste des dangers réglementés avec source.
- AP-TECH-200 (AP-FEAT-058) — Fiche contacts paramétrable par département.

## 6. Fichiers et modules potentiellement concernés

- `migrations/021-operations-varroa.sql`
- `src/domaines/sante`
- `v3.js (suivi varroa)`

## 7. Évolutions SQL nécessaires

Migration 021 : operations, operation_colonies, reprise des comptages des visites, seuils_varroa (par méthode et période, source, date).

## 8. Dépendances

- Itérations préalables : IT-04, IT-05, IT-08.
- Fonctionnalités prérequises : AP-FEAT-008, AP-FEAT-025, AP-FEAT-038.

## 9. Risques

- Seuils présentés comme des recommandations officielles sans source.
- AP-FEAT-052 : Information sanitaire erronée.
- AP-FEAT-057 : Interprétation comme diagnostic.
- AP-FEAT-058 : Information obsolète.

## 10. Plan de tests

- Reprise des comptages historiques à l'identique.
- Seuil affiché avec sa source et la date de consultation.
- AP-FEAT-051 : Reprise identique ; unitaires taux.
- AP-FEAT-052 : Revue des sources (doc 15 §sources).
- AP-FEAT-057 : Relecture des libellés.
- AP-FEAT-058 : Sources datées.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Aucun seuil par défaut sans source citée.

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
- Migration `migrations/021-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Lecture des colonnes varroa de visites conservée.

## 16. Éléments à préserver

- Courbe varroa existante

## 17. Hors périmètre

- Traitements (IT-13)

## 18. Itération suivante

[IT-13 — Traitements et registre d'élevage](ITERATION_13.md)
