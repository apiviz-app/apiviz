# Processus : recette, validation, production

Même méthode que Gladoo : un seul dépôt, un seul code, et rien ne part en ligne sans un clic.

| | Recette | Production |
|---|---|---|
| Adresse | https://apiviz-app.github.io/apiviz/recette/ | https://apiviz-app.github.io/apiviz/ |
| Base | Supabase `Apiviz-test` (données fictives) | Supabase `Apiviz` (vraies données) |
| Repère de version | étiquette git `recette` | étiquette git `deploiement` |
| Reconnaissable | étiquette « RECETTE » en haut de l'écran, mêmes couleurs que la production | aucun |

**Cloudflare (IT-29, depuis le 13 nov. 2026)** : chaque mise en ligne publie aussi la cible sur son domaine,
`https://recette.apiviz.fr` ou `https://apiviz.fr` (`wrangler.jsonc`), avec le jeton `CLOUDFLARE_API_TOKEN` et
`CLOUDFLARE_ACCOUNT_ID` (secrets du dépôt, créés par Pierre-Louis ; jamais dans un fichier). GitHub Pages reste en
place jusqu'à la bascule de la production.

Le code est le même. Seuls `environnements/recette/` (`config.js`, manifeste) et le préfixe de `sw.js` diffèrent, appliqués par `scripts/assembler-site.sh`.

## Cycle d'une version

