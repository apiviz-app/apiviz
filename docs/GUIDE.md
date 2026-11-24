# Guide d'utilisation (v5)

Mis à jour le 15 nov. 2026 pour la v5.44 (gabarit commun et rationalisation des écrans) ; avant : 6 nov. 2026, v5.17 (IT-03). Les points marqués *(v5.16)* ou *(v5.17)* arrivent avec ces versions ;
la production publie la v5.14 tant qu'elles ne sont pas validées en recette.

L'organisation ci-dessous est **gelée** (doc `docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §2) : une rubrique ne change de
place qu'après décision inscrite dans la roadmap, et ce guide est mis à jour dans la même pull request.

## Se repérer

- **Un écran par sujet** *(v5.44)* : Accueil, Ruchers, Produits (Miel avant la v5.65), Agenda, Finances, Matériel, Registre et déclaration,
  Réglages. Sur ordinateur, ces 8 entrées sont toujours visibles à gauche, avec **Nouvelle visite** et **API** en tête.
  Sur téléphone, la barre du bas garde Accueil, Ruchers, **API** (au centre) et Produits ; la touche **Menu** ouvre un volet
  avec la recherche et les 5 autres entrées. Un sujet qui a plusieurs parties les range en **onglets** sous le titre
  (Finances : Bilan, Dépenses, Factures, Budget, Associés ; Matériel : Stock, Courses, Fournisseurs ; Registre et déclaration ;
  Réglages : Réglages, Équipe).
- **Chaque écran se lit de la même façon** *(v5.43)* : en haut à gauche « ‹ » pour revenir (seulement dans un détail :
  une ruche, un lot, la météo…), le titre et une phrase de résumé ; en haut à droite **⋯** pour les actions moins
  courantes (exporter, fichier comptable, seuils…). Le bouton de l'action principale est en bas, juste au-dessus du menu
  (à droite du titre sur ordinateur). Les filtres et l'année s'ouvrent dans une fenêtre qui monte du bas.
- **API**, le compagnon : il ouvre la saisie et la recherche. Il saute quand une saisie est enregistrée et s'endort
  quand le réseau part. Il n'est pas encore relié à une intelligence artificielle.
- **Recherche** : la loupe sur téléphone, le bandeau en haut de l'écran sur ordinateur, ou Ctrl K. Elle trouve ruches, clients, ventes, matériel, dépenses et
  fournisseurs.
- **Avatar (en haut à droite)** : exploitations (passer de l'une à l'autre), mode plein soleil, réglages et exports,
  installation sur le téléphone, déconnexion.

## Accueil

- Une phrase donne la priorité du jour, avec ses boutons. *(v5.71)* La carte d'API devient **Pour aujourd'hui** : la
  priorité, puis jusqu'à deux autres choses utiles (créneau, saison, stock, tâches en retard, conseils d'API), la tournée
  proposée et un micro pour parler à API. Réglages › API › Conseils d'API remet la priorité seule si tu préfères.
- Un rucher par colonne : alvéoles des ruches (couleur selon l'état), météo, meilleur créneau, tournée.
- **Météo** *(v5.35)* : les heures du jour d'emblée, le bon créneau, le choix du jour et du rucher ; « 5 jours » et le
  bouton agrandir (détail heure par heure dans un panneau). Sur ordinateur, l'accueil tient sur un écran, en trois
  colonnes : ruches, météo, à faire.
- **À faire**, **Agenda** et **Activité** ; **Ce mois-ci** propose les travaux du mois, à ajouter à l'agenda.
- **Agenda** *(v5.35)* : un calendrier (mois ou semaine) avec tâches, visites, ventes et récoltes ; un clic sur un jour
  affiche son détail et permet d'y ajouter une tâche. *(v5.71)* « Organiser avec API » : API propose ce qu'il placerait
  dans les sept prochains jours (visites selon la météo, priorités de la saison, conseils, commandes), en pointillé ;
  garde ou écarte chacun, puis « Tout ajouter ».
- **Dates** *(v5.35)* : chaque champ date ouvre le calendrier d'Apiviz, avec des raccourcis (aujourd'hui, hier…).
- **Bien démarrer** guide les premiers pas ; le bouton Masquer le retire.
- **Ton rayon** *(v5.68)* : une alvéole par semaine de mars à novembre, plus remplie quand tu as fait plus de visites ;
  la semaine en cours clignote, une alvéole touchée dit sa semaine et ses visites. La pastille donne le nombre de
  semaines d'affilée avec une visite. « Jalons gagnés » ouvre l'écran **Jalons** : douze étapes de la saison (première
  visite, printemps lancé, tournée sans oubli, objectif de récolte…), gagnées d'après tes visites, récoltes et ventes ;
  un toucher en donne le détail. Un jalon tout juste gagné s'annonce en haut de l'accueil.
