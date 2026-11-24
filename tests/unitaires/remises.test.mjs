// Remises et offres de vente (v5.77, migration 037). src/domaines/ventes/remises-regles.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/ventes/remises-regles.js";

const lots = [
  { id: "p", code: "P26-02", categorie: "Miel", miel: "Printemps", format_g: 250, prix: 6, pots_restants: 20 },
  { id: "c", code: "C26-01", categorie: "Miel", miel: "Châtaignier", format_g: 250, prix: 6.5, pots_restants: 10 },
  { id: "g", code: "G26-01", categorie: "Miel", miel: "Printemps", format_g: 500, prix: 9, pots_restants: 10 },
  { id: "h", code: "H26-01", categorie: "Hydromel", miel: "Hydromel sec", unite: "bouteille", format_libelle: "75 cl", prix: 12, pots_restants: 3 },
];
const xy = { id: "x1", nom: "4 achetés, 1 offert", type: "xy", produits: ["Miel|250 g"], achetes: 4, offerts: 1, actif: true };
const somme = (ls) => Math.round(ls.reduce((t, l) => t + l.remise * 100, 0)) / 100;

test("famille : catégorie et format, toutes variétés confondues", () => {
  assert.equal(R.famille(lots[0]), "Miel|250 g");
  assert.equal(R.famille(lots[1]), "Miel|250 g");
  assert.equal(R.famille(lots[3]), "Hydromel|75 cl");
  assert.equal(R.libelleFamille("Hydromel|75 cl"), "Hydromel 75 cl");
  assert.deepEqual(R.familles(lots).map((f) => f.libelle), ["Miel 250 g", "Miel 500 g", "Hydromel 75 cl"]);
});

test("montant d'une ligne : quantité × prix − remise, au centime", () => {
  assert.equal(R.montantLigne({ quantite: 3, prix_unitaire: 6.1 }), 18.3);
  assert.equal(R.montantLigne({ quantite: 5, prix_unitaire: 6, remise: 6 }), 24);
  assert.equal(R.montantLigne({ quantite: 1, prix_unitaire: 0.1, remise: null }), 0.1);
});

test("répartir : au prorata, somme juste, jamais plus que la ligne", () => {
  assert.deepEqual(R.repartir(100, [100, 200]), [33, 67]);
  assert.deepEqual(R.repartir(500, [100, 200]), [100, 200]);
  assert.deepEqual(R.repartir(1, [0, 0]), [0, 0]);
  const p = R.repartir(1001, [333, 333, 334]);
  assert.equal(p.reduce((a, b) => a + b, 0), 1000);
});

test("4 achetés, 1 offert : le moins cher des pots concernés est offert, variétés mélangées", () => {
  const v = R.calculerVente({ lignes: [{ lot_id: "p", quantite: 3 }, { lot_id: "c", quantite: 2 }, { lot_id: "h", quantite: 1 }], lots, promotions: [xy] });
  assert.equal(v.brut, 43);
  assert.equal(v.offre.remise, 6, "un pot de printemps à 6 € offert, pas le châtaignier à 6,50 €");
  assert.equal(v.offre.offerts, 1);
  assert.equal(v.total, 37);
  assert.deepEqual(v.lignes.map((l) => l.remise), [6, 0, 0]);
  assert.equal(v.champs.promotion_id, "x1");
  assert.equal(v.champs.remise_offre, 6);
  // 4 pots seulement : rien ; 10 pots : 2 offerts.
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "p", quantite: 4 }], lots, promotions: [xy] }).offre, null);
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "p", quantite: 10 }], lots, promotions: [xy] }).offre.remise, 12);
  // L'hydromel ne compte pas pour une offre sur le miel 250 g.
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "p", quantite: 4 }, { lot_id: "h", quantite: 1 }], lots, promotions: [xy] }).offre, null);
});

