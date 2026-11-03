# Processus : recette, validation, production

| | Recette | Production |
|---|---|---|
| Adresse | https://apidoo.github.io/recette/ | https://apidoo.github.io/ |
| Fichiers | dossier `recette/` | racine du dépôt |
| Base | Supabase `apidoo-test` (données fictives) | Supabase `apidoo` (vraies données) |
| Repère | bandeau « RECETTE », barre orange | aucun |

Les deux environnements gardent sur le téléphone des données séparées (cache hors ligne, photos, service worker).

## Cycle d'une version
1. **Développement** : les changements sont faits dans `recette/` (jamais directement à la racine).
2. **Base de données** : toute migration est appliquée d'abord sur `apidoo-test`, et notée dans `migrations/README.md`.
3. **Livraison en recette** : tests automatiques (`tests/`), puis `git push` → en ligne en 1 à 2 minutes.
4. **Cahier de recette** : ajouté en tête de `docs/CHANGELOG.md`, rubrique « À vérifier ».
5. **Validation** : le responsable teste sur son téléphone et répond « validé » (ou liste les problèmes).
6. **Mise en production** : migration appliquée sur `apidoo`, puis `scripts/promouvoir.sh`, `git commit`, `git push`.
7. **Documentation** : `CHANGELOG.md` (version validée et date), `GUIDE.md` et `TECHNIQUE.md` si besoin.

Retour arrière : `git revert` du commit de mise en production. Les migrations n'ajoutent que des éléments (aucune suppression), donc une ancienne version de l'app reste compatible.

Remettre la recette au niveau de la production : `scripts/vers-recette.sh`.