- **Sons, vibrations et petites animations** *(v5.68)* : un choix fait « tic » et rebondit, une saisie enregistrée joue
  deux notes (et vibre sur Android), une fin de tournée allume chaque ruche en musique, une récolte remplit un pot, et une
  abeille emporte tes saisies au retour du réseau. Tout se règle dans Réglages › Sons et vibrations (ambiance Alvéole,
  Bois ou Cristal, volume, vibrations, animations, **mode terrain** : vibrations seules pendant une tournée).

## Ruchers

- **Liste, Alvéoles ou Tableau** *(v5.40)* : une seule barre sous les onglets. À gauche, **Filtrer et trier** (tri,
  rucher, état, seuils d'alerte : varroa au-dessus du seuil, provisions faibles, pas visitée depuis 30 jours ; année de
  la reine ; « Grouper par rucher ») ; au milieu, des raccourcis avec leur nombre (Toutes, À voir, Varroa…) qui se
  retirent d'un second toucher ; à droite, la présentation, gardée sur l'appareil.
  - **Liste** (par défaut sur téléphone) : une ligne par colonie, rangée par rucher. La ligne dit ce qui demande ton
    attention (orpheline, varroa, provisions…) ou sa force et sa reine, avec le varroa et les jours depuis la visite à
    droite. L'en-tête du rucher ouvre sa fiche, lance la **Tournée** et montre la météo en une ligne (touche-la pour
    l'heure par heure ; sans position : « Placer sur la carte »).
  - **Alvéoles** : une tuile par colonie, rouge si urgent, miel si à voir ; tout un rucher d'un coup d'œil.
  - **Tableau** : les colonnes (au choix dans Filtrer et trier), le tri en touchant un en-tête, la colonne Colonie et
    la **Synthèse** qui restent en place, la fiche rapide.
  - **Appui long** sur une colonie (ou ⋯ › Sélectionner) : coche d'autres colonies, puis **Déplacer** ou **Visite
    groupée**.
  - Sur téléphone, **⋯** à côté des onglets : Nouveau rucher, Ajouter des ruches, Déplacer, Sélectionner, Exporter.
    La recherche d'une colonie se fait avec la loupe du haut (nom ou code). Sur ordinateur : titre et boutons en haut,
    champ de recherche dans la barre, filtres à gauche, Exporter (fichier pour tableur).