1. **Branche** : créer `claude/…` depuis `main`. Jamais d'envoi direct sur `main`.
2. **Base de données** : toute migration est appliquée d'abord sur `Apiviz-test`, notée dans `migrations/README.md`, et ajoutée à `migrations/a-appliquer-en-production.txt`.
3. **Pull request vers `main`** : « Vérifier » lance les tests. La fusion ne publie rien. **GitHub refuse la fusion
   tant que « verifier » et « Tests SQL » ne sont pas verts sur la branche à jour avec `main`** (règle « main
   protégée », posée le 13 nov. 2026 après #46, #47, #48 et #50 fusionnées en rouge). Si GitHub demande « Update
   branch », cliquer, attendre le vert, puis fusionner. En cas de conflit (« This branch has conflicts »), ne pas le résoudre dans l'éditeur de GitHub :
   demander à Claude de remettre la branche à jour. Deux fusions y ont perdu une feuille de style et une rubrique du
   CHANGELOG (#33, #46).
4. **Recette** : Actions › Mise en ligne › Run workflow, cible `recette`. Une branche peut y être essayée avant fusion.
5. **Validation** : tester sur téléphone avec la rubrique « À vérifier » de `docs/CHANGELOG.md`.
6. **Base de production** : plus d'étape à part. Quand le secret `BASE_PRODUCTION` existe (voir « Mise à jour
   automatique des bases »), lancer la mise en ligne en production applique d'abord les migrations en attente sur `Apiviz`,
   puis publie : **choisir la cible `production` vaut accord pour mettre à jour la base**. Sans le secret, Claude les
   applique par l'accès Supabase une fois l'accord donné dans la conversation, avec un relevé de structure dans
   `migrations/releves/`. Sauvegarde quotidienne chiffrée et essayée, prête à activer : voir « Sauvegardes » (D-03).
7. **Production** : Actions › Mise en ligne › Run workflow, cible `production`. Elle publie **la version en recette,
   telle quelle** (repère `recette`), même si `main` a avancé depuis (documentation, réglage de GitHub, autre fusion) :
   ces changements partiront à la prochaine recette. Seule condition : la version en recette doit être fusionnée sur
   `main` (une branche essayée en recette avant fusion est refusée). Si « Vérifier » est encore en cours, la mise en
   ligne l'attend ; s'il a été annulé par GitHub (aucune machine), elle le relance ; seul un test réellement en échec
   la refuse.
   La mise en ligne compare ensuite la structure de la base `Apiviz` aux fichiers de migrations
   (`scripts/controler-structure.mjs`, clé publique, lecture seule) et refuse de partir en cas d'écart, en disant où en
   est la base et quelles migrations manquent. En recette, un écart avec `Apiviz-test` n'est qu'un avertissement.
8. **Après** : vider la liste des migrations en attente (`migrations/a-appliquer-en-production.txt`, simple mémo), passer la version à « en production » dans `CHANGELOG.md`.

## Gel avant ouverture et rythme des versions (décision du 24 nov. 2026)

Jusqu'à l'ouverture au public (`docs/LANCEMENT.md`), **plus de nouvelle fonction** : seulement des corrections, la
conformité (juridique, sécurité, boutiques) et ce que la bêta fait remonter. Une idée nouvelle va dans
`docs/ROADMAP/06_BACKLOG_MASTER.md`, pas dans une PR.

- **Une version par semaine**, le mardi : recette le mardi, essai sur téléphone, production au plus tard le jeudi.
  Un correctif bloquant peut partir entre deux.
- **Trois PR ouvertes au plus** en même temps, jamais empilées l'une sur l'autre : chacune part de `main`.
- Après chaque mise en ligne en production : lancer « Fonctions serveur » sur la même cible (ci-dessous) et vérifier le
  résumé de l'action « Santé » du lendemain.

## Fonctions serveur

Action « Fonctions serveur » (`.github/workflows/fonctions.yml`), à la main : déploie les fonctions de
`supabase/functions/` dans la version publiée sur la cible (repère `recette` ou `deploiement`), avec
`--no-verify-jwt` pour celles de `supabase/functions/sans-jeton.txt`. Réglage, une fois : secret GitHub
`SUPABASE_ACCESS_TOKEN` (Supabase › Account › Access Tokens). Les secrets de chaque fonction (`ANTHROPIC_API_KEY`,
`VAPID_…`, `NETTOYAGE_CLE`, `SUPPRESSION_CLE`, `RAPPELS_SECRET`) se règlent dans Supabase › Edge Functions › Secrets,
projet par projet.

Le jeton `SUPABASE_ACCESS_TOKEN` doit couvrir **les deux projets** (Apiviz et Apiviz-test) avec les droits « Edge
Functions » et « Edge Function Secrets » en lecture-écriture et « Project Settings » en lecture (26 nov. 2026 : un
jeton limité à la production faisait échouer la recette avec une erreur 403). La version de la CLI Supabase est fixée
dans les actions (`supabase/setup-cli@v2`, `version: 3.4.0`) : « latest » échouait quand l'API GitHub limitait les
appels anonymes.

**Clés VAPID des rappels** (v5.87) : action « Clés VAPID » (`.github/workflows/cles-vapid.yml`), à la main, une fois
par projet. Elle crée la paire de clés et la range dans les secrets Supabase sans jamais l'afficher ; si les clés
existent déjà, elle ne fait rien (en changer couperait les rappels des appareils abonnés).

## Mise à jour automatique des bases

Depuis le 11 nov. 2026, « Mise en ligne » applique elle-même les migrations qui manquent à la base de la cible
(`scripts/appliquer-migrations.mjs`), juste après les contrôles et avant de publier.

- **Comment elle sait où en est la base** : elle lit sa structure (colonnes, fonctions, règles d'accès, déclencheurs,
  contraintes, index) et la compare aux fichiers rejoués un par un sur une base vide. La base « en est » à la dernière
  migration qui donne exactement la même structure. Aucune migration déjà en place n'est relancée.
- **Tout ou rien** : chaque migration passe dans une transaction. Une erreur l'annule en entier, arrête la mise en
  ligne et rien n'est publié ; le journal de l'action dit laquelle et pourquoi.
- **Base modifiée à la main** : si la structure ne correspond à aucune étape, rien n'est appliqué et les écarts sont listés.
- **Recette** : une branche essayée en recette applique ses migrations sur `Apiviz-test` (c'est la règle « d'abord
  `Apiviz-test` »). La production n'accepte que la version en recette : ses migrations ont donc déjà tourné une fois.
- **Secrets à créer une fois** (GitHub › Settings › Secrets and variables › Actions › New repository secret) :
  `BASE_RECETTE` pour `Apiviz-test`, `BASE_PRODUCTION` pour `Apiviz`. Valeur : la chaîne de connexion donnée par
  Supabase (projet › Connect › Session pooler), avec le mot de passe de la base à la place de `[YOUR-PASSWORD]`.
  Ne jamais l'écrire dans le dépôt ni dans une conversation. Sans secret, rien n'est appliqué automatiquement.
- **Limites** : sauvegarde quotidienne seulement une fois activée, pas encore juste avant chaque migration (D-03) ; la connexion est chiffrée mais le certificat du serveur
  n'est pas vérifié ; une migration qui casse l'ancienne version est signalée dans le journal, pas bloquée.
- **Annonce dès la recette** : chaque mise en ligne en recette dit, dans son résumé, ce que la production demandera
  (« Apiviz en est à 016 ; à appliquer : 017, 018, 019 ») et si le secret `BASE_PRODUCTION` est là pour le faire.
- **Essai sans rien écrire** : `BASE="…" node scripts/appliquer-migrations.mjs --simuler`.
- Tests : `tests/sql/test_appliquer.mjs`.

## Avant d'ouvrir une PR d'écran (gabarit commun, v5.43)

À cocher dans la description de la PR quand elle touche un écran :
1. Le squelette est celui du gabarit (`docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §5) : titre = un nom, retour seulement
   sous le 1er niveau, ⋯ pour les actions rares.
2. Filtres, tri et période passent par une feuille du bas, pas par des rangées de boutons dans l'écran.
3. Un seul bouton principal (`main` ou `honey`) ; pas de second « Ajouter » ailleurs dans l'écran.
4. Textes de 12 px minimum, cibles de 44 px, couleurs et rayons par les jetons (`styles/jetons.css`).
5. Captures jointes : téléphone (390 px) et ordinateur (1 280 px).
6. Standards d'écran (v5.50) : `etapes_sd` vert ; un nouvel écran est ajouté à sa liste `ECRANS` ; un écran à onglets
   est déclaré dans `SUJETS` (`src/noyau/gabarit.js`) au lieu de dessiner ses propres onglets.

## Règles de contenu

- **Arborescence gelée** (AP-FEAT-113) : la place des rubriques et des écrans est celle de
  `docs/ROADMAP/05_UX_UI_ET_NAVIGATION.md` §2. Déplacer, renommer ou ajouter une rubrique passe d'abord par la roadmap
  (décision notée), puis `docs/GUIDE.md` et les astuces de l'app sont mis à jour dans la même pull request.
- **Ton** (AP-FEAT-112) : tutoiement dans l'application, vouvoiement dans les documents émis
  (`docs/CHARTE_DE_TON.md`). « Vérifier » échoue sur un nouveau « vous » non justifié.

## Santé de la production

Action « Santé » (`.github/workflows/sante.yml`), chaque matin à 6 h 13 UTC et à la demande. Elle vérifie que
app.apiviz.fr, recette.apiviz.fr et apiviz.fr répondent, et compte les erreurs **nouvelles** (jamais vues avant) que
l'application a envoyées à `journal_erreurs` depuis 24 h. Un site muet ou une nouvelle erreur la fait échouer : GitHub
envoie alors un e-mail (réglage GitHub › Settings › Notifications › Actions : « Only notify for failed workflows »). Le
journal de l'action ne montre que l'écran, la version, le nombre de fois et le début de l'empreinte (dépôt public).

Lire le texte des erreurs : Supabase (projet Apiviz) › SQL Editor :
`select ecran, version, compteur, message, premiere_fois from journal_erreurs where premiere_fois > now() - interval '7 days' order by compteur desc;`

## Sauvegardes

Action « Sauvegarde » (`.github/workflows/sauvegarde.yml`), chaque nuit à 2 h 43 UTC et à la demande : copie de la base
`Apiviz` (schéma `public`), **restaurée sur un Postgres vide avant d'être envoyée** (`scripts/essai-restauration.sh` :
tout se recrée sans erreur, chaque table garde sa protection par ligne, mêmes nombres de lignes si la base n'a pas bougé
pendant la copie), chiffrée avec `age`, envoyée dans un seau Cloudflare R2 privé, gardée 30 jours. Le dimanche (ou à la
demande, case « fichiers »), copie chiffrée des fichiers des photos et des factures, gardée 4 semaines. Une copie qui
ne se restaure pas fait échouer l'action : GitHub envoie un e-mail. **Inactive tant que les réglages ci-dessous
n'existent pas** : elle le dit dans son résumé et s'arrête sans erreur (D-03).

Activer la copie de la base (une fois, environ 10 minutes) :
1. Sur ton ordinateur : `age-keygen -o apiviz-sauvegarde.key`. Garde ce fichier **hors ligne** (clé USB, gestionnaire de
   mots de passe) : sans lui, aucune sauvegarde ne se relit. Recopie la ligne « public key: age1… ». Ne la donne à
   personne d'autre, Claude compris : seule la clé publique va dans GitHub.
2. Cloudflare (compte Apiviz) › R2 : seau privé **`apiviz-sauvegardes-ue`** (créé le 26 nov. 2026, emplacement Europe de
   l'Ouest WEUR, choisi par « location hint » ; un nom déjà utilisé garde l'emplacement de sa première création), puis un jeton d'API R2 limité
   à ce seau, en lecture et écriture. Noter l'identifiant du compte, l'Access Key ID et le Secret Access Key.
3. GitHub › Settings › Secrets and variables › Actions :
   - variables : `SAUVEGARDE_CLE_PUBLIQUE` (age1…) et `R2_SEAU` (nom du seau) ;
   - secrets : `R2_COMPTE` (identifiant du compte Cloudflare), `R2_ID`, `R2_SECRET`. `BASE_PRODUCTION` existe déjà.
4. Actions › Sauvegarde › Run workflow : le résumé doit dire « restauration essayée » et la taille du fichier envoyé.

Activer en plus la copie des fichiers (photos, factures) :
1. Supabase (projet `Apiviz`) › Project Settings › Storage › S3 Connection : activer l'accès S3, noter la région affichée
   (par exemple `eu-west-3`), puis « New access key » : noter l'Access Key ID et le Secret.
2. GitHub : variable `STOCKAGE_REGION` (la région), secrets `STOCKAGE_ID` et `STOCKAGE_SECRET`.
3. Actions › Sauvegarde › Run workflow avec la case « fichiers » cochée : le résumé donne le nombre de fichiers copiés.
   Cette clé donne accès à tous les fichiers du projet : la garder seulement dans GitHub.

Restaurer (sur une base vide d'abord, jamais directement sur la production) :
1. Télécharger le fichier depuis le seau R2, puis `age -d -i apiviz-sauvegarde.key apidoo-AAAA-MM-JJ.dump.age > apiviz.dump`.
2. Sur un Postgres vide (local ou nouveau projet) : `scripts/essai-restauration.sh apiviz.dump "$BASE_VIDE"` ; sur un
   projet Supabase neuf, `pg_restore --no-owner --no-privileges --dbname "$BASE_CIBLE" apiviz.dump` (les rôles et schémas
   de Supabase y sont déjà ; ne pas y lancer `socle-supabase.sql`).
3. Fichiers : `age -d -i apiviz-sauvegarde.key fichiers-AAAA-MM-JJ.tar.age | tar -x`, puis renvoyer chaque dossier dans
   le seau du même nom (`aws s3 sync fichiers/photos-visites s3://photos-visites --endpoint-url …`).
Les comptes de connexion ne sont pas dans la copie : chacun se reconnecte avec son adresse e-mail et retrouve ses
exploitations (membres).

**Exercice de restauration, une fois par trimestre** (le premier avant l'ouverture au public) : prendre la copie de la
veille, faire les étapes 1 et 2 sur ton ordinateur, noter la date et la durée ici :

| Date | Copie restaurée | Durée | Remarques |
|---|---|---|---|
| | | | |

## Retour arrière

Revenir à une version antérieure en passant par le même circuit (revert, recette, production). Cela suffit quand les migrations sont additives.

**Exception, migration 008 :** l'ancienne app ne fonctionne plus avec la base une fois 008 appliquée, car la v4 n'envoie pas l'en-tête `x-exploitation` et appelle `est_membre()` sans paramètre. La 008 et la v5.0 doivent partir ensemble : envoyer les saisies hors ligne en attente sur chaque téléphone, sauvegarder toute la base, appliquer la migration, lancer aussitôt la production. Le retour arrière passe alors par la restauration de la sauvegarde.

## Différences avec Gladoo, pour l'instant

- Web sur GitHub Pages (Gladoo : Cloudflare, avec son nom de domaine).
- Migrations appliquées par Claude via l'accès Supabase, recette puis production (Gladoo : par la mise en ligne, avec la CLI Supabase).
- Pas d'application mobile compilée : Apiviz s'installe depuis le site (Gladoo : Expo). Le choix et la suite sont dans `MOBILE.md`.
