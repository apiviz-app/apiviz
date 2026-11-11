# Notes de version

**État au 6 nov. 2026, 15 h 10.** Production et recette publient la **v5.17** (commit `bc66584`, recette puis production
le 6 nov. 2026). Avant : v5.16 (`ab93c53`) le matin même, v5.14 (`554f98f`) jusqu'au 4 nov.
Bases `apidoo` et `apidoo-test` : 000 à 013, structure identique (relevé `migrations/releves/structure-2026-11-06-apres-013.json`).
`apidoo-test` a aussi 014 (IT-04, 6 nov. 2026) ; **014 en attente pour `apidoo`**.

## v5.25 · à publier en recette · le nouvel accueil partout
Aucune migration. Correctif de la v5.24 après essai en production.

- **Exploitation sans visite** (6 ruches en place, aucune visite, comme « Chez Christian ») : elle gardait l'ancien
  accueil, la v5.24 étant réservée aux exploitations ayant déjà une visite. Elle a maintenant le nouvel accueil :
  bonjour, puis API propose la première visite (« Noter une visite »), le guide « Bien démarrer » juste dessous,
  les quatre chiffres et les alvéoles. Sans aucune ruche, la prise en main ne change pas.
- **Ordinateur** : même accueil que sur téléphone, mis en page sur deux colonnes : bonjour et priorité côte à côte,
  les quatre chiffres sur une ligne, puis l'état des ruches et le créneau à gauche, À faire et les dernières
  actions à droite. L'ancienne vue d'ensemble (v5.10) ne s'affiche plus ; son code reste en secours.
- À faire, le créneau et les dernières actions passent sur des cartes blanches, comme dans les maquettes.

Technique : `accueil.js` s'applique à toutes les largeurs dès la première ruche ; `alveoles.js` n'appelle plus
`accueilOrdinateur()` quand `AC` est présent. Test `ab` réécrit pour l'ordinateur ; `etapes_ac.txt` couvre
l'ordinateur et l'exploitation sans visite.

**À vérifier**
1. « Chez Christian » sur téléphone : le nouvel accueil, avec « Noter une visite » dans la carte d'API.
2. Sur ordinateur : deux colonnes, rien ne déborde ; en rétrécissant la fenêtre, on repasse sur une colonne.

## v5.24 · à publier en recette · accueil des maquettes (chantier des écrans, étape 4)
Aucune migration. S'appuie sur les v5.22 (météo) et v5.23 (transitions). **Téléphone seulement** : sur ordinateur,
la vue d'ensemble ne change pas. La prise en main (exploitation sans ruche ou sans visite) ne change pas non plus.

Sur téléphone, l'accueil suit maintenant les maquettes du 10 nov. 2026, dans cet ordre :
1. **Bonjour**, sur fond sapin : l'exploitation et la date, le résumé du jour (ruches, à surveiller, tâches),
   **Nouvelle visite** et **Nouvelle vente**.
2. **La priorité du jour, dite par API**, sur fond miel : la phrase, d'où elle vient (« D'après 3 pesées de
   Ruche 5 »), **Voir Ruche 5**, et la tournée proposée avec « Plus tard ».
3. **Quatre chiffres** qui ouvrent leur écran : miel en stock (kg et pots), ventes de l'année et à encaisser,
   résultat après charges, trésorerie (encaissé moins dépensé).
4. **État des ruches** : les alvéoles par rucher, avec les lentilles et la météo de chaque rucher, comme avant.
5. **Prochain créneau de visite** : le rucher de la priorité, ses 5 jours (heures pour ouvrir, ou pourquoi pas :
   pluie, vent, frais), le meilleur jour en avant ; toucher un jour ouvre sa météo heure par heure.
6. **À faire**, étiqueté (« Ruche 5 », « Stock bas », « À encaisser »…) : six points, la colonie critique en tête,
   puis « Voir les autres ».
7. **Dernières actions** : qui a fait quoi, avec l'initiale de la personne.

Le bloc « Saison » disparaît du téléphone : les quatre chiffres le remplacent.

Prénom : aucun n'est enregistré aujourd'hui, l'accueil dit donc « Bonjour » ou « Bonsoir » seul. Il affichera
le prénom une fois qu'on pourra le saisir (prévu à l'étape Réglages).

Technique : `accueil.js`, dernier complément de l'écran « dash » (`src/domaines/accueil/ecrans.js`), réarrange
et habille les blocs déjà construits (ux.js, alveoles.js, demarrage.js) ; styles `styles/39-accueil.css` ;
scénario `tests/etapes_ac.txt` (captures à 390 px). Tests `al`, `n4`, `v2` mis à jour pour la nouvelle mise en page.

