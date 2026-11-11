// Tests SQL de la migration 018 (v5.30) : catalogue (famille, contenance), reprise d'un mouvement d'ouverture,
// stock = somme des mouvements dans tous les cas (achat, achat modifié ou supprimé, visite, entrée, écriture directe
// de l'ancienne version, mise en pots), achat en plusieurs lignes, mise en pots, idempotence, refus et isolation.
// Usage (depuis la racine du dépôt) : node tests/sql/test_018.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2, id } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "017-associes.sql" });
await deuxExploitations(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const lignes = async (q, p) => (await db.query(q, p)).rows;
const U = (n) => `dddddddd-0000-4000-8000-${String(n).padStart(12, "0")}`;

// --- Jeu de reprise : des articles saisis avec la v5.28 ---
await db.exec(`reset role;
  insert into public.articles (id, nom, type, unite, stock, seuil, exploitation_id) values
    ('${U(1)}', 'Pots 250 g vides', 'Consommable', 'unité', 75, 20, '${E1}'),
    ('${U(2)}', 'Couvercles', 'Consommable', 'unité', 150, 0, '${E1}'),
    ('${U(3)}', 'Candy', 'Consommable', 'kg', 0, 2, '${E1}'),
    ('${U(4)}', 'Extracteur', 'Équipement', 'unité', 1, 0, '${E1}'),
    ('${U(5)}', 'Pot 1 kg', 'Consommable', 'unité', 10, 0, '${E1}'),
    ('${U(9)}', 'Pots 500 g vides', 'Consommable', 'unité', 40, 0, '${E2}');
  insert into public.lots (id, code, format_g, prix, pots_initiaux, exploitation_id) values ('${U(20)}', 'L26-01', 500, 12, 10, '${E1}');`);

try { await db.exec(fs.readFileSync("migrations/018-stock-mouvements.sql", "utf8")); verif(true, "018 appliquée sur une base avec données"); }
catch (e) { verif(false, "018 : " + e.message); fin("Migration 018"); }
try { await db.exec(fs.readFileSync("migrations/018-stock-mouvements.sql", "utf8")); verif(true, "018 relançable"); }
catch (e) { verif(false, "018 (2e passage) : " + e.message); }

const ecart = async () => Number((await val(`select count(*) n from public.articles a
  where a.stock <> coalesce((select sum(quantite) from public.mouvements_stock m where m.article_id = a.id), 0)`)).n);

// Reprise.
let r = await lignes(`select nom, famille, contenance_g, duree_amort from public.articles order by nom`);
const art = Object.fromEntries(r.map((x) => [x.nom, x]));
verif(art["Pots 250 g vides"].famille === "emballage" && art["Pots 250 g vides"].contenance_g === 250, "reprise : pots 250 g → emballage, contenance 250 g");
verif(art["Pot 1 kg"].contenance_g === 1000, "reprise : pot 1 kg → contenance 1 000 g");
verif(art.Couvercles.famille === "emballage" && art.Couvercles.contenance_g === null, "reprise : couvercles → emballage, sans contenance");
verif(art.Candy.famille === "alimentation" && art.Extracteur.famille === "equipement" && art.Extracteur.duree_amort === 5, "reprise : candy → alimentation, extracteur → équipement amorti sur 5 ans");
r = await val(`select count(*) n, sum(quantite) s from public.mouvements_stock where type = 'ouverture' and origine = 'reprise'`);
verif(Number(r.n) === 5 && Number(r.s) === 75 + 150 + 1 + 10 + 40, "reprise : un mouvement d'ouverture par article dont le stock n'est pas nul (5), stock inchangé");
verif(Number((await val(`select stock from public.articles where id = $1`, [U(1)])).stock) === 75, "reprise : le stock n'est pas compté deux fois");
verif(await ecart() === 0, "après reprise : stock = somme des mouvements pour chaque article");

// Achat en plusieurs lignes : article existant, nouvel article Capex, ligne sans article.
await en(db, "a@x.fr", E1);
const achat = { id: U(100), date: "2026-11-03", piece: "F-123", achete_par: "Johan", paye_par: "Société", lignes: [
  { article_id: U(1), quantite: 150, montant: 63 },
  { article: { id: U(6), nom: "Maturateur 50 kg", type: "Équipement", famille: "equipement", duree_amort: 7 }, quantite: 1, montant: 180 },
  { article: { nom: "Étiquette 250 g", famille: "emballage", unite: "unité", poste: "Pots & étiquettes" }, quantite: 75, montant: 6.75 },
  { libelle: "Frais de port", montant: 9.9 },
] };
r = await val(`select public.enregistrer_achat($1) id`, [JSON.stringify(achat)]);
verif(r.id === U(100), "enregistrer_achat renvoie l'identifiant de l'achat");
r = await lignes(`select libelle, nature, duree_amort, quantite, achat_id, piece, categorie from public.depenses where achat_id = $1 order by montant`, [U(100)]);
verif(r.length === 4 && r.every((x) => x.achat_id === U(100) && x.piece === "F-123"), "achat : 4 dépenses reliées par achat_id, numéro de facture gardé");
verif(Number((await val(`select count(*) n from public.depenses where achat_id = $1 and achete_par = 'Johan' and paye_par = 'Société'`, [U(100)])).n) === 4, "achat : acheté par et payé avec (017) sur chaque ligne");
const nat = Object.fromEntries(r.map((x) => [x.libelle, x]));
verif(nat["Pots 250 g vides"].nature === "Consommable" && nat["Maturateur 50 kg"].nature === "Immobilisation" && nat["Maturateur 50 kg"].duree_amort === 7,
  "achat : Opex → Consommable, Capex → Immobilisation amortie sur la durée de l'article");
verif(nat["Frais de port"].nature === "Service" && nat["Frais de port"].quantite === null, "achat : ligne sans article → Service, sans stock");
verif(nat["Étiquette 250 g"].categorie === "Pots & étiquettes", "achat : le poste de l'article est repris");
verif(Number((await val(`select stock from public.articles where id = $1`, [U(1)])).stock) === 225, "achat : pots 250 g 75 → 225");
r = await val(`select stock, valeur, famille from public.articles where nom = 'Étiquette 250 g'`);
verif(Number(r.stock) === 75 && Number(r.valeur) === 0.09 && r.famille === "emballage", "achat : nouvel article créé, 75 en stock, prix unitaire 0,09 €");
verif(Number((await val(`select valeur from public.articles where id = $1`, [U(1)])).valeur) === 0.42, "achat : prix unitaire de l'article mis à jour (0,42 €)");
r = await val(`select count(*) n from public.mouvements_stock where origine = 'achat' and type = 'entree' and depense_id is not null`);
verif(Number(r.n) === 3, "achat : une entrée de stock par ligne avec article, reliée à sa dépense");
await val(`select public.enregistrer_achat($1)`, [JSON.stringify(achat)]);
verif(Number((await val(`select count(*) n from public.depenses where achat_id = $1`, [U(100)])).n) === 4 && Number((await val(`select stock from public.articles where id = $1`, [U(1)])).stock) === 225,
  "achat renvoyé deux fois (file hors ligne) : rien en double");
let e = await erreur(db, `select public.enregistrer_achat($1)`, [JSON.stringify({ id: U(101), lignes: [{ article_id: U(9), quantite: 1, montant: 1 }] })]);
verif(e && e.message === "Article introuvable", `achat avec un article de B : « ${e?.message} »`);
e = await erreur(db, `select public.enregistrer_achat($1)`, [JSON.stringify({ id: U(102), lignes: [{ article_id: U(1), montant: 1 }] })]);
verif(e && /quantité/.test(e.message), `achat sans quantité : « ${e?.message} »`);
verif(Number((await val(`select count(*) n from public.depenses where achat_id in ($1, $2)`, [U(101), U(102)])).n) === 0, "achat refusé : aucune ligne gardée");

// Achat modifié puis supprimé : le stock suit, avec une trace.
const dep = (await val(`select id from public.depenses where achat_id = $1 and article_id = $2`, [U(100), U(1)])).id;
await db.query(`update public.depenses set quantite = 140 where id = $1`, [dep]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(1)])).stock) === 215, "achat modifié (150 → 140) : stock 225 → 215");
await db.query(`update public.depenses set libelle = 'Pots' where id = $1`, [dep]);
verif(Number((await val(`select count(*) n from public.mouvements_stock where depense_id = $1`, [dep])).n) === 3, "libellé modifié : aucun mouvement de plus");
await db.query(`delete from public.depenses where id = $1`, [dep]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(1)])).stock) === 75, "achat supprimé : stock revenu à 75");
r = await val(`select note from public.mouvements_stock where article_id = $1 order by created_at desc, quantite limit 1`, [U(1)]);
verif(/supprimé/.test(r.note), "achat supprimé : le mouvement le dit");
verif(await ecart() === 0, "stock = somme des mouvements après modification et suppression");

