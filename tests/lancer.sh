#!/bin/sh
# Lance tous les tests sur un dossier de site (par défaut la racine du dépôt).
# Usage : sh tests/lancer.sh [dossier]    Prérequis : python3, playwright, google-chrome, npm.
set -e
racine=$(cd "$(dirname "$0")/.." && pwd)
site=$(cd "${1:-$racine}" && pwd)
travail=$(mktemp -d)
trap 'rm -rf "$travail"' EXIT
cp "$racine"/tests/* "$travail"/
cd "$travail"
python3 fabrique_tests.py > /dev/null
mkdir sb leaflet
(cd sb && npm pack --silent @supabase/supabase-js@2.45.4 > /dev/null && tar xzf ./*.tgz)
(cd leaflet && npm pack --silent leaflet@1.9.4 > /dev/null && tar xzf ./*.tgz)
echec=0
for t in test_*.py; do
  if python3 "$t" "$site" "$travail/sb/package/dist/umd/supabase.js" > "$t.log" 2>&1; then
    echo "OK     $t"
  else
    echo "ECHEC  $t"; tail -20 "$t.log"; echec=1
  fi
done
exit $echec
