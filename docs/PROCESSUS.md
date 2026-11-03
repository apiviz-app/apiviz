# Processus : recette, validation, production

| | Recette | Production |
|---|---|---|
| Dépôt | [apidoo/apidoo-recette](https://github.com/apidoo/apidoo-recette) | [apidoo/apidoo.github.io](https://github.com/apidoo/apidoo.github.io) |
| Adresse | https://apidoo.github.io/apidoo-recette/ | https://apidoo.github.io/ |
| Base | Supabase `apidoo-test` (données fictives) | Supabase `apidoo` (vraies données) |
| Repère | bandeau « RECETTE », barre orange | aucun |

Les deux environnements gardent sur le téléphone des données séparées (cache hors ligne, photos, service worker).

## Cycle d'une version

1. **Branche** : dans `apidoo-recette`, créer une branche depuis `main`. Tout développement se fait ici, jamais dans le dépôt de production.
2. **Base de données** : toute migration est appliquée d'abord sur `apidoo-test`, et notée dans `migrations/README.md`.
3. **Pull request vers `main` d'`apidoo-recette`** : les tests et le contrôle de configuration tournent tout seuls. La fusion publie la recette en 1 à 2 minutes.
4. **Validation** : tester sur téléphone en suivant la rubrique « À vérifier » de `docs/CHANGELOG.md`.
5. **Proposition** : onglet Actions d'`apidoo-recette`, action « Proposer en production », saisir la version. Une pull request s'ouvre sur `apidoo.github.io`, avec les migrations à appliquer.
6. **Base de production** : appliquer ces migrations sur `apidoo`, s'il y en a.
7. **Mise en ligne** : fusionner la pull request. Le contrôle de configuration doit être vert. La production est publiée en 1 à 2 minutes.
8. **Documentation** : dans `apidoo-recette`, passer la version à « en production » dans `CHANGELOG.md`, compléter `GUIDE.md` et `TECHNIQUE.md` si besoin.

## Ce qui ne passe jamais d'un dépôt à l'autre

`config.js`, `manifest.webmanifest`, `README.md`, `.gitignore` et `.github/` sont propres à chaque dépôt. `sw.js` perd seulement son préfixe `recette-`. Cette règle est dans `scripts/preparer-production.sh`, et `scripts/verifier-config.sh` bloque une pull request qui mélangerait les deux bases.

## Retour arrière

Sur `apidoo.github.io`, bouton « Revert » de la pull request de mise en production, puis fusion. Les migrations n'ajoutent que des éléments (aucune suppression), donc une ancienne version de l'app reste compatible.

## Correctif urgent en production

Le corriger quand même dans `apidoo-recette`, puis suivre les étapes 3 à 7 en réduisant la validation. Un correctif fait directement en production serait effacé par la promotion suivante.

## Réglages à connaître

- Secret `PROD_REPO_TOKEN` (`apidoo-recette` › Settings › Secrets › Actions) : jeton GitHub du compte apidoo limité au dépôt `apidoo.github.io`, droits Contents et Pull requests en écriture. À renouveler à son expiration : sinon l'action « Proposer en production » échoue, sans aucun effet sur le site.
- Supabase `apidoo-test` › Authentication › URL Configuration : l'adresse de recette doit être autorisée, sinon les liens reçus par e-mail ne ramènent pas à la recette.
