// Tests SQL de la migration 014 (IT-04) : invitations, journal d'audit et restauration, données incohérentes avant
// la migration, démonstration, empreinte de structure, relance. Les droits table par table sont dans test_isolation.mjs.
// Usage (depuis la racine du dépôt) : node tests/sql/test_014.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2, id, RELANCABLES } from "./socle.mjs";

const { verif, fin } = verificateur();

// --- Relance (AP-US-013) : 000 + migrations, puis chaque migration relançable une deuxième fois. ---
let db;
try { db = await base({ deuxFois: RELANCABLES }); verif(true, `migrations appliquées, puis relancées sans erreur : ${RELANCABLES.join(", ")}`); }
catch (e) { verif(false, "relance des migrations : " + e.message); fin("Migration 014"); }
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const nb = async (q, p) => Number((await val(q, p)).n);

// --- Invitations (AP-US-018) ---
await en(db, "a@x.fr", E1);
const unique = (await val(`insert into public.invitations (usages_max) values (1) returning code`)).code;
const lecture = (await val(`insert into public.invitations (role) values ('lecteur') returning code`)).code;
const plusieurs = (await val(`insert into public.invitations default values returning code`)).code;
await en(db, null);
let info = await val(`select * from public.invitation_info($1)`, [unique]);
verif(info.nom === "Rucher A" && info.valide === true && info.etat === "valide" && info.role === "membre", "invitation_info : lisible avant la connexion (nom, valide, état, rôle)");

await en(db, "p1@x.fr");
verif((await val(`select public.rejoindre($1) e`, [unique])).e === E1, "lien à usage unique : la première personne rejoint");
await en(db, "a@x.fr", E1);
verif((await val(`select role from public.membres where email = 'p1@x.fr'`)).role === "membre", "… comme membre");
verif((await val(`select usages from public.invitations where code = $1`, [unique])).usages === 1, "… et le lien compte un usage");
await en(db, "p1@x.fr");
verif((await val(`select public.rejoindre($1) e`, [unique])).e === E1, "la même personne qui rouvre le lien n'est pas refusée…");
await en(db, "a@x.fr", E1);
verif((await val(`select usages from public.invitations where code = $1`, [unique])).usages === 1, "… et ne consomme pas d'usage");
await en(db, "p2@x.fr");
let e = await erreur(db, `select public.rejoindre($1)`, [unique]);
verif(e && e.message === "Ce lien a déjà servi : demandes-en un nouveau.", `deuxième personne : « ${e?.message} »`);
await en(db, "a@x.fr", E1);
verif(await nb(`select count(*) n from public.membres where email = 'p2@x.fr'`) === 0, "… et n'est pas ajoutée");
await en(db, null);
verif((await val(`select * from public.invitation_info($1)`, [unique])).etat === "epuise", "invitation_info : état « epuise »");

await en(db, "lect@x.fr");
await val(`select public.rejoindre($1)`, [lecture]);
await en(db, "a@x.fr", E1);
verif((await val(`select role from public.membres where email = 'lect@x.fr'`)).role === "lecteur", "lien « lecteur » : la personne rejoint en lecture seule (AP-US-019)");

for (const p of ["p3@x.fr", "p4@x.fr"]) { await en(db, p); await val(`select public.rejoindre($1)`, [plusieurs]); }
await en(db, "a@x.fr", E1);
verif(await nb(`select count(*) n from public.membres where email in ('p3@x.fr', 'p4@x.fr')`) === 2, "lien sans limite : plusieurs personnes rejoignent");
const rev = await db.query(`update public.invitations set revoque_le = now() where code = $1`, [plusieurs]);
verif(rev.affectedRows === 1, "un responsable révoque un lien");
await en(db, "p5@x.fr");
e = await erreur(db, `select public.rejoindre($1)`, [plusieurs]);
verif(e && /révoqué/.test(e.message), `lien révoqué refusé immédiatement : « ${e?.message} »`);

