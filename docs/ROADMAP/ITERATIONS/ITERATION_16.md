<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-16 — Événements biologiques et généalogie

| | |
|---|---|
| Identifiant | IT-16 |
| Phase | Phase 4 — Multiplication et élevage |
| Taille | M |
| Hypothèse de taille | Les opérations existent (v3) ; elles deviennent des fonctions SQL atomiques et alimentent l'arbre. |
| Migration | `025` |

## 1. Objectif

Diviser, réunir, enregistrer un essaim ou un remérage en une opération sûre, et voir la généalogie.

## 2. Résultat utilisateur attendu

Diviser une colonie crée la fille, le lien, les événements et la tâche de contrôle ; arbre visuel par colonie.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-061 | Opérations biologiques atomiques | P1 | PARTIEL |
| AP-FEAT-062 | Essaim capturé et origine | P2 | PARTIEL |
| AP-FEAT-063 | Arbre généalogique des colonies | P2 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-068** (AP-FEAT-061) — En tant qu'apiculteur, je veux diviser une colonie en une opération sûre afin de ne jamais avoir une demi-division.
- **AP-US-069** (AP-FEAT-062) — En tant qu'apiculteur, je veux enregistrer un essaim capturé dans le jardin du voisin afin de suivre cette nouvelle colonie.
- **AP-US-070** (AP-FEAT-063) — En tant qu'apiculteur, je veux voir la descendance de ma meilleure colonie afin de choisir mes colonies à multiplier.

## 5. Tâches techniques

- AP-TECH-207 (AP-FEAT-061) — 4 fonctions SQL idempotentes.
- AP-TECH-208 (AP-FEAT-061) — Formulaires v3 branchés dessus.
- AP-TECH-209 (AP-FEAT-061) — Passage par la file hors ligne.
- AP-TECH-210 (AP-FEAT-062) — Formulaire dédié.
- AP-TECH-211 (AP-FEAT-062) — Champ lieu de capture.
- AP-TECH-212 (AP-FEAT-063) — Requête récursive.
- AP-TECH-213 (AP-FEAT-063) — Rendu SVG simple, vertical sur téléphone.
- AP-TECH-214 (AP-FEAT-063) — Statuts en couleur.

## 6. Fichiers et modules potentiellement concernés

- `migrations/025-evenements.sql`
- `v3.js → src/domaines/colonies`
- `src/domaines/elevage (arbre)`

## 7. Évolutions SQL nécessaires

Migration 025 : diviser_colonie(), reunir_colonies(), enregistrer_essaim(), remerer().

## 8. Dépendances

- Itérations préalables : IT-07.
- Fonctionnalités prérequises : AP-FEAT-032, AP-FEAT-033.

## 9. Risques

- Arbres très larges illisibles.

## 10. Plan de tests

- Coupure réseau au milieu d'une division : rien ou tout.
- Réunion : colonie absorbée en lecture seule.
- AP-FEAT-061 : Test de coupure ; SQL.
- AP-FEAT-062 : e2e.
- AP-FEAT-063 : Rendu sur 3 profondeurs.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Plus aucune opération biologique en écritures successives côté client.

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
- Migration `migrations/025-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Fonctions additives ; anciens formulaires derrière drapeau.

## 16. Éléments à préserver

- Journal ruche_evenements

## 17. Hors périmètre

- Élevage (IT-17)

## 18. Itération suivante

[IT-17 — Élevage des reines](ITERATION_17.md)
