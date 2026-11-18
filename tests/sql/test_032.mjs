// Tests SQL de la migration 032 : d'autres produits que le miel (lots de produits, ventes, commandes en ligne).
// Usage (depuis la racine du dépôt) : node tests/sql/test_032.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "031-echanges-api.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/032-produits.sql", "utf8");
try { await db.exec(sql); verif(true, "032 appliquée sur une base avec données"); } catch (e) { verif(false, "032 : " + e.message); fin("Migration 032"); }
try { await db.exec(sql); verif(true, "032 relançable"); } catch (e) { verif(false, "032 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const H1 = "dddddddd-0000-4000-8000-000000000001", H2 = "dddddddd-0000-4000-8000-000000000002";
const prod = (x = {}) => JSON.stringify({ id: H1, code: "H26-01", categorie: "Hydromel", nom: "Hydromel sec", unite: "bouteille",
  format_libelle: "75 cl", prix: 14, quantite: 12, seuil: 3, ...x });

// Le miel existant ne change pas.
await en(db, "a@x.fr", E1);
const l1 = await val(`select categorie, unite, format_libelle, format_g, pots_restants from public.lots_stock where code = 'L1'`);
verif(l1 && l1.categorie === "Miel" && l1.unite === "pot" && l1.format_libelle === "" && l1.format_g === 500 && l1.pots_restants === 18,
  `miel existant : catégorie Miel, pots, format 500 g, stock intact (${JSON.stringify(l1)})`);
verif(!!(await erreur(db, `insert into public.lots (code, format_g, prix, pots_initiaux) values ('LM', null, 10, 5)`)), "miel sans format : refusé");

// Créer un produit.
verif(!(await erreur(db, `select public.creer_produit('${prod()}'::jsonb)`)), "membre : crée un lot d'hydromel");
verif(!(await erreur(db, `select public.creer_produit('${prod()}'::jsonb)`)), "même id relancé (file hors ligne) : pas de doublon");
const h = await val(`select * from public.lots_stock where id = '${H1}'`);
verif(h && h.categorie === "Hydromel" && h.miel === "Hydromel sec" && h.unite === "bouteille" && h.format_libelle === "75 cl"
  && h.format_g === null && Number(h.prix) === 14 && h.pots_restants === 12 && h.seuil === 3, `lot d'hydromel complet (${JSON.stringify(h)})`);
verif((await val(`select count(*)::int n from public.lots where code = 'H26-01'`)).n === 1, "un seul lot");
verif(/mise en pots/.test(String(await erreur(db, `select public.creer_produit('${prod({ id: H2, code: "X", categorie: "Miel" })}'::jsonb)`))), "miel : renvoyé vers la mise en pots");
verif(/nom/.test(String(await erreur(db, `select public.creer_produit('${prod({ id: H2, code: "X", nom: " " })}'::jsonb)`))), "nom vide : refusé");
verif(/existe déjà/.test(String(await erreur(db, `select public.creer_produit('${prod({ id: H2 })}'::jsonb)`))), "numéro de lot pris : refusé");
verif(/quantité/.test(String(await erreur(db, `select public.creer_produit('${prod({ id: H2, code: "X", quantite: -1 })}'::jsonb)`))), "quantité négative : refusée");
verif(!!(await erreur(db, `select public.creer_produit('${prod({ id: H2, code: "X", categorie: "x".repeat(41) })}'::jsonb)`)), "catégorie trop longue : refusée");

// Droits.
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.creer_produit('${prod({ id: H2, code: "H26-02" })}'::jsonb)`)), "lecteur : ne crée pas de produit");
await en(db, "b@x.fr", E2);
verif((await db.query(`select * from public.lots_stock where id = '${H1}'`)).rows.length === 0, "autre exploitation : ne voit pas le produit");
await en(db, null, null);
verif(!!(await erreur(db, `select public.creer_produit('${prod({ id: H2, code: "H26-02" })}'::jsonb)`)), "anonyme : refusé");

// Une vente mélange miel et hydromel.
await en(db, "a@x.fr", E1);
const client = (await val(`select id from public.clients where nom = 'Client 1'`)).id;
const lotMiel = (await val(`select id from public.lots where code = 'L1'`)).id;
verif(!(await erreur(db, `select public.creer_vente('${JSON.stringify({ client_id: client, lignes: [{ lot_id: lotMiel, quantite: 2 }, { lot_id: H1, quantite: 3 }] })}'::jsonb)`)), "vente miel + hydromel");
verif((await val(`select pots_restants from public.lots_stock where id = '${H1}'`)).pots_restants === 9, "hydromel : 3 bouteilles de moins");
verif((await val(`select pots_restants from public.lots_stock where code = 'L1'`)).pots_restants === 16, "miel : 2 pots de moins");

// Commandes en ligne : le produit est proposé, commandé et livré.
const J = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
await db.exec(`insert into public.boutiques (jeton, ouverte) values ('${J}', true)`);
await en(db, null, null);
const pub = (await val(`select public.boutique_publique('${J}') r`)).r;
const ph = pub.produits.find((p) => p.categorie === "Hydromel"), pm = pub.produits.find((p) => p.categorie === "Miel");
verif(pub.produits.length === 2 && pm && pm.format_g === 500 && ph && ph.format_libelle === "75 cl" && ph.unite === "bouteille" && ph.disponibles === 9,
  `page publique : miel puis hydromel (${JSON.stringify(pub.produits)})`);
const C1 = "cccccccc-0000-4000-8000-000000000032";
const cmd = JSON.stringify({ id: C1, nom: "Marie L.", telephone: "0612345678",
  lignes: [{ categorie: "Hydromel", miel: "Hydromel sec", format_g: null, format_libelle: "75 cl", prix: 14, quantite: 2 },
    { miel: "Toutes fleurs", format_g: 500, prix: 10, quantite: 1 }] });
verif(!(await erreur(db, `select public.passer_commande('${J}', '${cmd}'::jsonb)`)), "commande : hydromel et miel (ancien format de ligne)");
verif((await val(`select public.boutique_publique('${J}') r`)).r.produits.find((p) => p.categorie === "Hydromel").disponibles === 7, "2 bouteilles réservées : 7 disponibles");
verif(/reste que 7/.test(String(await erreur(db, `select public.passer_commande('${J}', '${JSON.stringify({ nom: "Paul", telephone: "0600000000", lignes: [{ categorie: "Hydromel", miel: "Hydromel sec", format_libelle: "75 cl", prix: 14, quantite: 8 }] })}'::jsonb)`))), "plus que le stock : refus avec le reste");
verif(/plus disponible/.test(String(await erreur(db, `select public.passer_commande('${J}', '${JSON.stringify({ nom: "Paul", telephone: "0600000000", lignes: [{ categorie: "Hydromel", miel: "Hydromel sec", format_libelle: "1 l", prix: 14, quantite: 1 }] })}'::jsonb)`))), "format inconnu : refusé");
await en(db, "a@x.fr", E1);
verif(!(await erreur(db, `select public.livrer_commande('${C1}', '{}'::jsonb)`)), "livraison de la commande");
verif((await val(`select pots_restants from public.lots_stock where id = '${H1}'`)).pots_restants === 7, "livraison : hydromel pris dans le bon lot");
verif((await val(`select pots_restants from public.lots_stock where code = 'L1'`)).pots_restants === 15, "livraison : miel pris dans le bon lot");

// Une commande passée avant 032 (lignes sans catégorie) reste livrable.
const C2 = "cccccccc-0000-4000-8000-000000000033";
await db.exec(`reset role; insert into public.commandes (id, exploitation_id, nom, telephone, lignes, total) values ('${C2}', '${E1}', 'Ancienne', '0611111111', '[{"miel":"Toutes fleurs","format_g":500,"prix":10,"quantite":1}]', 10)`);
await en(db, "a@x.fr", E1);
verif(!(await erreur(db, `select public.livrer_commande('${C2}', '{}'::jsonb)`)), "ancienne commande : livrée");
verif((await val(`select pots_restants from public.lots_stock where code = 'L1'`)).pots_restants === 14, "ancienne commande : un pot de miel de moins");
fin("Migration 032");
