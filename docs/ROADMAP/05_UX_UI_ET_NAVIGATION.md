# 05 — UX/UI et navigation

Point de départ : l'interface **Alvéoles v5** (recette). Elle est récente, cohérente et appréciée ; on la **stabilise et on l'étend**, on ne la refait pas.

## 1. Principes

Inspiration Linear, Stripe, Qonto, Pennylane : peu d'éléments, hiérarchie nette, action principale évidente, détail dévoilé à la demande. Traduction pour Apidoo :

1. **Une action principale par écran**, en bas sur téléphone (pouce), en haut à droite sur ordinateur.
2. **Résumé, puis détail.** Fiches en trois niveaux : bandeau d'état, onglets, journal.
3. **Pas de tableau sur téléphone** : listes de cartes ; tableaux réservés à l'ordinateur et aux exports.
4. **Formulaires courts** : valeurs de la dernière fois, gros segments plutôt que listes, « Plus de détails » replié.
5. **États vides qui font avancer** (déjà en place) et **erreurs en français**, avec l'action pour s'en sortir.
6. **Un seul ton : le tutoiement** (déjà dominant, chaleureux, cohérent avec API). Le vouvoiement reste pour les documents émis (factures, registre).
7. **Couleurs de la charte** inchangées (miel, pin, vert, alerte) ; jetons CSS centralisés.

## 2. Arborescence cible

```text
Accueil
 ├─ Priorité du jour · Ce mois-ci · Mes ruchers (alvéoles, météo) · À faire · Activité
Ruchers
 ├─ Liste / Carte / Santé
 ├─ Fiche rucher : colonies · météo 5 j · tâches · historique · infos (accès, propriétaire)
 └─ Fiche colonie : en-tête (état, reine, force, dernière visite)
       onglets Journal · Santé · Reine & lignée · Production · Photos
Miel
 ├─ Ventes (à encaisser, à livrer) · Clients · Stock de pots
 └─ Production : récoltes · extractions · lots · étiquettes
Gestion
 ├─ Agenda & tâches · Opérations (traitements, nourrissements) · Élevage*
 ├─ Registre & déclaration · Dépenses & budget · Matériel · Fournisseurs
 └─ Bilan & statistiques · Exploitation & membres · Réglages
API (bouton central) : rechercher · saisir (visite, tournée, récolte, vente, dépense, tâche, opération) · demander à API
Compte (avatar) : exploitations · installer · plein soleil · aide · se déconnecter
* visible au niveau Professionnel ou après activation
```

**Arborescence gelée depuis IT-03 (6 nov. 2026)** : toute modification passe par la roadmap (`docs/PROCESSUS.md`, règles de contenu). État en v5.17 : Registre et déclaration ont leur entrée dans Gestion (bloc et lien « ‹ Gestion ») ; Opérations est réservée, l'écran n'existe pas encore (hors périmètre d'IT-03).

Changement par rapport à la v5 : **Opérations** et **Registre** obtiennent une entrée stable dans Gestion (aujourd'hui sous Ruchers › Santé selon la version) ; la fiche ruche devient **fiche colonie** avec deux onglets nouveaux (Santé, Reine & lignée).

## 3. Écrans principaux

| Écran | Objectif | Contenu clé | Action principale |
|---|---|---|---|
| Accueil | savoir quoi faire maintenant | phrase du jour, alertes classées, ruchers, tâches | Faire la tournée |
| Fiche rucher | état d'un lieu | colonies en alvéoles, météo, créneau, accès | Visiter ce rucher |
| Fiche colonie | tout sur une colonie | état, reine, force, varroa, poids, journal | Nouvelle visite |
| Visite rapide | noter en < 2 min | ce qui a changé depuis la dernière fois | Enregistrer / Suivante |
| Tournée | enchaîner un rucher | ordre par priorité, 3 modes, vérification | Ruche suivante |
| Opération | traiter / nourrir N colonies | colonies cochées, produit, quantité, dates | Enregistrer l'opération |
| Registre | être en règle | traitements, mouvements, interventions de l'année | Exporter / Imprimer |
| Lot | traçabilité | récolte → extraction → lot → ventes | Imprimer les étiquettes |
| Vente | vendre vite | client récent, pots, paiement | Enregistrer |
| Bilan | comprendre la saison | production, coûts, marge, comparaisons | Exporter |

## 4. Parcours terrain (mobile)

**Scanner → fiche → visite → suivante**
1. Bouton API › « Scanner » (ou appareil photo du téléphone sur le QR, qui ouvre `…/?c=CODE`).
2. Fiche colonie ouverte en mode terrain (plein soleil si réglé).
3. « Visite » : écran unique pré-rempli ; on touche seulement ce qui change ; micro disponible ; photo en un geste.
4. « Enregistrer et suivante » propose la colonie voisine du même rucher.
5. Hors ligne : bandeau discret « gardé sur le téléphone », aucun blocage.

Contraintes : cibles ≥ 48 px, contraste AA en plein soleil, aucune saisie clavier obligatoire, aucun geste fin (glisser) indispensable.

## 5. Composants communs (un seul exemplaire chacun)

`Coquille` (barres, bandeaux hors ligne et recette) · `Feuille` (fenêtre du bas, brouillon, Échap, clic à côté) · `Segments` · `Pas à pas` (− / +) · `Alvéole` et `Carte d'alvéoles` · `Carte de liste` · `Tableau` (ordinateur) · `Chiffre clé` · `Graphique` (barres, courbe, avec table « Voir les chiffres ») · `État vide` · `Toast` avec « Annuler » · `Puce d'état` · `Sélecteur de colonies` (par rucher, tout cocher) · `Sélecteur de date relative` (Aujourd'hui, Hier…) · `Bloc` (Gestion).

## 6. Responsive

| Largeur | Navigation | Mise en page |
|---|---|---|
| < 800 px | barre du bas (Accueil, Ruchers, API, Miel, Gestion) | une colonne, feuilles du bas |
| 800–1200 px | barre du haut | deux colonnes |
| > 1200 px | barre du haut | trois colonnes (tournée, accueil), tableaux |

## 7. Améliorations de l'existant (sans refonte)

| Constat (audit §5) | Amélioration | Backlog |
|---|---|---|
| Tu/vous mélangés | charte de ton + relecture de tous les textes | AP-FEAT-112 |
| Navigation changée souvent, aide obsolète | geler l'arborescence §2, mettre à jour `GUIDE.md` et l'aide intégrée | AP-FEAT-113 |
| Registre/varroa difficiles à trouver | entrées stables dans Gestion | AP-FEAT-113 |
| Visite complète longue | visite rapide pré-remplie | AP-FEAT-037 |
| Erreurs brutes | table de traduction des erreurs Postgres/Auth | AP-FEAT-036 |
| Plusieurs chemins pour la même action | une seule fonction « ouvrir la visite » appelée partout | AP-FEAT-002 |

## 8. Migration progressive de l'interface

L'interface migre **avec** le noyau (doc 03, §3) : à chaque écran migré, captures de référence avant/après (tests de bout en bout existants + captures `v4/*.png` du test), relecture du ton, suppression des styles devenus inutiles. Aucune « grande refonte » : 8 à 10 écrans par itération technique.
