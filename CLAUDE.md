# Apiviz (anciennement Apidoo)

- Rien n'est fusionné sur `main`, mis en production ni appliqué sur la base `apidoo` sans l'accord de Pierre-Louis.
- Travailler sur une branche `claude/…` et ouvrir une pull request. Suivre `docs/PROCESSUS.md`.
- Une fusion ne publie rien : la mise en ligne passe par l'action « Mise en ligne », recette puis production.
- La racine du dépôt contient la configuration de production. Ne jamais y mettre la base de recette.
- Toute migration : d'abord `apidoo-test`, et indiquer si elle casse l'ancienne version.
- Les données sont réelles : ne jamais écrire de mot de passe ni de clé secrète dans le dépôt.
