#!/bin/sh
# Lance tous les tests sur un dossier de site (par défaut la racine du dépôt).
# Usage : sh tests/lancer.sh [dossier]    Prérequis : python3, playwright, google-chrome, npm.
set -e
racine=$(cd "$(dirname "$0")/.." && pwd)
site=$(cd "${1:-$racine}" && pwd)
travail=$(mktemp -d)
trap 'rm -rf "$travail"' EXIT
cp "$racine"/tests/*.* "$travail"/
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
# Tests SQL des migrations (Postgres en mémoire, aucune vraie base).
if [ -d "$racine/tests/sql" ]; then
  (cd "$travail" && npm i --silent --no-save @electric-sql/pglite@0.2 > /dev/null 2>&1)
  ln -sfn "$travail/node_modules" "$racine/tests/sql/node_modules"
  for t in "$racine"/tests/sql/test_*.mjs; do
    n=$(basename "$t")
    if (cd "$racine" && node "$t") > "$travail/$n.log" 2>&1; then echo "OK     sql/$n"
    else echo "ECHEC  sql/$n"; tail -20 "$travail/$n.log"; echec=1; fi
  done
  rm -f "$racine/tests/sql/node_modules"
  # Contrôle de structure : 000 + migrations rejouées reproduisent chaque relevé des vraies bases.
  if [ ! -e "$racine/node_modules" ]; then
    ln -s "$travail/node_modules" "$racine/node_modules"
    for r in "$racine"/migrations/releves/*.json; do
      n=$(basename "$r")
      if (cd "$racine" && node scripts/rejouer-migrations.mjs "$r") > "$travail/$n.log" 2>&1; then echo "OK     structure/$n"
      else echo "ECHEC  structure/$n"; tail -20 "$travail/$n.log"; echec=1; fi
    done
    rm -f "$racine/node_modules"
  else
    echo "IGNORE structure : un dossier node_modules existe déjà à la racine du dépôt"
  fi
fi
exit $echec
