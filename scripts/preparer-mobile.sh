#!/bin/sh
# Prépare les fichiers embarqués dans les applications Android et iOS (IT-30, AP-TECH-386).
# Usage : sh scripts/preparer-mobile.sh [recette|production]   (recette par défaut)
# Source unique : le site assemblé par scripts/assembler-site.sh, copié dans _mobile/ (webDir de capacitor.config.json).
# Les bibliothèques chargées depuis cdn.jsdelivr.net sont copiées dans l'application : elle s'ouvre sans réseau dès le
# premier lancement (règle 4.2 d'Apple et AP-US-137). Seules les polices Google restent en ligne (repli : polices du
# téléphone tant qu'elles n'ont pas été chargées une fois).
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

# Bibliothèques jsdelivr citées par le site : https://cdn.jsdelivr.net/npm/<paquet>@<version>/<chemin>
liens=$(grep -rhoE 'https://cdn\.jsdelivr\.net/npm/[^"'"'"' )]+' _mobile --include='*.html' --include='*.js' | sort -u)
travail=$(mktemp -d)
trap 'rm -rf "$travail"' EXIT
for lien in $liens; do
  reste=${lien#https://cdn.jsdelivr.net/npm/}
  case "$reste" in
    @*) paquet=$(echo "$reste" | cut -d/ -f1-2); chemin=$(echo "$reste" | cut -d/ -f3-) ;;
    *) paquet=$(echo "$reste" | cut -d/ -f1); chemin=$(echo "$reste" | cut -d/ -f2-) ;;
  esac
  dossier="$travail/$(echo "$paquet" | tr '/@' '__')"
  if [ ! -d "$dossier" ]; then
    mkdir -p "$dossier" && (cd "$dossier" && npm pack --silent "$paquet" > /dev/null && tar xzf ./*.tgz)
  fi
  [ -f "$dossier/package/$chemin" ] || { echo "ERREUR : $chemin absent de $paquet"; exit 1; }
  local_="vendor/$paquet/$chemin"
  mkdir -p "_mobile/$(dirname "$local_")" && cp "$dossier/package/$chemin" "_mobile/$local_"
  # Leaflet : ses images (marqueurs) sont à côté de sa feuille de style.
  [ -d "$dossier/package/dist/images" ] && cp -R "$dossier/package/dist/images" "_mobile/vendor/$paquet/dist/"
  # Remplacement du lien par le fichier embarqué, dans tous les fichiers du site.
  grep -rlF "$lien" _mobile --include='*.html' --include='*.js' | while read -r f; do
    python3 -c 'import sys,pathlib; p=pathlib.Path(sys.argv[1]); p.write_text(p.read_text(encoding="utf-8").replace(sys.argv[2], "./"+sys.argv[3]), encoding="utf-8")' "$f" "$lien" "$local_"
  done
done

if grep -rqF 'https://cdn.jsdelivr.net/npm/' _mobile --include='*.html' --include='*.js' --exclude=sw.js; then
  echo "ERREUR : une bibliothèque reste chargée depuis internet."; exit 1
fi
# Garde-fous d'environnement, comme pour le site.
if [ "$cible" = recette ]; then grep -q "env: 'recette'" _mobile/config.js || { echo "ERREUR : config.js n'est pas celui de la recette."; exit 1; }
elif grep -q "env: 'recette'" _mobile/config.js; then echo "ERREUR : base de recette dans l'application de production."; exit 1; fi
echo "Fichiers de l'application ($cible) prêts dans _mobile/ : $(find _mobile -type f | wc -l) fichiers."
