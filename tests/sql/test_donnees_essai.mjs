// Tests des scripts tests/production/donnees-essai.sql et nettoyage-essai.sql, sur une base Postgres vide en mémoire
// (PGlite). Ne touche aucune base Supabase. Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2
// Usage (depuis la racine du dépôt) : node tests/sql/test_donnees_essai.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

const ORDRE = ["000-structure-au-3-nov-2026.sql", "004-photos-visites.sql", "005-securite-et-ping.sql",
  "006-hors-ligne.sql", "007-registre.sql", "009-colonie-varroa-recolte-livraison.sql",
  "008-exploitations.sql", "010-registre-factures.sql", "011-invitation-avant-connexion.sql", "012-correctifs.sql"];
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
const ESSAI = fs.readFileSync("tests/production/donnees-essai.sql", "utf8");
const NETTOYAGE = fs.readFileSync("tests/production/nettoyage-essai.sql", "utf8");

const db = new PGlite();
await db.exec(SUPABASE);
for (const f of ORDRE) await db.exec(fs.readFileSync("migrations/" + f, "utf8"));

let ok = true;
const verif = (cond, msg) => { console.log((cond ? "OK    " : "ECHEC ") + msg); ok = ok && !!cond; };
const val = async (q) => (await db.query(q)).rows[0];
const compte = async (t, cond = "true") => Number((await val(`select count(*) n from public.${t} where ${cond}`)).n);
const essai = "id::text like 'e55a1002-%'";

// Deux exploitations : le script doit refuser de deviner.
const E1 = "11111111-1111-4111-8111-111111111111", E2 = "22222222-2222-4222-8222-222222222222";
await db.exec(`insert into public.exploitations (id, nom, cree_par) values ('${E1}', 'Réelle', 'a@x.fr'), ('${E2}', 'Autre', 'b@x.fr')`);
let refus = "";
try { await db.exec(ESSAI); } catch (e) { refus = e.message; }
verif(/2 exploitations/.test(refus) && (await compte("ruches")) === 0, "deux exploitations : arrêt, rien n'est ajouté");
await db.exec(`delete from public.exploitations where id = '${E2}'`);

// Données réelles à préserver.
await db.exec(`insert into public.ruches (exploitation_id, nom, rucher) values ('${E1}', 'Vraie ruche', 'Vrai rucher');
  insert into public.clients (id, exploitation_id, nom) values ('33333333-3333-4333-8333-333333333333', '${E1}', 'Vrai client');`);

// Chargement, deux fois (relançable).
await db.exec(ESSAI);
await db.exec(ESSAI);
verif((await compte("ruches", essai)) === 3 && (await compte("clients", essai)) === 1 && (await compte("lots", essai)) === 1
  && (await compte("ventes", essai)) === 1 && (await compte("vente_lignes", essai)) === 1, "lancé deux fois : 3 ruches, 1 client, 1 lot, 1 vente");
verif((await val(`select adresse from public.clients where ${essai}`)).adresse === "1 rue de l'Essai", "client d'essai avec adresse (012)");
verif(Number((await val(`select pots_restants from public.lots_stock where ${essai}`)).pots_restants) === 4, "lot d'essai : 4 pots restants après la vente");

// Les parcours, comme l'app les fait (essentiels.js : erdeplacer, erintervention, erfacture).
await db.exec(`insert into public.ruche_evenements (exploitation_id, ruche_id, type, detail) values
    ('${E1}', 'e55a1002-0000-4000-8000-000000000001', 'deplacement', 'ESSAI IT-02 départ vers ESSAI IT-02 arrivée'),
    ('${E1}', 'e55a1002-0000-4000-8000-000000000002', 'intervention', 'Vétérinaire, essai');
  update public.ruches set rucher = 'ESSAI IT-02 arrivée' where id = 'e55a1002-0000-4000-8000-000000000001';
  insert into public.taches (exploitation_id, titre, ruche_id) values ('${E1}', 'Tâche d''essai', 'e55a1002-0000-4000-8000-000000000003');`);
const f = await val(`select facture_num from public.numeroter_facture('e55a1002-0000-4000-8000-000000000031')`);
verif(f.facture_num === 1, "facture d'essai : numéro 1");

// Nettoyage, deux fois.
await db.exec(NETTOYAGE);
await db.exec(NETTOYAGE);
verif((await compte("ruches", essai)) + (await compte("clients", essai)) + (await compte("lots", essai)) + (await compte("ventes", essai)) === 0,
  "nettoyage lancé deux fois : plus aucune donnée d'essai");
verif((await compte("ruche_evenements")) === 0 && (await compte("taches")) === 0, "évènements et tâches des ruches d'essai retirés");
verif((await compte("ruches")) === 1 && (await compte("clients")) === 1, "données réelles intactes");

// Le numéro de facture est libéré : une vraie vente reprend le numéro 1.
await db.exec(`insert into public.lots (id, exploitation_id, code, format_g, prix, pots_initiaux) values ('44444444-4444-4444-8444-444444444444', '${E1}', 'L1', 500, 8, 10);
  insert into public.ventes (id, exploitation_id, client_id) values ('55555555-5555-4555-8555-555555555555', '${E1}', '33333333-3333-4333-8333-333333333333');`);
verif((await val(`select facture_num from public.numeroter_facture('55555555-5555-4555-8555-555555555555')`)).facture_num === 1,
  "après nettoyage, la première vraie facture de l'année a le numéro 1");

// Photo sur une ruche d'essai : le nettoyage s'arrête au lieu de laisser des fichiers orphelins.
await db.exec(ESSAI);
await db.exec(`insert into public.visites (id, exploitation_id, ruche_id, activite, provisions, reine) values
    ('66666666-6666-4666-8666-666666666666', '${E1}', 'e55a1002-0000-4000-8000-000000000001', 'Normale', 'Moyennes', 'Vue');
  insert into public.visite_photos (exploitation_id, visite_id, chemin) values ('${E1}', '66666666-6666-4666-8666-666666666666', 'x/y.jpg');`);
refus = "";
try { await db.exec(NETTOYAGE); } catch (e) { refus = e.message; }
verif(/photo/.test(refus) && (await compte("ruches", essai)) === 3, "photo sur une ruche d'essai : arrêt, rien n'est supprimé");

process.exit(ok ? 0 : 1);
