// Tests SQL de la migration 037 : offres de vente (promotions), remise des lignes, creer_vente avec remises.
// Usage (depuis la racine du dépôt) : node tests/sql/test_037.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "036-sante-varroa.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/037-remises-offres.sql", "utf8");
try { await db.exec(sql); verif(true, "037 appliquée sur une base avec données"); } catch (e) { verif(false, "037 : " + e.message); fin("Migration 037"); }
try { await db.exec(sql); verif(true, "037 relançable"); } catch (e) { verif(false, "037 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const vente = (p) => db.query(`select public.creer_vente($1::jsonb) as id`, [JSON.stringify(p)]);
const LOT = id(1, 7), CLIENT = id(1, 8); // lot L1 : 500 g à 10 €, 20 pots, 2 déjà vendus

// Données d'avant : aucune remise.
await en(db, "a@x.fr", E1);
const l0 = await val(`select remise from public.vente_lignes where id = '${id(1, 10)}'`);
verif(l0 && Number(l0.remise) === 0, "ligne existante : remise 0");
const v0 = await val(`select remise_offre, remise_manuelle, promotion_id, remise_motif from public.ventes where id = '${id(1, 9)}'`);
verif(Number(v0.remise_offre) === 0 && Number(v0.remise_manuelle) === 0 && v0.promotion_id === null && v0.remise_motif === "", "vente existante : aucune remise");

// Offres : un membre crée les quatre modèles.
await en(db, "a2@x.fr", E1);
const P1 = "a0000001-0000-4000-8000-000000000001";
verif(!(await erreur(db, `insert into public.promotions (id, nom, type, produits, achetes, offerts) values ('${P1}', '4 achetés, 1 offert', 'xy', array['Miel|500 g'], 4, 1)`)), "offre X achetés, Y offerts");
verif(!(await erreur(db, `insert into public.promotions (nom, type, quantite, prix_lot, fin) values ('Coffret', 'lot', 3, 25, '2026-12-31')`)), "offre lot à prix rond");
verif(!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur, minimum, debut, fin) values ('Noël', 'remise', 'pct', 10, 30, '2026-12-12', '2026-12-14')`)), "offre remise en %");
verif(!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur, clients) values ('Revendeur', 'client', 'pct', 20, array['${CLIENT}']::uuid[])`)), "offre prix pour un client");
verif((await val(`select exploitation_id, auteur, actif from public.promotions where id = '${P1}'`)).exploitation_id === E1, "offre rangée dans l'exploitation ouverte");

// Paramètres incohérents : refusés.
verif(!!(await erreur(db, `insert into public.promotions (nom, type, achetes) values ('Incomplet', 'xy', 4)`)), "X achetés sans Y offerts : refusé");
verif(!!(await erreur(db, `insert into public.promotions (nom, type, quantite) values ('Sans prix', 'lot', 3)`)), "lot sans prix : refusé");
verif(!!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur) values ('Trop', 'remise', 'pct', 120)`)), "remise de 120 % : refusée");
verif(!!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur) values ('Personne', 'client', 'pct', 20)`)), "prix client sans client ni cercle : refusé");
verif(!!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur, debut, fin) values ('Dates', 'remise', 'eur', 5, '2026-12-14', '2026-12-12')`)), "fin avant le début : refusée");
verif(!!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur) values ('  ', 'remise', 'eur', 5)`)), "nom vide : refusé");
verif(!(await erreur(db, `update public.promotions set actif = false where id = '${P1}'`)), "interrupteur : offre coupée");
await db.exec(`update public.promotions set actif = true where id = '${P1}'`);

// Lecteur et autre exploitation.
await en(db, "l@x.fr", E1);
verif((await val(`select count(*)::int n from public.promotions`)).n === 4, "lecteur : voit les offres");
verif(!!(await erreur(db, `insert into public.promotions (nom, type, mode, valeur) values ('Lecteur', 'remise', 'eur', 1)`)), "lecteur : ne crée pas d'offre");
await en(db, "b@x.fr", E2);
verif((await val(`select count(*)::int n from public.promotions`)).n === 0, "autre exploitation : ne voit pas les offres");
await db.exec(`update public.promotions set nom = 'piraté' where id = '${P1}'`).catch(() => {});
await en(db, "a@x.fr", E1);
verif((await val(`select nom from public.promotions where id = '${P1}'`)).nom === "4 achetés, 1 offert", "autre exploitation : offre intacte");

// Vente avec l'offre : 5 pots, 1 offert (10 €) et remise ponctuelle de 10 % sur le reste (4 €).
const V1 = "b0000001-0000-4000-8000-000000000001";
verif(!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: V1, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 5, remise: 14 }],
  paye: true, mode: "Espèces", promotion_id: P1, promotion_nom: "4 achetés, 1 offert", remise_offre: 10, remise_manuelle: 4, remise_motif: "Client fidèle", remise_libelle: "−10 %" })])), "vente avec offre et remise enregistrée");
