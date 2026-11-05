# 01 — Audit de l'existant

> Réalisé le 5 novembre 2026 sur `main` au commit `554f98f` (fusion de la PR #12, 4 nov. 2026).
> Méthode : lecture de tout le dépôt (21 fichiers JS, `index.html`, `schema.sql`, 10 migrations, 18 scénarios de tests, 3 workflows, 6 documents), exécution de la suite de tests en local.
> **Relevé des bases :** structure, fonctions et volumétrie de `apidoo` (production) et `apidoo-test` (recette) relevées **en lecture seule** le 5 nov. 2026 (aucune donnée personnelle lue, aucune écriture).
> **Limites :** aucun test sur un vrai téléphone ; réglages Auth et plafond de lignes non lisibles par SQL. Ce qui n'a pas pu être vérifié est marqué **À VÉRIFIER**.

---

## 1. Synthèse

Apidoo est bien plus avancé qu'un MVP : c'est une PWA réellement utilisée (données réelles en production), qui couvre déjà le terrain (visites, tournée, voix, photos, hors ligne), le miel (récoltes, lots, ventes, factures simples), la gestion (dépenses, budget, matériel, fournisseurs), le registre d'élevage et le multi-exploitation (en recette). La méthode de travail (branches, recette, mise en ligne manuelle, garde-fous de configuration, tests automatiques) est saine et rare pour un projet de cette taille.

Ses faiblesses sont structurelles, pas fonctionnelles :

1. **Architecture par empilement.** 18 modules « remplacent des écrans de `app.js` sans le modifier » : `render()` est enveloppé 7 fois, `shell()` 5 fois, `viewDash()` 4 fois. L'ordre de chargement des scripts est devenu une dépendance cachée. Chaque nouvelle fonction ajoute une couche.
2. **Le cœur (`app.js`) est un fichier minifié**, sans source lisible dans le dépôt.
3. **Le modèle de données confond ruche, colonie et emplacement** : le rucher est un texte libre sur la ruche, la reine est une colonne de la ruche, une division crée une nouvelle « ruche ». C'est le principal frein aux modules sanitaire, élevage, généalogie et traçabilité.
4. **Le chargement charge tout, tout le temps** : 15 tables lues intégralement à l'ouverture et après chaque écriture.
5. **La documentation d'état est fausse et la production incomplète.** D'après le relevé, la production tourne déjà la v5.14 (étiquette `deploiement` = `554f98f`, comme la recette) sur une base où 008 est appliquée — alors que `migrations/README.md` et le CHANGELOG disent le contraire. En revanche **010 n'est appliquée sur aucune des deux bases** : déplacements, interventions et factures, visibles dans l'app, échouent. 011 n'est appliquée nulle part.

Bonne nouvelle : la production ne contient presque rien (1 exploitation, 2 membres, 6 ruches, aucune visite, vente ni photo). **C'est le meilleur moment pour faire évoluer le modèle de données** : les migrations de la phase 1 ne reprendront presque aucune donnée réelle.

Rien n'impose de réécrire l'application. Tout se corrige progressivement.

---

## 2. Cartographie technique vérifiée

### 2.1 Organisation

| Élément | Contenu vérifié |
|---|---|
| Hébergement | GitHub Pages, assemblé par `scripts/assembler-site.sh` : production à la racine, recette sous `/recette/` |
| Données | Supabase (Postgres, Auth, Storage), un projet par environnement |
| Frontend | JavaScript sans framework ni étape de compilation, 21 fichiers, ≈ 635 Ko de JS + `index.html` de 96 Ko (styles inclus) |
| Bibliothèques | `supabase-js` 2.45.4 (CDN jsDelivr), Leaflet 1.9.4 (carte), polices Google |
| API externes | Open-Meteo (météo), Nominatim/OpenStreetMap (adresses, tuiles), Web Speech API du navigateur (dictée) |
| PWA | `manifest.webmanifest`, `sw.js` (coquille en cache, réseau d'abord avec repli à 4 s) |
| Hors ligne | `offline.js` : IndexedDB `apidoo-hors-ligne`, file d'attente des créations |
| Tests | 18 scénarios Playwright de bout en bout sur une base Supabase **simulée** (`tests/test_hl.py` + `etapes_*.txt`) |
| CI/CD | `verifier.yml` (tests sur PR et `main`), `mise-en-ligne.yml` (manuel, recette puis production, garde-fous), `reveil-supabase.yml` (ping quotidien) |
| Documentation | `CLAUDE.md`, `README.md`, `docs/` (CHANGELOG, GUIDE, MOBILE, PROCESSUS, TECHNIQUE), `migrations/README.md` |

### 2.2 Ordre de chargement des modules (dépendance critique)

`config.js` → `app.js` → `photos.js` (PH) → `registre.js` (RG) → `rappels.js` (RP) → `visites-groupees.js` (VR) → `etiquettes.js` (ET) → `exploitations.js` (EX) → `ux.js` (UX) → `offline.js` (HL) → `v3.js` (V3) → `nav4.js` (N4) → `meteo.js` (MT) → `api-compagnon.js` → `alveoles.js` (AL) → `voix.js` (VX) → `ergonomie.js` (ER) → `essentiels.js` (ES) → `tournee.js` (TN) → `demarrage.js`.

Fonctions de `app.js` redéfinies par les modules (relevé `grep`) :

| Fonction | Redéfinie par |
|---|---|
| `render` | rappels, ux, v3, nav4, alveoles, ergonomie, essentiels (7) |
| `shell` | v3, nav4, alveoles, ergonomie, essentiels (5) |
| `viewDash` | ux (via ACT), alveoles, demarrage (+ app) |
| `viewRuches` | v3, nav4, alveoles |
| `viewMiel` | nav4, essentiels |
| `viewVente` | v3, alveoles |
| `loadAll` | offline, v3 |
| `viewPlus` | nav4, ergonomie |
| `ACT` (actions) | ≈ 180 actions ajoutées par 15 modules dans un même objet global |

### 2.3 Base de données

> **Mise à jour du 6 nov. 2026 (IT-00).** 010 et 011 ont été appliquées le 5 nov. sur les deux bases. Relevé complet en lecture seule dans `migrations/README.md` : structure identique sur `apidoo` et `apidoo-test`, et identique à 000 + migrations rejouées (009 avant 008), sauf `creer_visite` et `creer_vente` en retard sur la recette (AP-BUG-008). Le tableau ci-dessous est l'état constaté le 5 nov. avant ces applications.

Tables après la migration 011 : `exploitations`, `membres`, `membres_v1` (ancienne liste), `invitations`, `ruches`, `ruche_evenements`, `visites`, `visite_intrants`, `visite_photos`, `recoltes`, `lots` (+ vue `lots_stock`), `clients`, `ventes`, `vente_lignes`, `depenses`, `fournisseurs`, `articles`, `taches`, `budgets`, `reglages`.

Fonctions : `creer_visite`, `creer_vente` (atomiques, idempotentes par identifiant fourni), `numeroter_facture`, `creer_exploitation`, `mes_exploitations`, `rejoindre`, `invitation_info`, `exploitation_courante`, `est_membre(uuid)`, `est_responsable(uuid)`, `peut_photo`, `photos_espace`, `ping`. Déclencheurs de stock : `maj_stock_intrant`, `maj_stock_achat`.

État des migrations : documenté dans le dépôt, puis **relevé réel du 5 nov. 2026** :

| Migration | Selon `migrations/README.md` | Relevé `apidoo` (production) | Relevé `apidoo-test` (recette) |
|---|---|---|---|
| 004 à 007, 009 | appliquées | présentes | présentes |
| 008 exploitations | « production : après validation » | **présente** (tables `exploitations`, `membres_v1`, `exploitation_id` sur 19 colonnes) | présente |
| 010 registre, factures | à appliquer | **absente** (pas de colonnes `facture_*`, types d'événements sans `deplacement`/`intervention`) | **absente** |
| 011 invitation | à appliquer | absente (`invitation_info` non exécutable par `anon`) | absente |

Version publiée : l'étiquette `deploiement` et l'étiquette `recette` pointent toutes deux sur `554f98f` (v5.14) ; `sw.js` en ligne : `apidoo-2026-11-04-v5-decouverte`.

Volumétrie de la production : 1 exploitation, 2 membres, 6 ruches, 0 visite, 0 vente, 0 photo, 0 invitation. Aucun fichier orphelin.

---

## 3. Inventaire fonctionnel

Légende des colonnes : **Code** (présent dans le code), **Données** (modèle SQL), **Parcours** (écran utilisable de bout en bout), **Testé** (scénario automatique existant ; « mock » = base simulée, sans RLS ni SQL réel). Aucun parcours n'a été testé sur téléphone dans le cadre de cet audit.

| Domaine | Fonctionnalité | Code | Données | Parcours | Testé | Statut |
|---|---|---|---|---|---|---|
| Comptes | Inscription, connexion, mot de passe oublié | oui | Auth | oui | mock | EXISTANT ET COHÉRENT |
| Comptes | Plusieurs exploitations, rôles responsable/membre | oui | 008 | oui | mock (ex) | EXISTANT MAIS À AMÉLIORER (2 rôles) |
| Comptes | Invitations par lien | oui | 008, 011 | oui | mock | EXISTANT MAIS À AMÉLIORER (lien réutilisable 14 jours) |
| Prise en main | Présentation, rucher en 3 questions, rucher d'exemple, astuces | oui | — | oui | mock (in) | EXISTANT ET COHÉRENT (recette) |
| Ruchers | Regroupement de ruches par rucher | oui | texte `ruches.rucher` | oui | mock | PARTIEL : pas d'entité rucher |
| Ruchers | Carte, placement, itinéraire | oui | `ruches.lat/lng` | oui | mock | PARTIEL : position portée par la ruche, moyenne par rucher |
| Ruchers | Fiche rucher (5 jours météo, tâches, ruches) | oui | — | oui | mock | EXISTANT MAIS À AMÉLIORER |
| Ruches | Création en lot, fiche, ruche voisine, alvéoles | oui | `ruches` | oui | mock | EXISTANT ET COHÉRENT |
| Colonie | Reine (année, origine, introduction), hausses, équipement | oui | colonnes de `ruches` | oui | mock (v3) | PARTIEL : pas d'historique de reines |
| Colonie | Division, essaimage, réunion, sortie, réactivation | oui | `ruche_evenements` | oui | mock (v3) | PARTIEL : écritures non atomiques, filiation en texte |
| Colonie | Distinction ruche physique / colonie | non | non | non | — | NON IMPLÉMENTÉ |
| Visites | Visite détaillée (activité, provisions, reine, couvain, poids, varroa, note, intrants, état) | oui | `visites` | oui | mock | EXISTANT ET COHÉRENT |
| Visites | Visite de plusieurs ruches | oui | — | oui | mock (vr) | EXISTANT MAIS À AMÉLIORER |
| Visites | Tournée en parcours (libre, questions, manuel, vérification) | oui | — | oui | mock (tn) | EXISTANT ET COHÉRENT (recette) |
| Visites | Visite à la voix (Web Speech API) | oui | — | oui | mock (vx) | À VÉRIFIER sur iPhone/Android réels |
| Visites | Photos (réduction, file d'envoi, visionneuse, quota) | oui | 004, 008 | oui | — | À VÉRIFIER (HEIC, appareil photo réel) |
| Visites | Modèles de visite, champs personnalisés, cellules royales, comportement | non | non | non | — | NON IMPLÉMENTÉ |
| Hors ligne | Ouverture sans réseau, données gardées | oui | — | oui | mock (hl) | EXISTANT MAIS À AMÉLIORER |
| Hors ligne | File d'envoi des créations (visites, ventes, récoltes, dépenses, tâches) | oui | 006 | oui | mock (hl) | EXISTANT MAIS À AMÉLIORER (voir R-02) |
| Hors ligne | Modifications et suppressions sans réseau | non | — | refus explicite | — | NON IMPLÉMENTÉ |
| Santé | Comptage varroa (méthode, abeilles prélevées, taux), seuil réglable, courbe | oui | 009 | oui | mock | PARTIEL : seuil par défaut 3 % sans source ni période |
| Santé | Traitement noté dans la visite (produit, lot, dose, fin prévue, ordonnance) | oui | 007 | oui | mock (rg) | PARTIEL : un traitement = une visite d'une ruche |
| Santé | Maladies, symptômes, mortalité structurée | non | non | non | — | NON IMPLÉMENTÉ |
| Nourrissement | Intrants consommés à la visite, décompte du stock | oui | `visite_intrants` + déclencheur | oui | mock | PARTIEL : pas d'opération dédiée ni de coût |
| Élevage | Élevage de reines | non | non | non | — | NON IMPLÉMENTÉ |
| Production | Récolte (kg, hausses, humidité, miel, code d'extraction) | oui | 009 | oui | mock | EXISTANT MAIS À AMÉLIORER |
| Production | Lots de pots, DDM, stock calculé, fiche de lot (récolte → ventes) | oui | `lots`, `lots_stock` | oui | mock (es) | EXISTANT MAIS À AMÉLIORER (traçabilité par code texte) |
| Production | Étiquettes de pots (planche A4) | oui | — | oui | mock (et) | EXISTANT ET COHÉRENT, mentions À VÉRIFIER |
| Ventes | Clients, cercles, ventes, à encaisser, à livrer, relance, reçu | oui | oui | oui | mock | EXISTANT ET COHÉRENT |
| Ventes | Factures numérotées, impression PDF | oui | 010 **absente des bases** | échoue | mock (es) | PARTIEL : migration manquante, pas d'adresse client, numéro modifiable, pas d'avoir |
| Finances | Dépenses, postes, fournisseurs, budget, bilan, simulateur, trésorerie | oui | oui | oui | mock | EXISTANT ET COHÉRENT |
| Finances | Coût par rucher, par colonie, justificatifs | non | non | non | — | NON IMPLÉMENTÉ |
| Matériel | Consommables, équipements, seuils, entrées de stock | oui | `articles` | oui | mock | PARTIEL : pas de journal de mouvements, pas de localisation |
| Calendrier | Tâches, agenda, idées de saison, export .ics | oui | `taches` | oui | mock (rp) | PARTIEL : pas de récurrence ni de vue calendrier |
| Rappels | Pastille d'icône, écran Rappels, notifications quand l'app est ouverte | oui | — | oui | mock (rp) | PARTIEL : pas de notification serveur |
| Météo | Météo par rucher, 5 jours, heure par heure, meilleur créneau | oui | — | oui | mock | EXISTANT ET COHÉRENT (seuils documentés dans TECHNIQUE.md) |
| Réglementation | Registre d'élevage (traitements, mouvements, interventions), PDF, export Excel | oui | 007, 010 **absente** | mouvements et interventions échouent | mock (rg) | PARTIEL, conformité À VÉRIFIER |
| Réglementation | Aide à la déclaration annuelle | oui | — | oui | mock | EXISTANT ET COHÉRENT |
| Pilotage | Accueil « priorité du jour », lentilles, activité récente, recherche Ctrl K | oui | — | oui | mock | EXISTANT ET COHÉRENT |
| Assistant | Compagnon API (animation, ouvre recherche et saisies) | oui | — | oui | mock | PARTIEL : aucune intelligence artificielle (annoncé « Bientôt ») |
| Exports | CSV visites, ventes, dépenses, clients ; sauvegarde JSON | oui | — | oui | — | EXISTANT ET COHÉRENT |
| Interface | Navigation v4 (`nav4.js`), recouverte par la v5 | oui | — | partiel | mock (n4) | OBSOLÈTE |

---

## 4. Analyse technique

### 4.1 Architecture

- **Empilement de surcharges.** Chaque version a été livrée comme un fichier qui capture la fonction précédente (`const renderAvant = window.render`) et la remplace. Effets : comportement d'un écran réparti dans 3 à 5 fichiers, impossibilité de supprimer un module ancien sans casser les suivants, code mort probable (écrans de `app.js` et de `ux.js` entièrement recouverts). `ux.js` (« version 2 de l'interface ») et `nav4.js` (« version 4 ») contiennent des écrans déjà remplacés par `alveoles.js`.
- **État global partagé** : `S`, `ACT`, `TABLES`, `ICON`, `GROUP` sont modifiés par tous les modules.
- **Code minifié** : `app.js` comptait 172 lignes dont 10 de plus de 2 000 caractères. Toute correction dans le cœur était risquée et illisible en revue. *Résolu par IT-00 (6 nov. 2026) : source lisible reconstituée, comportement vérifié identique.*
- **Styles en couches** : 35 sections commentées dans `index.html`, 32 blocs `@media`, chaque version redéfinissant les règles précédentes.
- **Doublons** : deux appels Open-Meteo (`ux.js` et `meteo.js`), deux implémentations d'IndexedDB (`photos.js` et `offline.js`), deux générateurs d'UUID.

### 4.2 Données et performance

- `loadAll()` lit **toutes les lignes de 15 tables** à l'ouverture, puis `refresh()` relit tout **après chaque écriture**.
- **Limite de lignes de l'API** : Supabase plafonne par défaut chaque réponse REST (paramètre « Max rows », 1 000 par défaut). Aucune requête n'est paginée. Au-delà, les visites les plus anciennes disparaîtraient silencieusement des écrans et des calculs (registre, rendements). Valeur réelle relevée le 6 nov. 2026 : **1 000 sur les deux projets** ; plus grosse table : 8 lignes.
- Calculs côté navigateur (stocks, finances, tableaux) sur l'ensemble des données : acceptable à 10 ruches, lent à 300.

### 4.3 Cohérence SQL / JavaScript

- `schema.sql` était **obsolète** (MVP : catégories de dépenses figées, formats 250/500 g seulement) et contredisait la base réelle ; seul `000-structure-au-3-nov-2026.sql` est fidèle. *Résolu par IT-00 : `schema.sql` renvoie vers 000 + migrations.*
- Numérotation inversée : 008 doit être lancée **après** 009 (elle référence `ruche_evenements`).
- `migrations/README.md` et `a-appliquer-en-production.txt` divergeaient (011 absente de la liste d'attente). *Résolu : plus aucune migration en attente, état daté par base dans `migrations/README.md`.*
- La facture lit `client.adresse`, qui n'existe pas dans la table `clients`.
- `reglages` est un document JSON réécrit en entier (lecture, fusion, écriture) : deux membres qui enregistrent en même temps s'écrasent.
- Entrée de stock (`ACT.entree`) : nouveau stock calculé dans le navigateur (`stock + q`) puis écrit — perte de mise à jour possible à plusieurs.
- Division, essaimage, réunion : 2 à 4 écritures successives sans transaction ; une coupure au milieu laisse un état partiel.

### 4.4 Sécurité

- **Isolation par exploitation (008)** : bonne base (RLS sur `exploitation_id = exploitation_courante()`, en-tête vérifié contre l'appartenance). Faiblesse : les clés étrangères ne portent pas l'exploitation. Un membre connaissant l'UUID d'une ruche d'une autre exploitation peut y rattacher une visite (les contrôles de clé étrangère ignorent la RLS). Risque faible (UUID non devinables) mais intégrité non garantie.
- **Invitations** : lien réutilisable sans limite pendant 14 jours, non révocable depuis l'app (suppression possible en base), rôle unique « membre » avec tous les droits d'écriture et de suppression.
- **Factures** : `facture_num` modifiable et vente supprimable après facturation (trou de numérotation possible).
- **Déconnexion** : `signOut()` seul. Les données de l'exploitation (clients, téléphones, ventes) restent dans IndexedDB et `localStorage` du navigateur. Problème sur un appareil partagé.
- **Photos** : supprimer une ruche supprime en cascade visites et fiches photo, mais pas les fichiers du stockage (fichiers orphelins, quota consommé).
- **Dictée** : sur Chrome, la reconnaissance vocale passe par les serveurs de Google ; l'utilisateur n'en est pas informé.
- **Points sains** : clés publiques seulement dans le dépôt, garde-fou d'assemblage empêchant de croiser les bases, `security definer` limité et `search_path` fixé, `esc()` systématique dans les gabarits observés.

### 4.5 Hors ligne

- Seules les **créations** passent par la file ; modifications et suppressions sont refusées sans réseau (message clair).
- **Perte de données (R-02)** : au renvoi, si le serveur répond par une erreur qui n'est pas réseau (stock insuffisant après des ventes faites ailleurs, contrainte, droits), la saisie est **retirée de la file** avec un simple message toast. Elle est perdue.
- Les saisies d'une autre exploitation attendent que cette exploitation soit rouverte, sans signal visible.
- Pas de stratégie de conflit (dernier écrit gagne sur les mises à jour en ligne).

### 4.6 Tests et qualité

- **Vérifié le 5 nov. 2026 : les 18 tests passent** (`sh tests/lancer.sh`, site assemblé, Chrome sans interface).
- Ils couvrent bien les parcours, mais sur une base simulée : **ni le SQL, ni la RLS, ni les fonctions `creer_*` ne sont testés**. Une régression de règle d'accès passerait la CI.
- Aucun test unitaire (le code n'est pas découpé en fonctions importables).
- Aucune remontée d'erreurs de production (seulement `console.error`).

### 4.7 Exploitation et coûts

- Offre gratuite Supabase : 1 Go de fichiers (≈ 4 000 photos), mise en pause après 7 jours (évitée par le ping), **pas de sauvegarde automatique** (`docs/MOBILE.md`).
- Open-Meteo et Nominatim ont des conditions d'usage pour un service commercial : **à vérifier avant toute offre payante**.

---

## 5. Analyse UX/UI

**Forces.** Parcours terrain soignés (tournée guidée, voix, gros boutons, mode plein soleil), états vides utiles, annulation après suppression, brouillons, recherche Ctrl K, accessibilité travaillée (`aria-*`, `prefers-reduced-motion`), identité visuelle forte (alvéoles, compagnon API), textes simples.

**Faiblesses constatées.**

| Constat | Impact |
|---|---|
| Navigation changée 4 fois en 5 jours (v2, v4, v5.2, v5.8) ; production et recette n'ont plus la même structure | Désorientation à la bascule ; aide (`GUIDE.md`) décrit la v4 |
| Mélange du « vous » (≈ 70 occurrences) et du « tu » (≈ 85) | Ton incohérent d'un écran à l'autre |
| Plusieurs entrées pour la même action (bouton +, API, accueil, fiche ruche, tournée) | Bonne découvrabilité mais comportements légèrement différents selon l'entrée |
| Registre, Déclaration, Varroa rangés sous Ruchers › Santé ou Gestion selon la version | Fonctions réglementaires difficiles à trouver |
| Formulaire de visite complet long (toutes sections) ; pas de champs pré-remplis depuis la visite précédente | Contraire à l'objectif « visite en moins de 2 minutes » hors tournée guidée |
| Messages d'erreur serveur affichés bruts dans certains cas (`fail()` renvoie `e.message`) | Messages techniques en anglais possibles |
| Notifications uniquement quand l'app est ouverte | Les rappels ne rappellent pas |

Pas de refonte esthétique recommandée : l'identité « Alvéoles » est récente et cohérente. Le besoin est de **consolider** (une navigation, un ton, une seule implémentation par écran).

---

## 6. Registre des risques

| ID | Criticité | Fichier / module | Problème | Impact | Correction recommandée | Backlog |
|---|---|---|---|---|---|---|
| R-01 | **Bloquante** | `migrations/010`, `mise-en-ligne.yml` | v5.14 publiée en production sans la migration 010 ; documentation d'état inverse de la réalité | Déplacements, interventions, factures échouent en production ; décisions prises sur une documentation fausse | Appliquer 010 (puis 011, 012) ; contrôle automatique de structure avant mise en ligne | AP-FEAT-005, AP-FEAT-004 |
| R-02 | **Élevée** | `offline.js` `envoyer()` | Saisie retirée de la file sur erreur non réseau | Perte de visites ou de ventes faites au rucher | File de quarantaine visible, correction et renvoi manuels | AP-BUG-001 |
| R-03 | **Élevée** | `app.js` `loadAll()` | Aucune pagination, limite de lignes de l'API | Données anciennes absentes sans message au-delà du plafond (pas encore de volume en production : à corriger avant qu'il n'arrive) | Pagination ou chargement ciblé, alerte si plafond atteint | AP-BUG-002 |
| R-04 | **Élevée** | 21 modules | Surcharges en chaîne de `render`, `shell`, vues | Chaque évolution risque une régression ailleurs | Noyau d'écrans enregistrés, migration module par module | AP-FEAT-002 |
| R-05 | **Élevée** | `app.js` | Source minifiée | Corrections du cœur impossibles à relire | Retrouver ou reconstituer la source lisible | AP-FEAT-001 |
| R-06 | **Élevée** | Modèle `ruches` | Ruche, colonie, emplacement et reine confondus | Bloque santé par colonie, élevage, généalogie, transhumance | Entités `ruchers`, colonies, contenants, reines (doc 04) | AP-EPIC-005, 007 à 009 |
| R-07 | **Élevée** | Tests | RLS et SQL jamais testés | Fuite ou blocage de données non détecté | Tests SQL sur base Postgres locale en CI | AP-FEAT-008 |
| R-08 | **Élevée** | Exploitation | Pas de sauvegarde automatique (offre gratuite) ni des photos | Perte définitive en cas d'erreur de migration | Sauvegarde chiffrée programmée hors dépôt public, procédure de restauration testée | AP-FEAT-006 |
| R-09 | Moyenne | `offline.js`, déconnexion | Données personnelles gardées après déconnexion | Fuite sur appareil partagé (RGPD) | Purge IndexedDB/localStorage à la déconnexion, avertissement si saisies en attente | AP-BUG-003 |
| R-10 | Moyenne | `essentiels.js`, 010 | Facture sans adresse client, numéro modifiable, vente facturée supprimable | Factures non conformes pour les clients professionnels | Champs client, verrouillage après émission, avoirs | AP-BUG-007, AP-FEAT-086 |
| R-11 | Moyenne | 008 | Clés étrangères sans exploitation | Intégrité entre exploitations non garantie par la base | Contrôle dans les fonctions `creer_*` puis clés composites | AP-FEAT-009 |
| R-12 | Moyenne | 008 | Invitation réutilisable, rôle unique tout-puissant | Accès non maîtrisé, suppression par un invité | Invitations à usage limité et révocables, rôle « lecteur » | AP-FEAT-010, 011 |
| R-13 | Moyenne | `v3.js` | Opérations de vie de colonie non atomiques | États partiels | Fonctions SQL transactionnelles | AP-FEAT-061 |
| R-14 | Moyenne | `photos.js`, cascade | Fichiers orphelins après suppression d'une ruche | Quota de 1 Go consommé | Nettoyage par fonction serveur et à la suppression | AP-BUG-004 |
| R-15 | Moyenne | `ux.js` | Seuil varroa par défaut 3 % sans source ni période | Conseil sanitaire implicite non sourcé | Seuils par méthode et période, source affichée, réglable | AP-FEAT-052 |
| R-16 | Moyenne | `reglages`, `ACT.entree` | Écritures lecture-fusion-écriture côté client | Réglages ou stocks écrasés à plusieurs | Mise à jour par clé côté SQL, mouvements de stock | AP-BUG-005 |
| R-17 | Faible | `schema.sql`, `migrations/README.md` | Documents de base obsolètes ou divergents | Recréation d'une base fausse | Remplacer `schema.sql` par un renvoi à 000 + migrations | AP-FEAT-003 |
| R-18 | Faible | `voix.js` | Envoi de l'audio à un tiers non signalé | Information RGPD manquante | Mention à la première utilisation | AP-FEAT-021 |
| R-19 | Faible | `app.js` `DEF` | Nom par défaut « Bee's Brothers » codé en dur | S'affiche chez un nouvel utilisateur si le réglage manque | Défaut neutre | AP-BUG-006 |
| R-20 | Faible | Textes | Tutoiement et vouvoiement mélangés | Image moins professionnelle | Charte de ton unique | AP-FEAT-112 |
| R-21 | Moyenne | base `apidoo-test`, 009 | `creer_visite` et `creer_vente` de la recette ne contiennent pas la section 6 de 009 (relevé IT-00) | Méthode varroa et livraison ignorées en recette : vérifications faussées | Relancer 009 sur `apidoo-test` ; comparer les empreintes des fonctions avant mise en ligne | AP-BUG-008 |

---

## 7. Forces à préserver absolument

1. Le **circuit recette → validation → production** et ses garde-fous (`assembler-site.sh`, contrôle des migrations en attente, version exacte de recette).
2. Les **créations atomiques et idempotentes** `creer_visite` / `creer_vente` (base du hors ligne).
3. La **tournée en parcours** (libre, questions, manuel, vérification avant enregistrement).
4. Les **18 scénarios de bout en bout** : ils deviennent le filet de non-régression de toute refonte interne.
5. L'**identité Alvéoles** et le compagnon API.
6. La simplicité d'hébergement (0 € aujourd'hui) et l'absence d'étape de compilation.
7. L'isolation par exploitation de la migration 008 (à compléter, pas à refaire).

---

## 8. Éléments non analysés ou à vérifier

| Élément | Pourquoi | Comment vérifier |
|---|---|---|
| ~~Politiques RLS détaillées sur les bases réelles~~ | Fait le 6 nov. 2026 (IT-00) | `migrations/README.md` |
| ~~Plafond « Max rows » des deux projets~~ | Fait le 6 nov. 2026 : 1 000 sur les deux | `migrations/README.md` |
| ~~Inscriptions ouvertes ou restreintes~~ | Fait le 6 nov. 2026 : ouvertes sur les deux projets | `migrations/README.md`, points de vigilance |
| Fonctionnement sur iPhone/Android (voix, HEIC, installation, notifications) | Pas d'appareil | Rubriques « À vérifier » du CHANGELOG |
| ~~Origine de `app.js` minifié~~ | D-01 (6 nov. 2026) : source d'origine introuvable, reconstituée en IT-00 | En-tête de `app.js` |
| Mentions obligatoires des étiquettes et factures | Réglementaire | Sources officielles (doc 15 / module O) |