- Onglets **Carte** (placer un rucher, itinéraire) et **Santé** (suivi varroa, avec un raccourci vers le registre
  d'élevage et la déclaration annuelle, qui sont rangés dans Administration).
- **Une ruche** : flèches ‹ › ou glisser pour passer à la voisine ; sous le nom, le statut, la reine (âge, couleur) et la
  dernière visite ; onglets Journal (visites et événements dans l'ordre des dates), Santé (comptages varroa,
  traitements), Reine & lignée (nouvelle reine sans perdre l'ancienne, « Issue de … », colonies qui en sont issues),
  Colonie (statut, emplacements, hausses, équipement, division, essaimage, réunion, sortie), Photos ; courbe de poids.
- **Météo** *(v5.45)* : depuis un rucher, « Voir heure par heure » : maintenant, les 5 jours (une case par heure de visite), le verdict du jour choisi et pourquoi, ses heures en lignes (la valeur qui empêche d'ouvrir est en rouge ; touche une heure bonne pour la choisir), « Voir de 8 h à 20 h », et en bas « Prévoir une visite » (ou « Voir mardi » quand le jour n'a pas de créneau).

## Saisir (API)

- **Parler à API** *(v5.71)* : le bouton API (au centre de la barre du bas) ouvre la feuille avec le grand micro
  « Parle à API » : touche, pose ta question à voix haute, API répond et te lit sa réponse. **Reste appuyé** sur le
  bouton API pour lui parler tout de suite, sans ouvrir la feuille ; relâche pour envoyer. « Ouvrir l'espace API » mène
  à l'écran API.
- **Espace API** *(v5.71)* : « Pour aujourd'hui » (la priorité du jour, un bon créneau météo, ce que la saison demande,
  le matériel sous le seuil), tes échanges, le micro à côté du champ. Avant d'envoyer, le **volet des gouttes** dit ce que
  coûtera la question (Rapide : moins d'1 goutte ; Approfondie : 2 à 4) et ce qu'il te restera ; touche-le pour changer.
  Sous chaque réponse : **Écouter**, le coût réel, et **Ajouter à l'agenda** quand un conseil donne sa date (« avant
  samedi »). Le haut-parleur, en haut, fait lire chaque réponse. ⋯ › **Mains libres** : pour le rucher, avec des gants :
  on parle, API répond en réponse rapide et lit sa réponse ; touche n'importe où pour reparler.
- *(v5.72)* **Sans réseau**, API répond ce qu'il sait déjà (dernière visite, poids, reine, traitement d'une ruche, stock,
  tâches) et garde les autres questions pour les poser au retour du réseau. Quand une réponse parle du poids d'une ruche,
  ses pesées s'affichent en **courbe**. Dis-lui tes façons de faire (« mon seuil varroa est de 2 % ») : il propose de les
  **retenir** (Réglages › API › Ce qu'API sait de toi › Oublier pour revenir en arrière). En mains libres, l'**écoute
  continue** enchaîne les questions sans toucher l'écran ; « Mains libres » est aussi dans la feuille du bouton API.
- *(v5.72)* **Conseils au bon moment** : un conseil d'API par jour au plus dans les Rappels (et en notification si tu les
  as autorisées), le lundi le point de la semaine ; jamais pendant une visite. Réglages › API › Conseils d'API.

- **Visite** : au doigt, ou « Visiter à la voix » (dire par exemple « activité faible, reine vue, 38 kilos, c'est
  bon »). Photos réduites avant l'envoi, 10 au plus par visite. À la relecture *(v5.71)*, « API a remarqué » signale ce
  qui a changé depuis la dernière visite (poids en baisse, couvain réduit, reine non vue deux fois, cellules royales,
  varroa au-dessus du seuil sans traitement) ; « Ajouter à l'agenda » crée la tâche avec la visite. Un poids très
  différent de la dernière pesée est demandé une fois (« C'est bien ça ? »).
- **Faire la tournée** d'un rucher : ruches par priorité, trois modes (je parle librement, API me pose les questions,
  je remplis moi-même), vérification avant d'enregistrer. Une tournée quittée en cours reprend à la réouverture.
- **Visite express** *(v5.32)* : sur la fiche d'une ruche déjà visitée. La visite précédente est reprise (activité,
  provisions, couvain, poids, état) ; touche seulement ce qui a changé. La reine n'est jamais reprise. « Enregistrer et
  passer à … » ouvre la ruche suivante du rucher ; le journal dit ce qui a été repris.
- Récolte, vente, dépense, tâche, note vocale, photo.

## Produits *(v5.65, anciennement Miel)*

