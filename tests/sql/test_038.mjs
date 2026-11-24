// Tests SQL de la migration 038 : carte de fidélité (ventes.remise_fidelite, creer_vente).
// Usage (depuis la racine du dépôt) : node tests/sql/test_038.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "037-remises-offres.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/038-carte-fidelite.sql", "utf8");
try { await db.exec(sql); verif(true, "038 appliquée sur une base avec données"); } catch (e) { verif(false, "038 : " + e.message); fin("Migration 038"); }
try { await db.exec(sql); verif(true, "038 relançable"); } catch (e) { verif(false, "038 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const LOT = id(1, 7), CLIENT = id(1, 8); // lot L1 : 10 € le pot
await en(db, "a@x.fr", E1);
verif(Number((await val(`select remise_fidelite from public.ventes where id = '${id(1, 9)}'`)).remise_fidelite) === 0, "vente existante : remise_fidelite 0");

// Récompense seule : un pot offert.
const V1 = "c0000001-0000-4000-8000-000000000001";
verif(!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: V1, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 3, remise: 10 }], remise_fidelite: 10 })])), "vente avec la récompense de la carte");
const v1 = await val(`select remise_fidelite, remise_offre, remise_manuelle from public.ventes where id = '${V1}'`);
verif(Number(v1.remise_fidelite) === 10 && Number(v1.remise_offre) === 0 && Number(v1.remise_manuelle) === 0, "remise_fidelite gardée à part");

// Avec une offre et une remise ponctuelle : le total des lignes doit tout couvrir.
const V2 = "c0000002-0000-4000-8000-000000000002";
verif(!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: V2, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 5, remise: 22 }],
  remise_offre: 10, remise_manuelle: 2, remise_fidelite: 10, remise_libelle: "−2 €" })])), "offre + remise + carte : acceptée");
verif(!!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 2, remise: 10 }], remise_offre: 0 })])), "remise des lignes sans détail : refusée");
verif(!!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 2, remise: 0 }], remise_fidelite: 10 })])), "carte annoncée sans ligne remisée : refusée");
verif(!!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 2, remise: -5 }], remise_fidelite: -5 })])), "carte négative : refusée");

// Version d'avant : sans remise_fidelite, comme en 037.
const V3 = "c0000003-0000-4000-8000-000000000003";
verif(!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ id: V3, client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1, remise: 1 }], remise_manuelle: 1, remise_libelle: "−1 €" })])), "v5.77 : vente avec remise ponctuelle, sans carte");
verif(Number((await val(`select remise_fidelite from public.ventes where id = '${V3}'`)).remise_fidelite) === 0, "v5.77 : remise_fidelite 0");
verif(!!(await erreur(db, `update public.ventes set remise_fidelite = -1 where id = '${V3}'`)), "contrainte : remise_fidelite ≥ 0");

await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.creer_vente($1::jsonb)`, [JSON.stringify({ client_id: CLIENT, lignes: [{ lot_id: LOT, quantite: 1, remise: 10 }], remise_fidelite: 10 })])), "lecteur : pas de vente");
fin("Migration 038");
