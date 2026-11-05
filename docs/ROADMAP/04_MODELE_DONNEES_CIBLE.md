# 04 — Modèle de données cible

Règle : **faire évoluer la base existante, sans la recréer.** Toutes les tables reçoivent `exploitation_id` (déjà le cas depuis 008) et la RLS `exploitation_courante()`.

## 1. Arbitrage central : que devient la table `ruches` ?

| Option | Description | Pour | Contre |
|---|---|---|---|
| A (retenue) | `ruches` **devient la colonie** (vue `colonies` en alias). Nouvelles tables `ruchers`, `contenants` (ruches physiques), `reines`, `colonie_emplacements`, `colonie_liens` | visites, récoltes, photos, tâches, événements gardent leur clé `ruche_id` ; migration additive ; ancienne app compatible | le nom de table ne dit plus ce qu'elle contient (documenté, vue d'alias) |
| B | Nouvelle table `colonies`, migration de toutes les clés étrangères | modèle « propre » | migration destructive de 6 tables, casse la v5, hors ligne en cours à purger |
| C | Garder tel quel | aucun effort | bloque santé, élevage, généalogie, transhumance |

**Fenêtre d'opportunité.** La production ne contient que 6 ruches et aucune visite (relevé du 5 nov. 2026) : les migrations des itérations 05 à 07 ne reprennent presque aucune donnée réelle. Il est recommandé de les réaliser **avant** l'arrivée de nouveaux utilisateurs. Même dans ce contexte, l'option A reste préférable : le coût principal de l'option B est dans le code (21 modules qui utilisent `ruche_id`), pas dans les données.

**Pourquoi la colonie et pas la ruche physique ?** Dans l'usage réel actuel, ce qu'on visite, traite, récolte et nomme « Ruche 3 » est la colonie : une division crée déjà une nouvelle ligne. Les contenants sont nouveaux et facultatifs (niveau Professionnel).

## 2. Schéma cible (vue logique)

```text
exploitations ─┬─ membres (rôle)        invitations
               ├─ ruchers ─────────────┐
               │                       │ emplacement actuel / historique
               ├─ colonies (= ruches) ─┼── colonie_emplacements (rucher, du, au, motif)
               │    │  │  │            └── deplacements (transhumance : N colonies, date, origine, destination)
               │    │  │  └── colonie_contenants (contenant, du, au)  ── contenants (ruche physique, QR)
               │    │  └──── reines (historique : de, jusqu'à, statut) ── lignees ── serie_elevage
               │    └─────── colonie_liens (parent, enfant, type : division, essaim, réunion)
               │    ├── visites ── visite_intrants, visite_photos, visite_observations (jsonb)
               │    ├── ruche_evenements (journal biologique)
               │    └── operation_colonies ── operations (traitement, nourrissement, comptage varroa)
               ├─ recoltes ── recolte_colonies ── extractions ── lots ── vente_lignes ── ventes ── factures
               ├─ articles ── mouvements_stock
               ├─ clients, fournisseurs, depenses (+ pieces_jointes), budgets
               ├─ taches (récurrence), notifications, documents
               └─ reglages, journal_audit, journal_erreurs
```

## 3. Entités

Champs indicatifs ; types exacts à fixer dans la migration de l'itération concernée.