- **Ventes** *(v5.66)* : une carte par produit (pot de la taille du format, bouteille, pain de cire…) avec ce qui
  reste et le prix, ou « Prix à fixer » à toucher pour le donner. Le « + » d'une carte ouvre la vente avec ce produit
  déjà compté. Pas besoin d'un client pour voir ses produits ni pour vendre.
- **Nouvelle vente** *(v5.66)* : touche le champ Client, la feuille « Pour qui ? » cherche dans le nom, la ville et le
  téléphone. « Créer un nouveau client » reprend le nom tapé ; « Vente sans client » vend au client « Vente au marché ».
- **Fiche client** *(v5.66)* : initiales dans une alvéole, étiquettes et goûts en puces, « Importer depuis mes
  contacts » (Chrome sur Android). L'adresse propose celles de tes clients (même foyer) puis les adresses officielles,
  et remplit le code postal et la ville. « Prévenir à la prochaine récolte » met le client dans Récoltes ›
  « À prévenir », avec un message prêt à envoyer par SMS ou e-mail. « Enregistrer et vendre » ouvre la vente.
- **Récoltes** *(v5.66)* : la saison en trois chiffres (récolté, en pots, vendu), le miel qui attend d'être mis en pots,
  « Saisir une récolte », la liste des récoltes et des autres productions. La saisie se fait en deux étapes : les ruches
  (touche les alvéoles) et le poids, puis les pots par format, avec les lots créés et les pots vides en stock. Pendant la
  saison, ou quand du miel attend, la tuile Récolte du bouton API est mise en avant.
- **D'autres produits que le miel** *(v5.65)* : Stock › Tes produits › « Ajouter un produit ». Choisis un
  modèle (hydromel, cire, bougie, propolis, pollen, gelée royale, pain d'épices, essaim, reine, coffret, cosmétique) ou
  un produit libre, puis le nom, l'unité (bouteille, pièce, flacon…), le format, le prix, la quantité et, si tu veux,
  une alerte de stock bas. Le miel passe toujours par la mise en pots. Une vente, la caisse et la page de commande
  proposent tous tes produits ; une même vente peut les mélanger. Toucher le lot d'un produit le modifie.

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

## Finances, Matériel, Registre et déclaration *(v5.44, anciennement Gestion, puis Finances et Administration)*

- **Finances** *(v5.44 : un écran, quatre onglets ; cinq depuis la v5.55)* : Bilan, Dépenses, **Factures**, Budget,
  **Associés** (qui a avancé quoi, et qui doit combien à qui pour être à égalité).
- **Étiquettes QR et Scanner une ruche** *(v5.57)* : Ruchers › ⋯ › Étiquettes QR imprime une planche A4 (3 × 7) ;
  colle une étiquette sur chaque ruche. Viser l'étiquette avec l'appareil photo ouvre Apiviz sur la ruche (état,
  Visite express, Visite complète, fiche). Depuis Apiviz : Ruchers › ⋯ ou bouton API › Scanner une ruche.
- **Caisse du marché** *(v5.57)* : Produits › ⋯ ou bouton API. Touche les pots, choisis le mode de paiement, Encaisser.
  Marche sans réseau (la vente part au retour du réseau) ; client « Vente au marché ».
- **Remises et offres** *(v5.77)* : Produits › ⋯ › Offres de vente › « Créer une offre » : 4 achetés, 1 offert ; un lot
  à prix rond (3 pots pour 25 €) ; −10 % ou −5 €, avec un minimum d'achat si tu veux ; le prix d'un client ou d'un
  cercle (revendeur −20 %). Choisis les produits, pour qui et quand ; l'interrupteur coupe une offre sans l'effacer.
  Pendant une vente ou à la caisse, l'offre la plus avantageuse s'applique toute seule (deux offres ne s'additionnent
  pas) et apiviz te dit quand un article de plus en ferait profiter le client. Pour un geste ponctuel : « Ajouter une
  remise » (en %, en € ou un article offert ; le motif est facultatif). L'article offert sort du stock ; le reçu, la
  facture et le bilan montrent les remises.
- **Carte de fidélité** *(v5.78)* : Réglages › L'exploitation › Carte de fidélité (carte pleine à 10 tampons par défaut).
  Un tampon par article payé par un client nommé. Carte pleine : l'article suivant est offert, maintenant (« Offrir
  maintenant », le moins cher du panier) ou à la prochaine visite. Le reçu et la fiche du client disent où en est sa
  carte.
