# Notes de version

**État au 6 nov. 2026, 10 h 38.** Production et recette publient la **v5.16** (commit `ab93c53`, recette puis production
le 6 nov. 2026). Jusqu'au 4 nov., la v5.14 (`554f98f`).
Bases `apidoo` et `apidoo-test` : 000 à 012, structure identique (relevé `migrations/releves/structure-2026-11-06-apres-012.json`).
Aucune migration en attente.

## IT-02 · réalignement de la production (6 nov. 2026, en production avec la v5.16)
Aucune migration nouvelle, aucun changement de l'application (même `VERSION` de `sw.js` que la v5.16).
**`012-correctifs.sql` appliquée sur `apidoo` le 6 nov. 2026** (relevé avant/après : production identique à la recette).

- Notes de version corrigées : les v5.0 à v5.14 étaient marquées « à essayer en recette » alors qu'elles sont en
  production ; 010 et 011 sont appliquées sur les deux bases depuis le 5 nov. 2026.
- Recette : `creer_visite` et `creer_vente` ne sont plus exécutables par tous (écart E5), comme en production.
- « Vérifier » rejoue maintenant toutes les migrations (000 à 012) sur une base vide et compare la structure aux relevés
  de `migrations/releves/` : une migration qui ne reproduit plus la base relevée fait échouer la vérification.
- Données d'essai pour la production (`tests/production/`) : déplacement, intervention et facture, avec leur nettoyage.
- `docs/GUIDE.md` mis à jour pour la v5.16.
- Sauvegardes automatiques : **reportées** (décision du 6 nov. 2026, D-03 non tranchée).

