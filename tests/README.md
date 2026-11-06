# Tests

Tests de bout en bout (Playwright, base Supabase simulée). Aucun ne touche une vraie base.

Lancer tout : `sh tests/lancer.sh` (prérequis : python3, playwright, google-chrome, npm).
Ils tournent aussi automatiquement sur chaque pull request du dépôt de recette.

`fabrique_tests.py` crée un `test_<nom>.py` par fichier `etapes_<nom>.txt`, à partir de `test_hl.py`.

`lancer.sh` lance aussi, sans toucher aucune base :
- les tests SQL de `tests/sql/` (Postgres en mémoire) ;
- le **contrôle de structure** : pour chaque relevé de `migrations/releves/`, 000 et les migrations sont rejouées
  jusqu'à la `derniere_migration` du relevé, et la structure obtenue doit être identique à celle relevée sur les
  vraies bases (`scripts/rejouer-migrations.mjs`). Une migration modifiée ou mal ordonnée fait échouer « Vérifier ».

`tests/production/` ne contient pas de test automatique : ce sont les données d'essai à charger à la main dans la base
de production pour vérifier les parcours qui n'ont pas de base simulée fidèle (voir son README).
