// Carte de fidélité (v5.78, migration 038). src/domaines/ventes/fidelite-regles.js et calculerVente({ fidelite }).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as F from "../../src/domaines/ventes/fidelite-regles.js";
import * as R from "../../src/domaines/ventes/remises-regles.js";

const r = F.reglage({ fidelite: { actif: true, tampons: 10, depuis: "2026-05-01" } });
const martine = { id: "m", nom: "Martine Roux" };
const ventes = [
  { id: "a", client_id: "m", date_vente: "2026-04-20" },                       // avant la carte : ne compte pas
  { id: "b", client_id: "m", date_vente: "2026-05-03" },
  { id: "c", client_id: "m", date_vente: "2026-09-12" },
  { id: "d", client_id: "x", date_vente: "2026-09-12" },                       // autre client
];
const lignes = [
  { vente_id: "a", quantite: 6 }, { vente_id: "b", quantite: 5 }, { vente_id: "c", quantite: 3 }, { vente_id: "d", quantite: 9 },
];

test("réglage : borné, éteint par défaut", () => {
  assert.deepEqual(F.reglage({}), { actif: false, tampons: 10, depuis: "" });
  assert.equal(F.reglage({ fidelite: { tampons: 1 } }).tampons, 2);
  assert.equal(F.reglage({ fidelite: { tampons: 99 } }).tampons, 50);
  assert.equal(F.reglage({ fidelite: { tampons: "abc" } }).tampons, 10);
});

test("pas de carte pour la vente au marché ni sans client", () => {
  assert.equal(F.carte({ id: "z", nom: "Vente au marché" }, ventes, lignes, r), null);
  assert.equal(F.carte(null, ventes, lignes, r), null);
  assert.equal(F.aUneCarte(martine), true);
});

test("tampons : un par article depuis le début de la carte, seulement ce client", () => {
  const c = F.carte(martine, ventes, lignes, r);
  assert.deepEqual(c, { tampons: 8, unites: 8, gagnees: 0, utilisees: 0, dispo: 0, n: 10 });
  assert.equal(F.texte(c), "8 sur 10");
});

test("avec la vente en cours : 2 articles remplissent la carte, le 3e peut être offert", () => {
  const c = F.carte(martine, ventes, lignes, r);
  assert.deepEqual(F.avecVente(c, 1), { tampons: 9, dispo: 0, proposer: false, pleine: false, n: 10 });
  assert.deepEqual(F.avecVente(c, 2), { tampons: 0, dispo: 1, proposer: false, pleine: true, n: 10 }, "carte pleine : le prochain article sera offert");
  assert.equal(F.avecVente(c, 3).proposer, true);
  // Récompense donnée : l'article offert ne compte pas, la carte repart à 0.
  assert.deepEqual(F.avecVente(c, 3, true), { tampons: 0, dispo: 0, proposer: false, pleine: false, n: 10 });
});

test("récompense gardée pour plus tard, puis utilisée", () => {
  const vs = [...ventes, { id: "e", client_id: "m", date_vente: "2026-10-01" }];
  const ls = [...lignes, { vente_id: "e", quantite: 4 }];
  const c = F.carte(martine, vs, ls, r);
  assert.equal(c.dispo, 1, "12 articles : une carte pleine pas encore utilisée");
  assert.equal(c.tampons, 2);
  assert.equal(F.avecVente(c, 1).proposer, true, "proposée à la vente suivante, même d'un seul article");
  const vs2 = [...vs, { id: "f", client_id: "m", date_vente: "2026-10-10", remise_fidelite: 6 }];
  const ls2 = [...ls, { vente_id: "f", quantite: 2 }];
  const c2 = F.carte(martine, vs2, ls2, r);
  assert.deepEqual([c2.unites, c2.utilisees, c2.dispo, c2.tampons], [13, 1, 0, 3], "14 articles dont 1 offert : 13 tampons, carte utilisée, 3 sur la nouvelle");
});

test("calculerVente : la carte offre l'article le moins cher qui reste, après l'offre", () => {
  const lots = [
    { id: "p", categorie: "Miel", format_g: 250, prix: 6 },
    { id: "h", categorie: "Hydromel", format_libelle: "75 cl", prix: 12 },
  ];
  const v = R.calculerVente({ lignes: [{ lot_id: "p", quantite: 2 }, { lot_id: "h", quantite: 1 }], lots, fidelite: true });
  assert.equal(v.carte.remise, 6);
  assert.equal(v.total, 18);
  assert.deepEqual(v.lignes.map((l) => l.remise), [6, 0]);
  assert.equal(v.champs.remise_fidelite, 6);
  const xy = { id: "x", nom: "1 acheté, 1 offert", type: "xy", produits: ["Miel|250 g"], achetes: 1, offerts: 1 };
  const w = R.calculerVente({ lignes: [{ lot_id: "p", quantite: 2 }, { lot_id: "h", quantite: 1 }], lots, promotions: [xy], fidelite: true, manuelle: { mode: "pct", valeur: 10 } });
  assert.equal(w.offre.remise, 6, "l'offre prend un pot");
  assert.equal(w.carte.remise, 6, "la carte prend l'autre pot (le moins cher qui reste)");
  assert.equal(w.manuelle.remise, 1.2, "10 % de ce qui reste (12 €)");
  assert.equal(Math.round(w.lignes.reduce((t, l) => t + l.remise * 100, 0)) / 100, 13.2);
  assert.equal(w.total, 10.8);
  assert.equal(R.calculerVente({ lignes: [{ lot_id: "p", quantite: 1 }], lots }).champs.remise_fidelite, undefined, "sans la carte : champ absent (base sans 038)");
});

test("ligne « Carte de fidélité » du reçu", () => {
  assert.deepEqual(R.lignesRemise({ id: "v", remise_fidelite: 6 }, []), [{ libelle: "Carte de fidélité", montant: 6 }]);
});
