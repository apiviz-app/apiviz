# Guide d'utilisation (v5)

Mis à jour le 6 nov. 2026 pour la v5.17 (IT-03). Les points marqués *(v5.16)* ou *(v5.17)* arrivent avec ces versions ;
la production publie la v5.14 tant qu'elles ne sont pas validées en recette.

L'organisation ci-dessous est **gelée** (doc `docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §2) : une rubrique ne change de
place qu'après décision inscrite dans la roadmap, et ce guide est mis à jour dans la même pull request.

## Se repérer

- **Six catégories** *(v5.32)* : Au quotidien, Ruchers, Miel et ventes, Finances, Administration, Équipe et compte.
  Sur ordinateur, elles sont toujours visibles dans le menu de gauche, avec **Nouvelle visite** et **API** en tête
  *(v5.35)* ; le menu garde sa position quand on change d'écran. Sur téléphone, la barre
  du bas garde Accueil, Ruchers, **API** (au centre) et Miel ; la touche **Menu** ouvre un volet par la droite avec
  toutes les catégories. Dans un écran, le nom de la catégorie au-dessus du titre rouvre ce volet.
- **API**, le compagnon : il ouvre la saisie et la recherche. Il saute quand une saisie est enregistrée et s'endort
  quand le réseau part. Il n'est pas encore relié à une intelligence artificielle.
- **Recherche** : la loupe sur téléphone, le bandeau en haut de l'écran sur ordinateur, ou Ctrl K. Elle trouve ruches, clients, ventes, matériel, dépenses et
  fournisseurs.
- **Avatar (en haut à droite)** : exploitations (passer de l'une à l'autre), mode plein soleil, réglages et exports,
  installation sur le téléphone, déconnexion.

## Accueil

- Une phrase donne la priorité du jour, avec ses boutons.
- Un rucher par colonne : alvéoles des ruches (couleur selon l'état), météo, meilleur créneau, tournée.
- **Météo** *(v5.35)* : les heures du jour d'emblée, le bon créneau, le choix du jour et du rucher ; « 5 jours » et le
  bouton agrandir (détail heure par heure dans un panneau). Sur ordinateur, l'accueil tient sur un écran, en trois
  colonnes : ruches, météo, à faire.
- **À faire**, **Agenda** et **Activité** ; **Ce mois-ci** propose les travaux du mois, à ajouter à l'agenda.
- **Agenda** *(v5.35)* : un calendrier (mois ou semaine) avec tâches, visites, ventes et récoltes ; un clic sur un jour
  affiche son détail et permet d'y ajouter une tâche.
- **Dates** *(v5.35)* : chaque champ date ouvre le calendrier d'Apiviz, avec des raccourcis (aujourd'hui, hier…).
- **Bien démarrer** guide les premiers pas ; le bouton Masquer le retire.

## Ruchers

- Les ruches par rucher. Onglets **Carte** (placer un rucher, itinéraire) et **Santé** (suivi varroa, avec un
  raccourci vers le registre d'élevage et la déclaration annuelle, qui sont rangés dans Administration).
- **Par rucher / Tableau** *(v5.37)* : en haut de la liste, la bascule « Tableau » montre toutes les colonies en lignes :
  état, force, reine, varroa, provisions, dernière visite (et, au choix, rucher et « À faire »). Cherche par nom ou par
  code ; **Filtres** par rucher, état, année de la reine et seuils d'alerte (varroa au-dessus du seuil, provisions
  faibles, pas visitée depuis 30 jours) ; les filtres actifs s'affichent en puces, retirables d'un toucher. Touche un
  en-tête pour trier (deux fois pour inverser). La colonne Colonie et la ligne **Synthèse** restent en place quand le
  tableau défile. Coche des colonies pour une **visite groupée** ou un **déplacement** ; touche un nom pour sa fiche
  rapide. Le bouton à deux icônes passe en cartes, avec les mêmes filtres. Sur ordinateur : filtres à gauche,
  « Colonnes », « Compact » et « Exporter » (fichier pour tableur). Le choix « Tableau » est gardé sur l'appareil.
