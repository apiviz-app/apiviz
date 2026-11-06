// Tests SQL de la migration 012, sur une base Postgres vide en mémoire (PGlite). Ne touche aucune base Supabase.
// Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2
// Usage (depuis la racine du dépôt) : node tests/sql/test_012.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

// Même ordre et même socle Supabase que scripts/rejouer-migrations.mjs, puis 012 (deux fois : relançable).
const ORDRE = ["000-structure-au-3-nov-2026.sql", "004-photos-visites.sql", "005-securite-et-ping.sql",
  "006-hors-ligne.sql", "007-registre.sql", "009-colonie-varroa-recolte-livraison.sql",
  "008-exploitations.sql", "010-registre-factures.sql", "011-invitation-avant-connexion.sql",
  "012-correctifs.sql", "012-correctifs.sql"];
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

// --- regler() ---
await en("a@x.fr", E1);
const vueA = (await val("select data from public.reglages")).data; // A lit les réglages…
await en("a2@x.fr", E1);
await val(`select public.regler('{"objectif": 500}')`); // …pendant que A2 change une autre clé.
await en("a@x.fr", E1);
await val(`select public.regler($1)`, [JSON.stringify({ nom: "Rucher A modifié" })]); // A enregistre sa clé.
let d = (await val("select data from public.reglages")).data;
verif(d.nom === "Rucher A modifié" && d.objectif === 500 && d.postes?.[0] === "Autre",
  "regler : deux membres, deux clés différentes, les deux sont gardées (A avait lu " + JSON.stringify(vueA) + ")");
await val(`select public.regler('{"objectif": null}')`);
d = (await val("select data from public.reglages")).data;
verif(!("objectif" in d) && d.nom === "Rucher A modifié", "regler : une valeur null retire la clé");
await en("b@x.fr", E2);
d = (await val("select data from public.reglages")).data;
verif(d.nom === "Rucher B" && !("objectif" in d), "regler : l'autre exploitation n'est pas touchée");
await en("b@x.fr", E1); // b n'est pas membre de A
let refus = null;
try { await val(`select public.regler('{"nom":"pirate"}')`); } catch (e) { refus = e; }
verif(refus && /Aucune exploitation/.test(refus.message), "regler : refusé hors de ses exploitations");
await db.exec("reset role");
verif((await val(`select data->>'nom' n from public.reglages where exploitation_id = '${E1}'`)).n === "Rucher A modifié", "regler : rien d'écrit par l'intrus");

// --- ajouter_stock() ---
await db.exec(`insert into public.articles (id, nom, type, unite, stock, seuil, exploitation_id)
  values ('aaaaaaaa-0000-4000-8000-000000000001', 'Candy', 'Consommable', 'kg', 5, 1, '${E1}'),
         ('bbbbbbbb-0000-4000-8000-000000000001', 'Sirop', 'Consommable', 'L', 2, 0, '${E2}')`);
await en("a@x.fr", E1);
const art = "aaaaaaaa-0000-4000-8000-000000000001";
await val(`select public.ajouter_stock($1)`, [JSON.stringify({ article_id: art, quantite: 2 })]);
await en("a2@x.fr", E1);
await val(`select public.ajouter_stock($1)`, [JSON.stringify({ article_id: art, quantite: 3 })]);
verif(Number((await val(`select stock from public.articles where id = '${art}'`)).stock) === 10, "ajouter_stock : deux entrées s'additionnent (5 + 2 + 3 = 10)");
const dep = { article_id: art, quantite: 4, depense: { id: "dddddddd-0000-4000-8000-000000000001", libelle: "Candy", categorie: "Alimentation", montant: 12.5, date_depense: "2026-11-06" } };
await val(`select public.ajouter_stock($1)`, [JSON.stringify(dep)]);
await val(`select public.ajouter_stock($1)`, [JSON.stringify(dep)]); // renvoi du même appel
const nbDep = Number((await val(`select count(*) n from public.depenses`)).n);
verif(Number((await val(`select stock from public.articles where id = '${art}'`)).stock) === 14 && nbDep === 1,
  "ajouter_stock avec dépense : stock + 4 et une seule dépense, même envoyé deux fois");
refus = null;
try { await val(`select public.ajouter_stock($1)`, [JSON.stringify({ article_id: "bbbbbbbb-0000-4000-8000-000000000001", quantite: 1 })]); } catch (e) { refus = e; }
verif(refus && /introuvable/.test(refus.message), "ajouter_stock : article d'une autre exploitation refusé");
refus = null;
try { await val(`select public.ajouter_stock($1)`, [JSON.stringify({ article_id: art, quantite: 0 })]); } catch (e) { refus = e; }
verif(refus && /quantité/.test(refus.message), "ajouter_stock : quantité nulle refusée");

// --- clients ---
await val(`insert into public.clients (nom, adresse, code_postal, ville, siret) values ('Épicerie', '3 rue du Miel', '69001', 'Lyon', '12345678900011') returning id`);
const c = await val(`select adresse, code_postal, ville, siret from public.clients`);
verif(c.ville === "Lyon" && c.code_postal === "69001", "clients : adresse, code postal, ville et SIRET enregistrés");

// --- photos_orphelines() ---
await db.exec("reset role");
await db.exec(`insert into public.ruches (id, nom, exploitation_id) values ('cccccccc-0000-4000-8000-000000000001', 'R1', '${E1}');
  insert into public.visites (id, ruche_id, date_visite, activite, provisions, reine, exploitation_id)
    values ('eeeeeeee-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', '2026-11-01', 'Normale', 'Moyennes', 'Vue', '${E1}');
  insert into public.visite_photos (visite_id, chemin, exploitation_id) values ('eeeeeeee-0000-4000-8000-000000000001', '${E1}/eeeeeeee-0000-4000-8000-000000000001/p1.jpg', '${E1}');
  insert into storage.objects (bucket_id, name, metadata) values
    ('photos-visites', '${E1}/eeeeeeee-0000-4000-8000-000000000001/p1.jpg', '{"size": 1000}'),
    ('photos-visites', '${E1}/ffffffff-0000-4000-8000-000000000001/p2.jpg', '{"size": 2000}'),
    ('photos-visites', '${E2}/ffffffff-0000-4000-8000-000000000002/p3.jpg', '{"size": 3000}');`);
await en("a@x.fr", E1);
const orph = (await db.query("select * from public.photos_orphelines()")).rows;
verif(orph.length === 1 && orph[0].chemin.endsWith("p2.jpg") && Number(orph[0].octets) === 2000,
  "photos_orphelines : seul le fichier sans visite de l'exploitation courante");
await en("b@x.fr", E2);
const orphB = (await db.query("select * from public.photos_orphelines()")).rows;
verif(orphB.length === 1 && orphB[0].chemin.endsWith("p3.jpg"), "photos_orphelines : chaque exploitation ne voit que les siens");

console.log(ok ? "Tous les tests SQL de 012 passent." : "Des tests SQL échouent.");
process.exit(ok ? 0 : 1);
