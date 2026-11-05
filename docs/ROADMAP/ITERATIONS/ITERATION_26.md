<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-26 — Rôles avancés, RGPD, documents et exports

| | |
|---|---|
| Identifiant | IT-26 |
| Phase | Phase 9 — Professionnalisation SaaS |
| Taille | M |
| Hypothèse de taille | Compléments SaaS indispensables avant ouverture large. |
| Migration | `033` |

## 1. Objectif

Permettre des équipes (saisonniers), garantir les droits des personnes et ranger les documents.

## 2. Résultat utilisateur attendu

Rôle saisonnier, journal d'activité, export complet, suppression de compte, coffre de documents.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-012 | Rôle saisonnier et droits fins | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-022 | Journal d'activité par membre | P2 | PARTIEL |
| AP-FEAT-023 | Gérer ses exploitations | P3 | PARTIEL |
| AP-FEAT-020 | Suppression du compte et de l'exploitation | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-101 | Coffre de documents | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-024 | Export complet de l'exploitation | P1 | PARTIEL |
| AP-FEAT-102 | Exports métier enrichis | P3 | EXISTANT ET COHÉRENT |

## 4. User stories associées

- **AP-US-020** (AP-FEAT-012) — En tant que responsable d'exploitation, je veux donner à un saisonnier l'accès aux visites d'un rucher seulement afin de l'équiper sans exposer mes chiffres.
- **AP-US-021** (AP-FEAT-022) — En tant que responsable d'exploitation, je veux voir l'activité d'un membre afin de comprendre une modification.
- **AP-US-022** (AP-FEAT-023) — En tant que responsable d'exploitation, je veux transférer la responsabilité à un autre membre afin de passer la main.
- **AP-US-025** (AP-FEAT-020) — En tant qu'apiculteur, je veux supprimer mon compte et mes données afin d'exercer mon droit.
- **AP-US-111** (AP-FEAT-101) — En tant qu'apiculteur, je veux joindre l'ordonnance à un traitement afin de la présenter en cas de contrôle.
- **AP-US-112** (AP-FEAT-024) — En tant qu'apiculteur, je veux récupérer toutes mes données afin de ne jamais être captif.
- **AP-US-113** (AP-FEAT-102) — En tant qu'apiculteur, je veux exporter mes traitements de l'année afin de les analyser dans un tableur.

## 5. Tâches techniques

- AP-TECH-065 (AP-FEAT-012) — Table membre_ruchers.
- AP-TECH-066 (AP-FEAT-012) — Fonction peut(action, rucher).
- AP-TECH-067 (AP-FEAT-012) — Politiques réécrites avec peut().
- AP-TECH-068 (AP-FEAT-012) — Navigation réduite pour ce rôle.
- AP-TECH-069 (AP-FEAT-022) — Vue activite unifiée.
- AP-TECH-070 (AP-FEAT-022) — Filtre membre dans l'écran Activité.
- AP-TECH-071 (AP-FEAT-023) — Fonction transferer_responsabilite().
- AP-TECH-072 (AP-FEAT-023) — Contrainte : ≥ 1 responsable.
- AP-TECH-073 (AP-FEAT-023) — Archivage (lecture seule).
- AP-TECH-081 (AP-FEAT-020) — Fonction demander_suppression().
- AP-TECH-082 (AP-FEAT-020) — Tâche planifiée de suppression effective.
- AP-TECH-083 (AP-FEAT-020) — E-mail de confirmation.
- AP-TECH-316 (AP-FEAT-101) — Table documents.
- AP-TECH-317 (AP-FEAT-101) — Stockage privé.
- AP-TECH-318 (AP-FEAT-101) — Liens.
- AP-TECH-319 (AP-FEAT-024) — Edge Function de génération.
- AP-TECH-320 (AP-FEAT-024) — Lien signé.
- AP-TECH-321 (AP-FEAT-024) — Script de réimport documenté.
- AP-TECH-322 (AP-FEAT-102) — Nouveaux exports.

## 6. Fichiers et modules potentiellement concernés

- `migrations/033-roles-documents.sql`
- `supabase/functions/exporter`
- `src/domaines/compte`
- `src/domaines/documents`

## 7. Évolutions SQL nécessaires

Migration 033 : rôle saisonnier, fonction peut(action), documents.

## 8. Dépendances

- Itérations préalables : IT-04, IT-20.
- Fonctionnalités prérequises : AP-FEAT-011, AP-FEAT-019, AP-FEAT-079.

## 9. Risques

- Suppression irréversible par erreur.
- AP-FEAT-020 : Suppression par erreur.

## 10. Plan de tests

- Export complet réimportable dans un projet vide.
- Suppression : délai de grâce et confirmation.
- AP-FEAT-012 : Matrice de droits testée.
- AP-FEAT-022 : Affichage sur jeu de démo.
- AP-FEAT-023 : Tests SQL : au moins un responsable.
- AP-FEAT-020 : Test : suppression puis annulation pendant le délai.
- AP-FEAT-101 : e2e.
- AP-FEAT-024 : Réimport dans un projet vide.
- AP-FEAT-102 : Ouverture dans un tableur.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Politique de confidentialité publiée.

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
- Migration `migrations/033-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Rôle saisonnier non proposé ; documents en lecture.

## 16. Éléments à préserver

- Rôles responsable/membre/lecteur

## 17. Hors périmètre

- SSO

## 18. Itération suivante

[IT-27 — Plans et abonnements](ITERATION_27.md)
