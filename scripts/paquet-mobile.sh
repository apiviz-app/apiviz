#!/bin/sh
# Paquet de mise à jour de l'application Android / iOS (IT-30, AP-TECH-409), publié avec le site par « Mise en ligne ».
# Usage : sh scripts/paquet-mobile.sh <dossier d'un environnement du site assemblé>   (_site/recette, ou la production)
# Écrit <dossier>/mobile/<version>.zip et <dossier>/mobile/version.json. À l'ouverture, l'appli lit version.json sur
# le site de son environnement ; si la version diffère de la sienne, elle télécharge le zip et l'applique au lancement
# suivant. Le site lui-même ne charge jamais ce dossier.
set -e
env_=$1
[ -n "$env_" ] && [ -f "$env_/index.html" ] || { echo "Usage : paquet-mobile.sh <dossier du site assemblé>"; exit 1; }
ici=$(cd "$(dirname "$0")" && pwd)
copie=$(mktemp -d)
trap 'rm -rf "$copie"' EXIT

# Copie sans les sous-environnements (recette/ dans la production) ni un ancien paquet.
(cd "$env_" && find . -mindepth 1 -maxdepth 1 ! -name recette ! -name mobile -exec cp -R {} "$copie/" \;)
sh "$ici/embarquer-mobile.sh" "$copie"

rm -rf "$env_/mobile" && mkdir -p "$env_/mobile"
python3 - "$copie" "$env_/mobile" <<'PY'
import hashlib, json, pathlib, sys, zipfile
copie, sortie = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
info = json.loads((copie / "version-mobile.json").read_text(encoding="utf-8"))
nom = f"{info['version']}.zip"
with zipfile.ZipFile(sortie / nom, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(p for p in copie.rglob("*") if p.is_file()):
        z.write(f, f.relative_to(copie).as_posix())
donnees = (sortie / nom).read_bytes()
info.update(url=f"mobile/{nom}", taille=len(donnees), sha256=hashlib.sha256(donnees).hexdigest())
(sortie / "version.json").write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")
print(f"Paquet mobile : {sortie / nom} ({len(donnees) // 1024} Ko).")
PY