- **Préparer ma sortie** *(v5.80)* : Agenda › ⋯. Pour aujourd'hui, demain ou après-demain : les ruchers à voir (à
  cocher), le créneau météo, les tâches et colonies à voir, et le matériel à emporter d'après tes tâches, comparé à ton
  stock (« Il en manque 2 »). « Partir » lance la tournée.
- **Comparer mes ruchers** *(v5.81)* : Ruchers › ⋯. Kilos par colonie, pertes, varroa et valeur de la récolte par
  rucher, triables, avec le meilleur et le plus faible, et les kilos par colonie sur 3 saisons. apiviz ne conclut pas à
  ta place : il dit quoi regarder.
- **Prêt pour l'hiver** *(v5.82)* : Ruchers › ⋯ (ou Ma saison › Hiver). Chaque colonie est prête, à surveiller, à
  reprendre ou à compléter, d'après son poids, son varroa, sa reine, sa force et ses réserves notées cet automne, et
  les repères que tu fixes (avec ton GDS ou ton vétérinaire). apiviz compare, il ne prédit pas.
- **Tes échanges avec API** *(v5.62)* : bouton API › « Tes échanges avec API ». Tes conversations passées, rangées
  par jour, une recherche, et les conseils d'API pas encore faits (« Créer la tâche »). Toi seul les vois ; efface une
  conversation ou tout l'historique quand tu veux.
- **Agenda en semaine** *(v5.62)* : sur téléphone, chaque jour en ligne ; touche un jour de la bande pour y descendre.
- **Fil de l'équipe** *(v5.61)* : Menu › Au quotidien. Ce que chacun a saisi, les notes et les demandes. Écris
  « @Prénom » pour demander quelque chose à un membre ; il voit la demande en tête et la transforme en tâche avec
  « Je m'en occupe ». Rattache une note à une ruche avec « Sur une ruche ».
- **Courbes** *(v5.61)* : fiche d'une ruche › Courbes. Poids, varroa ou force sur la saison, contre l'an dernier, avec
  les récoltes et les traitements ; compare à une autre ruche.
