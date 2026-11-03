#!/bin/sh
# (Ré)initialise la recette à partir de la production : copie les fichiers du site dans recette/, sauf config.js.
set -e
cd "$(dirname "$0")/.."
for f in *.html *.js *.svg *.png; do
  [ "$f" = "config.js" ] && continue
  cp "$f" "recette/$f"
done
sed -i 's/const VERSION = "/const VERSION = "recette-/' recette/sw.js
