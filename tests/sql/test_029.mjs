// Tests SQL de la migration 029 : offres, abonnements et gouttes d'API (IT-27, première partie).
// Usage (depuis la racine du dépôt) : node tests/sql/test_029.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "028-assemblage-ruches.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/029-offres-gouttes.sql", "utf8");
try { await db.exec(sql); verif(true, "029 appliquée sur une base avec données"); } catch (e) { verif(false, "029 : " + e.message); fin("Migration 029"); }
try { await db.exec(sql); verif(true, "029 relançable"); } catch (e) { verif(false, "029 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const offre = async () => (await val(`select public.mon_offre() o`)).o;

// Catalogue : lisible par tous, jamais modifiable.
await en(db, null, null);
const cat = (await db.query(`select id, gouttes_mois, prix_an_cts from public.offres order by ordre`)).rows;
verif(cat.map((o) => `${o.id}:${o.gouttes_mois}:${o.prix_an_cts}`).join() === "decouverte:30:0,rucher:200:3900,exploitation:600:11900", "catalogue lisible sans connexion : 30, 200 et 600 gouttes");
verif(!!(await erreur(db, `update public.offres set gouttes_mois = 99999`)), "anonyme : catalogue non modifiable");
verif(!!(await erreur(db, `select public.mon_offre()`)), "anonyme : mon_offre refusée");

// Sans abonnement : Découverte, 30 gouttes.
await en(db, "a@x.fr", E1);
let o = await offre();
verif(o.offre === "decouverte" && o.abonnement === null, "sans abonnement : Découverte");
verif(Number(o.gouttes.total) === 30 && o.gouttes.forfait === 30, "30 gouttes disponibles");
verif(o.usage.ruches === 2 && o.usage.membres === 3 && o.responsable === true && o.admin === false, `usage et rôle : ${JSON.stringify(o.usage)}`);
verif(!!(await erreur(db, `update public.offres set gouttes_mois = 99999`)), "membre : catalogue non modifiable");
verif(!!(await erreur(db, `insert into public.abonnements (exploitation_id, offre, statut) values ('${E1}', 'exploitation', 'actif')`)), "s'offrir un abonnement en écrivant la table : refusé");
verif(!!(await erreur(db, `insert into public.gouttes_mouvements (exploitation_id, nature, reserve, quantite) values ('${E1}', 'recharge', 'recharge', 1000)`)), "se créditer des gouttes en écrivant la table : refusé");

// Dépenses : coût réel, forfait d'abord.
let r = Number((await val(`select public.gouttes_debiter(2.5, 'question', '{"modele":"claude-sonnet-5-5"}') r`)).r);
verif(r === 27.5, `question à 2,5 gouttes : ${r} restantes`);
r = Number((await val(`select public.gouttes_debiter(0.004, 'question') r`)).r);
verif(r === 27.49, `une réponse rapide coûte au moins 0,01 goutte : ${r}`);
verif(!!(await erreur(db, `select public.gouttes_debiter(-50, 'question')`)), "quantité négative refusée (on ne peut pas se créditer)");
verif(!!(await erreur(db, `select public.gouttes_debiter(0, 'question')`)), "quantité nulle refusée");
verif(!!(await erreur(db, `select public.gouttes_debiter(3, 'recharge')`)), "nature « recharge » refusée");

await en(db, "a2@x.fr", E1);
r = Number((await val(`select public.gouttes_debiter(4.4, 'facture') r`)).r);
verif(Math.abs(r - 23.09) < 1e-9, `gouttes partagées : la facture de a2@ part du même réservoir (${r})`);
o = await offre();
const pn = Object.fromEntries(o.mois.par_nature.map((x) => [x.nature, x]));
verif(pn.question.nb === 2 && Number(pn.facture.gouttes) === 4.4, `détail du mois par nature : ${JSON.stringify(o.mois.par_nature)}`);
verif(o.mois.par_membre.length === 2 && o.mois.par_membre[0].email === "a2@x.fr", "détail du mois par membre");
verif(o.responsable === false, "a2@ n'est pas responsable");
verif(/responsable/.test(String(await erreur(db, `select public.demarrer_essai('rucher')`))), "membre : essai refusé en français");

// Dépasser le forfait : la recharge (vide) passe un peu sous zéro, la réponse a déjà été servie.
r = Number((await val(`select public.gouttes_debiter(30, 'question') r`)).r);
verif(r < 0, `dernière réponse servie : solde ${r}`);
verif(Number((await val(`select public.gouttes_disponibles() g`)).g) < 0, "gouttes_disponibles négatif : la fonction serveur refusera la suivante");

// B ne voit rien de A.
await en(db, "b@x.fr", E2);
verif((await db.query(`select * from public.gouttes_mouvements`)).rows.length === 0, "b@ ne voit pas les gouttes de A");
verif(Number((await offre()).gouttes.total) === 30, "B garde ses 30 gouttes");
await en(db, "b@x.fr", E1);
verif(!!(await erreur(db, `select public.gouttes_debiter(1, 'question')`)), "b@ ne peut pas dépenser les gouttes de A");

// Essai : responsable, une fois.
await en(db, "a@x.fr", E1);
o = (await val(`select public.demarrer_essai('rucher') o`)).o;
verif(o.offre === "rucher" && o.abonnement.statut === "essai" && o.gouttes.forfait === 200, "essai Rucher : 200 gouttes ce mois");
verif(Number(o.gouttes.total) > 160 && Number(o.gouttes.total) < 170, `le mois déjà dépensé est déduit, la dette de recharge aussi (${o.gouttes.total})`);
verif(/Une offre est déjà en cours|déjà été utilisé/.test(String(await erreur(db, `select public.demarrer_essai('exploitation')`))), "pas de second essai pendant le premier");
verif(!!(await erreur(db, `select public.demarrer_essai('decouverte')`)), "Découverte n'a pas d'essai");
o = (await val(`select public.resilier_abonnement() o`)).o;
verif(o.offre === "decouverte" && o.abonnement.statut === "resilie", "résilier un essai : retour immédiat à Découverte");
verif(/déjà été utilisé/.test(String(await erreur(db, `select public.demarrer_essai('exploitation')`))), "essai déjà utilisé : refusé en français");

// Équipe Apiviz.
verif(/équipe Apiviz/.test(String(await erreur(db, `select public.admin_definir_offre('exploitation')`))), "responsable sans être de l'équipe : changer d'offre refusé");
verif(!!(await erreur(db, `select public.admin_crediter_gouttes(500)`)), "responsable sans être de l'équipe : crédit refusé");
verif(!!(await erreur(db, `select * from public.administrateurs_apiviz`)), "liste de l'équipe illisible");
verif(!!(await erreur(db, `insert into public.administrateurs_apiviz values ('a@x.fr')`)), "s'ajouter à l'équipe : refusé");
await db.exec(`reset role; insert into public.administrateurs_apiviz values ('b@x.fr');`);
await en(db, "b@x.fr", E2);
verif((await offre()).admin === true, "b@ est de l'équipe");
o = (await val(`select public.admin_definir_offre('exploitation', 'actif', null, '${E1}') o`)).o;
verif(o.offre === "exploitation", "l'équipe pose Exploitation sur A sans en être membre");
r = Number((await val(`select public.admin_crediter_gouttes(400, 'Sachet de test', '${E1}') r`)).r);
verif(r > 900 && r < 1000, `400 gouttes créditées à A (${r})`);
await en(db, "a@x.fr", E1);
o = await offre();
verif(o.offre === "exploitation" && o.gouttes.forfait === 600 && Number(o.gouttes.recharge) > 360, `A voit son offre Exploitation et sa recharge (${o.gouttes.recharge})`);
await db.exec(`reset role; update public.abonnements set fin = now() - interval '1 day' where exploitation_id = '${E1}';`);
await en(db, "a@x.fr", E1);
verif((await offre()).offre === "decouverte", "échéance passée : retour à Découverte, la recharge reste");

// Mois suivant : le forfait repart de zéro dépense.
await db.exec(`reset role; update public.gouttes_mouvements set mois = mois - interval '1 month';`);
await en(db, "a@x.fr", E1);
verif((await offre()).gouttes.forfait_restant == 30, "nouveau mois : forfait entier");

// Les données métier ne bougent pas.
await db.exec("reset role");
verif((await val(`select count(*)::int n from public.ruches`)).n === 4, "aucune table métier touchée");
fin("Migration 029");
