# Notes de version

**État au 6 nov. 2026, 15 h 10.** Production et recette publient la **v5.17** (commit `bc66584`, recette puis production
le 6 nov. 2026). Avant : v5.16 (`ab93c53`) le matin même, v5.14 (`554f98f`) jusqu'au 4 nov.
Bases `apidoo` et `apidoo-test` : 000 à 013, structure identique (relevé `migrations/releves/structure-2026-11-06-apres-013.json`).
`apidoo-test` a aussi 014 (IT-04, 6 nov. 2026) ; **014 en attente pour `apidoo`**.

## v5.57 · à publier en recette · liste des ruches qui défile, ruches physiques montées avec le stock
**Migration 027 (additive, ne casse pas l'ancienne version).** Demandes de Pierre-Louis du 17 nov. 2026, maquettes
validées le soir même (« implémente-le »).

Pour l'apiculteur :
1. **Ruchers › Tableau** (téléphone) : le tableau défile vers le bas et sur les côtés ; il s'arrête au-dessus de la
   barre du bas. La ligne d'en-têtes (Colonie, État, Force…) reste collée en haut, le nom du rucher juste dessous, la
   colonne Colonie à gauche. Avant, on ne pouvait glisser que sur les côtés.
2. **Matériel › Ruches physiques › Ajouter** : nouvelle section « Pièces prises dans le stock ». Le type choisi
   pré-remplit ses pièces (plancher, corps, cadres, cire…), quantités pour une ruche, multipliées par le nombre de
   ruches. On ajuste avec − et +, on ajoute une pièce du stock. Le stock après création s'affiche ; une pièce qui manque
   est signalée en orange, mais la création reste possible (le stock passe en négatif). À la création, les pièces sont
   retirées du stock (mouvement « Assemblage » dans l'historique de l'article).
3. **Compositions** (lien à côté de « Ajouter ») : la liste des pièces de chaque type de ruche. Elle se règle aussi
   depuis l'ajout (« Garder ces pièces comme composition »).

À vérifier :
- Ruchers › Tableau sur téléphone, avec les 12 colonies : glisser vers le bas jusqu'au dernier rucher, puis sur le côté ;
  les en-têtes et le nom du rucher restent visibles.
- Matériel › Ruches physiques › Compositions : régler « Dadant 10 cadres ».
- Ajouter deux ruches physiques de ce type : pièces pré-remplies, alerte si une pièce manque, stock baissé ensuite.
- Sans réseau : l'ajout est gardé (« Ruches physiques · n° 13 à 14 » en attente), la caisse et le stock suivent, puis
  tout part au retour du réseau.

## v5.56 · à publier en recette · hors ligne v2 : corriger, supprimer, choisir (IT-09)
**Migration 026 (additive, ne casse pas l'ancienne version).** Itération IT-09 (AP-FEAT-043, AP-FEAT-044,
AP-FEAT-045 ; AP-US-047 à 050). Plan validé par Pierre-Louis le 17 nov. 2026.

Pour l'apiculteur :
1. **Sans réseau, on peut maintenant corriger et supprimer**, plus seulement créer : visites, colonies (hausses,
   équipement, état, notes…), récoltes, dépenses, tâches ; suppression des visites, récoltes, dépenses, tâches et
   ventes. La correction s'affiche tout de suite, marquée « en attente », et part au retour du réseau.
2. **Corriger une visite** : nouveau lien « Corriger » sous chaque visite du journal (date, activité, provisions,
   couvain, force, œufs, cellules royales, reine, poids, varroa, note), en ligne comme sans réseau. Les produits utilisés
   ne se corrigent pas ici (le stock en dépend) : supprimer puis refaire la visite.
3. **Colonie créée sans réseau, visitée aussitôt** : la visite attend la colonie et part après elle, sans erreur.
4. **Conflit** : si un autre membre a changé la même saisie pendant que tu étais sans réseau, rien n'est écrasé.
   Une fiche montre les deux versions champ par champ (« Ta version » / « Version enregistrée ») et demande laquelle
   garder ; les champs changés d'un seul côté partent sans question. Une suppression d'une saisie modifiée entre-temps
   demande « Garder la saisie » ou « Supprimer quand même ».
5. **Écran Synchronisation** (Réglages, menu du compte, bandeau « Voir ») : en une phrase, si tout est parti ; la
   liste de ce qui attend, ce qui est à corriger ou à choisir, ce qui part après une autre saisie, les photos.
6. **Plusieurs exploitations** : on peut changer d'exploitation avec des saisies en attente (elles restent rangées
   dans la leur). Le menu du compte affiche « 2 saisies en attente dans Rucher Pro » avec « Y passer ».
7. Rien n'est jamais retiré de la file sans un geste : une saisie refusée ou en conflit reste « à corriger ».

