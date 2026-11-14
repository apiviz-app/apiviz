// Tests SQL de la migration 021 : profils (propre ligne seulement), noms des membres, statistiques d'ensemble,
// étiquettes des clients. Usage (depuis la racine du dépôt) : node tests/sql/test_021.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "020-visite-express-reglements.sql" });
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const lignes = async (q, p) => (await db.query(q, p)).rows;
await db.exec("reset role");
const clientsAvant = await lignes(`select id, cercle from public.clients order by id`);

const sql = fs.readFileSync("migrations/021-profils-etiquettes.sql", "utf8");
try { await db.exec(sql); verif(true, "021 appliquée sur une base avec données"); }
catch (e) { verif(false, "021 : " + e.message); fin("Migration 021"); }
try { await db.exec(sql); verif(true, "021 relançable"); }
catch (e) { verif(false, "021 relancée : " + e.message); }

// Étiquettes : chaque client existant reçoit son cercle.
await db.exec("reset role");
const cl = await lignes(`select id, cercle, etiquettes from public.clients order by id`);
verif(cl.length === clientsAvant.length && cl.length > 0 && cl.every((c) => (c.cercle ? JSON.stringify(c.etiquettes) === JSON.stringify([c.cercle]) : c.etiquettes.length === 0)),
  `clients existants : le cercle devient la première étiquette (${cl.length})`);

// Profil : chacun écrit et lit sa ligne ; le département se déduit du code postal.
await en(db, "a@x.fr", E1);
await db.query(`insert into public.profils (email, prenom, nom, tranche_age, sexe, code_postal, source, plateforme) values ('a@x.fr', 'Pierre-Louis', 'G', '35-49', 'homme', '33750', 'syndicat', 'web')`);
const pa = await val(`select prenom, departement, stats_ok, newsletter from public.profils where email = 'a@x.fr'`);
verif(pa?.prenom === "Pierre-Louis" && pa?.departement === "33" && pa?.stats_ok === true && pa?.newsletter === false, `profil enregistré, Gironde déduite, statistiques oui, nouveautés non (${JSON.stringify(pa)})`);
await db.query(`update public.profils set code_postal = '20090' where email = 'a@x.fr'`);
verif((await val(`select departement d from public.profils where email = 'a@x.fr'`)).d === "2A", "Ajaccio : Corse-du-Sud (2A)");
await db.query(`update public.profils set code_postal = '97400' where email = 'a@x.fr'`);
verif((await val(`select departement d from public.profils where email = 'a@x.fr'`)).d === "974", "La Réunion : 974");
verif(!!(await erreur(db, `insert into public.profils (email, prenom) values ('b@x.fr', 'Usurpé')`)), "on ne crée pas le profil de quelqu'un d'autre");
verif(!!(await erreur(db, `update public.profils set sexe = 'licorne' where email = 'a@x.fr'`)), "réponse hors liste refusée");
verif(!!(await erreur(db, `update public.profils set code_postal = '3375' where email = 'a@x.fr'`)), "code postal mal formé refusé");

// Un associé ne lit pas le profil de l'autre, même dans la même exploitation.
await en(db, "a2@x.fr", E1);
await db.query(`insert into public.profils (email, prenom, nom, tranche_age) values ('a2@x.fr', 'Camille', 'Martin', '25-34')`);
verif((await val(`select count(*)::int n from public.profils`)).n === 1, "a2 ne voit que son profil (pas celui de a)");
const maj = await db.query(`update public.profils set prenom = 'X' where email = 'a@x.fr'`);
verif((maj.affectedRows ?? 0) === 0, "a2 ne peut pas modifier le profil de a");

// noms_membres : prénom, nom et rôle des membres de l'exploitation courante, rien d'autre.
const nm = await lignes(`select * from public.noms_membres()`);
verif(nm.length >= 2 && nm.some((x) => x.email === "a@x.fr" && x.prenom === "Pierre-Louis") && nm.some((x) => x.email === "a2@x.fr" && x.prenom === "Camille")
  && Object.keys(nm[0]).sort().join(",") === "email,nom,prenom,role", `noms des membres de A, sans les réponses du profil (${nm.length})`);
verif(!nm.some((x) => x.email === "b@x.fr"), "pas de membre de B");
await en(db, "a@x.fr", E2);
verif((await lignes(`select * from public.noms_membres()`)).length === 0, "en-tête d'une exploitation dont on n'est pas membre : aucun nom");
await en(db, null, E1);
verif(!!(await erreur(db, `select * from public.noms_membres()`)), "visiteur non connecté : refusé");

// Statistiques : fermées à l'application, groupes de moins de 5 masqués.
await en(db, "a@x.fr", E1);
verif(!!(await erreur(db, `select * from public.stats_profils`)), "stats_profils fermée à un compte de l'application");
await db.exec("reset role");
for (let i = 0; i < 5; i++) await db.query(`insert into public.profils (email, tranche_age, stats_ok) values ($1, '50-64', true)`, [`s${i}@x.fr`]);
await db.query(`insert into public.profils (email, tranche_age, stats_ok) values ('refus@x.fr', '50-64', false)`);
const st = await lignes(`select * from public.stats_profils where question = 'age'`);
verif(st.length === 1 && st[0].reponse === "50-64" && st[0].personnes === 5, `âge : seul le groupe de 5 apparaît, le refus n'est pas compté (${JSON.stringify(st)})`);

// Suppression de son profil.
await en(db, "a2@x.fr", E1);
await db.query(`delete from public.profils where email = 'a2@x.fr'`);
await db.exec("reset role");
verif((await val(`select count(*)::int n from public.profils where email = 'a2@x.fr'`)).n === 0, "chacun peut effacer son profil");

// Clients : l'application écrit des étiquettes.
await en(db, "a@x.fr", E1);
const c1 = cl[0].id;
await db.query(`update public.clients set etiquettes = '{Marché,Pro}' where id = $1`, [c1]);
verif(JSON.stringify((await val(`select etiquettes from public.clients where id = $1`, [c1])).etiquettes) === '["Marché","Pro"]', "étiquettes modifiables par un membre");
fin("Migration 021");