**À vérifier**
1. Sur téléphone, l'accueil se lit dans l'ordre ci-dessus ; sur ordinateur, rien n'a bougé.
2. La carte d'API nomme la bonne ruche ; « Voir … » ouvre sa fiche ; « Plus tard » retire la tournée pour la journée.
3. Les quatre chiffres correspondent au Bilan (Gestion › Bilan) et ouvrent le bon écran.
4. Le créneau correspond à la météo du rucher ; toucher un jour ouvre ce jour en heure par heure.
5. À faire : la ruche critique en premier, puis « Voir les autres ».
6. En lecture seule, le repère « Lecture seule » reste sous le bonjour.

## v5.23 · à publier en recette · transitions entre écrans (chantier des écrans, étapes 2 et 3)
Aucune migration. S'appuie sur la v5.22 (météo lisible).

Étape 2, barre du bas : rien à changer. Elle correspond déjà aux maquettes : Accueil, Ruchers, API au centre, Miel,
Gestion, sur le bandeau miel doux.

Pour l'apiculteur (étape 3) :
- **Aller** (ouvrir un écran depuis un autre) : le contenu arrive de la droite.
- **Retour** (« ‹ Gestion », « ‹ Verger »…, ou revenir à l'écran d'avant) : il arrive de la gauche.
- **Changer de rubrique** (barre du bas, menu de côté) ou de sous-onglet (Liste, Carte, Santé) : il monte en fondu.
- Les barres du haut et du bas ne bougent pas. Les feuilles qui montent du bas et les messages qui descendent du
  haut restent comme avant ; l'alvéole qui devient l'en-tête de la fiche ruche aussi.
- **Sur ordinateur, Échap** revient à l'écran précédent, jamais pendant une saisie (champ actif, visite, vente, tournée).
- Rien ne bouge si le téléphone demande de réduire les animations.

Technique : `transitions.js` (chargé en dernier) enveloppe `render()` : l'écran change tout de suite, comme avant,
et seul le contenu neuf (`.wrap`) joue son entrée selon `<html data-vt>` (`styles/38-transitions.css`). Choix fait
après essai des transitions de vue du navigateur : elles retardent l'écran d'une image, ce que du code et des tests
existants ne supportent pas. Cette version marche aussi sur Firefox. Scénario `tests/etapes_vt.txt` ; attentes
ajoutées dans `etapes_n4.txt` et `etapes_v2.txt`.

**À vérifier**
1. Gestion › Fournisseurs puis « ‹ Gestion » : l'écran arrive de la droite, puis revient de la gauche.
2. Barre du bas, de rubrique en rubrique : fondu court ; la barre elle-même reste immobile.
3. Ruchers › Liste, Carte, Santé : fondu, pas de glissement.
4. Ouvrir une ruche depuis Ruchers : l'alvéole grossit en en-tête comme avant, sans saccade.
5. Sur ordinateur, Échap dans Fournisseurs : retour à Gestion ; Échap dans une visite en cours : rien ne change.
6. Réglages du téléphone › réduire les animations : les écrans changent d'un coup.

## v5.24 · à publier en recette · une page de connexion dans l'air de l'application
Aucune migration. Maquette : https://claude.ai/artifact/5PRMioYfLHfGFUT9DMWT1e

Pour l'apiculteur :
- **Fini le rectangle blanc sur fond sapin.** La page de connexion reprend les codes de l'application : bandeau miel
  doux, rayon d'alvéoles avec l'œil-alvéole, feuille blanche qui monte du bas, et API qui regarde le formulaire
  par-dessus la feuille.
- **Une phrase par situation** : « Tes ruches t'attendent. » (connexion), « Ton rucher en trois questions. »
  (création), « Un lien pour repartir. » (mot de passe oublié), « Choisis ton nouveau mot de passe. ».
- **Sur ordinateur**, deux colonnes : à gauche la signature « Voir clair dans ses ruches. » et trois phrases sur ce que
  fait Apiviz (« Tu parles, API note », « Le bon jour pour ouvrir tes ruches », « Ton miel, de la récolte au pot
  vendu »), à droite le formulaire dans une carte.
- **Afficher / Masquer** le mot de passe pendant la saisie.
- L'e-mail déjà saisi est gardé en passant de « Se connecter » à « Créer mon compte » ou « Mot de passe oublié ».
- Une erreur (« E-mail ou mot de passe incorrect. ») s'affiche en rouge en tête de feuille ; une information (lien
  envoyé) reste en miel doux.
- « Voir un rucher d'exemple » et « Où vont mes données » sont accessibles depuis la page de connexion.
- À la première ouverture, API monte derrière la feuille une fois l'envol du logo terminé (rien ne bouge avec le
  réglage « moins d'animations »).

