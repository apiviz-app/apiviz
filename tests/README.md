# Tests

Tests de bout en bout (Playwright, base Supabase simulée). Aucun ne touche une vraie base.

Lancer tout : `sh tests/lancer.sh` (prérequis : python3, playwright, google-chrome, npm).
Ils tournent aussi automatiquement sur chaque pull request du dépôt de recette.

`fabrique_tests.py` crée un `test_<nom>.py` par fichier `etapes_<nom>.txt`, à partir de `test_hl.py`.
