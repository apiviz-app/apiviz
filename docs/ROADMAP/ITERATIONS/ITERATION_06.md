<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-06 — Emplacements, transhumance et contenants

| | |
|---|---|
| Identifiant | IT-06 |
| Phase | Phase 1 — Socle métier : ruchers, colonies, reines |
| Taille | L |
| Hypothèse de taille | Trois concepts liés (emplacement historisé, déplacement groupé, ruche physique) ; les contenants restent facultatifs. |
| Migration | `016` |

## 1. Objectif

Savoir où était chaque colonie à toute date, déplacer des lots de colonies, et suivre les ruches physiques.

## 2. Résultat utilisateur attendu

Déplacer 12 colonies vers un autre rucher en une opération, retrouvée au registre ; associer une colonie à une ruche physique.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-028 | Historique des emplacements | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-029 | Déplacement groupé (transhumance) | P1 | PARTIEL |
| AP-FEAT-030 | Colonie : statut et origine | P1 | PARTIEL |
| AP-FEAT-031 | Ruches physiques (contenants) | P2 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-032** (AP-FEAT-028) — En tant qu'apiculteur, je veux savoir où était une colonie à une date donnée afin d'interpréter correctement son historique et le registre.
- **AP-US-033** (AP-FEAT-029) — En tant qu'apiculteur, je veux déplacer 12 colonies vers le rucher d'été en une opération afin de noter une transhumance en 30 secondes.
- **AP-US-034** (AP-FEAT-030) — En tant qu'apiculteur, je veux marquer une colonie orpheline afin de la retrouver dans les priorités.
- **AP-US-035** (AP-FEAT-030) — En tant qu'apiculteur, je veux que les colonies mortes ne comptent plus afin d'avoir des chiffres justes.
- **AP-US-036** (AP-FEAT-031) — En tant qu'apiculteur professionnel, je veux transférer une colonie dans une ruche neuve afin de suivre mes caisses.

## 5. Tâches techniques

- AP-TECH-100 (AP-FEAT-028) — Table + contrainte d'exclusion.
- AP-TECH-101 (AP-FEAT-028) — Reprise : un emplacement ouvert par colonie depuis date_installation.
- AP-TECH-102 (AP-FEAT-028) — Fonction rucher_a_date().
- AP-TECH-103 (AP-FEAT-029) — Fonction SQL idempotente.
- AP-TECH-104 (AP-FEAT-029) — Écran Déplacer (sélecteur de colonies).
- AP-TECH-105 (AP-FEAT-029) — Reprise des événements « deplacement » de 010.
- AP-TECH-106 (AP-FEAT-029) — Registre lit deplacements.
- AP-TECH-107 (AP-FEAT-030) — Colonnes et reprise depuis sortie.
- AP-TECH-108 (AP-FEAT-030) — Déclencheur sortie ↔ statut pour l'ancienne app.
- AP-TECH-109 (AP-FEAT-030) — Filtres par statut.
- AP-TECH-110 (AP-FEAT-031) — Tables contenants, colonie_contenants.
- AP-TECH-111 (AP-FEAT-031) — Fonction affecter_contenant().
- AP-TECH-112 (AP-FEAT-031) — Lien avec articles (équipement).
- AP-TECH-113 (AP-FEAT-031) — Masqué hors niveau Professionnel.

## 6. Fichiers et modules potentiellement concernés

- `migrations/016-emplacements-contenants.sql`
- `src/domaines/ruchers`
- `src/domaines/colonies`
- `essentiels.js (registre mouvements)`

## 7. Évolutions SQL nécessaires

Migration 016 : colonie_emplacements, deplacements, contenants, colonie_contenants, fonctions deplacer_colonies(), affecter_contenant().

## 8. Dépendances

- Itérations préalables : IT-05.
- Fonctionnalités prérequises : AP-FEAT-025.

## 9. Risques

- Reprise de l'historique : on ne connaît que l'emplacement actuel.
- Événements « deplacement » de 010 à réconcilier.

## 10. Plan de tests

- Déplacement groupé atomique.
- Pas de chevauchement de périodes.
- Registre des mouvements identique avant/après pour les données existantes.
- AP-FEAT-028 : Test SQL chevauchement refusé.
- AP-FEAT-029 : Atomicité, registre avant/après.
- AP-FEAT-030 : Reprise sortie → statut.
- AP-FEAT-031 : Niveau Essentiel : aucun écran contenant.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Registre des mouvements alimenté par deplacements.
- Fiche colonie affiche ses emplacements successifs.

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
- Migration `migrations/016-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Tables additives ; l'écran de déplacement v5.10 reste disponible derrière un drapeau.

## 16. Éléments à préserver

- Événements ruche_evenements existants

## 17. Hors périmètre

- QR codes (IT-10)

## 18. Itération suivante

[IT-07 — Reines et liens de colonies](ITERATION_07.md)
