<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). Révisée le 6 nov. 2026 (application web et stores, voir 12_DISTRIBUTION_ET_MONETISATION.md). -->

# IT-27 — Plans et abonnements

| | |
|---|---|
| Identifiant | IT-27 |
| Phase | Phase 9 — Professionnalisation SaaS et monétisation |
| Taille | L |
| Hypothèse de taille | Uniquement après validation du modèle économique (D-08). Trois canaux de paiement (web, App Store, Google Play) vers une seule table de droits (12 §5) ; prestataire web et stratégie mobile : D-14. Pourrait être découpée en deux (web, puis achats intégrés). |
| Migration | `034` |

## 1. Objectif

Proposer une offre gratuite et une offre payante sans dégrader l'expérience gratuite.

## 2. Résultat utilisateur attendu

Essai, abonnement sur le web ou dans l'application, portail client, limites selon l'offre ; un abonnement acheté sur un canal est reconnu partout.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-117 | Offres et limites | P4 | NON IMPLÉMENTÉ |
| AP-FEAT-118 | Abonnement et paiement | P4 | NON IMPLÉMENTÉ |
| AP-FEAT-119 | Suivi de l'usage | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-125 | Achats intégrés et droits multicanaux | P4 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-130** (AP-FEAT-117) — En tant que responsable d'exploitation, je veux savoir ce que comprend mon offre afin de choisir en connaissance de cause.
- **AP-US-131** (AP-FEAT-118) — En tant que responsable d'exploitation, je veux m'abonner en quelques clics afin de débloquer l'offre.
- **AP-US-132** (AP-FEAT-119) — En tant que responsable d'exploitation du produit, je veux connaître la durée médiane d'une visite afin de savoir si l'objectif est atteint.
- **AP-US-140** (AP-FEAT-125) — En tant que responsable d'exploitation sur iPhone ou Android, je veux m'abonner dans l'application et retrouver mon abonnement sur le web afin de ne payer qu'une fois.

## 5. Tâches techniques

- AP-TECH-365 (AP-FEAT-117) — Décision D-08.
- AP-TECH-366 (AP-FEAT-117) — Table abonnements.
- AP-TECH-367 (AP-FEAT-117) — Contrôles dans les fonctions de création.
- AP-TECH-368 (AP-FEAT-118) — Choix du prestataire.
- AP-TECH-369 (AP-FEAT-118) — Edge Function webhooks.
- AP-TECH-370 (AP-FEAT-118) — Portail client.
- AP-TECH-371 (AP-FEAT-119) — Vue d'agrégats anonymisés.
- AP-TECH-372 (AP-FEAT-119) — Mention dans la politique.
- AP-TECH-397 (AP-FEAT-125) — Décision D-14 ; programme Small Business d'Apple ; produits d'abonnement créés dans les deux consoles.
- AP-TECH-398 (AP-FEAT-125) — Achats intégrés natifs via un module Capacitor, ou service tiers unifiant Apple, Google et web (à évaluer).
- AP-TECH-399 (AP-FEAT-125) — Edge Functions : notifications serveur App Store et notifications en temps réel Google Play, idempotentes, vers la table abonnements (colonne canal).
- AP-TECH-400 (AP-FEAT-125) — Restauration des achats ; aucun bouton de paiement externe dans l'app iOS hors pays et autorisations prévus par Apple.
- AP-TECH-401 (AP-FEAT-125) — CGV et conditions d'abonnement affichées avant l'achat dans les trois canaux.

## 6. Fichiers et modules potentiellement concernés

- `supabase/functions/facturation`
- `migrations/034-abonnements.sql`
- `src/domaines/compte`
- `supabase/functions/stores`

## 7. Évolutions SQL nécessaires

Migration 034 : abonnements, limites.

## 8. Dépendances

- Itérations préalables : IT-03, IT-26, IT-28.
- Fonctionnalités prérequises : AP-FEAT-016, AP-FEAT-020.

## 9. Risques

- Blocage d'un utilisateur au rucher par une limite.
- AP-FEAT-118 : Webhooks rejoués.
- AP-FEAT-125 : Refus Apple (règles 3.1.1 et 3.1.3) ; abonnements en double sur deux canaux.

## 10. Plan de tests

- Webhooks rejoués sans double effet.
- Dépassement de limite : lecture toujours possible.
- AP-FEAT-117 : Dépassement : lecture toujours possible.
- AP-FEAT-118 : Rejeu sans double effet.
- AP-FEAT-119 : Données agrégées seulement.
- AP-FEAT-125 : Achat en bac à sable Apple et Google, reconnu sur le web ; résiliation propagée.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- CGV publiées.

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
- Migration `migrations/034-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Plans désactivés : tout le monde en gratuit.

## 16. Éléments à préserver

- Données des utilisateurs gratuits

## 17. Hors périmètre

- Facturation à l'usage

## 18. Itération suivante

[IT-31 — International](ITERATION_31.md)
