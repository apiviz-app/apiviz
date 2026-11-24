// Tests SQL de la migration 040 : rappels même quand Apiviz est fermée (abonnements_push, abonner_push,
// desabonner_push, notifications_envoyees).
// Usage (depuis la racine du dépôt) : node tests/sql/test_040.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "039-mieux-connaitre-usage.sql" });
await deuxExploitations(db);
const sql = fs.readFileSync("migrations/040-rappels-app-fermee.sql", "utf8");
try { await db.exec(sql); verif(true, "040 appliquée"); } catch (e) { verif(false, "040 : " + e.message); fin("Migration 040"); }
try { await db.exec(sql); verif(true, "040 relançable"); } catch (e) { verif(false, "040 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const abo = (endpoint, types) => JSON.stringify({ endpoint, p256dh: "B".repeat(87), auth: "A".repeat(22), plateforme: "web", ...(types ? { types } : {}) });

await en(db, "a@x.fr", E1);
verif(!(await erreur(db, "select public.abonner_push($1::jsonb)", [abo("https://push.example/a1")])), "A abonne un appareil");
verif(!(await erreur(db, "select public.abonner_push($1::jsonb)", [abo("https://push.example/a1", { meteo: false })])), "même appareil : mis à jour");
let r = await val("select count(*)::int n, min(email) email, (min(types::text))::jsonb t from public.abonnements_push");
verif(r.n === 1 && r.email === "a@x.fr" && r.t.meteo === false && r.t.visites === true && r.t.saison === true, "une ligne, à l'adresse de A, types : " + JSON.stringify(r.t));
verif(!!(await erreur(db, "select public.abonner_push($1::jsonb)", [abo("http://push.example/x")])), "endpoint non https : refusé");
verif(!!(await erreur(db, "insert into public.abonnements_push (email, endpoint, p256dh, auth) values ('b@x.fr', 'https://x', 'BBBBBBBBBBBBBBBBBBBBBBBB', 'AAAAAAAAAA')")), "pas d'écriture directe");

await en(db, "b@x.fr", E2);
verif(!(await erreur(db, "select public.abonner_push($1::jsonb)", [abo("https://push.example/b1")])), "B abonne son appareil");
verif((await val("select count(*)::int n from public.abonnements_push")).n === 1, "B ne voit que ses appareils");
await db.exec("select public.desabonner_push('https://push.example/a1')");
await db.exec("reset role");
verif((await val("select count(*)::int n from public.abonnements_push where endpoint = 'https://push.example/a1'")).n === 1, "B ne peut pas retirer l'appareil de A");
await en(db, "a@x.fr", E1);
await db.exec("delete from public.abonnements_push");
await db.exec("reset role");
verif((await val("select count(*)::int n from public.abonnements_push")).n === 1, "A retire ses appareils (delete), pas ceux de B");
await en(db, "b@x.fr", E2);
await db.exec("select public.desabonner_push('https://push.example/b1')");
await db.exec("reset role");
verif((await val("select count(*)::int n from public.abonnements_push")).n === 0, "desabonner_push");

await en(db, "a@x.fr", E1);
verif(!!(await erreur(db, "select * from public.notifications_envoyees")), "notifications_envoyees : fermée à l'application");
await en(db, "", null);
verif(!!(await erreur(db, "select public.abonner_push($1::jsonb)", [abo("https://push.example/z")])), "anonyme : refusé");
fin("Migration 040");
