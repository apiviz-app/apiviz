<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-10 — QR codes et tournée enchaînée

| | |
|---|---|
| Identifiant | IT-10 |
| Phase | Phase 2 — Expérience terrain |
| Taille | M |
| Hypothèse de taille | Génération et impression de QR + lecture par l'appareil photo ; amélioration de l'enchaînement. |
| Migration | aucune |

## 1. Objectif

Ouvrir une colonie en scannant sa ruche et enchaîner les visites d'un rucher.

## 2. Résultat utilisateur attendu

Scanner → fiche → visite → suivante, au rucher, en quelques secondes.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-041 | Tournée : enchaînement et ordre | P2 | EXISTANT ET COHÉRENT |
| AP-FEAT-042 | Actions groupées sur plusieurs colonies | P2 | PARTIEL |
| AP-FEAT-046 | QR codes des colonies | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-045** (AP-FEAT-041) — En tant qu'apiculteur, je veux enchaîner les colonies d'un rucher dans l'ordre où elles sont posées afin de ne pas marcher pour rien.
- **AP-US-046** (AP-FEAT-042) — En tant qu'apiculteur, je veux poser une hausse sur 10 colonies en une fois afin de gagner du temps pendant la miellée.
- **AP-US-052** (AP-FEAT-046) — En tant qu'apiculteur, je veux scanner ma ruche pour ouvrir sa fiche afin de ne plus chercher dans une liste.

## 5. Tâches techniques

- AP-TECH-140 (AP-FEAT-041) — Champ ordre de pose par colonie.
- AP-TECH-141 (AP-FEAT-041) — Choix de l'ordre (priorité / pose).
- AP-TECH-142 (AP-FEAT-041) — Conserver les 3 modes.
- AP-TECH-143 (AP-FEAT-042) — Composant sélecteur de colonies.
- AP-TECH-144 (AP-FEAT-042) — Actions groupées : hausse, état, tâche.
- AP-TECH-145 (AP-FEAT-042) — Fonction SQL groupée.
- AP-TECH-159 (AP-FEAT-046) — Génération de codes courts uniques.
- AP-TECH-160 (AP-FEAT-046) — Bibliothèque QR (CDN autorisé).
- AP-TECH-161 (AP-FEAT-046) — Planche A4 imprimable.
- AP-TECH-162 (AP-FEAT-046) — Route ?c= ; scanner intégré si BarcodeDetector disponible.

## 6. Fichiers et modules potentiellement concernés

- `src/domaines/colonies (QR)`
- `src/domaines/visites (suivante)`
- `bibliothèque de génération QR (CDN autorisé)`

## 7. Évolutions SQL nécessaires

Colonne code unique par colonie/contenant (déjà prévue en 016).

## 8. Dépendances

- Itérations préalables : IT-03, IT-05, IT-06, IT-08.
- Fonctionnalités prérequises : AP-FEAT-002, AP-FEAT-025, AP-FEAT-030, AP-FEAT-037.

## 9. Risques

- Lecture QR non disponible dans certains navigateurs.

## 10. Plan de tests

- Planche de QR imprimée et lue par iPhone et Android (manuel).
- URL ?c=CODE ouvre la bonne fiche, hors ligne compris.
- AP-FEAT-041 : e2e tn.
- AP-FEAT-042 : Annulation 5 s.
- AP-FEAT-046 : Lecture sur 2 téléphones.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Planche imprimable A4 et étiquette unitaire.

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

Fonction isolée : désactivation sans effet sur le reste.

## 16. Éléments à préserver

- Tournée v5.11

## 17. Hors périmètre

- NFC

## 18. Itération suivante

[IT-11 — Photos et voix consolidées](ITERATION_11.md)
