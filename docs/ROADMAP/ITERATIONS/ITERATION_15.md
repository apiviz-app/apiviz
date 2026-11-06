<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). Révisée le 6 nov. 2026 (application web et stores, voir 12_DISTRIBUTION_ET_MONETISATION.md). -->

# IT-15 — Tâches récurrentes, calendrier et notifications

| | |
|---|---|
| Identifiant | IT-15 |
| Phase | Phase 3 — Santé et conduite du rucher |
| Taille | L |
| Hypothèse de taille | Récurrence et calendrier côté app ; notifications push via Edge Function planifiée (VAPID) — premier service serveur ; dans les applications iOS et Android (IT-30), notifications natives par le même service. |
| Migration | `024` |

## 1. Objectif

Planifier, répartir et être réellement rappelé, même application fermée.

## 2. Résultat utilisateur attendu

Vue calendrier, tâches répétées, tâches générées (fin de traitement, déclaration), notifications sur le téléphone.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-090 | Tâches récurrentes et générées | P1 | PARTIEL |
| AP-FEAT-091 | Vue calendrier | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-094 | Conseils de saison sourcés | P3 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-092 | Notifications push | P1 | PARTIEL |
| AP-FEAT-093 | Préférences de notification | P2 | PARTIEL |

## 4. User stories associées

- **AP-US-099** (AP-FEAT-090) — En tant qu'apiculteur, je veux une tâche « peser les ruches » tous les 15 jours en hiver afin de ne plus y penser.
- **AP-US-100** (AP-FEAT-090) — En tant que responsable d'exploitation, je veux assigner une tâche à un membre afin de répartir le travail.
- **AP-US-101** (AP-FEAT-091) — En tant qu'apiculteur, je veux voir mon mois de mai afin de répartir mes visites.
- **AP-US-102** (AP-FEAT-094) — En tant qu'apiculteur, je veux des conseils adaptés à ma région afin qu'ils soient pertinents.
- **AP-US-103** (AP-FEAT-092) — En tant qu'apiculteur, je veux recevoir un rappel le matin des tâches du jour afin de ne rien oublier.
- **AP-US-104** (AP-FEAT-093) — En tant qu'apiculteur, je veux ne recevoir que les fins de traitement afin de garder l'essentiel.

## 5. Tâches techniques

- AP-TECH-286 (AP-FEAT-090) — Colonnes recurrence, priorite, assigne_email, origine.
- AP-TECH-287 (AP-FEAT-090) — Régénération à la complétion.
- AP-TECH-288 (AP-FEAT-090) — Génération depuis opérations.
- AP-TECH-289 (AP-FEAT-091) — Composant calendrier sans dépendance lourde.
- AP-TECH-290 (AP-FEAT-091) — Vue liste conservée.
- AP-TECH-291 (AP-FEAT-094) — Format de conseils (mois, région, source).
- AP-TECH-292 (AP-FEAT-094) — Calendrier par défaut neutre.
- AP-TECH-293 (AP-FEAT-092) — Clés VAPID (secret Supabase).
- AP-TECH-294 (AP-FEAT-092) — Table abonnements_push.
- AP-TECH-295 (AP-FEAT-092) — Edge Function planifiée.
- AP-TECH-296 (AP-FEAT-092) — Gestion push dans sw.js.
- AP-TECH-407 (AP-FEAT-092) — Notifications natives (APNs, FCM) via le module Capacitor, si IT-30 est faite ; jetons dans abonnements_push avec la plateforme.
- AP-TECH-408 (AP-FEAT-092) — Edge Function notifier : envoi web ou natif selon la plateforme de chaque abonnement.
- AP-TECH-297 (AP-FEAT-093) — Préférences par abonnement.
- AP-TECH-298 (AP-FEAT-093) — Respect dans notifier.

## 6. Fichiers et modules potentiellement concernés

- `migrations/024-taches-push.sql`
- `src/domaines/agenda`
- `sw.js (push)`
- `supabase/functions/notifier`

## 7. Évolutions SQL nécessaires

Migration 024 : récurrence, priorité, assignation, origine des tâches ; abonnements_push.

## 8. Dépendances

- Itérations préalables : IT-14.
- Fonctionnalités prérequises : aucune hors itération.

## 9. Risques

- iPhone : push seulement application installée.
- Notifications trop nombreuses.

## 10. Plan de tests

- Tâche récurrente régénérée après complétion.
- Push reçu sur Android et iPhone installé (manuel).
- AP-FEAT-090 : Unitaires de récurrence.
- AP-FEAT-091 : Captures mobiles.
- AP-FEAT-094 : Relecture.
- AP-FEAT-092 : Recette manuelle.
- AP-FEAT-093 : e2e.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Préférences de notification par sujet.

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
- Migration `migrations/024-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Edge Function arrêtée : retour aux rappels locaux.

## 16. Éléments à préserver

- Export .ics
- Écran Rappels

## 17. Hors périmètre

- SMS, e-mail de rappel

## 18. Itération suivante

[IT-16 — Événements biologiques et généalogie](ITERATION_16.md)