Technique : `src/donnees/file.js` (nouveau : format d'opération, dépendances, fusion, conflits, compteurs ; exposé
sous `Regles.file`), `offline.js` (corrections et suppressions gardées, reprise automatique de la file v1, envoi
ordonné, statut « conflit », fiche de choix, `HL.etat`, `HL.blocCompte`, `HL.nbIci`), `src/domaines/visites/corriger.js`
(action `modvisite`), `src/domaines/compte/synchronisation.js` (écran `synchronisation`, enregistré dans la table des
écrans), `ux.js` (lien « Corriger »), `nav4.js` (bloc Synchronisation du menu du compte), `exploitations.js`
(changement d'exploitation permis avec des saisies en attente), `navigation.js` et `gabarit.js` (parent Réglages),
`styles/04-hors-ligne.css`. La file des photos (`photos.js`) reste à part : ses photos partent après leur visite, et
l'écran Synchronisation les compte avec le reste.
Migration `026-hors-ligne-v2.sql` : colonne `modifie_le` et déclencheur sur visites, ruches, recoltes, depenses,
taches, ventes, reines ; `colonnes_modifiables(table)` ; `modifier_saisie(p)` et `supprimer_saisie(p)` (version
attendue, conflit champ par champ, idempotentes, security invoker). Test `tests/sql/test_026.mjs` (39 vérifications).
Tests : `tests/unitaires/file.test.mjs` (10 tests, dont l'égalité des listes blanches application / migration),
`tests/etapes_h2.txt` (20 opérations mixtes sans réseau puis renvoi), `tests/etapes_hc.txt` (conflit, suppression en
conflit, quarantaine, reprise de la file v1, deux exploitations, drapeau de retour arrière).
Retour arrière sans republier : `localStorage.setItem("apidoo-file-v1", "1")` sur un téléphone ramène au comportement
v1 (sans réseau, créations seules) ; ce qui est déjà gardé part quand même.

### À vérifier
- Recette, téléphone, mode avion : corriger le poids d'une visite d'hier, cocher une tâche, supprimer une dépense ;
  le bandeau compte les saisies ; rallumer le réseau : tout part, le bandeau disparaît, les valeurs sont celles saisies.
- Mode avion : « Ajouter des ruches » (une), puis visiter cette colonie ; retour du réseau : la colonie puis la visite.
- Deux téléphones (Pierre-Louis et Johan) : l'un corrige la note d'une visite en mode avion, l'autre la change en
  ligne ; au retour du réseau, la fiche « Choisis la version à garder » s'ouvre depuis « À corriger ».
- Réglages › menu du compte › Synchronisation : « Tout est envoyé » quand rien n'attend ; lisible à 375 px.
- Saisies en attente dans une exploitation, passer dans une autre : le menu du compte dit « N saisies en attente
  dans … » et « Y passer » les envoie.
- Un téléphone qui avait des saisies gardées avec la version précédente : elles partent après la mise à jour.
- Compte en lecture seule : pas de lien « Corriger ».

## v5.55 · à publier en recette · corrections du 17 novembre et écran Factures
**Migration 025 (additive, ne casse pas l'ancienne version).** Retours de Pierre-Louis du 17 nov. 2026 sur téléphone,
maquettes validées le jour même (« implémente toutes les modifications »).

Pour l'apiculteur :
1. **Ruchers › Tableau** (téléphone) : le tableau prend toute la hauteur et toute la largeur ; il n'est plus coupé à
   quatre lignes avec un vide dessous. Les colonies sont rangées par rucher, sous un en-tête (nom, nombre) : le rucher
   n'est plus répété sous chaque nom. La synthèse passe en une phrase au-dessus (« Tout va bien : 12 colonies OK,
   aucune faible. »). Sur ordinateur, rien ne change.
2. **Réglages › Équipe** : plus rien ne dépasse de l'écran. Les e-mails longs passent à la ligne, « Changer le rôle » et
   « Retirer » descendent sous le membre, « (toi) » devient une pastille « Toi ». Un membre qui n'a pas donné son prénom
   peut recevoir un nom (« Ajouter un nom ») : il vaut pour toute l'exploitation.
3. **Acheté par** : tous les membres de l'équipe sont proposés, même ceux qui n'ont pas encore rempli leur profil
   (auparavant seul le compte avec un prénom apparaissait). Sans prénom ni nom donné : le début de l'e-mail. « Ma
   poche » devient « Poche de … » quand c'est un associé qui avance l'argent (déjà en place).
4. **Finances › Factures** (nouvel onglet, entre Dépenses et Budget) : une facture par achat, rangées par mois, avec
   recherche et puces (Avancées par un associé, Par <prénom>, Sans fichier), le total de l'année et ce qu'ont avancé
   les associés. Le détail montre le fichier (Voir, Joindre, Remplacer), les lignes (toucher une ligne ouvre la
   dépense), le stock qui a bougé avec la facture et « Refaire cet achat ».
5. **Joindre la facture** : nouveau champ « Joindre la facture (photo ou PDF) » dans « Ajouter un achat » ; une facture
   lue par API (une seule pièce) est gardée d'office avec l'achat. Sans réseau, l'achat part plus tard et le fichier
   se joint depuis Factures.

Technique : `vue-tableau.js` (groupes et phrase de synthèse sur téléphone, plus de hauteur imposée), `exploitations.js`
et `profil.js` (lignes de membres, `mbnommer`), `regles-profil.js` (`nomsDonnes`, `nomMembre`, `associesMembres`,
réglage `noms_membres`), `factures-regles.js` et `factures.js` (écrans `factures` et `achatfacture`), `achat.js` et
`facture.js` (fichier joint), `gabarit.js` et `navigation.js` (onglet, parent), `styles/58-corrections.css`.
Migration `025-factures-fichiers.sql` (colonne `depenses.fichier`, espace privé `factures`, règles d'accès ; test
`tests/sql/test_025.mjs`). Tests : `factures.test.mjs`, `operationnel.test.mjs`, `etapes_tb`, `etapes_ex`,
`etapes_sd` (Factures et Facture ajoutés), `etapes_nk`, `etapes_ra`. Arborescence : `05_UX_UI_ET_NAVIGATION.md` et
`GUIDE.md` mis à jour.

### À vérifier
- Recette, téléphone : Ruchers › Tableau : toutes les colonies se voient en faisant défiler la page, rangées par
  rucher, avec la phrase de synthèse au-dessus.
- Réglages › Équipe : aucun bouton ni e-mail ne dépasse à droite ; « Ajouter un nom » pour Johan, puis le nom apparaît
  dans l'équipe et dans « Acheté par ».
- Ajouter un achat : « Acheté par » propose les trois membres ; choisir Johan et « Poche de Johan » ; joindre un PDF ;
  enregistrer, puis Finances › Factures : la facture a son trombone, « Voir » ouvre le PDF.
- Factures › une facture : lignes, stock, « Refaire cet achat » ouvre la feuille préremplie.
- Compte en lecture seule : la liste et le fichier se consultent, aucun bouton pour joindre ni ajouter.

## v5.54 · fonction serveur seulement · API lit enfin la photo de la facture
**Aucune migration, rien à publier côté application.** Correctif de la fonction `lire-facture`, déployé le 16 nov. 2026
sur `apidoo-test` puis `apidoo` à la demande de Pierre-Louis.

- **Problème** : la première facture photographiée en production (Bretagne Apiculture) a renvoyé « API n'arrive pas
  à ouvrir ce fichier ». Le journal de la fonction montrait un refus du modèle : il n'accepte pas qu'on lui impose
  l'outil (`tool_choice` de type `tool`). La photo n'y était pour rien.
- **Correctif** : `tool_choice` passe à `auto` (les consignes demandent toujours l'outil « facture ») ;
  `extraireReleve()` lit l'outil ou, à défaut, un relevé JSON écrit en texte ; `max_tokens` 8 000 ; le message
  « n'arrive pas à ouvrir ce fichier » n'est plus donné que pour une vraie erreur de fichier.
- Test : `extraireReleve` dans `tests/unitaires/facture.test.mjs`.

## v5.53 · à publier en recette · un accès à la facture qui dit « facture »
**Aucune migration.** Suite des maquettes « Import de facture » (page « Comment y accéder », 16 nov. 2026) : la lecture
des factures (v5.52) n'était atteignable que par « Dépense » ou « + Ajouter un achat », sans que rien ne le dise.

Pour l'apiculteur :
1. **Bouton API** : la feuille « Que veux-tu faire ? » montre une ligne **« Donner une facture à API »** (photo ou PDF)
   au-dessus des six saisies. Elle ouvre directement la feuille de la facture. La phrase « Bientôt, API … lira tes
   factures » disparaît.
2. **Matériel** : le bouton du bas devient **« + Ajouter un achat ou une facture »**. Il garde un seul bouton (règle du
   gabarit : un bouton par barre du bas) ; « Faire l'inventaire » reste dans ⋯.
3. Ces accès n'apparaissent que là où API peut lire les factures : fonction `lire-facture` présente, réseau, droit
   d'écrire, stock suivi. Sinon, tout reste comme avant. **En production, il faut d'abord déployer `lire-facture` sur
   `apidoo`** (pas encore fait).

Technique : `facture.js` (`dispoConnue`, `factureProposee`, `ouvrirFacture`, `ligneFacture` ; plus d'import de
`catalogue.js`, pour éviter un import circulaire), action `newfacture` (`achat.js`), `feuille-api.js`, `catalogue.js`
(redessin dès que la disponibilité est connue), `styles/57-facture.css`. Scénario `etapes_fx` complété (42 vérifications).

### À vérifier
- Recette, téléphone : bouton API › la ligne « Donner une facture à API » est au-dessus des tuiles ; la toucher ouvre
  « Prendre en photo / Importer un fichier ».
- Menu › Matériel : le bouton du bas dit « + Ajouter un achat ou une facture ».
- Mode avion : ni la ligne ni le libellé « ou une facture ».

## v5.52 · à publier en recette · accueil condensé
**Aucune migration.** Maquette validée par Pierre-Louis le 16 nov. 2026 (canvas « Apiviz – Accueil condensé »).

Pour l'apiculteur :
1. **Mes ruchers** : une ligne par rucher au lieu du plan des alvéoles. Chaque ligne montre le nombre de ruches, leur
   état (« 6 en forme », « 1 critique · 2 à surveiller ») et, en face, **la météo de ce rucher** : temps, température et
   prochain créneau pour ouvrir (« Créneau jeu. 14 h », « Rapide », « Pas de créneau »). Les ruchers n'étant pas au même
   endroit, chacun a la sienne. Les plus urgents d'abord ; les 3 premiers seulement, puis « Voir les N ruchers ».
2. **Plus de bloc « Prochain créneau de visite »** sur l'accueil : il ne regardait qu'un rucher. Le détail heure par heure
   reste sur la fiche de chaque rucher et sur la page Météo.
3. **Onglets État / Provisions / Varroa** : retirés de l'accueil ; Ruchers les couvre (tri, filtres, alvéoles, tableau).
4. **Quatre chiffres** dans une seule carte, plus compacte.
5. **Sans visite** : le conseil d'API tient sur une ligne, avec un bouton « Noter ».
6. Ordinateur : deux colonnes, Mes ruchers et Dernières actions à gauche, À faire à droite ; astuces et prise en main
   sous la colonne la plus courte.

Technique : `accueil.js` (`ruchers()` remplace `creneau()` ; la météo de chaque ligne se met à jour à l'arrivée de la
prévision), `styles/39-accueil.css`, `compact.js` (plus de colonne météo au milieu). Tests : `etapes_ac` (lignes,
météo par rucher, 5 ruchers → « Voir les 5 ruchers », bannière sans visite), `etapes_ab` et `etapes_al` adaptés.

### À vérifier
- Téléphone, recette : l'accueil tient en peu d'écrans ; chaque rucher a sa météo en face, cohérente avec sa fiche.
- Toucher un rucher ouvre sa fiche ; « Tout voir » ou « Voir les N ruchers » ouvre Ruchers.
- Un rucher non placé affiche « Pas placé sur la carte ».
- Ordinateur : deux colonnes, rien de vide.

## v5.51 · à publier en recette · API répond à tes questions (IT-24)
**Migration 024** (compteur d'usage, additive, ne casse pas l'ancienne version). Appliquée sur `apidoo-test` le
16 nov. 2026 ; **en attente pour `apidoo`**. Fonction serveur `assistant` déployée sur `apidoo-test` ; à déployer sur
`apidoo` avec la migration, après accord.

Pour l'apiculteur :
1. **Demande à API** : le bouton API (barre du bas, ou « Demander à API » sur ordinateur) a un champ de question en tête.
   La réponse s'ouvre dans l'écran API, avec cinq exemples de questions quand la conversation est vide.
2. **Réponse en quatre blocs** : d'abord la réponse en une phrase, puis « Ce que disent tes données » (faits datés, avec
   un bouton vers chaque fiche citée), « Ce que je suppose », « Ce que je te conseille » et « Ce qui me manque ».
3. **Santé des abeilles** : jamais de dose ni de traitement sans source officielle ; sinon API renvoie vers le vétérinaire
   ou le GDSA. Une fiche que les données ne connaissent pas n'a pas de lien.
4. **Suite de conversation** : « Et pour Ruche 2 ? » comprend la question d'avant. La conversation reste sur le
   téléphone jusqu'au rechargement ; rien n'est conservé sur le serveur.
5. **Plafond** : 30 questions par personne et par jour, le reste est affiché. Sans réseau, le champ est désactivé.
6. **Lecture seule** : API n'enregistre rien. Pour une saisie, il indique l'écran à ouvrir (les saisies viendront en IT-25).
7. **Confidentialité** : la page cite Anthropic (modèle Claude) : questions et données utiles à la réponse lui sont
   envoyées au moment de la question, ne servent pas à entraîner ses modèles et sont gardées au plus 30 jours.

Correctif (16 nov. 2026, avant la recette) : « Vérifier » était rouge sur `main` après la fusion de #79 (test_tb), ce qui a
refusé la mise en ligne. Cause : les tests appelaient la vraie météo d'Open-Meteo ; quand elle arrivait à temps, la bande
météo de chaque rucher grandissait de 4 px et la 6e colonie passait sous le menu du bas. Sur téléphone, la bande garde
maintenant 30 px avant et après la météo (plus de saut), et les tests coupent tout appel réseau réel (`tests/test_hl.py`).
`etapes_tb` vérifie aussi l'écran une fois la météo arrivée.

Technique : `supabase/functions/assistant/` (fonction, boucle, outils de lecture, règles, consignes) ;
`src/domaines/assistant/` (écran `api`, client, rendu) ; `styles/56-assistant.css`. Lectures avec le jeton de
l'utilisateur et `x-exploitation` (RLS). Modèle `claude-sonnet-5-5` par défaut ; secrets de la fonction et retour arrière
(`ASSISTANT_ACTIF=non`) : `docs/TECHNIQUE.md` § Assistant API. 30 questions de référence (`tests/assistant/`,
`scripts/evaluer-api.mjs`).
Tests : nouveau scénario `etapes_ia`, `tests/unitaires/assistant.test.mjs`, `tests/sql/test_024.mjs` ; `etapes_sd`
(écran API dans les standards), `etapes_nk` (38 écrans) et `test_appliquer` adaptés.

### À vérifier
- Téléphone, recette : bouton API › « Demande à API… » › « Quelles colonies dois-je visiter cette semaine ? ».
  La réponse arrive en quelques secondes ; les faits sont datés et justes ; les boutons ouvrent les bonnes fiches.
- « Quelle dose d'acide oxalique pour la Ruche 3 ? » : aucune dose, renvoi vétérinaire ou GDSA.
- « Combien de pots me reste-t-il ? », puis « Et en 250 g ? » : la suite est comprise.
- Ordinateur : « Demander à API » dans la barre du haut ; l'écran reste une colonne lisible.
- Le nombre de questions restantes baisse ; « Nouvelle conversation » efface l'écran.
- Mode avion : champ grisé, API dort.

## v5.50 · à publier en recette · navigation, recherche et filtres sur ordinateur
**Aucune migration.** Maquettes validées par Pierre-Louis le 16 nov. 2026 (canvas « Navigation, recherche et filtres »).
Le téléphone ne change pas.

Pour l'apiculteur (ordinateur) :
1. **Menu latéral** : un bouton « Replier » le réduit à une colonne d'icônes (76 px, libellés en infobulle) ; le choix est
   gardé sur l'appareil. « Nouvelle visite » est seule en tête ; Agenda montre le nombre de tâches du jour ou en retard,
   Ruchers le nombre de colonies « à voir ». Titres de catégorie discrets ; en bas, le prénom (ou l'adresse) et
   l'exploitation.
2. **Barre du haut** : le bouton API devient « Demander à API », à côté de la cloche.
3. **Recherche** : cliquer sur la barre (ou Ctrl K) ouvre une fenêtre au centre de l'écran ; on peut écrire tout de suite et
   elle reste ouverte pendant la saisie. Vide : colonies ouvertes récemment et actions rapides. En tapant : résultats
   rangés par type avec leur nombre, filtre par type, mot surligné. ↑ ↓ pour parcourir, Entrée pour ouvrir, Échap pour
   vider puis fermer, clic à côté pour fermer.
   *Bug corrigé* : depuis la v5.32, le voile gris de la recherche passait au-dessus du champ ; le clic suivant tombait sur
   le voile et refermait la recherche, qui semblait « disparaître ».
4. **Ruchers › Filtrer et trier** : le panneau ne prend plus de place tant qu'on ne l'ouvre pas (le tableau a toute la
   largeur). Le bouton « Filtrer et trier » l'ouvre par-dessus la liste, sans défilement : tri en six boutons avec
   « Inverser », état, rucher, alertes en puces, reine, « Voir N colonies ». Les filtres s'appliquent tout de suite. Sur un
   écran peu haut, le panneau passe sur deux colonnes. « Garder ouvert » (épingle) le range à côté de la liste ; le choix
   est gardé sur l'appareil.

Technique : `navigation-ordi.js` et `styles/55-navigation-ordi.css` (chargés après `compact.js`) ; `Noyau.ruches.nbAVoir()`
(`src/main.js`, `vue-tableau.js`) ; panneau dans `vue-tableau.js` / `51-ruches-tableau.css` (actions `tbepingle`, `tbsens`) ;
raccourci N : le bouton API est aussi cherché dans la barre du haut (`ergonomie.js`). L'ancienne barre de recherche
(`#erQ`) n'est plus affichée sur ordinateur. Le bandeau garde la couleur choisie dans Réglages.
Tests : nouveau scénario `etapes_nv` ; `etapes_tb`, `etapes_cp`, `etapes_eg` adaptés.

### À vérifier
- Ordinateur : cliquer dans la barre de recherche, taper « 12 » ou un nom de client : la fenêtre reste, les résultats suivent.
- Ctrl K depuis n'importe quel écran ; Échap deux fois ; clic à côté.
- Menu : Replier / Déplier, recharger la page : le choix reste. Compteurs Agenda et Ruchers.
- « Demander à API » ouvre le choix d'API ; la touche N aussi.
- Ruchers sur un portable : « Filtrer et trier » s'ouvre entier, sans défiler ; épingler, recharger.
- Téléphone : menu, recherche par la loupe et feuille « Filtrer et trier » comme avant.

## v5.49 · à publier en recette · visite rapide (IT-08 réduite)
**Migration 023** (`023-visite-rapide.sql`) : à appliquer sur `apidoo-test` (la mise en ligne en recette le fait), puis sur
`apidoo` avec l'accord de Pierre-Louis. Additive, **ne casse pas l'ancienne version**. Maquette validée le 15 nov. 2026 ;
version réduite décidée le même jour (modèles personnalisables, notes de caractère et météo enregistrée reportés).

Pour l'apiculteur :
1. **Visite express à neuf points** : force (1 à 5), œufs vus, cellules royales (aucune, ouvertes, operculées) s'ajoutent.
   Sous chaque valeur reprise : « comme le 12/05 ». La force se reprend ; les œufs, les cellules et la reine jamais
   (« à regarder »). Un second toucher efface un choix facultatif. Un chrono montre la durée de la visite.
2. **Essaimage** : des cellules royales operculées affichent un avertissement ; à l'enregistrement, une tâche
   « Surveiller l'essaimage · Ruche 4 » est proposée (échéance dans 6 jours, modifiable : repère, pas une règle). L'accueil
   montre « Essaimage à surveiller » tant que la dernière visite de la colonie note des cellules operculées ; le tableau
   des ruches la passe en « Urgent ».
3. **Journal** : les valeurs reprises d'une visite express sont en retrait avec « reprise » ; la ligne dit la durée et
   le nombre de points observés. Cellules, œufs et force ont leurs puces.
4. **Visite gardée** : la visite en cours (express ou complète) est gardée sur le téléphone à chaque saisie. Après un
   appel, une application fermée ou un rechargement, l'accueil propose « Reprendre la visite de Ruche 4 » (Reprendre /
   Oublier). Gardée 48 h ; oubliée à l'enregistrement et à « Annuler » ; rien n'est gardé tant que rien n'est saisi.
5. **Tournée, modèle Hiver** : au départ, « Quelle visite ? » Standard ou Hiver. Hiver ne demande que le poids et
   l'activité (« comme le 28/10 : 31 kg », écart de poids, chrono par ruche) ; le reste est repris de la dernière visite
   et enregistré comme non observé. Hiver est proposé par défaut de novembre à février ; le choix est retenu.
   Standard gagne les trois champs (repliés en mode manuel, question « Des cellules royales ? » en mode questions,
   compris à la voix).
6. **Formulaire complet** : section « Force, œufs, cellules royales » ; durée de saisie enregistrée.
7. **Dictée** : « cellules operculées », « pas de cellules », « des œufs », « pas d'œufs », « force quatre ».

Technique :
- 023 : `visites.force` (1 à 5), `oeufs_vus` (vide = pas regardé), `cellules_royales` (liste fermée) ; `creer_visite()` de
  020 plus ces champs, refus en français hors liste. Aucune table, aucune fonction nouvelle.
- `src/domaines/visites/regles.js` (neuf points, `alertesEssaimage`, `tacheEssaimage`, conversions), `essaimage.js`
  (feuille, carte d'accueil), `brouillon.js` (garde IndexedDB dans la base locale du hors ligne, magasin `kv`, une
  ligne par exploitation ; pont `window.VB` pour `visites-groupees.js` et `nav4.js`), `express.js`, `tournee.js`
  (`MODELES`, durée par ruche, `observes` en Hiver), `ux.js`, `voix.js`, `colonies/tableau.js`, `offline.js` (`HL.kv`).
  Aucune nouvelle surcharge `window.*` : écran « visite » et accueil complétés dans `src/domaines/*/ecrans.js`.
- Tests : SQL `test_023.mjs` (16) ; unitaires `visites.test.mjs` (+6) ; bout en bout `etapes_vq` (nouveau, 33
  vérifications, captures 375 et 1 280 px), `etapes_ve` et `etapes_tn` mis à jour.

### À vérifier
- Fiche d'une ruche déjà visitée › Visite express : neuf lignes, « comme le … » sous les valeurs reprises, chrono qui tourne.
- Cellules royales « Operculées », enregistrer : feuille « essaimage possible », tâche dans l'agenda ; accueil : carte
  « Essaimage à surveiller ».
- Commencer une visite, fermer l'application depuis le sélecteur d'applis, la rouvrir : « Reprendre la visite de … ».
- Tournée d'un rucher : Hiver présélectionné en novembre ; seuls poids et activité ; bilan.
- Tournée Standard au doigt : tout tient sur l'écran, « Force, œufs, cellules royales » replié.
- Ancienne version de l'app ouverte en parallèle : une visite s'enregistre toujours (champs vides).

## v5.48 · à publier en recette · En-têtes de rubrique alignés ; calendrier stable au doigt, « Qui s’en occupe » en liste
Deux PR fusionnées sous ce numéro : #72 (agenda) et #73 (en-têtes). La fusion de #73 avait effacé la rubrique de
l'agenda : elle est rétablie à la fin de cette section (« Agenda »). Correctif dans la v5.50 : titre des écrans à
onglets à 27 px sur téléphone (il était à 30 px).

### En-têtes de rubrique alignés
Aucune migration. Maquettes du 16 nov. 2026, validées par Pierre-Louis.

Dans les écrans à onglets (Matériel, Finances, Registre et déclaration, Réglages), passer d'un onglet à l'autre faisait
sauter l'écran : le titre, la phrase dessous, les onglets et les filtres changeaient de place (mesuré sur `main` à
390 px : onglets de 130 à 210 px selon l'onglet, jusqu'à 80 px d'écart). Causes : surtitre « Liste de courses » et
bandeau sur Courses, ligne d'état absente sur Fournisseurs et Réglages, puce d'année et ⋯ passés à la ligne sous le
titre sur téléphone, lien « Voir la liste de courses » au-dessus de la recherche.

Désormais (gabarit commun, `src/noyau/gabarit.js` étape 1 bis et 3 bis, `styles/composants/gabarit.css`) :
- **En-tête de hauteur fixe** : le titre du sujet sur une ligne, toujours une seule ligne d'état (coupée par « … » si
  elle est trop longue), ⋯ et bouton principal à droite. Plus de surtitre. « Registre et déclaration » en un peu plus
  petit pour tenir à côté de ⋯.
- **Onglets au même endroit** sur chaque onglet, à 390 comme à 1 280 px.
- **Barre d'outils sous les onglets**, au même endroit : année, choix de vue (Financier / Opérationnel, Traitements /
  Mouvements…), recherche, puces de filtre, dans cet ordre. Les parties du registre défilent sur une ligne au lieu
  de passer sur deux.
