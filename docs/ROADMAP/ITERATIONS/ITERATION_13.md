<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-13 — Traitements et registre d'élevage

| | |
|---|---|
| Identifiant | IT-13 |
| Phase | Phase 3 — Santé et conduite du rucher |
| Taille | L |
| Hypothèse de taille | Opération multi-colonies, catalogue de produits sourcé, reprise des traitements saisis dans les visites, registre recalculé. |
| Migration | `022` |

## 1. Objectif

Enregistrer un traitement une fois pour toutes les colonies concernées et produire un registre fiable.

## 2. Résultat utilisateur attendu

Traiter un rucher en une saisie ; fin de traitement rappelée ; comptage de contrôle proposé ; registre complet.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-053 | Évolution et comparaison du varroa | P2 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-054 | Opération de traitement multi-colonies | P1 | PARTIEL |
| AP-FEAT-055 | Catalogue de produits sanitaires sourcé | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-056 | Suivi de fin de traitement et contrôle | P1 | PARTIEL |
| AP-FEAT-098 | Déclaration annuelle accompagnée | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-099 | Registre d'élevage vérifié | P0 | PARTIEL |

## 4. User stories associées

- **AP-US-060** (AP-FEAT-053) — En tant qu'apiculteur, je veux voir l'effet de mon traitement afin de juger son efficacité.
- **AP-US-061** (AP-FEAT-054) — En tant qu'apiculteur, je veux enregistrer un traitement pour tout un rucher en une saisie afin de gagner du temps et tenir mon registre.
- **AP-US-062** (AP-FEAT-055) — En tant qu'apiculteur, je veux choisir mon produit dans une liste afin de ne pas me tromper de substance ni d'AMM.
- **AP-US-063** (AP-FEAT-056) — En tant qu'apiculteur, je veux être rappelé de retirer le traitement afin de respecter la durée.
- **AP-US-108** (AP-FEAT-098) — En tant qu'apiculteur, je veux être rappelé de déclarer mes ruches afin de respecter l'obligation.
- **AP-US-109** (AP-FEAT-099) — En tant qu'apiculteur, je veux imprimer un registre complet en cas de contrôle afin d'être en règle.

## 5. Tâches techniques

- AP-TECH-185 (AP-FEAT-053) — Vue avant/après liée à l'opération.
- AP-TECH-186 (AP-FEAT-053) — Synthèse rucher.
- AP-TECH-187 (AP-FEAT-054) — Champs traitement des opérations.
- AP-TECH-188 (AP-FEAT-054) — Reprise depuis visites.traitement* (1 opération par visite).
- AP-TECH-189 (AP-FEAT-054) — Écran Traiter (sélecteur de colonies).
- AP-TECH-190 (AP-FEAT-054) — Décrément de stock par mouvement.
- AP-TECH-191 (AP-FEAT-055) — Table + source + date.
- AP-TECH-192 (AP-FEAT-055) — Aucune posologie pré-remplie.
- AP-TECH-193 (AP-FEAT-055) — Procédure de mise à jour annuelle (doc 15).
- AP-TECH-194 (AP-FEAT-056) — Génération de tâche à la création.
- AP-TECH-195 (AP-FEAT-056) — Clôture de l'opération avec résultat.
- AP-TECH-307 (AP-FEAT-098) — Tâche générée.
- AP-TECH-308 (AP-FEAT-098) — Table declarations.
- AP-TECH-309 (AP-FEAT-098) — Source officielle datée dans l'écran.
- AP-TECH-310 (AP-FEAT-099) — Recherche des textes applicables (doc 15).
- AP-TECH-311 (AP-FEAT-099) — Matrice rubriques ↔ données.
- AP-TECH-312 (AP-FEAT-099) — Ajout des champs manquants.
- AP-TECH-313 (AP-FEAT-099) — Relecture externe.

## 6. Fichiers et modules potentiellement concernés

- `migrations/022-traitements.sql`
- `src/domaines/sante`
- `registre.js / essentiels.js (registre)`

## 7. Évolutions SQL nécessaires

Migration 022 : champs de traitement des opérations, produits_sanitaires, reprise depuis visites.traitement*, vue registre.

## 8. Dépendances

- Itérations préalables : IT-06, IT-12.
- Fonctionnalités prérequises : AP-FEAT-028, AP-FEAT-029, AP-FEAT-051.

## 9. Risques

- Contenu du registre non conforme.
- Catalogue de produits périmé.
- AP-FEAT-054 : Registre non conforme ; reprise.
- AP-FEAT-055 : Référentiel périmé ; posologie inventée.
- AP-FEAT-099 : Non-conformité lors d'un contrôle.

## 10. Plan de tests

- Registre identique avant/après pour les traitements existants.
- Traitement de 10 colonies = 1 opération + 10 lignes, stock décrémenté.
- AP-FEAT-053 : Captures.
- AP-FEAT-054 : Registre avant/après.
- AP-FEAT-055 : Relecture humaine de chaque fiche, date de vérification.
- AP-FEAT-056 : e2e.
- AP-FEAT-098 : Source datée affichée.
- AP-FEAT-099 : Relecture par un professionnel (GDS, vétérinaire).

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Contenu du registre validé contre une source officielle datée (doc 15).

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
- Migration `migrations/022-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Registre v5.10 accessible derrière un drapeau.

## 16. Éléments à préserver

- Champs traitement de la visite acceptés par creer_visite

## 17. Hors périmètre

- Ordonnances numérisées (IT-26)

## 18. Itération suivante

[IT-14 — Nourrissement](ITERATION_14.md)
