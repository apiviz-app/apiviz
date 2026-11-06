<!-- Ajoutée le 6 nov. 2026 : reprend la partie internationale de l'ancienne IT-28 (révision « application web et stores »). Maintenue à la main. -->

# IT-31 — International

| | |
|---|---|
| Identifiant | IT-31 |
| Phase | Phase 9 — Professionnalisation SaaS et monétisation |
| Taille | M |
| Hypothèse de taille | Internationalisation des textes et du cadre réglementaire ; français seul publié au départ. |
| Migration | `0xx` |

## 1. Objectif

Préparer l'ouverture d'Apidoo à d'autres pays.

## 2. Résultat utilisateur attendu

Textes extraits ; réglementation par pays paramétrée ; fiches store prêtes à être traduites.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-100 | Échéances réglementaires et cadre par pays | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-121 | Internationalisation des textes | P4 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-110** (AP-FEAT-100) — En tant qu'apiculteur belge, je veux des échéances adaptées à mon pays afin d'utiliser Apidoo hors de France.
- **AP-US-134** (AP-FEAT-121) — En tant que développeur, je veux des textes hors du code afin de pouvoir traduire.

## 5. Tâches techniques

- AP-TECH-314 (AP-FEAT-100) — Colonne exploitations.pays.
- AP-TECH-315 (AP-FEAT-100) — Table echeances par pays.
- AP-TECH-376 (AP-FEAT-121) — Fonction t().
- AP-TECH-377 (AP-FEAT-121) — Extraction progressive.

## 6. Fichiers et modules potentiellement concernés

- `src/noyau/textes.js`
- `src/domaines/registre (pays)`

## 7. Évolutions SQL nécessaires

Colonne pays sur exploitations.

## 8. Dépendances

- Itérations préalables : IT-03, IT-13.
- Fonctionnalités prérequises : AP-FEAT-002, AP-FEAT-098.

## 9. Risques

- Régression liée à l'extraction des textes.
- Le prix et les règles des stores diffèrent selon les pays (voir 12 §4 et §5).

## 10. Plan de tests

- Capture de tous les écrans après extraction des textes.
- AP-FEAT-100 : Unitaires.
- AP-FEAT-121 : Captures.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité).

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
- Migration additive.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Revert du code ; la migration est additive.

## 16. Éléments à préserver

- Textes français identiques (captures)

## 17. Hors périmètre

- Traduction complète

## 18. Itération suivante

Fin de la roadmap actuelle : réévaluer avec les retours utilisateurs.
