// Mise à jour automatique d'une base avant la mise en ligne (scripts/appliquer-migrations.mjs) : la base est reconnue
// à sa structure, seules les migrations suivantes sont appliquées, une erreur annule tout, une base modifiée hors
// fichier n'est pas touchée. La « vraie base » est ici un Postgres en mémoire.
// Lancer : node tests/sql/test_appliquer.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { base, ORDRE, verificateur } from "./socle.mjs";
import { etapes, mettreAJour, structure, ecarts } from "../../scripts/appliquer-migrations.mjs";

const { verif, fin } = verificateur();
const liste = await etapes();
const acces = (db) => ({ lire: async (q) => (await db.query(q)).rows, executer: async (q) => { await db.exec(q); } });
const muet = () => {};
const erreur = async (f) => { try { await f(); return null; } catch (e) { return e; } };
const derniere = ORDRE.at(-1);
const pareil = async (db, fichier) => {
  const d = ecarts(liste.find((e) => e.fichier === fichier).structure, await structure(acces(db).lire));
  return d.manque.length + d.enTrop.length === 0;
};

// 1. Base de production d'aujourd'hui : 000 à 016, avec des données.
{
  const db = await base({ jusqua: "016-emplacements-contenants.sql" });
  await db.exec(`insert into public.exploitations (id, nom, cree_par) values ('11111111-1111-4111-8111-111111111111', 'Rucher A', 'a@x.fr');
    insert into public.ruches (id, nom, etat, annee_reine, exploitation_id) values ('10000001-0000-4000-8000-000000000000', 'Ruche 1', 'Bonne', 2024, '11111111-1111-4111-8111-111111111111');
    insert into public.articles (id, nom, type, unite, stock, exploitation_id) values ('10000002-0000-4000-8000-000000000000', 'Pot 250 g', 'Consommable', 'unité', 40, '11111111-1111-4111-8111-111111111111');`);
  const sim = await mettreAJour({ ...acces(db), liste, dire: muet, simuler: true });
  verif(sim.version === "016-emplacements-contenants.sql" && sim.aAppliquer.join() === "017-associes.sql,018-stock-mouvements.sql,019-reines-liens.sql",
    "simulation : la base est reconnue à 016, il reste 017, 018, 019");
  verif(await pareil(db, "016-emplacements-contenants.sql"), "simulation : rien n'est écrit");
  const journal = [];
  const r = await mettreAJour({ ...acces(db), liste, dire: (l) => journal.push(l) });
  verif(r.appliquees.join() === "017-associes.sql,018-stock-mouvements.sql,019-reines-liens.sql" && r.version === derniere, "017, 018 et 019 appliquées dans l'ordre");
  verif(await pareil(db, derniere), "la base a exactement la structure des fichiers");
  const q = (await db.query("select annee_naissance, statut from public.reines")).rows;
  const m = (await db.query("select type, quantite::int q from public.mouvements_stock")).rows;
  verif(q.length === 1 && q[0].annee_naissance === 2024 && m.length === 1 && m[0].q === 40, "les reprises de données ont tourné (reine 2024, stock d'ouverture 40)");
  verif(journal.some((l) => /en est à 016/.test(l)) && journal.filter((l) => /^Appliquée : /.test(l)).length === 3, "journal lisible : étape reconnue, une ligne par migration");
  const r2 = await mettreAJour({ ...acces(db), liste, dire: muet });
  verif(r2.appliquees.length === 0 && (await db.query("select count(*)::int n from public.reines")).rows[0].n === 1, "relancé : base à jour, rien n'est rejoué");
}

// 2. Base de recette : fonctions collées avec une autre indentation (écart connu sur apidoo-test) → reconnue quand même.
{
  const db = await base({ jusqua: "017-associes.sql" });
  const src = (await db.query("select pg_get_functiondef('public.rucher_cle(text)'::regprocedure) d")).rows[0].d;
  await db.exec(src.replace(/\n/g, "\n    "));
  const r = await mettreAJour({ ...acces(db), liste, dire: muet, simuler: true });
  verif(r.version === "017-associes.sql" && r.aAppliquer.length === 2, "indentation différente d'une fonction : la base est reconnue à 017");
}

