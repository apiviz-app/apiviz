#!/usr/bin/env bash
# Essai de restauration d'une copie de la base Apiviz (schéma public) sur un Postgres vide.
#   scripts/essai-restauration.sh COPIE.dump BASE_VIDE [ATTENDU]
#   scripts/essai-restauration.sh --compter BASE > comptes.txt
# - COPIE.dump : fichier pg_dump --format=custom (déjà déchiffré) ;
# - BASE_VIDE : adresse d'une base Postgres vide qu'on peut remplir (jamais la production) ;
# - ATTENDU (facultatif) : adresse de la base d'origine, ou fichier écrit par --compter ; le nombre de lignes de chaque
#   table restaurée est alors comparé.
# Sort en erreur si la copie ne se restaure pas entièrement, si une table perd sa protection par ligne (RLS) ou si une
# table n'a pas le nombre de lignes attendu.
# N'affiche aucun nombre de lignes : le journal des actions GitHub est public (dépôt public).
set -euo pipefail
ici=$(cd "$(dirname "$0")" && pwd)
PSQL=${PSQL:-psql}; PG_RESTORE=${PG_RESTORE:-pg_restore}

compter() {
  local sql
  sql=$("$PSQL" "$1" -qAt -c "select string_agg(format('select %L, count(*) from public.%I', tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname = 'public'")
  "$PSQL" "$1" -qAt -F ' ' -c "$sql" | sort
}

if [ "${1:-}" = --compter ]; then compter "$2"; exit 0; fi

COPIE=$1; CIBLE=$2; ATTENDU=${3:-}

"$PSQL" "$CIBLE" -v ON_ERROR_STOP=1 -q -f "$ici/socle-supabase.sql" > /dev/null
# Le schéma public existe déjà sur toute base neuve : on retire sa création de la liste à restaurer.
# --exit-on-error : la moindre erreur (table, fonction, règle de sécurité) fait échouer l'essai.
liste=$(mktemp); ecarts=$(mktemp); trap 'rm -f "$liste" "$ecarts"' EXIT
"$PG_RESTORE" --list "$COPIE" | grep -v ' SCHEMA - public ' > "$liste"
"$PG_RESTORE" --no-owner --no-privileges --exit-on-error --use-list "$liste" --dbname "$CIBLE" "$COPIE"

tables=$("$PSQL" "$CIBLE" -qAt -c "select count(*) from pg_tables where schemaname = 'public'")
rls=$("$PSQL" "$CIBLE" -qAt -c "select count(*) from pg_tables where schemaname = 'public' and not rowsecurity")
[ "$rls" = 0 ] || { echo "Restauration : $rls table(s) sans protection par ligne (RLS) après restauration." >&2; exit 1; }

if [ -z "$ATTENDU" ]; then echo "Restauration réussie : $tables tables."; exit 0; fi
if [ -f "$ATTENDU" ]; then attendu=$(sort "$ATTENDU"); else attendu=$(compter "$ATTENDU"); fi
if ! diff <(echo "$attendu") <(compter "$CIBLE") > "$ecarts"; then
  echo "Restauration : nombre de lignes différent pour : $(grep '^[<>]' "$ecarts" | awk '{print $2}' | sort -u | tr '\n' ' ')" >&2
  exit 1
fi
echo "Restauration réussie : $tables tables, mêmes nombres de lignes que la base d'origine."
