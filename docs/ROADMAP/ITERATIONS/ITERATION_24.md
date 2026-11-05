<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-24 — Assistant API : lecture

| | |
|---|---|
| Identifiant | IT-24 |
| Phase | Phase 8 — Pilotage et intelligence |
| Taille | L |
| Hypothèse de taille | Edge Function appelant un modèle de langage avec des outils de lecture qui utilisent le jeton de l'utilisateur (RLS). Coût d'API à budgéter (D-07). |
| Migration | aucune |

## 1. Objectif

Répondre en langage naturel aux questions sur ses propres données, en séparant faits, hypothèses, recommandations et manques.

## 2. Résultat utilisateur attendu

« Quelles colonies visiter cette semaine ? » → réponse justifiée par les données, avec liens vers les fiches.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-107 | Questions sur ses données | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-108 | Réponses structurées et sourcées | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-118** (AP-FEAT-107) — En tant qu'apiculteur, je veux demander « quelles colonies dois-je visiter cette semaine ? » afin de préparer ma semaine.
- **AP-US-119** (AP-FEAT-108) — En tant qu'apiculteur, je veux distinguer ce que dit mes données de ce que suppose API afin de garder mon jugement.

## 5. Tâches techniques

- AP-TECH-333 (AP-FEAT-107) — Choix du modèle et budget (D-07).
- AP-TECH-334 (AP-FEAT-107) — Outils de lecture typés.
- AP-TECH-335 (AP-FEAT-107) — Format de réponse en 4 blocs.
- AP-TECH-336 (AP-FEAT-107) — Plafond d'usage.
- AP-TECH-337 (AP-FEAT-108) — Schéma de réponse JSON.
- AP-TECH-338 (AP-FEAT-108) — Rendu en 4 blocs.
- AP-TECH-339 (AP-FEAT-108) — Interdits sanitaires dans les instructions.

## 6. Fichiers et modules potentiellement concernés

- `supabase/functions/assistant`
- `src/domaines/assistant`
- `alveoles.js (compagnon)`

## 7. Évolutions SQL nécessaires

Table assistant_conversations (facultative, durée de conservation courte).

## 8. Dépendances

- Itérations préalables : IT-03, IT-04.
- Fonctionnalités prérequises : AP-FEAT-008, AP-FEAT-014.

## 9. Risques

- Hallucination.
- Fuite entre exploitations.
- Coût.
- AP-FEAT-107 : Hallucination ; fuite ; coût.
- AP-FEAT-108 : Non-respect du format.

## 10. Plan de tests

- Jeu de 30 questions de référence avec réponses attendues.
- Test : question sur une autre exploitation refusée.
- Plafond de requêtes par utilisateur.
- AP-FEAT-107 : 30 questions de référence ; test de fuite.
- AP-FEAT-108 : Validation du format sur les 30 questions.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Réponses structurées en quatre blocs, sources citées.
- Aucun conseil sanitaire non sourcé.

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
- Aucune migration.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Fonction désactivée par réglage : le compagnon revient à « Bientôt ».

## 16. Éléments à préserver

- Compagnon animé

## 17. Hors périmètre

- Écritures (IT-25)

## 18. Itération suivante

[IT-25 — Assistant API : actions et analyses](ITERATION_25.md)
