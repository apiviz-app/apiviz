// Tests SQL de la migration 026 : commandes en ligne (page publique, commandes reçues, livraison).
// Usage (depuis la racine du dépôt) : node tests/sql/test_026.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "025-factures-fichiers.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/026-commandes-en-ligne.sql", "utf8");
try { await db.exec(sql); verif(true, "026 appliquée sur une base avec données"); } catch (e) { verif(false, "026 : " + e.message); fin("Migration 026"); }
try { await db.exec(sql); verif(true, "026 relançable"); } catch (e) { verif(false, "026 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
const J = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const cmd = (x = {}) => JSON.stringify({ nom: "Marie L.", telephone: "06 12 34 56 78", retrait: "Samedi matin",
  lignes: [{ miel: "Toutes fleurs", format_g: 500, prix: 10, quantite: 3 }], ...x });

// Le responsable de A ouvre sa boutique.
await en(db, "a@x.fr", E1);
verif(!(await erreur(db, `insert into public.boutiques (jeton, ouverte, message, retraits) values ('${J}', false, 'Bonjour', '[{"nom":"Samedi matin","quand":"10 h"}]')`)), "membre : crée la boutique de son exploitation");
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `update public.boutiques set ouverte = true`)) || (await val(`select ouverte from public.boutiques`)).ouverte === false, "lecteur : ne peut pas ouvrir la boutique");

// Page publique : boutique fermée, rien à voir.
await en(db, null, null);
verif((await val(`select public.boutique_publique('${J}') r`)).r.ouverte === false, "anonyme : boutique fermée, rien d'autre");
verif(/fermée/.test(String(await erreur(db, `select public.passer_commande('${J}', '${cmd()}'::jsonb)`))), "anonyme : commande refusée tant que c'est fermé");
await en(db, "a@x.fr", E1);
await db.exec(`update public.boutiques set ouverte = true`);

await en(db, null, null);
const pub = (await val(`select public.boutique_publique('${J}') r`)).r;
verif(pub.ouverte && pub.nom === "Rucher A" && pub.produits.length === 1 && pub.produits[0].disponibles === 18, `anonyme : nom, retraits, 18 pots disponibles (${JSON.stringify(pub.produits)})`);
verif(!JSON.stringify(pub).includes("Client") && !JSON.stringify(pub).includes("L1"), "anonyme : ni client ni code de lot");
verif((await val(`select public.boutique_publique('inconnu') r`)).r.ouverte === false, "jeton inconnu : fermé");
verif(!!(await erreur(db, `select * from public.commandes`)), "anonyme : aucune lecture des commandes");
verif(!!(await erreur(db, `select * from public.boutiques`)), "anonyme : aucune lecture des boutiques");
verif(!!(await erreur(db, `insert into public.commandes (exploitation_id, nom, telephone, lignes) values ('${E1}', 'X', '0600000000', '[]')`)), "anonyme : pas d'écriture directe");

const id1 = "cccccccc-0000-4000-8000-000000000001";
verif(!(await erreur(db, `select public.passer_commande('${J}', '${cmd({ id: id1 })}'::jsonb)`)), "anonyme : commande passée");
verif(!(await erreur(db, `select public.passer_commande('${J}', '${cmd({ id: id1 })}'::jsonb)`)), "même commande relancée : pas de doublon");
verif((await val(`select public.boutique_publique('${J}') r`)).r.produits[0].disponibles === 15, "3 pots réservés : 15 disponibles");
verif(/reste que 15/.test(String(await erreur(db, `select public.passer_commande('${J}', '${cmd({ lignes: [{ miel: "Toutes fleurs", format_g: 500, prix: 10, quantite: 16 }] })}'::jsonb)`))), "plus que le stock : refus avec le reste");
verif(/plus disponible/.test(String(await erreur(db, `select public.passer_commande('${J}', '${cmd({ lignes: [{ miel: "Toutes fleurs", format_g: 500, prix: 1, quantite: 1 }] })}'::jsonb)`))), "prix trafiqué : refusé");
verif(/retrait/.test(String(await erreur(db, `select public.passer_commande('${J}', '${cmd({ retrait: "Ailleurs" })}'::jsonb)`))), "retrait hors liste : refusé");
verif(/téléphone/.test(String(await erreur(db, `select public.passer_commande('${J}', '${cmd({ telephone: "abc" })}'::jsonb)`))), "téléphone invalide : refusé");
verif(/nom/.test(String(await erreur(db, `select public.passer_commande('${J}', '${cmd({ nom: " " })}'::jsonb)`))), "nom vide : refusé");
verif(!!(await erreur(db, `select public.livrer_commande('${id1}', '{}'::jsonb)`)), "anonyme : ne peut pas livrer");