// Lien d'avant 014 : aucune limite d'usages, valable jusqu'à son expiration (AP-TECH-061).
await db.exec(`reset role; insert into public.invitations (code, exploitation_id, cree_par) values ('ancien', '${E1}', 'a@x.fr'),
  ('expire', '${E1}', 'a@x.fr'); update public.invitations set expire_le = now() - interval '1 day' where code = 'expire';`);
verif((await val(`select usages_max, role from public.invitations where code = 'ancien'`)).usages_max === null, "lien existant : usages_max vide (illimité), rôle membre par défaut");
for (const p of ["q1@x.fr", "q2@x.fr"]) { await en(db, p); await val(`select public.rejoindre('ancien')`); }
await en(db, "a@x.fr", E1);
verif(await nb(`select count(*) n from public.membres where email in ('q1@x.fr', 'q2@x.fr')`) === 2, "lien existant : toujours valable, pour plusieurs personnes");
await en(db, "q3@x.fr");
e = await erreur(db, `select public.rejoindre('expire')`);
verif(e && /plus valable/.test(e.message), `lien expiré refusé : « ${e?.message} »`);
await en(db, "a2@x.fr", E1);
verif((await db.query(`update public.invitations set revoque_le = now()`)).affectedRows === 0, "un simple membre ne peut pas révoquer de lien");
await en(db, "a@x.fr", E1);
e = await erreur(db, `update public.invitations set usages = 0 where code = $1`, [unique]);
verif(!!e, "le compteur d'usages ne se modifie pas par l'API");
e = await erreur(db, `insert into public.invitations (role) values ('responsable')`);
verif(!!e, "un lien ne peut pas donner le rôle responsable");
verif((await db.query(`delete from public.invitations where code = 'ancien'`)).affectedRows === 1, "l'ancienne façon de désactiver (suppression) marche encore");

// --- Journal d'audit et restauration (AP-US-024) ---
await en(db, "a2@x.fr", E1);
const stockAvant = Number((await val(`select stock from public.articles where id = '${id(1, 2)}'`)).stock);
await db.query(`delete from public.visites where id = '${id(1, 4)}'`);
verif(Number((await val(`select stock from public.articles where id = '${id(1, 2)}'`)).stock) === stockAvant + 1, "suppression d'une visite : le stock de l'intrant est rétabli (comme avant)");
await en(db, "a@x.fr", E1);
let lignes = (await db.query(`select * from public.journal_audit where operation = 'DELETE' order by id`)).rows;
const audV = lignes.find((l) => l.table_nom === "visites");
verif(audV && audV.avant.id === id(1, 4) && audV.auteur === "a2@x.fr" && audV.cree_le, "audit : la visite supprimée est gardée avec son contenu, l'auteur et la date");
verif(lignes.some((l) => l.table_nom === "visite_intrants") && lignes.some((l) => l.table_nom === "visite_photos"), "audit : ses intrants et photos supprimés en cascade aussi");
await en(db, "a2@x.fr", E1);
verif(await nb(`select count(*) n from public.journal_audit`) === 0, "audit : un membre (non responsable) ne lit pas le journal");
e = await erreur(db, `select public.restaurer($1)`, [audV.id]);
verif(e && /responsable/.test(e.message), `restaurer : réservé aux responsables (« ${e?.message} »)`);
await en(db, "b@x.fr", E2);
e = await erreur(db, `select public.restaurer($1)`, [audV.id]);
verif(e && /introuvable/.test(e.message), "restaurer : impossible depuis une autre exploitation");
await en(db, "a@x.fr", E1);
const res = (await val(`select public.restaurer($1) r`, [audV.id])).r;
verif(res.table === "visites" && await nb(`select count(*) n from public.visites where id = '${id(1, 4)}'`) === 1, "restaurer : la visite revient");
verif(await nb(`select count(*) n from public.visite_intrants where visite_id = '${id(1, 4)}'`) === 1, "restaurer : avec ses intrants");
verif(Number((await val(`select stock from public.articles where id = '${id(1, 2)}'`)).stock) === stockAvant, "restaurer : le stock repart comme avant la suppression");
verif(await nb(`select count(*) n from public.visite_photos where visite_id = '${id(1, 4)}'`) === 0, "restaurer : les photos ne reviennent pas (fichiers effacés)");
e = await erreur(db, `select public.restaurer($1)`, [audV.id]);
verif(e && /déjà été restauré/.test(e.message), "restaurer : pas deux fois");

