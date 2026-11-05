<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-04 — Sécurité de la base et tests SQL

| | |
|---|---|
| Identifiant | IT-04 |
| Phase | Phase 0 — Sécuriser et maîtriser l'existant |
| Taille | M |
| Hypothèse de taille | Les politiques existent ; il faut surtout les tester et compléter rôles et invitations. |
| Migration | `014` |

## 1. Objectif

Garantir par des tests automatiques que chaque exploitation ne voit et ne modifie que ses données, et maîtriser les accès.

## 2. Résultat utilisateur attendu

Le responsable peut inviter en choisissant le rôle (membre ou lecteur), limiter et révoquer un lien ; les suppressions sont tracées.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-008 | Tests SQL et RLS en CI | P0 | NON IMPLÉMENTÉ |
| AP-FEAT-018 | Données de démonstration reproductibles | P1 | PARTIEL |
| AP-FEAT-010 | Invitations maîtrisées | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-011 | Rôle lecteur | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-009 | Intégrité entre exploitations | P1 | PARTIEL |
| AP-FEAT-019 | Journal d'audit des modifications sensibles | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-021 | Mentions de confidentialité et services tiers | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-013** (AP-FEAT-008) — En tant que développeur, je veux un test qui échoue si une exploitation voit les données d'une autre afin de ne jamais livrer une fuite.
- **AP-US-017** (AP-FEAT-018) — En tant que développeur, je veux générer la même exploitation de démonstration partout afin de tester sur des données réalistes.
- **AP-US-018** (AP-FEAT-010) — En tant que responsable d'exploitation, je veux créer un lien valable pour une seule personne afin de contrôler qui rejoint l'exploitation.
- **AP-US-019** (AP-FEAT-011) — En tant que responsable d'exploitation, je veux inviter quelqu'un en lecture seule afin de partager sans risque.
- **AP-US-023** (AP-FEAT-009) — En tant que responsable d'exploitation, je veux la garantie qu'aucune donnée n'est rattachée à une autre exploitation afin d'avoir confiance dans l'isolation.
- **AP-US-024** (AP-FEAT-019) — En tant que responsable d'exploitation, je veux retrouver ce qui a été supprimé afin de réparer une erreur.
- **AP-US-026** (AP-FEAT-021) — En tant qu'apiculteur, je veux savoir où partent mes données afin de décider en connaissance de cause.

## 5. Tâches techniques

- AP-TECH-038 (AP-FEAT-008) — Image Postgres avec schéma auth simulé (auth.jwt via request.jwt.claims).
- AP-TECH-039 (AP-FEAT-008) — Scripts de test en SQL (assertions) ou pgTAP.
- AP-TECH-040 (AP-FEAT-008) — Matrice tables × rôles × opérations.
- AP-TECH-041 (AP-FEAT-008) — Job CI dédié.
- AP-TECH-042 (AP-FEAT-008) — Contrôle automatique de structure avant mise en ligne production (remplace la case « migrations faites »).
- AP-TECH-054 (AP-FEAT-018) — Format de données unique (JSON).
- AP-TECH-055 (AP-FEAT-018) — Script d'insertion via les fonctions SQL.
- AP-TECH-056 (AP-FEAT-018) — Colonne exploitations.demo.
- AP-TECH-057 (AP-FEAT-018) — Refus si URL de production.
- AP-TECH-058 (AP-FEAT-010) — Colonnes role, usages_max, usages, revoque_le.
- AP-TECH-059 (AP-FEAT-010) — rejoindre() les vérifie.
- AP-TECH-060 (AP-FEAT-010) — Liste des liens actifs avec bouton Révoquer.
- AP-TECH-061 (AP-FEAT-010) — Liens existants : usages_max null = illimité jusqu'à expiration.
- AP-TECH-062 (AP-FEAT-011) — Ajouter 'lecteur' au contrôle de rôle.
- AP-TECH-063 (AP-FEAT-011) — Politiques séparées select / insert-update-delete.
- AP-TECH-064 (AP-FEAT-011) — Interface : masquer les actions.
- AP-TECH-074 (AP-FEAT-009) — Contrôle d'existence sous RLS dans creer_visite.
- AP-TECH-075 (AP-FEAT-009) — Requête de détection d'incohérences existantes.
- AP-TECH-076 (AP-FEAT-009) — Contraintes composites pour toutes les tables créées après 014.
- AP-TECH-077 (AP-FEAT-019) — Table journal_audit (jsonb avant).
- AP-TECH-078 (AP-FEAT-019) — Déclencheur sur tables métier.
- AP-TECH-079 (AP-FEAT-019) — Restauration simple pour visites, ventes, dépenses.
- AP-TECH-080 (AP-FEAT-019) — Purge à 1 an.
- AP-TECH-084 (AP-FEAT-021) — Rédiger la politique (hébergeur, services tiers, durées).
- AP-TECH-085 (AP-FEAT-021) — Message unique avant la 1re dictée.
- AP-TECH-086 (AP-FEAT-021) — Lien dans Compte et dans la présentation.

## 6. Fichiers et modules potentiellement concernés

- `migrations/014-roles-audit.sql`
- `tests/sql/*`
- `.github/workflows/verifier.yml`
- `exploitations.js / src/domaines/compte`
- `docs/CONFIDENTIALITE.md (nouveau)`

## 7. Évolutions SQL nécessaires

Migration 014 : rôle `lecteur`, invitations (rôle, usages max, révocation), contrôle d'exploitation dans creer_*, journal_audit.

## 8. Dépendances

- Itérations préalables : IT-00.
- Fonctionnalités prérequises : AP-FEAT-003.

## 9. Risques

- Politique trop stricte qui bloque un membre légitime.
- Tests SQL lents en CI.

## 10. Plan de tests

- Suite SQL : pour chaque table, lecture/écriture croisée entre deux exploitations refusée.
- Lecteur : écriture refusée partout.
- Invitation épuisée ou révoquée refusée.
- AP-FEAT-008 : La suite elle-même.
- AP-FEAT-018 : Indicateurs réels sans ligne de démo.
- AP-FEAT-010 : Tests SQL des cas épuisé/révoqué/expiré.
- AP-FEAT-011 : Tests SQL écriture refusée.
- AP-FEAT-009 : Test SQL de rattachement croisé refusé.
- AP-FEAT-019 : Test SQL : suppression → ligne d'audit.
- AP-FEAT-021 : Relecture.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Suite SQL en CI, verte.
- Données de démonstration générées par script.

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
- Migration `migrations/014-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Migration additive : revert du code ; le rôle lecteur n'est simplement plus proposé.

## 16. Éléments à préserver

- Isolation 008
- Invitations existantes encore valables

## 17. Hors périmètre

- Rôle saisonnier et droits fins (IT-26)

## 18. Itération suivante

[IT-05 — Ruchers](ITERATION_05.md)
