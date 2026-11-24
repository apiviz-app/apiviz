# Tests

Tests de bout en bout (Playwright, base Supabase simulée). Aucun ne touche une vraie base.

Lancer tout : `sh tests/lancer.sh` (prérequis : python3, playwright, google-chrome, npm).
Ils tournent aussi automatiquement sur chaque pull request du dépôt de recette.

`fabrique_tests.py` crée un `test_<nom>.py` par fichier `etapes_<nom>.txt`, à partir de `test_hl.py`.

`lancer.sh` lance aussi, sans toucher aucune base :
- les tests SQL de `tests/sql/` (Postgres en mémoire) ;
- le **contrôle de structure** : pour chaque relevé de `migrations/releves/`, 000 et les migrations sont rejouées
  jusqu'à la `derniere_migration` du relevé, et la structure obtenue doit être identique à celle relevée sur les
  vraies bases (`scripts/rejouer-migrations.mjs`). Une migration modifiée ou mal ordonnée fait échouer « Vérifier ».

Scénarios IT-04 : `etapes_iv` (invitations : rôle, usage unique, révocation, rôle d'un membre, lien déjà servi),
`etapes_lc` (lecteur : aucun bouton de saisie, action forcée refusée), `etapes_au` (« Supprimé récemment » et
restauration), `etapes_cf` (page de confidentialité et ses liens) ; `etapes_vx` vérifie l'information avant la première
dictée. Avec la variable `CAPTURES=<dossier>`, ces scénarios enregistrent des captures à 390 et 1 280 px.

Scénario IT-07 : `etapes_rn` (en-tête de la fiche colonie, nouvelle reine qui clôture l'ancienne, correction, « Issue de
Ruche 2 le 12 mai », onglets Santé et Reine & lignée, journal unifié, saisie sans réseau, aucune écriture directe de
`annee_reine`, base sans 019). Avec `CAPTURES=<dossier>` : captures à 375 et 1 280 px.

Scénarios IT-11 (v5.75, migration 035) : `etapes_pc` (photo HEIC illisible expliquée, photo prise sans réseau puis
envoyée, rattachement Visite / Colonie / Rucher, photos des fiches colonie et rucher), `etapes_es` (alerte du responsable
à 80 %, avertissement des Réglages avec espace restant et taille moyenne, écran Espace photos et journal du nettoyage),
`etapes_dv` (dictée : Force et Cellules royales à la voix, alvéoles touchées, repli « micro du clavier » sans
reconnaissance). Avec `CAPTURES=<dossier>` : captures à 375 et 1 280 px. Recette sur vrais téléphones :
`docs/ROADMAP/ITERATIONS/RECETTE_IT-11.md`.

Scénario v5.83 : `etapes_tr` (d'un pot à ses ruches : origine et traitement pendant la miellée, QR, clients à
prévenir et message, lien `?lot=`, QR sur les étiquettes de pots).

Scénario v5.82 : `etapes_hv` (Prêt pour l'hiver : sans repère, réglage des repères, classement, filtre, fiche, lien
depuis Ma saison).

Scénario v5.81 : `etapes_cr` (Comparer mes ruchers : une carte par rucher, repères, tri, 3 saisons ; un seul rucher).

Scénario v5.80 : `etapes_so` (Agenda › Préparer ma sortie : demain par défaut, ruchers du plus chargé au moins chargé,
programme avec retard, matériel et stock, cases gardées, rucher décoché, lancer la tournée). Avec `CAPTURES=<dossier>`.

Scénario v5.79 : `etapes_bs` (Bilan de la saison : tuiles Colonies, Varroa moyen, Coût du kilo, « À revoir » ;
partage ; versions Sanitaire sans euro et Simple sans varroa). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.88 (migration 041) : `etapes_sx` (Réglages › Mes données ; « Avant de supprimer » et « La supprimer pour tout
le monde » ; mot de passe vide, faux puis bon ; demander_suppression et son choix ; écran final et annulation ; écran
d'attente à la connexion ; bandeau des autres membres ; Mon profil ; base sans 041). Avec `CAPTURES=<dossier>` :
captures à 390 px.

Scénario v5.87 (migration 040) : `etapes_nt` (Réglages › Rappels : carte « Même quand Apiviz est fermée », abonnement avec
la clé publique de la fonction « rappels » simulée et les trois types, type retiré, désabonnement, serveur sans clés,
lien `?ecran=agenda` ; Web Push du navigateur simulé). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.86 (migration 039) : `etapes_mc` (carte « Pour mieux te connaître » à J+14 : une question à la fois, « Passer »,
réponses dans le profil, fin et comparaison avec le département, carte qui ne revient pas ; noter_activite ; Mon profil
sans le sexe, avec l'attente ; « Mes utilisateurs » absent hors équipe, tableau de bord pour l'équipe, période ; base
sans 039). Avec `CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Scénario v5.85 : `etapes_ca` (reprendre son carnet : Réglages › Tes données, tableur CSV et colonnes reconnues, ruche
créée d'office reprise, ruche ajoutée, 3 visites, « Annuler l'import », photo lue par « lire-carnet » simulée avec un
doute et « Ignorer », fonction absente). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.84 : `etapes_bv` (parcours d'arrivée : bienvenue une fois par appareil, « Faisons connaissance » et les
trois offres de 029, « Créer mon compte » avec prénom et 15 ans — rien n'est envoyé sans —, étape 1 enregistrée seule,
« Tu en es où ? » et son aperçu, premier rucher et nom proposé, rubriques proposées, première visite guidée et sa
charge, Bravo et rappels, « Mes premiers pas », volet et « Saisir » sans les rubriques masquées, Réglages › Rubriques
affichées, exploitation d'exemple et ses trois bulles). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.78 (migration 038) : `etapes_fi` (Réglages › Carte de fidélité ; vente à un client à 8 tampons : 9 sur
10, carte pleine à 2 pots, « Offrir maintenant » à 3 avec `remise_fidelite`, « Plus tard », « Retirer » ; pas de carte
sans client ; reçu et fiche client ; base sans 038). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.77 (migration 037) : `etapes_rm` (Produits › ⋯ › Offres de vente vide, Créer une offre « 4 achetés,
1 offert » sur le miel 250 g avec nom et aperçu qui suivent, interrupteur, Nouvelle vente : coup de pouce à 4 pots, offre
à 5, total net ; feuille « Remise sur cette vente » −10 % avec motif, en € sans motif, retirée ; `creer_vente` avec la
remise de chaque ligne et le détail ; caisse du marché ; reçu ; Bilan ; base sans 037). Avec `CAPTURES=<dossier>` :
captures à 390 px.

Scénarios IT-12 (v5.76, migration 036) : `etapes_va` (Ruchers › Santé : reprise du comptage d'une visite à
l'identique, aucun seuil par défaut, seuil ajouté avec source et date dans l'onglet, comptage du rucher avec taux au fur et
à mesure, chute sur lange ramenée à un jour, comptage sans réseau puis envoyé, fiche colonie et « D'où vient ce seuil ? »,
courbe varroa conservée, ordinateur), `etapes_os` (Noter un signe, avis sans maladie nommée, aide au signalement, contacts,
fiche au vouvoiement, signe coché dans la visite et rattaché à elle, signe sans réseau). `etapes_sd` connaît les écrans
`comptage` et `signalement`. Avec `CAPTURES=<dossier>` : captures à 375 et 1 280 px.

Scénario v5.35 : `etapes_cp` (menu latéral qui garde sa position, « Nouvelle visite » à côté d'API, liens sans
soulignement, sélecteur de date maison, agenda en calendrier : jour, mois, semaine, tâche en retard, ajout prérempli).

Scénario v5.70 : `etapes_gl` (feuilles du bas glissables : la feuille suit le doigt, revient sous le seuil, se ferme
au-delà ou d'un coup sec, saisie rangée en brouillon avec le titre de la fenêtre, pas de glissé depuis un champ, champ
oublié qui tremble, boutons collés en bas, signal des trois premières ouvertures, rien sur ordinateur). Avec
`CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.68 : `etapes_sa` (retours de réussite : sons des trois niveaux écoutés par un faux AudioContext,
vibrations, rayon de la saison sur l'accueil, annonce d'un nouveau jalon, écran Jalons et son détail, bulles de réussite,
d'erreur et d'annulation, abeille au retour du réseau, points regardés de la visite express, fin de tournée en musique et
« 9 min de moins », objectif de récolte et feuille « Sons et vibrations » — essai, Annuler, Enregistrer —, mode terrain,
« Belle récolte ! »). Avec `CAPTURES=<dossier>` : captures à 390 px (accueil aussi à 1 280 px).

Scénario v5.67 : `etapes_po` (Produits : mise en pots au titre fixe avec l'alerte de ce qui manque, miels et formats
du seul miel, prix proposé ; Stock en cartes produit et vignettes de lots, « Ajouter » ; Clients sans pot ni tuiles ;
même ligne d'état sur chaque onglet). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.66 : `etapes_vc` (ventes, clients et récolte, migration 033 : vitrine des produits sans aucun client, onglets
de Produits, « + » d'une carte, vente sans client, feuille « Pour qui ? » et sa recherche, fiche client créée depuis la
vente avec adresses proposées — clients puis service de l'IGN simulé —, goûts et « prévenir », onglet Récoltes et
message aux clients, feuille d'API, récolte en deux étapes). Avec `CAPTURES=<dossier>` : captures à 390 px (Ventes aussi à
1 280 px).

Scénario v5.65 : `etapes_pr` (produits de la ruche, migration 032 : rubrique Produits, modèles, création d'un lot
d'hydromel, catalogue par catégorie, vente miel et hydromel, modification). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.38 : `etapes_op` (inscription en deux étapes et Mon profil avec la migration 021, membres avec leurs noms et
personnes sans compte, inventaire, liste de courses, achat prérempli avec « Acheté par » / « Payé avec » en puces, clients en
tableau et en liste). `etapes_st` couvre Matériel en tableau ou liste et le stock au doigt ; `etapes_eg` le journal des
dépenses, les réglages en cinq groupes et le fichier comptable. Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.37, revu en v5.40 : `etapes_tb` (Ruchers : liste rangée par rucher par défaut sur téléphone, menu ⋯,
raccourcis et feuille « Filtrer et trier », regroupement, appui long et visite groupée, alvéoles, tableau avec colonne
fixe et synthèse en bas, version ordinateur). Avec `CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Scénario v5.49 (IT-08 réduite) : `etapes_vq` (visite express à neuf points, « comme le », chrono, cellules operculées →
tâche proposée et carte « Essaimage » de l'accueil, journal avec reprises en retrait, brouillon retrouvé après rechargement
— express et complète —, Reprendre / Annuler / Oublier, pas de brouillon sans saisie, tournée modèle Hiver, médiane des
durées sous 2 minutes). Avec `CAPTURES=<dossier>` : captures à 375 et 1 280 px.

Scénario v5.42 : `etapes_dx` (rucher d'exemple sans inscription, « Visite complète » lisible sur la fiche ruche).
Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.43 : `etapes_gb` (gabarit commun : titres, retour, bouton principal, ⋯, puce d'année, seuil varroa et
filtres de l'agenda en feuille, ordinateur). Avec `CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Scénario v5.44 : `etapes_ra` (rationalisation : volet à 5 entrées, Finances, Matériel, Registre et déclaration et
Réglages à onglets, feuille Rappels, 8 entrées sur ordinateur). Avec `CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Scénario v5.48 : `etapes_ar` (écrans à onglets : titre, ligne d'état, en-tête, onglets et barre d'outils au même
endroit sur chaque onglet de Matériel, Finances, Registre et déclaration, Réglages, à 390 et 1 280 px ; Courses vide).
Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.50 : `etapes_nv` (ordinateur : menu repliable et gardé, compteurs Agenda et Ruchers, API dans la barre du haut,
recherche Ctrl K en fenêtre — le clic dans le champ ne la ferme plus, filtre par type, récents, clic à côté —, panneau
« Filtrer et trier » fermé par défaut, entier sans défilement à 1 440 × 842 et 1 366 × 650, épinglé et gardé ; téléphone
inchangé). Avec `CAPTURES=<dossier>` : captures à 1 440 et 1 366 px.

Scénario v5.59 (IT-27, première partie) : `etapes_of` (offres et gouttes d'API, fonctions simulées : Réglages, Mon offre
et sa jauge, au mois / à l'année, essai de 30 jours puis arrêt, recharge et répartition du prix, bloc Équipe Apiviz,
écran API en Rapide puis Approfondie avec le coût sous chaque réponse, gouttes épuisées, base sans 029). Avec
`CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Scénario v5.64 : `etapes_rt` (bouton retour : retour du navigateur et lien « ‹ » vers l'écran d'avant, « ‹ Accueil » pour
une fiche ouverte depuis l'Accueil, onglet → Accueil, volet et feuille fermés d'abord, saisie gardée en brouillon,
message avant de quitter). Avec `CAPTURES=<dossier>` : captures à 390 px.

Scénario v5.52 : `etapes_fx` (facture lue par API, fonction « lire-facture » simulée : accès par le bouton API et Matériel (v5.53), feuille Source, PDF envoyé avec
jeton et exploitation, lecture, validation avec ligne à vérifier qui bloque, nouvel article, frais sans stock, écart de
total, intégration par enregistrer_achat, photo en deux pages envoyées en JPEG, document illisible, plafond, ordinateur,
fonction absente). Avec `CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Tests SQL seuls : `sh tests/sql/lancer.sh` (voir `migrations/README.md`). En CI, ils ont leur job (« Tests SQL ») et
`lancer.sh` les saute (`SANS_SQL=1`).

Données de démonstration : `APIDOO_DEMO_EMAIL=… APIDOO_DEMO_MOT_DE_PASSE=… node scripts/demo.mjs` (apidoo-test par
défaut ; refuse la production).

`tests/production/` ne contient pas de test automatique : ce sont les données d'essai à charger à la main dans la base
de production pour vérifier les parcours qui n'ont pas de base simulée fidèle (voir son README).

Scénarios IT-10 (v5.74, migration 034) : `etapes_qc` (QR à code court : lien `?c=` en minuscules compris, ancien lien
`?ruche=` toujours lu, QR d'une autre exploitation, code inconnu, code tapé à la main, hors ligne avec le service worker,
étiquettes nouvelles / toutes / choisies, une par page, date d'impression notée), `etapes_ag` (actions groupées : +1
hausse sur 3 colonies, Annuler pendant 5 s sans rien envoyer, envoi à la fin du délai une seule fois, état, tâche sans
réseau puis retour du réseau), `etapes_ip` (tournée dans l'ordre de pose, prioritaires signalées, bascule Priorité
retenue, feuille « Ordre de pose » et ranger_ruches, sans réseau, rucher pas encore rangé en Priorité comme avant).
Avec `CAPTURES=<dossier>` : captures à 375 et 1 280 px.