// 3. Base modifiée hors fichier : rien n'est appliqué, l'écart est nommé.
{
  const db = await base({ jusqua: "016-emplacements-contenants.sql" });
  await db.exec("alter table public.ruches add column bricolage text");
  const e = await erreur(() => mettreAJour({ ...acces(db), liste, dire: muet }));
  verif(e && /aucune étape/.test(e.message) && /après 016-emplacements-contenants\.sql/.test(e.message) && /absent des fichiers : colonne ruches\.bricolage/.test(e.message),
    "base modifiée à la main : refus, étape la plus proche et colonne en trop nommées");
  verif((await db.query("select to_regclass('public.mouvements_stock') t")).rows[0].t === null, "base modifiée à la main : aucune migration appliquée");
}

// 4. Une migration qui échoue est annulée en entier ; les précédentes restent ; les suivantes ne partent pas.
{
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "mig-"));
  for (const f of ORDRE) fs.copyFileSync("migrations/" + f, path.join(dossier, f));
  // 018 passe sur une base vide mais échoue sur une base qui a un article sans nom (donnée réelle inattendue).
  fs.appendFileSync(path.join(dossier, "018-stock-mouvements.sql"),
    "\ndo $$ begin if exists (select 1 from public.articles where nom = 'PIEGE') then raise exception 'donnée inattendue'; end if; end $$;\n");
  const piege = await etapes(dossier);
  const db = await base({ jusqua: "016-emplacements-contenants.sql" });
  await db.exec(`insert into public.exploitations (id, nom, cree_par) values ('11111111-1111-4111-8111-111111111111', 'Rucher A', 'a@x.fr');
    insert into public.articles (id, nom, type, unite, stock, exploitation_id) values ('10000002-0000-4000-8000-000000000000', 'PIEGE', 'Consommable', 'unité', 3, '11111111-1111-4111-8111-111111111111');`);
  const e = await erreur(() => mettreAJour({ ...acces(db), liste: piege, dire: muet }));
  verif(e && /018-stock-mouvements\.sql a échoué et a été annulée en entier : donnée inattendue/.test(e.message) && /Déjà appliquées avant elle : 017-associes\.sql/.test(e.message),
    "migration en échec : message clair, 017 signalée comme déjà appliquée");
  const etat = (await db.query(`select to_regclass('public.mouvements_stock') m, to_regclass('public.reines') r,
    exists (select 1 from information_schema.columns where table_name = 'depenses' and column_name = 'achete_par') a,
    exists (select 1 from information_schema.columns where table_name = 'articles' and column_name = 'famille') f`)).rows[0];
  verif(etat.a === true && etat.m === null && etat.f === false && etat.r === null, "017 reste, 018 est annulée en entier (aucune colonne, aucune table), 019 n'est pas partie");
  verif((await db.query("select 1 as un")).rows[0].un === 1, "la connexion reste utilisable après l'annulation");
  // Une fois la donnée corrigée, la relance reprend à 018.
  await db.exec("update public.articles set nom = 'Pot 250 g' where nom = 'PIEGE'");
  const r = await mettreAJour({ ...acces(db), liste: piege, dire: muet });
  verif(r.appliquees.join() === "018-stock-mouvements.sql,019-reines-liens.sql", "relance après correction : reprend à 018, puis 019");
  fs.rmSync(dossier, { recursive: true });
}

// 5. Base déjà à jour : rien.
{
  const db = await base();
  const r = await mettreAJour({ ...acces(db), liste, dire: muet });
  verif(r.appliquees.length === 0 && r.version === derniere, "base à jour : rien à appliquer");
}
fin("Mise à jour automatique des bases");