// Visite avec intrant, entrée sans facture, écriture directe (ancienne version).
await db.exec(`reset role; insert into public.ruches (id, nom, exploitation_id) values ('${U(30)}', 'R1', '${E1}');`);
await en(db, "a@x.fr", E1);
await db.query(`update public.articles set stock = 5 where id = $1`, [U(3)]);
r = await val(`select type, quantite, origine from public.mouvements_stock where article_id = $1`, [U(3)]);
verif(r.type === "ajustement" && Number(r.quantite) === 5 && r.origine === "saisie", "écriture directe du stock (ancienne version) : notée comme ajustement de +5");
await db.query(`select public.creer_visite($1)`, [JSON.stringify({ ruche_id: U(30), activite: "Normale", provisions: "Moyennes", reine: "Vue", date_visite: "2026-11-05", intrants: [{ article_id: U(3), quantite: 2 }] })]);
r = await val(`select type, quantite, origine, date_mouvement::text d from public.mouvements_stock where article_id = $1 and origine = 'visite'`, [U(3)]);
verif(r?.type === "consommation" && Number(r.quantite) === -2 && r.d === "2026-11-05", "visite : consommation de 2 kg de candy à la date de la visite");
verif(Number((await val(`select stock from public.articles where id = $1`, [U(3)])).stock) === 3, "visite : candy 5 → 3");
await db.query(`select public.ajouter_stock($1)`, [JSON.stringify({ article_id: U(3), quantite: 4 })]);
r = await val(`select type, origine from public.mouvements_stock where article_id = $1 order by created_at desc, type limit 1`, [U(3)]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(3)])).stock) === 7 && r.type === "entree", "entrée sans facture : candy 3 → 7, mouvement d'entrée");
await db.query(`delete from public.visites where ruche_id = $1`, [U(30)]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(3)])).stock) === 9, "visite supprimée : le candy revient (7 → 9)");
verif(await ecart() === 0, "stock = somme des mouvements après visite, entrée et écriture directe");