- **Ma saison** *(v5.69)* : Menu › Ruchers et produits. Où en est ta saison, sans défiler : la phase en cours sur la
  frise (touche un moment pour le résumer), la priorité d'API (« + Agenda », « Suivant »), quatre chiffres qui changent
  avec la saison (touche-en un pour l'aperçu) et six raccourcis, dont celui « du moment ». Le raccourci **Bilan** donne
  le bilan de l'année *(v5.61)* : partage-le ou imprime-le en PDF.
- **Bilan de la saison** *(v5.79)* : Ma saison › Bilan. Colonies au début et à la fin, pertes, varroa moyen, coût du
  kilo, « Ce qui a marché », « À revoir » et « Ce qui manque ». Trois versions à partager ou imprimer : Complète,
  Sanitaire (pour le GDS, sans argent), Simple (pour la famille).
- **Commandes** *(v5.57, Produits)* : crée ta page de commande (mot d'accueil, lieux de retrait), partage le lien ; tes
  clients réservent les produits en stock et paient au retrait. Les commandes arrivent ici : Livrée (la vente
  s'enregistre), Prévenir (SMS prêt), Annuler.
- **Factures** *(v5.55)* : une facture par achat, rangées par mois : fournisseur, date, numéro, qui a acheté, avec quel
  argent, montant, et un trombone quand le fichier est joint. Recherche (fournisseur, numéro, article) et puces (Avancées
  par un associé, Par <prénom>, Sans fichier). Toucher une facture ouvre son détail : le fichier (Voir, Joindre,
  Remplacer), les lignes, le stock qui a bougé avec elle, « Refaire cet achat ». Le fichier se joint aussi en
  enregistrant l'achat (« Joindre la facture (photo ou PDF) »), et une facture lue par API est gardée d'office.
- **Matériel** *(v5.44)* : onglets Stock, Courses (liste de courses), Fournisseurs ; l'inventaire est dans ⋯.
- **Registre et déclaration** *(v5.44)* : onglets Registre et Déclaration.
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
  **L'exploitation** (NAPI, SIRET, adresse ; membres et associés ; factures ; objectif de récolte *(v5.68)*), **Sur le terrain** (météo, rappels, caisses
  numérotées), **API** *(v5.71 : offre et gouttes, Ce qu'API sait de toi, Voix d'API, Conseils d'API)*, **Affichage** (couleur du bandeau ; sons et vibrations *(v5.68)*), **Tes données** (fichier comptable de l'année, sauvegarde, autres
  fichiers). Plus de « Listes » : la catégorie d'une dépense vient de l'article, les clients ont des étiquettes libres.
  À plusieurs, deux réglages changés en même temps ne s'écrasent plus *(v5.16)*.
- **Inscription et Mon profil** *(v5.38)* : à la première connexion, ton prénom et ton nom (une seule fois, ils suivent
  ton compte), puis quelques questions facultatives (âge, sexe, code postal, ancienneté, comment tu as connu Apiviz) pour
  des statistiques d'ensemble. Tout se change ou s'efface dans Réglages › Mon profil, qui permet aussi de ne pas compter
  dans les statistiques et de télécharger ses données.
- **Rappels** *(v5.44)* : la cloche ouvre une fenêtre avec ce qui demande ton attention (« Tout marquer comme vu ») ;
  « Réglages des rappels » (ou Réglages › Rappels) pour les notifications et les sujets à couper.

## Ton de l'application

L'application te tutoie partout ; les documents qu'elle émet (registre, factures, reçus et messages aux clients)
vouvoient *(v5.17)*. Voir `docs/CHARTE_DE_TON.md`.

## Sans réseau

- Visites, ventes, récoltes, dépenses, tâches et photos sont gardées sur le téléphone et envoyées au retour du réseau.
- Une saisie que le serveur refuse au retour (par exemple plus assez de pots) n'est plus perdue : elle passe
  **« à corriger »**, avec le motif, une pastille sur le bandeau et une fiche Modifier, Renvoyer ou Abandonner *(v5.16)*.
- On peut aussi **corriger et supprimer** sans réseau *(v5.56)* : « Corriger » sous une visite, cocher une tâche,
  ajouter une hausse, corriger une récolte ou une dépense, supprimer une visite, une vente… La correction s'affiche
  tout de suite, « en attente ». Une colonie créée sans réseau peut être visitée aussitôt : la visite part après elle.
- Si un autre membre a changé **la même saisie** entre-temps, rien n'est écrasé : la fiche « Choisis la version à
  garder » montre les deux versions champ par champ *(v5.56)*.
- **Synchronisation** (menu du compte, ou « Voir » sur le bandeau) : en une phrase, si tout est parti, puis le détail.
  Les saisies d'une autre exploitation y sont signalées (« 2 saisies en attente dans … », bouton « Y passer ») *(v5.56)*.
- **Se déconnecter** efface ce qui est gardé sur l'appareil. Si des saisies attendent encore, l'app le dit et propose de
  les envoyer d'abord *(v5.16)*.

## Installer sur le téléphone

Avatar › Installer : le mode d'emploi s'adapte à l'appareil (iPhone dans Safari, Android dans Chrome). Une fois
installée, la ligne disparaît du menu.
