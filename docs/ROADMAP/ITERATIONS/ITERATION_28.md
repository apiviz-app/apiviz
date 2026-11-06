<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). Réécrite le 6 nov. 2026 (révision « application web et stores ») : la partie internationale passe en IT-31, la TWA est abandonnée au profit de Capacitor (IT-30). -->

# IT-28 — Publication sur les stores

| | |
|---|---|
| Identifiant | IT-28 |
| Phase | Phase 2 — Expérience terrain |
| Taille | M |
| Hypothèse de taille | Applications construites en IT-30. Publication **gratuite** sur l'App Store et Google Play ; aucune offre payante à ce stade. Revue Apple et test fermé Google à intégrer au calendrier (voir 12 §4). |
| Migration | `0xx` (demande de suppression de compte) |

## 1. Objectif

Rendre Apidoo installable depuis l'App Store et Google Play, en respectant les règles des deux stores.

## 2. Résultat utilisateur attendu

Fiches publiées sur les deux stores ; suppression du compte possible dans l'application ; politique de confidentialité publiée.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-120 | Publication Google Play et App Store | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-020 | Suppression du compte et de l'exploitation | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-133** (AP-FEAT-120) — En tant qu'apiculteur, je veux installer Apidoo depuis le Play Store afin de le trouver facilement.
- **AP-US-141** (AP-FEAT-120) — En tant qu'apiculteur sur iPhone, je veux installer Apidoo depuis l'App Store afin de l'utiliser comme mes autres applications.
- **AP-US-025** (AP-FEAT-020) — En tant qu'apiculteur, je veux supprimer mon compte et mes données afin d'exercer mon droit.

## 5. Tâches techniques

- AP-TECH-373 (AP-FEAT-120) — ~~Bubblewrap~~ **ABANDONNÉ** (6 nov. 2026 : Capacitor pour les deux stores, IT-30).
- AP-TECH-374 (AP-FEAT-120) — assetlinks.json (fait en IT-30, vérifié ici).
- AP-TECH-375 (AP-FEAT-120) — Test fermé 12 testeurs, 14 jours (inutile si compte organisation, D-13).
- AP-TECH-402 (AP-FEAT-120) — Fiches store : textes, captures téléphone et tablette, catégorie, classification d'âge.
- AP-TECH-403 (AP-FEAT-120) — Politique de confidentialité publiée sur le domaine ; étiquettes de confidentialité Apple ; section « Sécurité des données » Google.
- AP-TECH-404 (AP-FEAT-120) — Compte de démonstration pour les équipes de revue, avec données d'exemple, documenté hors dépôt.
- AP-TECH-405 (AP-FEAT-120) — Notes de revue Apple : fonctions natives et hors ligne mises en avant (règle 4.2).
- AP-TECH-081 (AP-FEAT-020) — Fonction demander_suppression().
- AP-TECH-082 (AP-FEAT-020) — Tâche planifiée de suppression effective.
- AP-TECH-083 (AP-FEAT-020) — E-mail de confirmation.

## 6. Fichiers et modules potentiellement concernés

- `ios/`, `android/` (métadonnées)
- `docs/CONFIDENTIALITE.md`
- `src/domaines/compte`
- `supabase/functions` (suppression planifiée)
- `migrations/0xx-suppression-compte.sql`

## 7. Évolutions SQL nécessaires

Migration additive : demande de suppression avec délai de grâce de 30 jours, fonction `demander_suppression()`.

## 8. Dépendances

- Itérations préalables : IT-29, IT-30.
- Décisions : D-13 (comptes développeur au nom de qui).
- Fonctionnalités prérequises : AP-FEAT-021 (mentions de confidentialité, IT-04). L'export actuel suffit pour proposer d'exporter avant suppression ; AP-FEAT-024 (IT-26) l'enrichira.

## 9. Risques

- Refus Apple au titre de la règle 4.2 (« site reconditionné ») : préparé par IT-30.
- Test fermé Google de 14 jours si compte personnel.
- AP-FEAT-020 : Suppression par erreur.

## 10. Plan de tests

- Revue TestFlight externe puis soumission App Store.
- Test fermé Google Play (12 testeurs, 14 jours) si compte personnel.
- AP-FEAT-120 : Publication effective sur les deux stores.
- AP-FEAT-020 : Test : suppression puis annulation pendant le délai.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Fiches publiées sur l'App Store et Google Play.

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
- Migration additive, d'abord sur `apidoo-test`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Applications publiées sur les deux stores.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion, avant production et avant chaque soumission aux stores (CLAUDE.md).
- Jalon J8 : retours des stores et des premiers utilisateurs.

## 15. Conditions de retour arrière

Retrait de la fiche store sans effet sur le web ; une version corrigée remplace une version défectueuse (pas de retour à une version antérieure sur un téléphone).

## 16. Éléments à préserver

- Publication web inchangée
- Application gratuite : aucune offre payante avant IT-27

## 17. Hors périmètre

- Achats intégrés et abonnements (IT-27)
- Traduction et autres pays (IT-31)

## 18. Itération suivante

Phase 3 : [IT-12](ITERATION_12.md).
