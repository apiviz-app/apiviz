# Guide d'utilisation (v5)

Mis à jour le 6 nov. 2026 pour la v5.17 (IT-03). Les points marqués *(v5.16)* ou *(v5.17)* arrivent avec ces versions ;
la production publie la v5.14 tant qu'elles ne sont pas validées en recette.

L'organisation ci-dessous est **gelée** (doc `docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §2) : une rubrique ne change de
place qu'après décision inscrite dans la roadmap, et ce guide est mis à jour dans la même pull request.

## Se repérer

- **Quatre rubriques** : Accueil, Ruchers, Miel, Gestion. Sur téléphone, elles sont dans la barre du bas avec **API**
  au centre ; sur ordinateur, dans la barre en haut.
- **API**, le compagnon : il ouvre la saisie et la recherche. Il saute quand une saisie est enregistrée et s'endort
  quand le réseau part. Il n'est pas encore relié à une intelligence artificielle.
- **Recherche** : à côté d'API, ou Ctrl K sur ordinateur. Elle trouve ruches, clients, ventes, matériel, dépenses et
  fournisseurs.
- **Avatar (en haut à droite)** : exploitations (passer de l'une à l'autre), mode plein soleil, réglages et exports,
  installation sur le téléphone, déconnexion.

## Accueil

- Une phrase donne la priorité du jour, avec ses boutons.
- Un rucher par colonne : alvéoles des ruches (couleur selon l'état), météo, meilleur créneau, tournée.
- **À faire**, **Agenda** et **Activité** ; **Ce mois-ci** propose les travaux du mois, à ajouter à l'agenda.
- **Bien démarrer** guide les premiers pas ; le bouton Masquer le retire.

## Ruchers

- Les ruches par rucher. Onglets **Carte** (placer un rucher, itinéraire) et **Santé** (suivi varroa, avec un
  raccourci vers le registre d'élevage et la déclaration annuelle, qui sont rangés dans Gestion).
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
- Récolte, vente, dépense, tâche, note vocale, photo.

## Miel

- Un pot par format, rempli selon le stock ; le toucher ouvre une vente.
- Ventes (à encaisser, à livrer), clients, lots et récoltes. **Fiche d'un lot** : récolte, ruches, ventes, clients,
  contrôle de l'étiquette, et « D'où vient ce pot » : récolte, achat des pots (avec la facture), mise en pots, ventes
  *(v5.30)*.
- **Mise en pots** *(v5.30)* : « Nouveau lot » ou « Mettre en pots ». Choisis le format, le nombre de pots ; le pot
  vide, le couvercle et l'étiquette du format sont proposés, avec ce qu'il en restera. Valider crée le lot et retire
  ces articles du stock. Pour des pots déjà prêts, le lien en bas garde l'ancienne fiche, sans rien retirer.
- **Facture** : ouvrir une vente, « Créer la facture ». Le numéro (`F-année-0001`) est donné une fois et ne change
  plus ; Imprimer ou PDF. Adresse, code postal, ville et SIRET du client figurent sur la facture *(v5.16)*.

## Gestion

- Blocs : Bilan de l'année, Dépenses, Budget, Stock matériel, Fournisseurs, **Registre et déclaration** *(v5.17)*, Équipe.
- **Matériel** *(v5.30)* : tes articles par famille (emballage, alimentation, traitements, cire, équipement), chacun
  Opex (consommable) ou Capex (équipement amorti), avec son stock et « À commander » sous le seuil. « Ajouter vite »
  propose les articles courants. La fiche d'un article montre ce qui a bougé (achats, visites, mises en pots,
  corrections) ; un stock recompté y devient une correction notée.
- **Ajouter un achat** *(v5.30)* : une facture, une ligne par article touché (ou un nouvel article, ou des frais). Le
  stock monte dès l'enregistrement ; Opex ou Capex vient de l'article.
- **Registre d'élevage** : onglets Traitements, Mouvements, Interventions, Exploitation. « Déplacer des ruches » et
  « Noter une intervention » s'y trouvent ; les mouvements s'exportent pour Excel. Le lien « ‹ Gestion » ramène ici,
  d'où que tu l'aies ouvert *(v5.17)*. La **déclaration annuelle** est rangée au même endroit.
- **Opérations** (traitements et nourrissements hors visite) : prévue dans Gestion par l'arborescence, pas encore
  disponible.
- **Équipe** : créer un lien d'invitation et l'envoyer. La personne ouvre le lien, crée son compte ou se connecte,
  et rejoint l'exploitation ; le nom de l'exploitation s'affiche sur le lien. Un responsable peut retirer un membre.
- **Réglages** (depuis l'avatar) : exploitation (NAPI, SIRET, adresse), seuils météo, couleur du bandeau, listes,
  exports CSV et sauvegarde complète. À plusieurs, deux réglages changés en même temps ne s'écrasent plus *(v5.16)*.
- **Rappels** : la cloche ; sujets à couper, « Tout marquer comme vu ».

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
