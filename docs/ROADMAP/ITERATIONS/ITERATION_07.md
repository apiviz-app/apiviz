<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-07 — Reines et liens de colonies

| | |
|---|---|
| Identifiant | IT-07 |
| Phase | Phase 1 — Socle métier : ruchers, colonies, reines |
| Taille | M |
| Hypothèse de taille | Reprise des colonnes reine des ruches et des événements de division/essaimage/réunion. |
| Migration | `019` (la fiche annonçait 017, pris par 017-associes puis 018-stock-mouvements) |
| État | Réalisée le 11 nov. 2026 sur `claude/it-07-reines-liens` (v5.31), en attente de validation |

## 1. Objectif

Historiser les reines et structurer la filiation entre colonies.

## 2. Résultat utilisateur attendu

La fiche colonie montre la reine en place et les précédentes ; une colonie issue d'une division affiche sa colonie mère.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-032 | Historique des reines | P1 | PARTIEL |
| AP-FEAT-033 | Liens de filiation entre colonies | P1 | PARTIEL |
| AP-FEAT-034 | Fiche colonie complète | P1 | EXISTANT MAIS À AMÉLIORER |

## 4. User stories associées

- **AP-US-037** (AP-FEAT-032) — En tant qu'apiculteur, je veux enregistrer une nouvelle reine sans perdre l'ancienne afin de comparer mes reines.
- **AP-US-038** (AP-FEAT-033) — En tant qu'apiculteur, je veux voir de quelle colonie vient une colonie afin de suivre mes souches.
- **AP-US-039** (AP-FEAT-034) — En tant qu'apiculteur, je veux voir en un coup d'œil où en est une colonie afin de décider quoi faire.

## 5. Tâches techniques

- AP-TECH-114 (AP-FEAT-032) — Table, contrainte « une seule en place ».
- AP-TECH-115 (AP-FEAT-032) — Reprise depuis annee_reine/reine_origine/reine_introduite.
- AP-TECH-116 (AP-FEAT-032) — Formulaire reine → changer_reine().
- AP-TECH-117 (AP-FEAT-032) — Couleur de marquage dérivée de l'année.
- AP-TECH-118 (AP-FEAT-033) — Table + contrôle anti-cycle.
- AP-TECH-119 (AP-FEAT-033) — Reprise depuis ruche_evenements.autre_ruche_id.
- AP-TECH-120 (AP-FEAT-034) — Composant en-tête colonie.
- AP-TECH-121 (AP-FEAT-034) — Onglets Santé et Reine & lignée.
- AP-TECH-122 (AP-FEAT-034) — Journal unifié visites + événements + opérations.

## 6. Fichiers et modules potentiellement concernés

- `migrations/019-reines-liens.sql`
- `v3.js (formulaires reine) → src/domaines/colonies` (`reines.js`, `lignee.js`), `ux.js` (onglets, journal), `offline.js`

## 7. Évolutions SQL nécessaires

Migration 019 : reines, colonie_liens, fonction changer_reine(), reprise des données.

## 8. Dépendances

- Itérations préalables : IT-06.
- Fonctionnalités prérequises : AP-FEAT-030.

## 9. Risques

- Données de reine incomplètes ou incohérentes.

## 10. Plan de tests

- Changer de reine clôture la précédente.
- Reprise : une reine par colonie renseignée, liens depuis autre_ruche_id.
- AP-FEAT-032 : Reprise ; clôture.
- AP-FEAT-033 : Reprise sur jeu de test.
- AP-FEAT-034 : Captures + e2e.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Plus aucune écriture directe de annee_reine par l'app.

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
- Migration `migrations/019-reines-liens.sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Colonnes reine de ruches toujours lisibles ; revert du code.

## 16. Éléments à préserver

- Couleur de marquage existante

## 17. Hors périmètre

- Élevage (IT-17)
- Arbre généalogique visuel (IT-16)

## 18. Itération suivante

[IT-08 — Visite rapide et modèles de visite](ITERATION_08.md)
