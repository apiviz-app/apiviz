#!/bin/sh
# Assemble le site publié : la production à la racine, la recette dans /recette/.
# Usage : sh scripts/assembler-site.sh <source production> <source recette> <dossier de sortie>
set -e
PROD=xkucyqzlqfeyuomrtjbu
TEST=zaaaiqyhxehvgowlgztx
prod=$(cd "$1" && pwd); rec=$(cd "$2" && pwd); sortie=$3

copier() { # Seuls les fichiers du site, au premier niveau du dépôt, sont publiés.
  mkdir -p "$2"
  for f in "$1"/*.html "$1"/*.js "$1"/*.svg "$1"/*.png "$1"/*.webmanifest; do
    [ -f "$f" ] && cp "$f" "$2"/
  done
}

rm -rf "$sortie"
copier "$prod" "$sortie"
copier "$rec" "$sortie/recette"
cp "$rec"/environnements/recette/* "$sortie/recette/"
sed -i 's/const VERSION = "/const VERSION = "recette-/' "$sortie/recette/sw.js"

# Garde-fou : chaque environnement ne parle qu'à sa propre base.
for f in "$sortie"/*.js; do
  if grep -q "$TEST" "$f"; then echo "ERREUR : base de recette dans la production ($f)."; exit 1; fi
done
if grep -rq "$PROD" "$sortie/recette"; then echo "ERREUR : base de production dans la recette."; exit 1; fi
grep -q "$PROD" "$sortie/config.js" || { echo "ERREUR : config.js de production incorrect."; exit 1; }
grep -q "$TEST" "$sortie/recette/config.js" || { echo "ERREUR : config.js de recette incorrect."; exit 1; }
if grep -q 'const VERSION = "recette-' "$sortie/sw.js"; then echo "ERREUR : version de recette en production."; exit 1; fi
echo "Site assemblé : production et recette correctes."
