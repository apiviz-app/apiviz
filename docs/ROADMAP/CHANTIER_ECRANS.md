# Chantier des écrans (maquettes UX/UI du 10 nov. 2026)

Source : maquettes mobiles Apiviz (prototype cliquable, planche des animations, galerie de 12 écrans), validées par
Pierre-Louis le 10 nov. 2026. Ordre demandé : les fonctionnalités dans l'ordre, la météo en premier et très soignée.
Une branche `claude/…` et une pull request par étape, recette puis production, rien sans accord.

L'arborescence reste celle de `05_UX_UI_ET_NAVIGATION.md` §2 (gelée) : les maquettes la respectent (Accueil, Ruchers,
Miel, Gestion, API au centre). Aucune étape ne déplace de rubrique.

| # | Étape | Ce que montrent les maquettes | Dans l'app avant le chantier | État |
|---|---|---|---|---|
| 1 | **Météo lisible** | Verdict « maintenant » et pourquoi, jours, frise de la journée, détail d'une heure, créneaux | Tableau heure par heure, 5 jours, « Prévoir une visite » | **v5.22, PR #27** |
| 2 | Barre du bas | Quatre rubriques, API au centre, bandeau miel doux | API au centre déjà en place (alveoles.js) | **Conforme, rien à changer** (vérifié en v5.23) |
| 3 | Transitions | Aller, retour, onglets, feuilles qui montent, messages qui descendent ; « moins d'animations » respecté | Transitions de vue en partie (alveoles.js), feuilles | **v5.23, PR #28** |
| 4 | Accueil | Phrase du jour, alvéoles une à une, créneau de visite | Phrase, alvéoles, créneau ; frise courte en v5.22 | **v5.24, PR #31** (téléphone) |
| 5 | Fiche ruche | Courbe de poids tracée, message d'API, journal | Courbe tracée mais à partir de 0 kg, onglets, journal | **v5.25, en PR** |
| 6 | Visite et vente | Bouton d'enregistrement fixe en bas, compteurs qui réagissent | Barre fixe pour la visite seulement, compteurs muets | **v5.26, en PR** |
| 7 | Gestion | Page centrale, carte « entre associés » | Gestion en blocs | À faire |
| 8 | Feuille API | Ajouts rapides, suggestion du jour | Compagnon API, saisie rapide, sans suggestion | **v5.27, en PR** |
| 9 | Réglages | Choix de la couleur du bandeau, en aperçu | Choix du bandeau (4 couleurs) en liste, pas de prénom | **v5.28, en PR** |

Pour chaque étape : comparer d'abord à l'existant, ne coder que l'écart, un scénario `tests/etapes_*.txt` avec captures
à 390 et 1 280 px, une entrée « À vérifier » dans `docs/CHANGELOG.md`.

## Étape 1 — Météo lisible (v5.22)

Principe : l'apiculteur doit savoir en deux secondes **s'il peut ouvrir, quand, et pourquoi pas**.

1. **Maintenant au rucher** : couleur d'état (vert : ouvrir, miel : visite rapide, gris : attendre), température,
   verdict, raison en clair, prochain créneau en plage horaire (le même que le bouton « Prévoir » du haut).
2. **Jours** : jauge et nombre d'heures pour ouvrir ; ruban défilant sur téléphone.
3. **Frise de la journée** (8 h à 20 h) : couleur par heure, courbe de température, pluie, vent, heure actuelle ;
   toucher une heure ouvre son détail (température, pluie en % et mm, vent, rafales, humidité, raison, « Prévoir »).
4. **Créneaux du jour** : plages favorables avec « Prévoir » ; un jour sans créneau renvoie au prochain jour favorable.
5. **Carte du rucher** : frise courte d'aujourd'hui.
6. Tableau complet replié ; seuils réglables depuis l'écran.

Idées notées pour plus tard, non faites : alerte « créneau favorable » poussée le matin (dépend des notifications),
miellée et floraisons, carte des ruchers colorée selon la météo.

## Étape 5 — Fiche ruche (v5.25)

Écart relevé avec les maquettes : la courbe se traçait déjà mais partait de 0 kg (variation invisible), API ne disait
rien sur la fiche, le journal arrivait d'un bloc. Ajouté : le message d'API (règles pures `colonies/suivi.js`), la
courbe resserrée et pointée, l'entrée du journal et la visite du jour mise en avant. Gardé tel quel : l'en-tête et son
alvéole, les quatre chiffres, les onglets Journal, Colonie, Photos, la barre « Visiter cette ruche ».

## Étape 6 — Visite et vente (v5.26)

Écart relevé : la visite avait déjà sa barre fixe ; la vente gardait son bouton au bout du formulaire, sous la barre
du bas. Ajouté : la barre fixe de la vente avec le total et le nombre de pots, le stock restant sous chaque compteur,
le rebond du chiffre changé et du total. Gardé tel quel : l'ordre des champs, les clients récents, la remise.

## Étape 8 — Feuille API (v5.27)

Écart relevé : compagnon, recherche et six saisies rapides étaient déjà là. Ajouté : la suggestion du jour (même
priorité que l'accueil, avec « Visiter … » et « Ajouter à l'agenda ») et l'entrée des tuiles une à une.

## Étape 9 — Réglages (v5.28)

Écart relevé : couleur du bandeau choisie dans une liste, sans aperçu ; pas d'endroit pour le prénom attendu par
l'accueil. Ajouté : bloc « Toi » (prénom, sur l'appareil), alvéoles de couleur avec aperçu appliqué aussitôt et
annulable. Le choix de couleur reste par appareil, comme avant.
