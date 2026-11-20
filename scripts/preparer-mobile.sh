#!/bin/sh
# Prépare les fichiers embarqués dans les applications Android et iOS (IT-30, AP-TECH-386).
# Usage : sh scripts/preparer-mobile.sh [recette|production]   (recette par défaut)
# Source unique : le site assemblé par scripts/assembler-site.sh, copié dans _mobile/ (webDir de capacitor.config.json).
# scripts/embarquer-mobile.sh copie les bibliothèques jsdelivr dans l'application (elle s'ouvre sans réseau dès le
# premier lancement, règle 4.2 d'Apple et AP-US-137) et écrit version-mobile.json. Les polices sont hébergées avec le
# site depuis la v5.72 (styles/polices/) : plus rien n'est chargé chez Google.
set -e
cible=${1:-recette}
racine=$(cd "$(dirname "$0")/.." && pwd)
cd "$racine"

sh scripts/assembler-site.sh . . _site > /dev/null
rm -rf _mobile
case "$cible" in
  recette) cp -R _site/recette _mobile ;;
  production)
    mkdir _mobile
    (cd _site && find . -mindepth 1 -maxdepth 1 ! -name recette -exec cp -R {} ../_mobile/ \;) ;;
  *) echo "Cible inconnue : $cible (recette ou production)"; exit 1 ;;
esac

sh scripts/embarquer-mobile.sh _mobile
# Garde-fous d'environnement, comme pour le site.
if [ "$cible" = recette ]; then grep -q "env: 'recette'" _mobile/config.js || { echo "ERREUR : config.js n'est pas celui de la recette."; exit 1; }
elif grep -q "env: 'recette'" _mobile/config.js; then echo "ERREUR : base de recette dans l'application de production."; exit 1; fi
echo "Fichiers de l'application ($cible) prêts dans _mobile/ : $(find _mobile -type f | wc -l) fichiers."
