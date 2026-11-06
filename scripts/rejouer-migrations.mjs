// Rejoue 000 puis les migrations, dans l'ordre documenté, sur une base Postgres vide en mémoire (PGlite),
// puis compare la structure obtenue au relevé des bases réelles (migrations/releves/structure-*.json).
// Ne se connecte à aucune base Supabase.
// Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2
// Usage : node scripts/rejouer-migrations.mjs migrations/releves/<relevé>.json
// Le relevé peut indiquer « derniere_migration » : le rejeu s'arrête alors à ce fichier (relevé pris avant une
// migration plus récente). Sans ce champ, toutes les migrations de ORDRE sont rejouées.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

// Ordre réel d'application (009 a été appliquée avant 008 sur les deux bases).
const ORDRE = ["000-structure-au-3-nov-2026.sql", "004-photos-visites.sql", "005-securite-et-ping.sql",
  "006-hors-ligne.sql", "007-registre.sql", "009-colonie-varroa-recolte-livraison.sql",
  "008-exploitations.sql", "010-registre-factures.sql", "011-invitation-avant-connexion.sql", "012-correctifs.sql",
  "013-noyau-resume-et-journal.sql", "014-roles-audit.sql"];

// Le strict minimum de ce que Supabase fournit (rôles, auth, storage), pour que les fichiers passent.
const SUPABASE = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`;

const releve = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fin = releve.derniere_migration ? ORDRE.indexOf(releve.derniere_migration) : ORDRE.length - 1;
if (fin < 0) { console.log("Migration inconnue dans le relevé : " + releve.derniere_migration); process.exit(1); }
const db = new PGlite();
await db.exec(SUPABASE);
for (const f of ORDRE.slice(0, fin + 1)) {
  try { await db.exec(fs.readFileSync("migrations/" + f, "utf8")); console.log("appliquée  " + f); }
  catch (e) { console.log("ÉCHEC      " + f + " : " + e.message); process.exit(1); }
}
const lignes = async (q) => (await db.query(q)).rows;
const obtenu = {
  tables: Object.fromEntries((await lignes(`select c.relname t, array_agg(a.attname::text order by a.attname) col
    from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' group by 1`)).map((r) => [r.t, r.col])),
  vues: Object.fromEntries((await lignes(`select c.relname t, array_agg(a.attname::text order by a.attname) col
    from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'v' group by 1`)).map((r) => [r.t, r.col])),
  fonctions: (await lignes(`select proname from pg_proc where pronamespace = 'public'::regnamespace order by 1`)).map((r) => r.proname),
  politiques: (await lignes(`select schemaname || '.' || tablename || '.' || policyname p from pg_policies
    where schemaname in ('public', 'storage') order by 1`)).map((r) => r.p),
  espaces: (await lignes(`select id from storage.buckets order by 1`)).map((r) => r.id),
};
// Corps des deux fonctions dont le relevé a montré un écart entre les bases.
const corps = Object.fromEntries((await lignes(`select proname, prosrc from pg_proc
  where pronamespace = 'public'::regnamespace and proname in ('creer_visite', 'creer_vente')`)).map((r) => [r.proname, r.prosrc]));

let ecarts = 0;
const comparer = (quoi, a, b) => {
  const A = new Set(a), B = new Set(b);
  for (const x of A) if (!B.has(x)) { console.log(`ÉCART ${quoi} : « ${x} » dans les fichiers, absent du relevé`); ecarts++; }
  for (const x of B) if (!A.has(x)) { console.log(`ÉCART ${quoi} : « ${x} » dans le relevé, absent des fichiers`); ecarts++; }
};
comparer("table", Object.keys(obtenu.tables), Object.keys(releve.tables));
for (const t of Object.keys(releve.tables)) if (obtenu.tables[t]) comparer("colonne de " + t, obtenu.tables[t], releve.tables[t]);
comparer("vue", Object.keys(obtenu.vues), Object.keys(releve.vues));
for (const t of Object.keys(releve.vues)) if (obtenu.vues[t]) comparer("colonne de la vue " + t, obtenu.vues[t], releve.vues[t]);
comparer("fonction", obtenu.fonctions, releve.fonctions);
comparer("politique", obtenu.politiques, releve.politiques);
comparer("espace", obtenu.espaces, releve.espaces);
console.log("creer_visite enregistre la méthode varroa : " + /varroa_methode/.test(corps.creer_visite || ""));
console.log("creer_vente enregistre la livraison : " + /livraison/.test(corps.creer_vente || ""));
console.log(ecarts ? ecarts + " écart(s)." : "Aucun écart : 000 + migrations reproduisent la structure relevée.");
process.exit(ecarts ? 1 : 0);
