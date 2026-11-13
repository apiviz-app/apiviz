# Processus : recette, validation, production

Même méthode que Gladoo : un seul dépôt, un seul code, et rien ne part en ligne sans un clic.

| | Recette | Production |
|---|---|---|
| Adresse | https://apiviz-app.github.io/apiviz/recette/ | https://apiviz-app.github.io/apiviz/ |
| Base | Supabase `apidoo-test` (données fictives) | Supabase `apidoo` (vraies données) |
| Repère de version | étiquette git `recette` | étiquette git `deploiement` |
| Reconnaissable | étiquette « RECETTE » en haut de l'écran, mêmes couleurs que la production | aucun |

**Cloudflare (IT-29, depuis le 13 nov. 2026)** : chaque mise en ligne publie aussi la cible sur son domaine,
`https://recette.apiviz.fr` ou `https://app.apiviz.fr` (`wrangler.jsonc`), avec les secrets `CLOUDFLARE_API_TOKEN`
et `CLOUDFLARE_ACCOUNT_ID` (créés par Pierre-Louis ; jamais dans un fichier). GitHub Pages reste en place jusqu'à la
bascule de la production. Le site vitrine `https://apiviz.fr` (dossier `site/`) part à part : Actions › Site vitrine.

Le code est le même. Seuls `environnements/recette/` (`config.js`, manifeste) et le préfixe de `sw.js` diffèrent, appliqués par `scripts/assembler-site.sh`.

## Cycle d'une version

1. **Branche** : créer `claude/…` depuis `main`. Jamais d'envoi direct sur `main`.
2. **Base de données** : toute migration est appliquée d'abord sur `apidoo-test`, notée dans `migrations/README.md`, et ajoutée à `migrations/a-appliquer-en-production.txt`.
3. **Pull request vers `main`** : « Vérifier » lance les tests. La fusion ne publie rien.
4. **Recette** : Actions › Mise en ligne › Run workflow, cible `recette`. Une branche peut y être essayée avant fusion.
5. **Validation** : tester sur téléphone avec la rubrique « À vérifier » de `docs/CHANGELOG.md`.
6. **Base de production** : plus d'étape à part. Quand le secret `BASE_PRODUCTION` existe (voir « Mise à jour
   automatique des bases »), lancer la mise en ligne en production applique d'abord les migrations en attente sur `apidoo`,
   puis publie : **choisir la cible `production` vaut accord pour mettre à jour la base**. Sans le secret, Claude les
   applique par l'accès Supabase une fois l'accord donné dans la conversation, avec un relevé de structure dans
   `migrations/releves/`. Pas de sauvegarde automatique pour le moment (D-03).
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
- **Limites** : pas de sauvegarde avant migration (D-03) ; la connexion est chiffrée mais le certificat du serveur
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

## Retour arrière

Revenir à une version antérieure en passant par le même circuit (revert, recette, production). Cela suffit quand les migrations sont additives.

**Exception, migration 008 :** l'ancienne app ne fonctionne plus avec la base une fois 008 appliquée, car la v4 n'envoie pas l'en-tête `x-exploitation` et appelle `est_membre()` sans paramètre. La 008 et la v5.0 doivent partir ensemble : envoyer les saisies hors ligne en attente sur chaque téléphone, sauvegarder toute la base, appliquer la migration, lancer aussitôt la production. Le retour arrière passe alors par la restauration de la sauvegarde.

## Différences avec Gladoo, pour l'instant

- Web sur GitHub Pages (Gladoo : Cloudflare, avec son nom de domaine).
- Migrations appliquées par Claude via l'accès Supabase, recette puis production (Gladoo : par la mise en ligne, avec la CLI Supabase).
- Pas d'application mobile compilée : Apiviz s'installe depuis le site (Gladoo : Expo). Le choix et la suite sont dans `MOBILE.md`.
