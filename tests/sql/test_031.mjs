// Tests SQL de la migration 031 : historique des échanges avec API (chacun ne voit que les siens).
// Usage (depuis la racine du dépôt) : node tests/sql/test_031.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "030-fil-equipe.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/031-echanges-api.sql", "utf8");
try { await db.exec(sql); verif(true, "031 appliquée sur une base avec données"); } catch (e) { verif(false, "031 : " + e.message); fin("Migration 031"); }
try { await db.exec(sql); verif(true, "031 relançable"); } catch (e) { verif(false, "031 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const nb = async () => (await val(`select count(*)::int n from public.api_echanges`)).n;
const C1 = "cccccccc-0000-4000-8000-000000000001", X1 = "abababab-0000-4000-8000-000000000001", X2 = "abababab-0000-4000-8000-000000000002";
const R1 = id(1, 3);
const rep = `'{"resume": "Pèse Ruche A.", "recommandations": [{"texte": "Pèse-la avant samedi."}]}'::jsonb`;

// Le responsable garde son échange, sur une ruche.
await en(db, "a@x.fr", E1);
verif(!(await erreur(db, `insert into public.api_echanges (id, conversation_id, ruche_id, question, reponse, mode, cout) values ('${X1}', '${C1}', '${R1}', 'Pourquoi Ruche A perd du poids ?', ${rep}, 'rapide', 0.6)`)), "responsable : garde son échange");
const x = await val(`select auteur, exploitation_id, conseils_suivis::text s from public.api_echanges where id = '${X1}'`);
verif(x && x.auteur === "a@x.fr" && x.exploitation_id === E1 && x.s === "[]", "auteur, exploitation et conseils suivis remplis d'office");
verif(!!(await erreur(db, `insert into public.api_echanges (conversation_id, question, reponse, auteur) values ('${C1}', 'q', ${rep}, 'a2@x.fr')`)), "écrire au nom d'un autre : refusé");
verif(!!(await erreur(db, `insert into public.api_echanges (conversation_id, question, reponse) values ('${C1}', '  ', ${rep})`)), "question vide : refusée");
verif(!!(await erreur(db, `insert into public.api_echanges (conversation_id, question, reponse) values ('${C1}', 'q', '[]'::jsonb)`)), "réponse qui n'est pas un objet : refusée");
verif(!!(await erreur(db, `insert into public.api_echanges (conversation_id, question, reponse, mode) values ('${C1}', 'q', ${rep}, 'turbo')`)), "mode inconnu : refusé");
verif(!(await erreur(db, `update public.api_echanges set conseils_suivis = '[0]' where id = '${X1}'`)), "conseil transformé en tâche : noté");

// Un autre membre de la même exploitation ne voit pas l'historique du responsable ; il garde le sien.
await en(db, "a2@x.fr", E1);
verif((await nb()) === 0, "membre : ne voit pas les échanges du responsable");
await db.exec(`update public.api_echanges set question = 'piraté' where id = '${X1}'`);
await db.exec(`delete from public.api_echanges where id = '${X1}'`);
verif(!(await erreur(db, `insert into public.api_echanges (id, conversation_id, question, reponse) values ('${X2}', '${C1}', 'Combien de pots ?', ${rep})`)), "membre : garde ses propres échanges");
verif((await nb()) === 1, "membre : voit seulement le sien");

// Le lecteur garde aussi son historique ; l'autre exploitation et l'anonyme ne voient rien.
await en(db, "l@x.fr", E1);
verif(!(await erreur(db, `insert into public.api_echanges (conversation_id, question, reponse) values ('${C1}', 'Question de lecteur', ${rep})`)), "lecteur : garde son historique (API ne modifie rien)");
await en(db, "b@x.fr", E2);
verif((await nb()) === 0, "autre exploitation : rien");
await en(db, null, null);
verif(!!(await erreur(db, `select * from public.api_echanges`)), "anonyme : aucune lecture");

// Le responsable retrouve son échange intact, puis l'efface vraiment.
await en(db, "a@x.fr", E1);
const y = await val(`select question, conseils_suivis::text s from public.api_echanges where id = '${X1}'`);
verif(y && y.question === "Pourquoi Ruche A perd du poids ?" && y.s === "[0]", "les autres n'ont rien modifié ni effacé");
await db.exec(`delete from public.api_echanges where conversation_id = '${C1}'`);
verif((await nb()) === 0, "effacer la conversation : ses échanges partent");
await db.exec("reset role");
verif((await val(`select count(*)::int n from public.api_echanges where id = '${X2}'`)).n === 1, "les échanges du membre restent");

// Une ruche supprimée ne supprime pas l'échange.
await db.exec(`insert into public.api_echanges (exploitation_id, auteur, conversation_id, ruche_id, question, reponse) values ('${E1}', 'a@x.fr', '${C1}', '${id(1, 13)}', 'Et Ruche B ?', ${rep})`);
await db.exec(`delete from public.ruches where id = '${id(1, 13)}'`);
verif((await val(`select count(*)::int n from public.api_echanges where question = 'Et Ruche B ?' and ruche_id is null`)).n === 1, "ruche supprimée : l'échange reste, sans ruche");
fin("Migration 031");
