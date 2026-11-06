// Tests SQL de la migration 016 (IT-06) : reprise (sortie → statut, événements « deplacement » de 010, emplacement
// ouvert), registre identique avant/après, déplacement groupé atomique et idempotent, périodes sans chevauchement,
// rucher à une date, ancienne version (texte du rucher, sortie), statut, contenants, droits et isolation.
// Usage (depuis la racine du dépôt) : node tests/sql/test_016.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2, id } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "015-ruchers.sql" });
await deuxExploitations(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const lignes = async (q, p) => (await db.query(q, p)).rows;
const nb = async (q, p) => Number((await val(q, p)).n);
const U = (n) => `cccccccc-0000-4000-8000-${String(n).padStart(12, "0")}`;

// --- Jeu de reprise : comme une base qui a vécu avec la v5.10 à v5.19 ---
await db.exec(`reset role;
  insert into public.ruchers (id, nom, exploitation_id) values ('${U(1)}', 'Verger', '${E1}'), ('${U(2)}', 'Bois', '${E1}'),
    ('${U(3)}', 'Lande', '${E1}'), ('${U(4)}', 'Verger', '${E2}');
  insert into public.ruches (id, nom, rucher_id, date_installation, sortie, date_sortie, exploitation_id) values
    ('${id(1, 1)}', 'R1', '${U(1)}', '2025-04-01', '', null, '${E1}'),
    ('${id(1, 2)}', 'R2', '${U(2)}', '2025-04-01', '', null, '${E1}'),
    ('${id(1, 3)}', 'Morte', '${U(1)}', null, 'Morte', '2026-02-01', '${E1}'),
    ('${id(1, 4)}', 'Vendue', '${U(1)}', null, 'Vendue', '2026-03-01', '${E1}'),
    ('${id(1, 5)}', 'Réunie', '${U(1)}', null, 'Réunie', '2026-03-02', '${E1}'),
    ('${id(2, 1)}', 'B1', '${U(4)}', '2025-05-01', '', null, '${E2}');
  -- Déplacement noté par la v5.10 : R2 du Verger au Bois le 2026-06-01 (événement, puis texte du rucher).
  insert into public.ruche_evenements (ruche_id, type, date_evenement, detail, exploitation_id) values
    ('${id(1, 2)}', 'deplacement', '2026-06-01', 'Verger vers Bois, transhumance', '${E1}'),
    ('${id(1, 1)}', 'installation', '2025-04-01', '', '${E1}'),
    ('${id(1, 3)}', 'sortie', '2026-02-01', 'Morte', '${E1}');`);
const registre = async () => (await lignes(`select ruche_id, type, date_evenement::text d, detail from public.ruche_evenements
  where type in ('installation','division','essaimage','reunion','sortie','reactivation','deplacement') order by 1, 2, 3, 4`))
  .map((r) => Object.values(r).join("|")).join("\n");
const registreAvant = await registre();

try { await db.exec(fs.readFileSync("migrations/016-emplacements-contenants.sql", "utf8")); verif(true, "016 appliquée sur une base avec données"); }
catch (e) { verif(false, "016 : " + e.message); fin("Migration 016"); }

// Reprise sortie → statut (AP-TECH-107).
let r = await lignes(`select nom, statut from public.ruches order by nom`);
const st = Object.fromEntries(r.map((x) => [x.nom, x.statut]));
verif(st.R1 === "active" && st.Morte === "morte" && st.Vendue === "vendue" && st["Réunie"] === "reunie",
  "reprise : statut déduit de sortie (active, morte, vendue, réunie)");
verif(await nb(`select count(*) n from public.ruches where date_creation is null`) === 0, "reprise : date de création renseignée partout");

// Reprise des événements « deplacement » (AP-TECH-105) et registre identique.
r = await val(`select d.nb_colonies, d.notes, d.date_deplacement::text d from public.deplacements d`);
verif(r && r.nb_colonies === 1 && r.notes === "Verger vers Bois, transhumance" && r.d === "2026-06-01",
  "reprise : l'événement « deplacement » de la v5.10 devient un déplacement (date, texte gardé)");
verif(await nb(`select count(*) n from public.ruche_evenements where type = 'deplacement' and deplacement_id is null`) === 0,
  "reprise : chaque ligne « deplacement » du registre est reliée à son déplacement");
verif(await registre() === registreAvant, "registre des mouvements identique avant et après la migration (lignes, dates, textes)");

// Reprise des emplacements (AP-TECH-101).
r = await val(`select du::text, rucher_id from public.colonie_emplacements where colonie_id = $1 and au is null`, [id(1, 2)]);
verif(r?.du === "2026-06-01" && r.rucher_id === U(2), "reprise : R2 est au Bois depuis son déplacement noté (2026-06-01)");
r = await val(`select du::text from public.colonie_emplacements where colonie_id = $1 and au is null`, [id(1, 1)]);
verif(r?.du === "2025-04-01", "reprise : R1 est au Verger depuis sa date d'installation");
verif(await nb(`select count(*) n from public.ruches x where (select count(*) from public.colonie_emplacements e where e.colonie_id = x.id and e.au is null) <> 1`) === 0,
  "reprise : un et un seul emplacement ouvert par colonie");
verif(await nb(`select count(*) n from public.journal_audit`) === 0, "la reprise n'écrit rien dans le journal d'audit");

// Relance.
try {
  await db.exec(fs.readFileSync("migrations/016-emplacements-contenants.sql", "utf8"));
  verif(await nb(`select count(*) n from public.deplacements`) === 1 && await nb(`select count(*) n from public.colonie_emplacements`) === 6
    && await registre() === registreAvant, "016 relancée : rien en double, registre inchangé");
} catch (e) { verif(false, "016 relancée : " + e.message); }

// --- Rucher à une date (AP-US-032) ---
verif((await val(`select public.rucher_a_date($1, '2026-06-15') r`, [id(1, 2)])).r === U(2), "rucher_a_date : R2 au Bois le 15 juin");
verif((await val(`select public.rucher_a_date($1, '2026-05-15') r`, [id(1, 2)])).r === null, "rucher_a_date : avant son déplacement noté, inconnu (historique non reconstitué)");

// --- Chevauchement refusé (AP-TECH-100) ---
let e = await erreur(db, `insert into public.colonie_emplacements (colonie_id, rucher_id, du, au, exploitation_id) values ($1, $2, '2026-01-01', '2026-07-01', $3)`, [id(1, 2), U(1), E1]);
verif(/colonie_emplacements_sans_chevauchement/.test(e?.message || ""), "deux emplacements qui se chevauchent pour une colonie : refusés");
e = await erreur(db, `insert into public.colonie_emplacements (colonie_id, rucher_id, du, au, exploitation_id) values ($1, $2, '2026-01-01', '2026-01-01', $3)`, [id(1, 2), U(1), E1]);
verif(!!e, "période vide (au = du) : refusée");

// --- Déplacement groupé (AP-US-033) : 12 colonies du Verger vers la Lande, le 20 juin ---
await en(db, "a2@x.fr", E1);
const douze = Array.from({ length: 12 }, (_, i) => U(100 + i));
for (const [i, c] of douze.entries()) await db.query(`insert into public.ruches (id, nom, rucher_id, date_installation) values ($1, $2, $3, '2026-03-01')`, [c, `V${i + 1}`, U(1)]);
verif(await nb(`select count(*) n from public.colonie_emplacements where colonie_id = any($1) and au is null and rucher_id = $2 and du = '2026-03-01'`, [douze, U(1)]) === 12,
  "nouvelle colonie : emplacement ouvert dès sa date d'installation");
await db.query(`update public.ruchers set lat = 47.5, lng = 5.5 where id = $1`, [U(3)]);
const P = { id: U(900), date: "2026-06-20", rucher_id: U(3), colonies: douze, motif: "transhumance", notes: "Colza" };
verif((await val(`select public.deplacer_colonies($1) i`, [P])).i === U(900), "deplacer_colonies : renvoie l'identifiant fourni");
verif(await nb(`select count(*) n from public.ruches where id = any($1) and rucher_id = $2 and rucher = 'Lande' and lat = 47.5`, [douze, U(3)]) === 12,
  "les 12 colonies sont à la Lande (rucher, texte de l'ancienne version, position)");
r = await val(`select nb_colonies, rucher_origine_id o, rucher_destination_id d, motif from public.deplacements where id = $1`, [U(900)]);
verif(r.nb_colonies === 12 && r.o === U(1) && r.d === U(3) && r.motif === "transhumance", "une ligne de déplacement : 12 colonies, du Verger à la Lande");
verif(await nb(`select count(*) n from public.ruche_evenements where deplacement_id = $1 and type = 'deplacement' and date_evenement = '2026-06-20' and detail = 'Verger vers Lande, transhumance, Colza'`, [U(900)]) === 12,
  "registre : 12 lignes « deplacement » reliées, au format de la v5.10");
verif(await nb(`select count(*) n from public.colonie_emplacements where colonie_id = any($1) and rucher_id = $2 and au = '2026-06-20'`, [douze, U(1)]) === 12
  && await nb(`select count(*) n from public.colonie_emplacements where colonie_id = any($1) and rucher_id = $2 and du = '2026-06-20' and au is null and deplacement_id = $3`, [douze, U(3), U(900)]) === 12,
  "emplacements : Verger fermé le 20 juin, Lande ouvert le 20 juin");
verif((await val(`select public.rucher_a_date($1, '2026-05-15') r`, [douze[0]])).r === U(1), "AP-US-032 : sa visite du 15 mai se lit au Verger");
// Renvoi après une coupure : appliqué une seule fois.
await val(`select public.deplacer_colonies($1)`, [P]);
verif(await nb(`select count(*) n from public.deplacements where id = $1`, [U(900)]) === 1
  && await nb(`select count(*) n from public.ruche_evenements where deplacement_id = $1`, [U(900)]) === 12
  && await nb(`select count(*) n from public.colonie_emplacements where colonie_id = $1`, [douze[0]]) === 2,
  "même déplacement renvoyé (coupure réseau) : appliqué une seule fois");

// Atomicité : une colonie refusée, rien ne bouge.
const avantAtome = await nb(`select count(*) n from public.colonie_emplacements`);
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(901), date: "2026-06-21", rucher_id: U(1), colonies: [douze[0], id(1, 3)] }]);
verif(/n'est plus active/.test(e?.message || ""), `colonie morte dans le lot : « ${e?.message} »`);
verif(await nb(`select count(*) n from public.ruches where id = $1 and rucher_id = $2`, [douze[0], U(3)]) === 1
  && await nb(`select count(*) n from public.deplacements where id = $1`, [U(901)]) === 0
  && await nb(`select count(*) n from public.colonie_emplacements`) === avantAtome, "déplacement refusé : aucune colonie déplacée, aucune ligne écrite (tout ou rien)");
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(902), date: "2026-06-01", rucher_id: U(1), colonies: [douze[0]] }]);
verif(/à partir de ce jour/.test(e?.message || ""), "date antérieure à l'arrivée dans le rucher actuel : refusée");
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(903), rucher_id: U(3), colonies: [douze[0]] }]);
verif(e?.message === "Ces colonies sont déjà dans ce rucher.", "colonies déjà dans ce rucher : refusé");
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(904), rucher_id: U(3), colonies: [] }]);
verif(e?.message === "Choisis au moins une colonie.", "aucune colonie : « Choisis au moins une colonie. »");
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(905), date: "2099-01-01", rucher_id: U(1), colonies: [douze[0]] }]);
verif(/futur/.test(e?.message || ""), "date dans le futur : refusée");
// Même jour : un second déplacement corrige l'emplacement du jour au lieu de créer une période d'un jour.
await val(`select public.deplacer_colonies($1)`, [{ id: U(906), date: "2026-06-20", rucher_id: U(2), colonies: [douze[1]] }]);
verif(await nb(`select count(*) n from public.colonie_emplacements where colonie_id = $1`, [douze[1]]) === 2
  && (await val(`select rucher_id from public.colonie_emplacements where colonie_id = $1 and au is null`, [douze[1]])).rucher_id === U(2),
  "redéplacée le même jour : l'emplacement du jour est corrigé (pas de période vide)");