// Mise en pots.
const pots = (n, intr, x = {}) => ({ id: U(200 + n), code: "L26-1" + n, miel: "Toutes fleurs", format_g: 250, prix: 7, pots: 40, date: "2026-11-08", ddm: "2028-11-08", intrants: intr, ...x });
const etiq = (await val(`select id from public.articles where nom = 'Étiquette 250 g'`)).id;
r = await val(`select public.mettre_en_pots($1) id`, [JSON.stringify(pots(1, [{ article_id: U(1), quantite: 40 }, { article_id: U(2), quantite: 40 }, { article_id: etiq, quantite: 40 }]))]);
verif(r.id === U(201), "mettre_en_pots renvoie l'identifiant du lot");
r = await val(`select code, pots_initiaux, format_g, ddm::text, date_mise_en_pot::text d from public.lots where id = $1`, [U(201)]);
verif(r.code === "L26-11" && r.pots_initiaux === 40 && r.d === "2026-11-08" && r.ddm === "2028-11-08", "mise en pots : lot créé (40 pots de 250 g, dates)");
r = await lignes(`select a.nom, a.stock from public.articles a where a.id in ($1, $2, $3) order by a.nom`, [U(1), U(2), etiq]);
verif(r.map((x) => Number(x.stock)).join() === "110,35,35", "mise en pots : couvercles 150 → 110, étiquettes 75 → 35, pots vides 75 → 35");
verif(Number((await val(`select count(*) n from public.mouvements_stock where lot_id = $1 and type = 'consommation' and origine = 'mise_en_pots'`, [U(201)])).n) === 3,
  "mise en pots : trois consommations reliées au lot");
r = await val(`select pots_restants from public.lots_stock where id = $1`, [U(201)]);
verif(r.pots_restants === 40, "mise en pots : le lot apparaît dans lots_stock avec 40 pots");
await val(`select public.mettre_en_pots($1)`, [JSON.stringify(pots(1, [{ article_id: U(1), quantite: 40 }]))]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(1)])).stock) === 35, "mise en pots renvoyée deux fois : rien en double");
e = await erreur(db, `select public.mettre_en_pots($1)`, [JSON.stringify(pots(2, [{ article_id: U(2), quantite: 40 }, { article_id: U(1), quantite: 50 }]))]);
verif(e && e.message === "Il te manque 15 Pots 250 g vides (il en reste 35).", `stock insuffisant : « ${e?.message} »`);
verif(!(await val(`select 1 x from public.lots where id = $1`, [U(202)])) && Number((await val(`select stock from public.articles where id = $1`, [U(2)])).stock) === 110,
  "mise en pots refusée : ni lot ni retrait (tout ou rien)");