Technique : `authView()` d'`app.js` réécrite (classe `cx`, modes `in`, `up`, `reset`, `recovery` dans `data-mode`) ;
`S.authErr` distingue une erreur d'une information ; action `cxvoir` ; styles `styles/39-connexion.css` ; la phrase
existe deux fois dans la page (`.cx-tel` dans le bandeau, `.cx-ordi` dans la carte), une seule est affichée ;
`demarrage.js` et `exploitations.js` adaptés pour l'invitation ; scénario `tests/etapes_cx.txt`. L'écran de
présentation (première visite, fond sapin) n'est pas modifié.

**À vérifier**
1. Se déconnecter : la page de connexion est claire, le logo joue son envol, puis API apparaît derrière la feuille.
2. Saisir un mauvais mot de passe : message rouge en haut de la feuille, l'e-mail reste saisi.
3. Toucher « Afficher » : le mot de passe se lit, « Masquer » le cache.
4. « Créer mon compte », « Mot de passe oublié », « J'ai déjà un compte » : la phrase du bandeau change, l'e-mail suit.
5. Sur ordinateur : deux colonnes, rien ne se chevauche en réduisant la fenêtre.
6. Ouvrir un lien d'invitation sans être connecté : « Tu es invité à rejoindre … » remplace la phrase.
7. Se connecter pour de bon : l'application s'ouvre comme avant.

## v5.23 · à publier en recette · du logo à API, en mouvement
Aucune migration. Six petites animations relient le logo, le symbole et API. Planche de démonstration :
https://claude.ai/artifact/CQkJaztnC3GpCySnVT71g2

Pour l'apiculteur :
- **Chargement** : l'œil-alvéole se réveille. Sa pupille se dédouble en deux yeux, les antennes poussent, API salue,
  puis redevient le symbole. En dessous, le logo et **une alvéole par ruche** qui se remplit de miel (« Mise à jour
  de tes 6 ruches » ; le nombre est celui de la dernière ouverture).
- **Connexion** : à la première apparition, les deux points du logo s'envolent, deviennent API à côté du mot, qui
  salue, puis ils reprennent leur place. Toucher le logo rejoue le mouvement.
- **Écrans vides** (« Aucune vente », « Ajoute ta première ruche »…) : le symbole suit le doigt ou la souris et cligne.
- **Saisie réussie** : la confirmation trace une coche et quelques alvéoles jaillissent (API saute toujours dans la barre).
- **Bouton API** : il s'enfonce sous le doigt, quitte la barre, arrive par le bas dans « Que veux-tu faire ? », et
  revient à sa place quand la feuille se ferme.
- Tout se fige avec le réglage « moins d'animations » du téléphone : chaque écran reste lisible sans mouvement.

Technique : `mouvement.js` (éléments `<mv-eveil>`, `<mv-logo>`, `<mv-oeil>`, chargé avant `app.js` pour servir dès le
premier écran ; coche et bouton API branchés une fois tous les scripts chargés) ; styles `styles/38-mouvement.css` ;
trois lignes d'`app.js` (chargement, connexion, écran vide) ; clé locale `apidoo-nb-ruches` ; scénario
`tests/etapes_mv.txt`. Le logo animé est lu depuis `logo-apiviz.svg`, pas recomposé.

**À vérifier**
1. Ouvrir l'application déjà connecté : pendant le chargement, le symbole devient API, six alvéoles se remplissent.
2. Se déconnecter : sur la page de connexion, les deux points du logo s'envolent une fois et API apparaît à droite du
   mot ; toucher le logo rejoue. Se tromper de mot de passe ne relance pas l'animation.
3. Un écran vide (une exploitation sans vente, par exemple) : la pupille suit le doigt, puis reprend sa ronde.
4. Enregistrer une visite ou une vente : coche tracée et éclats sur la confirmation ; un message d'erreur n'en a pas.
5. Toucher API dans la barre du bas : il disparaît de la barre, arrive dans la feuille, revient à la fermeture
   (croix, touche Retour, ou choix d'une tuile).
6. Réglages du téléphone › réduire les animations : rien ne bouge, tout reste lisible.

## v5.22 · à publier en recette · météo lisible (chantier des écrans, étape 1)
Aucune migration. Même service météo (Open-Meteo), mêmes seuils réglables. Premier lot du chantier des écrans tirés
des maquettes UX/UI du 10 nov. 2026 (`docs/ROADMAP/CHANTIER_ECRANS.md`).

Pour l'apiculteur :
- **Maintenant au rucher** : un bandeau vert, miel ou gris dit tout de suite si l'on peut ouvrir, **pourquoi**
  (« Trop de vent (31 km/h) », « Un peu frais : visite courte »…) et le prochain créneau, en plage horaire.
- **Les jours** : chaque jour montre une jauge et le nombre d'heures pour ouvrir (« 6 h pour ouvrir », « Pas de
  créneau »). Sur téléphone, les jours défilent d'un geste.
