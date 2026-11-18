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
 ├─ Priorité du jour · Mes ruchers (alvéoles, météo) · À faire · Activité (détail : Activité récente)
Ruchers
 ├─ Liste / Carte / Santé (liste, alvéoles ou tableau ; seuil varroa dans ⋯)
 ├─ Fiche rucher : colonies · météo 5 j (détail : Météo heure par heure) · tâches · historique · infos
 ├─ Fiche colonie : en-tête, onglets Journal · Santé · Reine & lignée · Colonie · Photos ; bouton principal + « + »
 └─ Saisies (flux) : Visite (Express / Complète) · Tournée · Déplacer (écran, ou feuille après une sélection)
Produits (ex-Miel, v5.65)
 ├─ Ventes (vitrine des produits) · Clients · Commandes · Stock (Tes produits ; détail : Lot, Facture) · Récoltes
 └─ Saisies (flux) : Nouvelle vente (feuille « Pour qui ? ») · Récolte (2 étapes) · Mise en pots · Ajouter un produit
Agenda (tâches, visites, ventes, récoltes ; détail : Ce mois-ci)
Finances : onglets Bilan · Dépenses · Factures · Budget · Associés (détail : Facture)
Matériel : onglets Stock · Courses · Fournisseurs (Inventaire dans ⋯)
Registre et déclaration : onglets Registre · Déclaration
Réglages : onglets Réglages · Équipe (détails : Mon profil, Rappels et notifications, Synchronisation — v5.56, ouverte depuis le menu du compte et le bandeau hors ligne)
Cloche : feuille Rappels · Loupe : recherche plein écran · Avatar : exploitations, plein soleil, aide, déconnexion
API (bouton central) : rechercher · saisir (visite, tournée, récolte, vente, dépense, tâche)
Inscription (une fois, avant tout le reste) · Élevage* et Opérations : réservés
* visible au niveau Professionnel ou après activation
```

**v5.66 (18 nov. 2026)** : l'onglet « Stock et récoltes » de Produits se sépare en **Stock** et **Récoltes** (saison,
miel à mettre en pots, récoltes et productions, clients à prévenir) : point d'entrée de la production de miel. La
**Récolte** se saisit en deux étapes (ruches et poids, puis mise en pots) ; le client d'une **Nouvelle vente** se choisit
dans une feuille « Pour qui ? » avec recherche, et une vente peut se faire sans client. Pas de nouvelle rubrique. Décision
de Pierre-Louis (18 nov. 2026, maquettes « Ventes, clients et récolte » : « je valide la totalité »).

**v5.57 (17 nov. 2026)** : onglet **Commandes** dans Miel (entre Clients et Stock et récoltes) ; écran **Caisse du
marché** (niveau 2 sous Miel, ouvert depuis Miel › ⋯ et le bouton API) ; écran **Étiquettes QR** (niveau 2 sous
Ruchers, ouvert depuis Ruchers › ⋯). « Scanner une ruche » est une feuille (Ruchers › ⋯ et bouton API), comme la
feuille d'une ruche scannée. Pas de nouvelle rubrique. Décision de Pierre-Louis (17 nov. 2026, maquettes
« Nouveautés » 1 à 4 validées, « implémente la 1, 2, 3 et 4 »).

**v5.65 (18 nov. 2026)** : la rubrique **Miel devient Produits** (barre du bas, volet « Ruchers et produits », menu de
l'ordinateur), même place et mêmes onglets. Nouvel écran **Ajouter un produit** (flux de niveau 2 sous Produits, ouvert
depuis Stock et récoltes › Tes produits ; il sert aussi à modifier un produit qui n'est pas du miel). Pas de nouvelle
rubrique. Décision de Pierre-Louis (18 nov. 2026, maquettes « Produits de la ruche » : « l'application doit être
accessible au plus grand nombre et ne doit pas parler que de miel »).

**v5.62 (18 nov. 2026)** : écran **API** en deux temps, « Tes échanges » (historique, conseils à faire, recherche)
puis la conversation (zone pour écrire fixée en bas, qui s'agrandit au toucher) ; feuille d'API contextuelle sur une
ruche ; plus de balayage entre ruches (flèches seulement) ; agenda Semaine en liste sur téléphone (bande des 7 jours) ;
calendrier ouvert au toucher franc seulement.

**v5.61 (18 nov. 2026)** : écran **Fil de l'équipe** (niveau 1, Menu › Au quotidien) avec une zone d'écriture fixe
au-dessus de la barre du bas ; écran **Ma saison** (Menu › Ruchers et miel, rubrique Miel) ; onglet **Courbes** dans la
fiche d'une ruche, après Journal. Pas de nouvelle rubrique. Maquettes « Nouveautés » 5, 6 et 7 validées par
Pierre-Louis.

**v5.55 (17 nov. 2026)** : onglet **Factures** dans Finances, entre Dépenses et Budget, et son détail « Facture »
(retour « ‹ Factures »). Une facture = un achat (lignes d'un même `achat_id`), rangées par mois, avec le fichier de la
facture (photo ou PDF). Pas de nouvelle rubrique : Finances garde sa place. Décision de Pierre-Louis (17 nov. 2026,
« je dois pouvoir accéder aux factures passées dans une interface dédiée », maquettes validées, « implémente toutes
les modifications »).

**v5.44 (15 nov. 2026)** : **rationalisation des écrans**. Un sujet = un écran, avec des onglets ; chaque écran est
une **liste** (sujet, vues, onglets), une **fiche** (un objet) ou un **flux** (saisie pas à pas) ; le reste devient
une feuille du bas, une vue ou un onglet. Menu : 18 entrées → **8 sur ordinateur, 5 dans le volet du téléphone**
(Agenda, Finances, Matériel, Registre et déclaration, Réglages ; Accueil, Ruchers et Miel restent dans la barre du bas).
Finances réunit Bilan, Dépenses, Budget et Entre associés ; Matériel réunit Stock, Liste de courses et Fournisseurs ;
Registre et Déclaration ne font plus qu'un ; Équipe devient un onglet de Réglages. La cloche ouvre une feuille
« Rappels » (l'écran Rappels reste pour les réglages, sous Réglages). Une seule visite avec la bascule
**Express / Complète**. Déplacer des colonies sélectionnées ouvre une feuille. Les catégories « Au quotidien »,
« Ruchers », « Miel et ventes », « Administration », « Équipe et compte » disparaissent du volet. Aucune adresse
supprimée : les anciennes routes (`compta`, `courses`, `fournisseurs`, `declaration`, `membres`, `rappels`, `plus`…)
ouvrent le bon onglet ou le bon écran. Écarts avec les maquettes du 15 nov. : Carte et Santé restent des onglets de
Ruchers (déjà soulignés, conformes au gabarit) ; la fiche rucher garde sa mise en page, la météo détaillée reste un
écran de détail (« ‹ rucher »). Décision de Pierre-Louis (15 nov. 2026, « implémente la totalité de tes
recommandations », après l'audit du 14 nov. et les maquettes de rationalisation du 15).

**v5.38 (14 nov. 2026)** : écrans « opérationnels ». Pas de nouvelle rubrique. Nouveaux écrans rangés dans des
rubriques existantes : **Inventaire** et **Liste de courses** sous Administration › Matériel (ouverts depuis Matériel),
**Mon profil** sous Équipe et compte › Réglages (ligne « Toi »). Une **inscription** en deux étapes (nom, puis réponses
facultatives) s'affiche une seule fois avant le reste ; une personne sans exploitation enchaîne sur les trois questions
de création du rucher. Matériel, Clients (Miel › Clients) et Dépenses passent en tableau (bascule tableau / liste pour
Matériel et Clients, gardée sur l'appareil). Réglages en cinq groupes ; plus de « Listes » (postes, cercles, modes de
paiement) ni d'Opex / Capex à l'écran. Décision de Pierre-Louis (14 nov. 2026, maquettes du 13 et 14 nov. validées).

**v5.40 (14 nov. 2026)** : l'écran Ruches (Ruchers › Liste) passe à **une seule barre** et trois présentations,
**Liste** (par défaut sur téléphone), **Alvéoles** et **Tableau** (par défaut sur ordinateur). La liste et les alvéoles
sont rangées par rucher : l'en-tête du rucher reprend sa fiche, la tournée et la météo (une ligne). La bascule « Par
rucher / Tableau » disparaît ; l'affichage par rucher en grandes cartes ne reste que pour un compte sans colonie. Sur
téléphone, le titre et ses boutons passent dans un menu ⋯ de la rangée des onglets ; sélection par appui long. Même
route (`ruches`), pas de nouvelle rubrique. Décision de Pierre-Louis (14 nov. 2026, maquettes « Réagencement
mobile », pistes B et C) après le constat : 3 colonies visibles en tableau, 0 par rucher, sur un téléphone de 844 px.

**v5.37 (13 nov. 2026)** : l’écran Ruches (Ruchers › Liste) gagne une bascule **« Par rucher / Tableau »** : même
écran, même route (`ruches`), deux affichages ; pas de nouvelle rubrique ni de nouvel onglet. L'affichage Tableau liste
toutes les colonies actives avec recherche, filtres (rucher, état, reine, seuils d'alerte), tri, colonnes au choix,
synthèse, sélection pour une visite groupée ou un déplacement, fiche rapide, et une présentation en cartes ; sur
ordinateur, les filtres restent visibles à gauche et la fiche rapide s'ouvre à droite. Le choix d'affichage est gardé
sur l'appareil. Décision de Pierre-Louis (13 nov. 2026, maquettes « Affichage des ruches », pistes 5 et 6 validées).

**v5.32 (12 nov. 2026)** : « Gestion » disparaît des menus. Ses écrans sont rangés dans deux catégories aux noms
plus parlants, **Finances** et **Administration**, plus **Équipe et compte**. Sur ordinateur, menu latéral permanent par
catégorie (plus de barre du haut), sans compteur ni pastille ; la cloche cède la place à l'entrée « Rappels ». Sur
téléphone, la 5e touche devient « Menu » et ouvre un volet par la droite avec les mêmes catégories. « Entre associés »
devient un écran de Finances. L'écran en blocs (route `plus`) reste joignable par son adresse, hors des menus.
Décision de Pierre-Louis (12 nov. 2026, maquettes validées).

**v5.30 (11 nov. 2026)** : écran « Mise en pots » sous Miel › Production (pas de nouvelle rubrique), ouvert par
« Nouveau lot » et depuis Matériel. Matériel (Gestion) devient le catalogue d'articles ; « Ajouter une dépense » ouvre
l'achat en plusieurs lignes. Décision de Pierre-Louis (11 nov. 2026, maquettes validées).

**IT-06 (6 nov. 2026)** : écran « Déplacer des colonies » sous Ruchers (pas de nouvelle rubrique), ouvert depuis Ruchers, la fiche rucher, la fiche colonie et le registre ; il utilise le `Sélecteur de colonies` (§5). Ruches physiques : section de Matériel, visible seulement au niveau Professionnel (réglage).

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

**Gabarit d'écran commun (v5.43, audit « ergonomie et uniformisation » du 14 nov. 2026)** : chaque écran suit le même
squelette, posé par un seul module (`src/noyau/gabarit.js`, styles `styles/composants/gabarit.css`, jetons
`styles/jetons.css`). Un écran ne fabrique ni son retour, ni sa barre du bas, ni son menu ⋯ : il les déclare (boutons de
`shell()`, barre `.op-pied` ou `.n4-rbarre`) et le gabarit les range.

1. **Coquille fixe** : barre du haut, barre du bas à 5 touches ; rien d'autre n'est fixe, sauf la barre du bouton principal.
2. **En-tête** : « ‹ Parent » seulement sous le 1er niveau (plus de fil d'Ariane) ; titre = un nom court (une phrase
   passe en résumé dessous) ; ⋯ à droite pour les actions rares.
3. **Une seule barre d'outils** : Filtrer (avec le nombre), 2 ou 3 raccourcis, choix de vue.
4. **Filtres, tri, période** : dans une feuille du bas (« Filtrer et trier », « Filtrer » de l'agenda, puce « 2026 ▾ »).
5. **Un seul bouton principal** (classe `main` ou `honey`) : en bas sur téléphone (52 px), à droite de l'en-tête sur
   ordinateur. Un bouton « + » à côté seulement s'il y a d'autres créations (fiche ruche).
6. **Trois feuilles du bas** : Filtrer et trier, Actions (⋯ et +), Saisie courte (`sheet()`).
7. **Onglets** : soulignés (`subtabs`) ; le segment (`cp-bascule`, `seg`) seulement pour un choix de vue.
8. **Lignes de liste** de 54-56 px, appui long pour sélectionner.
9. **Jetons** : rayons `--r-s` 10, `--r-m` 14, `--r-l` 20, `--r-pill` ; textes de 12 px minimum (`--t-*`) ; couleurs par
   variables ; cibles de 44 px (`--cible`).
10. **Ordinateur** : même squelette ; la feuille devient un panneau, le bouton principal monte dans l'en-tête.
11. **Écran-sujet à onglets** (v5.48, maquettes du 16 nov. 2026) : rien ne bouge d'un onglet à l'autre. En-tête de
    hauteur fixe (titre du sujet sur une ligne, une seule ligne d'état coupée par « … », ⋯ et bouton principal à
    droite ; ni surtitre ni bandeau foncé), onglets juste dessous, puis une barre d'outils `.g-outils` (année, choix de
    vue, recherche, puces, dans cet ordre) posée par le gabarit. Un onglet sans contenu affiche un état vide, jamais un
    écran blanc. Test : `etapes_ar` (positions mesurées au pixel, 390 et 1 280 px).
12. **Standards d'écran** (v5.50, maquettes du 16 nov. 2026, canvas « apiviz — Standards d'écran ») : 5 gabarits
    (Liste, Sujet à onglets — dont Ruchers et Miel —, Fiche, Saisie pas à pas, Accueil). Le titre est au même endroit
    et à la même taille sur tous les écrans sauf l'Accueil : sur téléphone, le retour est dans la barre du haut, les
    flèches d'une fiche et ⋯ à droite du titre. Échelle : titre 27 px (22 px au-delà de 16 caractères), section 17 px, étiquette de groupe 13 px, état
    vide 20 px, texte 15 px, méta 13 px, minimum 12 px, jamais de demi-pixel ; boutons 52 (principal), 44, 36 ; arrondis
    des jetons. Garde-fou : `etapes_sd` (31 écrans, un écart affiche l'écran, l'élément et la valeur).

Les écrans de saisie pas à pas (« flux » : visite, visite express, tournée, vente, récolte, mise en pots, déplacer,
inventaire) gardent leur propre en-tête (Annuler, étapes). **Règle de développement** : pas de nouveau script qui
retouche la coquille après coup ; une nouvelle fonction passe par ces règles et sa PR joint une capture téléphone et
ordinateur (`docs/PROCESSUS.md`, « Avant d'ouvrir une PR d'écran »).

`Coquille` (barres, bandeaux hors ligne et recette) · `Feuille` (fenêtre du bas, brouillon, Échap, clic à côté) · `Segments` · `Pas à pas` (− / +) · `Alvéole` et `Carte d'alvéoles` · `Carte de liste` · `Tableau` (ordinateur) · `Chiffre clé` · `Graphique` (barres, courbe, avec table « Voir les chiffres ») · `État vide` · `Toast` avec « Annuler » · `Puce d'état` · `Sélecteur de colonies` (par rucher, tout cocher) · `Sélecteur de date relative` (Aujourd'hui, Hier…) · `Bloc` (Gestion) · `Gabarit` (en-tête, retour, ⋯, bouton principal, feuille Actions, puce d'année).

## 6. Responsive

| Largeur | Navigation | Mise en page |
|---|---|---|
| < 800 px | barre du bas (Accueil, Ruchers, API, Miel, Menu) + volet Menu par catégories | une colonne, feuilles du bas |
| 800–1200 px | menu latéral par catégories (v5.32) | deux colonnes |
| > 1200 px | menu latéral par catégories (v5.32) | trois colonnes (tournée, accueil), tableaux |

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
