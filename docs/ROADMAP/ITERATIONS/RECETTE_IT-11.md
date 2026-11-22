# Recette manuelle IT-11 — photos et voix sur de vrais téléphones

Tâches AP-TECH-163 (photos) et AP-TECH-169 (dictée). À dérouler en **recette** (`https://recette.apiviz.fr`, base
`apidoo-test`, migration 034 appliquée), sur au moins **un iPhone (Safari, application installée sur l'écran
d'accueil)** et **un Android (Chrome)**. Noter pour chaque ligne : OK, KO (avec capture) ou non testé, le modèle et la
version du système.

Les tests automatiques (`etapes_pc`, `etapes_es`, `etapes_dv`) simulent le réseau, le stockage et la reconnaissance
vocale ; ils ne remplacent pas ces essais : appareil photo réel, HEIC, micro et coupures de réseau réelles.

## 1. Photos (AP-US-053)

| # | Appareil | Geste | Attendu |
|---|---|---|---|
| P1 | iPhone | Mode avion. Nouvelle visite › Photos › Prendre une photo (appareil photo) › Enregistrer sur le téléphone | Vignette visible ; visite et photo « en attente » dans le journal de la colonie |
| P2 | iPhone | Retirer le mode avion, rouvrir l'application | La visite part, puis la photo ; « Photo envoyée » ; Synchronisation : rien en attente |
| P3 | iPhone | Photos › Galerie › choisir une photo prise en HEIC (Réglages › Appareil photo › Formats › Haute efficacité) | Photo réduite et ajoutée (Safari lit le HEIC) |
| P4 | Android | Galerie › choisir un fichier `.HEIC` (copié depuis un iPhone) | Message : reprendre avec « Prendre une photo » ou choisir « Le plus compatible » ; aucune vignette vide |
| P5 | Android | Mode avion, Prendre une photo dans une visite, enregistrer, puis réseau | Comme P1 et P2 |
| P6 | Les deux | Visite › Rattacher à : Colonie › photo › Enregistrer | La photo est dans l'onglet Photos de la colonie, en tête (« Photos de la colonie ») |
| P7 | Les deux | Visite › Rattacher à : Rucher | La photo est dans « Photos du rucher » sur la fiche du rucher |
| P8 | Les deux | Fiche colonie › Photos › Prendre une photo, en mode avion, puis réseau | « Gardée sur le téléphone », puis envoyée ; elle reste après un rechargement |
| P9 | Les deux | Fiche rucher › Photos du rucher › Galerie, 3 photos d'un coup | Les 3 vignettes, puis « 3 photos envoyées » |
| P10 | Les deux | Toucher une photo › Supprimer › attendre 5 s | La photo disparaît ; « Annuler » la ramène pendant 5 s |
| P11 | Les deux | Compte lecteur sur la fiche colonie | Les photos se voient ; pas de bouton d'ajout |
| P12 | Les deux | Fermer l'application juste après « Enregistrer sur le téléphone », la rouvrir sans réseau | La photo est toujours en attente (rien n'est perdu) |

## 2. Espace photos (AP-US-054)

| # | Geste | Attendu |
|---|---|---|
| E1 | Réglages › L'exploitation › Espace photos | Utilisé et pourcentage cohérents avec Supabase › Storage › photos-visites (dossier de l'exploitation) |
| E2 | Sur une exploitation d'essai à plus de 80 % (fichiers ajoutés à la main sur `apidoo-test`) | Avertissement dans les Réglages : espace restant, nombre de photos, taille moyenne ; le responsable voit une alerte une fois dans la journée, un membre ne la voit pas |
| E3 | Actions › Nettoyage du stockage › Run workflow, « Simuler » coché | Le journal de l'écran Espace photos montre un passage « essai » ; aucun fichier supprimé |
| E4 | Un fichier sans fiche de plus de 7 jours (visite supprimée depuis l'éditeur SQL, fichier laissé) puis Run workflow sans simulation | Le fichier est retiré ; les autres photos et toutes les fiches sont intactes |

## 3. Dictée (AP-US-055)

| # | Appareil | Geste | Attendu |
|---|---|---|---|
| D1 | Android, en ligne | Visite › Visiter à la voix › « force quatre, cellules royales ouvertes, c'est bon » | Alvéoles Force 4/5 et Cellules royales ; relecture ; visite enregistrée avec ces valeurs |
| D2 | Android, avec des gants | Toucher l'alvéole Œufs vus trois fois | Oui, Non, puis vide |
| D3 | iPhone (Safari) | Visiter à la voix | La dictée s'ouvre si Safari la permet ; sinon la feuille « micro du clavier » |
| D4 | Firefox ou navigateur sans dictée | Visiter à la voix | Feuille « Ce navigateur ne sait pas écouter. Le clavier, si. » ; « Écrire dans la note » met le curseur dans la note |
| D5 | Les deux | Refuser le micro au premier essai | « Autorise le micro pour dicter. Tu peux toucher les alvéoles. » ; les alvéoles restent utilisables |
| D6 | Les deux, mode avion | Visiter à la voix | « Sans réseau, je ne peux pas écouter. Touche les alvéoles. » |

## 4. Résultats

| Date | Testeur | Appareil (modèle, système) | Lignes OK | Lignes KO | Remarques |
|---|---|---|---|---|---|
| | | | | | |