e = await erreur(db, `select public.mettre_en_pots($1)`, [JSON.stringify(pots(3, [], { code: "L26-01" }))]);
verif(e && /existe déjà/.test(e.message), `numéro de lot déjà pris : « ${e?.message} »`);
e = await erreur(db, `select public.mettre_en_pots($1)`, [JSON.stringify(pots(4, [{ article_id: U(9), quantite: 1 }]))]);
verif(e && e.message === "Article introuvable", `mise en pots avec un article de B : « ${e?.message} »`);
r = await val(`select public.mettre_en_pots($1) id`, [JSON.stringify(pots(5, []))]);
verif(r.id === U(205), "pots déjà prêts : lot sans rien retirer du stock");
verif(await ecart() === 0, "stock = somme des mouvements après les mises en pots");

// Mouvements supprimés ou modifiés à la main : le stock suit toujours.
const mv = (await val(`select id from public.mouvements_stock where lot_id = $1 and article_id = $2`, [U(201), U(2)])).id;
await db.query(`update public.mouvements_stock set quantite = -30 where id = $1`, [mv]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(2)])).stock) === 120, "mouvement modifié (−40 → −30) : couvercles 110 → 120");
await db.query(`delete from public.mouvements_stock where id = $1`, [mv]);
verif(Number((await val(`select stock from public.articles where id = $1`, [U(2)])).stock) === 150, "mouvement supprimé : couvercles 120 → 150");
verif(await ecart() === 0, "stock = somme des mouvements après une correction à la main");

// Article supprimé : ses mouvements partent avec lui, ses achats restent (sans article).
await db.exec(`reset role; insert into public.articles (id, nom, stock, exploitation_id) values ('${U(40)}', 'Cire gaufrée', 3, '${E1}');
  insert into public.depenses (id, categorie, libelle, montant, article_id, quantite, exploitation_id) values ('${U(41)}', 'Autre', 'Cire', 10, '${U(40)}', 2, '${E1}');`);
await en(db, "a@x.fr", E1);
e = await erreur(db, `delete from public.articles where id = $1`, [U(40)]);
verif(!e && !(await val(`select 1 x from public.mouvements_stock where article_id = $1`, [U(40)])) && (await val(`select article_id from public.depenses where id = $1`, [U(41)])).article_id === null,
  `article supprimé : mouvements effacés, achat gardé sans article${e ? " (" + e.message + ")" : ""}`);

// Lecteur et autre exploitation.
await en(db, "l@x.fr", E1);
for (const [f, q] of [["enregistrer_achat", `select public.enregistrer_achat('{"id":"${U(300)}","lignes":[{"libelle":"X","montant":1}]}')`],
  ["mettre_en_pots", `select public.mettre_en_pots('{"id":"${U(301)}","code":"LX","format_g":250,"pots":1}')`]]) {
  e = await erreur(db, q);
  verif(e && /lecture seule/.test(e.message), `${f} : refusée à un lecteur (« ${e?.message} »)`);
}
verif(Number((await val(`select count(*) n from public.mouvements_stock`)).n) > 0, "un lecteur lit le journal des mouvements");
await en(db, "b@x.fr", E2);
verif(Number((await val(`select count(*) n from public.mouvements_stock`)).n) === 1, "B ne voit que son propre mouvement (ouverture de ses pots 500 g)");
e = await erreur(db, `insert into public.mouvements_stock (article_id, type, quantite, lot_id) values ($1, 'ajustement', 1, $2)`, [U(9), U(201)]);
verif(e && e.message === "Lot introuvable", `mouvement de B rattaché à un lot de A : « ${e?.message} »`);
await db.exec("reset role");
r = await lignes(`select enfant, colonne, nombre from public.incoherences_exploitation() where enfant = 'mouvements_stock'`);
verif(r.length === 3 && r.every((x) => Number(x.nombre) === 0), "incoherences_exploitation() contrôle les 3 rattachements du journal : aucun croisé");

fin("Migration 018");