// --- Ancienne version : elle réécrit le texte du rucher ---
await db.query(`update public.ruches set rucher = 'Verger' where id = $1`, [douze[2]]);
r = await val(`select rucher_id, du::text from public.colonie_emplacements where colonie_id = $1 and au is null`, [douze[2]]);
verif(r.rucher_id === U(1) && r.du === (await val(`select current_date::text d`)).d, "ancienne version (texte du rucher) : nouvel emplacement à la date du jour");
verif(await nb(`select count(*) n from public.ruches x where (select count(*) from public.colonie_emplacements e where e.colonie_id = x.id and e.au is null) <> 1`) === 0,
  "toujours un seul emplacement ouvert par colonie");

// --- Statut (AP-US-034, AP-US-035, AP-TECH-108) ---
await val(`select public.changer_statut($1)`, [{ colonie_id: douze[3], statut: "orpheline" }]);
r = await val(`select statut, sortie from public.ruches where id = $1`, [douze[3]]);
verif(r.statut === "orpheline" && r.sortie === "", "orpheline : statut noté, toujours active pour l'ancienne version (sortie vide)");
await val(`select public.changer_statut($1)`, [{ colonie_id: douze[4], statut: "morte", date: "2026-07-01", detail: "Varroa" }]);
await val(`select public.changer_statut($1)`, [{ colonie_id: douze[4], statut: "morte", date: "2026-07-01", detail: "Varroa" }]);
r = await val(`select statut, sortie, date_sortie::text d from public.ruches where id = $1`, [douze[4]]);
verif(r.statut === "morte" && r.sortie === "Morte" && r.d === "2026-07-01", "morte : sortie « Morte » au 1er juillet pour l'ancienne version");
verif(await nb(`select count(*) n from public.ruche_evenements where ruche_id = $1 and type = 'sortie' and detail = 'Morte · Varroa'`, [douze[4]]) === 1,
  "morte, saisie renvoyée : une seule ligne « sortie » au registre");
