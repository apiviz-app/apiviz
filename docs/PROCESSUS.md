# Processus : recette, validation, production

Même méthode que Gladoo : un seul dépôt, un seul code, et rien ne part en ligne sans un clic.

| | Recette | Production |
|---|---|---|
| Adresse | https://apiviz-app.github.io/apiviz/recette/ | https://apiviz-app.github.io/apiviz/ |
| Base | Supabase `apidoo-test` (données fictives) | Supabase `apidoo` (vraies données) |
| Repère de version | étiquette git `recette` | étiquette git `deploiement` |
| Reconnaissable | étiquette « RECETTE » en haut de l'écran, mêmes couleurs que la production | aucun |

**Cloudflare (IT-29, depuis le 13 nov. 2026)** : chaque mise en ligne publie aussi la cible sur son domaine,
`https://recette.apiviz.fr` ou `https://apiviz.fr` (`wrangler.jsonc`), avec le jeton `CLOUDFLARE_API_TOKEN` et
`CLOUDFLARE_ACCOUNT_ID` (secrets du dépôt, créés par Pierre-Louis ; jamais dans un fichier). GitHub Pages reste en
place jusqu'à la bascule de la production.

Le code est le même. Seuls `environnements/recette/` (`config.js`, manifeste) et le préfixe de `sw.js` diffèrent, appliqués par `scripts/assembler-site.sh`.

## Cycle d'une version

