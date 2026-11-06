// Tests SQL de la migration 015 (IT-05) : reprise des ruchers (casse et espaces variés), synchronisation avec le texte
// de l'ancienne version, renommage, position, archivage, creer_rucher / placer_rucher, isolation entre exploitations.
// Les droits table par table (lire, ajouter, modifier, supprimer selon le rôle) sont dans test_isolation.mjs.
// Usage (depuis la racine du dépôt) : node tests/sql/test_015.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2, id } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "014-roles-audit.sql" });
await deuxExploitations(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const lignes = async (q, p) => (await db.query(q, p)).rows;
const nb = async (q, p) => Number((await val(q, p)).n);

// --- Jeu de reprise : casse et espaces variés, positions partielles, colonies sans rucher (AP-TECH-091) ---
const ruche = (k, n, rucher, lat = null, lng = null) =>
  `('${id(k, n)}', 'R${k}-${n}', ${rucher === null ? "''" : `'${rucher}'`}, ${lat ?? "null"}, ${lng ?? "null"}, '${k === 1 ? E1 : E2}')`;
await db.exec(`reset role; insert into public.ruches (id, nom, rucher, lat, lng, exploitation_id) values
  ${ruche(1, 1, "Verger", 47.3, 5.0)}, ${ruche(1, 2, "Verger", 47.5, 5.2)}, ${ruche(1, 3, "Verger")}, ${ruche(1, 4, "Verger")},
  ${ruche(1, 5, "Verger")}, ${ruche(1, 6, "verger")}, ${ruche(1, 7, "verger ")}, ${ruche(1, 8, "  VERGER")},
  ${ruche(1, 9, "Bois  du Roi")}, ${ruche(1, 10, "bois du roi")}, ${ruche(1, 11, null)}, ${ruche(1, 12, "   ")},
  ${ruche(2, 1, "Verger", 45.0, 4.0)};`);

try { await db.exec(fs.readFileSync("migrations/015-ruchers.sql", "utf8")); verif(true, "015 appliquée sur une base avec données"); }
catch (e) { verif(false, "015 : " + e.message); fin("Migration 015"); }

let rs = await lignes(`select exploitation_id e, nom, lat, lng from public.ruchers order by exploitation_id, nom`);
const a = rs.filter((r) => r.e === E1);
verif(a.length === 2 && a[0].nom === "Bois du Roi" && a[1].nom === "Verger",
  `reprise A : 2 ruchers (« ${a.map((r) => r.nom).join(" », « ")} »), variantes de casse et d'espaces regroupées`);
verif(rs.filter((r) => r.e === E2).length === 1, "reprise B : 1 rucher, distinct du « Verger » de A");
const verger = a.find((r) => r.nom === "Verger");
verif(Math.abs(verger.lat - 47.4) < 1e-9 && Math.abs(verger.lng - 5.1) < 1e-9, "position du rucher = moyenne des colonies placées");
verif(a.find((r) => r.nom === "Bois du Roi").lat === null, "rucher sans colonie placée : sans position");
verif(await nb(`select count(*) n from public.ruches r join public.ruchers x on x.id = r.rucher_id where x.nom = 'Verger' and x.exploitation_id = $1 and r.rucher = 'Verger'`, [E1]) === 8,
  "les 8 colonies du Verger (Verger, verger, « verger  », « VERGER ») ont le même rucher_id et le texte « Verger »");
verif(await nb(`select count(*) n from public.ruches where rucher_id is null`) === 2
  && await nb(`select count(*) n from public.ruches where rucher_id is null and rucher <> ''`) === 0,
  "colonies sans rucher : rucher_id vide et texte vide (« Sans rucher » explicite), y compris un nom fait d'espaces");
verif(await nb(`select count(*) n from public.ruches r left join public.ruchers x on x.id = r.rucher_id
               where (r.rucher_id is null) <> (r.rucher = '') or (x.id is not null and x.nom <> r.rucher)`) === 0,
  "toutes les colonies : texte = nom du rucher, ou « Sans rucher »");
verif(await nb(`select count(*) n from public.journal_audit`) === 0, "la reprise n'écrit rien dans le journal d'audit");

// --- Relance ---
try {
  await db.exec(fs.readFileSync("migrations/015-ruchers.sql", "utf8"));
  verif(await nb(`select count(*) n from public.ruchers`) === 3, "015 relancée : aucun rucher en double");
} catch (e) { verif(false, "015 relancée : " + e.message); }

// --- Renommer (AP-US-028), y compris pour l'ancienne version qui lit le texte ---
await en(db, "a2@x.fr", E1);
await db.query(`update public.ruchers set nom = '  Verger   du haut ' where nom = 'Verger'`);
verif(await nb(`select count(*) n from public.ruches where rucher = 'Verger du haut'`) === 8,
  "renommer « Verger » en « Verger du haut » : les 8 colonies affichent le nouveau nom (texte de l'ancienne version)");
const vid = (await val(`select id from public.ruchers where nom = 'Verger du haut'`)).id;
let e = await erreur(db, `update public.ruchers set nom = 'BOIS DU ROI' where id = $1`, [vid]);
verif(e && /ruchers_nom_uidx|duplicate|unique/.test(e.message), "renommer avec le nom d'un autre rucher (autre casse) : refusé");

// --- Ancienne version : elle écrit le texte ---
await db.query(`insert into public.ruches (id, nom, rucher) values ($1, 'Ancienne 1', '  verger DU haut')`, [id(1, 20)]);
let r = await val(`select rucher, rucher_id, lat, lng from public.ruches where id = $1`, [id(1, 20)]);
verif(r.rucher_id === vid && r.rucher === "Verger du haut", "ancienne version, nouvelle ruche « verger DU haut » : rattachée au rucher, texte normalisé");
verif(Math.abs(r.lat - 47.4) < 1e-9, "… et elle prend la position du rucher");
await db.query(`insert into public.ruches (id, nom, rucher, lat, lng) values ($1, 'Ancienne 2', 'Les Prés', 46.1, 4.9)`, [id(1, 21)]);
r = await val(`select x.nom, x.lat, x.exploitation_id e from public.ruches r join public.ruchers x on x.id = r.rucher_id where r.id = $1`, [id(1, 21)]);
verif(r?.nom === "Les Prés" && r.lat === 46.1 && r.e === E1, "ancienne version, nom de rucher inconnu : le rucher est créé dans l'exploitation, avec la position de la ruche");
await db.query(`update public.ruches set rucher = 'bois du roi' where id = $1`, [id(1, 21)]);
r = await val(`select r.rucher, x.nom from public.ruches r join public.ruchers x on x.id = r.rucher_id where r.id = $1`, [id(1, 21)]);
verif(r.nom === "Bois du Roi" && r.rucher === "Bois du Roi", "ancienne version, rucher changé par le texte : rucher_id suit");
await db.query(`update public.ruches set rucher = '' where id = $1`, [id(1, 21)]);
verif((await val(`select rucher_id from public.ruches where id = $1`, [id(1, 21)])).rucher_id === null, "texte vidé : « Sans rucher »");

// --- Nouvelle version : elle écrit rucher_id ---
await db.query(`update public.ruches set rucher_id = $2 where id = $1`, [id(1, 21), vid]);
verif((await val(`select rucher from public.ruches where id = $1`, [id(1, 21)])).rucher === "Verger du haut", "rucher_id donné : le texte suit");
await db.query(`update public.ruches set rucher_id = null where id = $1`, [id(1, 21)]);
verif((await val(`select rucher from public.ruches where id = $1`, [id(1, 21)])).rucher === "", "rucher_id retiré : texte vide");

// --- Position (AP-US-029) ---
const bois = (await val(`select id from public.ruchers where nom = 'Bois du Roi'`)).id;
await val(`select public.placer_rucher($1)`, [{ id: bois, lat: 47.1234567, lng: 5.7654321 }]);
verif(await nb(`select count(*) n from public.ruches where rucher_id = $1 and lat = 47.123457 and lng = 5.765432`, [bois]) === 2,
  "placer un rucher : toutes ses colonies ont cette position (donc la même météo, y compris dans l'ancienne version)");
e = await erreur(db, `select public.placer_rucher($1)`, [{ id: bois, lat: 95, lng: 5 }]);
verif(e?.message === "Position invalide", "position hors limites : « Position invalide »");
// Ancienne version : « Placer sur la carte » met à jour les ruches d'un rucher, par le texte.
await db.query(`update public.ruches set lat = 48, lng = 6 where rucher = 'Verger du haut'`);
r = await val(`select lat, lng from public.ruchers where id = $1`, [vid]);
verif(r.lat === 48 && r.lng === 6, "ancienne version, rucher placé par ses ruches : la position du rucher suit");

// --- Archivage (AP-TECH-096) ---
e = await erreur(db, `update public.ruchers set archive_le = now() where id = $1`, [bois]);
verif(/une fois vide/.test(e?.message || ""), "archiver un rucher qui a des colonies : refusé");
const pres = (await val(`select id from public.ruchers where nom = 'Les Prés'`)).id;
await db.query(`update public.ruchers set archive_le = now() where id = $1`, [pres]);
verif((await val(`select archive_le from public.ruchers where id = $1`, [pres])).archive_le !== null, "archiver un rucher vide : accepté");
e = await erreur(db, `insert into public.ruches (nom, rucher_id) values ('N1', $1)`, [pres]);
verif(/archivé/.test(e?.message || ""), "colonie dans un rucher archivé (nouvelle version) : refusée");
e = await erreur(db, `insert into public.ruches (nom, rucher) values ('N2', 'les prés')`);
verif(/archivé/.test(e?.message || ""), "colonie dans un rucher archivé (ancienne version, par le texte) : refusée");
e = await erreur(db, `delete from public.ruchers where id = $1`, [bois]);
verif(!!e, "supprimer un rucher qui a des colonies : refusé");

// --- creer_rucher (AP-TECH-093) ---
const nid = "aaaaaaaa-0000-4000-8000-000000000001";
const p = { id: nid, nom: " Le  Verger ", lat: 47.2, lng: 5.1, acces: "Portail code 1234",
  colonies: [{ id: "aaaaaaaa-0000-4000-8000-0000000000c1", nom: "Ruche 1" }, { id: "aaaaaaaa-0000-4000-8000-0000000000c2", nom: "Ruche 2" }] };
verif((await val(`select public.creer_rucher($1) i`, [p])).i === nid, "creer_rucher : renvoie l'identifiant fourni");
r = await val(`select nom, acces, (select count(*) from public.ruches where rucher_id = $1) n,
                 (select count(*) from public.ruches where rucher_id = $1 and rucher = 'Le Verger' and lat = 47.2) placees
               from public.ruchers where id = $1`, [nid]);
verif(r.nom === "Le Verger" && r.acces === "Portail code 1234" && Number(r.n) === 2 && Number(r.placees) === 2,
  "creer_rucher : rucher, accès, et 2 colonies au même endroit, en une fois");
await val(`select public.creer_rucher($1)`, [p]);
verif(await nb(`select count(*) n from public.ruches where rucher_id = $1`, [nid]) === 2, "creer_rucher relancé (saisie renvoyée) : pas de doublon");
e = await erreur(db, `select public.creer_rucher($1)`, [{ nom: "le verger" }]);
verif(e?.message === "Ce rucher existe déjà.", `même nom, autre casse : « ${e?.message} »`);
e = await erreur(db, `select public.creer_rucher($1)`, [{ nom: "   " }]);
verif(e?.message === "Donne un nom au rucher.", "nom vide : « Donne un nom au rucher. »");
await en(db, "l@x.fr", E1);
e = await erreur(db, `select public.creer_rucher($1)`, [{ nom: "Lecteur" }]);
verif(/lecture seule/.test(e?.message || ""), "lecteur : creer_rucher refusé");
e = await erreur(db, `select public.placer_rucher($1)`, [{ id: nid, lat: 1, lng: 1 }]);
verif(/lecture seule/.test(e?.message || ""), "lecteur : placer_rucher refusé");
await en(db, null);
e = await erreur(db, `select public.creer_rucher($1)`, [{ nom: "Anonyme" }]);
verif(!!e, "visiteur non connecté : creer_rucher refusé");

// --- Isolation entre exploitations ---
await en(db, "b@x.fr", E2);
verif(await nb(`select count(*) n from public.ruchers`) === 1, "B ne voit que son rucher");
e = await erreur(db, `select public.placer_rucher($1)`, [{ id: vid, lat: 1, lng: 1 }]);
verif(e?.message === "Rucher introuvable", "B ne peut pas placer un rucher de A");
e = await erreur(db, `update public.ruches set rucher_id = $1 where exploitation_id = $2`, [vid, E2]);
verif(!!e, "B ne peut pas rattacher sa colonie à un rucher de A");
await db.query(`insert into public.ruches (nom, rucher) values ('B neuve', 'Bois du Roi')`);
r = await val(`select x.exploitation_id e from public.ruches r join public.ruchers x on x.id = r.rucher_id where r.nom = 'B neuve'`);
verif(r.e === E2, "B tape « Bois du Roi » (nom d'un rucher de A) : un rucher de B est créé, celui de A n'est pas touché");
await en(db, "a@x.fr", E1);
verif((await val(`select count(*) n from public.ruchers where nom = 'Bois du Roi'`)).n == 1, "A ne voit pas le rucher homonyme de B");

// --- Audit et suppression d'une exploitation ---
verif(await nb(`select count(*) n from public.journal_audit where table_nom = 'ruchers' and operation = 'UPDATE'`) > 0,
  "modifications de ruchers dans le journal d'audit (responsable)");
await db.exec("reset role");
const avant = await nb(`select count(*) n from public.ruchers where exploitation_id = $1`, [E2]);
e = await erreur(db, `delete from public.exploitations where id = $1`, [E2]);
verif(!e && avant > 0 && await nb(`select count(*) n from public.ruchers where exploitation_id = $1`, [E2]) === 0,
  "supprimer une exploitation : ses ruchers et ses colonies partent avec elle" + (e ? " (" + e.message + ")" : ""));

fin("Migration 015");