test("lot à prix rond : les plus chers entrent dans le lot ; rien si le prix n'est pas plus bas", () => {
  const coffret = { id: "l1", nom: "Coffret", type: "lot", produits: ["Miel|500 g"], quantite: 3, prix_lot: 25 };
  const v = R.calculerVente({ lignes: [{ lot_id: "g", quantite: 4 }], lots, promotions: [coffret] });
  assert.equal(v.offre.remise, 2, "3 × 9 = 27 € → 25 €");
  assert.equal(v.total, 34);
  const cher = { ...coffret, prix_lot: 30 };
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "g", quantite: 3 }], lots, promotions: [cher] }).offre, null);
});

test("remise en % ou en €, minimum d'achat, période et client", () => {
  const noel = { id: "n", nom: "Noël", type: "remise", mode: "pct", valeur: 10, minimum: 30, debut: "2026-12-12", fin: "2026-12-14" };
  const lignes = [{ lot_id: "h", quantite: 3 }];
  assert.equal(R.calculerVente({ lignes, lots, promotions: [noel], date: "2026-11-24" }).offre, null, "pas encore commencée");
  assert.equal(R.calculerVente({ lignes, lots, promotions: [noel], date: "2026-12-13" }).offre.remise, 3.6);
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "h", quantite: 2 }], lots, promotions: [noel], date: "2026-12-13" }).offre, null, "24 € < 30 €");
  const cinq = { id: "e", nom: "−5 €", type: "remise", mode: "eur", valeur: 50 };
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "p", quantite: 1 }], lots, promotions: [cinq] }).offre.remise, 6, "jamais plus que le panier");
  const revendeur = { id: "r", nom: "Revendeur", type: "client", mode: "pct", valeur: 20, clients: ["dupont"], cercles: ["Revendeurs"] };
  assert.equal(R.calculerVente({ lignes, lots, promotions: [revendeur], client: { id: "autre" } }).offre, null);
  assert.equal(R.calculerVente({ lignes, lots, promotions: [revendeur], client: { id: "dupont" } }).offre.remise, 7.2);
  assert.equal(R.calculerVente({ lignes, lots, promotions: [revendeur], client: { id: "x", cercle: "Revendeurs" } }).offre.remise, 7.2);
  assert.equal(R.calculerVente({ lignes, lots, promotions: [{ ...cinq, actif: false }] }).offre, null, "offre coupée");
});

test("deux offres ne s'additionnent pas : la plus avantageuse pour le client est gardée", () => {
  const dix = { id: "d", nom: "−10 %", type: "remise", mode: "pct", valeur: 10 };
  const v = R.calculerVente({ lignes: [{ lot_id: "p", quantite: 5 }], lots, promotions: [dix, xy] });
  assert.equal(v.offre.promotion.id, "x1", "6 € offerts contre 3 €");
  assert.equal(v.economie, 6);
  const w = R.calculerVente({ lignes: [{ lot_id: "p", quantite: 4 }], lots, promotions: [dix, xy] });
  assert.equal(w.offre.promotion.id, "d");
  assert.equal(w.offre.remise, 2.4);
});