**À vérifier**
1. Fait le 6 nov. 2026 : 012 sur `apidoo`, relevé de la production identique à la recette. Pas de sauvegarde
   préalable (décision du responsable ; 012 n'ajoute que des colonnes et des fonctions).
2. Production, v5.14 avec 012 : l'app fonctionne comme avant (012 n'est utilisée qu'à partir de la v5.16).
3. Fait le 6 nov. 2026 : en production (v5.14), avec les données d'essai, Déplacer des ruches, Noter une intervention et
   Créer la facture (F-2026-0001) validés par le responsable et vérifiés en base ; données d'essai retirées ensuite,
   numéro de facture libéré, base revenue à son état d'avant l'essai.

## v5.16 · 6 nov. 2026 · en production · correctifs de fiabilité (IT-01)
Migration : `migrations/012-correctifs.sql`, **appliquée sur `apidoo-test` puis `apidoo` le 6 nov. 2026**. Elle n'ajoute que des colonnes et des fonctions : l'ancienne version reste compatible.
Sans elle, la nouvelle version marche aussi (réglages, entrée de stock et clients retombent sur l'ancienne écriture).

- **Plus de données tronquées** : toutes les tables sont lues par tranches de 1 000 (plafond de Supabase). Au-delà de
  1 000 visites, rien ne manque à l'écran, au registre ni dans les exports.
- **Saisie refusée par le serveur** (hors ligne puis retour du réseau) : elle n'est plus effacée. Elle passe « à
  corriger », avec le motif, une pastille sur le bandeau et une fiche Modifier / Renvoyer / Abandonner.
- **Déconnexion** : les données gardées sur l'appareil (hors ligne, photos, préférences) sont effacées. Si des saisies
  ne sont pas encore envoyées, l'app le dit et propose de les envoyer d'abord.
- **Supprimer une ruche** efface aussi les fichiers photo de ses visites.
- **À plusieurs** : deux membres qui changent des réglages ou entrent du stock en même temps ne s'écrasent plus.
- **Factures** : adresse, code postal, ville et SIRET du client (nouveaux champs de la fiche client).
- **Messages d'erreur en français**, compréhensibles ; le détail technique est gardé dans un journal sur l'appareil.
- Le nom par défaut de l'exploitation n'est plus « Bee’s Brothers » mais celui de ton exploitation.

**À vérifier**
1. Le téléphone reprend la nouvelle version (`VERSION` de `sw.js`), l'accueil s'affiche.
2. Vrai téléphone, mode avion : saisir une vente de plus de pots qu'il n'en reste (faire vendre les pots depuis un autre
   compte entre-temps), remettre le réseau : la vente apparaît « à corriger », la corriger, elle part.
3. Se déconnecter avec une saisie en attente : l'avertissement s'affiche ; « Envoyer d'abord » puis se déconnecter.
   Se reconnecter : rien de l'ancienne session ne reste (Safari et Chrome).
4. Fiche client : saisir une adresse, ouvrir une facture : l'adresse complète y figure.
5. Réglages enregistrés depuis deux téléphones à la fois : les deux modifications restent.
6. Supprimer une ruche de test qui a des photos : la place utilisée par les photos baisse.

## v5.15 · 6 nov. 2026 · en production · mise à plat (IT-00)
Aucune migration. Aucun changement visible : l'ancienne version et la nouvelle se comportent pareil.

- `app.js` en source lisible : formatage Prettier puis noms des variables locales, écran par écran. Arbre syntaxique
  vérifié identique à l'ancien fichier (au renommage près) et 18 tests verts à chaque étape.
- `schema.sql` remplacé par un renvoi : on recrée la base avec 000 puis 004 à 011, **009 avant 008**.
- `migrations/README.md` : relevé daté des deux bases (structure, règles d'accès, plafond de 1 000 lignes, inscriptions,
  volumétrie) et écarts. Écart à corriger en recette : la méthode varroa et la note de livraison n'y sont pas
  enregistrées (AP-BUG-008). La production n'est pas concernée.
- `docs/TECHNIQUE.md` : les 19 modules dans l'ordre de chargement et les fonctions qu'ils remplacent.

**À vérifier**
1. Le téléphone reprend la nouvelle version (nouvelle `VERSION` de `sw.js`) : se connecter, l'accueil s'affiche.
2. Parcours rapide sur un vrai téléphone : nouvelle visite avec photo, nouvelle vente, pilotage, export CSV.
3. Hors ligne : couper le réseau, saisir une visite, remettre le réseau, la visite part.

## v5.14 · en production · prise en main, suite
Migration : `migrations/011-invitation-avant-connexion.sql`, appliquée sur `apidoo-test` puis `apidoo` le 5 nov. 2026.

- Rucher d'exemple, depuis la présentation ou la première question : rien n'est envoyé à la base.
- Écran après l'inscription : renvoyer le lien, corriger l'adresse.
- Première visite directement en mode guidé par API, installation proposée ensuite sur téléphone.
- Trois astuces, une à la fois. Membre invité : carte d'arrivée. Ordinateur : code QR vers le téléphone.

**À vérifier**
1. Rucher d'exemple : saisir une visite affiche « rien n'est enregistré », Créer le mien ouvre l'inscription.
2. Inscription : Renvoyer le lien, Corriger mon adresse.
3. Lien d'invitation avec et sans la migration, lien expiré.
4. Compte membre : carte d'arrivée, pas de Bien démarrer.

## v5.13 · en production · prise en main
Aucune migration. L'ancienne version reste compatible avec la base.

- Présentation avant le compte, puis création du rucher en trois questions, ruches créées d'un coup.
- Accueil : Bien démarrer en haut, étapes selon le mois, bouton Masquer, plus de chiffres à zéro.
- Première visite saluée sur l'accueil. Miel vide : trois points de départ. Tutoiement sur ces écrans.

**À vérifier sur un vrai téléphone**
1. Nouveau compte : présentation, e-mail, retour par le lien, trois questions, ruches créées.
2. Position refusée : le rucher se crée quand même, l'étape carte reste à faire.
3. Lien d'invitation : pas de questions, pas de guide pour un membre.

## v5.12 · en production · installation sur téléphone
Aucune migration. L'ancienne version reste compatible avec la base.

- **Installation :** le menu du compte affiche un vrai mode d'emploi selon l'appareil, et ne propose plus d'installer une application déjà installée.
- **Icône :** Android découpe maintenant une icône prévue pour, sans rogner le symbole.
- **Couleur :** la barre du téléphone reprend le miel doux du bandeau dans l'application installée.
- **Documentation :** `docs/MOBILE.md` fixe l'architecture web et mobile, et les étapes vers les stores.

**À vérifier**
- iPhone, dans Safari, sans l'application installée : Compte › Installer, suivre les trois étapes, puis ouvrir Apidoo depuis son icône.
- Android, dans Chrome : même parcours, la fenêtre d'installation doit s'ouvrir directement si Chrome le propose, et l'icône ne doit pas être coupée.
- Application installée : la ligne « Installer » a disparu du menu du compte.

## v5.11 · en production · tournée en parcours
Aucune migration. L'ancienne version reste compatible avec la base.

À vérifier sur téléphone :
1. « Faire la tournée » : phrase du jour, ruches par priorité, trois modes, dernier mode retenu, plus de menu du bas.
2. Je parle librement : dire « Ruche 2… Ruche 1… », la ruche en cours suit, chaque ruche se remplit. Sur iPhone installé, utiliser le micro du clavier dans la zone de texte.
3. API me pose les questions : réponse au doigt et à voix haute, question sur les œufs si la reine n'est pas vue, Passer.
4. Je remplis moi-même : tout tient sur l'écran, reine jamais présumée, Note, Photo et Plus ouvrent le formulaire complet.
5. Vérification : points signalés par « ? », Modifier, tâches proposées à garder ou retirer. Rien n'est enregistré avant la validation.
6. Quitter en cours, rouvrir : la tournée reprend, « Recommencer la tournée » repart de zéro.
7. Sans réseau : saisie gardée sur le téléphone, envoyée au retour du réseau.
8. Ordinateur : trois colonnes, onglets de mode, formulaire de visite sur toute la largeur.

## v5.10 · en production · fonctionnalités essentielles
Migration : `migrations/010-registre-factures.sql`, appliquée sur `apidoo-test` puis `apidoo` le 5 nov. 2026. Avant cette date, déplacements, interventions et factures échouaient en production.

À vérifier :
1. Météo : « Voir heure par heure » depuis un rucher, cinq jours, Prévoir une visite. Téléphone : liste verticale.
2. Rappels : cloche, écran Rappels, sujets à couper, Tout marquer comme vu, notifications quand Apidoo est ouverte.
3. Réglages : six blocs, SIRET, seuils météo, couleur du bandeau, listes et exports.
4. Registre : onglets, Déplacer des ruches, Noter une intervention, fichier Excel des mouvements.
5. Miel : lien Fiche sur un lot, récolte, ruches, ventes, clients, contrôle de l'étiquette.
6. Vente : Créer la facture, numéro qui ne change plus, Imprimer ou PDF.
7. Accueil : Ce mois-ci, mois à choisir, ajout à l'agenda.

## v5.9 · en production · Gestion en blocs et ergonomie
À vérifier :
1. Gestion : six blocs cliquables, phrase du jour, « Ajouter une dépense ». Dépenses : fil d'Ariane, chiffres, filtre par poste.
2. Barre de recherche à côté d'API, Ctrl K, flèches, Entrée, Échap. Elle trouve aussi le matériel, les dépenses, les fournisseurs et les ventes.
3. Fenêtres : clic à côté, Échap et croix. Une saisie commencée reste en brouillon, à reprendre depuis le bas de l'écran. Le brouillon disparaît si on recharge la page.
4. Supprimer depuis une fenêtre : la ligne disparaît, « Annuler » reste proposé 5 secondes.
5. Retour d'une page de détail : même hauteur de page. Filtres gardés après rechargement.
6. Nouvelle dépense : date du jour, dernier poste et dernier fournisseur remplis, bouton « en ajouter une autre ».
7. Dates « Hier », « Il y a 3 jours », lignes de tableau cliquables, écrans vides avec bouton, touche N pour ajouter.

## v5.8 · en production · accueil sur ordinateur et bandeau miel doux
À vérifier :
1. Bandeau miel doux sur ordinateur et téléphone, texte bien lisible, recette reconnaissable à sa seule étiquette.
2. Sur ordinateur : la priorité du jour avec ses boutons, quatre chiffres cliquables, puis Mes ruchers, À faire et Activité récente.
3. Chaque rucher a sa météo et son meilleur créneau. Un rucher non placé invite à le placer sur la carte.
4. Avec un seul rucher, la page reste équilibrée.
5. Sur téléphone, l'accueil ne change pas, à part la couleur du bandeau.

## v5.3 · en production · charte graphique et API animé
À vérifier :
1. API respire et cligne des yeux dans la barre du bas. Il dit bonjour à l'ouverture de sa feuille.
2. Après une saisie enregistrée, il saute. En coupant le réseau, il passe au gris et s'endort.
3. Couleurs de la charte : vert, fonds et filets. « À surveiller » passe de l'orange au miel.
4. Réglage « moins d'animations » du téléphone : API garde ses poses, sans mouvement.

## v5.7 · en production · Miel
À vérifier :
1. Miel : un pot par format, rempli selon le stock. Le toucher ouvre une vente.
2. Après une vente, le pot baisse et les chiffres défilent.
3. Vente : les 3 clients récents se choisissent d'un geste.

## v5.6 · en production · visite à la voix
À vérifier, au rucher sur un vrai téléphone :
1. Nouvelle visite › « Visiter à la voix » : parler, par exemple « activité faible, reine vue, couvain réduit, provisions faibles, 38 kilos, c'est bon ».
2. Les alvéoles se remplissent. En pause, les toucher corrige la valeur.
3. Relecture : les écarts de poids sont signalés, puis « Enregistrer la visite ». En tournée, on passe à la ruche suivante.
4. Sans réseau ou sans micro : API le dit, et les alvéoles restent utilisables au doigt.
Le navigateur peut avoir besoin d'internet pour reconnaître la voix : à vérifier sur iPhone et Android.

## v5.5 · en production · fiche ruche et transitions
À vérifier :
1. Toucher une alvéole : elle glisse et grandit pour devenir l'en-tête de la fiche. Sans animation sur un vieux téléphone, la fiche s'ouvre normalement.
2. La courbe de poids se dessine à l'arrivée, pas en changeant d'onglet.
3. Ruche voisine et retour : transition douce, rien ne saute.

## v5.4 · en production · accueil et lentilles
À vérifier :
1. Accueil : les alvéoles arrivent en cascade à l'ouverture, pas à chaque retour d'état.
2. Lentilles État, Provisions, Varroa : les alvéoles changent sans recharger l'écran. Une ruche sans donnée reste neutre.
3. Rucher placé sur la carte, avec un bon créneau aujourd'hui : la phrase d'accueil l'annonce.

## v5.2 · en production · quatre rubriques, ruchers en colonnes, météo par rucher
À vérifier :
1. Quatre rubriques partout : Accueil, Ruchers, Miel, Gestion, plus API. Sur ordinateur, le menu est une barre en haut.
2. Agenda et Activité : depuis « À faire » sur l'accueil. Registre et Déclaration : Ruchers › Santé.
3. Accueil : un rucher par colonne, avec ses alvéoles, sa météo et sa tournée. « Bien démarrer » passe en bas.
4. Chaque rucher placé sur la carte a sa météo, ses 3 prochains jours et son meilleur créneau.
5. « Ouvrir » un rucher : fiche avec 5 jours de prévisions, tâches et ruches.

## v5.1 · en production · interface Alvéoles et compagnon API
À vérifier :
1. Accueil : une phrase donne la priorité du jour, puis la carte des ruches en alvéoles avec sa légende, puis « À faire ».
2. Bouton API au centre de la barre du bas : recherche, saisies, note vocale, photo. Sans réseau, le compagnon s'endort.
3. Ruchers : dernier poids sur chaque ligne. Fiche ruche : courbe de poids ouverte.
4. Miel et Ruchers : onglets soulignés, chiffres en ligne. Gestion : une liste, avec ce qui demande une action.
5. Ordinateur : API dans le menu de gauche ; en haut sur téléphone, barre claire et logo sombre.
API n'est pas encore relié à une intelligence artificielle : la feuille l'annonce (« Bientôt »).

## v5.0 · en production · plusieurs exploitations et invitations
À vérifier :
1. Créer son compte (adresse autorisée) et confirmer l'e-mail : on arrive sur « Rucher de démonstration (recette) ».
2. Gestion › Membres : créer un lien d'invitation, l'envoyer à une autre adresse.
3. Ouvrir le lien avec l'autre compte : il rejoint l'exploitation et voit les mêmes ruches.
4. Menu du compte (avatar) : les exploitations s'affichent, on peut passer de l'une à l'autre.
5. Créer une 2e exploitation : ses données sont vides et séparées de la première.
6. Retirer le membre invité : il n'a plus accès.

## v4.0 · 3 nov. 2026 · remplacée en production par la v5
- Navigation : Accueil · Ruchers · + · Miel · Gestion ; prochaine action sur l'accueil ; bouton + unique.
- Ruchers (Liste, Carte, Santé) ; fiche ruche avec flèches vers la ruche voisine.
- Miel : tuiles stock / à encaisser / à livrer. Gestion rangée par thèmes. Menu du compte sur l'avatar.
- Suppression avec « Annuler » pendant 5 secondes.

## v3.0 · 3 nov. 2026
- Colonie (reine, hausses, équipement, division, essaimage, réunion, sortie), suivi varroa, récolte et lots,
  commandes à livrer, tournée et dictée, déclaration annuelle, recherche, activité, météo 3 jours, plein soleil.

## v2.0 et avant
- Hors ligne, photos de visite, registre d'élevage, rappels, visite de plusieurs ruches, étiquettes, carte des ruchers.
