# Apiviz — confidentialité et services tiers

Version du 6 novembre 2026 (IT-04, AP-FEAT-021). Ce texte est la source de la page publiée `confidentialite.html`
(racine du site) : toute modification se fait dans les deux fichiers, dans la même pull request
(contrôlé par `tests/unitaires/confidentialite.test.mjs`).

> **À compléter avant publication en production** (décision D-13, structure juridique) : identité et adresse du
> responsable du traitement, adresse de contact. Les passages concernés sont marqués « [à compléter] ».
> La formulation juridique doit être relue (risque noté dans la fiche AP-FEAT-021).

## Qui traite vos données

Apiviz est un carnet de bord pour apiculteurs. Le responsable du traitement est [à compléter : nom, adresse].
Pour toute question ou demande : [à compléter : adresse e-mail de contact].

## Ce que nous enregistrons

- **Votre compte** : adresse e-mail et mot de passe (le mot de passe est conservé sous une forme protégée par notre hébergeur ; personne ne peut le lire, nous non plus).
- **Votre profil** : prénom et nom (montrés aux membres de vos exploitations) et, si vous le voulez bien, quelques
  réponses facultatives données à l'inscription (voir « Votre profil et les statistiques »).
- **Les données de votre exploitation**, que vous saisissez : ruchers et leur position, colonies, visites, traitements,
  récoltes, lots, stock, clients, ventes et factures, dépenses, fournisseurs, tâches, photos de visite.
- **Qui a fait quoi** : l'adresse e-mail de l'auteur d'une visite, d'une vente ou d'une photo, visible des autres membres
  de l'exploitation.
- **Le journal des suppressions et modifications** : l'ancienne valeur, l'auteur et la date, pour pouvoir réparer une
  erreur. Visible des seuls responsables de l'exploitation.
- **Le journal des erreurs techniques** : version de l'application, écran, message d'erreur, sans adresse e-mail ni
  donnée de votre exploitation.

Il n'y a ni publicité, ni mesure d'audience, ni revente de données.

## Qui voit vos données

Seuls les membres de votre exploitation, selon leur rôle : un responsable invite et retire des membres ; un membre voit
et saisit tout ; un membre « lecture seule » consulte sans rien modifier. Ces règles sont appliquées par la base de
données elle-même. Une exploitation ne voit jamais les données d'une autre.

## Votre profil et les statistiques

À l'inscription, Apiviz vous demande votre prénom et votre nom, une seule fois : ils suivent votre compte et vos
associés vous voient sous ce nom. Il vous propose ensuite quelques questions, **toutes facultatives** : tranche d'âge,
sexe, code postal (dont on déduit le département), depuis quand vous avez des abeilles, votre activité (loisir,
pluriactif, professionnel), votre nombre de colonies, et comment vous avez connu Apiviz.

Ces réponses servent uniquement à des **statistiques d'ensemble** sur les utilisateurs d'Apiviz (par exemple : combien
viennent de chaque région, par quel canal), pour améliorer l'application. Elles ne sont ni vendues, ni montrées à vos
associés ni aux responsables de votre exploitation : vous seul les voyez. Les statistiques ne montrent jamais un groupe de
moins de cinq personnes. Inscription réservée aux personnes de 15 ans ou plus.

Dans Réglages › Mon profil, vous pouvez à tout moment les modifier, les effacer, ne plus compter dans les statistiques,
et choisir de recevoir ou non les nouveautés par e-mail (non par défaut).

## Où sont vos données

| Service | Ce qu'il reçoit | Pourquoi | Où |
|---|---|---|---|
| Supabase (hébergeur de la base de données, des comptes et des photos) | Toutes les données ci-dessus | Faire fonctionner l'application | Union européenne |
| GitHub Pages (hébergement des fichiers de l'application) | Votre adresse IP, comme tout site visité | Télécharger l'application | États-Unis (GitHub, Inc.) |
| jsDelivr (diffusion de bibliothèques : accès à la base, carte, QR code) | Votre adresse IP | Télécharger ces bibliothèques | Réseau mondial |
| Google Fonts (polices de caractères) | Votre adresse IP | Afficher les polices | Google, réseau mondial |
| OpenStreetMap (fonds de carte, recherche d'adresse) | Votre adresse IP, la zone de carte affichée, l'adresse ou la position recherchée | Carte des ruchers, nom de la commune | Royaume-Uni (fondation OpenStreetMap), réseau mondial |
| Open-Meteo (météo) | La position de vos ruchers (latitude, longitude) | Prévisions et créneaux de visite | Europe |

Certaines fonctions passent par votre navigateur ou une autre application, seulement si vous les utilisez :

- **Dictée** : la reconnaissance vocale est celle de votre navigateur. Selon l'appareil, l'audio peut être envoyé au
  fournisseur du navigateur (Google pour Chrome et Android, Apple pour Safari et l'iPhone) pour être transformé en texte.
  Apiviz ne reçoit et ne garde que le texte que vous relisez et enregistrez. Un message vous l'explique avant la
  première dictée, avec le choix de saisir au doigt.
- **Itinéraire** : le bouton ouvre Google Maps avec la position du rucher.
- **Déclaration de ruches** : le lien ouvre le service officiel du ministère de l'Agriculture ; rien n'est envoyé
  automatiquement.
- **Partage d'un lien d'invitation, d'un reçu ou d'une relance** : il passe par l'application de votre choix
  (messagerie, e-mail).

## Sur votre appareil

Pour fonctionner sans réseau, l'application garde sur votre téléphone ou votre ordinateur : une copie des données de
l'exploitation ouverte, les saisies en attente d'envoi et les photos pas encore envoyées. Elles sont effacées à la
déconnexion. Vos préférences d'affichage y sont aussi gardées.

## Combien de temps

| Donnée | Durée |
|---|---|
| Données de l'exploitation | Tant que l'exploitation existe |
| Profil (nom, réponses facultatives) | Tant que le compte existe ; les réponses s'effacent à tout moment dans Mon profil |
| Journal des suppressions et modifications | 1 an, puis effacement automatique |
| Journal des erreurs techniques | 90 jours, puis effacement automatique |
| Données sur votre appareil | Jusqu'à la déconnexion |

## Vos droits

Vous pouvez à tout moment accéder à vos données, les corriger, les exporter (Réglages, en bas de l’écran : fichier comptable,
fichiers lisibles dans un tableur et sauvegarde complète ; Réglages › Mon profil : « Télécharger mes données »), et demander leur effacement. La suppression du compte depuis
l'application est en préparation ; d'ici là, écrivez à [à compléter : adresse e-mail de contact].

Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).
