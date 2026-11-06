#!/bin/sh
# Assemble le site publié : la production à la racine, la recette dans /recette/.
# Usage : sh scripts/assembler-site.sh <source production> <source recette> <dossier de sortie>
set -e
PROD=xkucyqzlqfeyuomrtjbu
TEST=zaaaiqyhxehvgowlgztx
prod=$(cd "$1" && pwd); rec=$(cd "$2" && pwd); sortie=$3

copier() { # Seuls les fichiers du site sont publiés : premier niveau du dépôt, plus src/ et styles/ (IT-03).
  mkdir -p "$2"
  for f in "$1"/*.html "$1"/*.js "$1"/*.svg "$1"/*.png "$1"/*.webmanifest; do
    [ -f "$f" ] && cp "$f" "$2"/
  done
  for d in src styles; do
    [ -d "$1/$d" ] || continue
    (cd "$1" && find "$d" -type f \( -name '*.js' -o -name '*.css' \)) | while read -r f; do
      mkdir -p "$2/$(dirname "$f")" && cp "$1/$f" "$2/$f"
    done
  done
}

rm -rf "$sortie"
copier "$prod" "$sortie"
copier "$rec" "$sortie/recette"
cp "$rec"/environnements/recette/* "$sortie/recette/"

# Version (date du commit + commit) et liste des fichiers gardés hors ligne, générées depuis index.html (IT-03).
version() { # $1 : dossier source
  if git -C "$1" rev-parse -q --verify HEAD > /dev/null 2>&1; then
    echo "apidoo-$(git -C "$1" log -1 --format=%cs)-$(git -C "$1" rev-parse --short HEAD)$(git -C "$1" diff --quiet HEAD -- . 2>/dev/null || echo -modifie)"
  else echo "apidoo-$(date -u +%F)-local"; fi
}
python3 "$rec/scripts/generer-coquille.py" "$sortie" "$(version "$prod")"
python3 "$rec/scripts/generer-coquille.py" "$sortie/recette" "recette-$(version "$rec")"
# Sources antérieures à IT-03 (sw.js écrit à la main) : la recette garde son préfixe comme avant.
grep -q 'const VERSION = "recette-' "$sortie/recette/sw.js" || sed -i 's/const VERSION = "/const VERSION = "recette-/' "$sortie/recette/sw.js"

# Garde-fou : chaque environnement ne parle qu'à sa propre base.
# Tous les fichiers publiés en production, sous-dossiers compris, sauf le dossier de la recette.
if grep -rlq --exclude-dir=recette "$TEST" "$sortie"; then
  echo "ERREUR : base de recette dans la production ($(grep -rl --exclude-dir=recette "$TEST" "$sortie" | head -1))."; exit 1
fi
if grep -rq "$PROD" "$sortie/recette"; then echo "ERREUR : base de production dans la recette."; exit 1; fi
grep -q "$PROD" "$sortie/config.js" || { echo "ERREUR : config.js de production incorrect."; exit 1; }
grep -q "$TEST" "$sortie/recette/config.js" || { echo "ERREUR : config.js de recette incorrect."; exit 1; }
if grep -q 'const VERSION = "recette-' "$sortie/sw.js"; then echo "ERREUR : version de recette en production."; exit 1; fi
echo "Site assemblé : production et recette correctes."
