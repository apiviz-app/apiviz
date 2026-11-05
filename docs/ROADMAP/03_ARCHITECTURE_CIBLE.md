# 03 — Architecture cible

Principe : **garder la pile, changer la structure.** Aucune migration technologique globale n'est proposée ; chaque évolution répond à un risque de l'audit (R-xx) ou à un besoin du backlog.

## 1. Pile retenue

| Couche | Aujourd'hui | Cible | Pourquoi |
|---|---|---|---|
| Frontend | JS sans framework, scripts globaux chargés dans l'ordre | JS sans framework, **modules ES natifs** (`<script type="module">`), noyau d'écrans enregistrés | Supprime la dépendance à l'ordre et les surcharges (R-04) sans étape de compilation |
| Styles | `index.html` (96 Ko, 35 couches) | `styles/` : jetons, composants, écrans ; une règle par composant | Fin des redéfinitions en cascade |
| Données | `loadAll()` complet + `refresh()` après chaque écriture | **couche d'accès** par domaine, chargement ciblé et paginé, mise à jour locale après écriture | R-03, performance |
| Base | Postgres Supabase, RLS par exploitation | idem + **fonctions métier transactionnelles** pour toute opération multi-tables, clés composites d'exploitation | R-11, R-13 |
| Hors ligne | file des créations, IndexedDB | **file d'opérations** idempotentes (création, modification, suppression), quarantaine, conflits | R-02 |
| Serveur | aucun | **Edge Functions Supabase** pour : notifications push, assistant IA, nettoyage, sauvegardes | Besoins qui exigent un secret ou une exécution planifiée |
| Hébergement | GitHub Pages | GitHub Pages (inchangé) | 0 €, suffisant |
| Tests | Playwright + base simulée | + **tests unitaires** (`node --test`) + **tests SQL/RLS** sur Postgres local en CI | R-07 |
| Supervision | `console.error` | table `journal_erreurs` alimentée par le client + tableau simple | Voir les erreurs des utilisateurs |

### Alternatives écartées

| Alternative | Pour | Contre | Décision |
|---|---|---|---|
| Réécriture en framework (React, Svelte, Expo) | écosystème, composants | réécriture de ≈ 600 Ko, arrêt des livraisons plusieurs mois, perte des 18 tests | **Écartée.** Réévaluer seulement si le noyau ne suffit pas |
| Étape de compilation (Vite, esbuild) | typage, minification, imports | complexité de déploiement, deux codes (source et produit) | **Reportée.** Les modules ES natifs suffisent ; à réexaminer à > 1 Mo de JS |
| Backend applicatif dédié (Node) | logique serveur riche | coût, sécurité à gérer, doublon avec RLS | **Écartée.** Fonctions SQL + Edge Functions |
| Synchronisation type CRDT / base locale complète (PowerSync, RxDB) | hors ligne total | dépendance lourde, coût, refonte du modèle | **Écartée pour l'instant.** File d'opérations suffisante pour l'usage terrain |

## 2. Organisation du code cible

```text
/index.html                 coquille : <div id="app">, styles, <script type="module" src="./src/main.js">
/src/
  main.js                   démarrage : session, exploitation, routeur
  noyau/
    routeur.js              table des écrans { id, titre, rubrique, rendu, actions }
    etat.js                 état global unique (session, exploitation, données en mémoire)
    actions.js              registre d'actions par écran (remplace l'objet ACT partagé)
    composants.js           shell, feuille, tableau, kpi, alvéoles, états vides (une implémentation)
    format.js               esc, dates, nombres, euros (fonctions pures, testées)
  donnees/
    client.js               supabase-js, en-tête x-exploitation
    acces.js                lire(table, filtres, pagination), ecrire(op) via la file
    file.js                 file d'opérations hors ligne, quarantaine, conflits
    cache.js                IndexedDB unique (données, file, photos), purge à la déconnexion
  domaines/
    ruchers/  colonies/  visites/  sante/  nourrissement/  elevage/  production/
    materiel/  finances/  ventes/  agenda/  meteo/  registre/  assistant/  compte/
      ecrans.js             enregistrement des écrans du domaine
      regles.js             règles métier pures (testées unitairement)
      requetes.js           accès aux données du domaine
/styles/  jetons.css  composants.css  ecrans/*.css
/sw.js                      liste générée des fichiers à garder
/migrations/                inchangé
/supabase/functions/        Edge Functions
/tests/  e2e/ (existant)  unitaires/  sql/
```

## 3. Stratégie de transition (motif « étrangleur »)

Le noyau cohabite avec l'existant ; chaque domaine bascule seul ; les 18 tests de bout en bout restent verts à chaque étape.

| Étape | Ce qui change | Ce qui est conservé | Retour arrière |
|---|---|---|---|
| T0 | Source lisible de `app.js` (dé-minifiée ou retrouvée) versionnée | comportement identique, tests verts | revert du commit |
| T1 | `src/noyau/` créé ; `render()` final délègue à la table des écrans **si** l'écran y est enregistré, sinon à l'ancien chemin | tous les modules actuels | désenregistrer l'écran |
| T2 | Écran par écran : l'implémentation **effective** (la dernière surcharge) est déplacée dans `src/domaines/…`, les versions recouvertes sont supprimées | URLs, actions, textes | revert par écran |
| T3 | Quand un module n'a plus d'écran actif, il est supprimé de `index.html` et de `sw.js` | — | revert |
| T4 | Couche données : `loadAll` remplacé domaine par domaine par des lectures ciblées | file hors ligne | drapeau de repli sur `loadAll` |
| T5 | Styles : extraction par composant au fil des écrans migrés | rendu visuel identique (captures de référence) | revert |

