// Tests SQL de la migration 029 : fil de l'équipe (messages, demandes, prise en charge).
// Usage (depuis la racine du dépôt) : node tests/sql/test_029.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "028-assemblage-ruches.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/029-fil-equipe.sql", "utf8");
try { await db.exec(sql); verif(true, "029 appliquée sur une base avec données"); } catch (e) { verif(false, "029 : " + e.message); fin("Migration 029"); }
try { await db.exec(sql); verif(true, "029 relançable"); } catch (e) { verif(false, "029 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const R1 = id(1, 3);
const M1 = "dddddddd-0000-4000-8000-000000000001", M2 = "dddddddd-0000-4000-8000-000000000002", T1 = "eeeeeeee-0000-4000-8000-000000000001";

// Un membre écrit une demande au responsable, sur une ruche.
await en(db, "a2@x.fr", E1);
verif(!(await erreur(db, `insert into public.messages (id, texte, ruche_id, pour) values ('${M1}', '@Pierre-Louis tu peux peser Ruche A ?', '${R1}', 'a@x.fr')`)), "membre : écrit une demande");
const m = await val(`select auteur, exploitation_id from public.messages where id = '${M1}'`);
verif(m && m.auteur === "a2@x.fr" && m.exploitation_id === E1, "auteur et exploitation remplis d'office");
verif(!!(await erreur(db, `insert into public.messages (texte, auteur) values ('se faire passer pour un autre', 'a@x.fr')`)), "écrire au nom d'un autre : refusé");
verif(!!(await erreur(db, `insert into public.messages (texte) values ('   ')`)), "message vide : refusé");

// Le lecteur lit mais n'écrit pas ; l'autre exploitation ne voit rien ; anonyme non plus.
await en(db, "l@x.fr", E1);
verif((await db.query(`select id from public.messages`)).rows.length === 1, "lecteur : lit le fil");
verif(!!(await erreur(db, `insert into public.messages (texte) values ('bonjour')`)), "lecteur : n'écrit pas");
verif(!!(await erreur(db, `select public.prendre_demande('${M1}', '{"titre": "Peser"}'::jsonb)`)), "lecteur : ne prend pas de demande");
await en(db, "b@x.fr", E2);
verif((await db.query(`select id from public.messages`)).rows.length === 0, "autre exploitation : ne voit pas le fil");
verif(!!(await erreur(db, `select public.prendre_demande('${M1}', '{"titre": "Peser"}'::jsonb)`)), "autre exploitation : ne prend pas la demande");
await en(db, null, null);
verif(!!(await erreur(db, `select * from public.messages`)), "anonyme : aucune lecture");

// Le responsable prend la demande : la tâche est créée, sur la ruche, et reliée.
await en(db, "a@x.fr", E1);
const t = (await val(`select public.prendre_demande('${M1}', '{"id": "${T1}", "titre": "Peser Ruche A", "assigne": "Pierre-Louis", "echeance": "2026-11-21"}'::jsonb) t`)).t;
const tache = await val(`select titre, ruche_id, assigne, echeance::text, exploitation_id from public.taches where id = '${T1}'`);
verif(t === T1 && tache && tache.ruche_id === R1 && tache.assigne === "Pierre-Louis" && tache.echeance === "2026-11-21" && tache.exploitation_id === E1, "prise en charge : tâche créée sur la ruche, pour Pierre-Louis");
const m2 = await val(`select tache_id, pris_par from public.messages where id = '${M1}'`);
verif(m2.tache_id === T1 && m2.pris_par === "a@x.fr", "la demande garde sa tâche et qui l'a prise");
verif((await val(`select public.prendre_demande('${M1}', '{"titre": "Encore"}'::jsonb) t`)).t === T1, "reprendre : même tâche, rien de plus");
verif((await val(`select count(*)::int n from public.taches where titre = 'Encore'`)).n === 0, "pas de tâche en double");

// Réponse ; seul l'auteur supprime son message ; la réponse part avec son message.
verif(!(await erreur(db, `insert into public.messages (id, texte, parent_id) values ('${M2}', 'Je passe samedi', '${M1}')`)), "réponse à une demande");
await db.exec(`delete from public.messages where id = '${M1}'`);
verif((await db.query(`select id from public.messages`)).rows.length === 2, "supprimer le message d'un autre : sans effet");
await en(db, "a2@x.fr", E1);
await db.exec(`delete from public.messages where id = '${M1}'`);
verif((await db.query(`select id from public.messages`)).rows.length === 0, "l'auteur supprime sa demande, la réponse part avec");
verif((await val(`select count(*)::int n from public.taches where id = '${T1}'`)).n === 1, "la tâche reste");

// Une ruche supprimée ne supprime pas la note.
await db.exec(`insert into public.messages (texte, ruche_id) values ('Reine vue', '${id(1, 13)}')`);
await db.exec("reset role");
await db.exec(`delete from public.ruches where id = '${id(1, 13)}'`);
verif((await val(`select count(*)::int n from public.messages where texte = 'Reine vue' and ruche_id is null`)).n === 1, "ruche supprimée : la note reste, sans ruche");
fin("Migration 029");