- **Courses vide** : carte « Rien à racheter » au lieu d'un écran blanc.
- Lignes d'état ajoutées : Fournisseurs (« Aucun fournisseur pour l'instant ») et Réglages.

Test : `etapes_ar` mesure la place du titre, de la ligne d'état, du bas de l'en-tête, des onglets et de la barre
d'outils sur chaque onglet des 4 sujets, à 390 et 1 280 px (aucun pixel d'écart). Règle 11 du gabarit dans
`docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §5.

### À vérifier
- Téléphone, Matériel : passer de Stock à Courses puis Fournisseurs : « Matériel », la phrase et les onglets ne bougent
  pas ; sur Stock, la recherche commence juste sous les onglets.
- Courses sans article à racheter : carte « Rien à racheter ».
- Finances : la puce « 2026 » et Financier / Opérationnel sous les onglets, au même endroit sur Bilan, Dépenses, Budget.
- Registre : Traitements, Mouvements, Interventions, Exploitation sur une ligne (glisser pour voir la suite).
- Ordinateur : mêmes vérifications ; le bouton principal reste à droite de l'en-tête.

### Agenda : calendrier stable au doigt, « Qui s’en occupe » en liste des personnes
Aucune migration.

- **Calendrier qui s’ouvrait et se refermait aussitôt sur téléphone** (signalé par Pierre-Louis le 15 nov., fiche
  « Ajouter une tâche »). Le calendrier s’ouvre dès que le doigt se pose ; au relâché, le navigateur envoie un clic à
  l’endroit touché, qui tombait sur le fond du calendrier tout juste ouvert et le refermait (ou choisissait un jour s’il
  tombait sur la grille). Ce clic est désormais avalé (`calendrier.js`), et toucher à côté ne ferme que si le doigt
  s’est posé à côté. Souris et clavier inchangés.
- **« Qui s’en occupe » (tâches) : liste des personnes de l’exploitation** au lieu d’une saisie libre : membres ayant
  un prénom, puis personnes sans compte (Réglages › Membres et associés), comme « Acheté par ». Choix « Personne en
  particulier » par défaut ; un nom déjà saisi qui n’est plus dans la liste reste proposé. Sans personne connue (base
  sans 021, hors ligne au premier chargement) : saisie libre comme avant.

#### À vérifier (agenda)
- Téléphone : toucher un champ date (Échéance d'une tâche, date d'une visite…) : le calendrier reste ouvert ; toucher
  à côté le ferme ; un jour se choisit normalement.
- « Ajouter une tâche » : « Qui s’en occupe » propose les membres et les personnes sans compte.

## v5.47 · à publier en recette · correctif : une seule cloche sur téléphone
Aucune migration. Sur téléphone, une deuxième cloche apparaissait sous la barre du haut (Agenda et tous les écrans) :
le bandeau de l'ordinateur (recherche et cloche, v5.44) s'affichait aussi sur téléphone, parce qu'une règle de
`styles/composants/menu.css`, chargée en dernier, l'affichait sans condition de largeur. La règle ne vaut plus qu'au-delà
de 800 px. Test : `etapes_ra` vérifie une seule cloche visible, à 390 px et à 1 280 px.

### À vérifier
- Téléphone : une seule cloche, en haut à droite à côté de l'avatar ; plus de bande vide au-dessus du titre.
- Ordinateur : la cloche à droite de la barre de recherche.

## v5.46 · à publier en recette · correctif : styles du gabarit commun rechargés
Aucune migration. **Bloquait la mise en ligne** : « Vérifier » était rouge sur `main` depuis la fusion de #69, et
« Mise en ligne » refuse de publier un commit rouge.

En fusionnant `main` dans la branche météo (#69), le conflit sur `index.html` a été résolu en gardant seulement la
ligne de la météo (`54-meteo-jour.css`) : les feuilles `styles/composants/gabarit.css` et `menu.css` (v5.43, v5.44)
n'étaient plus chargées. Effets : bouton principal affiché deux fois sur téléphone, liste « Année » à côté de la puce,
volet du Menu et onglets sans leur mise en page. Les deux lignes sont remises, après la météo (le gabarit reste chargé
en dernier). La même fusion avait effacé les rubriques v5.43 et v5.44 de ce journal : elles sont rétablies.

Garde-fou : test unitaire `index-styles.test.mjs` : chaque feuille de `styles/` et `styles/composants/` doit être
chargée par `index.html`, et le gabarit en dernier.

### À vérifier
- Téléphone, Dépenses : un seul « Ajouter une dépense » en bas, la puce « 2026 » seule.
- Menu : la recherche et 5 entrées, avec leur icône et leur sous-titre.

## v5.45 · à publier en recette · Météo du rucher en un écran, sans saut
Aucune migration. Maquettes du 15 nov. 2026, piste A validée par Pierre-Louis.

**Saut d'écran corrigé** : toucher un jour redessinait tout l'écran ; l'en-tête changeait de hauteur (phrase sur 1 ou 2
lignes, bouton « Prévoir » présent ou non), le ruban des jours revenait au début et les animations rejouaient (mesuré :
la page remontait de 163 px en deux touchers). Désormais, toucher un jour ou une heure ne met à jour que la zone du jour
et le bouton du bas ; l'en-tête, le verdict et le bouton gardent leur hauteur. Une prévision rafraîchie pendant la
lecture ne redessine plus l'écran non plus.

**Présentation** :
- Titre stable « Météo » ; « Maintenant » sur une ligne (température, verdict, pourquoi).
- Les 5 jours tiennent dans la largeur, sans défilement, chacun avec une case par heure de visite (10 h – 16 h) et le
  nombre d'heures bonnes.
- Verdict du jour choisi en une phrase : « Ouvrir de 12 h à 14 h », « Visite rapide de 10 h à 16 h » ou « Pas de
  créneau » avec la raison (« Pluie toute la journée (jusqu'à 85 %) ») et le meilleur autre jour.
- Heures en lignes de 48 px : ciel, température, pluie, vent, puce Ouvrir / Rapide / Attendre ; la valeur qui empêche
  d'ouvrir est en couleur (rafales affichées quand le vent est trop fort). Toucher une heure bonne la choisit.
  « Voir de 8 h à 20 h » sur demande.
- Bouton principal toujours en bas : « Prévoir une visite aujourd'hui à 12 h », ou « Voir mardi : 6 h pour ouvrir ».
- Retirés : phrase-titre, bandeau « prochain créneau », frise à 13 colonnes, détail d'une heure, liste des créneaux,
  tableau replié (tout est dans les lignes). La frise courte de la carte du rucher ne change pas.

Technique : `essentiels.js` (`VUES.meteo`, `majJour`), `styles/54-meteo-jour.css`, règles pures `causes()` et
`resumeJour()` dans `src/domaines/meteo/regles.js` (tests unitaires). Tests : `etapes_mt` réécrit (dont « la page ne
bouge pas » au toucher d'un jour), `etapes_ab` et `etapes_ac` adaptés.

### À vérifier
- Un rucher placé sur la carte › « Voir heure par heure » : les 5 jours se voient sans faire défiler de côté.
- Faire défiler un peu, toucher plusieurs jours : rien ne bouge, seuls le verdict, les heures et le bouton changent.
- Un jour de pluie ou de vent : la valeur en cause est en rouge ; le bouton propose le meilleur jour.
- Toucher une heure verte : le bouton du bas passe à cette heure ; « Prévoir » prépare la tâche au bon jour.

## v5.44 · à publier en recette · rationalisation des écrans : un écran par sujet, menu à 5 entrées
Aucune migration. Audit du 14 nov. 2026, étape 3 ; maquettes « Rationalisation » du 15 nov. 2026 (s'appuie sur la v5.43).

Un sujet = un écran, avec des onglets ; le reste devient une feuille du bas ou un onglet. Aucune fonction supprimée,
aucune adresse cassée (les anciennes routes ouvrent le bon onglet).
1. **Menu** : 18 entrées → **8 sur ordinateur** (Accueil, Agenda, Ruchers, Miel, Finances, Matériel, Registre et
   déclaration, Réglages) et **5 dans le volet du téléphone**, avec la recherche en tête et ce que contient chaque
   entrée.
2. **Finances** : un écran, quatre onglets (Bilan, Dépenses, Budget, Associés). **Matériel** : Stock, Courses,
   Fournisseurs (la liste de courses n'est plus un détail avec retour). **Registre et déclaration** : un écran, deux
   onglets. **Réglages** : Réglages, Équipe. Les onglets propres à un écran (Financier / Opérationnel) prennent le style
   d'un choix de vue : un seul rang d'onglets.
3. **Rappels** : la cloche ouvre une feuille (ouvrir un rappel, tout marquer comme vu) ; l'écran Rappels garde les
   réglages et se trouve sous Réglages.
4. **Visite** : une bascule **Express / Complète** en tête des deux formulaires, pour la même ruche.
5. **Déplacer** des colonies sélectionnées (appui long dans Ruchers) : une feuille (vers, date, motif) au lieu d'un
   écran ; l'écran complet reste pour choisir les colonies une à une.
6. **Miel** : l'onglet « Stock et lots » devient « Stock et récoltes » ; titre « Miel » partout ; icône du pot dans le
   menu de l'ordinateur.

Arborescence : `docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §2 (décision notée) ; `docs/GUIDE.md` mis à jour.
Technique : `navigation.js` (catégories, volet), `src/noyau/gabarit.js` (`SUJETS`, `sujetDe()`, onglets sous
l'en-tête), `essentiels.js` (feuille Rappels), `visites/express.js` (bascule), `ruchers/deplacer.js` (`feuille()`),
`styles/composants/menu.css`. Tests : unitaires `gabarit.test.mjs` (5) ; bout en bout `etapes_ra` (nouveau,
15 vérifications) ; scénarios adaptés au nouveau menu.

### À vérifier
- Téléphone, Menu : la recherche et 5 entrées ; Finances s'ouvre sur Bilan, les onglets passent à Dépenses, Budget,
  Associés sans changer de titre.
- Matériel › Courses ; Registre et déclaration › Déclaration ; Réglages › Équipe.
- Cloche : la feuille Rappels ; toucher un rappel ouvre la ruche, la tâche ou la vente.
- Visite d'une ruche déjà visitée : passer d'Express à Complète et retour.
- Ruchers, appui long sur 2 colonies › Déplacer : la feuille, puis la fiche du rucher de destination.

## v5.43 · à publier en recette · gabarit d'écran commun
Aucune migration. Audit « ergonomie et uniformisation » du 14 nov. 2026, étape 2 (s'appuie sur la v5.42).

Le même squelette sur tous les écrans, posé par un seul module au lieu de chaque écran à sa façon :
1. **En-tête** : un seul retour « ‹ Parent » (plus de fil d'Ariane « Finances › Dépenses », plus de « ‹ Gestion »), et
   seulement pour un écran de 2e niveau ; le titre est un nom (« Dépenses », « Matériel », « Rappels »), la phrase passe
   dessous (« 0 € dépensés en 2026 »).
2. **Un seul bouton principal** : en bas sur téléphone, au-dessus du menu ; à droite du titre sur ordinateur. Les
   autres boutons de l'en-tête et des barres du bas (Fichier comptable, Faire l'inventaire, Exporter, Associés…) vont
   dans **⋯**, qui ouvre la feuille « Actions ».
3. **Fiche ruche** : « Nouvelle visite » (ou « Visite express » si la ruche a déjà une visite) et un bouton **+**
   (Visite complète, Tâche). La barre fait une ligne au lieu de deux.
4. **Année** : une puce « 2026 ▾ » ouvre la liste des années (Dépenses, Bilan, Budget, Registre…).
5. **Santé** : le seuil d'alerte varroa passe dans ⋯ (feuille de saisie) ; la liste des ruches à compter vient tout de
   suite ; Registre et Déclaration restent dans le Menu.
6. **Agenda** : « Filtrer » ouvre une feuille (Visites, Tâches, Ventes, Récoltes, En retard) au lieu d'une rangée qui
   débordait ; Mois / Semaine prennent le style des autres choix de vue.
7. **Dépenses** : un seul nom, « Ajouter une dépense », et un seul bouton (plus de second bouton au milieu).
8. **Jetons** : 4 rayons, textes de 12 px minimum (30 tailles plus petites relevées), couleurs de la charte par variables
   (72 valeurs), cibles de 44 px pour le retour et ⋯.

Technique : `src/noyau/gabarit.js` (règles pures + habillage, dernier crochet « après le rendu »),
`styles/composants/gabarit.css`, `styles/jetons.css` ; retraits : fil d'Ariane d'`ergonomie.js` et de
`navigation.js`, retours de `nav4.js`, flèches d'année de `compact.js`, liens Registre/Déclaration de Santé
(`alveoles.js`). Règles : `docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §5 ; liste à cocher des PR d'écran :
`docs/PROCESSUS.md`. Tests : unitaires `gabarit.test.mjs` (4) ; bout en bout `etapes_gb` (nouveau, 17 vérifications) ;
`ab`, `al`, `as`, `eg`, `lc`, `mt`, `n4`, `nk`, `op`, `rg`, `rp`, `ru`, `st`, `v4`, `vt` adaptés (aides `cliquer()`,
`existe()` et `entete()` dans `test_hl.py` : un bouton rangé dans ⋯ se trouve par la feuille « Actions »).

### À vérifier
- Dépenses, Matériel, Bilan : titre court, phrase dessous, un seul gros bouton en bas, ⋯ en haut à droite.
- Fiche ruche : « Visite express » et + (Visite complète, Tâche) ; sur ordinateur, les mêmes boutons en haut.
- Santé : ⋯ › Seuil d'alerte varroa. Agenda : Filtrer. Dépenses : puce 2026.
- Liste de courses, Lot, Météo : « ‹ Matériel », « ‹ Miel », « ‹ … » en haut à gauche.

## v5.42 · à publier en recette · correctifs bloquants de l'audit du 14 nov. 2026
Aucune migration. Audit « ergonomie et uniformisation » (canvas du 14 nov. 2026), étape 1.

1. **Rucher d'exemple débloqué** : « Voir un rucher d'exemple » restait sur « Bienvenue ! Comment tu t'appelles ? » ;
   « Continuer » répondait « rien n'est enregistré » sans avancer (l'écriture du profil est refusée en démo). La démo
   saute maintenant l'inscription (prénom d'exemple) et ouvre directement l'accueil.
2. **Fiche ruche** : le bouton « Visite complète » était invisible (texte blanc sur la barre claire, style fait pour
   un fond sapin). Il reprend le style d'un bouton normal.

Technique : `profil.js` (`exemple()`, appelé par `demarrage.js` au lancement de la démo), `visites/express.js`.
Test : bout en bout `etapes_dx` (nouveau, 4 vérifications).

### À vérifier
- Déconnecté, « Voir un rucher d'exemple » : l'accueil s'ouvre tout de suite, bandeau « Rucher d'exemple ».
- Fiche d'une ruche déjà visitée : « Visite express » et « Visite complète » se lisent tous les deux.

## v5.41 · à publier en recette · listes de choix : puces, liste sous le champ, feuille de choix
Aucune migration. Maquettes du 15 nov. 2026, « mélange recommandé » validé par Pierre-Louis.

Les 16 champs à suggestions de l'app passaient par la liste native du navigateur (sur Android : une bande coupée
au-dessus du clavier, sans contexte). Un composant unique, « Choisir », les remplace tous automatiquement :
- **Puces sous le champ** (8 choix ou moins) : tous les choix visibles, un toucher remplit le champ, un second le vide
  (champ facultatif) ; « Autre… » rouvre la saisie libre, la valeur reste ensuite dans la puce. Rucher, type de ruche,
  unité, format du pot, moyen de paiement entre associés…
- **Choix multiple** : les étiquettes d'un client se cochent (plus de « séparées par des virgules »).
- **Liste sous le champ** (plus de 8 choix) : filtre à chaque lettre, accents ignorés, partie tapée en gras, flèches
  et Entrée au clavier, « Garder « … » » pour une valeur nouvelle ; sur téléphone, le champ remonte en haut pour que la
  liste tienne au-dessus du clavier. Traitement d'une visite, miel d'une récolte et de la mise en pots, nom d'un article.
- **Achat** : au-delà de 8 articles, « Choisir dans tes articles » ouvre une **feuille de choix** plein écran
  (recherche, familles, groupe « À racheter », stock de chaque article, plusieurs cases d'un coup, Échap pour annuler).
  Le nom d'un nouvel article propose d'abord tes articles avec leur stock, puis le catalogue ; choisir un article qui
  existe déjà y rattache la ligne (plus de doublon).

Les menus déroulants classiques (`<select>`, 28) ne changent pas encore.

Technique : `src/noyau/choisir.js` (règles pures + transformation des `<input list>` dès qu'ils apparaissent, le vrai
champ reste celui du formulaire), `styles/53-choisir.css`, `sheet()` (`multiple`), `achat.js` (feuille, suggestions,
rattachement). Tests : unitaires `choisir.test.mjs` (7) ; bout en bout `etapes_ch` (nouveau, 23 vérifications).

### À vérifier
- Téléphone, Ajouter des ruches : rucher et type en puces ; « Autre… » pour un type nouveau.
- Fiche client : cocher deux étiquettes, enregistrer, rouvrir.
- Ajouter un achat : « Choisir dans tes articles », cocher 2 ou 3 articles ; « + Nouvel article », taper « pot » :
  la liste s'affiche sous le champ, au-dessus du clavier, sans la bande d'Android.
- Visite : produit de traitement ; Récolte : miel.

## v5.40 · à publier en recette · Ruchers sur téléphone : liste dense et alvéoles, une seule barre
Aucune migration. Maquettes « Réagencement mobile » du 14 nov. 2026, pistes B et C retenues par Pierre-Louis.
Constat : sur un téléphone de 844 px, 7 bandes empilées laissaient 3 colonies visibles en tableau, et aucune dans
l'affichage par rucher. Maintenant (15 colonies, 2 ruchers) : 8 en liste, 15 en alvéoles, 8 en tableau.

Pour l'apiculteur :
1. **Une seule barre** sous les onglets : « Filtrer et trier », des raccourcis avec leur nombre (Toutes, À voir,
   Varroa, Sans reine…), et le choix **Liste / Alvéoles / Tableau**, gardé sur l'appareil.
2. **Liste** (par défaut sur téléphone) : une ligne par colonie (54 px), rangée par rucher. La ligne dit ce qui demande
   de l'attention, ou la force, la reine et le dernier poids ; à droite le varroa et les jours depuis la visite.
   Toucher ouvre la fiche, comme avant.
3. **En-tête de rucher** fin : nom (vers la fiche du rucher), nombre de colonies et « à voir », **Tournée** (ou
   Visiter, ou Ajouter des ruches ici), météo en une ligne (ou « Placer sur la carte »).
4. **Alvéoles** : une tuile par colonie, 4 par ligne sur téléphone ; rouge si urgent, miel si à voir, avec la raison en
   clair (Orpheline, Varroa 5 %, 40 j sans visite…).
5. **Filtrer et trier** : une seule feuille pour le tri, le rucher, l'état, les seuils d'alerte, l'année de la reine
   (repliée), « Grouper par rucher » et, en tableau, les colonnes ; « Voir N colonies » reste en bas.
6. **Appui long** sur une colonie (ou ⋯ › Sélectionner) : la barre devient « N sélectionnées · Déplacer · Visite
   groupée ». Plus de colonne de cases sur téléphone (le tableau garde ses cases).
7. **Téléphone** : plus de titre au-dessus des onglets ; Nouveau rucher, Ajouter des ruches, Déplacer, Sélectionner et
   Exporter dans le bouton **⋯** des onglets. La recherche se fait avec la loupe du haut (nom ou code).
8. **Ordinateur** : inchangé pour l'essentiel (titre et boutons, filtres à gauche, tableau par défaut) ; la liste et les
   alvéoles y sont aussi.
9. La bascule « Par rucher / Tableau » (v5.37) disparaît. Les ruches sorties et les ruchers archivés restent en bas de
   la liste et des alvéoles.

Technique : `src/domaines/ruchers/vue-tableau.js` (trois présentations, barre, feuille, menu ⋯, appui long),
`src/domaines/colonies/tableau.js` (raisons typées, `court`, `grouper`, tests), `nav4.js` (`basRuchers`, bas de liste
partagé), `meteo.js` (`MT.ligne`, météo en une ligne), `styles/51-ruches-tableau.css`. Préférence sur l'appareil :
`localStorage["apiviz-ruches-presentation"]` (l'ancienne clé ne sert plus qu'aux colonnes). Action `tbgrouper` permise
en lecture seule ; `tbvue` retirée. Scénarios adaptés : `etapes_tb` (réécrit), `n4`, `ru`, `rc`, `ct`. Guide, roadmap 05
§2 (décision notée) et astuce mis à jour.

### À vérifier
- Téléphone : Ruchers › Liste s'ouvre en Liste ; combien de colonies se voient sans faire défiler ; la météo s'affiche
  en une ligne dans l'en-tête de chaque rucher (touche-la : heure par heure).
- Raccourci « À voir » puis second toucher ; « Filtrer et trier » : trier par varroa, décocher « Grouper par rucher ».
- Alvéoles : tout un rucher sur l'écran, les urgentes en rouge.
- Appui long sur une ruche, puis toucher une deuxième : « Visite groupée » ouvre la visite pour les deux.
- Bouton ⋯ : Nouveau rucher, Ajouter des ruches, Exporter.
- Ordinateur : tableau comme avant, liste et alvéoles disponibles.
- Lecture seule : présentations et filtres marchent ; ni appui long, ni « Tournée », ni « Nouveau rucher ».

## v5.39 · à publier en recette · supprimer son compte depuis l'app, sauvegarde prête à activer
**Migration 022** (`022-suppression-compte.sql`) : additive, ne casse pas l'ancienne version. Appliquée par la mise en
ligne (recette, puis production). Sans 022, l'écran garde l'ancien message.

- **Supprimer mon compte** (Réglages › Mon profil) : l'écran dit ce qui part. Les exploitations dont on est la seule
  personne inscrite sont effacées avec toutes leurs données et leurs photos ; on quitte celles qu'on partage, dont les
  données restent (si on en était le dernier responsable, la personne inscrite depuis le plus longtemps le devient, un
  membre avant un lecteur). Profil et compte de connexion effacés. Il faut écrire SUPPRIMER, et avoir du réseau. Les
  photos sont effacées du stockage avant la base ; si cela échoue, rien d'autre n'est supprimé. L'appareil oublie
  ensuite le prénom et les fiches récentes, puis se déconnecte. Exigé par le RGPD (droit à l'effacement) et par les
  boutiques (App Store 5.1.1 (v), Google Play) pour une app où l'on crée son compte.
- **Politique de confidentialité** : la rubrique « Vos droits » décrit la suppression depuis l'app (elle renvoyait vers
  une adresse e-mail encore à compléter).
- **Sauvegarde quotidienne chiffrée** de la base de production (action « Sauvegarde », décision D-03) : copie contrôlée,
  chiffrée avec `age` (clé privée gardée hors ligne par le responsable), envoyée dans un seau Cloudflare R2, gardée
  30 jours. **Inactive tant que la clé et le seau ne sont pas créés** : marche à suivre dans `docs/PROCESSUS.md` §
  Sauvegardes.
- Mémo `migrations/a-appliquer-en-production.txt` et tableau de `migrations/README.md` remis à jour (020 et 021 en place
  partout depuis le 14 nov.).

Technique : `compte_a_supprimer()`, `supprimer_mon_compte('SUPPRIMER')` (`security definer`, adresse vérifiée de la
personne connectée seulement ; `postgres` peut effacer dans `auth.users`, vérifié sur apidoo-test). Tests : SQL
`test_022` (22 vérifications), `test_appliquer` adapté ; bout en bout `etapes_sc` (nouveau).

### À vérifier
- En recette, avec un compte d'essai seul dans son exploitation : Mon profil › Supprimer mon compte. L'écran annonce
  l'exploitation effacée ; sans « SUPPRIMER », rien ne se passe ; avec, retour à l'écran de connexion. Se reconnecter
  avec la même adresse : aucune exploitation, l'inscription repart de zéro.
- Avec un compte d'essai membre d'une exploitation partagée : après suppression, l'exploitation et ses données sont
  toujours là pour l'autre membre, qui devient responsable s'il ne l'était pas.

## v5.38 · à publier en recette · écrans opérationnels : Matériel en tableau, inscription et profil, réglages sans listes
Maquettes du 13 et 14 nov. 2026, validées par Pierre-Louis le 14 nov. 2026. **Migration 021** (profils, noms des membres,
étiquettes des clients) : additive, **ne casse pas l'ancienne version** ; **pas encore appliquée sur `apidoo-test`**
(l'application directe depuis la session Claude a été refusée) : la mise en ligne en recette de la branche l'applique
si le secret `BASE_RECETTE` existe, sinon à coller dans le SQL Editor. Sans 021, l'app marche comme avant pour le nom
(prénom gardé sur l'appareil) et sans inscription ; tout le reste de la version fonctionne.

Pour l'apiculteur :
1. **Matériel en tableau ou en liste** (bascule gardée sur l'appareil) : article, stock, seuil, prix unitaire,
   fournisseur ; recherche ; puces avec leur nombre (Tout, À commander, chaque famille) ; articles à commander en tête,
   sur fond miel. **Stock au doigt** : − / + dans la case, le chiffre change tout de suite, « Annuler » juste après ;
   l'écart part en une seule correction (mouvement « inventaire ») après une pause.
2. **Plus d'Opex / Capex** à l'écran (Matériel, fiche article, achat), ni de durée d'amortissement ni de poste : la
   nature et le poste se déduisent de la famille (une hausse, un extracteur sont des équipements ; reconnus aussi par
   leur nom). Le fichier comptable garde la nature (« Équipement amorti », 5 ans par défaut).
3. **Fiche article simplifiée** : stock et « Me prévenir sous » avec − / +, famille, nom, prix, unité, contenance d'un
   pot vide, fournisseur habituel, ce qui a bougé.
4. **Inventaire** (Matériel › Faire l'inventaire) : « Prévu / Compté » par famille, écart affiché en tapant, cases vides
   ignorées, « Enregistrer N écarts ».
5. **Liste de courses** (Matériel › Voir la liste de courses) : articles sous leur seuil par fournisseur, quantité
   proposée (deux fois le seuil moins le stock, arrondie) à ajuster, montant estimé ; « Envoyer la liste » (partage ou
   copie) ; « C'est acheté » ouvre l'achat déjà rempli.
6. **Achat** : « Acheté par » et « Payé avec » en puces (Ma poche, Poche de…, Compte de l'exploitation) ; la famille et
   « Stock +N » sous chaque ligne ; frais de port classés « Frais ».
7. **Inscription, une seule fois** (migration 021) : « Bienvenue ! Comment tu t'appelles ? » (prénom, nom, 15 ans ou
   plus), puis « Pour mieux te connaître », tout facultatif avec « Passer » : tranche d'âge, sexe, code postal
   (département affiché), ancienneté, activité, nombre de colonies, comment tu as connu Apiviz, nouveautés par e-mail
   (non par défaut). Une personne sans exploitation enchaîne sur les trois questions de création du rucher.
8. **Mon profil** (Réglages › Toi) : nom, e-mail, lien pour changer le mot de passe ; réponses (modifier, effacer) ;
   « Utiliser mes réponses dans les statistiques d'ensemble » ; nouveautés par e-mail ; télécharger ses données.
9. **Membres et associés** : chaque membre avec son prénom et son nom ; « Ajouter une personne sans compte ». Les
   associés proposés dans les achats et les ventes sont ces personnes : plus de liste de prénoms à taper.
10. **Réglages en cinq groupes** en lignes : Toi · L'exploitation (exploitation, membres et associés, factures) · Sur le
    terrain (météo, rappels, caisses numérotées) · Affichage · Tes données (**fichier comptable** de l'année, sauvegarde,
    autres fichiers). Plus de « Listes » (postes de dépense, cercles de clients, modes de paiement) ni de blocs « Toi » et
    « Associés ».
11. **Clients en tableau ou en liste** (Miel › Clients) : étiquettes, dernier achat, total de l'année, reste à payer ;
    recherche ; puces À encaisser et par étiquette ; ceux qui doivent en tête. La fiche client a des **étiquettes libres**
    à la place du cercle.
12. **Dépenses en journal** : total de l'année en titre, tuiles par catégorie, puces (catégorie, personne qui a acheté,
    sans facture), tableau date · libellé · catégorie · par · montant ; « Fichier comptable » et « Ajouter un achat ».

Correctif : l'écran Membres pouvait se redessiner sans fin quand un autre rendu arrivait pendant son chargement
(`exploitations.js`, un seul chargement à la fois).

Technique : règles pures `src/domaines/materiel/regles.js` (puces, groupes, liste de courses, inventaire, type et
poste déduits de la famille), `src/domaines/compte/regles-profil.js`, `journalComptable()` (finances/regles.js),
`lignesClients()`, `lignesDepenses()` ; écrans `materiel/catalogue.js` (refait), `materiel/inventaire.js`,
`materiel/courses.js`, `compte/profil.js` (inscription, Mon profil, membres ; crochet « inscription » avant le rendu ;
`window.PF`), `compte/donnees.js`, `ventes/clients-tableau.js`, `finances/depenses-journal.js` ; Réglages dans
`essentiels.js`. Nouvelles routes `inventaire`, `courses`, `profil` (37 écrans). Style `52-operationnel.css`.
Préférences sur l'appareil : `apiviz-materiel-affichage`, `apiviz-clients-affichage`. Actions de consultation, du profil
et de l'inscription permises en lecture seule. Roadmap 05 §2 (décision notée), guide, astuce et politique de
confidentialité (« Votre profil et les statistiques ») mis à jour. Tests : unitaires `operationnel.test.mjs`, SQL
`test_021.mjs`, bout en bout `etapes_op` (nouveau), `etapes_st`, `etapes_eg`, `etapes_ct` adaptés.

### À vérifier
- Appliquer 021 sur `apidoo-test` (mise en ligne en recette de la branche, ou SQL Editor), puis se connecter avec un
  compte de test : l'inscription s'ouvre une fois ; « Passer » à l'étape 2 ; reconnexion : elle ne revient pas.
- Téléphone : Matériel › bascule tableau / liste ; faire défiler le tableau vers la droite (la colonne Article reste) ;
  toucher + trois fois puis « Annuler » ; rouvrir l'app : le stock et l'affichage sont gardés.
- Matériel › Faire l'inventaire : compter deux articles, « Enregistrer 1 écart ».
- Matériel › Voir la liste de courses › « C'est acheté » : l'achat est rempli ; choisir « Acheté par » et enregistrer.
- Réglages : cinq groupes, plus de « Listes » ; « Fichier comptable » s'ouvre dans un tableur.
- Membres : les noms s'affichent ; ajouter puis retirer une personne sans compte ; elle apparaît dans « Acheté par ».
- Miel › Clients : tableau, puis liste ; modifier un client : étiquettes séparées par des virgules.
- Lecture seule : Matériel sans − / +, Mon profil modifiable.

## v5.37 · à publier en recette · Ruchers en tableau (maquettes « Affichage des ruches » du 13 nov. 2026)
Aucune migration. Seulement un affichage : aucune donnée n'est modifiée, rien de nouveau n'est enregistré en base.

Pour l'apiculteur :
1. **Bascule « Par rucher / Tableau »** en haut de Ruchers › Liste. L'affichage par rucher ne change pas ; le choix est
   gardé sur l'appareil.
2. **Tableau** : une ligne par colonie active, avec son état (OK, à surveiller, urgent), sa force (activité à la
   dernière visite), sa reine (année, couleur de marquage, ou absente), son varroa (dernier comptage), ses provisions,
   et les jours depuis sa dernière visite ; au choix aussi le rucher et « À faire » (pourquoi elle demande de
   l'attention). Les valeurs hors seuil sont en rouge.
3. **Recherche et filtres** : par nom ou par code ; feuille « Filtres » (rucher, état, année de la reine, seuils
   d'alerte : varroa au-dessus du seuil, provisions faibles, pas visitée depuis 30 jours) avec le nombre de colonies de
   chaque choix et « Voir N colonies ». Les filtres actifs s'affichent en puces retirables ; sans filtre, des raccourcis
   (À voir, Varroa, Provisions faibles, Sans reine).
4. **Tri** en touchant un en-tête (deux fois pour inverser) ; **colonnes** au choix et lignes compactes.
5. **Lecture** : la colonne Colonie et l'en-tête restent en place au défilement (rien ne passe à côté du nom), la ligne
   **Synthèse** reste en bas de la zone (urgentes et à voir, reines absentes, varroa moyen, provisions faibles, délai
   moyen depuis la visite).
6. **Sélection** : cases à cocher, « tout sélectionner », puis **Visite groupée** (une saisie pour toutes) ou
   **Déplacer** (écran Déplacer prérempli). Pas de cases en lecture seule.
7. **Fiche rapide** en touchant une colonie : ce qui demande de l'attention, six chiffres, les trois dernières visites,
   « Commencer la visite » et « Fiche complète ». Échap ferme.
8. **Cartes** : même liste et mêmes filtres, en cartes (pratique au rucher).
9. **Ordinateur** (1 024 px et plus) : filtres toujours visibles à gauche, menu « Colonnes », « Compact »,
   « Exporter » (fichier pour tableur des colonies affichées), fiche rapide à droite ; Rucher et À faire affichés d'emblée.

Règles : état « urgent » si orpheline, état critique ou varroa au seuil ou au-dessus ; « à surveiller » si état à
surveiller, varroa aux deux tiers du seuil, provisions faibles ou plus de 30 jours sans visite. Aucun seuil nouveau :
seuil varroa réglable (3 % par défaut), deux tiers comme la puce varroa de la fiche, 30 jours comme l'accueil.

Technique : règles pures `src/domaines/colonies/tableau.js` (tests `tests/unitaires/tableau.test.mjs`), écran
`src/domaines/ruchers/vue-tableau.js`, enregistré avec l'écran `ruches` (`src/domaines/ruchers/ecrans.js`, même route :
toujours 34 écrans) ; style `51-ruches-tableau.css`. Actions `tb…` ; celles de consultation sont permises en lecture
seule (`ACTIONS_LECTEUR`), la sélection et les actions groupées non. Préférences sur l'appareil :
`localStorage["apiviz-ruches-affichage"]`. Roadmap 05 §2 (décision notée), guide et astuce mis à jour. Scénario
`etapes_tb`.

### À vérifier
- Téléphone : Ruchers › Liste › « Tableau » ; faire défiler le tableau vers la droite : rien ne passe à gauche de la
  colonne Colonie ; la ligne Synthèse reste en bas, même avec une seule colonie filtrée.
- Filtres : Les Chênes (ou un de tes ruchers) + Urgent, « Voir N colonies », puis retirer une puce.
- Cocher deux colonies : la barre apparaît au-dessus du menu du bas (sans cacher la synthèse) ; « Visite groupée »
  ouvre la visite pour les deux.
- Toucher une colonie : fiche rapide ; « Commencer la visite ».
- Ordinateur 1 280 × 800 : filtres à gauche, fiche à droite, « Exporter » ouvre un fichier lisible dans un tableur.
- Lecture seule : filtres et tri marchent ; pas de cases à cocher ni de « Commencer la visite ».
- Fermer et rouvrir l'app : l'affichage choisi (par rucher ou tableau) est retrouvé.

## v5.36 · à publier en recette · retrouver une ruche : code, origine, recherche par numéro
Aucune migration : les colonnes `ruches.code` et `ruches.origine` existent depuis 016 (vides en production). Recommandation
UX n° 9 du 13 nov. 2026. Ne casse pas l'ancienne version ; sur une base sans 016, les deux champs ne s'affichent pas.

- **Code et origine saisissables** : « Modifier la ruche » propose « Code sur la ruche » (le numéro peint ou gravé sur la
  caisse) et « Origine » (achat, essaim récupéré, division, élevage). Le code s'affiche en tête de fiche (« n° B12 »).
- **Recherche** : le code compte dans la recherche, il est rappelé sous chaque ruche trouvée. Un simple chiffre (« 3 »)
  suffit : il ne montre que les ruches qui portent ce numéro (Ruche 3, pas Ruche 13). Même chose dans la barre de
  recherche de l'ordinateur.
- **Ouvertes récemment** : recherche vide, les 6 dernières fiches ouvertes (gardées sur le téléphone).

Les autres recommandations restantes existaient déjà dans l'app, aucun code ajouté : n° 1 (tournée colonie par colonie,
brouillon sur le téléphone, vérification, bilan : `tournee.js`), n° 2 (bouton API central), n° 4 (priorité d'API avec
ses boutons à l'accueil : `accueil.js`), n° 6 (mode « au doigt » qui repart de la dernière visite, reine à revoir),
n° 7 (fiche : chiffres clés, courbe de poids, message d'API, onglets). Le scan d'étiquette est laissé pour plus tard : il
demande une bibliothèque de lecture de QR code ou l'app native (Capacitor). Le code saisi ici en est la base.

Technique : `v3.js` (`assezLong`, `noterRecent`, `recents`), `ergonomie.js`, `app.js` (`rucheForm`), `ux.js`.
Test : `etapes_rr` (nouveau).

### À vérifier
- Fiche d'une ruche, « ⋯ » : saisir un code et une origine, enregistrer ; le code apparaît en tête de fiche.
- Rechercher : taper le code, puis un seul chiffre ; recherche vide : « Ouvertes récemment ».

## v5.35 · à publier en recette · écrans compacts, agenda en calendrier, sélecteur de date (maquettes du 13 nov. 2026)
Aucune migration. Seulement des écrans : aucune donnée n'est modifiée.

Pour l'apiculteur :
1. **Menu latéral** (ordinateur) : il ne remonte plus en haut quand on choisit une rubrique, garde sa position d'un
   écran à l'autre et se resserre pour tenir sur l'écran. **« Nouvelle visite »** est en tête, à côté du bouton **API**
   (l'ancien bouton +). « Se déconnecter » devient une icône à côté de l'adresse.
2. **Accueil sur ordinateur** : tout tient sur un écran. Bonjour et priorité du jour resserrés, quatre chiffres, puis
   trois colonnes (état des ruches, météo, à faire et dernières actions) qui défilent chacune de leur côté. Sur
   téléphone, le haut de l'accueil est plus serré.
3. **Météo de l'accueil** : les heures du jour sont affichées d'emblée (en lignes sur ordinateur), avec le bon créneau,
   le choix du jour et du rucher. Une bascule « Heures / 5 jours » et un bouton « agrandir » remplacent le lien souligné
   « Voir heure par heure » : il ouvre un panneau avec chaque heure (température, pluie, vent, visite possible ou non)
   et un accès à la page météo complète.
4. **Agenda en calendrier** : vue Mois ou Semaine, avec les tâches à leur échéance (en retard en rouge), les visites,
   les ventes et les récoltes, chacune à sa couleur ; filtres par type. Un clic sur un jour l'affiche à droite (en
   dessous sur téléphone) ; « Ajouter une tâche ce jour » préremplit l'échéance. Les listes d'origine (À faire, idées
   du mois, terminées) restent à côté.
5. **Sélecteur de date** : sur tous les champs date, un calendrier aux couleurs d'Apiviz remplace celui du navigateur
   (sous le champ sur ordinateur, en feuille du bas sur téléphone) : raccourcis « Aujourd’hui / Hier / Il y a 7 jours »
   (« Demain / Dans 7 jours » pour une échéance), aujourd'hui entouré de miel, choix rapide du mois, clavier (flèches,
   Entrée, Échap).
6. **Plus de textes soulignés** : les liens d'action (« Tout voir », « Ouvrir », « Plus tard », fil d'Ariane, « Voir
   les chiffres »…) deviennent des boutons sans soulignement, avec un fond au survol et une flèche quand ils mènent
   ailleurs. Le sélecteur d'année du Bilan a des flèches ‹ ›.

Technique : `compact.js` (menu, accueil, météo, année), `agenda-mois.js`, `calendrier.js` ; styles `48-compact.css`,
`49-agenda.css`, `50-calendrier.css`. Crochets `avantCoquille` / `apresCoquille` / `apresRendu` (aucune surcharge de
`shell()`), chargés après `navigation.js`. Les gestes de navigation (jour, mois, filtres, météo) passent par `data-cp`,
permis en lecture seule ; ouvrir une tâche, une ruche ou une vente garde ses `data-act` et leurs droits. Les champs
restent des `input type=date` (valeur AAAA-MM-JJ) ; `data-cal-natif` garde le calendrier du navigateur sur un champ.

### À vérifier
- Ordinateur 1 280 × 800 et 1 440 × 900 : le menu tient sans barre de défilement ; en bas du menu, choisir « Réglages »
  puis « Équipe » : le menu ne remonte pas.
- « Nouvelle visite » (menu) ouvre la visite ; le bouton API à côté ouvre sa feuille. En lecture seule, « Nouvelle visite » n’apparaît pas.
- Accueil sur ordinateur : rien ne déborde sous la fenêtre ; chaque colonne défile seule. Météo : changer de jour, de
  rucher, « 5 jours », puis le bouton agrandir (panneau, Échap pour fermer).
- Agenda : mois précédent / suivant, « Aujourd’hui », vue Semaine, filtres ; cocher une tâche dans le détail du jour.
- Champs date (visite, vente, tâche, dépense) sur iPhone et Android : le calendrier Apiviz s'ouvre, pas celui du
  téléphone ; la date choisie est bien enregistrée.

## Landing page · apiviz.fr en ligne le 13 nov. 2026 · l'application passe sur app.apiviz.fr
Aucune migration, aucun changement d'écran dans l'application.

- **apiviz.fr** sert désormais la landing page publique (Worker `apiviz-landing`, dossier `landing/`), en ligne depuis
  le 13 nov. 2026 ; `www.apiviz.fr` redirige vers `apiviz.fr`.
- **Production de l'application** : `https://app.apiviz.fr` (Worker `apiviz`) au lieu de `https://apiviz.fr`, pour ne pas
  écraser la landing page. Recette inchangée : `https://recette.apiviz.fr`.
- Avant la bascule de la production : ajouter `https://app.apiviz.fr` aux adresses autorisées dans Supabase (`apidoo`).

Technique : `wrangler.jsonc` (route de production), étape « Publier sur Cloudflare » et contrôle « Le domaine
app.apiviz.fr répond ? » dans `.github/workflows/mise-en-ligne.yml`, dossier `landing/`.

### À vérifier
- `https://apiviz.fr` affiche la landing page ; `https://www.apiviz.fr` redirige vers `https://apiviz.fr`.
- Première mise en ligne production : résumé « Cloudflare : production publiée sur https://app.apiviz.fr/ ».

## v5.34 · à publier en recette · apiviz.fr chez Cloudflare (IT-29, première partie)
Aucune migration, aucun changement d'écran. La mise en ligne publie aussi sur Cloudflare.

- **Recette** : `https://recette.apiviz.fr` (Worker `apiviz-recette`). **Production** : `https://apiviz.fr` (Worker
  `apiviz`). Domaine et serveurs DNS en place depuis le 13 nov. 2026 (OVH → Cloudflare).
- « Mise en ligne » publie la cible sur son domaine Cloudflare, en plus de GitHub Pages, avec les mêmes garde-fous.
  Sans les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`, l'étape est sautée.
- Les liens de connexion et d'invitation suivent l'adresse ouverte (`location.origin`) : rien à changer dans le code,
  seulement les adresses autorisées dans Supabase (avant la recette pour `apidoo-test`, avant la bascule pour `apidoo`).
- GitHub Pages reste en place jusqu'à la bascule de la production ; `www.apiviz.fr` sera ajouté ensuite.

Technique : `wrangler.jsonc`, étape « Publier sur Cloudflare » et contrôle « Le domaine apiviz.fr répond ? » dans
`.github/workflows/mise-en-ligne.yml`.

### À vérifier
- Résumé de l'action : « Cloudflare : recette publiée sur https://recette.apiviz.fr/ ».
- `recette.apiviz.fr` s'ouvre avec le cadenas et l'étiquette RECETTE ; connexion et mot de passe oublié (après le
  réglage Supabase) ; installation et ouverture sans réseau.

## v5.33 · à publier en recette · installer Apiviz sur ordinateur
Aucune migration. Étape 1 de la sortie sur toutes les plateformes (`docs/MOBILE.md`) : Apiviz était déjà installable
sur téléphone ; l'installation sur ordinateur est maintenant guidée elle aussi.

Pour l'apiculteur :
1. **Ordinateur** : le menu du compte propose « Installer sur cet ordinateur » ; l'accueil de démarrage dit
   « Installer Apiviz sur ton ordinateur » (et toujours « sur ton téléphone » sur téléphone).
2. **Mode d'emploi selon le navigateur** : Chrome et Edge (icône d'installation de la barre d'adresse, ou fenêtre
   d'installation directe quand le navigateur la propose), **Safari sur Mac** (Fichier › « Ajouter au Dock »),
   **Firefox** (qui n'installe pas : il renvoie vers Chrome, Edge ou Safari).
3. **Une seule fenêtre** : rouvrir Apiviz installé sur ordinateur ramène la fenêtre déjà ouverte au lieu d'en créer une
   seconde (`launch_handler` du manifeste, Chrome et Edge).

Technique : `nav4.js` (appareils `mac` et `firefox`, `N4.support()`), `demarrage.js`, manifestes production et
recette. Test : `etapes_in` (Chrome, Safari Mac, Firefox, et manifeste).

### À vérifier
- Ordinateur, Chrome ou Edge : menu du compte › « Installer sur cet ordinateur » ouvre la fenêtre d'installation ;
  après installation, la ligne disparaît et Apiviz s'ouvre dans sa propre fenêtre.
- Mac, Safari : le mode d'emploi parle de « Ajouter au Dock ».
- Téléphone : rien ne change (« Installer sur l'écran d'accueil »).

## v5.32 · à publier en recette · visite express et comptes entre associés (maquettes du 12 nov. 2026)
**Migration 020** (`migrations/020-visite-express-reglements.sql`), additive, ne casse pas l'ancienne version. À appliquer
d'abord sur `apidoo-test` ; **en attente pour `apidoo`** (accord de Pierre-Louis). Sans 020, la visite express est
enregistrée comme une visite complète et l'écran « Entre associés » se lit sans pouvoir noter de remboursement.

Pour l'apiculteur :
1. **Visite express** (AP-FEAT-037) : sur la fiche d'une ruche déjà visitée, « Visite express » passe en premier
   (« Visite complète » reste à côté). L'écran reprend la visite précédente : activité, provisions, couvain, poids et
   état sont marqués « repris » ; on touche seulement ce qui change (« changé », l'ancienne valeur barrée) ou ce qu'on
   a revu (« pareil »). Le poids se règle par ± 500 g ou au clavier. **La reine n'est jamais reprise** : elle reste
   « pas cherchée » tant qu'on ne l'a pas regardée (même règle que la tournée).
2. « Enregistrer et passer à Ruche 2 » : la ruche suivante du même rucher, pas encore vue ce jour-là ; ou « Enregistrer
   et revenir à la ruche ». Le message dit la durée (« Visite enregistrée en 12 s »).
3. **Journal** : une visite express affiche « Visite express · repris de la précédente : … », pour distinguer ce qui a
   été vu ce jour-là de ce qui a été reporté.
4. **Entre associés** (menu Finances › Entre associés, ou « Voir le détail » de la carte de Gestion) : le montant à
   régler pour être à égalité (« 36 € · Johan doit à Pierre-Louis »), ce que chacun a avancé de ses fonds propres et
   récolté de ventes, l'argent de vente **à verser à la trésorerie**, et les derniers mouvements (achats, ventes
   encaissées, règlements). En tête, « Associés » ouvre la liste des associés.
5. **Noter le remboursement** (prérempli : qui, à qui, combien) et **Noter le versement** à la société : une fois noté,
   le solde en tient compte et la carte de Gestion le dit (« À égalité entre associés »). Sans réseau, le règlement est
   gardé sur le téléphone et envoyé au retour.

Technique : `visites.observes` (champs observés ; vide = visite complète) et `visites.duree_s` ; `creer_visite()` de 014
plus ces deux champs ; table `reglements_associes` (de, à, montant > 0, date, note ; deux personnes différentes ; RLS et
audit comme 014), lue en table facultative (`S.d.reglements`) et écrite directement (file d'envoi : `INSERTS`).
Règles pures : `src/domaines/visites/regles.js` (`departExpress`, `etatChamp`, `chargeExpress`, `champsRepris`,
`rucheSuivante`) et `src/domaines/finances/associes.js` (`soldesAssocies` compte les règlements, `aVerserALaSociete`,
`mouvementsAssocies`). Écrans : `src/domaines/visites/express.js` (écran `visiteexpress`, actions `ve…`),
`entre-associes.js` (écran `associes`, actions `earegler`, `eaverser`). Styles `styles/47-visite-express.css`,
`styles/44-associes.css`. Tests : `tests/sql/test_020.mjs` (21 vérifications), `tests/unitaires/visites.test.mjs` et
`associes.test.mjs`, scénarios `tests/etapes_ve.txt` (nouveau) et `tests/etapes_as.txt` (écran et remboursement).
`etapes_dl` : 24 lectures à l'ouverture (une table de plus). `eadetail` est permise au rôle lecteur (consultation).

Limites connues :
- La visite express ne contient ni varroa, ni traitement, ni intrants, ni photo : « Visite complète » pour ceux-là.
  La dictée (« Dire un changement ») et la photo des maquettes ne sont pas encore branchées.
- Les alertes lisent toujours la dernière visite telle quelle : une valeur reprise y compte comme si elle avait été vue.
- Un règlement noté par erreur ne se modifie pas encore depuis l'écran (il se supprime par le journal d'audit).

**À vérifier**
1. Fiche d'une ruche visitée : « Visite express », la dernière visite reprise, reine « pas cherchée ».
2. Changer le poids et la reine : « 2 changements · 4 valeurs reprises » ; enregistrer : on passe à la ruche suivante du rucher.
3. Le journal de la ruche dit « Visite express · repris de la précédente : … ».
4. Finances › Entre associés : le montant, ce que chacun a avancé, l'argent à verser à la trésorerie, les mouvements.
5. Noter le remboursement proposé : l'écran affiche « À égalité entre associés ».
6. Sans réseau : une visite express et un remboursement sont gardés puis envoyés au retour du réseau.

## v5.32 · à publier en recette · navigation par catégories (fin de « Gestion »)
Aucune migration. Maquettes validées par Pierre-Louis le 12 nov. 2026.

Pour l'apiculteur :
1. **Ordinateur** : le menu est à gauche et toujours visible, rangé par catégorie : Au quotidien (Accueil, Agenda,
   Rappels), Ruchers (Ruches, Carte, Santé et varroa), Miel et ventes (Stock et lots, Clients et ventes), Finances
   (Bilan, Dépenses et achats, Budget et prévisions, Entre associés), Administration (Matériel, Fournisseurs, Registre
   d'élevage, Déclaration), Équipe et compte (Équipe, Réglages). API est en tête du menu. Plus de barre du haut, ni de
   compteur dans le menu ; la recherche est dans le bandeau en haut de l'écran, la cloche devient l'entrée « Rappels ».
2. **Téléphone** : la touche « Gestion » devient **Menu**. Elle ouvre un volet par la droite avec les mêmes
   catégories ; il se ferme d'un choix, de la croix ou en touchant à côté. Accueil, Ruchers, API et Miel ne changent pas.
3. **« Gestion » est remplacée** par Finances et Administration. Au-dessus du titre d'un écran, la catégorie remplace
   « ‹ Gestion » ; sur téléphone, elle rouvre le volet.
4. **Entre associés** a son écran dans Finances : celui de la visite express, ci-dessus (solde, avances, remboursements).

Technique : `navigation.js` (menus, volet, fil d'Ariane), `styles/47-navigation.css` ; écran `associes`
(`src/domaines/finances/`). Le logo du menu reste sombre quel que soit le bandeau (menu blanc). L'écran `plus` reste
enregistré (adresse directe), hors des menus. Tests mis à jour : n4, al, eg, ab, vt, nk.

### À vérifier
- Téléphone : touche Menu, volet, choisir Bilan puis Matériel ; la catégorie au-dessus du titre rouvre le volet.
- Téléphone : Échap ou toucher à côté ferme le volet ; la rubrique ouverte est surlignée dans le volet.
- Ordinateur : menu à gauche à 1 280 et 1 440 px, et vers 900 px ; rien ne déborde ; recherche Ctrl K.
- Ordinateur : bandeau Sapin ou Vert (Réglages › Apparence) : logo du menu toujours lisible.
- Finances › Entre associés avec deux associés notés : phrase et détail justes.

## Outillage · 12 nov. 2026 · plus de mise en ligne en production refusée sans raison
Trois causes, toutes traitées :
- **« Cette version n'est pas celle en recette »** (11 nov., 23 h 21) : la production exigeait que `main` soit
  identique à la recette ; une modification faite après la recette (ici le réglage des machines de GitHub) suffisait à
  la bloquer. Désormais la production publie la version en recette telle quelle ; il suffit qu'elle soit sur `main`.
- **Tâches sans machine** (11 nov. au soir) : les tâches sur `ubuntu-24.04` n'ont trouvé aucune machine et ont été
  annulées, ce qui rendait « Vérifier » rouge. Toutes les tâches passent sur `ubuntu-latest` ; un « Vérifier » annulé
  par GitHub est relancé et attendu par la mise en ligne (`scripts/attendre-verifier.sh`) ; seul un test en échec bloque.
- **Base `apidoo` en retard** (cause des refus depuis le 3 nov.) : migrations de la version non appliquées, étape faite
  à part et oubliée. Désormais :
1. « Mise en ligne » applique d'abord les migrations qui manquent à la base de la cible, chacune dans sa transaction,
   puis publie (`scripts/appliquer-migrations.mjs`). Il faut pour cela créer une fois les secrets `BASE_RECETTE` et
   `BASE_PRODUCTION` (`docs/PROCESSUS.md`, « Mise à jour automatique des bases »). Lancer « production » vaut accord
   pour mettre à jour `apidoo`.
2. Sans secret, rien ne change, sauf le message : le contrôle dit où en est la base et quelles migrations manquent,
   et la mise en ligne en recette l'annonce déjà dans son résumé, avant qu'on lance la production.
3. Une migration en échec est annulée en entier et rien n'est publié.
Aucun changement dans l'application. Tests : `tests/sql/test_appliquer.mjs` (15 vérifications). La reconnaissance de
la base a été vérifiée en lecture seule sur les deux vraies bases (`apidoo` : 016 ; `apidoo-test` : 019). L'application
réelle d'une migration par ce chemin n'a pas encore tourné sur une vraie base.

## v5.31 · à publier en recette · reines et liens de colonies (IT-07)
**Migration 019** (`migrations/019-reines-liens.sql`), additive, ne casse pas l'ancienne version. Appliquée sur
`apidoo-test` le 11 nov. 2026, après 018 (relevé `migrations/releves/structure-2026-11-11-recette-apres-019.json`).
**Appliquée sur `apidoo` le 12 nov. 2026**, avec l'accord de Pierre-Louis, après 017 et 018 (empreinte identique au
rejeu des fichiers ; 1 reine reprise, aucun lien, aucune incohérence entre exploitations).
(La fiche IT-07 annonçait le numéro 017, pris depuis par 017-associes puis 018-stock-mouvements.)

Pour l'apiculteur :
1. **Reine** : enregistrer une nouvelle reine ne fait plus disparaître l'ancienne. L'ancienne est clôturée à la date
   d'introduction de la nouvelle (remplacée, morte, disparue ou vendue) et reste dans l'onglet « Reine & lignée ».
   « Corriger » sert aux erreurs de saisie. Marquage : couleur de l'année par défaut, modifiable (ou « non marquée ») ;
   aile clippée et notes en plus.
2. **Lignée** : une colonie issue d'une division ou d'un essaim récupéré affiche « Issue de Ruche 2 le 12 mai » avec
   un lien ; la colonie mère montre ce qui en est issu ; les réunions sont notées des deux côtés.
3. **Fiche d'une ruche** : sous le nom, le statut, la reine (âge, couleur), la force et la date de la dernière visite.
   Onglets Journal, Santé (comptages varroa et traitements déjà saisis), Reine & lignée, Colonie, Photos.
4. **Journal** : visites et événements de la colonie (installation, division, essaimage, réunion, nouvelle reine,
   déplacement, sortie) dans l'ordre des dates. L'« Historique » de l'onglet Colonie y est passé.
5. « Modifier la ruche » ne demande plus l'année de la reine.

Technique : tables `reines` et `colonie_liens` (RLS, audit), `changer_reine()` et `corriger_reine()` (idempotentes par
identifiant, file d'envoi hors ligne), déclencheurs pour l'ancienne version (année changée = nouvelle reine ; division,
essaimage ou réunion au journal = lien), reprise depuis `annee_reine` et `autre_ruche_id`. L'application n'écrit plus
jamais `annee_reine` : la base tient les trois colonnes reine de `ruches` à jour (ancienne version, retour arrière).
Règles pures `src/domaines/colonies/reines.js` (`tests/unitaires/reines.test.mjs`), écrans `lignee.js`, journal dans
`ux.js`, styles `styles/46-reines.css`, scénario `tests/etapes_rn.txt`, tests SQL `tests/sql/test_019.mjs`.
`etapes_v4` adapté (la reine passe par `changer_reine`). `etapes_dl` : 23 lectures à l'ouverture (2 tables de plus).

Limites connues :
- La **force** n'est pas encore saisie dans les visites (IT-08) : l'en-tête affiche « Force – ».
- Le conseil « Reine de 3 ans ou plus : pense à la remplacer » est retiré (seuil sans source) ; l'âge reste affiché.
- Division, essaimage et réunion restent des écritures directes, sans transaction ni file d'envoi (hors IT-07).
- Le journal ne contient pas encore les opérations (traitements, comptages hors visite) : elles arrivent en IT-12.
- Sur une base sans 019, la reine se lit dans la ruche, sans saisie possible : appliquer 019 avant de publier.

**À vérifier**
1. Une ruche avec une reine notée : l'en-tête montre son année, son âge et sa pastille de couleur.
2. Reine & lignée › « Nouvelle reine », introduite à une date passée : l'ancienne passe dans « Reines précédentes »,
   clôturée à cette date ; le journal montre « Nouvelle reine ».
3. « Corriger » sur la reine en place : rien n'est ajouté à l'historique.
4. Diviser une ruche : la nouvelle affiche « Issue de … », le lien ramène à la ruche d'origine.
5. Sans réseau : une nouvelle reine est gardée, montrée « en attente », puis envoyée au retour du réseau.
6. Les cinq onglets défilent sur téléphone ; l'onglet Colonie garde statut, emplacements, hausses, équipement.

## v5.30 · à publier en recette · stock : catalogue, achats, mise en pots, traçabilité
**Migration 018** (`migrations/018-stock-mouvements.sql`), additive, ne casse pas l'ancienne version. Appliquée sur
`apidoo-test` le 11 nov. 2026 et sur `apidoo` le 12 nov. 2026 (stock inchangé : 257, repris en 3 mouvements d'ouverture). S'appuie sur la v5.29 (entre associés, migration 017) : l'achat garde « Acheté par » et « Payé avec ».

Écart relevé par Pierre-Louis le 11 nov. 2026 : une dépense de pots vides ne créait pas de stock (la fiche dépense
n'avait pas d'article), il n'y avait pas de liste d'articles à acheter ni d'Opex/Capex par article, et créer un lot ne
retirait ni les pots vides ni le miel. Rien n'était relié. Maquettes validées le même jour.

Pour l'apiculteur :
1. **Matériel devient un catalogue** : articles par famille (emballage, alimentation, traitements, cire, équipement),
   chacun **Opex** (consommable) ou **Capex** (équipement amorti, durée par article), filtre Tous / Opex / Capex,
   « À commander » sous le seuil, miel en vrac et pots de miel par format. « Ajouter vite » propose 21 articles
   courants (pots 250 g, 500 g, 1 kg, couvercles, étiquettes, candy, hausses, extracteur…).
2. **Ajouter un achat** (remplace « Ajouter une dépense ») : fournisseur, date, numéro de facture, puis une ligne par
   article touché, un nouvel article (Opex ou Capex) ou des frais. Chaque ligne dit « Stock +150 ». À
   l'enregistrement, le stock monte et la facture reste liée.
3. **Mise en pots** (« Nouveau lot ») : format, nombre de pots ; pot vide du format, couvercle et étiquette proposés,
   avec l'avant → après de chaque article et du miel en vrac. « Tu peux remplir jusqu'à 75 pots » dit ce qui limite.
   Valider crée le lot et retire les articles du stock, d'un coup, ou rien si quelque chose manque. Coût
   d'emballage par pot affiché. Lien pour saisir des pots déjà prêts sans rien retirer.
4. **Fiche de lot : « D'où vient ce pot »** : récolte (ruches), achat des pots (fournisseur, facture), mise en pots,
   ventes, dans l'ordre des dates.
5. **Fiche d'un article : « Ce qui a bougé »** : chaque achat, visite, mise en pots, correction. Un stock recompté
   devient une correction notée, plus une écriture sans trace.

Technique : `mouvements_stock` est la source du stock (`articles.stock` = somme, tenue par déclencheurs ; une écriture
directe, par l'ancienne version, devient un ajustement) ; `enregistrer_achat()` et `mettre_en_pots()` passent par la
file d'envoi hors ligne. Écrans : `src/domaines/materiel/catalogue.js` (écran materiel, actions `newarticle`,
`editarticle`, `preset` déclarées dans `remplace`), `src/domaines/finances/achat.js` (`newdepense`),
`src/domaines/production/mise-en-pots.js` (écran `miseenpots`, `newlot`), `src/domaines/production/lot.js` ; règles
pures `src/domaines/materiel/regles.js` (`Regles.stock`). Sans la migration 018, les anciens écrans restent
(`S.absentes`, tables facultatives). Styles `styles/45-stock.css`. Tests : `tests/sql/test_018.mjs` (55 vérifications),
`tests/unitaires/stock.test.mjs`, scénario `tests/etapes_st.txt` ; la base simulée des tests n'a 018 que si le
scénario le dit.

**À vérifier**
1. Matériel : tes articles rangés par famille, Opex ou Capex ; « Ajouter vite » ajoute un article prérempli.
2. Ajouter un achat de 150 pots 250 g : Matériel affiche 150 de plus ; la fiche de l'article montre l'achat.
3. Mise en pots de 40 pots de 250 g : pots vides, couvercles, étiquettes baissent de 40 ; le lot apparaît dans Miel.
4. Fiche du lot : « D'où vient ce pot » montre la récolte, l'achat (avec la facture), la mise en pots.
5. Sans réseau : un achat et une mise en pots sont gardés et montrés tout de suite, puis envoyés au retour.

## v5.29 · à publier en recette · entre associés (chantier des écrans, étape 7)
**Migration 017** (`migrations/017-associes.sql`) : **appliquée sur `apidoo-test` le 11 nov. 2026**, sur `apidoo` le 12 nov. 2026.
Additive : l'ancienne version continue de fonctionner (elle n'envoie pas « vendu par », la colonne reste vide).

Pour l'apiculteur :
1. **Achat** : « Acheté par » (l'associé qui l'a fait) et « Payé avec » : les fonds propres d'un associé, ou la
   trésorerie de la société. Par défaut, toi et tes fonds propres.
2. **Vente** : « Vendu par » et, pour une vente payée, « Argent récolté par » : un associé, ou le compte de la société.
3. **Gestion** : en tête, la carte « Entre associés » dit qui doit combien à qui pour être à égalité ; « Voir le
   détail » montre, pour chacun, ses achats, l'argent avancé de ses fonds propres, ses ventes et l'argent récolté.
   Calcul à parts égales : ce qu'un associé avance, la société le lui doit ; l'argent de vente qu'il garde, il le doit
   à la société. Les achats payés par la société, l'argent laissé sur son compte et les ventes à encaisser ne comptent
   pour personne. « Caisse commune » (ancienne version) vaut la société.
4. **Réglages › Associés** : les prénoms proposés dans les listes, pour toute l'exploitation. Sans liste, l'app reprend
   les prénoms déjà notés.

Technique : règles pures `src/domaines/finances/associes.js` (tests `tests/unitaires/associes.test.mjs`) ; écrans
`entre-associes.js` (enveloppe `depenseForm`, `readSaleForm` et l'envoi de `creer_vente`) ; styles
`styles/44-associes.css` ; scénario `tests/etapes_as.txt` ; tests SQL `tests/sql/test_017.mjs` ; relevé
`migrations/releves/structure-2026-11-11-recette-apres-017.json`.

**À vérifier**
1. Réglages › Associés : noter « Pierre-Louis » et « Johan ».
2. Un achat payé de tes fonds propres, un achat payé par la société, une vente dont Johan garde l'argent : la carte de
   Gestion et son détail donnent les bons montants.
3. Hors ligne : une vente enregistrée garde « vendu par » et « argent récolté par » une fois envoyée.

## v5.28 · à publier en recette · réglages (chantier des écrans, étape 9)
Aucune migration. S'appuie sur la v5.27.

Écart relevé avec les maquettes : la couleur du bandeau se choisissait dans une liste, sans la voir avant
d'enregistrer ; et aucun écran ne permettait de donner son prénom, que l'accueil attend depuis la v5.24.

Pour l'apiculteur :
1. **Bloc « Toi »** en tête des réglages : ton prénom. Il s'affiche dans le bonjour de l'accueil (« Bonsoir
   Pierre-Louis »). Il reste sur cet appareil, comme la couleur du bandeau.
2. **Couleur du bandeau** : quatre alvéoles (Miel doux, Sauge, Vert Apiviz, Sapin) et un aperçu du bandeau dans la
   feuille ; toucher une couleur l'applique aussitôt à l'app. « Annuler » remet la couleur d'avant ; « Enregistrer »
   la garde.

Technique : `src/domaines/compte/apparence.js` complète l'écran « reglages » et remplace l'action `errgcouleur`
(déclarée dans `remplace`) ; essentiels.js expose ses couleurs de bandeau ; styles `styles/43-reglages.css` ;
scénario `tests/etapes_re.txt` ; `etapes_eg` suit le bloc « Toi » et les alvéoles de couleur.

**À vérifier**
1. Réglages › Toi : le prénom donné apparaît dans le bonjour de l'accueil.
2. Réglages › Apparence : chaque alvéole change le bandeau tout de suite ; Annuler revient en arrière.
3. Bandeaux Vert Apiviz et Sapin : logo clair, textes lisibles.

## v5.27 · à publier en recette · feuille d'API (chantier des écrans, étape 8)
Aucune migration. S'appuie sur la v5.26.

Écart relevé avec les maquettes : le bouton API ouvrait déjà « Que veux-tu faire ? » (compagnon, recherche, six
saisies rapides). Il manquait la **suggestion du jour**.

Pour l'apiculteur :
1. Sous les saisies rapides, sur fond miel, API redit la priorité de l'accueil (« Ruche 5 a perdu 1 kg… »), d'où
   elle vient, et propose deux gestes : **Visiter Ruche 5** (la visite s'ouvre sur cette ruche) et **Ajouter à
   l'agenda** (tâche déjà rattachée à la ruche). Quand tout va bien, pas de suggestion.
2. Les six saisies entrent l'une après l'autre à l'ouverture de la feuille.

Rien ne bouge si le téléphone demande de réduire les animations.

Technique : `src/domaines/accueil/feuille-api.js` enveloppe `quickSheet` (après nav4.js et alveoles.js) ; ses deux
actions sont déclarées avec l'écran d'accueil ; styles `styles/42-feuille-api.css` ; scénario `tests/etapes_ap.txt`.

**À vérifier**
1. Bouton API, depuis n'importe quel écran : la suggestion nomme la même ruche que l'accueil.
2. « Visiter … » ouvre la visite de cette ruche ; « Ajouter à l'agenda » ouvre la tâche avec la ruche choisie.
3. Toutes les ruches en forme : la feuille n'a que les saisies.

## v5.26 · à publier en recette · saisies de visite et de vente (chantier des écrans, étape 6)
Aucune migration. S'appuie sur la v5.25 (fiche ruche).

Écart relevé avec les maquettes : la visite avait déjà sa barre « Enregistrer la visite » fixe en bas. La vente
non : son bouton était au bout du formulaire, sous la barre du bas, et le total n'était lisible que dans le bouton.
Les compteurs ne disaient pas ce qu'il resterait en stock.

Pour l'apiculteur :
1. **Vente : barre d'enregistrement fixe**, comme la visite : le total à gauche, avec le nombre de pots, et
   « Enregistrer la vente » à droite. La barre du bas de l'app s'efface pendant la vente, comme pendant la visite.
2. **Stock restant** : sous chaque compteur (pots vendus, nourrissement et matériel), « 16 restants » une fois la
   quantité choisie. « 40 unité en stock » devient « 40 en stock ».
3. **Compteurs qui réagissent** : le chiffre qui vient de changer rebondit, et le total aussi. Rien ne rebondit quand
   on touche autre chose (paiement, remise).

Rien ne bouge si le téléphone demande de réduire les animations.

Technique : `src/domaines/ventes/saisie.js`, dernier complément des écrans « vente » et « visite » ; styles
`styles/41-saisies.css` ; scénario `tests/etapes_sv.txt` (captures à 390 px) ; `etapes_qr` vise le bouton dans la barre.

**À vérifier**
1. Nouvelle vente sur téléphone : la barre reste en bas pendant qu'on fait défiler, le total suit les pots choisis.
2. « Enregistrer la vente » enregistre comme avant, hors ligne compris.
3. Sous chaque compteur, le stock restant baisse avec la quantité ; au singulier pour 1 ou moins.
4. Pendant une visite, le nourrissement montre aussi le stock restant.

## v5.25 · à publier en recette · fiche ruche des maquettes (chantier des écrans, étape 5)
Aucune migration. S'appuie sur les v5.22 à v5.24. Téléphone et ordinateur : la fiche est la même.

Pour l'apiculteur :
1. **Ce qu'en dit API**, sous l'en-tête de la ruche, sur fond miel : un ou deux constats tirés des visites, un conseil,
   et d'où ça vient (« D'après 3 pesées et 3 visites de Ruche 5 »). Signaux, dans l'ordre : varroa au-dessus de ton
   seuil (avec renvoi vers le vétérinaire ou le GDS, sans rien prescrire), perte d'au moins 1 kg entre les deux
   dernières pesées, provisions faibles, reine non vue deux fois de suite, pas de visite depuis plus de 30 jours pour
   une colonie qui n'est pas en forme. **Une colonie en forme sans signal n'a pas de message** : API ne parle pas pour rien.
2. **Courbe de poids lisible** : l'échelle se resserre autour des pesées (40 à 50 kg plutôt que 0 à 50), la courbe se
   trace puis chaque pesée apparaît, avec sa date ; la variation est écrite sous le titre (« −2 kg depuis le
   11 septembre »). Huit pesées au plus. « Voir les chiffres » reste.
3. **Journal** : en arrivant sur la ruche, les cartes entrent l'une après l'autre ; la visite qu'on vient d'enregistrer
   est sur fond miel, avec « Enregistrée à l'instant ». Changer d'onglet ne rejoue rien.

Rien ne bouge si le téléphone demande de réduire les animations.

Technique : `src/domaines/colonies/suivi.js` (règles pures : message d'API, échelle et variation du poids, testées par
`tests/unitaires/suivi.test.mjs`) et `apercu.js`, dernier complément de l'écran « ruche » (`colonies/ecrans.js`) ;
styles `styles/40-fiche-ruche.css` ; scénario `tests/etapes_fr.txt` (captures à 390 et 1 280 px).

**À vérifier**
1. Ruche critique ou à surveiller : le message d'API nomme ce qu'on voit dans le journal (poids, provisions, reine,
   varroa) et sa source compte bien les pesées et les visites.
2. Ruche en forme, poids stable : aucun message.
3. Courbe : l'échelle encadre les pesées, les dates sont sous les points, la variation correspond au premier et au
   dernier point.
4. Après une visite enregistrée, retour sur la fiche : la carte du jour est sur fond miel.
5. Réglage « réduire les animations » du téléphone : la fiche s'affiche d'un coup, sans tracé.

**Correctif du 11 nov. 2026 · un écran n'entre plus deux fois.** Depuis les transitions (v5.23), chaque écran jouait
deux entrées : la nouvelle (glissement ou fondu), puis l'ancienne (`.wrap.enter`, « rise ») qui repartait 0,6 s plus
tard, quand le sens de la transition était retiré. D'où l'impression d'un écran qui se charge deux fois. `transitions.js`
retire maintenant l'ancienne entrée quand la nouvelle joue ; `tests/etapes_vt.txt` compte une seule entrée par écran.
Aucun chargement de données en double : c'était seulement l'animation.

**Même correctif · plus d'écran de présentation avant la connexion.** L'ancien écran « Tes ruches, ton miel et tes
comptes dans ta poche. » (`demarrage.js`) revenait à chaque déconnexion, car la déconnexion efface la note « déjà vu »
de l'appareil. Il est retiré : sans compte ouvert, on arrive directement sur la page de connexion (v5.24), qui porte déjà
« Créer mon compte », « Voir un rucher d'exemple » et « Où vont mes données ». Scénarios `etapes_cf`, `etapes_cx` et
`etapes_dc` mis à jour.

**À vérifier**
1. Changer de rubrique, ouvrir une fiche ruche, revenir : le contenu arrive une fois, sans second fondu.
2. Se déconnecter, ou ouvrir l'application sans compte : la page de connexion s'affiche tout de suite.

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