### 3.1 `ruchers` (nouvelle, IT-05)
- **Rôle :** emplacement physique où sont posées des colonies.
- **Champs :** `id`, `nom` (unique par exploitation), `lat`, `lng`, `adresse`, `commune`, `altitude`, `acces` (texte), `proprietaire`, `contact`, `capacite`, `environnement` (liste : forêt, bocage, cultures, ville…), `ressources` (texte), `point_eau` (bool), `notes`, `actif`, `created_at`.
- **Règles :** un rucher inactif n'accepte pas de nouvelle colonie ; suppression interdite s'il a un historique (on l'archive).
- **Migration :** une ligne par valeur distincte de `ruches.rucher` ; `lat/lng` = moyenne des ruches placées (calcul actuel de `meteo.js`) ; ajout de `ruches.rucher_id`. Le texte `ruches.rucher` est maintenu par déclencheur tant que l'ancienne app existe.

### 3.2 `ruches` → colonie (évolution)
- **Rôle :** colonie biologique.
- **Nouveaux champs :** `rucher_id`, `code` (court, pour QR et oral), `origine` (achat, essaim capturé, division, élevage), `date_creation`, `statut` (`active`, `orpheline`, `morte`, `reunie`, `vendue`, `perdue`) — remplace progressivement `sortie`, `force` (1–5, dernière observée), `douceur`, `tenue_cadre`, `essaimage` (notes 1–5, facultatives).
- **Champs conservés :** `nom`, `etat` (signal court terme), `hausses`, `equipement`, `notes`.
- **Champs migrés vers `reines` :** `annee_reine`, `reine_origine`, `reine_introduite` (gardés en lecture le temps de la transition).
- **Règles :** une colonie a au plus un emplacement ouvert et au plus une reine « en place » ; une colonie `morte`/`reunie` est en lecture seule pour les visites.

### 3.3 `colonie_emplacements` (nouvelle, IT-06)
- **Champs :** `colonie_id`, `rucher_id`, `du`, `au` (null = actuel), `deplacement_id`.
- **Règles :** pas de chevauchement (contrainte d'exclusion sur la période) ; toute modification de `rucher_id` passe par `deplacer_colonies()`.

### 3.4 `deplacements` (nouvelle, IT-06)
- **Rôle :** mouvement d'un lot de colonies (transhumance) — remplace l'événement `deplacement` de 010 pour le registre.
- **Champs :** `date`, `rucher_origine_id`, `rucher_destination_id`, `motif` (transhumance, hivernage, vente…), `nb_colonies`, `notes`.

### 3.5 `contenants` et `colonie_contenants` (nouvelles, IT-06)
- **Rôle :** ruche physique (corps), avec son QR code.
- **Champs :** `code_qr` (unique), `type` (Dadant 10, Langstroth, ruchette…), `etat`, `achat_le`, `article_id` (lien matériel), `notes` ; historique `colonie_id`, `du`, `au`.
- **Règles :** un contenant accueille au plus une colonie à la fois ; facultatif (niveau Professionnel). Sans contenant, le QR désigne la colonie.

### 3.6 `reines` (nouvelle, IT-07)
- **Champs :** `colonie_id`, `annee_naissance`, `marquage` (couleur déduite de l'année, modifiable), `origine` (élevée, achetée, naturelle, essaim), `lignee_id`, `mere_id` (reine), `serie_id`, `fournisseur_id`, `en_place_du`, `en_place_au`, `statut` (`en_place`, `remplacee`, `morte`, `disparue`, `vendue`), `clippee`, `notes`.
- **Règles :** remplacement = clôture de la reine en place + nouvelle ligne, dans `changer_reine()` ; l'historique n'est jamais réécrit.
- **Migration :** une reine par colonie ayant `annee_reine` renseignée, `en_place_du = reine_introduite` ou `date_installation`.

### 3.7 `colonie_liens` (nouvelle, IT-07 / IT-16)
- **Champs :** `parent_id`, `enfant_id`, `type` (`division`, `essaim`, `reunion`), `date`, `evenement_id`.
- **Règles :** réunion = deux parents vers une colonie conservée, l'autre passe au statut `reunie` ; pas de cycle.
- **Migration :** depuis `ruche_evenements.autre_ruche_id` pour les types division/essaimage/réunion.

### 3.8 `ruche_evenements` (évolution)
- Conservé comme **journal biologique append-only** : type, date, détail, auteur ; ajout de `donnees jsonb` pour les détails structurés et `operation_id`.

### 3.9 `visites` (évolution, IT-08)
- **Conservé :** colonnes actuelles (activité, provisions, reine, couvain, poids, note, intrants, état).
- **Ajouts :** `force` (1–5), `cellules_royales` (aucune, présentes, opercules), `oeufs_vus`, `comportement` (calme, nerveuse, agressive), `cadres_couvain`, `cadres_abeilles`, `meteo jsonb` (température, vent, pluie au moment de la visite, source), `duree_s`, `modele_id`, `observations jsonb` (champs des modèles personnalisés), `modifie_le`.
- **Déplacés vers les opérations (lecture conservée) :** `varroa*`, `traitement*`, `lot_produit`, `retrait_prevu`, `ordonnance`. `creer_visite` continue de les accepter et crée l'opération correspondante (compatibilité).

### 3.10 `modeles_visite` (nouvelle, IT-08)
- **Champs :** `nom`, `champs jsonb` (liste ordonnée : clé, libellé, type, valeurs), `par_defaut`.
- **Règles :** les champs standard restent des colonnes ; seuls les champs ajoutés vont dans `observations`.

### 3.11 `operations` et `operation_colonies` (nouvelles, IT-12 à IT-14)
- **Rôle :** action datée sur une ou plusieurs colonies : `comptage_varroa`, `traitement`, `nourrissement`, `intervention` (vétérinaire).
- **Champs communs :** `type`, `date_debut`, `date_fin`, `rucher_id`, `auteur`, `notes`, `visite_id` (si saisie dans une visite).
- **Traitement :** `produit_id` (catalogue), `substance_active`, `numero_amm`, `numero_lot`, `posologie` (texte saisi), `voie`, `ordonnance` (bool + pièce jointe), `veterinaire`, `fin_prevue`, `retrait_le`, `resultat`.
- **Comptage varroa (par colonie, dans `operation_colonies`) :** `methode` (sucre glace, lavage alcool, chute naturelle, autre), `abeilles`, `varroas`, `jours` (chute naturelle), taux calculé.
- **Nourrissement :** `aliment` (article), `quantite_par_colonie`, `objectif` (stimulation, réserves, survie).
- **Règles :** stock décrémenté par mouvement ; dépense facultative ; traitement visible au registre de l'année de `date_debut`.

### 3.12 `produits_sanitaires` (nouvelle, IT-13)
- **Rôle :** catalogue de référence des médicaments vétérinaires apicoles **avec source et date de mise à jour**, enrichi par l'utilisateur. Aucune posologie pré-remplie sans source officielle citée.

### 3.13 Élevage (nouvelles, IT-17) : `lignees`, `series_elevage`, `serie_etapes`
- `lignees` : nom, origine, reine souche, notes.
- `series_elevage` : date de greffage, reine mère, méthode, nb greffés, nb acceptés, nb nées, nb fécondées, nb introduites.
- `serie_etapes` : étape, date prévue (calculée depuis le greffage, délais paramétrables), date réelle, résultat → génère les tâches.

### 3.14 Production (évolution + nouvelles, IT-18)
- `recoltes` : + `rucher_id`, `miellee`, `poids_brut`, `tare` ; `recolte_colonies` (colonie, hausses, estimation kg) facultative.
- `extractions` (nouvelle) : `code` (reprend la colonne texte `extraction`), date, miel, kg extraits, humidité, maturateur, filtration, pertes ; lien N-N récoltes ↔ extraction.
- `lots` : + `extraction_id` (le texte `extraction` reste pour l'historique), `kg_conditionnes`, `pertes`.
- Fonction `mettre_en_lots()` : vérifie que le conditionné ne dépasse pas l'extrait.

### 3.15 Stocks (nouvelle, IT-19) : `mouvements_stock`
- `article_id`, `date`, `type` (entrée, consommation, ajustement, inventaire, rebut), `quantite` signée, `origine` (dépense, visite, opération), `localisation`.
- **Règle :** `articles.stock` = somme des mouvements, maintenue par déclencheur ; plus aucune écriture directe du stock par le client (corrige R-16).

### 3.16 Commercial (évolution, IT-21)
- `clients` : + `type` (particulier, professionnel), `raison_sociale`, `siret`, `adresse`, `code_postal`, `ville`, `tva_intra`.
- `produits` (nouvelle) : produit vendable hors lot de miel (cire, pollen, essaim, prestation), prix, TVA.
- `ventes` : + `commande` (statut à préparer, à livrer, livrée), `remise`.
- `factures` (nouvelle) : numéro, date, client figé (copie des coordonnées), lignes figées, totaux, statut (`emise`, `annulee_par_avoir`) ; `avoirs` liés. Déclencheur d'immuabilité.
- `paiements` (nouvelle) : vente, date, montant, mode (paiements partiels).

### 3.17 Finances (évolution, IT-20)
- `depenses` : + `rucher_id` (ventilation), `piece_jointe` (stockage privé).
- Vues `couts_annuels`, `rendements_annuels`.

### 3.18 Tâches et notifications (évolution, IT-15)
- `taches` : + `recurrence` (règle simple : tous les N jours/semaines/mois, mois de l'année), `priorite`, `assigne_email`, `origine` (manuelle, traitement, élevage, déclaration), `origine_id`.
- `abonnements_push` (nouvelle) : endpoint, clés, appareil, email.

### 3.19 Transversal
- `documents` (IT-26) : type, titre, fichier, lié à (colonie, rucher, opération, dépense).
- `journal_audit` (IT-04) : table, id, action, avant (jsonb), auteur, date — rempli par déclencheur sur suppression et modification des données sensibles.
- `journal_erreurs` (IT-03).
- `reglages` : écriture par clé via `regler(cle, valeur)` (corrige R-16).

## 4. Historisation : règles

| Situation | Comportement |
|---|---|
| Colonie change de rucher | ligne `colonie_emplacements` fermée et nouvelle ouverte ; visites antérieures gardent leur lien colonie, et leur rucher se lit à la date |
| Colonie change de contenant | idem `colonie_contenants` ; l'historique de la colonie ne bouge pas |
| Division | nouvelle colonie + `colonie_liens(parent, enfant, 'division')` + événements dans les deux journaux, en une transaction |
| Réunion | colonie absorbée au statut `reunie` + lien + événement ; ses visites restent consultables |
| Changement de reine | reine en place clôturée, nouvelle ligne |
| Traitement | `operation_colonies` fige la liste des colonies concernées à la date |
| Correction d'une erreur | autorisée sur les champs d'une visite (avec `modifie_le` et journal) ; jamais suppression silencieuse d'un événement biologique |

## 5. Compatibilité et ordre des migrations

| Migration | Itération | Contenu | Casse l'ancienne app ? |
|---|---|---|---|
| 012 | IT-01 | correctifs (adresse client, `regler()`, `ajouter_stock()`) | non |
| 013 | IT-03 | `journal_erreurs`, vue `colonies_resume` | non |
| 014 | IT-04 | rôle lecteur, invitations limitées, `journal_audit`, contrôle d'exploitation dans `creer_*` | non |
| 015 | IT-05 | `ruchers`, `ruches.rucher_id` + déclencheur de synchronisation du texte | non |
| 016 | IT-06 | emplacements, déplacements, contenants, statut de colonie | non |
| 017 | IT-07 | reines, liens de colonies, reprise des données | non |
| 018 | IT-08 | champs de visite, modèles | non |
| 019 | IT-09 | `modifie_le`, fonctions de modification hors ligne | non |
| 020 à 034 | IT-11 à IT-27 | photos rattachées, opérations, élevage, extractions, mouvements, factures, abonnements… (numéro indiqué dans chaque fiche d'itération) | non, sauf mention dans la fiche |

Les numéros sont indicatifs : la migration prend le premier numéro libre au moment de sa réalisation, et la fiche d'itération est corrigée en conséquence.

Chaque migration : relançable, testée sur `apidoo-test` puis sur une copie de la structure en CI.
