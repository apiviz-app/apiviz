// Tests SQL de la migration 042 : comptes inactifs (préavis, retour, effacement) et journal des e-mails.
// Usage (depuis la racine du dépôt) : node tests/sql/test_042.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "041-supprimer-mes-donnees.sql" });
await deuxExploitations(db);
await donnees(db);
// Une demande 041 existante, avant 042 : doit prendre le motif « demande ».
await db.exec(`reset role; insert into public.comptes_a_supprimer (email) values ('ancien@x.fr');`);
const sql = fs.readFileSync("migrations/042-comptes-inactifs.sql", "utf8");
try { await db.exec(sql); verif(true, "042 appliquée sur une base avec données et une demande en cours"); } catch (e) { verif(false, "042 : " + e.message); fin("Migration 042"); }
try { await db.exec(sql); verif(true, "042 relançable"); } catch (e) { verif(false, "042 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const n = async (q) => (await val(`select count(*)::int as n from ${q}`)).n;
verif((await val("select motif from public.comptes_a_supprimer where email = 'ancien@x.fr'")).motif === "demande", "demande existante : motif « demande »");
await db.exec(`reset role; delete from public.comptes_a_supprimer;
  insert into auth.users (id, email, last_sign_in_at, created_at) values
    ('${id(9, 1)}', 'A2@x.fr', now() - interval '4 years', now() - interval '5 years'),
    ('${id(9, 2)}', 'a@x.fr', now() - interval '2 days', now() - interval '5 years'),
    ('${id(9, 3)}', 'b@x.fr', null, now() - interval '3 years 2 months'),
    ('${id(9, 4)}', 'equipe@x.fr', null, now() - interval '6 years');
  insert into public.profils (email, prenom) values ('a2@x.fr', 'Alex');
  insert into public.administrateurs_apiviz values ('equipe@x.fr');`);

// Rien pour l'application.
await en(db, "a2@x.fr", E1);
for (const q of ["select * from public.inactifs_a_prevenir()", "select public.prevenir_inactif('b@x.fr')", "select public.retirer_preavis('b@x.fr')",
  "select public.entretien_comptes()", "select public.courriel_a_envoyer('a2@x.fr', 'resiliation')", "select * from public.derniere_activite", "select * from public.courriels_envoyes"]) {
  verif(!!(await erreur(db, q)), "refusé à l'application : " + q);
}

// Repérage : 3 ans sans activité, équipe exclue, plus ancien d'abord.
await db.exec("reset role; set role service_role;");
let liste = (await db.query("select * from public.inactifs_a_prevenir()")).rows;
verif(liste.map((x) => x.email).join() === "a2@x.fr,b@x.fr", "inactifs : a2 (4 ans) puis b (jamais connecté, compte de 3 ans 2 mois) ; ni a ni l'équipe : " + JSON.stringify(liste));
verif(liste[0].prenom === "Alex" && liste[1].prenom === "", "prénom lu dans le profil, vide sinon");
verif((await db.query("select * from public.inactifs_a_prevenir(1)")).rows.length === 1, "limite respectée");
// Le jour noté par l'application compte autant qu'une connexion.
await db.exec("reset role; insert into public.derniere_activite (email, jour) values ('b@x.fr', current_date - 10); set role service_role;");
liste = (await db.query("select * from public.inactifs_a_prevenir()")).rows;
verif(liste.map((x) => x.email).join() === "a2@x.fr", "b a ouvert Apiviz il y a 10 jours : plus inactif");

// Préavis.
const quand = (await val("select public.prevenir_inactif('a2@x.fr') as q")).q;
const jours = Math.round((Date.parse(quand) - Date.now()) / 864e5);
verif(jours === 30, "préavis : effacement dans 30 jours");
verif((await val("select public.prevenir_inactif('a2@x.fr') as q")).q === null, "préavis déjà en cours : rien de plus");
verif((await val("select public.prevenir_inactif('inconnu@x.fr') as q")).q === null, "adresse inconnue : rien");
verif((await db.query("select * from public.inactifs_a_prevenir()")).rows.length === 0, "a2 prévenu : n'est plus proposé");
await db.exec("select public.retirer_preavis('a2@x.fr'); reset role;");
verif(await n("public.comptes_a_supprimer") === 0, "retirer_preavis : annulé (e-mail non parti)");
await db.exec("set role service_role; select public.prevenir_inactif('a2@x.fr')");

// La personne voit le motif ; revenir annule le préavis.
await en(db, "a2@x.fr", E1);
verif((await val("select public.ma_suppression() as m")).m.motif === "inactivite", "ma_suppression : motif « inactivite »");
verif((await val("select public.signaler_activite() as r")).r === true, "signaler_activite : préavis annulé (vrai)");
verif((await val("select public.ma_suppression() as m")).m === null, "plus de demande");
verif((await val("select public.signaler_activite() as r")).r === false, "deuxième appel : rien à annuler (faux)");
await db.exec("reset role");
verif(await n(`public.derniere_activite where email = 'a2@x.fr' and jour = (now() at time zone 'Europe/Paris')::date`) === 1, "jour noté");
await en(db, "", null);
verif(!!(await erreur(db, "select public.signaler_activite()")), "sans connexion : refusé");
await db.exec("reset role");
verif(await n("public.derniere_activite") === 2, "rien de noté sans connexion");

// Une demande de la personne (041) n'est pas annulée par son activité.
await en(db, "a2@x.fr", E1);
await db.exec(`select public.demander_suppression('{"${E1}": "laisser"}', 'SUPPRIMER')`);
await db.exec("select public.signaler_activite()");
verif((await val("select public.ma_suppression() as m")).m?.motif === "demande", "demande volontaire : gardée malgré l'activité");
await db.exec("select public.annuler_suppression()");

// Échéance : préavis dû, personne revenue entre-temps → jamais effacée, et l'entretien retire le préavis.
await db.exec(`reset role; delete from public.derniere_activite where email = 'a2@x.fr';
  set role service_role; select public.prevenir_inactif('a2@x.fr');
  reset role; update public.comptes_a_supprimer set demande_le = now() - interval '31 days', effacement_le = now() - interval '1 day';`);
await db.exec("set role service_role");
verif((await db.query("select * from public.suppressions_dues()")).rows.map((x) => x.email).join() === "a2@x.fr", "préavis échu, pas revenue : due");
await db.exec(`reset role; update auth.users set last_sign_in_at = now() - interval '2 days' where email = 'A2@x.fr'; set role service_role;`);
verif((await db.query("select * from public.suppressions_dues()")).rows.length === 0, "revenue (connexion) après le préavis : pas due");
const ent = (await val("select public.entretien_comptes() as e")).e;
await db.exec("reset role");
verif(ent.preavis_caducs === 1 && await n("public.comptes_a_supprimer") === 0, "entretien : préavis caduc retiré " + JSON.stringify(ent));

// Journal des e-mails : pas deux fois dans l'heure.
await db.exec("set role service_role");
verif((await val("select public.courriel_a_envoyer('A2@x.fr', 'preavis-inactivite') as r")).r === true, "premier e-mail : à envoyer, noté");
verif((await val("select public.courriel_a_envoyer('a2@x.fr', 'preavis-inactivite') as r")).r === false, "même nature dans l'heure : non");
verif((await val("select public.courriel_a_envoyer('a2@x.fr', 'suppression-demandee') as r")).r === true, "autre nature : oui");
verif(!!(await erreur(db, "select public.courriel_a_envoyer('a2@x.fr', 'publicite')")), "nature inconnue : refusée");

// Entretien : traces d'un compte disparu.
await db.exec(`reset role; insert into public.derniere_activite (email) values ('parti@x.fr');
  insert into public.courriels_envoyes (email, nature) values ('parti@x.fr', 'resiliation'); set role service_role;`);
const ent2 = (await val("select public.entretien_comptes() as e")).e;
await db.exec("reset role");
verif(ent2.activites_orphelines === 1 && ent2.courriels_effaces === 1 && await n("public.derniere_activite where email = 'parti@x.fr'") === 0, "entretien : traces d'un compte disparu effacées");
verif(await n("public.courriels_envoyes where email = 'a2@x.fr'") === 2, "les e-mails d'un compte existant restent");

// Effacement d'un compte prévenu (fonction 041) : exploitations partagées laissées aux autres.
await db.exec(`set role service_role; select public.prevenir_inactif('a2@x.fr');
  reset role; update public.comptes_a_supprimer set effacement_le = now() - interval '1 minute';
  update auth.users set last_sign_in_at = now() - interval '4 years' where email = 'A2@x.fr'; set role service_role;`);
const r = (await val("select public.effacer_compte_du('a2@x.fr') as r")).r;
await db.exec("reset role");
verif(r && r.quittees === 1 && r.effacees === 0 && await n(`public.exploitations where id = '${E1}'`) === 1, "effacement après préavis : exploitation partagée laissée aux autres");
fin("Migration 042");
