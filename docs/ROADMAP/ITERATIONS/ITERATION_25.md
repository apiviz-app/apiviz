<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-25 — Assistant API : actions et analyses

| | |
|---|---|
| Identifiant | IT-25 |
| Phase | Phase 8 — Pilotage et intelligence |
| Taille | M |
| Hypothèse de taille | Sur la base IT-24 : propositions d'écritures validées par l'utilisateur. |
| Migration | aucune |

## 1. Objectif

Transformer une note vocale en visite, préparer une tournée, détecter données manquantes et anomalies.

## 2. Résultat utilisateur attendu

« Ruche 3, reine vue, deux cadres de couvain… » → brouillon de visite à valider ; synthèse de saison générée.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-050 | Note vocale enregistrée | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-109 | Visite créée depuis une note vocale | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-110 | Synthèses et données manquantes | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-111 | Analyse de photo assistée | P4 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-056** (AP-FEAT-050) — En tant qu'apiculteur, je veux laisser une note vocale de 30 s afin de ne rien oublier quand je ne peux pas écrire.
- **AP-US-120** (AP-FEAT-109) — En tant qu'apiculteur, je veux dire naturellement ce que je vois afin de remplir la visite sans formulaire.
- **AP-US-121** (AP-FEAT-110) — En tant qu'apiculteur, je veux une synthèse de ma saison en une page afin de la partager avec mon GDS ou ma famille.
- **AP-US-122** (AP-FEAT-111) — En tant qu'apiculteur, je veux un second regard sur une photo de cadre afin de ne rien manquer.

## 5. Tâches techniques

- AP-TECH-172 (AP-FEAT-050) — MediaRecorder (format compressé).
- AP-TECH-173 (AP-FEAT-050) — File d'envoi commune.
- AP-TECH-174 (AP-FEAT-050) — Transcription en IT-25.
- AP-TECH-340 (AP-FEAT-109) — Extraction structurée.
- AP-TECH-341 (AP-FEAT-109) — Réutiliser l'écran de vérification.
- AP-TECH-342 (AP-FEAT-109) — Journal propositions/acceptations.
- AP-TECH-343 (AP-FEAT-110) — Gabarit de synthèse.
- AP-TECH-344 (AP-FEAT-110) — Règles d'anomalies déterministes + rédaction par le modèle.
- AP-TECH-345 (AP-FEAT-111) — Prototype interne.
- AP-TECH-346 (AP-FEAT-111) — Avertissement permanent.
- AP-TECH-347 (AP-FEAT-111) — Évaluation sur photos annotées.

## 6. Fichiers et modules potentiellement concernés

- `supabase/functions/assistant`
- `src/domaines/assistant`
- `tournee.js`

## 7. Évolutions SQL nécessaires

Aucune nouvelle table obligatoire.

## 8. Dépendances

- Itérations préalables : IT-11, IT-24.
- Fonctionnalités prérequises : AP-FEAT-047, AP-FEAT-107.

## 9. Risques

- Écriture sans validation.
- AP-FEAT-111 : Faux diagnostic.

## 10. Plan de tests

- Toute écriture passe par un écran de vérification (test).
- Analyse de photo présentée comme hypothèse.
- AP-FEAT-050 : Limite 60 s.
- AP-FEAT-109 : Aucune écriture sans validation (test).
- AP-FEAT-110 : Jeu de démo avec anomalies.
- AP-FEAT-111 : Jamais de diagnostic ; validation scientifique avant toute promesse.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Journal des actions proposées et acceptées.

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

Actions désactivables séparément de la lecture.

## 16. Éléments à préserver

- Vérification avant enregistrement de la tournée

## 17. Hors périmètre

- Diagnostic de maladie par photo présenté comme certain

## 18. Itération suivante

[IT-26 — Rôles avancés, RGPD, documents et exports](ITERATION_26.md)