1. **Branche** : créer `claude/…` depuis `main`. Jamais d'envoi direct sur `main`.
2. **Base de données** : toute migration est appliquée d'abord sur `apidoo-test`, notée dans `migrations/README.md`, et ajoutée à `migrations/a-appliquer-en-production.txt`.
3. **Pull request vers `main`** : « Vérifier » lance les tests. La fusion ne publie rien. **GitHub refuse la fusion
   tant que « verifier » et « Tests SQL » ne sont pas verts sur la branche à jour avec `main`** (règle « main
   protégée », posée le 13 nov. 2026 après #46, #47, #48 et #50 fusionnées en rouge). Si GitHub demande « Update
   branch », cliquer, attendre le vert, puis fusionner. En cas de conflit (« This branch has conflicts »), ne pas le résoudre dans l'éditeur de GitHub :
   demander à Claude de remettre la branche à jour. Deux fusions y ont perdu une feuille de style et une rubrique du
   CHANGELOG (#33, #46).
4. **Recette** : Actions › Mise en ligne › Run workflow, cible `recette`. Une branche peut y être essayée avant fusion.
5. **Validation** : tester sur téléphone avec la rubrique « À vérifier » de `docs/CHANGELOG.md`.
6. **Base de production** : plus d'étape à part. Quand le secret `BASE_PRODUCTION` existe (voir « Mise à jour
   automatique des bases »), lancer la mise en ligne en production applique d'abord les migrations en attente sur `apidoo`,
   puis publie : **choisir la cible `production` vaut accord pour mettre à jour la base**. Sans le secret, Claude les
   applique par l'accès Supabase une fois l'accord donné dans la conversation, avec un relevé de structure dans
   `migrations/releves/`. Sauvegarde quotidienne chiffrée prête à activer : voir « Sauvegardes » (D-03).
7. **Production** : Actions › Mise en ligne › Run workflow, cible `production`. Elle publie **la version en recette,
   telle quelle** (repère `recette`), même si `main` a avancé depuis (documentation, réglage de GitHub, autre fusion) :
   ces changements partiront à la prochaine recette. Seule condition : la version en recette doit être fusionnée sur
   `main` (une branche essayée en recette avant fusion est refusée). Si « Vérifier » est encore en cours, la mise en
   ligne l'attend ; s'il a été annulé par GitHub (aucune machine), elle le relance ; seul un test réellement en échec
   la refuse.
   La mise en ligne compare ensuite la structure de la base `apidoo` aux fichiers de migrations
   (`scripts/controler-structure.mjs`, clé publique, lecture seule) et refuse de partir en cas d'écart, en disant où en
   est la base et quelles migrations manquent. En recette, un écart avec `apidoo-test` n'est qu'un avertissement.
8. **Après** : vider la liste des migrations en attente (`migrations/a-appliquer-en-production.txt`, simple mémo), passer la version à « en production » dans `CHANGELOG.md`.

## Mise à jour automatique des bases

Depuis le 11 nov. 2026, « Mise en ligne » applique elle-même les migrations qui manquent à la base de la cible
(`scripts/appliquer-migrations.mjs`), juste après les contrôles et avant de publier.

- **Comment elle sait où en est la base** : elle lit sa structure (colonnes, fonctions, règles d'accès, déclencheurs,
  contraintes, index) et la compare aux fichiers rejoués un par un sur une base vide. La base « en est » à la dernière
  migration qui donne exactement la même structure. Aucune migration déjà en place n'est relancée.
- **Tout ou rien** : chaque migration passe dans une transaction. Une erreur l'annule en entier, arrête la mise en
  ligne et rien n'est publié ; le journal de l'action dit laquelle et pourquoi.
- **Base modifiée à la main** : si la structure ne correspond à aucune étape, rien n'est appliqué et les écarts sont listés.
- **Recette** : une branche essayée en recette applique ses migrations sur `apidoo-test` (c'est la règle « d'abord
  `apidoo-test` »). La production n'accepte que la version en recette : ses migrations ont donc déjà tourné une fois.
- **Secrets à créer une fois** (GitHub › Settings › Secrets and variables › Actions › New repository secret) :
  `BASE_RECETTE` pour `apidoo-test`, `BASE_PRODUCTION` pour `apidoo`. Valeur : la chaîne de connexion donnée par
  Supabase (projet › Connect › Session pooler), avec le mot de passe de la base à la place de `[YOUR-PASSWORD]`.
  Ne jamais l'écrire dans le dépôt ni dans une conversation. Sans secret, rien n'est appliqué automatiquement.
- **Limites** : sauvegarde quotidienne seulement une fois activée, pas encore juste avant chaque migration (D-03) ; la connexion est chiffrée mais le certificat du serveur
  n'est pas vérifié ; une migration qui casse l'ancienne version est signalée dans le journal, pas bloquée.
- **Annonce dès la recette** : chaque mise en ligne en recette dit, dans son résumé, ce que la production demandera
  (« apidoo en est à 016 ; à appliquer : 017, 018, 019 ») et si le secret `BASE_PRODUCTION` est là pour le faire.
- **Essai sans rien écrire** : `BASE="…" node scripts/appliquer-migrations.mjs --simuler`.
- Tests : `tests/sql/test_appliquer.mjs`.

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
`apidoo` (schéma `public`), contrôlée (le fichier se relit et contient au moins 20 tables), chiffrée avec `age`, envoyée
dans un seau Cloudflare R2 privé, gardée 30 jours. **Inactive tant que les réglages ci-dessous n'existent pas** : elle
le dit dans son résumé et s'arrête sans erreur (décision D-03, 14 nov. 2026 : prête à activer).

Activer (une fois, environ 10 minutes) :
1. Sur ton ordinateur : `age-keygen -o apiviz-sauvegarde.key`. Garde ce fichier **hors ligne** (clé USB, gestionnaire de
   mots de passe) : sans lui, aucune sauvegarde ne se relit. Recopie la ligne « public key: age1… ».
2. Cloudflare (compte Apiviz) › R2 : créer un seau privé, par exemple `apiviz-sauvegardes`, puis un jeton d'API R2 limité
   à ce seau, en lecture et écriture. Noter l'identifiant du compte, l'Access Key ID et le Secret Access Key.
3. GitHub › Settings › Secrets and variables › Actions :
   - variables : `SAUVEGARDE_CLE_PUBLIQUE` (age1…) et `R2_SEAU` (nom du seau) ;
   - secrets : `R2_COMPTE` (identifiant du compte Cloudflare), `R2_ID`, `R2_SECRET`. `BASE_PRODUCTION` existe déjà.
4. Actions › Sauvegarde › Run workflow : le résumé doit afficher la taille du fichier envoyé.

Restaurer (sur un projet Supabase vide d'abord, jamais directement sur la production) :
`age -d -i apiviz-sauvegarde.key apidoo-AAAA-MM-JJ.dump.age > apidoo.dump`, puis
`pg_restore --no-owner --no-privileges --dbname "$BASE_CIBLE" apidoo.dump`. Les comptes de connexion ne sont pas dans la
copie : chacun se reconnecte avec son adresse e-mail et retrouve ses exploitations (membres). Les fichiers des photos ne
sont pas sauvegardés par cette action (à prévoir : copie hebdomadaire du stockage, 10_STRATEGIE_DEPLOIEMENT.md § 4).

## Retour arrière

Revenir à une version antérieure en passant par le même circuit (revert, recette, production). Cela suffit quand les migrations sont additives.

**Exception, migration 008 :** l'ancienne app ne fonctionne plus avec la base une fois 008 appliquée, car la v4 n'envoie pas l'en-tête `x-exploitation` et appelle `est_membre()` sans paramètre. La 008 et la v5.0 doivent partir ensemble : envoyer les saisies hors ligne en attente sur chaque téléphone, sauvegarder toute la base, appliquer la migration, lancer aussitôt la production. Le retour arrière passe alors par la restauration de la sauvegarde.

## Différences avec Gladoo, pour l'instant

- Web sur GitHub Pages (Gladoo : Cloudflare, avec son nom de domaine).
- Migrations appliquées par Claude via l'accès Supabase, recette puis production (Gladoo : par la mise en ligne, avec la CLI Supabase).
- Pas d'application mobile compilée : Apiviz s'installe depuis le site (Gladoo : Expo). Le choix et la suite sont dans `MOBILE.md`.
