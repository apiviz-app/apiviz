// Règles du stock (v5.30) : catalogue, Opex/Capex, achat et mise en pots appliqués sur le téléphone (hors ligne),
// bilan d'une mise en pots, histoire d'un lot. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/materiel/regles.js";

const base = () => ({
  articles: [
    { id: "p250", nom: "Pot 250 g vide", type: "Consommable", famille: "emballage", contenance_g: 250, unite: "unité", stock: 150, seuil: 20, valeur: 0.42 },
    { id: "cou", nom: "Couvercle 63 mm", type: "Consommable", famille: "emballage", unite: "unité", stock: 150, seuil: 0, valeur: 0.12 },
    { id: "eti", nom: "Étiquette 250 g", type: "Consommable", famille: "emballage", unite: "unité", stock: 75, seuil: 50, valeur: 0.09 },
    { id: "eti5", nom: "Étiquette 500 g", type: "Consommable", famille: "emballage", unite: "unité", stock: 10, seuil: 0 },
    { id: "can", nom: "Candy", type: "Consommable", unite: "kg", stock: 1, seuil: 2 },
    { id: "ext", nom: "Extracteur", type: "Équipement", unite: "unité", stock: 1, seuil: 0, duree_amort: 5 },
  ],
  mouvements: [], depenses: [], lots: [], lignes: [], ventes: [], clients: [{ id: "c1", nom: "Marie D." }],
  fournisseurs: [{ id: "f1", nom: "Verrerie" }], ruches: [{ id: "r2", nom: "Ruche 2" }, { id: "r3", nom: "Ruche 3" }],
  recoltes: [{ id: "x1", ruche_id: "r2", kg: 12, date_recolte: "2026-10-12", extraction: "E26-01" }, { id: "x2", ruche_id: "r3", kg: 10, date_recolte: "2026-10-12", extraction: "E26-01" }],
});

test("famille et contenance : données de l'article, sinon déduites du nom", () => {
  assert.equal(R.famille({ nom: "Pots 500 g vides" }), "emballage");
  assert.equal(R.famille({ nom: "Candy" }), "alimentation");
  assert.equal(R.famille({ nom: "Lanières Apivar" }), "traitement");
  assert.equal(R.famille({ nom: "Hausse", type: "Équipement" }), "equipement");
  assert.equal(R.famille({ nom: "Gants", famille: "autre" }), "autre");
  assert.equal(R.contenance({ nom: "Pot 1 kg" }), 1000);
  assert.equal(R.contenance({ nom: "Pots 250 g vides" }), 250);
  assert.equal(R.contenance({ nom: "Étiquette 250 g" }), null, "une étiquette n'a pas de contenance");
  assert.equal(R.nature({ type: "Équipement" }), "Capex");
  assert.equal(R.nature({ type: "Consommable" }), "Opex");
});

test("catalogue : groupé par famille, filtre Opex/Capex, à commander, suggestions sans doublon", () => {
  const d = base();
  assert.deepEqual(R.grouper(d.articles).map((g) => g.famille), ["emballage", "alimentation", "equipement"]);
  assert.deepEqual(R.grouper(d.articles, "capex").map((g) => g.articles.map((a) => a.id)), [["ext"]]);
  assert.ok(!R.grouper(d.articles, "opex").some((g) => g.famille === "equipement"));
  assert.deepEqual(d.articles.filter(R.aCommander).map((a) => a.id), ["can"], "l'étiquette (75 > 50) n'est pas à commander, le candy (1 ≤ 2) oui");
  assert.equal(R.phrase(d.articles), "Il reste 1 kg de Candy. Recommande-le.");
  assert.ok(!R.suggestions([{ nom: "candy" }]).some((c) => c.nom === "Candy"), "insensible à la casse");
});

test("achat appliqué sur le téléphone : dépenses, nouvel article, stock, une seule fois", () => {
  const d = base();
  const p = { id: "A1", date: "2026-11-03", fournisseur_id: "f1", piece: "F-1", lignes: [
    { id: "l1", article_id: "p250", quantite: 150, montant: 63 },
    { id: "l2", article: { id: "mat", nom: "Maturateur 50 kg", type: "Équipement", famille: "equipement", duree_amort: 7 }, quantite: 1, montant: 180 },
    { id: "l3", libelle: "Port", montant: 9.9 },
  ] };
  assert.equal(R.controleAchat(p), null);
  R.appliquerAchat(d, p);
  R.appliquerAchat(d, p);
  assert.equal(d.depenses.length, 3);
  assert.equal(d.articles.find((a) => a.id === "p250").stock, 300);
  const mat = d.articles.find((a) => a.id === "mat");
  assert.equal(mat.stock, 1);
  assert.equal(d.depenses.find((x) => x.id === "l2").nature, "Immobilisation");
  assert.equal(d.depenses.find((x) => x.id === "l3").nature, "Service");
  assert.equal(d.mouvements.length, 2);
  assert.match(R.controleAchat({ lignes: [{ article_id: "p250", montant: 1 }] }), /quantité/);
  assert.match(R.controleAchat({ lignes: [{ libelle: "", montant: 1 }] }), /libellé/);
  assert.equal(R.controleAchat({ lignes: [] }), "Ajoute au moins une ligne.");
});

