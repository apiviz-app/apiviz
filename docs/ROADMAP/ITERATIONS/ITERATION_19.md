<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-19 — Stocks par mouvements et matériel

| | |
|---|---|
| Identifiant | IT-19 |
| Phase | Phase 6 — Gestion de l'exploitation |
| Taille | M |
| Hypothèse de taille | Remplacement du stock écrit directement par un journal de mouvements ; ajout localisation/entretien. |
| Migration | `028` |

## 1. Objectif

Avoir un stock juste et savoir où est le matériel.

## 2. Résultat utilisateur attendu

Inventaire, mouvements, alertes de seuil ; matériel par lieu et par état.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-075 | Journal des mouvements de stock | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-076 | Inventaire | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-077 | Matériel localisé et entretenu | P2 | PARTIEL |

## 4. User stories associées

- **AP-US-082** (AP-FEAT-075) — En tant qu'apiculteur, je veux voir pourquoi mon stock de candi a baissé afin de repérer une erreur.
- **AP-US-083** (AP-FEAT-076) — En tant qu'apiculteur, je veux faire l'inventaire de début de saison afin de repartir de stocks justes.
- **AP-US-086** (AP-FEAT-077) — En tant qu'apiculteur, je veux savoir combien de hausses sont au rucher d'été afin de préparer la miellée.

## 5. Tâches techniques

- AP-TECH-243 (AP-FEAT-075) — Table + déclencheur de somme.
- AP-TECH-244 (AP-FEAT-075) — Reprise.
- AP-TECH-245 (AP-FEAT-075) — Remplacement de maj_stock_intrant et maj_stock_achat.
- AP-TECH-246 (AP-FEAT-076) — Écran Inventaire.
- AP-TECH-247 (AP-FEAT-076) — Ajustements groupés.
- AP-TECH-253 (AP-FEAT-077) — Colonnes lieu, état.
- AP-TECH-254 (AP-FEAT-077) — Table entretiens.
- AP-TECH-255 (AP-FEAT-077) — Filtre par lieu.

## 6. Fichiers et modules potentiellement concernés

- `migrations/028-mouvements.sql`
- `src/domaines/materiel`

## 7. Évolutions SQL nécessaires

Migration 028 : mouvements_stock, reprise d'un mouvement d'ouverture par article, déclencheurs remplacés.

## 8. Dépendances

- Itérations préalables : IT-01.
- Fonctionnalités prérequises : AP-BUG-005.

## 9. Risques

- Écart de stock à la reprise.

## 10. Plan de tests

- Stock = somme des mouvements pour chaque article après reprise.
- Deux entrées simultanées : aucune perdue.
- AP-FEAT-075 : Stock = somme pour chaque article.
- AP-FEAT-076 : e2e.
- AP-FEAT-077 : e2e.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Plus aucune écriture directe de articles.stock par l'app.

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
- Migration `migrations/028-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Déclencheurs anciens réactivables.

## 16. Éléments à préserver

- Seuils d'alerte

## 17. Hors périmètre

- Codes-barres

## 18. Itération suivante

[IT-20 — Finances et coûts de production](ITERATION_20.md)
