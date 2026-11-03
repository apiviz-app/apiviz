#!/bin/sh
# Met en production ce qui a été validé en recette : copie recette/ à la racine, sauf config.js.
set -e
cd "$(dirname "$0")/.."
for f in recette/*; do
  b=$(basename "$f")
  case "$b" in config.js|manifest.webmanifest) continue;; esac
  cp "$f" "./$b"
done
sed -i 's/const VERSION = "recette-/const VERSION = "/' sw.js
echo "Production = recette. Vérifier, puis : git commit et git push."
