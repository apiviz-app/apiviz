// Tests SQL de la migration 033 : goûts des clients et « prévenir à la prochaine récolte ».
// Usage (depuis la racine du dépôt) : node tests/sql/test_033.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "032-produits.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/033-clients-gouts.sql", "utf8");
try { await db.exec(sql); verif(true, "033 appliquée sur une base avec données"); } catch (e) { verif(false, "033 : " + e.message); fin("Migration 033"); }
try { await db.exec(sql); verif(true, "033 relançable"); } catch (e) { verif(false, "033 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const C1 = id(1, 8), C2 = id(2, 8);

// Les clients existants gardent tout et reçoivent les valeurs par défaut.
await en(db, "a@x.fr", E1);
const c = await val(`select nom, gouts, prevenir from public.clients where id = '${C1}'`);
verif(c && c.nom === "Client 1" && Array.isArray(c.gouts) && c.gouts.length === 0 && c.prevenir === false, `client existant : aucun goût, pas à prévenir (${JSON.stringify(c)})`);

// Un membre note les goûts et la demande ; l'ancienne version (sans ces colonnes) écrit toujours.
await en(db, "a2@x.fr", E1);
verif(!(await erreur(db, `update public.clients set gouts = array['Miel 500 g', 'Hydromel 75 cl'], prevenir = true where id = '${C1}'`)), "membre : goûts et « prévenir » enregistrés");
verif(!(await erreur(db, `insert into public.clients (nom, cercle, telephone) values ('Ancienne version', 'Amis', '0600000000')`)), "ancienne version : insertion sans les nouvelles colonnes");
const n = await val(`select gouts, prevenir from public.clients where nom = 'Ancienne version'`);
verif(n && n.gouts.length === 0 && n.prevenir === false, "ancienne version : valeurs par défaut");
const x = await val(`select gouts, prevenir from public.clients where id = '${C1}'`);
verif(x.gouts.join("|") === "Miel 500 g|Hydromel 75 cl" && x.prevenir === true, "goûts relus dans l'ordre");

// Contrôles : 8 goûts au plus, pas de goût démesuré.
verif(!!(await erreur(db, `update public.clients set gouts = array['a','b','c','d','e','f','g','h','i'] where id = '${C1}'`)), "neuf goûts : refusé");
verif(!!(await erreur(db, `update public.clients set gouts = array[repeat('x', 500)] where id = '${C1}'`)), "goût de 500 caractères : refusé");

// « C'est fait » : la liste se vide.
verif(!(await erreur(db, `update public.clients set prevenir = false where prevenir`)), "clients prévenus : case remise à faux");
verif((await val(`select count(*)::int n from public.clients where prevenir`)).n === 0, "plus personne à prévenir");

// Lecteur et autre exploitation : rien.
await en(db, "l@x.fr", E1);
await db.exec(`update public.clients set prevenir = true where id = '${C1}'`).catch(() => {});
await en(db, "a@x.fr", E1);
verif((await val(`select prevenir from public.clients where id = '${C1}'`)).prevenir === false, "lecteur : ne peut pas changer « prévenir »");
await en(db, "b@x.fr", E2);
await db.exec(`update public.clients set gouts = array['piraté'] where id = '${C1}'`).catch(() => {});
await en(db, "a@x.fr", E1);
verif((await val(`select gouts from public.clients where id = '${C1}'`)).gouts.join() === "Miel 500 g,Hydromel 75 cl", "autre exploitation : goûts intacts");
await en(db, "b@x.fr", E2);
verif((await val(`select count(*)::int n from public.clients where id = '${C1}'`)).n === 0, "autre exploitation : ne voit pas le client");
verif((await val(`select count(*)::int n from public.clients where id = '${C2}'`)).n === 1, "autre exploitation : voit le sien");
fin("Migration 033");