- **La frise de la journée**, de 8 h à 20 h : une case par heure (verte, miel, grise, hachurée hors des heures de
  visite), la courbe de température, les barres de pluie, le vent (en rouge au-delà du seuil) et l'heure actuelle.
  Toucher une heure ouvre son détail : température, pluie, vent, rafales, humidité, la raison, et « Prévoir une
  visite à … h » quand l'heure s'y prête.
- **Créneaux du jour** : les plages favorables (« 12 h – 14 h, bonnes conditions ») avec leur bouton « Prévoir », qui
  préremplit la tâche au bon jour et à la bonne heure. Un jour sans créneau renvoie vers le prochain jour favorable.
- **Carte du rucher (accueil, Ruchers)** : une petite frise d'aujourd'hui sous la température, lisible d'un coup d'œil.
- Le tableau complet heure par heure reste là, replié. Les seuils se règlent depuis l'écran météo.
- Animations courtes (frise qui se remplit, courbe qui se trace), coupées par le réglage « moins d'animations ».

Correction : la phrase du jour (« Tu peux ouvrir entre … ») ne regroupe plus des heures séparées par une heure
défavorable.

Technique : `Regles.meteo.raison()` et `Regles.meteo.plages()` (testées, `tests/unitaires/sante-meteo.test.mjs`) ;
`MT.parHeure()` donne aussi la pluie en mm, la raison, les plages et le décompte des heures ; `MT.friseCourte()` ;
styles `styles/37-meteo-lisible.css` ; scénario `tests/etapes_mt.txt` (captures à 390 et 1 280 px avec `CAPTURES=`).

**À vérifier**
1. Accueil : sous la température d'un rucher placé, la petite frise d'aujourd'hui (cases vertes là où l'on peut
   ouvrir, l'heure actuelle entourée).
2. « Voir heure par heure » : le bandeau du haut dit si l'on peut ouvrir maintenant et pourquoi ; le prochain
   créneau correspond au bouton « Prévoir une visite » du haut.
3. Toucher plusieurs heures de la frise : le détail change sans que l'écran saute ; une heure défavorable n'a pas
   de bouton « Prévoir ».
4. Choisir un autre jour, puis « Prévoir » sur une plage : la tâche est datée de ce jour, avec l'heure dans le titre.
5. Au téléphone, en plein soleil : les couleurs de la frise et des jours restent distinctes.
6. Réglages du téléphone › réduire les animations : tout s'affiche d'un coup, sans mouvement.

## v5.21 · à publier en recette · Apidoo devient Apiviz (identité visuelle)
Aucune migration. Bases, clés du stockage local et cache hors ligne inchangés. Le dépôt ayant été renommé
`apiviz-app/apiviz`, le manifeste passe en chemins relatifs (`./`) et le contrôle « Le site répond ? » de la mise en
ligne déduit l'adresse du dépôt (https://apiviz-app.github.io/apiviz/).

Pour l'apiculteur :
- **Nouveau nom, nouveau logo** : « apiviz », les points des deux « i » sont deux alvéoles de miel. Bandeau, barre
  latérale, tournée, connexion, page de confidentialité et écran de chargement l'affichent.
- **Nouvelle icône** : l'œil-alvéole (alvéole miel, pupille sapin, reflet cire) sur fond sapin, pour l'écran
  d'accueil, l'onglet du navigateur et les notifications.
