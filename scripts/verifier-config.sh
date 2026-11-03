#!/bin/sh
# Garde-fou : chaque environnement ne doit parler qu'à sa propre base.
# Usage : sh scripts/verifier-config.sh recette|production
set -e
cd "$(dirname "$0")/.."
PROD=xkucyqzlqfeyuomrtjbu
TEST=zaaaiqyhxehvgowlgztx
case "$1" in
  recette)    bonne=$TEST; autre=$PROD ;;
  production) bonne=$PROD; autre=$TEST ;;
  *) echo "Usage : $0 recette|production"; exit 2 ;;
esac
erreur=0
grep -q "$bonne" config.js || { echo "ERREUR : config.js ne pointe pas vers la base $1."; erreur=1; }
if grep -rIl "$autre" . --exclude-dir=.git --exclude=verifier-config.sh; then
  echo "ERREUR : référence à la base de l'autre environnement dans les fichiers ci-dessus."; erreur=1
fi
if [ "$1" = production ]; then
  grep -q "env: *'recette'" config.js && { echo "ERREUR : config.js de recette en production."; erreur=1; }
  grep -q 'const VERSION = "recette-' sw.js && { echo "ERREUR : version de recette dans sw.js."; erreur=1; }
else
  grep -q 'const VERSION = "recette-' sw.js || { echo "ERREUR : sw.js doit garder le préfixe recette-."; erreur=1; }
fi
[ "$erreur" = 0 ] && echo "Configuration $1 correcte."
exit "$erreur"