- **Une ruche** : flèches ‹ › ou glisser pour passer à la voisine ; sous le nom, le statut, la reine (âge, couleur) et la
  dernière visite ; onglets Journal (visites et événements dans l'ordre des dates), Santé (comptages varroa,
  traitements), Reine & lignée (nouvelle reine sans perdre l'ancienne, « Issue de … », colonies qui en sont issues),
  Colonie (statut, emplacements, hausses, équipement, division, essaimage, réunion, sortie), Photos ; courbe de poids.
- **Météo** : depuis un rucher, « Voir heure par heure » : ce qu'il en est maintenant et pourquoi, les heures pour ouvrir de chaque jour, la frise de la journée (touche une heure pour son détail), les créneaux avec « Prévoir ».

## Saisir (API)

- **Visite** : au doigt, ou « Visiter à la voix » (dire par exemple « activité faible, reine vue, 38 kilos, c'est
  bon »). Photos réduites avant l'envoi, 10 au plus par visite.
- **Faire la tournée** d'un rucher : ruches par priorité, trois modes (je parle librement, API me pose les questions,
  je remplis moi-même), vérification avant d'enregistrer. Une tournée quittée en cours reprend à la réouverture.
- **Visite express** *(v5.32)* : sur la fiche d'une ruche déjà visitée. La visite précédente est reprise (activité,
  provisions, couvain, poids, état) ; touche seulement ce qui a changé. La reine n'est jamais reprise. « Enregistrer et
  passer à … » ouvre la ruche suivante du rucher ; le journal dit ce qui a été repris.
- Récolte, vente, dépense, tâche, note vocale, photo.

## Miel