await val(`select public.changer_statut($1)`, [{ colonie_id: douze[5], statut: "perdue" }]);
verif((await val(`select sortie from public.ruches where id = $1`, [douze[5]])).sortie === "Perdue", "perdue : sortie « Perdue »");
await db.query(`update public.ruches set sortie = 'Vendue', date_sortie = '2026-07-02' where id = $1`, [douze[6]]);
verif((await val(`select statut from public.ruches where id = $1`, [douze[6]])).statut === "vendue", "ancienne version, sortie « Vendue » : statut vendue");
await db.query(`update public.ruches set sortie = '', date_sortie = null where id = $1`, [douze[6]]);
verif((await val(`select statut from public.ruches where id = $1`, [douze[6]])).statut === "active", "ancienne version, remise en service : statut active");
await db.query(`update public.ruches set sortie = '' where id = $1`, [douze[3]]);
verif((await val(`select statut from public.ruches where id = $1`, [douze[3]])).statut === "orpheline", "sortie inchangée (vide) : une orpheline le reste");
verif(await nb(`select count(*) n from public.ruches where statut in ('active','orpheline')`) === await nb(`select count(*) n from public.ruches where sortie = ''`),
  "colonies actives (statut) = colonies sans sortie (ancienne version)");
e = await erreur(db, `select public.changer_statut($1)`, [{ colonie_id: douze[3], statut: "reunie" }]);
verif(/réunion/.test(e?.message || ""), "réunie par changer_statut : refusé (passe par la réunion)");

