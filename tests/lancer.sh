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
# Tests unitaires des règles métier (node --test, quelques secondes).
if (cd "$racine" && node --test "tests/unitaires/*.test.mjs") > "$travail/unitaires.log" 2>&1; then echo "OK     unitaires ($(grep -c '^ok ' "$travail/unitaires.log") tests)"
else echo "ECHEC  unitaires"; grep -B2 -A12 '^not ok' "$travail/unitaires.log" | head -40; echec=1; fi
for t in test_*.py; do
  if python3 "$t" "$site" "$travail/sb/package/dist/umd/supabase.js" > "$t.log" 2>&1; then
    echo "OK     $t"
  else
    # Les vérifications en échec d'abord : la fin du journal seule ne les montrait pas toujours (test_eg, 11 nov. 2026).
    echo "ECHEC  $t"; grep -n '^ECHEC' "$t.log" | head -10; tail -20 "$t.log"; echec=1
  fi
done
# Tests SQL des migrations (Postgres en mémoire, aucune vraie base). En CI, ils ont leur propre job (SANS_SQL=1 ici).
if [ -z "$SANS_SQL" ]; then sh "$racine/tests/sql/lancer.sh" || echec=1; fi
exit $echec
