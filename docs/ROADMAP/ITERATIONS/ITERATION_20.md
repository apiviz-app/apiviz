<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-20 — Finances et coûts de production

| | |
|---|---|
| Identifiant | IT-20 |
| Phase | Phase 6 — Gestion de l'exploitation |
| Taille | M |
| Hypothèse de taille | Gestion existante solide ; ajout ventilation, justificatifs et vues de coûts. |
| Migration | `029` |

## 1. Objectif

Connaître le coût par kg, par rucher et par colonie, et fournir des exports au comptable.

## 2. Résultat utilisateur attendu

Bilan avec coût de revient, marge par rucher, justificatifs joints, export comptable.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-079 | Justificatifs joints aux dépenses | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-080 | Export comptable | P2 | PARTIEL |
| AP-FEAT-082 | Recettes hors ventes | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-081 | Coût de revient par kg, rucher et colonie | P1 | PARTIEL |

## 4. User stories associées

- **AP-US-087** (AP-FEAT-079) — En tant qu'apiculteur, je veux photographier le ticket d'achat de cire afin de le retrouver pour mon comptable.
- **AP-US-088** (AP-FEAT-080) — En tant qu'apiculteur, je veux envoyer mes comptes de l'année à mon comptable afin de gagner du temps.
- **AP-US-089** (AP-FEAT-082) — En tant qu'apiculteur, je veux noter une aide reçue afin d'avoir un résultat juste.
- **AP-US-090** (AP-FEAT-081) — En tant qu'apiculteur, je veux savoir combien me coûte un kilo de miel du Verger afin de fixer mes prix.

## 5. Tâches techniques

- AP-TECH-256 (AP-FEAT-079) — Espace de stockage privé « justificatifs ».
- AP-TECH-257 (AP-FEAT-079) — Pièce jointe sur la dépense.
- AP-TECH-258 (AP-FEAT-080) — Format documenté.
- AP-TECH-259 (AP-FEAT-080) — Export ZIP.
- AP-TECH-260 (AP-FEAT-082) — Table recettes ou type sur ventes.
- AP-TECH-261 (AP-FEAT-082) — Bilan mis à jour.
- AP-TECH-262 (AP-FEAT-081) — depenses.rucher_id.
- AP-TECH-263 (AP-FEAT-081) — Vue couts_annuels.
- AP-TECH-264 (AP-FEAT-081) — Écran rentabilité.

## 6. Fichiers et modules potentiellement concernés

- `migrations/029-finances.sql`
- `src/domaines/finances`

## 7. Évolutions SQL nécessaires

Migration 029 : depenses.rucher_id, pièces jointes (stockage privé), vues couts_annuels, rendements_annuels.

## 8. Dépendances

- Itérations préalables : IT-11, IT-18.
- Fonctionnalités prérequises : AP-FEAT-048, AP-FEAT-072.

## 9. Risques

- Clés de répartition contestables.

## 10. Plan de tests

- Coût par kg = dépenses de l'année / kg récoltés, vérifié sur jeu de test.
- Clé de répartition documentée à l'écran.
- AP-FEAT-079 : e2e.
- AP-FEAT-080 : Ouverture dans un tableur.
- AP-FEAT-082 : Unitaires.
- AP-FEAT-081 : Calculs sur jeu de démo ; clé affichée.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Export CSV comptable.

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
- Migration `migrations/029-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Vues additives.

## 16. Éléments à préserver

- Budget et simulateur

## 17. Hors périmètre

- Comptabilité en partie double
- Liasse fiscale

## 18. Itération suivante

[IT-21 — Clients professionnels, produits et factures conformes](ITERATION_21.md)