const v1 = await val(`select promotion_id, promotion_nom, remise_offre, remise_manuelle, remise_motif, remise_libelle from public.ventes where id = '${V1}'`);
verif(v1.promotion_id === P1 && v1.promotion_nom === "4 achetés, 1 offert" && Number(v1.remise_offre) === 10 && Number(v1.remise_manuelle) === 4
  && v1.remise_motif === "Client fidèle" && v1.remise_libelle === "−10 %", `détail de la vente (${JSON.stringify(v1)})`);
const l1 = await val(`select quantite, prix_unitaire, remise from public.vente_lignes where vente_id = '${V1}'`);
verif(l1.quantite === 5 && Number(l1.prix_unitaire) === 10 && Number(l1.remise) === 14, "ligne : prix du lot gardé, remise à part");
verif((await val(`select pots_restants from public.lots_stock where id = '${LOT}'`)).pots_restants === 13, "le pot offert sort du stock (20 − 2 − 5 = 13)");

// Rejouée par la file d'envoi : rien de plus.
await vente({ id: V1, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 5, remise: 14 }], remise_offre: 10, remise_manuelle: 4 });
verif((await val(`select count(*)::int n from public.vente_lignes where vente_id = '${V1}'`)).n === 1, "vente rejouée : pas de doublon");

// Remise ponctuelle sans motif : acceptée (motif facultatif).
const V2 = "b0000002-0000-4000-8000-000000000002";
verif(!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: V2, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1, remise: 2 }], remise_manuelle: 2, remise_libelle: "−2 €" })])), "remise sans motif : acceptée");
verif((await val(`select remise_motif from public.ventes where id = '${V2}'`)).remise_motif === "", "motif vide");

// Refus : remise plus forte que la ligne, négative, total incohérent ; rien n'est enregistré.
const refus = async (p, msg, attendu) => {
  const e = await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ client_id: CLIENT, ...p })]);
  verif(!!e && (!attendu || attendu.test(e.message)), `${msg}${e ? " (" + e.message + ")" : ""}`);
};
const avant = (await val(`select count(*)::int n from public.ventes`)).n;
await refus({ lignes: [{ lot_id: LOT, quantite: 1, remise: 12 }], remise_manuelle: 12 }, "remise plus forte que la ligne : refusée", /plus forte/);
await refus({ lignes: [{ lot_id: LOT, quantite: 1, remise: -1 }], remise_manuelle: -1 }, "remise négative : refusée", /négative/);
await refus({ lignes: [{ lot_id: LOT, quantite: 2, remise: 5 }], remise_offre: 10 }, "total des lignes différent du détail : refusé", /incohérente/);
await refus({ lignes: [{ lot_id: LOT, quantite: 2 }], remise_offre: 10 }, "remise annoncée sans ligne remisée : refusée", /incohérente/);
verif((await val(`select count(*)::int n from public.ventes`)).n === avant, "ventes refusées : aucune enregistrée");
verif(!!(await erreur(db, `update public.vente_lignes set remise = 999 where vente_id = '${V1}'`)), "contrainte : remise de ligne plafonnée au montant");

// Ancienne version : vente sans remise, comme avant.
const V3 = "b0000003-0000-4000-8000-000000000003";
verif(!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: V3, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1 }], paye: true, vendu_par: "Johan" })])), "ancienne version : vente sans remise");
const v3 = await val(`select v.vendu_par, v.promotion_id, v.remise_offre, l.remise from public.ventes v join public.vente_lignes l on l.vente_id = v.id where v.id = '${V3}'`);
verif(v3.vendu_par === "Johan" && v3.promotion_id === null && Number(v3.remise_offre) === 0 && Number(v3.remise) === 0, "ancienne version : remises à 0, vendu par gardé");

// Offre citée sans remise ou inconnue : pas rattachée.
const V4 = "b0000004-0000-4000-8000-000000000004";
await vente({ id: V4, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1 }], promotion_id: P1, promotion_nom: "x" });
verif((await val(`select promotion_id, promotion_nom from public.ventes where id = '${V4}'`)).promotion_id === null, "offre sans remise : pas rattachée");

// Offre d'une autre exploitation : ignorée.
await en(db, "b@x.fr", E2);
const PB = "a0000009-0000-4000-8000-000000000009";
await db.exec(`insert into public.promotions (id, nom, type, mode, valeur) values ('${PB}', 'B', 'remise', 'eur', 1)`);
await en(db, "a@x.fr", E1);
const V5 = "b0000005-0000-4000-8000-000000000005";
await vente({ id: V5, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1, remise: 1 }], promotion_id: PB, promotion_nom: "B", remise_offre: 1 });
verif((await val(`select promotion_id from public.ventes where id = '${V5}'`)).promotion_id === null, "offre d'une autre exploitation : ignorée");

// Supprimer une offre ne touche pas les ventes passées.
await db.exec(`delete from public.promotions where id = '${P1}'`);
const v1b = await val(`select promotion_id, promotion_nom, remise_offre from public.ventes where id = '${V1}'`);
verif(v1b.promotion_id === null && v1b.promotion_nom === "4 achetés, 1 offert" && Number(v1b.remise_offre) === 10, "offre supprimée : la vente garde son nom et sa remise");

// Lecteur : pas de vente.
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1, remise: 1 }], remise_manuelle: 1 })])), "lecteur : pas de vente");
fin("Migration 037");
