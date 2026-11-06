#!/bin/sh
# Tests SQL (IT-04, AP-FEAT-008) : migrations, règles d'accès et fonctions, sur un Postgres en mémoire (PGlite).
# Aucune vraie base n'est touchée. Usage : sh tests/sql/lancer.sh   Prérequis : node, npm.
set -e
racine=$(cd "$(dirname "$0")/../.." && pwd)
travail=$(mktemp -d)
trap 'rm -rf "$travail"; [ -L "$racine/tests/sql/node_modules" ] && rm -f "$racine/tests/sql/node_modules"; [ "$lien_racine" = 1 ] && rm -f "$racine/node_modules"; true' EXIT
(cd "$travail" && npm i --silent --no-save @electric-sql/pglite@0.2 > /dev/null 2>&1)
ln -sfn "$travail/node_modules" "$racine/tests/sql/node_modules"
lien_racine=0
if [ ! -e "$racine/node_modules" ]; then ln -s "$travail/node_modules" "$racine/node_modules"; lien_racine=1; fi
echec=0
for t in "$racine"/tests/sql/test_*.mjs; do
  n=$(basename "$t")
  if (cd "$racine" && node "$t") > "$travail/$n.log" 2>&1; then echo "OK     sql/$n ($(grep -c '^OK ' "$travail/$n.log") vérifications)"
  else echo "ECHEC  sql/$n"; grep -B2 -A2 '^ECHEC\|Error' "$travail/$n.log" | head -40; echec=1; fi
done
# Contrôle de structure : 000 + migrations rejouées reproduisent chaque relevé des vraies bases.
for r in "$racine"/migrations/releves/*.json; do
  n=$(basename "$r")
  if (cd "$racine" && node scripts/rejouer-migrations.mjs "$r") > "$travail/$n.log" 2>&1; then echo "OK     structure/$n"
  else echo "ECHEC  structure/$n"; tail -20 "$travail/$n.log"; echec=1; fi
done
exit $echec