Ordre conseillé : compte et navigation → accueil → ruchers/colonies → visites/tournée → miel/ventes → gestion. Les modules les plus récents (`tournee.js`, `essentiels.js`, `demarrage.js`) sont déjà proches de la cible et migrent en dernier.

## 4. Données et performance

- **Chargement initial léger** : exploitation, ruchers, colonies, tâches ouvertes, dernière visite de chaque colonie (vue SQL `colonies_resume`), réglages.
- **Chargement à la demande** : journal complet d'une colonie, ventes d'une année, registre d'une année, paginés (`range`).
- **Agrégats côté base** : vues ou fonctions pour stocks, bilans annuels, rendements (évite de calculer sur toutes les lignes dans le navigateur).
- **Après écriture** : la fonction SQL renvoie la ligne écrite ; la vue locale est mise à jour sans tout relire.
- **Garde-fou** : toute lecture vérifie si le plafond de lignes est atteint et l'enregistre dans `journal_erreurs`.

## 5. Base de données

- **Une fonction SQL par opération métier multi-tables** (`creer_visite`, `creer_vente`, `diviser_colonie`, `enregistrer_traitement`, `deplacer_colonies`, `mettre_en_lots`…), `security invoker` (la RLS s'applique), idempotentes par identifiant fourni par le client.
- **Intégrité multi-exploitation** : contrôle `exploitation_id` dans chaque fonction puis clés étrangères composites `(exploitation_id, id)` sur les nouvelles tables.
- **Historisation** : tables d'événements append-only pour le biologique ; colonnes `cree_par`, `created_at`, `modifie_le` partout ; journal d'audit des suppressions.
- **Migrations** : uniquement additives par défaut ; une migration non rétrocompatible est livrée avec la version d'app correspondante (modèle de la 008) et annoncée dans le CHANGELOG.

## 6. Hors ligne et synchronisation

| Élément | Cible |
|---|---|
| Opérations en file | création, modification et suppression de visites, ventes, récoltes, dépenses, tâches, opérations sanitaires et de nourrissement, événements |
| Identifiants | générés par le téléphone (UUID) : renvoi sans doublon |
| Ordre | file ordonnée par exploitation ; une opération qui dépend d'une autre (visite d'une colonie créée hors ligne) attend la première |
| Échec non réseau | l'opération passe en **quarantaine** (écran « À corriger ») : modifier, renvoyer ou abandonner explicitement. Jamais supprimée sans action |
| Conflits | modifications : contrôle de version (`modifie_le` attendu) ; si différent, choix présenté (garder la mienne / la leur) |
| Données en cache | par exploitation, purgées à la déconnexion (après confirmation si la file n'est pas vide) |
| Photos | même file, envoi après la visite parente |
| Service worker | liste des fichiers générée depuis `index.html` (évite l'oubli d'un module), version horodatée |

## 7. Services serveur (Edge Functions)

| Fonction | Rôle | Itération |
|---|---|---|
| `notifier` | push Web (VAPID) des rappels du jour, planifiée | IT-15 |
| `nettoyer-stockage` | supprime les fichiers sans fiche | IT-11 |
| `assistant` | appelle le modèle de langage avec les outils de lecture de l'utilisateur (son JWT, donc sa RLS) | IT-24 |
| `exporter` | export complet (JSON + CSV + photos) d'une exploitation | IT-26 |
| `facturation` | webhooks du prestataire de paiement | IT-27 |

Secrets uniquement dans Supabase (jamais dans le dépôt public).

## 8. Sécurité

- RLS sur toutes les tables, testée automatiquement (doc 09).
- Rôles : `responsable`, `membre`, `saisonnier` (tournées et visites seulement), `lecteur`. Droits portés par des fonctions `peut(action)` utilisées dans les politiques.
- Invitations : rôle choisi, nombre d'usages, expiration, révocation.
- Factures émises immuables (déclencheur), corrections par avoir.
- Purge locale à la déconnexion ; mention des services tiers (dictée, cartes, météo).

## 9. Déploiement et environnements

Conservé (doc 10) : recette `apidoo-test` puis production `apidoo`, mise en ligne manuelle, contrôle des migrations en attente. Ajouts : tests SQL en CI, sauvegarde automatique chiffrée avant migration, application des migrations par la CLI Supabase depuis la mise en ligne (comme Gladoo) une fois les tests SQL en place.

## 10. Supervision

- `journal_erreurs` (date, version, écran, message, exploitation hachée) alimenté par `window.onerror` et `fail()`.
- Écran « Santé de l'application » réservé au responsable technique : erreurs récentes, file d'envoi moyenne, espace photos, volumétrie.
- Contrôle de santé du workflow de mise en ligne conservé.
