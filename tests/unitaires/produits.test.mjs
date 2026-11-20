// Tests des règles des produits de la ruche (v5.65, migration 032) : libellés, formats, unités, catalogue, numéros.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../src/domaines/production/produits.js";
import { produitsCaisse, lignesVente, detailCommande } from "../../src/domaines/ventes/terrain-regles.js";

const miel = { id: "m", code: "L26-01", miel: "Toutes fleurs", format_g: 500, prix: 10, pots_initiaux: 20, pots_restants: 12 };
const kilo = { id: "k", code: "L26-02", categorie: "Miel", miel: "Acacia", format_g: 1000, prix: 18, pots_initiaux: 5, pots_restants: 5 };
const hydro = { id: "h", code: "H26-01", categorie: "Hydromel", miel: "Hydromel sec", unite: "bouteille", format_libelle: "75 cl", format_g: null, prix: 14, pots_initiaux: 12, pots_restants: 9, seuil: 10 };
const bougie = { id: "b", code: "B26-01", categorie: "Bougie", miel: "", unite: "pièce", format_libelle: "", prix: 6, pots_initiaux: 3, pots_restants: 1 };

test("un lot d'avant la migration 032 est du miel", () => {
  assert.equal(P.categorieDe(miel), "Miel");
  assert.ok(P.estMiel(miel) && P.estMiel(kilo) && !P.estMiel(hydro));
  assert.deepEqual(P.lotsMiel([miel, hydro, kilo]).map((l) => l.id), ["m", "k"]);
});

test("format, nom et libellé d'un lot", () => {
  assert.equal(P.formatLot(miel), "500 g");
  assert.equal(P.formatLot(kilo), "1 kg");
  assert.equal(P.formatLot(hydro), "75 cl");
  assert.equal(P.formatLot(bougie), "pièce");
  assert.equal(P.nomLot(hydro), "Hydromel sec");
  assert.equal(P.nomLot(bougie), "Bougie");
  assert.equal(P.libelleLot(miel), "Miel toutes fleurs 500 g");
  assert.equal(P.libelleLot({ ...miel, miel: "Miel de lavande" }), "Miel de lavande 500 g");
  assert.equal(P.libelleLot(hydro), "Hydromel sec 75 cl");
  assert.equal(P.libelleLot(bougie), "Bougie pièce");
  assert.equal(P.libelleLot(null), "");
});

test("unité accordée au nombre", () => {
  assert.equal(P.quantiteLot(hydro, 1), "1 bouteille");
  assert.equal(P.quantiteLot(hydro, 3), "3 bouteilles");
  assert.equal(P.quantiteLot(miel, 2), "2 pots");
  assert.equal(P.quantiteLot(bougie, 0), "0 pièce");
  assert.equal(P.quantiteLot({ unite: "boîte" }, 4), "4 boîtes");
});

test("stock bas et catalogue par catégorie, le miel d'abord", () => {
  assert.ok(P.stockBas(hydro));
  assert.ok(!P.stockBas(miel));
  const c = P.catalogue([bougie, hydro, miel, kilo, { ...bougie, id: "x", categorie: "Savon" }]);
  assert.deepEqual(c.map((g) => g.categorie), ["Miel", "Hydromel", "Bougie", "Savon"]);
  assert.equal(c[0].restants, 17);
  assert.equal(c[0].valeur, 12 * 10 + 5 * 18);
  assert.equal(c[1].bas, 1);
});

test("numéro du prochain lot d'un produit", () => {
  assert.equal(P.prochainCodeProduit([hydro], "Hydromel", 2026), "H26-02");
  assert.equal(P.prochainCodeProduit([], "Gelée royale", 2026), "G26-01");
  assert.equal(P.prochainCodeProduit([], "Élixir", 2027), "E27-01");
  assert.equal(P.prochainCodeProduit([], "", 2026), "P26-01");
});

