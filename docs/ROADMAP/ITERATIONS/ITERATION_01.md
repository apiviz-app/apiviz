<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-01 — Correctifs de fiabilité

| | |
|---|---|
| Identifiant | IT-01 |
| Phase | Phase 0 — Sécuriser et maîtriser l'existant |
| Taille | S |
| Hypothèse de taille | Six correctifs ciblés et une petite migration additive ; logique hors ligne existante conservée. |
| Migration | `012` |

## 1. Objectif

Supprimer les pertes de données et les fuites identifiées par l'audit avant la bascule en production.

## 2. Résultat utilisateur attendu

Plus aucune saisie hors ligne perdue ; données effacées à la déconnexion ; messages d'erreur en français.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-BUG-002 | Données tronquées au-delà du plafond de lignes | P0 | À VÉRIFIER |
| AP-BUG-003 | Données gardées après la déconnexion | P0 | EXISTANT MAIS À AMÉLIORER |
| AP-BUG-001 | Saisie hors ligne perdue sur erreur serveur | P0 | EXISTANT MAIS À AMÉLIORER |
| AP-BUG-004 | Photos orphelines après suppression d'une ruche | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-BUG-005 | Écritures écrasées à plusieurs (réglages, entrée de stock) | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-BUG-007 | Facture sans adresse du client | P1 | EXISTANT MAIS À AMÉLIORER |
| AP-FEAT-036 | Messages d'erreur en français | P1 | PARTIEL |
| AP-BUG-006 | Nom d'exploitation par défaut codé en dur | P2 | EXISTANT MAIS À AMÉLIORER |

## 4. User stories associées

- **AP-US-012** (AP-BUG-002) — En tant qu'apiculteur, je veux voir tout mon historique afin d'avoir un registre complet.
- **AP-US-027** (AP-BUG-003) — En tant qu'apiculteur, je veux que mes données disparaissent de l'appareil quand je me déconnecte afin de protéger mes clients.
- **AP-US-051** (AP-BUG-001) — En tant qu'apiculteur, je veux qu'aucune saisie faite sans réseau ne soit perdue afin de faire confiance à l'application au rucher.
- **AP-US-057** (AP-BUG-004) — En tant qu'apiculteur, je veux que supprimer une ruche libère l'espace de ses photos afin de ne pas atteindre le quota.
- **AP-US-085** (AP-BUG-005) — En tant que membre invité, je veux enregistrer mes réglages sans effacer ceux d'un autre afin de travailler à plusieurs.
- **AP-US-098** (AP-BUG-007) — En tant qu'apiculteur, je veux que mes factures portent l'adresse du client afin de les remettre à un professionnel.
- **AP-US-123** (AP-FEAT-036) — En tant qu'apiculteur, je veux comprendre une erreur et savoir quoi faire afin de ne pas rester bloqué.
- **AP-US-126** (AP-BUG-006) — En tant qu'apiculteur, je veux voir le nom de mon exploitation partout afin de ne pas être troublé.

## 5. Tâches techniques

- AP-TECH-035 (AP-BUG-002) — Lecture paginée par range pour visites, visite_intrants, vente_lignes, ruche_evenements.
- AP-TECH-036 (AP-BUG-002) — Alerte dans journal_erreurs si une page pleine n'est pas suivie.
- AP-TECH-037 (AP-BUG-002) — Test e2e avec mock à plafond.
- AP-TECH-087 (AP-BUG-003) — Fonction purgerLocal().
- AP-TECH-088 (AP-BUG-003) — Avertissement si HL.nb() > 0.
- AP-TECH-089 (AP-BUG-003) — Test e2e.
- AP-TECH-155 (AP-BUG-001) — Statut « quarantaine » dans la file.
- AP-TECH-156 (AP-BUG-001) — Écran À corriger (liste, modifier, renvoyer, abandonner).
- AP-TECH-157 (AP-BUG-001) — Pastille sur le bandeau.
- AP-TECH-158 (AP-BUG-001) — Scénario e2e.
- AP-TECH-175 (AP-BUG-004) — PH.oterRuche() avant suppression.
- AP-TECH-176 (AP-BUG-004) — Requête de recensement des orphelins (lecture).
- AP-TECH-177 (AP-BUG-004) — Nettoyage définitif en IT-11.
- AP-TECH-250 (AP-BUG-005) — Fonction regler(cle, valeur) (jsonb_set).
- AP-TECH-251 (AP-BUG-005) — Fonction ajouter_stock(article, q).
- AP-TECH-252 (AP-BUG-005) — Remplacer les appels.
- AP-TECH-283 (AP-BUG-007) — Colonnes clients.adresse, code_postal, ville.
- AP-TECH-284 (AP-BUG-007) — Formulaire client.
- AP-TECH-285 (AP-BUG-007) — Facture.
- AP-TECH-348 (AP-FEAT-036) — Dictionnaire code → message.
- AP-TECH-349 (AP-FEAT-036) — Message par défaut sobre.
- AP-TECH-350 (AP-FEAT-036) — Détail vers journal_erreurs.
- AP-TECH-357 (AP-BUG-006) — Défaut = nom de exploitations.
- AP-TECH-358 (AP-BUG-006) — Test.

## 6. Fichiers et modules potentiellement concernés

- `offline.js`
- `photos.js`
- `app.js`
- `essentiels.js`
- `exploitations.js`
- `migrations/012-correctifs.sql`
- `tests/etapes_*.txt`

## 7. Évolutions SQL nécessaires

Migration 012 (additive) : adresse et champs pro de base sur clients, fonction de nettoyage des fichiers orphelins (lecture), réglage par clé `regler()`.

## 8. Dépendances

- Itérations préalables : IT-00.
- Fonctionnalités prérequises : AP-FEAT-004.

## 9. Risques

- Purge à la déconnexion qui efface une file non envoyée.
- Quarantaine qui bloque l'envoi des saisies suivantes.

## 10. Plan de tests

- Nouveau scénario : renvoi refusé par le serveur → quarantaine visible.
- Scénario : déconnexion avec et sans saisies en attente.
- Scénario : plus de 1 000 visites simulées.
- AP-BUG-002 : e2e avec 1 500 visites simulées.
- AP-BUG-003 : Scénario e2e déconnexion.
- AP-BUG-001 : e2e : renvoi refusé.
- AP-BUG-004 : e2e suppression ruche.
- AP-BUG-005 : Test SQL de deux mises à jour simultanées.
- AP-BUG-007 : e2e facture.
- AP-FEAT-036 : Unitaires sur les codes connus.
- AP-BUG-006 : e2e nouveau compte.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Tous les AP-BUG de l'itération fermés.
- Tests existants et nouveaux verts.
- Migration 012 appliquée sur apidoo-test.

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
- Migration `migrations/012-….sql` relançable, appliquée sur apidoo-test, inscrite dans `a-appliquer-en-production.txt`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Revert du code ; migration 012 additive laissée en place (sans effet sur l'ancienne version).

## 16. Éléments à préserver

- Idempotence de creer_visite / creer_vente
- Interface v5

## 17. Hors périmètre

- Refonte de la file hors ligne (IT-09)
- Modèle de données colonies

## 18. Itération suivante

[IT-02 — Réalignement de la production et sauvegardes](ITERATION_02.md)