// Vente : restaurée si les pots sont encore là, refusée sinon.
await db.query(`delete from public.ventes where id = '${id(1, 9)}'`);
const audS = (await val(`select id from public.journal_audit where table_nom = 'ventes' and operation = 'DELETE'`)).id;
await db.query(`update public.lots set pots_initiaux = 1 where id = '${id(1, 7)}'`);
e = await erreur(db, `select public.restaurer($1)`, [audS]);
verif(e && /ne reste que 1 pots/.test(e.message), `restaurer une vente sans assez de pots : « ${e?.message} »`);
await db.query(`update public.lots set pots_initiaux = 20 where id = '${id(1, 7)}'`);
await val(`select public.restaurer($1)`, [audS]);
verif(await nb(`select count(*) n from public.vente_lignes where vente_id = '${id(1, 9)}'`) === 1, "restaurer une vente : elle revient avec ses lignes");
// Dépense.
await db.query(`delete from public.depenses where id = '${id(1, 11)}'`);
const audD = (await val(`select id from public.journal_audit where table_nom = 'depenses' and operation = 'DELETE'`)).id;
await val(`select public.restaurer($1)`, [audD]);
verif(await nb(`select count(*) n from public.depenses where id = '${id(1, 11)}'`) === 1, "restaurer une dépense");
// Autre table : pas de restauration.
await db.query(`delete from public.taches where id = '${id(1, 12)}'`);
const audT = (await val(`select id from public.journal_audit where table_nom = 'taches'`)).id;
e = await erreur(db, `select public.restaurer($1)`, [audT]);
verif(e && /Seules les visites/.test(e.message), "restaurer : seulement visites, ventes et dépenses (les autres restent consultables)");
// Visite dont la ruche a disparu.
await db.query(`delete from public.ruches where id = '${id(1, 3)}'`);
const audV2 = (await val(`select id from public.journal_audit where table_nom = 'visites' and restaure_le is null and operation = 'DELETE'`)).id;
e = await erreur(db, `select public.restaurer($1)`, [audV2]);
verif(e && /n'existe plus/.test(e.message), `restaurer une visite dont la ruche est supprimée : « ${e?.message} »`);

// Modifications : gardées, sauf un simple changement de stock.
const avantModif = await nb(`select count(*) n from public.journal_audit where operation = 'UPDATE'`);
await db.query(`update public.clients set nom = 'Client renommé' where id = '${id(1, 8)}'`);
await db.query(`update public.articles set stock = stock + 5 where id = '${id(1, 2)}'`);
await db.query(`update public.clients set nom = nom where id = '${id(1, 8)}'`);
const modifs = (await db.query(`select * from public.journal_audit where operation = 'UPDATE' order by id`)).rows.slice(avantModif);
verif(modifs.length === 1 && modifs[0].avant.nom === "Client 1", "audit : une modification garde l'ancienne valeur ; stock seul ou rien de changé : pas de trace");
// Personne n'écrit dans le journal par l'API.
e = await erreur(db, `insert into public.journal_audit (exploitation_id, table_nom, operation, avant) values ('${E1}', 'x', 'DELETE', '{}')`);
verif(!!e, "audit : aucune écriture directe par l'API");
const sup = await db.query(`delete from public.journal_audit`).catch((x) => ({ erreur: x }));
verif(!!sup.erreur || sup.affectedRows === 0, "audit : aucune suppression par l'API");
await db.exec("reset role");
verif(await nb(`select count(*) n from public.journal_audit`) > 5, "… le journal est intact");
// Purge à 1 an.
await db.exec(`update public.journal_audit set cree_le = now() - interval '13 months' where table_nom = 'taches'`);
await en(db, "a@x.fr", E1);
await db.query(`update public.clients set nom = 'Encore' where id = '${id(1, 8)}'`);
await db.exec("reset role");
verif(await nb(`select count(*) n from public.journal_audit where table_nom = 'taches'`) === 0, "audit : les lignes de plus d'un an sont purgées");
// Suppression d'une exploitation : pas de blocage, ménage du journal.
await db.exec(`delete from public.exploitations where id = '${E2}'`);
verif(await nb(`select count(*) n from public.journal_audit where exploitation_id = '${E2}'`) === 0 && await nb(`select count(*) n from public.ruches where exploitation_id = '${E2}'`) === 0,
  "suppression d'une exploitation : possible, et son journal d'audit part avec elle");

// --- Démonstration (AP-FEAT-018) ---
await en(db, "demo@x.fr");
const demo = (await val(`select public.creer_exploitation_demo('Démo') e`)).e;
await db.exec("reset role");
verif((await val(`select demo from public.exploitations where id = $1`, [demo])).demo === true, "creer_exploitation_demo : exploitation marquée demo = true");
await db.exec(`insert into public.ruches (nom, exploitation_id) values ('Démo 1', '${demo}'), ('Démo 2', '${demo}')`);
const ind = await val(`select * from public.indicateurs_usage()`);
verif(Number(ind.exploitations) === 1 && Number(ind.colonies) === await nb(`select count(*) n from public.ruches where exploitation_id = '${E1}'`),
  "indicateurs_usage : aucune ligne de démo comptée");
await en(db, "a@x.fr", E1);
e = await erreur(db, `update public.exploitations set demo = true where id = '${E1}'`);
verif(!!e, "un responsable ne peut pas marquer son exploitation en démo par l'API");
for (const f of ["incoherences_exploitation", "indicateurs_usage", "rattachements"]) {
  e = await erreur(db, `select * from public.${f}()`);
  verif(!!e, `${f} : non exécutable par l'API`);
}

// --- Empreinte de structure (AP-TECH-042) ---
await en(db, null);
const emp1 = (await val(`select public.empreinte_structure() e`)).e;
verif(emp1 && Object.keys(emp1).length === 6 && Object.values(emp1).every((x) => /^[0-9a-f]{32}$/.test(x)), "empreinte_structure : lisible sans connexion, 6 empreintes md5");
const db1 = await base();
verif(JSON.stringify((await db1.query(`select public.empreinte_structure() e`)).rows[0].e) === JSON.stringify(emp1), "empreinte_structure : identique avec ou sans relance des migrations");

// --- Données incohérentes avant 014 : la migration passe, la contrainte reste non validée et la détection les montre. ---
const sale = await base({ jusqua: "013-noyau-resume-et-journal.sql" });
await deuxExploitations(sale, { lecteur: false });
await donnees(sale);
await sale.exec(`update public.taches set ruche_id = '${id(2, 3)}' where id = '${id(1, 12)}'`);
let avert = [];
try { await sale.exec(fs.readFileSync("migrations/014-roles-audit.sql", "utf8")); } catch (x) { avert = [x.message]; }
verif(avert.length === 0, "014 passe sur une base qui a déjà un rattachement croisé" + (avert[0] ? " : " + avert[0] : ""));
const c = (await sale.query(`select convalidated from pg_constraint where conname = 'taches_ruche_id_meme_exploitation'`)).rows[0];
verif(c && c.convalidated === false, "… la contrainte de ce rattachement reste « non validée »");
const okAutres = (await sale.query(`select count(*) n from pg_constraint where conname like '%_meme_exploitation' and convalidated`)).rows[0].n;
verif(Number(okAutres) === 13, "… les 13 autres sont validées");
const d = (await sale.query(`select * from public.incoherences_exploitation() where nombre > 0`)).rows;
verif(d.length === 1 && d[0].enfant === "taches" && Number(d[0].nombre) === 1, "… et incoherences_exploitation() la signale");

fin("Migration 014");