- Un pot par format, rempli selon le stock ; le toucher ouvre une vente.
- Ventes (à encaisser, à livrer), clients, lots et récoltes. **Clients** *(v5.38)* : en tableau (étiquettes, dernier
  achat, total de l'année, reste à payer) ou en liste, avec recherche et puces (À encaisser, chaque étiquette) ; ceux qui
  doivent encore passent en tête. Un client a des étiquettes libres (Marché, Famille, Pro…) à la place du cercle. **Fiche d'un lot** : récolte, ruches, ventes, clients,
  contrôle de l'étiquette, et « D'où vient ce pot » : récolte, achat des pots (avec la facture), mise en pots, ventes
  *(v5.30)*.
- **Mise en pots** *(v5.30)* : « Nouveau lot » ou « Mettre en pots ». Choisis le format, le nombre de pots ; le pot
  vide, le couvercle et l'étiquette du format sont proposés, avec ce qu'il en restera. Valider crée le lot et retire
  ces articles du stock. Pour des pots déjà prêts, le lien en bas garde l'ancienne fiche, sans rien retirer.
- **Facture** : ouvrir une vente, « Créer la facture ». Le numéro (`F-année-0001`) est donné une fois et ne change
  plus ; Imprimer ou PDF. Adresse, code postal, ville et SIRET du client figurent sur la facture *(v5.16)*.

## Finances et Administration *(v5.32, anciennement Gestion)*

- **Finances** : Bilan, Dépenses et achats, Budget et prévisions, **Entre associés** (qui a avancé quoi, et qui doit
  combien à qui pour être à égalité ; un écran à part depuis la v5.32).
- **Administration** : Matériel, Fournisseurs, Registre d'élevage, Déclaration.
- L'ancien écran en blocs (Bilan, Dépenses, Budget, Stock matériel, Fournisseurs, Registre, Équipe) n'est plus dans les
  menus.
- **Matériel** *(v5.30, refait en v5.38)* : en **tableau** (article, stock, seuil, prix, fournisseur) ou en **liste**,
  au choix ; le choix reste sur l'appareil. Recherche, puces avec leur nombre (Tout, À commander, chaque famille), articles
  à commander en tête. Le stock se change au doigt avec − / + (« Annuler » juste après) ; il part en une seule correction
  notée. « Ajouter vite » propose les articles courants. La fiche d'un article : stock et seuil (− / +), famille, prix,
  fournisseur, et ce qui a bougé. Plus d'Opex / Capex à choisir : l'app sait qu'une hausse est un équipement.
- **Inventaire** *(v5.38)* : depuis Matériel, « Faire l'inventaire » : on tape ce qu'on compte, l'écart s'affiche ; les
  cases vides sont ignorées et rien ne change avant « Enregistrer ».
- **Liste de courses** *(v5.38)* : depuis Matériel, ce qui est sous le seuil, par fournisseur, avec une quantité proposée
  à ajuster ; « Envoyer la liste » ; « C'est acheté » ouvre l'achat déjà rempli.
- **Ajouter un achat** *(v5.30)* : une facture, une ligne par article touché (ou un nouvel article, ou des frais). Le
  stock monte dès l'enregistrement. « Acheté par » et « Payé avec » se choisissent en puces *(v5.38)*.
- **Dépenses** *(v5.38)* : un journal en tableau, des totaux par catégorie, des filtres (catégorie, personne, sans
  facture) et le fichier comptable à portée de main. La catégorie vient de l'article acheté.
- **Registre d'élevage** : onglets Traitements, Mouvements, Interventions, Exploitation. « Déplacer des ruches » et
  « Noter une intervention » s'y trouvent ; les mouvements s'exportent pour Excel. La **déclaration annuelle**
  est rangée dans Administration, juste à côté.
- **Opérations** (traitements et nourrissements hors visite) : prévue dans Administration par l'arborescence, pas encore
  disponible.
- **Entre associés** *(v5.32)* : dans Finances : ce qu'il faut régler pour être à égalité, ce que chacun a avancé,
  l'argent de vente à verser à la trésorerie, les derniers mouvements. « Noter le remboursement » et « Noter le
  versement » mettent le solde à jour ; « Associés », en tête, ouvre la liste des associés.
- **Équipe** : créer un lien d'invitation et l'envoyer. La personne ouvre le lien, crée son compte ou se connecte,
  et rejoint l'exploitation ; le nom de l'exploitation s'affiche sur le lien. Un responsable peut retirer un membre.
  Chaque membre apparaît avec son prénom et son nom *(v5.38)* ; « Ajouter une personne sans compte » pour quelqu'un qui
  aide sans utiliser Apiviz. Les associés proposés dans les achats et les ventes sont ces personnes : rien à retaper.
- **Réglages** (catégorie Équipe et compte, ou depuis l'avatar) *(v5.38)* : cinq groupes. **Toi** (Mon profil),
  **L'exploitation** (NAPI, SIRET, adresse ; membres et associés ; factures), **Sur le terrain** (météo, rappels, caisses
  numérotées), **Affichage** (couleur du bandeau), **Tes données** (fichier comptable de l'année, sauvegarde, autres
  fichiers). Plus de « Listes » : la catégorie d'une dépense vient de l'article, les clients ont des étiquettes libres.
  À plusieurs, deux réglages changés en même temps ne s'écrasent plus *(v5.16)*.
- **Inscription et Mon profil** *(v5.38)* : à la première connexion, ton prénom et ton nom (une seule fois, ils suivent
  ton compte), puis quelques questions facultatives (âge, sexe, code postal, ancienneté, comment tu as connu Apiviz) pour
  des statistiques d'ensemble. Tout se change ou s'efface dans Réglages › Mon profil, qui permet aussi de ne pas compter
  dans les statistiques et de télécharger ses données.
- **Rappels** : la cloche sur téléphone, « Rappels » dans le menu sur ordinateur ; sujets à couper, « Tout marquer comme vu ».

## Ton de l'application

L'application te tutoie partout ; les documents qu'elle émet (registre, factures, reçus et messages aux clients)
vouvoient *(v5.17)*. Voir `docs/CHARTE_DE_TON.md`.

## Sans réseau

- Visites, ventes, récoltes, dépenses, tâches et photos sont gardées sur le téléphone et envoyées au retour du réseau.
- Une saisie que le serveur refuse au retour (par exemple plus assez de pots) n'est plus perdue : elle passe
  **« à corriger »**, avec le motif, une pastille sur le bandeau et une fiche Modifier, Renvoyer ou Abandonner *(v5.16)*.
- **Se déconnecter** efface ce qui est gardé sur l'appareil. Si des saisies attendent encore, l'app le dit et propose de
  les envoyer d'abord *(v5.16)*.

## Installer sur le téléphone

Avatar › Installer : le mode d'emploi s'adapte à l'appareil (iPhone dans Safari, Android dans Chrome). Une fois
installée, la ligne disparaît du menu.
