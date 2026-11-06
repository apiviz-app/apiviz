<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-11 — Photos et voix consolidées

| | |
|---|---|
| Identifiant | IT-11 |
| Phase | Phase 2 — Expérience terrain |
| Taille | S |
| Hypothèse de taille | Fonctions existantes à fiabiliser et à étendre aux colonies et ruchers. |
| Migration | `020` |

## 1. Objectif

Rendre photos et dictée fiables sur vrais téléphones et maîtriser le quota.

## 2. Résultat utilisateur attendu

Photos HEIC acceptées, photos de colonie et de rucher, espace surveillé, dictée expliquée.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-047 | Photos fiables sur téléphone | P1 | À VÉRIFIER |
| AP-FEAT-048 | Surveillance et nettoyage du stockage | P2 | PARTIEL |
| AP-FEAT-049 | Dictée vocale fiable | P2 | À VÉRIFIER |

## 4. User stories associées

- **AP-US-053** (AP-FEAT-047) — En tant qu'apiculteur, je veux prendre une photo d'iPhone au rucher sans réseau afin d'illustrer ma visite.
- **AP-US-054** (AP-FEAT-048) — En tant que responsable d'exploitation, je veux être prévenu avant que l'espace photos soit plein afin d'anticiper.
- **AP-US-055** (AP-FEAT-049) — En tant qu'apiculteur, je veux dicter ma visite avec des gants afin de garder les mains libres.

## 5. Tâches techniques

- AP-TECH-163 (AP-FEAT-047) — Liste de recette manuelle.
- AP-TECH-164 (AP-FEAT-047) — Repli si décodage impossible (message clair).
- AP-TECH-165 (AP-FEAT-047) — Rattachement colonie/rucher.
- AP-TECH-166 (AP-FEAT-048) — Edge Function planifiée.
- AP-TECH-167 (AP-FEAT-048) — Seuil d'alerte.
- AP-TECH-168 (AP-FEAT-048) — Journal de nettoyage.
- AP-TECH-169 (AP-FEAT-049) — Recette manuelle iPhone/Android.
- AP-TECH-170 (AP-FEAT-049) — Vocabulaire des nouveaux champs.
- AP-TECH-171 (AP-FEAT-049) — Message de repli.

## 6. Fichiers et modules potentiellement concernés

- `photos.js → src/domaines/photos`
- `voix.js`
- `supabase/functions/nettoyer-stockage`

## 7. Évolutions SQL nécessaires

Rattachement des photos à colonie/rucher (colonnes facultatives).

## 8. Dépendances

- Itérations préalables : IT-01, IT-04, IT-08.
- Fonctionnalités prérequises : AP-BUG-004, AP-FEAT-021, AP-FEAT-038.

## 9. Risques

- HEIC non décodable par le navigateur.

## 10. Plan de tests

- Recette manuelle iPhone/Android (liste fournie).
- Nettoyage : fichiers sans fiche supprimés, fiches intactes.
- AP-FEAT-047 : Recette manuelle documentée.
- AP-FEAT-048 : Test sur jeu avec orphelins.
- AP-FEAT-049 : Recette manuelle.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Alerte à 80 % du quota.

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
- Migration `migrations/020-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Edge Function désactivable.

## 16. Éléments à préserver

- File d'envoi des photos

## 17. Hors périmètre

- Analyse d'image par IA (IT-25)

## 18. Itération suivante

[IT-30 — Applications iOS et Android : socle](ITERATION_30.md)
