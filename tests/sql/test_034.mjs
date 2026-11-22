// Tests SQL de la migration 034 : ordre de pose, code court des QR, actions groupées, étiquettes imprimées.
// Usage (depuis la racine du dépôt) : node tests/sql/test_034.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "033-clients-gouts.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/034-tournee-qr-groupe.sql", "utf8");
try { await db.exec(sql); verif(true, "034 appliquée sur une base avec données"); } catch (e) { verif(false, "034 : " + e.message); fin("Migration 034"); }
try { await db.exec(sql); verif(true, "034 relançable"); } catch (e) { verif(false, "034 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const lignes = async (q) => (await db.query(q)).rows;
const R1 = id(1, 3), R1b = id(1, 13), R2 = id(2, 3);
const A = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const appel = (f, p) => `select public.${f}('${JSON.stringify(p).replace(/'/g, "''")}'::jsonb) as n`;

// Colonies existantes : un code court chacune, au bon format, sans doublon dans l'exploitation.
await db.exec("reset role");
const codes = await lignes(`select id, code_qr, ordre_pose, etiquette_imprimee_le from public.ruches order by id`);
verif(codes.length === 4 && codes.every((r) => /^[2-9A-HJKMNP-Z]{4}$/.test(r.code_qr)), `reprise : 4 colonies, 4 codes courts (${codes.map((r) => r.code_qr).join(", ")})`);
verif(codes.every((r) => r.ordre_pose === null && r.etiquette_imprimee_le === null), "reprise : ordre de pose et impression vides");
const avant = codes.map((r) => r.code_qr).join();
await db.exec(sql);
verif((await lignes(`select code_qr from public.ruches order by id`)).map((r) => r.code_qr).join() === avant, "relance : les codes donnés ne changent pas");

// Nouvelle colonie (ancienne version comprise) : le code est donné tout seul ; un code saisi en minuscules passe en capitales.
await en(db, "a2@x.fr", E1);
verif(!(await erreur(db, `insert into public.ruches (nom) values ('Ancienne version')`)), "ancienne version : insertion sans les nouvelles colonnes");
const nv = await val(`select code_qr from public.ruches where nom = 'Ancienne version'`);
verif(/^[2-9A-HJKMNP-Z]{4}$/.test(nv?.code_qr || ""), `nouvelle colonie : code ${nv?.code_qr}`);
verif(!(await erreur(db, `insert into public.ruches (nom, code_qr) values ('Saisie', 'zz99')`)), "code saisi accepté");
verif((await val(`select code_qr from public.ruches where nom = 'Saisie'`)).code_qr === "ZZ99", "code saisi mis en capitales");
verif(!!(await erreur(db, `insert into public.ruches (nom, code_qr) values ('Doublon', 'ZZ99')`)), "même code dans l'exploitation : refusé");
verif(!!(await erreur(db, `insert into public.ruches (nom, code_qr) values ('Ambigu', 'K0O1')`)), "code avec 0, O ou 1 : refusé");
await en(db, "b@x.fr", E2);
verif(!(await erreur(db, `insert into public.ruches (nom, code_qr) values ('Ailleurs', 'ZZ99')`)), "même code dans une autre exploitation : accepté");

// Action groupée : +1 hausse sur les deux colonies de A.
await en(db, "a2@x.fr", E1);
const h0 = await lignes(`select id, hausses from public.ruches where id in ('${R1}', '${R1b}') order by id`);
const p1 = { id: A(1), action: "hausse", ruches: [R1, R1b], valeur: { delta: 1 } };
verif((await val(appel("appliquer_action_groupee", p1))).n === 2, "+1 hausse : 2 colonies touchées");
const h1 = await lignes(`select id, hausses from public.ruches where id in ('${R1}', '${R1b}') order by id`);
verif(h1.every((r, i) => r.hausses === h0[i].hausses + 1), "+1 hausse : chacune a une hausse de plus");
verif((await val(appel("appliquer_action_groupee", p1))).n === 2, "même action rejouée par la file d'envoi : rend 2");
verif((await lignes(`select hausses from public.ruches where id in ('${R1}', '${R1b}') order by id`)).every((r, i) => r.hausses === h1[i].hausses), "rejouée : rien n'est compté deux fois");
verif((await val(`select count(*)::int n from public.actions_groupees`)).n === 1, "journal : une seule ligne");
verif(!(await erreur(db, appel("appliquer_action_groupee", { id: A(2), action: "hausse", ruches: [R1], valeur: { delta: -5 } }))), "retrait de hausses : accepté");
verif((await val(`select hausses from public.ruches where id = '${R1}'`)).hausses === 0, "hausses jamais sous zéro");

// État et tâche.
verif((await val(appel("appliquer_action_groupee", { id: A(3), action: "etat", ruches: [R1, R1b], valeur: { etat: "À surveiller" } }))).n === 2, "état groupé : 2 colonies");
verif((await lignes(`select etat from public.ruches where id in ('${R1}', '${R1b}')`)).every((r) => r.etat === "À surveiller"), "état groupé : appliqué");
verif((await val(appel("appliquer_action_groupee", { id: A(4), action: "tache", ruches: [R1, R1b], valeur: { titre: "Poser la grille", echeance: "2026-12-01" } }))).n === 2, "tâche groupée : 2 colonies");
const t = await lignes(`select ruche_id, echeance::text, exploitation_id from public.taches where titre = 'Poser la grille' order by ruche_id`);
verif(t.length === 2 && t.every((x) => x.echeance === "2026-12-01" && x.exploitation_id === E1), "tâche groupée : une tâche par colonie, dans l'exploitation");

// Refus, avec un message en français.
const msg = async (q) => (await erreur(db, q)) || "";
verif(/pas dans ton exploitation/.test(await msg(appel("appliquer_action_groupee", { id: A(5), action: "hausse", ruches: [R1, R2] }))), "colonie d'une autre exploitation : refusé");
verif((await val(`select count(*)::int n from public.actions_groupees where id = '${A(5)}'`)).n === 0, "refusé : rien de journalisé");
verif(/au moins une colonie/.test(await msg(appel("appliquer_action_groupee", { id: A(6), action: "hausse", ruches: [] }))), "aucune colonie : refusé");
verif(/Choisis un état/.test(await msg(appel("appliquer_action_groupee", { id: A(7), action: "etat", ruches: [R1], valeur: { etat: "Parfaite" } }))), "état inconnu : refusé");
verif(/Indique la tâche/.test(await msg(appel("appliquer_action_groupee", { id: A(8), action: "tache", ruches: [R1], valeur: { titre: " " } }))), "tâche vide : refusé");
verif(/Action inconnue/.test(await msg(appel("appliquer_action_groupee", { id: A(9), action: "nourrir", ruches: [R1] }))), "action inconnue : refusé");
verif(/Identifiant/.test(await msg(appel("appliquer_action_groupee", { action: "hausse", ruches: [R1] }))), "sans identifiant : refusé");
verif(/introuvable/.test(await msg(appel("appliquer_action_groupee", { id: A(10), action: "hausse", ruches: ["pas-un-uuid"] }))), "identifiant de colonie mal formé : refusé");

// Ordre de pose.
verif((await val(appel("ranger_ruches", { ruches: [R1b, R1] }))).n === 2, "ordre de pose : 2 colonies rangées");
const o = await lignes(`select id, ordre_pose from public.ruches where id in ('${R1}', '${R1b}') order by ordre_pose`);
verif(o[0].id === R1b && o[0].ordre_pose === 1 && o[1].id === R1 && o[1].ordre_pose === 2, "ordre de pose : 1 puis 2, dans l'ordre donné");
verif(/deux fois/.test(await msg(appel("ranger_ruches", { ruches: [R1, R1] }))), "ordre de pose : doublon refusé");
verif(/pas dans ton exploitation/.test(await msg(appel("ranger_ruches", { ruches: [R1, R2] }))), "ordre de pose : colonie d'ailleurs refusée");

// Étiquettes imprimées.
verif((await val(appel("noter_etiquettes", { ruches: [R1], date: "2026-11-22" }))).n === 1, "étiquette notée");
verif((await val(`select etiquette_imprimee_le::text d from public.ruches where id = '${R1}'`)).d === "2026-11-22", "date d'impression enregistrée");

// Lecteur : rien ne s'écrit.
await en(db, "l@x.fr", E1);
verif(/lecture seule/.test(await msg(appel("appliquer_action_groupee", { id: A(11), action: "hausse", ruches: [R1] }))), "lecteur : action groupée refusée");
verif(/lecture seule/.test(await msg(appel("ranger_ruches", { ruches: [R1] }))), "lecteur : ordre de pose refusé");
verif(/lecture seule/.test(await msg(appel("noter_etiquettes", { ruches: [R1] }))), "lecteur : étiquettes refusées");
verif((await val(`select count(*)::int n from public.actions_groupees`)).n >= 1, "lecteur : voit le journal");
verif(!!(await erreur(db, `insert into public.actions_groupees (id, action, ruches) values ('${A(12)}', 'hausse', array['${R1}']::uuid[])`)), "lecteur : ne peut pas écrire le journal");

// Autre exploitation : ne voit ni ne touche rien de A.
await en(db, "b@x.fr", E2);
verif((await val(`select count(*)::int n from public.actions_groupees`)).n === 0, "autre exploitation : ne voit pas le journal de A");
verif(/pas dans ton exploitation/.test(await msg(appel("appliquer_action_groupee", { id: A(13), action: "etat", ruches: [R1], valeur: { etat: "Critique" } }))), "autre exploitation : ne touche pas les colonies de A");
verif(/pas dans ton exploitation/.test(await msg(appel("noter_etiquettes", { ruches: [R1] }))), "autre exploitation : étiquettes de A refusées");
await en(db, "a@x.fr", E1);
verif((await val(`select etat from public.ruches where id = '${R1}'`)).etat === "À surveiller", "colonie de A intacte");
// Journal : ni modification ni suppression.
await db.exec(`update public.actions_groupees set action = 'etat'`).catch(() => {});
await db.exec(`delete from public.actions_groupees`).catch(() => {});
verif((await val(`select count(*)::int n from public.actions_groupees where action = 'hausse'`)).n === 2, "journal : ni modifié ni supprimé");
fin("Migration 034");
