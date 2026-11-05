<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-02 — Réalignement de la production et sauvegardes

| | |
|---|---|
| Identifiant | IT-02 |
| Phase | Phase 0 — Sécuriser et maîtriser l'existant |
| Taille | S |
| Hypothèse de taille | Relevé du 5 nov. 2026 : la production tourne déjà la v5.14 avec 008, mais 010 et 011 n'y sont pas appliquées ; la base contient 6 ruches et aucune visite. Opération courte, accord du responsable requis. |
| Migration | aucune |

## 1. Objectif

Faire correspondre base de production et version publiée, corriger la documentation d'état, et mettre en place une sauvegarde restaurable.

## 2. Résultat utilisateur attendu

Déplacements, interventions et factures fonctionnent en production ; le nom de l'exploitation s'affiche sur les invitations ; une sauvegarde automatique existe.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-005 | Réalignement base de production / version publiée | P0 | PARTIEL |
| AP-FEAT-006 | Sauvegardes automatiques et restauration testée | P0 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-005** (AP-FEAT-005) — En tant que responsable d'exploitation, je veux que la base de production corresponde à la version publiée afin que toutes les fonctions visibles marchent.
- **AP-US-015** (AP-FEAT-006) — En tant que responsable d'exploitation, je veux une sauvegarde quotidienne restaurable afin de ne jamais perdre les données de l'exploitation.

## 5. Tâches techniques

- AP-TECH-013 (AP-FEAT-005) — Appliquer 010 puis 011 sur apidoo-test, puis sur apidoo (accord du responsable).
- AP-TECH-014 (AP-FEAT-005) — Corriger migrations/README.md, a-appliquer-en-production.txt et les statuts « à essayer en recette » du CHANGELOG.
- AP-TECH-015 (AP-FEAT-005) — Ajouter au workflow de mise en ligne un contrôle automatique de structure (IT-04).
- AP-TECH-016 (AP-FEAT-005) — Mettre à jour GUIDE.md (v5).
- AP-TECH-046 (AP-FEAT-006) — Choisir le stockage (décision D-03).
- AP-TECH-047 (AP-FEAT-006) — Workflow planifié pg_dump + copie du stockage, chiffrement (clé en secret).
- AP-TECH-048 (AP-FEAT-006) — Rétention 30 jours.
- AP-TECH-049 (AP-FEAT-006) — Procédure écrite et testée dans docs/PROCESSUS.md.

## 6. Fichiers et modules potentiellement concernés

- `docs/PROCESSUS.md`
- `docs/CHANGELOG.md`
- `migrations/a-appliquer-en-production.txt`
- `.github/workflows/sauvegarde.yml (nouveau)`
- `docs/GUIDE.md`

## 7. Évolutions SQL nécessaires

Application de 010, 011 puis 012 sur apidoo-test puis apidoo (008 et 009 déjà présentes d'après le relevé du 5 nov. 2026).

## 8. Dépendances

- Itérations préalables : IT-00, IT-01.
- Fonctionnalités prérequises : AP-BUG-001, AP-FEAT-004.

## 9. Risques

- Écart supplémentaire non détecté par le relevé.
- Sauvegarde stockée en clair dans le dépôt public.

## 10. Plan de tests

- Relevé de structure avant/après sur les deux bases.
- Parcours déplacement, intervention, facture en production.
- Restauration d'une sauvegarde testée sur un projet vide.
- AP-FEAT-005 : Relevé de structure avant/après.
- AP-FEAT-006 : Restauration complète sur un projet vide.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Structure de apidoo = structure de apidoo-test = fichiers de migration ; CHANGELOG (« en production ») et liste d'attente à jour.
- Sauvegarde quotidienne chiffrée hors dépôt, restauration documentée et testée.

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
- Aucune migration.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

010, 011 et 012 sont additives : rien à défaire côté base ; revert du code si besoin.

## 16. Éléments à préserver

- Données réelles
- Étiquettes git recette/deploiement

## 17. Hors périmètre

- Nouvelles fonctionnalités

## 18. Itération suivante

[IT-03 — Noyau applicatif](ITERATION_03.md)
