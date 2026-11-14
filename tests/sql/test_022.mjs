// Tests SQL de la migration 022 : supprimer son compte depuis l'application.
// Usage (depuis la racine du dépôt) : node tests/sql/test_022.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "021-profils-etiquettes.sql" });
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const UA = "aaaaaaaa-0000-4000-8000-000000000001", UB = "bbbbbbbb-0000-4000-8000-000000000002", UA2 = "aaaaaaaa-0000-4000-8000-000000000003";
await db.exec(`reset role;
  insert into auth.users (id, email) values ('${UA}', 'a@x.fr'), ('${UB}', 'b@x.fr'), ('${UA2}', 'a2@x.fr');
  insert into public.profils (email, prenom) values ('a@x.fr', 'Pierre-Louis'), ('b@x.fr', 'Bea'), ('a2@x.fr', 'Camille');
  insert into public.membres_v1 (email) values ('b@x.fr') on conflict do nothing;
  insert into public.journal_audit (exploitation_id, table_nom, operation, ligne_id, avant, auteur) values ('${E1}', 'ruches', 'UPDATE', gen_random_uuid(), '{}', 'a@x.fr');
  insert into public.invitations (exploitation_id, cree_par) values ('${E1}', 'a@x.fr');`);

const sql = fs.readFileSync("migrations/022-suppression-compte.sql", "utf8");
try { await db.exec(sql); verif(true, "022 appliquée sur une base avec données"); }
catch (e) { verif(false, "022 : " + e.message); fin("Migration 022"); }
try { await db.exec(sql); verif(true, "022 relançable"); }
catch (e) { verif(false, "022 relancée : " + e.message); }

// Comme PostgREST : adresse vérifiée et identifiant du compte dans le jeton.
async function comme(email, uid, ex) {
  const claims = email ? JSON.stringify({ email, email_verified: true, sub: uid }) : "";
  await db.exec(`reset role;
    select set_config('request.jwt.claims', '${claims}', false),
           set_config('request.headers', '${JSON.stringify(ex ? { "x-exploitation": ex } : {})}', false);
    set role ${email ? "authenticated" : "anon"};`);
}
const compter = async (table, ex) => { await db.exec("reset role"); return (await val(`select count(*)::int n from public.${table} where exploitation_id = $1`, [ex])).n; };
const avantE1 = { ruches: await compter("ruches", E1), visites: await compter("visites", E1), ventes: await compter("ventes", E1) };

// Visiteur non connecté : rien.
await comme(null, null, null);
verif(!!(await erreur(db, `select public.compte_a_supprimer()`)), "non connecté : compte_a_supprimer refusé");
verif(!!(await erreur(db, `select public.supprimer_mon_compte('SUPPRIMER')`)), "non connecté : supprimer_mon_compte refusé");

// b, seul dans B : l'aperçu annonce B effacée, avec sa photo.
await comme("b@x.fr", UB, E2);
const apercu = (await val(`select public.compte_a_supprimer() a`)).a;
verif(apercu.effacees.length === 1 && apercu.effacees[0].nom === "Rucher B" && apercu.effacees[0].colonies === 2 && apercu.quittees.length === 0,
  `aperçu de b : Rucher B effacée (2 colonies), rien à quitter (${JSON.stringify(apercu.effacees)})`);
verif(apercu.photos.length === 1 && apercu.photos[0].startsWith(E2 + "/"), "aperçu de b : le chemin de la photo de B, et seulement elle");
verif(!!(await erreur(db, `select public.supprimer_mon_compte('oui')`)), "sans le mot SUPPRIMER : refusé");
await comme("b@x.fr", UB, E2);
verif((await compter("ruches", E2)) === 2, "après le refus, rien n'est effacé");

await comme("b@x.fr", UB, E2);
const rb = (await val(`select public.supprimer_mon_compte('SUPPRIMER') r`)).r;
verif(rb.effacees === 1 && rb.quittees === 0, `b supprimé : 1 exploitation effacée (${JSON.stringify(rb)})`);
await db.exec("reset role");
verif((await val(`select count(*)::int n from public.exploitations where id = '${E2}'`)).n === 0, "exploitation B effacée");
verif((await compter("ruches", E2)) === 0 && (await compter("visites", E2)) === 0 && (await compter("visite_photos", E2)) === 0, "ses ruches, visites et photos aussi (cascade)");
verif((await val(`select count(*)::int n from auth.users where id = '${UB}'`)).n === 0, "compte de connexion de b effacé");
verif((await val(`select count(*)::int n from public.profils where email = 'b@x.fr'`)).n === 0, "profil de b effacé");
verif((await val(`select count(*)::int n from public.membres_v1 where email = 'b@x.fr'`)).n === 0, "ancienne ligne d'accès de b effacée");
verif((await compter("ruches", E1)) === avantE1.ruches && (await val(`select count(*)::int n from auth.users`)).n === 2, "A et les autres comptes intacts");

// a, responsable de A partagée avec a2 (membre) et l (lecteur) : il la quitte, a2 devient responsable, données gardées.
await comme("a@x.fr", UA, E1);
const apA = (await val(`select public.compte_a_supprimer() a`)).a;
verif(apA.effacees.length === 0 && apA.quittees.length === 1 && apA.quittees[0].nom === "Rucher A" && apA.photos.length === 0,
  "aperçu de a : Rucher A quittée, aucune photo à effacer");
const ra = (await val(`select public.supprimer_mon_compte('SUPPRIMER') r`)).r;
verif(ra.effacees === 0 && ra.quittees === 1, "a supprimé : 1 exploitation quittée");
await db.exec("reset role");
const roles = (await db.query(`select email, role from public.membres where exploitation_id = '${E1}' order by email`)).rows;
verif(!roles.some((m) => m.email === "a@x.fr") && roles.find((m) => m.email === "a2@x.fr")?.role === "responsable" && roles.find((m) => m.email === "l@x.fr")?.role === "lecteur",
  `A : a retiré, a2 (membre) devient responsable, l reste lecteur (${JSON.stringify(roles)})`);
verif((await compter("ruches", E1)) === avantE1.ruches && (await compter("visites", E1)) === avantE1.visites && (await compter("ventes", E1)) === avantE1.ventes,
  "les données de A restent à l'exploitation");
verif((await val(`select count(*)::int n from public.journal_audit where auteur = 'a@x.fr'`)).n === 0
  && (await val(`select count(*)::int n from public.invitations where cree_par = 'a@x.fr'`)).n === 0, "l'adresse de a est retirée du journal d'audit et des invitations");
verif((await val(`select count(*)::int n from auth.users where id = '${UA}'`)).n === 0 && (await val(`select count(*)::int n from public.profils where email = 'a@x.fr'`)).n === 0,
  "compte et profil de a effacés");

// Un compte ne peut pas viser quelqu'un d'autre : la fonction n'a pas de paramètre de personne.
await comme("a2@x.fr", UA2, E1);
await db.query(`select public.compte_a_supprimer()`);
await db.exec("reset role");
verif((await val(`select count(*)::int n from auth.users where id = '${UA2}'`)).n === 1, "l'aperçu ne supprime rien");

fin("Migration 022");
