<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-21 — Clients professionnels, produits et factures conformes

| | |
|---|---|
| Identifiant | IT-21 |
| Phase | Phase 7 — Commercialisation |
| Taille | L |
| Hypothèse de taille | Enrichissement des clients, catalogue produits, factures figées ; décision préalable sur la facturation électronique (D-05). |
| Migration | `030` |

## 1. Objectif

Vendre à des professionnels avec des factures fiables et suivre les paiements.

## 2. Résultat utilisateur attendu

Client pro avec adresse et SIRET, produits hors miel, commandes, facture verrouillée, avoir, paiements partiels.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-074 | Produits de la ruche hors miel | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-083 | Clients professionnels | P1 | PARTIEL |
| AP-FEAT-084 | Catalogue de produits et tarifs | P2 | NON IMPLÉMENTÉ |
| AP-FEAT-085 | Commandes et préparation | P2 | PARTIEL |
| AP-FEAT-089 | Historique client | P3 | EXISTANT ET COHÉRENT |
| AP-FEAT-086 | Factures figées et avoirs | P1 | PARTIEL |
| AP-FEAT-087 | Paiements partiels et relances | P2 | PARTIEL |
| AP-FEAT-088 | Facturation électronique : position et export | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-080** (AP-FEAT-074) — En tant qu'apiculteur, je veux vendre un essaim afin de garder mes ventes au même endroit.
- **AP-US-091** (AP-FEAT-083) — En tant qu'apiculteur, je veux enregistrer une épicerie cliente afin de lui faire des factures.
- **AP-US-092** (AP-FEAT-084) — En tant qu'apiculteur, je veux appliquer un tarif professionnel afin de vendre en gros.
- **AP-US-093** (AP-FEAT-085) — En tant qu'apiculteur, je veux préparer les commandes de Noël afin de ne rien oublier.
- **AP-US-094** (AP-FEAT-089) — En tant qu'apiculteur, je veux retrouver ce qu'un client achète d'habitude afin de lui proposer sa commande de Noël.
- **AP-US-095** (AP-FEAT-086) — En tant qu'apiculteur, je veux corriger une facture déjà remise afin de rester en règle.
- **AP-US-096** (AP-FEAT-087) — En tant qu'apiculteur, je veux noter un acompte afin de suivre ce qui reste dû.
- **AP-US-097** (AP-FEAT-088) — En tant qu'apiculteur professionnel, je veux savoir si mes factures Apidoo seront valables en 2027 afin de ne pas être en défaut.

## 5. Tâches techniques

- AP-TECH-238 (AP-FEAT-074) — Produits typés.
- AP-TECH-239 (AP-FEAT-074) — Lien optionnel colonie vendue.
- AP-TECH-265 (AP-FEAT-083) — Colonnes clients.
- AP-TECH-266 (AP-FEAT-083) — Formulaire selon le type.
- AP-TECH-267 (AP-FEAT-084) — Table produits + tarifs.
- AP-TECH-268 (AP-FEAT-084) — Lien produit ↔ lot.
- AP-TECH-269 (AP-FEAT-084) — Remise par vente.
- AP-TECH-270 (AP-FEAT-085) — Statut commande.
- AP-TECH-271 (AP-FEAT-085) — Écran préparation.
- AP-TECH-272 (AP-FEAT-089) — Brancher sur factures/paiements.
- AP-TECH-273 (AP-FEAT-086) — Tables factures, avoirs.
- AP-TECH-274 (AP-FEAT-086) — Déclencheur d'immuabilité.
- AP-TECH-275 (AP-FEAT-086) — Reprise des factures v5.10.
- AP-TECH-276 (AP-FEAT-086) — Mentions vérifiées (source datée).
- AP-TECH-277 (AP-FEAT-087) — Table paiements.
- AP-TECH-278 (AP-FEAT-087) — Reprise.
- AP-TECH-279 (AP-FEAT-087) — Solde calculé.
- AP-TECH-280 (AP-FEAT-088) — Note réglementaire sourcée (doc 15).
- AP-TECH-281 (AP-FEAT-088) — Décision D-05.
- AP-TECH-282 (AP-FEAT-088) — Export Factur-X ou intégration partenaire.

## 6. Fichiers et modules potentiellement concernés

- `migrations/030-commerce.sql`
- `src/domaines/ventes`
- `essentiels.js (facture)`

## 7. Évolutions SQL nécessaires

Migration 030 : clients (champs pro), produits, factures, avoirs, paiements ; déclencheur d'immuabilité.

## 8. Dépendances

- Itérations préalables : IT-01.
- Fonctionnalités prérequises : AP-BUG-007.

## 9. Risques

- Conformité facturation mal interprétée.
- Factures v5.10 existantes à reprendre.
- AP-FEAT-086 : Conformité.
- AP-FEAT-088 : Mauvaise interprétation réglementaire.

## 10. Plan de tests

- Facture émise non modifiable (test SQL).
- Avoir rétablit le stock et le solde.
- AP-FEAT-074 : e2e vente essaim.
- AP-FEAT-083 : e2e.
- AP-FEAT-084 : Prix figés à la vente (déjà le cas).
- AP-FEAT-085 : e2e.
- AP-FEAT-089 : e2e.
- AP-FEAT-086 : Tests SQL d'immuabilité.
- AP-FEAT-087 : Reprise : paye = un paiement du total.
- AP-FEAT-088 : Validation par un expert-comptable.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Mentions de facture vérifiées contre une source officielle datée.

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
- Migration `migrations/030-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Ventes inchangées ; factures v5.10 lisibles.

## 16. Éléments à préserver

- Numérotation existante

## 17. Hors périmètre

- Émission via plateforme agréée (décision D-05)

## 18. Itération suivante

[IT-22 — Météo historisée et environnement](ITERATION_22.md)