test("remise ponctuelle après l'offre : %, €, article offert ; motif facultatif ; lignes justes", () => {
  const lignes = [{ lot_id: "p", quantite: 5 }, { lot_id: "h", quantite: 1 }];
  const v = R.calculerVente({ lignes, lots, promotions: [xy], manuelle: { mode: "pct", valeur: 10, motif: "Client fidèle" } });
  assert.equal(v.offre.remise, 6);
  assert.equal(v.manuelle.remise, 3.6, "10 % de 36 €");
  assert.equal(v.total, 32.4);
  assert.equal(somme(v.lignes), 9.6);
  assert.equal(v.champs.remise_manuelle, 3.6);
  assert.equal(v.champs.remise_libelle, "−10 %");
  assert.equal(v.champs.remise_motif, "Client fidèle");
  const e = R.calculerVente({ lignes, lots, manuelle: { mode: "eur", valeur: 2 } });
  assert.equal(e.total, 40);
  assert.equal(e.champs.remise_motif, "", "sans motif");
  assert.equal(e.champs.promotion_id, null);
  const a = R.calculerVente({ lignes, lots, manuelle: { mode: "article", cible: "h" } });
  assert.equal(a.manuelle.remise, 12);
  assert.deepEqual(a.lignes.map((l) => l.remise), [0, 12]);
  const sur = R.calculerVente({ lignes, lots, manuelle: { mode: "pct", valeur: 50, cible: "h" } });
  assert.deepEqual(sur.lignes.map((l) => l.remise), [0, 6]);
  const trop = R.calculerVente({ lignes, lots, manuelle: { mode: "eur", valeur: 999 } });
  assert.equal(trop.total, 0);
  assert.ok(trop.lignes.every((l, k) => l.remise <= [30, 12][k]));
  assert.equal(R.calculerVente({ lignes, lots, manuelle: { mode: "pct", valeur: 0 } }).manuelle, null);
});

test("la somme des remises des lignes égale toujours le détail (contrôle de creer_vente)", () => {
  const promotions = [xy, { id: "d", nom: "−7 %", type: "remise", mode: "pct", valeur: 7 }];
  for (let q = 1; q < 12; q++) {
    for (const manuelle of [null, { mode: "pct", valeur: 13 }, { mode: "eur", valeur: 3.33 }, { mode: "article" }]) {
      const v = R.calculerVente({ lignes: [{ lot_id: "p", quantite: q }, { lot_id: "c", quantite: 2 }, { lot_id: "h", quantite: 1 }], lots, promotions, manuelle });
      assert.equal(somme(v.lignes), Math.round((v.champs.remise_offre + v.champs.remise_manuelle) * 100) / 100, `q=${q} ${JSON.stringify(manuelle)}`);
      assert.equal(Math.round((v.brut - v.economie) * 100) / 100, v.total);
    }
  }
});

test("coup de pouce : un article de plus fait gagner l'offre", () => {
  const stock = (id) => lots.find((l) => l.id === id).pots_restants;
  const p = R.prochaineOffre([xy], [{ lot_id: "p", quantite: 4 }], lots, {}, stock);
  assert.match(p.texte, /^Encore 1 pot de Miel 250 g et le client gagne 6 € avec « 4 achetés, 1 offert »\.$/);
  assert.equal(R.prochaineOffre([xy], [{ lot_id: "p", quantite: 5 }], lots, {}, stock), null, "déjà appliquée, rien de plus avec un 6e");
  assert.equal(R.prochaineOffre([xy], [{ lot_id: "p", quantite: 4 }], lots, {}, () => 0), null, "plus de stock");
  const duo = { id: "h2", nom: "2 bouteilles = 22 €", type: "lot", produits: ["Hydromel|75 cl"], quantite: 2, prix_lot: 22 };
  assert.match(R.prochaineOffre([duo], [{ lot_id: "h", quantite: 1 }], lots, {}, stock).texte, /Encore 1 bouteille de Hydromel 75 cl/);
  const mini = { id: "m", nom: "Noël", type: "remise", mode: "pct", valeur: 10, minimum: 30 };
  assert.match(R.prochaineOffre([mini], [{ lot_id: "h", quantite: 2 }], lots, {}, stock).texte, /^Encore 6 € d’achat/);
});

