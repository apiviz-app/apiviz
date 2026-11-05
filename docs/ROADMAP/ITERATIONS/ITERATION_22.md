<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-22 — Météo historisée et environnement

| | |
|---|---|
| Identifiant | IT-22 |
| Phase | Phase 8 — Pilotage et intelligence |
| Taille | M |
| Hypothèse de taille | Météo existante ; enregistrement à la visite, historique, floraisons saisies. |
| Migration | `031` |

## 1. Objectif

Relier observations et conditions, et préparer les miellées.

## 2. Résultat utilisateur attendu

Chaque visite garde sa météo ; floraisons et miellées notées par rucher ; alertes de gel et de vent.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-095 | Météo enregistrée avec la visite | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-096 | Floraisons et miellées | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-097 | Alertes météo et conditions d'usage | P2 | PARTIEL |

## 4. User stories associées

- **AP-US-105** (AP-FEAT-095) — En tant qu'apiculteur, je veux retrouver la météo d'une ancienne visite afin de comprendre un comportement agressif.
- **AP-US-106** (AP-FEAT-096) — En tant qu'apiculteur, je veux noter le début de la floraison du colza au Verger afin de prévoir mes hausses l'an prochain.
- **AP-US-107** (AP-FEAT-097) — En tant qu'apiculteur, je veux être prévenu d'un coup de vent fort sur un rucher afin de sangler mes ruches.

## 5. Tâches techniques

- AP-TECH-299 (AP-FEAT-095) — Capture au démarrage de la visite.
- AP-TECH-300 (AP-FEAT-095) — Colonne meteo jsonb.
- AP-TECH-301 (AP-FEAT-096) — Table floraisons.
- AP-TECH-302 (AP-FEAT-096) — Liste de plantes éditable.
- AP-TECH-303 (AP-FEAT-096) — Rappel l'année suivante.
- AP-TECH-304 (AP-FEAT-097) — Seuils d'alerte paramétrables.
- AP-TECH-305 (AP-FEAT-097) — Note sur les conditions des services (D-09).
- AP-TECH-306 (AP-FEAT-097) — Suppression du doublon d'appel météo (ux.js).

## 6. Fichiers et modules potentiellement concernés

- `meteo.js → src/domaines/meteo`
- `migrations/031-environnement.sql`

## 7. Évolutions SQL nécessaires

Migration 031 : floraisons, miellees par rucher ; meteo jsonb des visites alimenté.

## 8. Dépendances

- Itérations préalables : IT-05, IT-08.
- Fonctionnalités prérequises : AP-FEAT-025, AP-FEAT-038.

## 9. Risques

- Conditions commerciales d'Open-Meteo.

## 10. Plan de tests

- Visite hors ligne : météo marquée « non disponible ».
- AP-FEAT-095 : Visite hors ligne : « non disponible ».
- AP-FEAT-096 : e2e.
- AP-FEAT-097 : Revue des conditions.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Source et heure de mise à jour affichées partout.

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
- Migration `migrations/031-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
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

- Seuils de créneau documentés

## 17. Hors périmètre

- Station météo connectée

## 18. Itération suivante

[IT-23 — Tableau de bord et statistiques](ITERATION_23.md)
