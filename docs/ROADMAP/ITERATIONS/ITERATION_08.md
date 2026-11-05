<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-08 — Visite rapide et modèles de visite

| | |
|---|---|
| Identifiant | IT-08 |
| Phase | Phase 2 — Expérience terrain |
| Taille | M |
| Hypothèse de taille | Le formulaire et la tournée existent ; il s'agit de pré-remplir, d'ajouter des champs et des modèles. |
| Migration | `018` |

## 1. Objectif

Atteindre une visite courante en moins de deux minutes, adaptée aux pratiques de chacun.

## 2. Résultat utilisateur attendu

La visite part des valeurs de la précédente ; l'apiculteur ajoute ses champs (cellules royales, comportement…) et ses modèles.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-035 | Notes de caractère de la colonie | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-037 | Visite rapide pré-remplie | P1 | PARTIEL |
| AP-FEAT-038 | Nouveaux champs d'observation | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-039 | Modèles de visite personnalisables | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-040 | Brouillon de visite persistant | P1 | PARTIEL |

## 4. User stories associées

- **AP-US-040** (AP-FEAT-035) — En tant qu'apiculteur, je veux noter la douceur d'une colonie lors d'une visite afin de choisir mes colonies à multiplier.
- **AP-US-041** (AP-FEAT-037) — En tant qu'apiculteur, je veux ne saisir que ce qui a changé afin de faire une visite courante en moins de deux minutes.
- **AP-US-042** (AP-FEAT-038) — En tant qu'apiculteur, je veux noter des cellules royales operculées afin d'anticiper un essaimage.
- **AP-US-043** (AP-FEAT-039) — En tant qu'apiculteur, je veux un modèle « visite d'hiver » réduit au poids et à l'activité afin d'aller plus vite en hiver.
- **AP-US-044** (AP-FEAT-040) — En tant qu'apiculteur, je veux retrouver ma visite si l'application se ferme afin de ne pas tout recommencer.

## 5. Tâches techniques

- AP-TECH-123 (AP-FEAT-035) — Champs dans observations / colonnes.
- AP-TECH-124 (AP-FEAT-035) — Affichage dans l'onglet Reine & lignée.
- AP-TECH-125 (AP-FEAT-037) — Champ observes (liste des champs touchés).
- AP-TECH-126 (AP-FEAT-037) — Pré-remplissage depuis colonies_resume.
- AP-TECH-127 (AP-FEAT-037) — Affichage « comme le … ».
- AP-TECH-128 (AP-FEAT-037) — Mesure duree_s.
- AP-TECH-129 (AP-FEAT-038) — Colonnes visites.
- AP-TECH-130 (AP-FEAT-038) — creer_visite étendue (compatible).
- AP-TECH-131 (AP-FEAT-038) — Segments dans la visite et la tournée.
- AP-TECH-132 (AP-FEAT-038) — Vocabulaire de dictée.
- AP-TECH-133 (AP-FEAT-039) — Table modeles_visite.
- AP-TECH-134 (AP-FEAT-039) — Éditeur simple (cases à cocher, ordre).
- AP-TECH-135 (AP-FEAT-039) — Rendu générique des champs libres.
- AP-TECH-136 (AP-FEAT-039) — Export des champs libres.
- AP-TECH-137 (AP-FEAT-040) — Stockage IndexedDB du brouillon par colonie.
- AP-TECH-138 (AP-FEAT-040) — Proposition de reprise.
- AP-TECH-139 (AP-FEAT-040) — Expiration à 48 h.

## 6. Fichiers et modules potentiellement concernés

- `migrations/018-visites.sql`
- `src/domaines/visites`
- `tournee.js`
- `voix.js`

## 7. Évolutions SQL nécessaires

Migration 018 : nouveaux champs de visites, modeles_visite, météo enregistrée, durée ; creer_visite étendue (compatible).

## 8. Dépendances

- Itérations préalables : IT-03, IT-07.
- Fonctionnalités prérequises : AP-FEAT-002, AP-FEAT-034.

## 9. Risques

- Pré-remplissage qui enregistre une valeur non observée.

## 10. Plan de tests

- Une valeur reprise est marquée « reprise » tant qu'elle n'est pas confirmée.
- Durée mesurée sur la tournée de test.
- AP-FEAT-035 : Unitaires.
- AP-FEAT-037 : e2e ; mesure de durée.
- AP-FEAT-038 : Champs masquables par modèle.
- AP-FEAT-039 : Champs libres dans observations jsonb.
- AP-FEAT-040 : e2e rechargement.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Mesure de durée en place ; médiane < 2 min sur le scénario de test.

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
- Migration `migrations/018-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Champs additifs ; modèle « standard » = formulaire actuel.

## 16. Éléments à préserver

- Tournée en trois modes
- Visite à la voix

## 17. Hors périmètre

- Hors ligne des modifications (IT-09)

## 18. Itération suivante

[IT-09 — Hors ligne v2](ITERATION_09.md)
