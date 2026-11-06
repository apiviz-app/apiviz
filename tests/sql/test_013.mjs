// Tests SQL de la migration 013, sur une base Postgres vide en mémoire (PGlite). Ne touche aucune base Supabase.
// Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2
// Usage (depuis la racine du dépôt) : node tests/sql/test_013.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

// Même ordre et même socle Supabase que scripts/rejouer-migrations.mjs, puis 013 (deux fois : relançable).
const ORDRE = ["000-structure-au-3-nov-2026.sql", "004-photos-visites.sql", "005-securite-et-ping.sql",
  "006-hors-ligne.sql", "007-registre.sql", "009-colonie-varroa-recolte-livraison.sql",
  "008-exploitations.sql", "010-registre-factures.sql", "011-invitation-avant-connexion.sql",
  "012-correctifs.sql", "013-noyau-resume-et-journal.sql", "013-noyau-resume-et-journal.sql"];
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
grant usage on schema auth, storage, public to authenticated;
grant select on storage.objects to authenticated;
`;

const db = new PGlite();
await db.exec(SUPABASE);
for (const f of ORDRE) await db.exec(fs.readFileSync("migrations/" + f, "utf8"));

let ok = true;
const verif = (cond, msg) => { console.log((cond ? "OK    " : "ECHEC ") + msg); ok = ok && !!cond; };
const val = async (q, p) => (await db.query(q, p)).rows[0];

// Deux exploitations, un membre dans chacune ; A a deux membres.
const E1 = "11111111-1111-4111-8111-111111111111", E2 = "22222222-2222-4222-8222-222222222222";
await db.exec(`insert into public.exploitations (id, nom, cree_par) values ('${E1}', 'Rucher A', 'a@x.fr'), ('${E2}', 'Rucher B', 'b@x.fr');
  insert into public.membres (exploitation_id, email, role, ajoute_par) values ('${E1}', 'a@x.fr', 'responsable', ''),
    ('${E1}', 'a2@x.fr', 'membre', ''), ('${E2}', 'b@x.fr', 'responsable', '');
  insert into public.reglages (exploitation_id, id, data) values ('${E1}', 1, '{"nom":"Rucher A","postes":["Autre"]}'), ('${E2}', 1, '{"nom":"Rucher B"}');`);

// Se mettre dans la peau d'un membre connecté qui a choisi une exploitation (comme le fait PostgREST).
async function en(email, ex) {
  await db.exec(`reset role;
    select set_config('request.jwt.claims', '${JSON.stringify({ email, email_verified: true })}', false),
           set_config('request.headers', '${JSON.stringify({ "x-exploitation": ex })}', false);
    set role authenticated;`);
}


// --- colonies_resume ---
const R1 = "aaaaaaaa-0000-4000-8000-000000000001", R2 = "aaaaaaaa-0000-4000-8000-000000000002", RB = "bbbbbbbb-0000-4000-8000-000000000001";
await db.exec("reset role");
await db.exec(`insert into public.ruches (id, exploitation_id, nom, etat) values ('${R1}', '${E1}', 'Ruche 1', 'Bonne'),
    ('${R2}', '${E1}', 'Ruche 2', 'Bonne'), ('${RB}', '${E2}', 'Ruche B', 'Bonne');
  insert into public.visites (exploitation_id, ruche_id, date_visite, activite, provisions, reine, poids_kg, varroa, varroa_abeilles, varroa_methode) values
    ('${E1}', '${R1}', '2026-10-01', 'Normale', 'Bonnes', 'Vue', 41, 6, 300, 'Sucre glace'),
    ('${E1}', '${R1}', '2026-10-20', 'Normale', 'Moyennes', 'Vue', 39, null, null, ''),
    ('${E1}', '${R1}', '2026-11-02', 'Forte', 'Faibles', 'Vue', null, null, null, ''),
    ('${E2}', '${RB}', '2026-11-03', 'Forte', 'Bonnes', 'Vue', 50, 1, 300, 'Sucre glace');`);
await en("a@x.fr", E1);
const res = (await db.query("select * from public.colonies_resume order by ruche_id")).rows;
verif(res.length === 2, "colonies_resume : seules les 2 ruches de l'exploitation ouverte (RLS appliquée) : " + res.length);
const r1 = res.find((x) => x.ruche_id === R1), r2 = res.find((x) => x.ruche_id === R2);
const jour = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d));
verif(jour(r1.derniere_visite) === "2026-11-02" && r1.dernieres_provisions === "Faibles", "dernière visite : la plus récente");
verif(Number(r1.dernier_poids) === 39 && jour(r1.date_dernier_poids) === "2026-10-20", "dernier poids : la dernière visite pesée");
verif(r1.dernier_varroa === 6 && r1.dernier_varroa_abeilles === 300 && jour(r1.date_dernier_varroa) === "2026-10-01", "dernier comptage varroa");
verif(Number(r1.nb_visites) === 3, "nombre de visites");
verif(r2.derniere_visite === null && Number(r2.nb_visites) === 0, "ruche jamais visitée : présente, sans visite");
await en("b@x.fr", E1);
verif((await db.query("select * from public.colonies_resume")).rows.length === 0, "colonies_resume : rien pour quelqu'un qui n'est pas membre");

// --- journal_erreurs ---
await en("a@x.fr", E1);
let refus = 0;
try { await db.query("select * from public.journal_erreurs"); } catch { refus++; }
try { await db.query("insert into public.journal_erreurs (empreinte, minute, message) values ('x', now(), 'x')"); } catch { refus++; }
verif(refus === 2, "journal_erreurs : ni lecture ni écriture directe pour un membre connecté");
for (let i = 0; i < 50; i++) {
  await db.query("select public.journaliser_erreur($1)", [JSON.stringify({ empreinte: "abc", version: "v-test", ecran: "ruches",
    message: "TypeError: x is undefined (pour a@x.fr)", source: "app.js:12:3" })]);
}
await db.query("select public.journaliser_erreur($1)", [JSON.stringify({ empreinte: "def", message: "Autre", nombre: 7 })]);
await db.exec("reset role");
const lignes = (await db.query("select * from public.journal_erreurs order by empreinte")).rows;
verif(lignes.length === 2, "50 erreurs identiques en une minute : une seule ligne (plus l'autre erreur) : " + lignes.length);
verif(lignes[0].compteur === 50 && lignes[1].compteur === 7, "compteurs : 50 et 7 (regroupement côté téléphone)");
verif(!/@/.test(JSON.stringify(lignes)) && lignes[0].message.includes("[e-mail]"), "aucune adresse e-mail enregistrée");
verif(lignes[0].exploitation_id === E1 && lignes[0].version === "v-test" && lignes[0].ecran === "ruches", "version, écran et exploitation enregistrés");
await db.exec(`update public.journal_erreurs set derniere_fois = now() - interval '91 days' where empreinte = 'def'`);
await en("a@x.fr", E1);
await db.query("select public.journaliser_erreur($1)", [JSON.stringify({ empreinte: "abc", message: "encore" })]);
await db.exec("reset role");
verif((await db.query("select count(*)::int n from public.journal_erreurs where empreinte = 'def'")).rows[0].n === 0, "purge des erreurs de plus de 90 jours");
await db.exec(`select set_config('request.jwt.claims', '{}', false); set role anon;`);
let anon = false;
try { await db.query("select public.journaliser_erreur('{}')"); } catch { anon = true; }
verif(anon, "un visiteur non connecté ne peut pas écrire au journal");
await db.exec("reset role");
await en("a@x.fr", E1);
await db.query("select public.journaliser_erreur($1)", [JSON.stringify({ empreinte: "long", message: "x".repeat(2000) })]);
await db.exec("reset role");
verif((await db.query("select length(message)::int l from public.journal_erreurs where empreinte = 'long'")).rows[0].l === 500, "message limité à 500 caractères");

process.exit(ok ? 0 : 1);
