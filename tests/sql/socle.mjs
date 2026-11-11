// Socle commun des tests SQL (IT-04, AP-TECH-038) : un Postgres 16 complet en mémoire (PGlite), le strict minimum de
// Supabase (rôles, auth.jwt() lu dans request.jwt.claims, storage), puis 000 et les migrations dans l'ordre réel.
// Ne se connecte à aucune base Supabase. Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist"; // 016 : contraintes d'exclusion (Supabase l'a aussi)
import fs from "node:fs";

// Ordre réel d'application (009 avant 008 sur les deux bases ; voir migrations/README.md).
export const ORDRE = ["000-structure-au-3-nov-2026.sql", "004-photos-visites.sql", "005-securite-et-ping.sql",
  "006-hors-ligne.sql", "007-registre.sql", "009-colonie-varroa-recolte-livraison.sql",
  "008-exploitations.sql", "010-registre-factures.sql", "011-invitation-avant-connexion.sql",
  "012-correctifs.sql", "013-noyau-resume-et-journal.sql", "014-roles-audit.sql", "015-ruchers.sql",
  "016-emplacements-contenants.sql", "017-associes.sql", "018-stock-mouvements.sql", "019-reines-liens.sql"];

// Migrations relançables après 008 (000 à 009 ne le sont pas toutes : 008 ne se lance qu'une fois,
// et 009 ne doit jamais être relancée en entier après 008).
export const RELANCABLES = ["010-registre-factures.sql", "011-invitation-avant-connexion.sql", "012-correctifs.sql",
  "013-noyau-resume-et-journal.sql", "014-roles-audit.sql", "015-ruchers.sql",
  "016-emplacements-contenants.sql", "017-associes.sql", "018-stock-mouvements.sql", "019-reines-liens.sql"];

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
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE);
  for (const f of ORDRE.slice(0, ORDRE.indexOf(jusqua) + 1)) {
    for (let k = 0; k < (deuxFois.includes(f) ? 2 : 1); k++) {
      try { await db.exec(fs.readFileSync("migrations/" + f, "utf8")); }
      catch (e) { throw new Error(`${f}${k ? " (2e passage)" : ""} : ${e.message}`); }
    }
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

/** Identifiant fixe : objet n de l'exploitation k (1 = A, 2 = B). */
export const id = (k, n) => `${k}${n.toString(16).padStart(7, "0")}-0000-4000-8000-000000000000`;
export const EX = (k) => (k === 1 ? E1 : E2);

/** Une ligne dans chacune des 17 tables métier, pour A et pour B (insérées sans RLS). */
export async function donnees(db) {
  await db.exec("reset role");
  for (const k of [1, 2]) {
    const e = EX(k), I = (n) => id(k, n);
    await db.exec(`
      insert into public.fournisseurs (id, nom, exploitation_id) values ('${I(1)}', 'Fournisseur ${k}', '${e}');
      insert into public.articles (id, nom, type, unite, stock, seuil, fournisseur_id, exploitation_id) values ('${I(2)}', 'Candy', 'Consommable', 'kg', 10, 1, '${I(1)}', '${e}');
      do $r$ begin if to_regclass('public.ruchers') is not null then
        insert into public.ruchers (id, nom, exploitation_id) values ('${I(16)}', 'Rucher ${k}', '${e}');
      end if; end $r$;
      insert into public.ruches (id, nom, etat, exploitation_id) values ('${I(3)}', 'Ruche ${k}', 'Bonne', '${e}'), ('${I(13)}', 'Ruche ${k}b', 'Bonne', '${e}');
      insert into public.visites (id, ruche_id, activite, provisions, reine, exploitation_id) values ('${I(4)}', '${I(3)}', 'Normale', 'Moyennes', 'Vue', '${e}');
      insert into public.visite_intrants (id, visite_id, article_id, quantite, exploitation_id) values ('${I(5)}', '${I(4)}', '${I(2)}', 1, '${e}');
      insert into public.recoltes (id, ruche_id, kg, exploitation_id) values ('${I(6)}', '${I(3)}', 12, '${e}');
      insert into public.lots (id, code, format_g, prix, pots_initiaux, exploitation_id) values ('${I(7)}', 'L${k}', 500, 10, 20, '${e}');
      insert into public.clients (id, nom, exploitation_id) values ('${I(8)}', 'Client ${k}', '${e}');
      insert into public.ventes (id, client_id, exploitation_id) values ('${I(9)}', '${I(8)}', '${e}');
      insert into public.vente_lignes (id, vente_id, lot_id, quantite, prix_unitaire, exploitation_id) values ('${I(10)}', '${I(9)}', '${I(7)}', 2, 10, '${e}');
      insert into public.depenses (id, categorie, libelle, montant, fournisseur_id, exploitation_id) values ('${I(11)}', 'Autre', 'Achat ${k}', 30, '${I(1)}', '${e}');
      insert into public.taches (id, titre, ruche_id, exploitation_id) values ('${I(12)}', 'Tâche ${k}', '${I(3)}', '${e}');
      insert into public.budgets (annee, poste, montant, exploitation_id) values (2026, 'Autre', 100, '${e}');
      insert into public.visite_photos (id, visite_id, chemin, exploitation_id) values ('${I(14)}', '${I(4)}', '${e}/${I(4)}/p.jpg', '${e}');
      insert into public.ruche_evenements (id, ruche_id, type, exploitation_id) values ('${I(15)}', '${I(3)}', 'installation', '${e}');
      insert into storage.objects (bucket_id, name, metadata) values ('photos-visites', '${e}/${I(4)}/p.jpg', '{"size": 1000}');
      do $r$ begin if to_regclass('public.contenants') is not null then
        insert into public.deplacements (id, nb_colonies, exploitation_id) values ('${I(17)}', 1, '${e}');
        insert into public.contenants (id, code, exploitation_id) values ('${I(18)}', 'C${k}', '${e}');
        insert into public.colonie_contenants (id, colonie_id, contenant_id, du, exploitation_id) values ('${I(19)}', '${I(3)}', '${I(18)}', '2026-01-01', '${e}');
      end if; end $r$;`);
  }
}

/** Les 17 tables métier (ruchers depuis 015) et, pour chacune, une ligne nouvelle valable dans l'exploitation k. */
export const TABLES = {
  ruches: (k) => ({ nom: "Nouvelle " + k }),
  articles: (k) => ({ nom: "Article neuf " + k }),
  visites: (k) => ({ ruche_id: id(k, 3), activite: "Normale", provisions: "Moyennes", reine: "Vue" }),
  visite_intrants: (k) => ({ visite_id: id(k, 4), article_id: id(k, 2), quantite: 1 }),
  recoltes: (k) => ({ kg: 3 }),
  lots: (k) => ({ code: "LN" + k, format_g: 250, prix: 6, pots_initiaux: 5 }),
  clients: (k) => ({ nom: "Client neuf " + k }),
  ventes: (k) => ({ client_id: id(k, 8) }),
  vente_lignes: (k) => ({ vente_id: id(k, 9), lot_id: id(k, 7), quantite: 1, prix_unitaire: 10 }),
  depenses: (k) => ({ categorie: "Autre", libelle: "Neuve", montant: 1 }),
  reglages: null, // une seule ligne par exploitation : pas d'ajout
  fournisseurs: (k) => ({ nom: "Fournisseur neuf " + k }),
  taches: (k) => ({ titre: "Neuve" }),
  budgets: (k) => ({ annee: 2031, poste: "Autre", montant: 1 }),
  visite_photos: (k) => ({ visite_id: id(k, 4), chemin: `${EX(k)}/n${k}.jpg` }),
  ruche_evenements: (k) => ({ ruche_id: id(k, 3), type: "installation" }),
  ruchers: (k) => ({ nom: "Rucher neuf " + k }),
  deplacements: (k) => ({ nb_colonies: 0, notes: "Neuf" }),
  colonie_emplacements: (k) => ({ colonie_id: id(k, 13), du: "2020-01-01", au: "2020-02-01" }),
  contenants: (k) => ({ code: "N" + k }),
  colonie_contenants: (k) => ({ colonie_id: id(k, 13), contenant_id: id(k, 18), du: "2020-01-01", au: "2020-02-01" }),
  mouvements_stock: (k) => ({ article_id: id(k, 2), type: "ajustement", quantite: 1, origine: "saisie" }),
};

/** Requête d'insertion paramétrée pour une table et un objet { colonne: valeur }. */
export function insertion(table, ligne, extra = {}) {
  const o = { ...ligne, ...extra }, cols = Object.keys(o);
  return [`insert into public.${table} (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")})`, cols.map((c) => o[c])];
}