test("saisie d'un produit : contrôles et ligne envoyée", () => {
  const f = { id: "z", categorie: "Cire", nom: " Pain de cire ", unite: "pain", format_libelle: "250 g", prix: "5", quantite: "8", code: "C26-01", ddm: "", seuil: "2" };
  assert.deepEqual(P.produitAEnvoyer(f), { id: "z", code: "C26-01", categorie: "Cire", nom: "Pain de cire", unite: "pain", format_libelle: "250 g",
    prix: 5, quantite: 8, date: null, ddm: null, seuil: 2 });
  assert.throws(() => P.produitAEnvoyer({ ...f, categorie: "Miel" }), /mise en pots/);
  assert.throws(() => P.produitAEnvoyer({ ...f, nom: " " }), /nom/);
  assert.throws(() => P.produitAEnvoyer({ ...f, quantite: "" }), /stock/);
  assert.throws(() => P.produitAEnvoyer({ ...f, code: "" }), /lot/);
  assert.equal(P.produitAEnvoyer({ ...f, seuil: "" }).seuil, null);
});

test("hors ligne : le produit apparaît dans les données du téléphone, une seule fois", () => {
  const d = { lots: [miel] };
  const p = P.produitAEnvoyer({ id: "n", categorie: "Propolis", nom: "Teinture", unite: "flacon", format_libelle: "15 ml", prix: 9, quantite: 6, code: "P26-01" });
  P.appliquerProduit(d, p, { _attente: true });
  P.appliquerProduit(d, p);
  assert.equal(d.lots.length, 2);
  assert.equal(d.lots[1].pots_restants, 6);
  assert.equal(P.libelleLot(d.lots[1]), "Teinture 15 ml");
});

test("caisse et commandes : miel et autres produits côte à côte", () => {
  const prods = produitsCaisse([hydro, miel, { ...miel, id: "m2", pots_restants: 3 }]);
  assert.deepEqual(prods.map((p) => p.nom), ["Toutes fleurs 500 g", "Hydromel sec 75 cl"]);
  assert.equal(prods[0].stock, 15);
  assert.equal(prods[1].unite, "bouteille");
  const { lignes } = lignesVente(prods, { [prods[1].cle]: 2 });
  assert.deepEqual(lignes, [{ lot_id: "h", quantite: 2 }]);
  assert.equal(detailCommande({ lignes: [{ quantite: 2, miel: "Hydromel sec", format_libelle: "75 cl" }, { quantite: 1, miel: "Été", format_g: 250 }] }),
    "2 × Hydromel sec 75 cl · 1 × Été 250 g");
});

// v5.67 — mise en pots : seulement le miel ; ligne d'état commune aux onglets de Produits.
test("mise en pots : formats sans « 0 g », miels sans hydromel", () => {
  const d = { lots: [miel, hydro, bougie, kilo], recoltes: [{ miel: "Châtaignier" }, { miel: "" }] };
  assert.deepEqual(P.formatsMiseEnPots(d, [250, 0, null]), [250, 500, 1000]);
  assert.deepEqual(P.formatsMiseEnPots({ lots: [{ ...miel, format_g: 750 }] }), [250, 500, 750, 1000]);
  assert.deepEqual(P.mielsMiseEnPots(d), ["Toutes fleurs", "Acacia", "Châtaignier"]);
  assert.deepEqual(P.mielsMiseEnPots({}), ["Toutes fleurs"]);
});

test("mise en pots : prix proposé", () => {
  assert.deepEqual(P.prixPropose([miel, kilo], 500), { prix: 10, d: "" });
  const p = P.prixPropose([miel], 250);
  assert.equal(p.prix, 5);
  assert.match(p.d, /500 g à 10 €/);
  assert.equal(P.prixPropose([{ ...miel, prix: 6.3, format_g: 250 }], 500).prix, 12.5);
  assert.deepEqual(P.prixPropose([hydro], 500), { prix: "", d: "" });
});

test("ligne d'état de Produits : tous les produits, comme la tuile « en stock »", () => {
  assert.equal(P.ligneEtat([miel, hydro, bougie], 0), "3 produits · 22 en stock");
  assert.equal(P.ligneEtat([miel], 12.5), "1 produit · 12 en stock · 12,5 € à encaisser");
  assert.equal(P.ligneEtat([], 0), "");
});
