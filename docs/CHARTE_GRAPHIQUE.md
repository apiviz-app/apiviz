# Apiviz — charte graphique

Adoptée le 10 novembre 2026. Apidoo devient Apiviz : même application, mêmes données, nouvelle identité.
Planche complète (logos, couleurs, polices, maquettes) : https://claude.ai/artifact/9yKXe3wtrU9TEguuvQaHLL

## Le nom

**api** : l'abeille en latin, et le nom du compagnon. **viz** : voir, visualiser. Signature : « Voir clair dans ses ruches. »
Dans une phrase, on écrit **Apiviz** (jamais APIVIZ ni ApiViz). Le logo, lui, est en minuscules.

Le dépôt est devenu `apiviz-app/apiviz` : le site est servi à https://apiviz-app.github.io/apiviz/ (recette :
`…/apiviz/recette/`). Le manifeste utilise des chemins relatifs (`./`) pour fonctionner sous ce sous-dossier.

Ce qui ne change pas : les bases Supabase (`apidoo`, `apidoo-test`), les clés du stockage local (`apidoo-…`) et le nom
du cache hors ligne. Les renommer déconnecterait les comptes et perdrait les saisies en attente.

## Logos (racine du dépôt)

| Fichier | Usage |
|---|---|
| `logo-apiviz.svg` | Mot « apiviz » en sapin, sur miel doux (bandeau), blanc ou prairie. |
| `logo-apiviz-clair.svg` | Lettres cire `#FFF8E7`, sur sapin. Les alvéoles restent miel. |
| `symbole-apiviz.svg` | L'œil-alvéole : alvéole miel, pupille sapin, reflet cire. Écran de chargement, petites places. |
| `icone-apiviz.svg` | Symbole sur carré sapin arrondi : favicon et icône vectorielle du manifeste. |
| `icone-180.png` | Écran d'accueil iPhone (carré plein, iOS arrondit). |
| `icone-192.png`, `icone-512.png` | Icônes Android et ordinateur. |
| `icone-maskable-*.png` | Icônes adaptatives Android : fond plein, symbole dans la zone sûre. |

Le mot est en Bricolage Grotesque 800. Les deux « i » sont sans point : leurs points sont deux alvéoles miel, pointes à
gauche et à droite. Les fichiers ont été tracés depuis la police : ne pas les recomposer en texte.

- Marge autour du logo : la hauteur d'un « a ». Hauteur minimale : 24 px.
- Ne pas poser le logo sur un aplat miel ni sur une photo, ne pas le tourner, ni ombre, ni contour, ni dégradé.
- Sous 32 px, l'icône perd son reflet : l'alvéole et la pupille suffisent.

## Couleurs (`styles/jetons.css`)

Les valeurs d'Apidoo sont gardées : c'est une évolution du miel doux, pas une rupture.

| Nom d'usage | Jeton | Valeur | Rôle |
|---|---|---|---|
| Sapin | `--pine` | `#1E2B24` | Marque, bouton principal, écran de chargement. Porte du blanc. |
| Miel | `--honey` | `#E3A008` | Alvéoles, API, sélection, à surveiller. Porte l'encre, jamais du blanc. |
| Miel doux | `--honeysoft` | `#FBEFC9` | Bandeau, messages d'API, lignes à vérifier. |
| Miel clair | `--honey-light` | `#F6C453` | Texte miel, sur sapin uniquement. |
| Cire | `--cire` | `#FFF8E7` | Reflet de l'œil, logo sur sapin. |
| Prairie | `--ground` | `#F4F6F0` | Fond des écrans. |
| Encre | `--ink` | `#1B2420` | Texte principal. |
| Lichen | `--muted` | `#55605A` | Texte secondaire. |
| En forme / À surveiller / Critique | `--good` / `--honey` / `--crit` | `#2F6B4F` / `#E3A008` / `#A61B1B` | États, toujours avec un mot ou un signe. |

Le miel couvre moins d'un dixième d'un écran. Jamais de texte miel sur fond clair : prendre l'ambre `--watch` `#7D5200`.

## Polices

- **Bricolage Grotesque** : titres, phrase du jour, chiffres clés, numéros de ruche (700 ; 800 réservé au logo).
- **Instrument Sans** : tout le reste (400 à 700). 16 px minimum dans les champs.

## Compagnon API (`api-compagnon.js`)

L'alvéole miel avec ses antennes. Ses yeux sont deux petites alvéoles sapin avec un reflet cire, comme le symbole.
Dans le code, le compagnon s'appelle par `Apiviz.compagnon(état, taille)`.

## Voix

Apiviz tutoie, phrases courtes, un chiffre plutôt qu'un adjectif. Détail : `CHARTE_DE_TON.md`.

## Hors du dépôt (à faire à la main)

- Supabase, Authentication › URL Configuration, sur `apidoo` et `apidoo-test` : mettre la nouvelle adresse dans
  « Site URL » et « Redirect URLs » (`https://apiviz-app.github.io/apiviz/**`), sinon le lien de connexion reçu par
  e-mail renvoie vers l'ancienne adresse.

- Supabase, Authentication › Emails : nom d'expéditeur et modèles des e-mails de connexion à passer de « Apidoo » à
  « Apiviz » (le texte de l'application dit déjà « l'expéditeur est Apiviz »), sur `apidoo` et `apidoo-test`.
- L'adresse ayant changé, une application déjà installée sur un téléphone pointe vers l'ancienne : la retirer et
  réinstaller Apiviz depuis la nouvelle adresse (puis se reconnecter).
