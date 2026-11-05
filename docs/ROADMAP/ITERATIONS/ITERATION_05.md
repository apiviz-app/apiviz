<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-05 — Ruchers

| | |
|---|---|
| Identifiant | IT-05 |
| Phase | Phase 1 — Socle métier : ruchers, colonies, reines |
| Taille | M |
| Hypothèse de taille | Nouvelle table et reprise des données texte ; l'ancienne colonne est synchronisée pour la compatibilité. |
| Migration | `015` |

## 1. Objectif

Faire du rucher une entité avec position, accès et informations, sans casser l'existant.

## 2. Résultat utilisateur attendu

L'apiculteur crée, renomme, place et décrit ses ruchers ; la météo et la carte s'appuient sur la position du rucher.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-025 | Table des ruchers et reprise | P1 | PARTIEL |
| AP-FEAT-026 | Fiche rucher complète | P2 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-027 | Carte globale des ruchers | P2 | EXISTANT MAIS À AMÉLIORER |

## 4. User stories associées

- **AP-US-028** (AP-FEAT-025) — En tant qu'apiculteur, je veux renommer un rucher en une fois afin de garder mes noms à jour.
- **AP-US-029** (AP-FEAT-025) — En tant qu'apiculteur, je veux placer le rucher sur la carte plutôt que chaque ruche afin de gagner du temps.
- **AP-US-030** (AP-FEAT-026) — En tant qu'apiculteur, je veux noter les consignes d'accès d'un rucher afin de les retrouver sur place ou les transmettre.
- **AP-US-031** (AP-FEAT-027) — En tant qu'apiculteur, je veux voir tous mes ruchers sur une carte avec leur état afin d'organiser ma tournée.

## 5. Tâches techniques

- AP-TECH-090 (AP-FEAT-025) — Migration 015 + déclencheur de synchronisation du texte.
- AP-TECH-091 (AP-FEAT-025) — Normalisation des noms (trim, casse) à la reprise.
- AP-TECH-092 (AP-FEAT-025) — Écrans Ruchers sur la table.
- AP-TECH-093 (AP-FEAT-025) — Rucher en 3 questions crée une ligne ruchers.
- AP-TECH-094 (AP-FEAT-026) — Champs de la table.
- AP-TECH-095 (AP-FEAT-026) — Section Infos repliée.
- AP-TECH-096 (AP-FEAT-026) — Archivage au lieu de suppression.
- AP-TECH-097 (AP-FEAT-027) — Repères par rucher.
- AP-TECH-098 (AP-FEAT-027) — Couleur agrégée.
- AP-TECH-099 (AP-FEAT-027) — Vérifier les conditions des tuiles OSM pour un usage commercial.

## 6. Fichiers et modules potentiellement concernés

- `migrations/015-ruchers.sql`
- `src/domaines/ruchers/*`
- `meteo.js (position)`
- `demarrage.js (rucher en 3 questions)`

## 7. Évolutions SQL nécessaires

Migration 015 : table ruchers, ruches.rucher_id, reprise des valeurs distinctes de ruches.rucher, déclencheur de synchronisation.

## 8. Dépendances

- Itérations préalables : IT-03, IT-04.
- Fonctionnalités prérequises : AP-FEAT-002, AP-FEAT-008.

## 9. Risques

- Doublons de noms à la reprise (« Verger » / « verger »).
- Colonies sans rucher.

## 10. Plan de tests

- Reprise sur un jeu de test avec casse et espaces variés.
- Renommer un rucher met à jour toutes ses colonies.
- AP-FEAT-025 : Reprise sur jeu varié ; ancienne app compatible.
- AP-FEAT-026 : e2e fiche rucher.
- AP-FEAT-027 : e2e carte.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Toutes les colonies ont un rucher_id (ou « Sans rucher » explicite).
- Ancienne app toujours fonctionnelle sur la base migrée.

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
- Migration `migrations/015-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Retour au texte ruches.rucher toujours alimenté ; table ruchers laissée.

## 16. Éléments à préserver

- Création du rucher en 3 questions
- Carte et météo

## 17. Hors périmètre

- Historique des emplacements (IT-06)

## 18. Itération suivante

[IT-06 — Emplacements, transhumance et contenants](ITERATION_06.md)
