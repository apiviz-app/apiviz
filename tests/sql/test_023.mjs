// Tests SQL de la migration 023 : visite rapide (force, œufs vus, cellules royales ; creer_visite étendue).
// Usage (depuis la racine du dépôt) : node tests/sql/test_023.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "022-suppression-compte.sql" });
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const avant = await val(`select count(*)::int n, md5(string_agg(id::text || activite || provisions, ',' order by id)) h from public.visites`);

const sql = fs.readFileSync("migrations/023-visite-rapide.sql", "utf8");
try { await db.exec(sql); verif(true, "023 appliquée sur une base avec données"); }
catch (e) { verif(false, "023 : " + e.message); fin("Migration 023"); }
try { await db.exec(sql); verif(true, "023 relançable"); }
catch (e) { verif(false, "023 relancée : " + e.message); }

const v0 = await val(`select count(*)::int n, md5(string_agg(id::text || activite || provisions, ',' order by id)) h,
  count(force)::int f, count(oeufs_vus)::int o, count(cellules_royales)::int c from public.visites`);
verif(v0.n === avant.n && v0.h === avant.h && v0.f === 0 && v0.o === 0 && v0.c === 0, "visites existantes inchangées, nouveaux champs vides");

const creer = (p) => db.query(`select public.creer_visite($1::jsonb)`, [JSON.stringify(p)]);
const base_ = { ruche_id: id(1, 3), activite: "Normale", provisions: "Bonnes", reine: "Vue" };

// Visite avec les trois nouveaux champs, en express (observes) et avec une durée.
await en(db, "a@x.fr", E1);
const v1 = "2a000023-0000-4000-8000-000000000001";
await creer({ ...base_, id: v1, force: 4, oeufs_vus: true, cellules_royales: "Operculées", observes: ["cellules_royales", "oeufs_vus"], duree_s: 95 });
const x = await val(`select force, oeufs_vus, cellules_royales, observes, duree_s from public.visites where id = $1`, [v1]);
verif(x?.force === 4 && x?.oeufs_vus === true && x?.cellules_royales === "Operculées" && JSON.stringify(x?.observes) === '["cellules_royales","oeufs_vus"]' && x?.duree_s === 95,
  `force 4, œufs vus, cellules operculées, observes et durée gardés (${JSON.stringify(x)})`);

// Œufs « non vus » (false) distinct de « pas regardé » (null) ; force en texte acceptée.
const v2 = "2a000023-0000-4000-8000-000000000002";
await creer({ ...base_, id: v2, force: "2", oeufs_vus: false, cellules_royales: "" });
const y = await val(`select force, oeufs_vus, cellules_royales from public.visites where id = $1`, [v2]);
verif(y?.force === 2 && y?.oeufs_vus === false && y?.cellules_royales === null, `œufs non vus = false, cellules vides = null, force « 2 » = 2 (${JSON.stringify(y)})`);

// Ancienne version (charge de 020) : passe, champs vides.
const v3 = "2a000023-0000-4000-8000-000000000003";
await creer({ ...base_, id: v3, observes: ["poids_kg"], duree_s: 12 });
const z = await val(`select force, oeufs_vus, cellules_royales, duree_s from public.visites where id = $1`, [v3]);
verif(z && z.force === null && z.oeufs_vus === null && z.cellules_royales === null && z.duree_s === 12, "charge de l'ancienne version acceptée, nouveaux champs vides");

// Valeurs hors liste : refusées en français, rien d'écrit.
const n0 = (await val(`select count(*)::int n from public.visites`)).n;
const e1 = await erreur(db, `select public.creer_visite($1::jsonb)`, [JSON.stringify({ ...base_, force: 6 })]);
const e2 = await erreur(db, `select public.creer_visite($1::jsonb)`, [JSON.stringify({ ...base_, force: "forte" })]);
const e3 = await erreur(db, `select public.creer_visite($1::jsonb)`, [JSON.stringify({ ...base_, cellules_royales: "Beaucoup" })]);
verif(/1 à 5/.test(String(e1)) && /1 à 5/.test(String(e2)), `force 6 ou « forte » refusée : ${e1} / ${e2}`);
verif(/Cellules royales/.test(String(e3)), `cellules hors liste refusées : ${e3}`);
verif((await val(`select count(*)::int n from public.visites`)).n === n0, "aucune visite écrite par les refus");
await db.exec("reset role");
verif(!!(await erreur(db, `update public.visites set force = 0 where id = '${v1}'`)), "contrainte : force 0 refusée même en écriture directe");
verif(!!(await erreur(db, `update public.visites set cellules_royales = 'x' where id = '${v1}'`)), "contrainte : cellules hors liste refusées en écriture directe");

// Idempotence : la file hors ligne renvoie la même visite, pas de doublon ni de changement.
await en(db, "a@x.fr", E1);
await creer({ ...base_, id: v1, force: 1, cellules_royales: "Aucune" });
const d = await val(`select count(*)::int n, max(force) f, max(cellules_royales) c from public.visites where id = $1`, [v1]);
verif(d.n === 1 && d.f === 4 && d.c === "Operculées", "visite renvoyée : pas de doublon, rien de changé");

// Lecteur refusé ; autre exploitation : ruche de A introuvable, visites de A invisibles.
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.creer_visite($1::jsonb)`, [JSON.stringify({ ...base_, force: 3 })])), "lecteur : visite refusée");
await en(db, "b@x.fr", E2);
verif(/introuvable/i.test(String(await erreur(db, `select public.creer_visite($1::jsonb)`, [JSON.stringify({ ...base_, force: 3 })]))), "B : ruche de A introuvable");
verif((await val(`select count(*)::int n from public.visites where force is not null`)).n === 0, "B ne voit aucune visite de A");

// Résumé des colonies (013) toujours lisible après 023.
await en(db, "a@x.fr", E1);
verif((await val(`select count(*)::int n from public.colonies_resume`)).n > 0, "colonies_resume toujours lisible");

fin("Migration 023");
