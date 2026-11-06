// Socle commun des tests SQL (IT-04, AP-TECH-038) : un Postgres 16 complet en mémoire (PGlite), le strict minimum de
// Supabase (rôles, auth.jwt() lu dans request.jwt.claims, storage), puis 000 et les migrations dans l'ordre réel.
// Ne se connecte à aucune base Supabase. Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

// Ordre réel d'application (009 avant 008 sur les deux bases ; voir migrations/README.md).
export const ORDRE = ["000-structure-au-3-nov-2026.sql", "004-photos-visites.sql", "005-securite-et-ping.sql",
  "006-hors-ligne.sql", "007-registre.sql", "009-colonie-varroa-recolte-livraison.sql",
  "008-exploitations.sql", "010-registre-factures.sql", "011-invitation-avant-connexion.sql",
  "012-correctifs.sql", "013-noyau-resume-et-journal.sql", "014-roles-audit.sql"];

// Migrations relançables après 008 (000 à 009 ne le sont pas toutes : 008 ne se lance qu'une fois,
// et 009 ne doit jamais être relancée en entier après 008).
export const RELANCABLES = ["010-registre-factures.sql", "011-invitation-avant-connexion.sql", "012-correctifs.sql",
  "013-noyau-resume-et-journal.sql", "014-roles-audit.sql"];

export const SUPABASE = `
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
grant usage on schema auth, storage, public to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
`;

export const E1 = "11111111-1111-4111-8111-111111111111";
export const E2 = "22222222-2222-4222-8222-222222222222";

/** Base neuve, migrations appliquées jusqu'à `jusqua` (compris), éventuellement certaines deux fois. */
export async function base({ jusqua = ORDRE.at(-1), deuxFois = [] } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE);
  for (const f of ORDRE.slice(0, ORDRE.indexOf(jusqua) + 1)) {
    await db.exec(fs.readFileSync("migrations/" + f, "utf8"));
    if (deuxFois.includes(f)) await db.exec(fs.readFileSync("migrations/" + f, "utf8"));
  }
  return db;
}

/** Deux exploitations : A (a@ responsable, a2@ membre, l@ lecteur si le rôle existe), B (b@ responsable). */
export async function deuxExploitations(db, { lecteur = true } = {}) {
  await db.exec(`reset role;
    insert into public.exploitations (id, nom, cree_par) values ('${E1}', 'Rucher A', 'a@x.fr'), ('${E2}', 'Rucher B', 'b@x.fr');
    insert into public.membres (exploitation_id, email, role, ajoute_par) values ('${E1}', 'a@x.fr', 'responsable', ''),
      ('${E1}', 'a2@x.fr', 'membre', ''), ('${E2}', 'b@x.fr', 'responsable', '')
      ${lecteur ? `, ('${E1}', 'l@x.fr', 'lecteur', '')` : ""};
    insert into public.reglages (exploitation_id, id, data) values ('${E1}', 1, '{"nom":"Rucher A","postes":["Autre"]}'), ('${E2}', 1, '{"nom":"Rucher B"}');`);
}

/** Se mettre dans la peau d'un compte connecté qui a choisi une exploitation (comme le fait PostgREST). */
export async function en(db, email, ex) {
  const claims = email ? JSON.stringify({ email, email_verified: true }) : "";
  await db.exec(`reset role;
    select set_config('request.jwt.claims', '${claims}', false),
           set_config('request.headers', '${JSON.stringify(ex ? { "x-exploitation": ex } : {})}', false);
    set role ${email ? "authenticated" : "anon"};`);
}

/** Petit compteur de vérifications. */
export function verificateur() {
  let ok = true, nb = 0;
  const verif = (cond, msg) => { nb++; console.log((cond ? "OK    " : "ECHEC ") + msg); ok = ok && !!cond; };
  const fin = (titre) => { console.log(ok ? `${titre} : ${nb} vérifications, toutes bonnes.` : `${titre} : des vérifications échouent.`); process.exit(ok ? 0 : 1); };
  return { verif, fin };
}

/** Lance une requête et renvoie l'erreur (ou null si elle passe). */
export async function erreur(db, q, p) {
  try { await db.query(q, p); return null; } catch (e) { return e; }
}
