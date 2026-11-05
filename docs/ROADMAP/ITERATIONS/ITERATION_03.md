<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-03 — Noyau applicatif

| | |
|---|---|
| Identifiant | IT-03 |
| Phase | Phase 0 — Sécuriser et maîtriser l'existant |
| Taille | L |
| Hypothèse de taille | Refonte interne sans changement visible ; 10 à 15 écrans à migrer ; le gros du travail est de retrouver l'implémentation effective de chaque écran. |
| Migration | `013` |

## 1. Objectif

Remplacer les surcharges en chaîne par un noyau d'écrans enregistrés et une couche de données ciblée, puis supprimer le code mort.

## 2. Résultat utilisateur attendu

Application identique pour l'utilisateur, plus rapide à l'ouverture ; navigation et ton unifiés.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-002 | Noyau d'écrans enregistrés | P0 | NON IMPLÉMENTÉ |
| AP-FEAT-007 | Retrait des modules et écrans obsolètes | P1 | OBSOLÈTE |
| AP-FEAT-014 | Chargement ciblé et paginé des données | P0 | NON IMPLÉMENTÉ |
| AP-FEAT-015 | Styles par composant | P2 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-017 | Service worker à liste générée | P2 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-013 | Tests unitaires des règles métier | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-016 | Journal des erreurs de production | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-112 | Charte de ton unique | P2 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-113 | Arborescence stable et aide à jour | P1 | EXISTANT MAIS À AMÉLIORER |

## 4. User stories associées

- **AP-US-006** (AP-FEAT-002) — En tant que développeur, je veux enregistrer un écran à un seul endroit afin de le modifier sans effet de bord.
- **AP-US-007** (AP-FEAT-002) — En tant qu'apiculteur, je veux une application qui se comporte toujours pareil afin de ne pas être surpris.
- **AP-US-008** (AP-FEAT-007) — En tant que développeur, je veux ne garder que le code exécuté afin de maintenir moins de code.
- **AP-US-009** (AP-FEAT-014) — En tant qu'apiculteur, je veux une application rapide même avec beaucoup d'historique afin de travailler au rucher sans attendre.
- **AP-US-010** (AP-FEAT-015) — En tant que développeur, je veux modifier un composant à un seul endroit afin de garder une interface cohérente.
- **AP-US-011** (AP-FEAT-017) — En tant que développeur, je veux ne plus maintenir sw.js à la main afin d'éviter un oubli.
- **AP-US-014** (AP-FEAT-013) — En tant que développeur, je veux des tests rapides sur les calculs afin de détecter une erreur de calcul en quelques secondes.
- **AP-US-016** (AP-FEAT-016) — En tant que développeur, je veux voir les erreurs rencontrées par les utilisateurs afin de corriger avant qu'on me les signale.
- **AP-US-124** (AP-FEAT-112) — En tant qu'apiculteur, je veux une application qui me parle toujours de la même façon afin de m'y sentir à l'aise.
- **AP-US-125** (AP-FEAT-113) — En tant qu'apiculteur, je veux retrouver le registre toujours au même endroit afin de ne pas le chercher.

## 5. Tâches techniques

