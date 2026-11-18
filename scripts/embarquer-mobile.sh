#!/bin/sh
# Rend un dossier du site assemblé utilisable dans l'application Android / iOS (IT-30, AP-TECH-386), sur place.
# Usage : sh scripts/embarquer-mobile.sh <dossier>   (une copie de _site/recette ou de la production, jamais _site)
# 1. Les bibliothèques chargées depuis cdn.jsdelivr.net sont copiées dans le dossier : l'appli s'ouvre sans réseau.
# 2. version-mobile.json : empreinte du contenu (identique pour un même contenu, d'où qu'il soit fabriqué) et niveau
#    natif (capacitor.config.json). L'appli compare ce fichier à celui publié pour savoir s'il y a du nouveau.
set -e
cible=$1
[ -n "$cible" ] && [ -f "$cible/index.html" ] || { echo "Usage : embarquer-mobile.sh <dossier du site assemblé>"; exit 1; }
racine=$(cd "$(dirname "$0")/.." && pwd)

# Bibliothèques jsdelivr citées par le site : https://cdn.jsdelivr.net/npm/<paquet>@<version>/<chemin>
liens=$(grep -rhoE 'https://cdn\.jsdelivr\.net/npm/[^"'"'"' )]+' "$cible" --include='*.html' --include='*.js' | sort -u)
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
  mkdir -p "$cible/$(dirname "$local_")" && cp "$dossier/package/$chemin" "$cible/$local_"
  # Leaflet : ses images (marqueurs) sont à côté de sa feuille de style.
  [ -d "$dossier/package/dist/images" ] && cp -R "$dossier/package/dist/images" "$cible/vendor/$paquet/dist/"
  # Remplacement du lien par le fichier embarqué, dans tous les fichiers du site.
  grep -rlF "$lien" "$cible" --include='*.html' --include='*.js' | while read -r f; do
    python3 -c 'import sys,pathlib; p=pathlib.Path(sys.argv[1]); p.write_text(p.read_text(encoding="utf-8").replace(sys.argv[2], "./"+sys.argv[3]), encoding="utf-8")' "$f" "$lien" "$local_"
  done
done

if grep -rqF 'https://cdn.jsdelivr.net/npm/' "$cible" --include='*.html' --include='*.js' --exclude=sw.js; then
  echo "ERREUR : une bibliothèque reste chargée depuis internet."; exit 1
fi

# Empreinte du contenu et niveau natif.
python3 - "$cible" "$racine/capacitor.config.json" <<'PY'
import hashlib, json, pathlib, sys
cible, config = pathlib.Path(sys.argv[1]), json.load(open(sys.argv[2], encoding="utf-8"))
natif = int(config["plugins"]["CapacitorUpdater"]["version"].removeprefix("natif-"))
h = hashlib.sha256()
for f in sorted(p for p in cible.rglob("*") if p.is_file()):
    rel = f.relative_to(cible).as_posix()
    if rel == "version-mobile.json" or rel.startswith("mobile/"):
        continue
    h.update(rel.encode() + b"\0" + hashlib.sha256(f.read_bytes()).digest())
version = h.hexdigest()[:12]
(cible / "version-mobile.json").write_text(json.dumps({"version": version, "natif": natif}) + "\n", encoding="utf-8")
print(f"Contenu de l'application : version {version}, niveau natif {natif}.")
PY
