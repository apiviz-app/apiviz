<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-09 — Hors ligne v2

| | |
|---|---|
| Identifiant | IT-09 |
| Phase | Phase 2 — Expérience terrain |
| Taille | L |
| Hypothèse de taille | Généralisation de la file existante aux modifications et suppressions, avec quarantaine et conflits. |
| Migration | `019` |

## 1. Objectif

Permettre toutes les saisies terrain sans réseau et ne jamais perdre une saisie.

## 2. Résultat utilisateur attendu

Au rucher sans réseau : créer, corriger, supprimer ; au retour, tout part ou est présenté à corriger.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-043 | File d'opérations : modifications et suppressions hors ligne | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-044 | Conflits de modification | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-045 | État de synchronisation lisible | P2 | EXISTANT MAIS À AMÉLIORER |

## 4. User stories associées

- **AP-US-047** (AP-FEAT-043) — En tant qu'apiculteur, je veux corriger une visite au rucher sans réseau afin de ne pas devoir y penser plus tard.
- **AP-US-048** (AP-FEAT-043) — En tant qu'apiculteur, je veux créer une colonie et la visiter sans réseau afin de noter un essaim capturé sur place.
- **AP-US-049** (AP-FEAT-044) — En tant que membre invité, je veux être prévenu si quelqu'un a modifié la même saisie afin de ne pas effacer son travail.
- **AP-US-050** (AP-FEAT-045) — En tant qu'apiculteur, je veux savoir si tout est bien parti afin de fermer l'application l'esprit tranquille.

## 5. Tâches techniques

- AP-TECH-146 (AP-FEAT-043) — Format d'opération (type, table, id, données, version attendue, dépend_de).
- AP-TECH-147 (AP-FEAT-043) — Fonctions SQL modifier_*.
- AP-TECH-148 (AP-FEAT-043) — Reprise de la file v1.
- AP-TECH-149 (AP-FEAT-043) — Tests e2e.
- AP-TECH-150 (AP-FEAT-044) — Colonne modifie_le + déclencheur.
- AP-TECH-151 (AP-FEAT-044) — Retour « conflit » des fonctions.
- AP-TECH-152 (AP-FEAT-044) — Écran de choix.
- AP-TECH-153 (AP-FEAT-045) — Compteurs par exploitation.
- AP-TECH-154 (AP-FEAT-045) — Écran Synchronisation.

## 6. Fichiers et modules potentiellement concernés

- `src/donnees/file.js`
- `src/donnees/cache.js`
- `offline.js (remplacé)`
- `photos.js (file commune)`
- `fonctions SQL modifier_*`

## 7. Évolutions SQL nécessaires

Colonne modifie_le sur les tables terrain, fonctions de mise à jour avec version attendue.

## 8. Dépendances

- Itérations préalables : IT-01, IT-03.
- Fonctionnalités prérequises : AP-BUG-001, AP-FEAT-014.

## 9. Risques

- Conflit entre deux membres.
- Migration de la file v1 en attente sur les téléphones.
- AP-FEAT-043 : Ordre et dépendances.

## 10. Plan de tests

- Scénarios : 20 opérations mixtes hors ligne, renvoi ; conflit ; quarantaine ; reprise de file v1.
- AP-FEAT-043 : 20 opérations mixtes hors ligne.
- AP-FEAT-044 : Scénario deux téléphones.
- AP-FEAT-045 : e2e multi-exploitation.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- File v1 reprise automatiquement.
- Aucune opération supprimée sans action utilisateur.

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
- Migration `migrations/019-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Drapeau pour revenir à la file v1 (créations seules).

## 16. Éléments à préserver

- Idempotence par UUID client

## 17. Hors périmètre

- Base locale complète (écartée)

## 18. Itération suivante

[IT-10 — QR codes et tournée enchaînée](ITERATION_10.md)