// --- Contenants (AP-US-036) ---
await db.query(`insert into public.contenants (id, code, type) values ($1, '12', 'Dadant 10'), ($2, '31', 'Dadant 10'), ($3, '40', 'Ruchette')`, [U(12), U(31), U(40)]);
const A = douze[7];
await val(`select public.affecter_contenant($1)`, [{ id: U(500), colonie_id: A, contenant_id: U(12), date: "2026-04-01" }]);
await val(`select public.affecter_contenant($1)`, [{ id: U(501), colonie_id: A, contenant_id: U(31), date: "2026-07-01" }]);
await val(`select public.affecter_contenant($1)`, [{ id: U(501), colonie_id: A, contenant_id: U(31), date: "2026-07-01" }]);
const occ = await lignes(`select contenant_id c, du::text, au::text from public.colonie_contenants where colonie_id = $1 order by du`, [A]);
verif(occ.length === 2 && occ[0].c === U(12) && occ[0].au === "2026-07-01" && occ[1].c === U(31) && occ[1].au === null,
  "transfert de la colonie A du 12 au 31 : le 12 est libre, le 31 occupé, l'historique est gardé (renvoi sans doublon)");
verif(await nb(`select count(*) n from public.ruche_evenements where ruche_id = $1`, [A]) === 1, "historique de la colonie intact (mêmes événements)");
e = await erreur(db, `select public.affecter_contenant($1)`, [{ id: U(502), colonie_id: douze[8], contenant_id: U(31), date: "2026-07-05" }]);
verif(/occupé par V8/.test(e?.message || ""), `contenant occupé : « ${e?.message} »`);
e = await erreur(db, `insert into public.colonie_contenants (colonie_id, contenant_id, du) values ($1, $2, '2026-07-02')`, [douze[8], U(31)]);
verif(/colonie_contenants_contenant_seul/.test(e?.message || ""), "deux colonies dans le même contenant en même temps : refusé par la base");
// Une colonie morte libère son contenant pour une autre.
await db.exec(`reset role; insert into public.colonie_contenants (colonie_id, contenant_id, du, exploitation_id) values ('${douze[4]}', '${U(40)}', '2026-05-01', '${E1}')`);
await en(db, "a2@x.fr", E1);
await val(`select public.affecter_contenant($1)`, [{ id: U(504), colonie_id: douze[9], contenant_id: U(40), date: "2026-07-10" }]);
verif((await val(`select au::text from public.colonie_contenants where colonie_id = $1`, [douze[4]])).au === "2026-07-10",
  "contenant d'une colonie morte : repris par une autre colonie, l'ancienne occupation se ferme ce jour-là");