test("validation, nom proposé, ligne à envoyer, aperçu", () => {
  assert.equal(R.validerPromotion({ nom: "", type: "xy" }), "Donne un nom à l’offre.");
  assert.match(R.validerPromotion({ nom: "a", type: "xy", achetes: 4 }), /offerts/);
  assert.match(R.validerPromotion({ nom: "a", type: "lot", quantite: 3 }), /prix du lot/);
  assert.match(R.validerPromotion({ nom: "a", type: "remise", mode: "pct", valeur: 120 }), /100 %/);
  assert.match(R.validerPromotion({ nom: "a", type: "client", mode: "pct", valeur: 20 }), /client ou le cercle/);
  assert.match(R.validerPromotion({ nom: "a", type: "remise", mode: "eur", valeur: 5, debut: "2026-12-14", fin: "2026-12-12" }), /avant son début/);
  assert.equal(R.validerPromotion(xy), "");
  assert.equal(R.nomPropose({ type: "xy", achetes: 4, offerts: 1 }), "4 achetés, 1 offert");
  assert.equal(R.nomPropose({ type: "xy", achetes: 5, offerts: 2 }), "5 achetés, 2 offerts");
  assert.equal(R.nomPropose({ type: "lot", quantite: 3, prix_lot: 25, produits: ["Miel|500 g"] }), "3 Miel 500 g = 25 €");
  assert.equal(R.nomPropose({ type: "remise", mode: "pct", valeur: 10, minimum: 30 }), "−10 % dès 30 €");
  const l = R.promotionAEnvoyer({ ...xy, quantite: 3, mode: "pct", valeur: 5 });
  assert.equal(l.quantite, null);
  assert.equal(l.mode, "");
  assert.equal(l.valeur, null);
  assert.equal(l.achetes, 4);
  assert.equal(R.apercu(xy, 6).titre, "5 pour 24 €");
  assert.match(R.apercu(xy, 6).detail, /Au lieu de 30 € : soit −20 %/);
  assert.match(R.apercu({ type: "lot", quantite: 3, prix_lot: 30 }, 9).detail, /pas plus bas/);
});

test("usage d'une offre et remises accordées", () => {
  const ventes = [
    { id: "v1", promotion_id: "x1", remise_offre: 6, remise_manuelle: 0 },
    { id: "v2", promotion_id: null, remise_offre: 0, remise_manuelle: 3.6 },
    { id: "v3", promotion_id: "x1", remise_offre: 6, remise_manuelle: 1 },
  ];
  const lignes = [{ vente_id: "v1", quantite: 5, prix_unitaire: 6, remise: 6 }, { vente_id: "v3", quantite: 5, prix_unitaire: 6, remise: 7 }];
  assert.deepEqual(R.usage(xy, ventes, lignes), { fois: 2, offert: 12, ventes: 47 });
  assert.deepEqual(R.remisesAccordees(ventes), { offres: 12, ponctuelles: 4.6, total: 16.6 });
  assert.equal(R.statut({ actif: true, debut: "2026-12-12" }, "2026-11-24"), "prevue");
  assert.equal(R.statut({ actif: true, fin: "2026-01-01" }, "2026-11-24"), "finie");
  assert.equal(R.statut({ actif: false }, "2026-11-24"), "coupee");
  assert.equal(R.statut({ actif: true }, "2026-11-24"), "active");
});

test("lignes de remise du reçu et de la facture", () => {
  const v = { id: "v", promotion_nom: "4 achetés, 1 offert", remise_offre: 6, remise_manuelle: 3.6, remise_libelle: "−10 %", remise_motif: "Client fidèle" };
  assert.deepEqual(R.lignesRemise(v, []), [{ libelle: "Offre « 4 achetés, 1 offert »", montant: 6 }, { libelle: "Remise (−10 %, Client fidèle)", montant: 3.6 }]);
  assert.deepEqual(R.lignesRemise({ id: "w", remise_manuelle: 2 }, []), [{ libelle: "Remise", montant: 2 }]);
  assert.deepEqual(R.lignesRemise({ id: "x" }, [{ vente_id: "x", remise: 1.5 }]), [{ libelle: "Remise", montant: 1.5 }]);
  assert.deepEqual(R.lignesRemise({ id: "y" }, [{ vente_id: "y", quantite: 1, prix_unitaire: 6 }]), []);
  assert.equal(R.venteBrut({ id: "x" }, [{ vente_id: "x", quantite: 5, prix_unitaire: 6, remise: 6 }]), 30);
});
