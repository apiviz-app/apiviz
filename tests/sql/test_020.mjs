// Tests SQL de la migration 020 : visite express (champs observés, durée) et règlements entre associés.
// Usage (depuis la racine du dépôt) : node tests/sql/test_020.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "019-reines-liens.sql" });
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const avant = await val(`select count(*)::int n from public.visites`);

const sql = fs.readFileSync("migrations/020-visite-express-reglements.sql", "utf8");
try { await db.exec(sql); verif(true, "020 appliquée sur une base avec données"); }
catch (e) { verif(false, "020 : " + e.message); fin("Migration 020"); }
try { await db.exec(sql); verif(true, "020 relançable"); }
catch (e) { verif(false, "020 relancée : " + e.message); }

const v0 = await val(`select count(*)::int n, count(observes)::int o, count(duree_s)::int d from public.visites`);
verif(v0.n === avant.n && v0.o === 0 && v0.d === 0, "visites existantes : inchangées, observes et duree_s vides (visites complètes)");

// Visite express : seuls les champs touchés sont observés ; la durée est gardée.
await en(db, "a@x.fr", E1);
const vx = "2a000020-0000-4000-8000-000000000001";
await db.query(`select public.creer_visite($1::jsonb)`, [JSON.stringify({ id: vx, ruche_id: id(1, 3), activite: "Normale", provisions: "Bonnes",
  reine: "Non cherchée", couvain: "Normal", poids_kg: 15.2, observes: ["poids_kg"], duree_s: 12, intrants: [] })]);
const x = await val(`select observes, duree_s, poids_kg::float p, auteur from public.visites where id = $1`, [vx]);
verif(JSON.stringify(x?.observes) === '["poids_kg"]' && x?.duree_s === 12 && x?.p === 15.2 && x?.auteur === "a@x.fr", `visite express : poids observé, 12 s (${JSON.stringify(x)})`);

// Visite express sans rien de changé : liste vide, pas null.
const vy = "2a000020-0000-4000-8000-000000000002";
await db.query(`select public.creer_visite($1::jsonb)`, [JSON.stringify({ id: vy, ruche_id: id(1, 3), activite: "Normale", provisions: "Bonnes", reine: "Non cherchée", observes: [] })]);
verif(JSON.stringify((await val(`select observes from public.visites where id = $1`, [vy]))?.observes) === "[]", "visite express sans changement : liste vide (rien d'observé), pas « complète »");

// Ancienne version : pas d'observes ni de durée, la visite passe et reste « complète ».
const vz = "2a000020-0000-4000-8000-000000000003";
await db.query(`select public.creer_visite($1::jsonb)`, [JSON.stringify({ id: vz, ruche_id: id(1, 3), activite: "Forte", provisions: "Moyennes", reine: "Vue" })]);
const z = await val(`select observes, duree_s from public.visites where id = $1`, [vz]);
verif(z && z.observes === null && z.duree_s === null, "ancienne version : visite acceptée, observes et duree_s vides");

// Une durée négative envoyée par erreur n'est pas gardée négative.
const vn = "2a000020-0000-4000-8000-000000000004";
await db.query(`select public.creer_visite($1::jsonb)`, [JSON.stringify({ id: vn, ruche_id: id(1, 3), activite: "Forte", provisions: "Moyennes", reine: "Vue", duree_s: -5 })]);
verif((await val(`select duree_s from public.visites where id = $1`, [vn]))?.duree_s === 0, "durée négative ramenée à 0");

// Idempotence : même identifiant renvoyé par la file hors ligne, pas de doublon.
await db.query(`select public.creer_visite($1::jsonb)`, [JSON.stringify({ id: vx, ruche_id: id(1, 3), activite: "Forte", provisions: "Faibles", reine: "Vue", observes: [] })]);
const dbl = await val(`select count(*)::int n, max(activite) a from public.visites where id = $1`, [vx]);
verif(dbl.n === 1 && dbl.a === "Normale", "visite renvoyée : pas de doublon, rien de changé");

// Lecteur : refusé.
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.creer_visite($1::jsonb)`, [JSON.stringify({ ruche_id: id(1, 3), activite: "Forte", provisions: "Moyennes", reine: "Vue", observes: [] })])), "lecteur : visite express refusée");

// Règlements entre associés : écriture directe, rattachés à l'exploitation, contrôles.
await en(db, "a2@x.fr", E1);
const r1 = "2a000020-0000-4000-8000-000000000010";
await db.query(`insert into public.reglements_associes (id, de, a, montant, note) values ($1, 'Johan', 'Pierre-Louis', 54, 'Virement')`, [r1]);
const r = await val(`select de, a, montant::float m, exploitation_id, auteur, date_reglement = current_date aujourdhui from public.reglements_associes where id = $1`, [r1]);
verif(r?.de === "Johan" && r?.a === "Pierre-Louis" && r?.m === 54 && r?.exploitation_id === E1 && r?.auteur === "a2@x.fr" && r?.aujourdhui,
  `règlement : Johan → Pierre-Louis 54 €, exploitation A, saisi par a2@x.fr, daté du jour (${JSON.stringify(r)})`);
await db.query(`insert into public.reglements_associes (de, a, montant) values ('Johan', 'Société', 56)`);
verif((await val(`select count(*)::int n from public.reglements_associes where a = 'Société'`)).n === 1, "versement à la trésorerie de la société accepté");
verif(!!(await erreur(db, `insert into public.reglements_associes (de, a, montant) values ('Johan', 'Pierre-Louis', 0)`)), "montant nul refusé");
verif(!!(await erreur(db, `insert into public.reglements_associes (de, a, montant) values ('Johan', 'Pierre-Louis', -3)`)), "montant négatif refusé");
verif(!!(await erreur(db, `insert into public.reglements_associes (de, a, montant) values ('Johan', ' johan ', 5)`)), "règlement de quelqu'un à lui-même refusé");
verif(!!(await erreur(db, `insert into public.reglements_associes (de, a, montant) values ('', 'Johan', 5)`)), "règlement sans nom refusé");

// Lecteur : lit, n'écrit pas.
await en(db, "l@x.fr", E1);
verif((await val(`select count(*)::int n from public.reglements_associes`)).n === 2, "lecteur : voit les 2 règlements de A");
verif(!!(await erreur(db, `insert into public.reglements_associes (de, a, montant) values ('Johan', 'Pierre-Louis', 5)`)), "lecteur : ajout refusé");

// Isolation entre exploitations.
await en(db, "b@x.fr", E2);
verif((await val(`select count(*)::int n from public.reglements_associes`)).n === 0, "B ne voit aucun règlement de A");
verif(!!(await erreur(db, `insert into public.reglements_associes (de, a, montant, exploitation_id) values ('X', 'Y', 5, '${E1}')`)), "B ne peut pas écrire dans A");
await db.query(`update public.reglements_associes set montant = 1 where id = $1`, [r1]);
await db.query(`delete from public.reglements_associes where id = $1`, [r1]);
await en(db, "a@x.fr", E1);
verif((await val(`select montant::float m from public.reglements_associes where id = $1`, [r1]))?.m === 54, "B ne peut ni modifier ni supprimer un règlement de A");

// Audit : une suppression par A est tracée.
await db.query(`delete from public.reglements_associes where id = $1`, [r1]);
await db.exec("reset role");
verif((await val(`select count(*)::int n from public.journal_audit where table_nom = 'reglements_associes'`)).n === 1, "suppression d'un règlement tracée au journal d'audit");

fin("Migration 020");