await val(`select public.affecter_contenant($1)`, [{ id: U(505), colonie_id: A, contenant_id: null, date: "2026-08-01" }]);
verif(await nb(`select count(*) n from public.colonie_contenants where colonie_id = $1 and au is null`, [A]) === 0, "retirer la colonie de son contenant : le contenant est libre");
e = await erreur(db, `insert into public.contenants (code) values (' 12 ')`);
verif(/contenants_code_uidx|unique|duplicate/.test(e?.message || ""), "deux contenants avec le même numéro : refusé");

// --- Lecteur, visiteur, autre exploitation ---
await en(db, "l@x.fr", E1);
for (const [f, p] of [["deplacer_colonies", { rucher_id: U(1), colonies: [douze[0]] }], ["changer_statut", { colonie_id: douze[0], statut: "orpheline" }],
  ["affecter_contenant", { colonie_id: douze[0], contenant_id: U(12) }]]) {
  e = await erreur(db, `select public.${f}($1)`, [p]);
  verif(/lecture seule/.test(e?.message || ""), `lecteur : ${f} refusé`);
}
verif(await nb(`select count(*) n from public.colonie_emplacements`) > 0, "lecteur : lit les emplacements");
await en(db, null);
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ rucher_id: U(1), colonies: [douze[0]] }]);
verif(!!e, "visiteur non connecté : deplacer_colonies refusé");
await en(db, "b@x.fr", E2);
verif(await nb(`select count(*) n from public.deplacements`) === 0 && await nb(`select count(*) n from public.colonie_emplacements`) === 1
  && await nb(`select count(*) n from public.contenants`) === 0, "B ne voit ni les déplacements, ni les emplacements, ni les contenants de A");
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(950), rucher_id: U(4), colonies: [douze[0]] }]);
verif(e?.message === "Colonie introuvable", "B ne peut pas déplacer une colonie de A vers son rucher");
e = await erreur(db, `select public.deplacer_colonies($1)`, [{ id: U(951), rucher_id: U(1), colonies: [id(2, 1)] }]);
verif(e?.message === "Rucher introuvable", "B ne peut pas déplacer sa colonie vers un rucher de A");
e = await erreur(db, `select public.affecter_contenant($1)`, [{ id: U(952), colonie_id: id(2, 1), contenant_id: U(31) }]);
verif(e?.message === "Contenant introuvable", "B ne peut pas utiliser un contenant de A");
e = await erreur(db, `insert into public.colonie_emplacements (colonie_id, rucher_id, du) values ($1, $2, '2020-01-01')`, [id(2, 1), U(1)]);
verif(!!e, "B ne peut pas noter un emplacement de sa colonie dans un rucher de A");

// --- Audit, suppression d'une exploitation ---
await db.exec("reset role");
verif(await nb(`select count(*) n from public.journal_audit where table_nom = 'colonie_emplacements' and operation = 'UPDATE'`) > 0,
  "emplacements fermés : tracés dans le journal d'audit");
verif(await nb(`select count(*) n from public.incoherences_exploitation() where nombre > 0`) === 0, "aucun rattachement croisé entre exploitations");
e = await erreur(db, `delete from public.exploitations where id = $1`, [E1]);
verif(!e && await nb(`select count(*) n from public.colonie_emplacements where exploitation_id = $1`, [E1]) === 0
  && await nb(`select count(*) n from public.deplacements where exploitation_id = $1`, [E1]) === 0,
  "supprimer une exploitation : emplacements, déplacements et contenants partent avec elle" + (e ? " (" + e.message + ")" : ""));

fin("Migration 016");
