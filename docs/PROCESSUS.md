# Processus : recette, validation, production

Même méthode que Gladoo : un seul dépôt, un seul code, et rien ne part en ligne sans un clic.

| | Recette | Production |
|---|---|---|
| Adresse | https://apidoo.github.io/recette/ | https://apidoo.github.io/ |
| Base | Supabase `apidoo-test` (données fictives) | Supabase `apidoo` (vraies données) |
| Repère de version | étiquette git `recette` | étiquette git `deploiement` |
| Reconnaissable | étiquette « RECETTE » en haut de l'écran, mêmes couleurs que la production | aucun |

Le code est le même. Seuls `environnements/recette/` (`config.js`, manifeste) et le préfixe de `sw.js` diffèrent, appliqués par `scripts/assembler-site.sh`.

## Cycle d'une version

1. **Branche** : créer `claude/…` depuis `main`. Jamais d'envoi direct sur `main`.
2. **Base de données** : toute migration est appliquée d'abord sur `apidoo-test`, notée dans `migrations/README.md`, et ajoutée à `migrations/a-appliquer-en-production.txt`.
3. **Pull request vers `main`** : « Vérifier » lance les tests. La fusion ne publie rien.
4. **Recette** : Actions › Mise en ligne › Run workflow, cible `recette`. Une branche peut y être essayée avant fusion.
5. **Validation** : tester sur téléphone avec la rubrique « À vérifier » de `docs/CHANGELOG.md`.
6. **Base de production** : appliquer les migrations en attente sur `apidoo`. Depuis le 6 nov. 2026, Claude les applique lui-même
   par l'accès Supabase (décision de Pierre-Louis : pas d'action manuelle), une fois l'accord donné dans la conversation,
   avec un relevé de structure avant/après enregistré dans `migrations/releves/`. Pas de sauvegarde automatique pour le moment (D-03).
7. **Production** : Actions › Mise en ligne › Run workflow, cible `production`. Seule la version exacte en recette est acceptée.
   Depuis IT-04, la mise en ligne compare elle-même la structure de la base `apidoo` aux fichiers de migrations
   (`scripts/controler-structure.mjs`, clé publique, lecture seule) et refuse de partir en cas d'écart : il n'y a plus de
   case « migrations faites ». En recette, un écart avec `apidoo-test` n'est qu'un avertissement.
8. **Après** : vider la liste des migrations en attente, passer la version à « en production » dans `CHANGELOG.md`.

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
