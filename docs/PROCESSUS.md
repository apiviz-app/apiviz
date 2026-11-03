# Processus : recette, validation, production

Même méthode que Gladoo : un seul dépôt, un seul code, et rien ne part en ligne sans un clic.

| | Recette | Production |
|---|---|---|
| Adresse | https://apidoo.github.io/recette/ | https://apidoo.github.io/ |
| Base | Supabase `apidoo-test` (données fictives) | Supabase `apidoo` (vraies données) |
| Repère de version | étiquette git `recette` | étiquette git `deploiement` |
| Reconnaissable | bandeau « RECETTE », barre orange | aucun |

Le code est le même. Seuls `environnements/recette/` (`config.js`, manifeste) et le préfixe de `sw.js` diffèrent, appliqués par `scripts/assembler-site.sh`.

## Cycle d'une version

1. **Branche** : créer `claude/…` depuis `main`. Jamais d'envoi direct sur `main`.
2. **Base de données** : toute migration est appliquée d'abord sur `apidoo-test`, notée dans `migrations/README.md`, et ajoutée à `migrations/a-appliquer-en-production.txt`.
3. **Pull request vers `main`** : « Vérifier » lance les tests. La fusion ne publie rien.
4. **Recette** : Actions › Mise en ligne › Run workflow, cible `recette`. Une branche peut y être essayée avant fusion.
5. **Validation** : tester sur téléphone avec la rubrique « À vérifier » de `docs/CHANGELOG.md`.
6. **Base de production** : sauvegarder, puis appliquer les migrations en attente sur `apidoo`.
7. **Production** : Actions › Mise en ligne › Run workflow, cible `production`, case « migrations faites » si besoin. Seule la version exacte en recette est acceptée.
8. **Après** : vider la liste des migrations en attente, passer la version à « en production » dans `CHANGELOG.md`.

## Retour arrière

Revenir à une version antérieure en passant par le même circuit (revert, recette, production). Cela suffit quand les migrations sont additives.

**Exception, migration 008 :** l'ancienne app ne fonctionne plus avec la base une fois 008 appliquée, car la v4 n'envoie pas l'en-tête `x-exploitation` et appelle `est_membre()` sans paramètre. La 008 et la v5.0 doivent partir ensemble : envoyer les saisies hors ligne en attente sur chaque téléphone, sauvegarder toute la base, appliquer la migration, lancer aussitôt la production. Le retour arrière passe alors par la restauration de la sauvegarde.

## Différences avec Gladoo, pour l'instant

- Web sur GitHub Pages (Gladoo : Cloudflare, avec son nom de domaine).
- Migrations appliquées à la main dans Supabase (Gladoo : par la mise en ligne, avec la CLI Supabase).
- Pas d'application mobile compilée : Apidoo s'installe depuis le site (Gladoo : Expo).
