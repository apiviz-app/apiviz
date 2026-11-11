// Tests SQL de la migration 017 (chantier des écrans, étape 7) : qui a acheté, qui a vendu, qui a récolté l'argent.
// Usage (depuis la racine du dépôt) : node tests/sql/test_017.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, id, E1 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "016-emplacements-contenants.sql" });
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];

// Avant 017 : une vente et une dépense de l'ancienne version, avec les valeurs qu'elle écrivait.
await db.exec(`reset role; update public.depenses set paye_par = 'Caisse commune'; update public.ventes set encaisse_par = 'Pierre-Louis';`);
const avant = await val(`select (select count(*) from public.depenses) d, (select count(*) from public.ventes) v`);

try { await db.exec(fs.readFileSync("migrations/017-associes.sql", "utf8")); verif(true, "017 appliquée sur une base avec données"); }
catch (e) { verif(false, "017 : " + e.message); fin("Migration 017"); }
try { await db.exec(fs.readFileSync("migrations/017-associes.sql", "utf8")); verif(true, "017 relançable"); }
catch (e) { verif(false, "017 relancée : " + e.message); }

const apres = await val(`select (select count(*) from public.depenses) d, (select count(*) from public.ventes) v,
  (select count(*) from public.depenses where achete_par = '' and paye_par = 'Caisse commune') anciennes_dep,
  (select count(*) from public.ventes where vendu_par = '' and encaisse_par = 'Pierre-Louis') anciennes_ventes`);
verif(apres.d === avant.d && apres.v === avant.v, "aucune ligne ajoutée ni retirée");
verif(apres.anciennes_dep === apres.d && apres.anciennes_ventes === apres.v, "lignes existantes : nouvelles colonnes vides, anciennes valeurs gardées");

// Nouvelle version : creer_vente enregistre qui a vendu et qui a récolté l'argent.
await en(db, "a@x.fr", E1);
const v1 = "1a000017-0000-4000-8000-000000000001";
await db.query(`select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: v1, client_id: id(1, 8), lignes: [{ lot_id: id(1, 7), quantite: 1 }], paye: true, mode: "Espèces", vendu_par: "Johan", encaisse_par: "Société" })]);
const v = await val(`select vendu_par, encaisse_par, auteur from public.ventes where id = $1`, [v1]);
verif(v?.vendu_par === "Johan" && v?.encaisse_par === "Société" && v?.auteur === "a@x.fr", `vente : vendue par Johan, argent à la société, saisie par a@x.fr (${JSON.stringify(v)})`);

// Ancienne version : elle n'envoie pas vendu_par, la vente passe quand même.
const v2 = "1a000017-0000-4000-8000-000000000002";
await db.query(`select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: v2, client_id: id(1, 8), lignes: [{ lot_id: id(1, 7), quantite: 1 }], paye: false })]);
verif((await val(`select vendu_par from public.ventes where id = $1`, [v2]))?.vendu_par === "", "ancienne version : vente acceptée, vendu_par vide");

// Idempotence : le même identifiant renvoyé (file hors ligne) ne crée pas de doublon.
await db.query(`select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: v1, client_id: id(1, 8), lignes: [{ lot_id: id(1, 7), quantite: 1 }], vendu_par: "Autre" })]);
verif((await val(`select count(*) n, max(vendu_par) p from public.ventes where id = $1`, [v1])).p === "Johan", "vente renvoyée : pas de doublon, rien de changé");

// Dépense : qui a acheté, avec quel argent (écriture directe, comme l'app).
const d1 = "1a000017-0000-4000-8000-000000000003";
await db.query(`insert into public.depenses (id, libelle, categorie, montant, achete_par, paye_par) values ($1, 'Candy', 'Autre', 12.5, 'Johan', 'Johan')`, [d1]);
const d = await val(`select achete_par, paye_par, exploitation_id from public.depenses where id = $1`, [d1]);
verif(d?.achete_par === "Johan" && d?.paye_par === "Johan" && d?.exploitation_id === E1, "dépense : achetée et payée par Johan, rattachée à l'exploitation");

fin("Migration 017");