- **API a les yeux de la marque** : deux petites alvéoles avec un reflet, dans tous ses états.
- Tous les textes disent Apiviz (installer, partager une invitation, notifications, export d'agenda).

Technique : `logo-apiviz*.svg`, `symbole-apiviz.svg`, `icone-apiviz.svg` remplacent les fichiers `*-apidoo.svg` ;
PNG régénérés ; jetons `--cire` et `--honey-light` ajoutés ; objet global `Apiviz` (ex-`Apidoo`) pour le compagnon.
Charte : `docs/CHARTE_GRAPHIQUE.md`. À faire hors dépôt : nom d'expéditeur des e-mails dans Supabase.

## v5.20 · à publier en recette · emplacements, transhumance et ruches physiques (IT-06)
Migration : `migrations/016-emplacements-contenants.sql`, **appliquée sur `apidoo-test` le 6 nov. 2026** (relevé
avant/après `migrations/releves/structure-2026-11-06-recette-apres-016.json` : avant, structure identique aux fichiers
000 à 015 ; après, les six empreintes de `empreinte_structure()` identiques au rejeu des fichiers 000 à 016 ; 8 colonies
reprises, toutes actives, un emplacement ouvert chacune ; registre inchangé ; 24 rattachements, aucun croisé ;
déplacement de 2 colonies essayé dans un bloc annulé, sous RLS), à appliquer sur `apidoo` après accord.
**Ne casse pas l'ancienne version** : tout est ajouté ; `ruches.sortie` reste rempli et suit le statut ; un déplacement
fait par la v5.10 (événements puis texte du rucher) reste accepté et l'emplacement suit à la date du jour. Seule
différence visible pour elle : une sortie « Perdue » (nouvelle version) s'affiche telle quelle. La v5.20 fonctionne
aussi sur une base sans 016 (tables lues comme facultatives, pas de statut ni de « Perdue »), mais la production doit
avoir 016 (la mise en ligne le vérifie). Extension `btree_gist` installée dans le schéma `extensions`.

Pour l'apiculteur :
- **Déplacer des colonies en une fois** (transhumance, hivernage, pollinisation, vente) : écran « Déplacer » depuis
  Ruchers, la fiche d'un rucher, la fiche d'une colonie ou le registre. Colonies regroupées par rucher avec « Tout
  cocher », destination, date, motif, note. Une seule opération, notée au registre des mouvements (une ligne par
  colonie, comme avant). **Sans réseau** : gardée sur le téléphone, visible tout de suite, envoyée une seule fois.
- **Où était la colonie** : la fiche colonie (onglet Colonie) montre ses emplacements successifs ; dans le journal,
  une visite faite ailleurs qu'au rucher actuel indique « au Verger ». L'historique antérieur à cette version n'est pas
  reconstitué : il est connu depuis le dernier déplacement noté, ou l'installation.
- **Colonie orpheline** : « Marquer orpheline » (fiche colonie) ; elle apparaît en tête des alertes de l'accueil et
  une tâche « Remérer … » est proposée (sans échéance imposée). « Elle a de nouveau une reine » la remet active.
- **Colonies mortes, vendues, réunies, perdues** : ne comptent plus (comme avant) ; « Ruches sorties » se filtre par
  statut. Nouvelle sortie « Perdue ».
- **Ruches physiques** (niveau Professionnel, désactivé par défaut : Réglages › Ruches physiques) : caisses numérotées
  dans Matériel (plusieurs d'un coup, type, état, lien avec un article d'équipement) ; depuis la fiche colonie,
  « Choisir » ou « Transférer » : l'ancienne caisse devient libre, l'historique de la colonie ne bouge pas.

Sous le capot :
- 016 : `colonie_emplacements` (périodes sans chevauchement : contrainte d'exclusion), `deplacements`,
  `ruche_evenements.deplacement_id`, `contenants`, `colonie_contenants` (une colonie par caisse, une caisse par
  colonie) ; `ruches.statut`, `origine`, `date_creation`, `code` ; `deplacer_colonies()`, `changer_statut()`,
  `affecter_contenant()` (transactionnelles, `security invoker`, idempotentes par l'identifiant du téléphone, lecteur
  refusé) ; `rucher_a_date()` ; déclencheurs sortie ↔ statut et suivi de l'emplacement. Reprise des événements
  « deplacement » de 010 (texte inchangé).
- Écran `deplacer` enregistré dans le noyau (`src/domaines/ruchers/deplacer.js`) ; compléments de la fiche colonie et
  de Matériel dans `src/domaines/colonies/` ; règles pures `src/domaines/colonies/regles.js` (`Regles.colonies`).
  Aucune nouvelle surcharge de `render`, `shell` ou `view*`. **Retour arrière** : la fenêtre de déplacement de la
  v5.10 reste disponible avec `localStorage.setItem("apidoo-deplacement-v510", "1")`.
- Tests : SQL `test_016.mjs` (61 vérifications : atomicité, idempotence, chevauchement refusé, registre identique
  avant/après, reprise sortie → statut, ancienne version, isolation), matrice d'isolation 360 ; unitaires
  `colonies.test.mjs` (7) ; bout en bout `etapes_dp` (déplacement de 12 colonies, hors ligne, drapeau v5.10) et
  `etapes_ct` (statut, ruches physiques). `etapes_dl` : 21 lectures à l'ouverture (4 tables de plus).

**À vérifier**
1. Ruchers › Déplacer : « Tout cocher » sur un rucher, choisir la destination, Déplacer : la fiche du rucher de
   destination s'ouvre avec toutes les colonies ; la météo et la carte suivent si le rucher est placé.
2. Gestion › Registre › Mouvements : une ligne par colonie déplacée (« Verger vers Lande, transhumance… ») ; les
   mouvements d'avant cette version sont tous là, identiques ; l'export Excel aussi.
3. **Au rucher, sans réseau** : déplacer 2 colonies : « Gardé sur le téléphone », elles apparaissent tout de suite au
   nouveau rucher ; recharger l'application sans réseau : toujours là ; au retour du réseau, l'envoi part une fois.
4. Fiche d'une colonie déplacée › onglet Colonie › Emplacements : nouveau rucher puis ancien ; dans le Journal, une
   visite d'avant le déplacement indique « au <ancien rucher> ».
5. Fiche colonie › Marquer orpheline (avec la tâche) : l'accueil la montre en tête des alertes, la tâche « Remérer… »
   est dans l'agenda ; « Elle a de nouveau une reine » la retire des alertes.
6. Sortie « Perdue » d'une colonie : elle quitte les ruches comptées ; Ruchers › Ruches sorties › filtre par statut.
7. Réglages › Ruches physiques : tant que c'est « Non », rien dans Matériel ni sur la fiche colonie. Passer à « Oui »,
   ajouter les caisses 1 à 5 dans Matériel, mettre une colonie dans la 1 puis la transférer dans la 2 : la 1 est
   « Libre », la 2 « Occupée par … ».
8. Compte en lecture seule : aucun bouton Déplacer, Marquer orpheline, Transférer, Ajouter (ruches physiques).
9. Ancienne version (production v5.17 à v5.19) sur une base avec 016 : « Déplacer des ruches » (fenêtre) et « Sortie »
   fonctionnent comme avant.

## v5.19 · à publier en recette · ruchers (IT-05)
Migration : `migrations/015-ruchers.sql`, **appliquée sur `apidoo-test` le 6 nov. 2026** (relevé avant/après
`migrations/releves/structure-2026-11-06-recette-apres-015.json` : seulement les ajouts de 015 ; structure identique aux
fichiers ; 8 colonies reprises dans 2 ruchers, aucune sans rucher ; aucune donnée incohérente), à appliquer sur
`apidoo` après 014 et après accord. **Ne casse pas l'ancienne version** : `ruches.rucher` reste rempli et à jour, et un
nom de rucher tapé dans l'ancienne version retrouve ou crée le rucher. Seules différences visibles pour elle : les
variantes « Verger » / « verger » / « Verger  » sont regroupées sous un seul nom ; une nouvelle ruche sans position prend
celle de son rucher ; un rucher archivé refuse toute nouvelle ruche. La v5.19 fonctionne aussi sur une base sans 015
(retour au regroupement par texte), mais la production doit avoir 015 (la mise en ligne le vérifie).

Pour l'apiculteur :
- **Le rucher devient une vraie fiche** : « Nouveau rucher » (même sans ruche), **Renommer** en une fois (toutes ses
  colonies suivent), section **Infos** repliée : accès (lisible sans ouvrir), propriétaire avec bouton **Appeler**,
  capacité, environnement, ressources, point d'eau, notes ; **Itinéraire** vers le rucher.
- **Archiver** un rucher vide (il reste consultable, « Rouvrir ») ; un rucher avec des colonies ne s'archive pas.
- **On place le rucher, pas chaque ruche** : « Placer sur la carte » ou « Ma position », y compris sans réseau
  (envoi au retour du réseau). Toutes ses colonies ont la météo de ce lieu.
- **Carte des ruchers** : un repère par rucher, de la couleur de la colonie la plus mal en point, avec le nombre de
  colonies ; les ruchers sans colonie apparaissent aussi.
- **Rucher en 3 questions** : le rucher et ses ruches sont créés d'un coup, sans doublon possible après une coupure.

Sous le capot :
- `src/domaines/ruchers/` : règles pures testées (`regles.js`), fiche et actions (`fiche.js`) ; actions `rc*` déclarées
  une seule fois par l'écran « rucher » (`noyau/actions.js`). Aucune nouvelle surcharge de `render`, `shell` ou `view*`.
- Tests : SQL `test_015.mjs` (42 vérifications), matrice d'isolation 300 (table `ruchers`), unitaires `ruchers.test.mjs`,
  bout en bout `etapes_ru` (fiche) et `etapes_rc` (carte, placement hors ligne) ; `etapes_ex` vérifie le rucher en
  3 questions ; `etapes_dl` : 17 lectures à l'ouverture (table `ruchers`).
- Fond de carte OpenStreetMap : conditions relevées dans `docs/TECHNIQUE.md` ; à remplacer avant les applications des
  stores (IT-30).

**À vérifier**
1. Ruchers : chaque rucher existant apparaît une seule fois, avec toutes ses ruches et sa météo ; aucune ruche sous
   « Sans rucher » si elle avait un rucher.
2. Ruchers › Nouveau rucher « Essai » : la fiche s'ouvre (« Aucune colonie pour l'instant ») ; « Ajouter des ruches
   ici » propose « Essai » ; un deuxième « essai » est refusé (« Ce rucher existe déjà »).
3. Fiche d'un rucher › Renommer : le nouveau nom apparaît sur la fiche de chaque ruche, dans la tournée et le registre.
4. Fiche › Infos du rucher › Modifier les infos : saisir l'accès et le téléphone du propriétaire ; la section reste
   repliée et montre l'accès ; **Appeler** ouvre le téléphone ; **Itinéraire** ouvre le GPS sur le bon lieu.
5. **Au rucher, sans réseau** : Carte › choisir le rucher › « Ma position » : « Gardé sur le téléphone » ; au retour du
   réseau, la position part, la carte et la météo du rucher suivent.
6. Archiver un rucher qui a des ruches : refusé avec un message clair ; archiver « Essai » vide : il passe dans
   « Ruchers archivés », « Rouvrir » le ramène.
7. Carte : un repère par rucher, couleur et nombre justes ; un rucher sans position est signalé « à placer ».
8. Nouveau compte, rucher en 3 questions avec « Ma position » : le rucher et ses ruches sont créés, placés, avec météo.
9. Compte en lecture seule : aucun bouton Nouveau rucher / Renommer / Infos / Archiver / Placer ; Appeler et
   Itinéraire restent.
10. Ancienne version (production v5.17 ou v5.18) sur une base avec 015 : ajouter une ruche dans un rucher existant en
    tapant son nom en minuscules : elle rejoint le bon rucher.

## v5.18 · à publier en recette · sécurité de la base, rôles et tests SQL (IT-04)
Migration : `migrations/014-roles-audit.sql`, **appliquée sur `apidoo-test` le 6 nov. 2026** (relevé avant/après :
seulement les ajouts de 014 ; empreintes de structure identiques au rejeu des fichiers ; aucune donnée incohérente),
à appliquer sur `apidoo` après accord. **Ne casse pas l'ancienne version** : membres et responsables gardent les mêmes
droits, les liens d'invitation existants restent valables, `invitation_info()` garde ses colonnes. La v5.18 a besoin
de 014 (la mise en ligne en production le vérifie désormais toute seule).

Pour l'apiculteur :
- **Inviter en lecture seule** (conjoint, comptable, mentor) : il voit tout, ne peut rien saisir ni supprimer ; la base
  le refuse, et l'application ne lui montre aucun bouton de saisie (« Lecture seule » sous le titre).
- **Liens d'invitation maîtrisés** : à la création, on choisit le rôle (membre ou lecture seule) et « une seule
  personne » ou « plusieurs ». Gestion › Membres liste les liens actifs avec **Révoquer**. Une deuxième personne sur un
  lien à usage unique voit « Ce lien a déjà servi ». Le rôle d'un membre se change en trois choix.
- **Supprimé récemment** (Activité, responsables) : ce qui a été supprimé ces 30 derniers jours, par qui et quand ;
  **Restaurer** une visite (avec ses intrants), une vente (si les pots sont encore là) ou une dépense. Les photos d'une
  visite supprimée ne reviennent pas.
- **Confidentialité** : page « Où vont mes données » (menu du compte, écran de présentation) ; avant la première
  dictée, un message explique que l'audio peut partir chez le fournisseur du navigateur, avec « Saisir au doigt ».

Sous le capot :
- **Tests SQL** (job « Tests SQL » de Vérifier, moins d'une minute) : matrice tables × rôles × opérations
  (285 vérifications), migration 014 (55), démonstration (12) ; relance de 010 à 014.
- **Intégrité** : une visite, une récolte, une vente… ne peut plus être rattachée à un objet d'une autre exploitation,
  même par l'API (14 clés composites ; contrôle dans `creer_visite` et `creer_vente`).
- **Journal d'audit** de toutes les suppressions et modifications des tables métier, purgé à 1 an.
- **Mise en ligne** : la case « migrations faites » disparaît ; la production compare la structure de la base aux
  fichiers et refuse de partir en cas d'écart.
- **Démonstration reproductible** : `tests/demo/exploitation-demo.json` (3 ruchers, 20 colonies, 2 saisons) et
  `scripts/demo.mjs` (refuse la production).

**À vérifier**
1. Gestion › Membres (responsable) : créer un lien « Lecture seule » pour une seule personne ; l'ouvrir sur un autre
   téléphone avec un autre compte : l'écran dit « en lecture seule », la personne rejoint ; un troisième compte qui
   ouvre le même lien voit « Ce lien a déjà servi ».
2. Avec le compte lecteur : accueil, ruchers, fiche ruche, miel, ventes, gestion : aucun bouton « + », « Nouvelle
   visite », « Supprimer » ; les données se lisent ; le menu du compte indique « Lecture seule ». « Quitter » marche.
3. Révoquer un lien encore valable, puis l'ouvrir : refusé (« révoqué »).
4. Changer le rôle d'un membre (Membre → Lecture seule → Membre) : son application suit après rechargement.
5. Supprimer une visite avec un intrant, puis Activité › Supprimé récemment › Restaurer : la visite revient au
   journal, le stock de l'intrant baisse de nouveau.
6. Première dictée sur un téléphone : le message s'affiche une fois ; « Saisir au doigt » ne lance rien ; « Continuer »
   lance la dictée et le message ne revient plus.
7. Menu du compte › Confidentialité : la page s'ouvre, lisible, avec le bouton « Revenir à Apidoo ».
8. Saisie hors ligne (membre) : couper le réseau, enregistrer une visite, rétablir : elle part (la 014 ne change rien
   pour un membre).
9. **Avant la production** : compléter dans `confidentialite.html` et `docs/CONFIDENTIALITE.md` le responsable du
   traitement et l'adresse de contact (« [à compléter] »).

## v5.17 · 6 nov. 2026 · en production · noyau applicatif (IT-03)
Migration : `migrations/013-noyau-resume-et-journal.sql`, **appliquée sur `apidoo-test` puis `apidoo` le 6 nov. 2026**
(accord du responsable ; relevé avant/après : production identique à la recette).
Publiée en recette puis en production le 6 nov. 2026 (Mise en ligne, trois étapes vertes ; `sw.js` en
`apidoo-2026-11-06-bc66584`). Contrôle automatique des deux sites à 375 et 1 280 px : écran d'accueil sans erreur, noyau
chargé (30 écrans), une seule feuille de style, aucun « vous ». **Pas encore fait : la rubrique « À vérifier » sur un
vrai téléphone, connecté.** Elle n'ajoute qu'une vue, une table et une fonction : **l'ancienne version reste compatible**,
et la nouvelle fonctionne aussi sans elle (les erreurs restent alors dans la console).

Pour l'apiculteur, l'application est la même, avec trois différences voulues :
- **Elle te tutoie partout.** Les documents qu'elle émet (registre, factures, reçus et messages aux clients) vouvoient.
- **Registre et déclaration sont rangés dans Gestion** : un bloc « Registre et déclaration » et, depuis le registre, le
  lien « ‹ Gestion » (il ramenait à Santé). L'onglet Santé garde son raccourci.
- Les écrans météo, rappels, conseils du mois, fiche de lot, registre, fiche rucher et tournée ont la même petite
  animation d'arrivée que les autres écrans.

Sous le capot :
- **Noyau d'écrans** : 30 écrans enregistrés une seule fois (`src/domaines/*/ecrans.js`) ; plus aucune surcharge de
  `render`, `shell` ni des écrans ; environ 330 lignes de code jamais exécuté retirées.
- **Une seule requête après une visite** (au lieu de relire toutes les tables).
- **Journal des erreurs de production** (`journal_erreurs`, regroupé par minute, sans e-mail, purgé à 90 jours).
- **Service worker à liste générée** : `sw.js` n'est plus tenu à la main ; version = date + commit.
- **Styles** sortis d'`index.html` (jetons, composant Feuille, rubriques) ; styles et modules regroupés en un fichier
  chacun à l'assemblage : ouverture mesurée identique à la v5.16 (0,48 s contre 0,48 s, base simulée).
- **Tests** : 38 tests unitaires (calculs, ton, assemblage) dans « Vérifier » ; scénarios `nk`, `dl`, `je` ; 28 de bout
  en bout.

**Reporté à IT-03b** (décision du 6 nov. 2026) : chargement ciblé et paginé par domaine (`src/donnees/acces.js`, usage
de `colonies_resume`), découpage des styles par composant et purge des règles redéfinies ou orphelines, écran de
lecture du journal des erreurs, entrée « Opérations » de Gestion (l'écran n'existe pas encore).

**À vérifier**
1. Après mise en recette, le téléphone reprend la nouvelle version (`VERSION` de `sw.js` en `recette-apidoo-<date>-<commit>`),
   l'accueil s'affiche ; mode avion puis réouverture : l'app s'ouvre.
2. Parcourir Accueil, Ruchers (liste, carte, santé, fiche rucher, fiche ruche), Visite, Tournée, Miel (stock, lot,
   vente, facture), Gestion (chaque bloc), Réglages, Équipe, recherche : rien ne manque par rapport à la v5.16.
3. Enregistrer une visite avec un intrant : elle apparaît tout de suite au journal de la ruche, le stock baisse.
4. Gestion › Registre et déclaration : le registre s'ouvre ; « ‹ Gestion » y ramène. Même chose pour la déclaration.
5. Relire quelques écrans : plus aucun « vous » dans l'app ; le reçu d'une vente dit toujours « merci pour votre achat ».
6. Base `apidoo-test`, éditeur SQL : `select * from journal_erreurs order by derniere_fois desc;` après une erreur
   provoquée (par exemple une coupure réseau pendant un envoi) : une ligne, sans adresse e-mail.

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
