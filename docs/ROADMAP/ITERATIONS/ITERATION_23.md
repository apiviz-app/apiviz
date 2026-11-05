<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-23 — Tableau de bord et statistiques

| | |
|---|---|
| Identifiant | IT-23 |
| Phase | Phase 8 — Pilotage et intelligence |
| Taille | M |
| Hypothèse de taille | Accueil existant ; ajout d'indicateurs colonies, comparaisons et niveaux d'usage. |
| Migration | `032` |

## 1. Objectif

Donner à chaque profil les bons indicateurs et comparer les saisons.

## 2. Résultat utilisateur attendu

Accueil selon le niveau d'usage, indicateurs colonies, comparaison avec l'année précédente, statistiques par rucher.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-067 | Performances des reines et lignées | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-078 | Prévision des besoins en matériel | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-103 | Accueil selon le niveau d'usage | P2 | PARTIEL |
| AP-FEAT-104 | Alertes calculées classées | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-105 | Comparaison avec l'année précédente | P2 | PARTIEL |
| AP-FEAT-106 | Indicateurs colonies et mortalité hivernale | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-114 | Recherche globale étendue | P2 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-115 | Aide contextuelle | P3 | PARTIEL |
| AP-FEAT-116 | Prise en main par niveau | P3 | EXISTANT ET COHÉRENT |

## 4. User stories associées

- **AP-US-074** (AP-FEAT-067) — En tant qu'apiculteur éleveur, je veux comparer mes lignées sur 2 saisons afin de choisir mes reproductrices.
- **AP-US-084** (AP-FEAT-078) — En tant qu'apiculteur, je veux savoir combien de pots commander afin de ne pas manquer à la récolte.
- **AP-US-114** (AP-FEAT-103) — En tant qu'apiculteur amateur, je veux un accueil simple afin de ne pas être noyé.
- **AP-US-115** (AP-FEAT-104) — En tant qu'apiculteur, je veux comprendre pourquoi une colonie est en alerte afin de décider en connaissance de cause.
- **AP-US-116** (AP-FEAT-105) — En tant qu'apiculteur, je veux comparer ma saison à la précédente afin de voir si je progresse.
- **AP-US-117** (AP-FEAT-106) — En tant qu'apiculteur, je veux connaître mes pertes hivernales afin d'améliorer mon hivernage.
- **AP-US-127** (AP-FEAT-114) — En tant qu'apiculteur, je veux taper un numéro de lot pour ouvrir sa fiche afin d'aller droit au but.
- **AP-US-128** (AP-FEAT-115) — En tant qu'apiculteur débutant, je veux comprendre ce qu'est le registre d'élevage afin de le tenir correctement.
- **AP-US-129** (AP-FEAT-116) — En tant qu'apiculteur, je veux choisir mon profil à l'inscription afin d'avoir tout de suite la bonne interface.

## 5. Tâches techniques

- AP-TECH-223 (AP-FEAT-067) — Vue d'agrégats par reine/lignée.
- AP-TECH-224 (AP-FEAT-067) — Règle d'effectif minimal.
- AP-TECH-248 (AP-FEAT-078) — Calcul depuis le simulateur existant.
- AP-TECH-249 (AP-FEAT-078) — Écran prévision.
- AP-TECH-323 (AP-FEAT-103) — Réglage de niveau.
- AP-TECH-324 (AP-FEAT-103) — Sections conditionnelles.
- AP-TECH-325 (AP-FEAT-103) — Réglage Masquer par section.
- AP-TECH-326 (AP-FEAT-104) — Module regles/alertes.js unique.
- AP-TECH-327 (AP-FEAT-104) — Remplacer todos() et calculs des lentilles.
- AP-TECH-328 (AP-FEAT-104) — Tests unitaires.
- AP-TECH-329 (AP-FEAT-105) — Vue d'agrégats par année.
- AP-TECH-330 (AP-FEAT-105) — Composant chiffre comparé.
- AP-TECH-331 (AP-FEAT-106) — Calcul sur statuts historisés.
- AP-TECH-332 (AP-FEAT-106) — Période paramétrable.
- AP-TECH-359 (AP-FEAT-114) — Index de recherche par domaine.
- AP-TECH-360 (AP-FEAT-114) — Résultats typés.
- AP-TECH-361 (AP-FEAT-115) — Composant Aide.
- AP-TECH-362 (AP-FEAT-115) — Textes.
- AP-TECH-363 (AP-FEAT-116) — Question de profil.
- AP-TECH-364 (AP-FEAT-116) — Réglage de niveau.

## 6. Fichiers et modules potentiellement concernés

- `src/domaines/accueil`
- `src/domaines/statistiques`
- `migrations/032-indicateurs.sql`

## 7. Évolutions SQL nécessaires

Vues d'agrégats annuels.

## 8. Dépendances

- Itérations préalables : IT-03, IT-06, IT-08, IT-12, IT-17, IT-18, IT-19.
- Fonctionnalités prérequises : AP-FEAT-002, AP-FEAT-030, AP-FEAT-035, AP-FEAT-052, AP-FEAT-066, AP-FEAT-069, AP-FEAT-072, AP-FEAT-075.

## 9. Risques

- Surcharge d'indicateurs.

## 10. Plan de tests

- Chaque indicateur testé sur jeu de démonstration.
- Aucune donnée de démonstration dans un indicateur réel.
- AP-FEAT-067 : Effectif affiché, pas de classement sous 3 valeurs.
- AP-FEAT-078 : Hypothèses affichées.
- AP-FEAT-103 : Captures par niveau.
- AP-FEAT-104 : Unitaires par règle.
- AP-FEAT-105 : Unitaires.
- AP-FEAT-106 : Période paramétrable.
- AP-FEAT-114 : e2e.
- AP-FEAT-115 : Relecture.
- AP-FEAT-116 : e2e in.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Recherche étendue à toutes les entités.

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
- Migration `migrations/032-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Ancien accueil réactivable par réglage.

## 16. Éléments à préserver

- Priorité du jour

## 17. Hors périmètre

- Widgets libres glisser-déposer

## 18. Itération suivante

[IT-24 — Assistant API : lecture](ITERATION_24.md)