test("mise en pots : articles proposés pour le format, limite, manque, coût d'emballage", () => {
  const d = base();
  const prop = R.proposerIntrants(d.articles, 250);
  assert.deepEqual([prop.pot?.id, prop.couvercle?.id, prop.etiquette?.id], ["p250", "cou", "eti"]);
  assert.equal(R.proposerIntrants(d.articles, 500).etiquette?.id, "eti5", "l'étiquette du format est préférée");
  assert.equal(R.proposerIntrants(d.articles, 500).pot, null, "pas de pot vide de 500 g");
  let b = R.bilanMiseEnPots(d, { pots: 40, format_g: 250, intrants: ["p250", "cou", "eti"] });
  assert.equal(b.kg, 10);
  assert.equal(b.vrac, 22);
  assert.equal(b.max, 75);
  assert.equal(b.limite, "Étiquette 250 g");
  assert.equal(b.manque.length, 0);
  assert.equal(Math.round(b.emballageParPot * 100), 63);
  b = R.bilanMiseEnPots(d, { pots: 100, format_g: 250, intrants: ["p250", "eti"] });
  assert.deepEqual(b.manque.map((s) => [s.article.id, s.manque]), [["eti", 25]]);
  assert.equal(b.max, 75);
  b = R.bilanMiseEnPots(d, { pots: 100, format_g: 500, intrants: [] });
  assert.equal(b.max, 44, "22 kg de miel en vrac : 44 pots de 500 g");
  assert.equal(b.mielCourt, true);
});

test("mise en pots appliquée sur le téléphone, puis histoire du lot", () => {
  const d = base();
  R.appliquerAchat(d, { id: "A1", date: "2026-11-03", fournisseur_id: "f1", piece: "F-1", lignes: [{ id: "l1", article_id: "p250", quantite: 150, montant: 63 }, { id: "l2", article_id: "cou", quantite: 150, montant: 18 }] });
  const p = { id: "L4", code: "L26-04", miel: "Toutes fleurs", format_g: 250, prix: 7, pots: 40, date: "2026-11-08", ddm: "2028-11-08", extraction: "E26-01",
    intrants: [{ article_id: "p250", quantite: 40 }, { article_id: "cou", quantite: 40 }, { article_id: "eti", quantite: 40 }] };
  R.appliquerMiseEnPots(d, p);
  R.appliquerMiseEnPots(d, p);
  assert.equal(d.lots.length, 1);
  assert.deepEqual(["p250", "cou", "eti"].map((id) => d.articles.find((a) => a.id === id).stock), [260, 260, 35]);
  d.ventes.push({ id: "v1", client_id: "c1", date_vente: "2026-11-09" });
  d.lignes.push({ vente_id: "v1", lot_id: "L4", quantite: 12, prix_unitaire: 7 });
  const h = R.histoireLot(d, "L4");
  assert.deepEqual(h.map((x) => x.type), ["recolte", "achat", "pots", "vente"]);
  assert.equal(h[0].detail, "+22 kg de miel");
  assert.equal(h[0].sous, "Ruche 2, Ruche 3");
  assert.equal(h[1].titre, "Achat chez Verrerie");
  assert.equal(h[1].sous, "Facture F-1");
  assert.match(h[1].detail, /\+150 pot 250 g vide, \+150 couvercle 63 mm/);
  assert.match(h[2].detail, /−40 pot 250 g vide/);
  assert.equal(h[3].detail, "−12 pots de miel");
});

test("numéro de lot et DDM proposés", () => {
  assert.equal(R.prochainCode([{ code: "L26-01" }, { code: "L26-03" }], 2026), "L26-02");
  assert.equal(R.ddmProposee("2026-11-08"), "2028-11-08");
  assert.equal(R.quantite(2.5, "kg"), "2,5 kg");
  assert.equal(R.quantite(35, "unité"), "35");
});