// Les membres de A voient la commande ; B ne la voit pas.
await en(db, "b@x.fr", E2);
verif((await db.query(`select * from public.commandes`)).rows.length === 0, "autre exploitation : ne voit pas la commande");
verif(!!(await erreur(db, `select public.livrer_commande('${id1}', '{}'::jsonb)`)), "autre exploitation : ne peut pas livrer");
await en(db, "a2@x.fr", E1);
const c = await val(`select * from public.commandes where id = '${id1}'`);
verif(c && c.statut === "nouvelle" && Number(c.total) === 30 && c.retrait === "Samedi matin", "membre : voit la commande (30 €, retrait)");

// Livraison : vente créée, client créé, stock baissé, commande livrée.
const vente = (await val(`select public.livrer_commande('${id1}', '{"paye": true, "mode": "Espèces", "vendu_par": "Pierre-Louis"}'::jsonb) v`)).v;
const c2 = await val(`select statut, vente_id from public.commandes where id = '${id1}'`);
verif(vente && c2.statut === "livree" && c2.vente_id === vente, "livraison : commande livrée, liée à la vente");
verif((await val(`select count(*)::int n from public.clients where telephone = '06 12 34 56 78' and cercle = 'Commande en ligne'`)).n === 1, "livraison : client créé");
verif((await val(`select pots_restants from public.lots_stock where code = 'L1'`)).pots_restants === 15, "livraison : 3 pots de moins en stock");
verif((await val(`select public.livrer_commande('${id1}', '{}'::jsonb) v`)).v === vente, "livrer deux fois : même vente, rien de plus");
await en(db, null, null);
verif((await val(`select public.boutique_publique('${J}') r`)).r.produits[0].disponibles === 15, "après livraison : plus réservé, mais vendu (15)");

// Une seconde commande du même client : le client est retrouvé par son téléphone.
const id2 = "cccccccc-0000-4000-8000-000000000002";
await db.exec(`select public.passer_commande('${J}', '${cmd({ id: id2, nom: "Marie Le Goff", telephone: "0612345678", lignes: [{ miel: "Toutes fleurs", format_g: 500, prix: 10, quantite: 1 }] })}'::jsonb)`);
await en(db, "a@x.fr", E1);
await db.exec(`select public.livrer_commande('${id2}', '{}'::jsonb)`);
verif((await val(`select count(*)::int n from public.clients where cercle = 'Commande en ligne'`)).n === 1, "même téléphone : même client");

// Lecteur : ne livre pas.
const id3 = "cccccccc-0000-4000-8000-000000000003";
await en(db, null, null);
await db.exec(`select public.passer_commande('${J}', '${cmd({ id: id3, lignes: [{ miel: "Toutes fleurs", format_g: 500, prix: 10, quantite: 1 }] })}'::jsonb)`);
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.livrer_commande('${id3}', '{}'::jsonb)`)), "lecteur : ne peut pas livrer");
await en(db, "a@x.fr", E1);
await db.exec(`update public.commandes set statut = 'annulee' where id = '${id3}'`);
verif(/annulée/.test(String(await erreur(db, `select public.livrer_commande('${id3}', '{}'::jsonb)`))), "commande annulée : pas de livraison");

// Limite : 30 commandes par heure et par boutique (stock suffisant pour ne buter que sur la limite).
await db.exec("reset role; update public.lots set pots_initiaux = 500;");
await en(db, null, null);
let limite = "";
for (let i = 0; i < 30 && !limite; i++) limite = String(await erreur(db, `select public.passer_commande('${J}', '${cmd({ lignes: [{ miel: "Toutes fleurs", format_g: 500, prix: 10, quantite: 1 }] })}'::jsonb)`) || "");
verif(/Trop de commandes/.test(limite), "plus de 30 commandes en une heure : refus");
fin("Migration 026");
