# Apiviz — confidentialité et services tiers

Version du 20 novembre 2026 (IT-04, AP-FEAT-021 ; services tiers revus en v5.73). Ce texte est la source de la page publiée `confidentialite.html`
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
- **Les messages du fil de l'équipe** : le texte, son auteur, le membre à qui il est adressé et la ruche éventuelle,
  visibles des seuls membres de l'exploitation. L'auteur peut supprimer ses messages.
- **Vos échanges avec API** : vos questions et ses réponses, et la ruche dont vous parliez, visibles de vous seul
  (pas des autres membres de l'exploitation).
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
associés vous voient sous ce nom. Il vous propose ensuite quelques questions, **toutes facultatives** : votre nombre de
colonies, si vous vendez votre miel, votre code postal (dont on déduit le département, aussi pour la météo) et comment
vous avez connu Apiviz. Deux semaines plus tard, une carte en propose quatre autres, une à la fois : depuis quand vous
avez des abeilles, votre activité (loisir, pluriactif, professionnel), votre tranche d'âge et ce que vous attendez
d'abord d'Apiviz. Le sexe n'est plus demandé (depuis le 24 nov. 2026) et les réponses déjà données ont été effacées.

**Mesure de l'utilisation.** Pour savoir ce qui sert et ce qui manque, Apiviz note, pour chaque jour où vous l'ouvrez,
les grandes rubriques consultées (accueil, ruchers, visites, ventes…) et le type d'appareil (navigateur, iPhone,
Android). Rien d'autre : ni ce que vous saisissez, ni l'heure, ni votre position. Ces jours sont gardés 400 jours au
plus et ne servent qu'aux statistiques d'ensemble ci-dessous.

Ces réponses servent uniquement à des **statistiques d'ensemble** sur les utilisateurs d'Apiviz (par exemple : combien
viennent de chaque région, par quel canal), pour améliorer l'application. Elles ne sont ni vendues, ni montrées à vos
associés ni aux responsables de votre exploitation : vous seul les voyez. Les statistiques ne montrent jamais un groupe de
moins de cinq personnes. Inscription réservée aux personnes de 15 ans ou plus.

Dans Réglages › Mon profil, vous pouvez à tout moment les modifier, les effacer, ne plus compter dans les statistiques
(plus rien n'est alors noté, et les jours déjà notés sont effacés), et choisir de recevoir ou non les nouveautés par
e-mail (non par défaut). En échange de vos réponses, Apiviz peut vous montrer vos visites du mois à côté de la moyenne
de votre département, seulement si au moins cinq apiculteurs du département ont accepté les statistiques.

## Où sont vos données

| Service | Ce qu'il reçoit | Pourquoi | Où |
|---|---|---|---|
| Supabase (hébergeur de la base de données, des comptes et des photos) | Toutes les données ci-dessus | Faire fonctionner l'application | Union européenne |
| Cloudflare (hébergement des fichiers de l'application) | Votre adresse IP, comme tout site visité | Télécharger l'application | États-Unis (Cloudflare, Inc.), réseau mondial |
| jsDelivr (diffusion de bibliothèques : accès à la base, carte, QR code) | Votre adresse IP | Télécharger ces bibliothèques | Réseau mondial |
| IGN – Géoplateforme (fond de carte Plan IGN, recherche d'adresse) | Votre adresse IP, la zone de carte affichée, l'adresse ou la position recherchée | Carte des ruchers, adresse d'un client, nom de la commune | France (Institut national de l'information géographique et forestière, établissement public) |
| Open-Meteo (météo) | La position de vos ruchers (latitude, longitude) | Prévisions et créneaux de visite | Europe |
| Anthropic (modèle Claude, pour l'assistant API et la lecture des factures) | Votre question et les données de votre exploitation utiles à la réponse (colonies, visites, ventes…), au moment où vous la posez ; la facture d'achat que vous lui donnez (photo ou PDF), avec la liste de vos articles et fournisseurs, au moment de la lecture | Répondre à vos questions, lire vos factures | États-Unis (Anthropic, PBC) ; données non utilisées pour entraîner ses modèles, conservées au plus 30 jours par Anthropic pour la sécurité |

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

**Rappels quand Apiviz est fermée.** Si vous les activez, votre navigateur fournit une adresse technique propre à cet
appareil (gérée par Google, Apple, Mozilla ou Microsoft selon le navigateur), enregistrée avec les types de rappels
choisis. Le serveur d'Apiviz y envoie deux rappels par semaine au plus (ruches à visiter, beau créneau, gestes de
saison) ; le texte du rappel transite chiffré par le service du navigateur. Pour un beau créneau, la position de vos
ruchers est envoyée à Open-Meteo pour la prévision (sans rien qui vous identifie). L'adresse de l'appareil est effacée
quand vous retirez les rappels, vous déconnectez de l'appareil ou supprimez votre compte ; ce qui a été envoyé est
gardé 400 jours au plus, pour ne jamais répéter un rappel.

## Si vous commandez du miel en ligne

Un apiculteur qui utilise Apiviz peut ouvrir une page de commande et vous en envoyer le lien. Quand vous réservez des
pots sur cette page, Apiviz enregistre ce que vous saisissez : votre nom, votre numéro de téléphone, le lieu de retrait
choisi, une note éventuelle et les pots réservés. Seuls les membres de l'exploitation de cet apiculteur les voient, pour
préparer votre commande et vous prévenir (par SMS, depuis leur téléphone). Ces informations ne servent à rien d'autre,
ne sont ni vendues ni transmises. Quand la commande est remise, vous devenez client de l'exploitation, comme pour une
vente sur place. Pour les faire corriger ou effacer, adressez-vous à l'apiculteur, ou à nous (voir « Qui traite vos
données »).

## Combien de temps

| Donnée | Durée |
|---|---|
| Données de l'exploitation | Tant que l'exploitation existe |
| Profil (nom, réponses facultatives) | Tant que le compte existe ; les réponses s'effacent à tout moment dans Mon profil |
| Journal des suppressions et modifications | 1 an, puis effacement automatique |
| Journal des erreurs techniques | 90 jours, puis effacement automatique |
| Questions posées à API | Gardées avec leurs réponses dans votre historique, visibles de vous seul, jusqu'à ce que vous les effaciez (écran API : une conversation ou tout l'historique) ; le nombre de questions du jour est aussi gardé, pour le plafond d'usage |
| Commande en ligne (nom, téléphone, pots) | Tant que l'exploitation existe, comme ses ventes et ses clients |
| Données sur votre appareil | Jusqu'à la déconnexion |

## Vos droits

Vous pouvez à tout moment accéder à vos données, les corriger, les exporter (Réglages, en bas de l’écran : fichier comptable,
fichiers lisibles dans un tableur et sauvegarde complète ; Réglages › Mon profil : « Télécharger mes données »), et demander leur effacement. Vous pouvez supprimer votre compte vous-même : Réglages › Mon profil › « Supprimer mon compte ». Les exploitations sans autre membre que vous sont effacées avec toutes leurs données et leurs photos ; vous quittez celles que vous partagez, dont les données restent aux autres membres (si vous en étiez le dernier responsable, la personne inscrite depuis le plus longtemps le devient). Votre profil et votre compte de connexion sont effacés.

Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).