- AP-TECH-017 (AP-FEAT-002) — Créer src/noyau (routeur, état, actions, composants, format).
- AP-TECH-018 (AP-FEAT-002) — Passer index.html en modules ES.
- AP-TECH-019 (AP-FEAT-002) — Migrer écran par écran, un commit chacun.
- AP-TECH-020 (AP-FEAT-002) — Supprimer les réaffectations window.*.
- AP-TECH-021 (AP-FEAT-007) — Mesurer la couverture JS avec Playwright.
- AP-TECH-022 (AP-FEAT-007) — Supprimer par module, un commit chacun.
- AP-TECH-023 (AP-FEAT-007) — Retirer les fichiers de index.html et sw.js.
- AP-TECH-024 (AP-FEAT-007) — Purger les règles CSS orphelines.
- AP-TECH-025 (AP-FEAT-014) — Vue colonies_resume.
- AP-TECH-026 (AP-FEAT-014) — Module donnees/acces.js (lire, paginer, mettre à jour l'état).
- AP-TECH-027 (AP-FEAT-014) — Migration domaine par domaine.
- AP-TECH-028 (AP-FEAT-014) — Mesure en CI du nombre de requêtes.
- AP-TECH-029 (AP-FEAT-015) — Créer styles/jetons.css (couleurs, espaces, rayons).
- AP-TECH-030 (AP-FEAT-015) — Extraire par composant avec l'écran migré.
- AP-TECH-031 (AP-FEAT-015) — Supprimer les règles redéfinies.
- AP-TECH-032 (AP-FEAT-017) — Script d'assemblage : extraire les scripts et styles de index.html.
- AP-TECH-033 (AP-FEAT-017) — Version = date + commit.
- AP-TECH-034 (AP-FEAT-017) — Test e2e : ouverture hors ligne.
- AP-TECH-043 (AP-FEAT-013) — Extraire fin(), rythme(), tauxVarroa(), créneaux.
- AP-TECH-044 (AP-FEAT-013) — Écrire les tests (cas limites : année vide, division par zéro).
- AP-TECH-045 (AP-FEAT-013) — Ajouter au workflow Vérifier.
- AP-TECH-050 (AP-FEAT-016) — Table journal_erreurs (insert seul pour authenticated).
- AP-TECH-051 (AP-FEAT-016) — window.onerror, unhandledrejection, fail().
- AP-TECH-052 (AP-FEAT-016) — Écran de lecture réservé.
- AP-TECH-053 (AP-FEAT-016) — Purge à 90 jours.
- AP-TECH-351 (AP-FEAT-112) — Charte dans docs.
- AP-TECH-352 (AP-FEAT-112) — Relecture.
- AP-TECH-353 (AP-FEAT-112) — Contrôle grep en CI.
- AP-TECH-354 (AP-FEAT-113) — Mise à jour nav.
- AP-TECH-355 (AP-FEAT-113) — GUIDE.md réécrit.
- AP-TECH-356 (AP-FEAT-113) — Règle : toute modification de l'arborescence passe par la roadmap.

## 6. Fichiers et modules potentiellement concernés

- `index.html`
- `src/noyau/*`
- `src/donnees/*`
- `src/domaines/*`
- `tous les modules *.js existants`
- `sw.js`
- `styles/*`
- `tests/unitaires/*`

## 7. Évolutions SQL nécessaires

Vue `colonies_resume` (dernière visite par colonie) et table `journal_erreurs` (migration 013, additive).

## 8. Dépendances

- Itérations préalables : IT-00, IT-01.
- Fonctionnalités prérequises : AP-BUG-002, AP-FEAT-001.

## 9. Risques

- Régression visuelle ou fonctionnelle sur un écran peu couvert.
- Oubli d'un fichier dans sw.js → app cassée hors ligne.
- AP-FEAT-002 : Régression d'écran peu couvert.

## 10. Plan de tests

- 18 tests de bout en bout verts à chaque étape.
- Tests unitaires des fonctions pures (format, finances, varroa, météo).
- Captures avant/après de chaque écran migré.
- AP-FEAT-002 : 18 e2e + captures.
- AP-FEAT-007 : Couverture de code e2e (Chrome) avant suppression.
- AP-FEAT-014 : Mesure du nombre de requêtes par écriture ; jeu de 5 000 visites.
- AP-FEAT-015 : Captures de référence.
- AP-FEAT-017 : Test e2e hors ligne après assemblage.
- AP-FEAT-013 : node --test en CI.
- AP-FEAT-016 : Erreur provoquée en test → ligne créée sans e-mail.
- AP-FEAT-112 : Recherche automatique des formes « vous » en CI.
- AP-FEAT-113 : Relecture.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Aucune réaffectation de window.render/shell/view* restante.
- Modules obsolètes retirés.
- Temps d'ouverture mesuré et non dégradé.

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
- Migration `migrations/013-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Chaque écran migré l'est dans un commit séparé : revert ciblé. Drapeau `?ancien=1` conservé jusqu'à la fin de l'itération.

## 16. Éléments à préserver

- Tous les parcours v5
- Textes (hors harmonisation du ton)
- Identité Alvéoles

## 17. Hors périmètre

- Nouvelles fonctionnalités
- Changement du modèle de données métier

## 18. Itération suivante

[IT-04 — Sécurité de la base et tests SQL](ITERATION_04.md)
