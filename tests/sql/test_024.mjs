// Tests SQL de la migration 024 : compteur d'usage de l'assistant API (IT-24, AP-TECH-336).
// Usage (depuis la racine du dépôt) : node tests/sql/test_024.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "023-visite-rapide.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/024-assistant-usage.sql", "utf8");
try { await db.exec(sql); verif(true, "024 appliquée sur une base avec données"); } catch (e) { verif(false, "024 : " + e.message); fin("Migration 024"); }
try { await db.exec(sql); verif(true, "024 relançable"); } catch (e) { verif(false, "024 relancée : " + e.message); }

const UA = "aaaaaaaa-0000-4000-8000-000000000001", UB = "bbbbbbbb-0000-4000-8000-000000000002";
async function moi(sub, email, ex) {
  await en(db, email, ex);
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ sub, email, email_verified: true })}', false); set role authenticated;`);
}
const val = async (q, p) => (await db.query(q, p)).rows[0];

await moi(UA, "a@x.fr", E1);
verif((await val(`select public.assistant_restant(3) r`)).r === 3, "aucune question posée : 3 restantes sur 3");
const r1 = (await val(`select public.assistant_consommer(3) r`)).r;
const r2 = (await val(`select public.assistant_consommer(3) r`)).r;
const r3 = (await val(`select public.assistant_consommer(3) r`)).r;
const r4 = (await val(`select public.assistant_consommer(3) r`)).r;
verif(r1 === 2 && r2 === 1 && r3 === 0, `chaque question est comptée : ${r1}, ${r2}, ${r3}`);
verif(r4 === -1, "plafond atteint : -1, la question n'est pas comptée");
verif((await val(`select nb from public.assistant_usage`)).nb === 3, "compteur à 3, pas au-delà du plafond");
verif((await val(`select public.assistant_restant(3) r`)).r === 0, "plus aucune question restante");

// Changer d'exploitation ne remet pas le compteur à zéro.
await moi(UA, "a@x.fr", E2);
verif((await val(`select public.assistant_consommer(3) r`)).r === -1, "autre exploitation : même compteur (par personne)");

// Chacun ne voit que son compteur et ne peut pas l'écrire directement.
await moi(UB, "b@x.fr", E2);
verif((await db.query(`select * from public.assistant_usage`)).rows.length === 0, "b@ ne voit pas le compteur de a@");
verif((await val(`select public.assistant_consommer(3) r`)).r === 2, "b@ a son propre plafond");
await moi(UA, "a@x.fr", E1);
verif(!!(await erreur(db, `update public.assistant_usage set nb = 0`)), "remise à zéro directe refusée");
verif(!!(await erreur(db, `insert into public.assistant_usage (user_id, jour, nb) values ('${UA}', current_date - 1, 0)`)), "écriture directe refusée");
verif(!!(await erreur(db, `delete from public.assistant_usage`)), "suppression directe refusée");
verif((await val(`select nb from public.assistant_usage`)).nb === 3, "compteur de a@ intact");

// Sans connexion, rien.
await en(db, null, null);
verif(!!(await erreur(db, `select public.assistant_consommer(3)`)), "anonyme : fonction refusée");
await db.exec(`reset role; select set_config('request.jwt.claims', '{}', false); set role authenticated;`);
verif(/Connexion/.test(String(await erreur(db, `select public.assistant_consommer(3)`))), "jeton sans utilisateur : refus en français");
await moi(UA, "a@x.fr", E1);
verif(/Plafond/.test(String(await erreur(db, `select public.assistant_consommer(0)`))), "plafond 0 refusé");

// Les données métier ne bougent pas.
await db.exec("reset role");
verif((await val(`select count(*)::int n from public.ruches`)).n === 4, "aucune table métier touchée");
fin("Migration 024");
