# 02 — Cartographie fonctionnelle cible

Couverture des modules A à P du cahier des charges, et modules transversaux. Pour chaque module : périmètre cible, existant, écarts. Les identifiants renvoient au backlog (`06_BACKLOG_MASTER.md`, source de vérité).

## 1. Vue d'ensemble

```text
                 ┌──────────────────────── PILOTAGE ────────────────────────┐
                 │  A Tableau de bord · P Assistant API · Statistiques       │
                 └───────────────▲──────────────────────────▲───────────────┘
                                 │ lit                      │ lit
┌──────────── TERRAIN ───────────┴──┐      ┌──────────── EXPLOITATION ────┴──────────┐
│ B Ruchers  C Colonies/Reines       │      │ I Récoltes/Lots  J Matériel/Stocks        │
│ D Visites  E Santé  F Nourrissement│─────▶│ K Finances       L Clients/Ventes         │
│ G Multiplication  H Élevage        │ alim.│                                           │
└──────────────▲─────────────────────┘      └──────────────────▲────────────────────────┘
               │                                               │
┌──────────────┴───────────── TRANSVERSAL ──────────────────────┴──────────────────────┐
│ M Calendrier/Tâches · N Météo · O Réglementation/Documents · Comptes/Rôles · Hors ligne│
│ Recherche · Notifications · Photos/Voix/QR · Exports · Abonnement                      │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Relations clés :**
- Une **visite** alimente : état de la colonie (C), comptage varroa (E), nourrissement (F), consommation de stock (J), tâches proposées (M), registre (O).
- Une **opération sanitaire ou de nourrissement** porte sur plusieurs colonies à une date ; elle consomme du stock (J) et peut créer une dépense (K).
- Une **récolte** est faite sur des colonies ou un rucher (C, B), produit une **extraction**, qui produit des **lots** (I), vendus (L) : la chaîne de traçabilité.
- Les **événements biologiques** (G, H) créent ou ferment des colonies et des liens de filiation.

## 2. Modules

### A — Tableau de bord
- **Cible :** priorité du jour, alertes (sanitaire, provisions, stocks, échéances), chiffres de l'année, comparaison à l'année précédente, raccourcis, composition selon le niveau d'usage.
- **Existant :** accueil v5 (phrase du jour, alvéoles, lentilles, météo par rucher, Ce mois-ci, Bien démarrer). Solide.
- **Écarts :** personnalisation, comparaison temporelle, indicateurs colonies (mortes, à remplacer), alertes calculées côté serveur. → AP-EPIC-040, 041.

### B — Ruchers
- **Cible :** entité rucher (nom, position, adresse, accès, propriétaire, capacité, environnement, ressources mellifères, photos, notes), carte globale, historique météo, déplacements et transhumances.
- **Existant :** texte `ruches.rucher` + position portée par chaque ruche ; carte et fiche rucher.
- **Écarts :** table `ruchers`, emplacements historisés, transhumance. → AP-EPIC-005, 006.

### C — Ruches, colonies, reines
- **Cible :** distinction rucher / contenant (ruche physique) / colonie / reine / événements ; fiche colonie complète ; QR code par contenant ; historique biologique ; statut (active, orpheline, morte, réunie, vendue).
- **Existant :** `ruches` porte tout (nom, rucher, reine, hausses, équipement, état, sortie) ; `ruche_evenements`.
- **Écarts :** modèle (doc 04), historique des reines, filiation, QR. → AP-EPIC-007, 008, 009.

### D — Visites
- **Cible :** visite en < 2 min, pré-remplie, modèles personnalisables, série de colonies, actions groupées, voix, photos, sauvegarde automatique, hors ligne, suggestions.
- **Existant :** très riche (formulaire complet, visite multiple, tournée guidée, voix, photos, hors ligne).
- **Écarts :** modèles et champs (force, cellules royales, comportement, essaimage), reprise de la visite précédente, brouillon persistant, hors ligne des modifications. → AP-EPIC-010 à 013.

### E — Santé, varroa, traitements
- **Cible :** comptages (méthode, résultat, taux), seuils sourcés par période et par méthode, opérations de traitement multi-colonies (produit, substance active, n° AMM, lot, dates, posologie saisie par l'utilisateur, ordonnance, résultat), maladies et observations sanitaires, alertes, registre.
- **Existant :** varroa dans la visite avec taux et seuil réglable ; traitement dans la visite ; registre.
- **Écarts :** tables dédiées, catalogue de produits sourcé, efficacité post-traitement, maladies. → AP-EPIC-014 à 016.

### F — Nourrissement
- **Cible :** opération sur plusieurs colonies (type, quantité par colonie, objectif), coût, décompte de stock, historique, consommation par saison.
- **Existant :** intrants de visite décomptés du stock.
- **Écarts :** opération groupée, coût, objectif, rapports. → AP-EPIC-017.

### G — Essaimage, division, multiplication
- **Cible :** division, essaim capturé, essaimage naturel, réunion, remérage, introduction, transfert, perte ; filiation conservée ; généalogie visuelle.
- **Existant :** division, essaimage, réunion, sortie, réactivation (v3), en écritures successives.
- **Écarts :** atomicité, liens parent/enfant structurés, arbre visuel. → AP-EPIC-018, 019.

### H — Élevage des reines
- **Cible :** souches et lignées, reproductrices, séries d'élevage (greffage, cellules, naissance, fécondation, ponte, marquage, introduction), calendrier calculé, statistiques de réussite.
- **Existant :** rien. → AP-EPIC-020, 021.

### I — Récoltes et production
- **Cible :** récolte (rucher, colonies contributrices si connues, hausses, poids), extraction (lot de miellerie), maturation, filtration, conditionnement en lots, pertes, rendements par année/rucher/miellée/type de miel, traçabilité ascendante et descendante.
- **Existant :** récolte + code d'extraction texte reliant récoltes et lots ; fiche de lot.
- **Écarts :** entité extraction, colonies contributrices, pertes, rendements. → AP-EPIC-022, 023.

### J — Matériel et stocks
- **Cible :** consommables et équipements, journal de mouvements (entrée, sortie, consommation, inventaire), localisation, état, entretien, mise au rebut, affectation ; stocks de produits finis séparés (lots).
- **Existant :** `articles` (type, stock, seuil, valeur, fournisseur), entrées de stock, déclencheurs.
- **Écarts :** mouvements, localisation, entretien, inventaire. → AP-EPIC-024, 025.

### K — Finances
- **Cible :** dépenses, recettes, budget, coûts par kg / rucher / colonie, marge, justificatifs, exports pour le comptable. Pas de comptabilité certifiée.
- **Existant :** dépenses, postes, budget, bilan, trésorerie, simulateur.
- **Écarts :** justificatifs (pièces jointes), ventilation par rucher, exports comptables. → AP-EPIC-026, 027.

### L — Clients et commercialisation
- **Cible :** clients particuliers et professionnels (adresse, SIRET client), catalogue produits et tarifs (dont remises), commandes, livraisons, ventes, factures conformes et verrouillées, avoirs, paiements partiels, historique, rattachement aux lots.
- **Existant :** clients, ventes par lot, encaissement, livraison, relance, reçu, facture numérotée.
- **Écarts :** clients pros, produits hors miel en pot, commandes, conformité facture. → AP-EPIC-028, 029.

### M — Calendrier et tâches
- **Cible :** vue calendrier et liste, tâches récurrentes, priorités, affectation à un membre, rappels réellement envoyés (notifications serveur), événements générés (fin de traitement, contrôle de ponte, déclaration).
- **Existant :** tâches, agenda, idées du mois, .ics, rappels quand l'app est ouverte.
- **Écarts :** récurrence, vue calendrier, notifications push, tâches générées. → AP-EPIC-030, 031.

### N — Météo et environnement
- **Cible :** météo par rucher (observée et prévue, distinguées), créneaux, alertes, historique des visites avec météo, floraisons et miellées saisies par l'utilisateur.
- **Existant :** météo par rucher, 5 jours, heure par heure, créneau (seuils documentés).
- **Écarts :** météo enregistrée dans la visite, historique, floraisons, conditions commerciales d'Open-Meteo. → AP-EPIC-032.

### O — Réglementation et documents
- **Cible :** déclaration annuelle (aide, rappel, historique), registre d'élevage, traçabilité des traitements, justificatifs, documents d'exploitation, échéances, cadre par pays.
- **Existant :** registre (traitements, mouvements, interventions), aide à la déclaration, exports.
- **Écarts :** sources datées, contenu conforme vérifié, coffre de documents, historique des déclarations. → AP-EPIC-033, 034.

### P — Assistant API
- **Cible :** questions en langage naturel sur ses données, synthèses, détection d'anomalies et de données manquantes, création de visite depuis une note vocale, préparation de tournée ; distinction faits / hypothèses / recommandations / manques ; aucune écriture sans validation.
- **Existant :** compagnon animé, ouvre recherche et saisies ; aucune IA.
- **Écarts :** tout le moteur. → AP-EPIC-042, 043.

## 3. Modules transversaux

| Module | Cible | Existant | Backlog |
|---|---|---|---|
| Comptes et exploitations | multi-exploitation, rôles (responsable, membre, lecteur, saisonnier), invitations maîtrisées, journal | 008 en recette, 2 rôles | AP-EPIC-003, 004 |
| Hors ligne et synchronisation | toutes les saisies terrain, conflits, quarantaine, état visible | créations seulement | AP-EPIC-012 |
| Recherche, navigation, aide | une navigation stable, recherche globale, aide contextuelle, ton unique | v5 riche | AP-EPIC-044, 045 |
| Documents et photos | photos par colonie/rucher/lot, pièces jointes, quota | photos de visite | AP-EPIC-013, 034 |
| Notifications | push serveur, préférences | locales | AP-EPIC-031 |
| Sécurité et RGPD | purge, export, suppression de compte, mentions | partiel | AP-EPIC-004 |
| SaaS | plans, limites, abonnement, portail | non | AP-EPIC-046, 047 |

## 4. Parcours utilisateurs critiques

| # | Parcours | Étapes cibles | Modules |
|---|---|---|---|
| P1 | Première visite d'un nouvel apiculteur | inscription → rucher en 3 questions → visite guidée → accueil | Comptes, B, D |
| P2 | Tournée de saison | accueil → « faire la tournée » → colonie par colonie (voix ou doigt) → vérification → bilan → tâches | D, M, E |
| P3 | Traiter un rucher contre le varroa | comptage → alerte → opération de traitement sur N colonies → fin de traitement rappelée → comptage de contrôle → registre | E, M, O, J |
| P4 | Diviser une colonie | fiche colonie → diviser → nouvelle colonie liée, contenant choisi, reine prévue → tâche « contrôle de ponte » | G, C, M |
| P5 | De la récolte à la vente | récolte → extraction → lots → étiquettes → vente → facture → encaissement | I, L, K |
| P6 | Bilan de fin de saison | tableau de bord → rendements, coûts, pertes → déclaration annuelle → export | A, K, O |
| P7 | Inviter un saisonnier | membres → invitation rôle « saisonnier » → accès aux tournées seulement | Comptes |
| P8 | Demander à API | « quelles colonies visiter cette semaine ? » → liste justifiée → « prépare la tournée » → validation | P, D |
