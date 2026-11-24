// Tests SQL de la migration 041 : supprimer toutes mes données en 30 jours annulables (demande, choix par exploitation
// partagée, bandeau des autres membres, effacement par la fonction de service, suppression immédiate de 022).
// Usage (depuis la racine du dépôt) : node tests/sql/test_041.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "040-rappels-app-fermee.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/041-supprimer-mes-donnees.sql", "utf8");
try { await db.exec(sql); verif(true, "041 appliquée sur une base avec données"); } catch (e) { verif(false, "041 : " + e.message); fin("Migration 041"); }
try { await db.exec(sql); verif(true, "041 relançable"); } catch (e) { verif(false, "041 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const n = async (q) => (await val(`select count(*)::int as n from ${q}`)).n;
await db.exec(`reset role;
  insert into auth.users (id, email) values ('${id(9, 1)}', 'a2@x.fr'), ('${id(9, 2)}', 'a@x.fr');
  insert into public.profils (email, prenom) values ('a@x.fr', 'Anne'), ('a2@x.fr', 'Alex');
  select set_config('request.jwt.claims', '{"email":"a2@x.fr"}', false);
  update public.visites set auteur = 'a2@x.fr' where id = '${id(1, 4)}';
  insert into public.activite_jours (email) values ('a2@x.fr');
  insert into public.abonnements_push (email, endpoint, p256dh, auth) values ('a2@x.fr', 'https://push.example/a2', '${"B".repeat(30)}', '${"A".repeat(10)}');`);

// Aperçu complété : rôle et autres membres.
await en(db, "a2@x.fr", E1);
const ap = (await val("select public.compte_a_supprimer() as a")).a;
verif(ap.effacees.length === 0 && ap.quittees.length === 1 && ap.quittees[0].role === "membre" && ap.quittees[0].autres.includes("Anne"), "aperçu : exploitation partagée, rôle et autres membres : " + JSON.stringify(ap.quittees));

// Demande : confirmation, choix contrôlés.
verif(!!(await erreur(db, "select public.demander_suppression('{}', 'oui')")), "sans le mot SUPPRIMER : refusé");
verif(!!(await erreur(db, `select public.demander_suppression('{"${E1}": "tout"}', 'SUPPRIMER')`)), "membre : pas de « supprimer pour tous »");
verif(!!(await erreur(db, `select public.demander_suppression('{"${E2}": "laisser"}', 'SUPPRIMER')`)), "exploitation dont on n'est pas membre : refusé");
verif(!!(await erreur(db, `select public.demander_suppression('{"${E1}": "brûler"}', 'SUPPRIMER')`)), "choix inconnu : refusé");
const d = (await val(`select public.demander_suppression('{"${E1}": "laisser"}', 'SUPPRIMER') as d`)).d;
const jours = Math.round((Date.parse(d.effacement_le) - Date.now()) / 864e5);
verif(jours === 30, "demande : effacement dans 30 jours");
verif((await val("select public.ma_suppression() as m")).m.choix[E1] === "laisser", "ma_suppression : la demande et son choix");
verif(!!(await erreur(db, "insert into public.comptes_a_supprimer (email) values ('a@x.fr')")), "pas d'écriture directe");
await db.exec("select public.annuler_suppression()");
verif((await val("select public.ma_suppression() as m")).m === null, "annulée");
await db.exec(`select public.demander_suppression('{"${E1}": "laisser"}', 'SUPPRIMER')`);

// Responsable qui supprime pour tous : bandeau chez les autres.
await en(db, "a@x.fr", E1);
await db.exec(`select public.demander_suppression('{"${E1}": "tout"}', 'SUPPRIMER')`);
await en(db, "a2@x.fr", E1);
let ann = (await val("select public.suppressions_annoncees() as s")).s;
verif(ann.length === 1 && ann[0].nom === "Rucher A" && ann[0].par === "Anne", "bandeau : Anne supprime « Rucher A » pour tout le monde");
await en(db, "a@x.fr", E1);
verif((await val("select public.suppressions_annoncees() as s")).s.length === 0, "pas de bandeau pour soi");
await db.exec("select public.annuler_suppression()");

// Effacement : interne, pas pour l'application.
verif(!!(await erreur(db, "select public.effacer_compte('a2@x.fr', null, '{}')")), "effacer_compte : refusé à l'application");
verif(!!(await erreur(db, "select * from public.suppressions_dues()")), "suppressions_dues : refusé à l'application");
await db.exec("reset role; update public.comptes_a_supprimer set effacement_le = now() - interval '1 minute' where email = 'a2@x.fr'; set role service_role;");
const dues = (await db.query("select * from public.suppressions_dues()")).rows;
verif(dues.length === 1 && dues[0].email === "a2@x.fr" && dues[0].effacees.length === 0, "suppressions_dues : a2, rien à effacer (exploitation laissée)");
const fichiers = (await db.query(`select * from public.fichiers_exploitations(array['${E1}']::uuid[])`)).rows;
verif(fichiers.length === 1 && fichiers[0].name.startsWith(E1), "fichiers d'une exploitation : " + JSON.stringify(fichiers));
const r = (await val("select public.effacer_compte_du('a2@x.fr') as r")).r;
verif(r.quittees === 1 && r.effacees === 0, "effacement : exploitation quittée");
await db.exec("reset role");
verif(await n("public.membres where email = 'a2@x.fr'") === 0 && await n("public.profils where email = 'a2@x.fr'") === 0 && await n("auth.users where email = 'a2@x.fr'") === 0, "membre, profil, compte : effacés");
verif(await n("public.activite_jours where email = 'a2@x.fr'") === 0 && await n("public.abonnements_push where email = 'a2@x.fr'") === 0 && await n("public.comptes_a_supprimer") === 0, "jours, appareils, demande : effacés");
verif((await val(`select auteur from public.visites where id = '${id(1, 4)}'`)).auteur === "Ancien membre", "sa visite reste à l'exploitation, auteur « Ancien membre »");
verif(await n(`public.exploitations where id = '${E1}'`) === 1, "l'exploitation reste aux autres");

// Suppression immédiate (022) : passe par effacer_compte.
await en(db, "b@x.fr", E2);
const r2 = (await val("select public.supprimer_mon_compte('SUPPRIMER') as r")).r;
await db.exec("reset role");
verif(r2.effacees === 1 && await n(`public.exploitations where id = '${E2}'`) === 0, "022 : seule dans son exploitation, effacée avec ses données");
verif(await n(`public.ruches where exploitation_id = '${E2}'`) === 0, "cascade : colonies effacées");
fin("Migration 041");
