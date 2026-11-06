// Données de démonstration (IT-04, AP-FEAT-018, AP-US-017) : le fichier tests/demo/exploitation-demo.json est chargé
// dans une base en mémoire par les mêmes opérations que scripts/demo.mjs, en tant que compte connecté (RLS active).
// Usage (depuis la racine du dépôt) : node tests/sql/test_demo.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, E1 } from "./socle.mjs";
import { operations, attendu, identifiant } from "../demo/operations.mjs";

const { verif, fin } = verificateur();
const doc = JSON.parse(fs.readFileSync("tests/demo/exploitation-demo.json", "utf8"));
const db = await base();
await deuxExploitations(db);
await donnees(db); // une vraie exploitation à côté, qui ne doit pas être comptée ni touchée

async function charger() {
  await en(db, "demo@x.fr");
  const ex = (await db.query(`select public.creer_exploitation_demo('${doc.nom.replace(/'/g, "''")}') e`)).rows[0].e;
  await en(db, "demo@x.fr", ex);
  for (const op of operations(doc, ex)) {
    if (op.rpc) await db.query(`select public.${op.rpc}(${Object.keys(op.args).map((k, i) => `${k} => $${i + 1}`).join(", ")})`, Object.values(op.args).map((v) => JSON.stringify(v)));
    else for (const l of op.lignes) {
      const cols = Object.keys(l);
      await db.query(`insert into public.${op.insert} (${cols.join(", ")}) values (${cols.map((_, i) => "$" + (i + 1)).join(", ")})`, cols.map((c) => l[c]));
    }
  }
  return ex;
}

const n = async (q) => Number((await db.query(q)).rows[0].n);
const ex = await charger();
const a = attendu(doc);
verif(a.ruchers === 3 && a.colonies === 20 && a.saisons === 2, `le fichier décrit 3 ruchers, 20 colonies, 2 saisons (${JSON.stringify(a)})`);
await db.exec("reset role");
verif((await db.query(`select demo, nom from public.exploitations where id = '${ex}'`)).rows[0].demo === true, "exploitation « Démo » marquée demo = true");
const c = async (t) => n(`select count(*) n from public.${t} where exploitation_id = '${ex}'`);
verif(await c("ruches") === 20 && await n(`select count(distinct rucher) n from public.ruches where exploitation_id = '${ex}'`) === 3, "20 colonies dans 3 ruchers");
verif(await c("visites") === a.visites && await n(`select count(distinct extract(year from date_visite)) n from public.visites where exploitation_id = '${ex}'`) === 2, `${a.visites} visites sur 2 saisons`);
verif(await c("ventes") === a.ventes && await c("vente_lignes") === a.ventes && await c("recoltes") === a.recoltes, "ventes, lignes et récoltes chargées");
verif(await n(`select count(*) n from public.lots_stock where exploitation_id = '${ex}' and pots_restants < 0`) === 0, "aucun lot en stock négatif");
verif(await n(`select count(*) n from public.articles where exploitation_id = '${ex}' and stock < 0`) === 0, "aucun article en stock négatif");
verif(await n(`select count(*) n from public.visites where exploitation_id = '${ex}' and (traitement <> '' or traitement_dose <> '')`) === 0, "aucun traitement ni dose dans la démo");
verif(await n(`select count(*) n from public.ruches where exploitation_id = '${E1}'`) === 2, "la vraie exploitation voisine n'est pas touchée");
const ind = (await db.query("select * from public.indicateurs_usage()")).rows[0];
verif(Number(ind.exploitations) === 2 && Number(ind.colonies) === 4 && Number(ind.visites) === 2, "indicateurs réels : aucune ligne de démo comptée (AP-FEAT-018)");
// Même contenu à chaque chargement, sans conflit (identifiants dérivés de l'exploitation).
const ex2 = await charger();
await db.exec("reset role");
const resume = async (e) => (await db.query(`select string_agg(nom || ':' || etat, ',' order by nom) s from public.ruches where exploitation_id = '${e}'`)).rows[0].s;
verif(ex2 !== ex && await resume(ex2) === await resume(ex), "deuxième chargement : nouvelle exploitation, contenu identique");
verif(identifiant(ex, "c01") === identifiant(ex, "c01") && identifiant(ex, "c01") !== identifiant(ex2, "c01"), "identifiants stables par exploitation");
fin("Données de démonstration");
