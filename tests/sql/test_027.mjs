// Tests SQL de la migration 027 : assembler des ruches physiques avec les pièces du stock, composition par type.
// Usage (depuis la racine du dépôt) : node tests/sql/test_027.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "026-hors-ligne-v2.sql" });
await deuxExploitations(db);
const U = (n) => `eeeeeeee-0000-4000-8000-${String(n).padStart(12, "0")}`;
const val = async (q, p) => (await db.query(q, p)).rows[0];
const stock = async (id) => Number((await val(`select stock from public.articles where id = $1`, [id])).stock);

await db.exec(`reset role;
  insert into public.articles (id, nom, type, unite, stock, seuil, exploitation_id) values
    ('${U(1)}', 'Plancher Dadant 10', 'Équipement', 'unité', 5, 0, '${E1}'),
    ('${U(2)}', 'Cadres de corps', 'Consommable', 'unité', 40, 0, '${E1}'),
    ('${U(3)}', 'Cire gaufrée corps', 'Consommable', 'unité', 12, 0, '${E1}'),
    ('${U(9)}', 'Plancher de B', 'Équipement', 'unité', 3, 0, '${E2}');`);

const sql = fs.readFileSync("migrations/027-assemblage-ruches.sql", "utf8");
try { await db.exec(sql); verif(true, "027 appliquée sur une base avec données"); } catch (e) { verif(false, "027 : " + e.message); fin("Migration 027"); }
try { await db.exec(sql); verif(true, "027 relançable"); } catch (e) { verif(false, "027 relancée : " + e.message); }

// Composition d'un type.
await en(db, "a2@x.fr", E1);
const compo = { type: "Dadant 10 cadres", pieces: [{ article_id: U(1), quantite: 1 }, { article_id: U(2), quantite: 10 }, { article_id: U(3), quantite: 10 }] };
let r = await val(`select public.enregistrer_composition($1) n`, [JSON.stringify(compo)]);
verif(r.n === 3, "composition : 3 pièces enregistrées");
r = await val(`select public.enregistrer_composition($1) n`, [JSON.stringify({ type: "dadant 10 cadres ", pieces: [{ article_id: U(1), quantite: 1 }, { article_id: U(2), quantite: 10 }] })]);
verif(r.n === 2 && Number((await val(`select count(*) n from public.compositions_ruches`)).n) === 2, "composition : remplacée en entier (type sans tenir compte de la casse)");
await val(`select public.enregistrer_composition($1)`, [JSON.stringify(compo)]);
let e = await erreur(db, `select public.enregistrer_composition($1)`, [JSON.stringify({ type: "Warré", pieces: [{ article_id: U(9), quantite: 1 }] })]);
verif(e && e.message === "Article introuvable", `composition avec un article de B : « ${e?.message} »`);

// Assemblage de deux ruches : stock retiré, une pièce manque (stock négatif accepté).
const p = { ruches: [{ id: U(100), code: "13" }, { id: U(101), code: "14" }], type: "Dadant 10 cadres", etat: "bon", date: "2026-11-17",
  pieces: compo.pieces };
r = await val(`select public.assembler_ruches($1) n`, [JSON.stringify(p)]);
verif(r.n === 2, "assemblage : 2 ruches physiques créées");
verif(Number((await val(`select count(*) n from public.contenants where code in ('13', '14') and type = 'Dadant 10 cadres'`)).n) === 2, "assemblage : ruches n° 13 et 14, type gardé");
verif(await stock(U(1)) === 3 && await stock(U(2)) === 20, "assemblage : planchers 5 → 3, cadres 40 → 20");
verif(await stock(U(3)) === -8, "assemblage : cire 12 → −8 (manque accepté)");
r = await val(`select count(*) n, min(note) note from public.mouvements_stock where origine = 'assemblage' and type = 'consommation'`);
verif(Number(r.n) === 3 && r.note === "Assemblage : ruches physiques n° 13 à 14", "assemblage : un mouvement par pièce, avec les numéros");
r = await val(`select public.assembler_ruches($1) n`, [JSON.stringify(p)]);
verif(r.n === 0 && await stock(U(1)) === 3, "assemblage renvoyé deux fois (file hors ligne) : rien en double");

// Refus.
e = await erreur(db, `select public.assembler_ruches($1)`, [JSON.stringify({ ruches: [{ id: U(102), code: "14" }], pieces: [] })]);
verif(e && /14 existe déjà/.test(e.message), `numéro déjà pris : « ${e?.message} »`);
e = await erreur(db, `select public.assembler_ruches($1)`, [JSON.stringify({ ruches: [{ id: U(103), code: "15" }], pieces: [{ article_id: U(9), quantite: 1 }] })]);
verif(e && e.message === "Article introuvable", `pièce d'une autre exploitation : « ${e?.message} »`);
verif(!(await val(`select 1 x from public.contenants where code = '15'`)), "assemblage refusé : aucune ruche gardée");

// Lecteur : lit, n'écrit pas.
await en(db, "l@x.fr", E1);
verif(Number((await val(`select count(*) n from public.compositions_ruches`)).n) === 3, "lecteur : voit la composition");
e = await erreur(db, `select public.assembler_ruches($1)`, [JSON.stringify({ ruches: [{ id: U(104), code: "16" }], pieces: [] })]);
verif(e && /lecture seule/.test(e.message), `lecteur : assemblage refusé (« ${e?.message} »)`);
e = await erreur(db, `select public.enregistrer_composition($1)`, [JSON.stringify(compo)]);
verif(e && /lecture seule/.test(e.message), "lecteur : composition refusée");

// L'autre exploitation ne voit rien.
await en(db, "b@x.fr", E2);
verif(Number((await val(`select count(*) n from public.compositions_ruches`)).n) === 0, "exploitation B : ne voit pas la composition de A");
verif(await stock(U(9)) === 3, "exploitation B : son stock n'a pas bougé");

fin("Migration 027");
