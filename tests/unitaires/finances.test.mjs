// Règles financières (src/domaines/finances/regles.js). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fin, rythme, stock, venteTotal } from "../../src/domaines/finances/regles.js";

const vide = () => ({ ventes: [], lignes: [], depenses: [], recoltes: [], lots: [] });
const MAINTENANT = new Date(2026, 10, 6, 12); // 6 novembre 2026

function jeu() {
  const d = vide();
  d.lots = [
    { id: "L5", format_g: 500, prix: 12, pots_initiaux: 20, pots_restants: 10 },
    { id: "L2", format_g: 250, prix: 7, pots_initiaux: 8, pots_restants: 8 },
  ];
  d.ventes = [
    { id: "V1", date_vente: "2026-03-10", paye: true },
    { id: "V2", date_vente: "2026-10-20", paye: false },
    { id: "V0", date_vente: "2025-12-01", paye: true },
  ];
  d.lignes = [
    { vente_id: "V1", lot_id: "L5", quantite: 4, prix_unitaire: 12 },
    { vente_id: "V1", lot_id: "L2", quantite: 2, prix_unitaire: 7 },
    { vente_id: "V2", lot_id: "L5", quantite: 1, prix_unitaire: 12 },
    { vente_id: "V0", lot_id: "L5", quantite: 5, prix_unitaire: 10 },
  ];
  d.depenses = [
    { date_depense: "2026-02-01", montant: "30" },
    { date_depense: "2026-11-02", montant: 10 },
    { date_depense: "2025-06-01", montant: 20 },
  ];
  d.recoltes = [{ date_recolte: "2026-07-01", kg: 20 }, { date_recolte: "2025-07-01", kg: 99 }];
  return d;
}

test("montant d'une vente et stock de miel", () => {
  const d = jeu();
  assert.equal(venteTotal(d, { id: "V1" }), 62);
  assert.equal(venteTotal(d, { id: "inconnue" }), 0);
  assert.deepEqual(stock(d), { pots: 18, kg: 7, kgPots: 12, valeur: 176 });
  assert.deepEqual(stock(vide()), { pots: 0, kg: 0, kgPots: 0, valeur: 0 });
});

test("bilan d'une année", () => {
  const f = fin(jeu(), 2026, MAINTENANT);
  assert.equal(f.ca, 74);              // 62 (V1) + 12 (V2), payé ou non
  assert.equal(f.encaisse, 62);
  assert.equal(f.aEncaisser, 12);
  assert.equal(f.charges, 40);
  assert.equal(f.resultat, 34);
  assert.equal(f.kgRec, 20);
  assert.equal(f.kgVendu, 2.5 + 0.5); // 5 pots de 500 g + 2 pots de 250 g
  assert.equal(f.coutKg, 2);
  assert.equal(f.prixKg, 74 / 3);
  assert.equal(f.report, 50 - 20);    // 2025 : 50 encaissés, 20 dépensés
  assert.equal(f.tresoFin, 30 + 62 - 40);
  assert.equal(f.mCa[2], 62);
  assert.equal(f.mEnc[9], 0);
  assert.equal(f.mDep[1], 30);
  assert.equal(f.mPots[2], 6);
});

test("trésorerie : seulement les mois écoulés", () => {
  const f = fin(jeu(), 2026, MAINTENANT);
  assert.equal(f.treso.length, 12);
  assert.equal(f.treso[0], 30);
  assert.equal(f.treso[1], 0);         // 30 − 30 de dépenses en février
  assert.equal(f.treso[2], 62);
  assert.equal(f.treso[10], 52);       // novembre : − 10
  assert.equal(f.treso[11], null);     // décembre pas encore écoulé
  assert.ok(fin(jeu(), 2027, MAINTENANT).treso.every((x) => x === null), "année future : aucun mois");
  assert.ok(fin(jeu(), 2025, MAINTENANT).treso.every((x) => x !== null), "année passée : douze mois");
});

test("année vide : pas de division par zéro", () => {
  const f = fin(vide(), 2026, MAINTENANT);
  assert.equal(f.ca, 0);
  assert.equal(f.resultat, 0);
  assert.equal(f.coutKg, null);
  assert.equal(f.prixKg, null);
  assert.equal(f.report, 0);
  assert.ok(f.mCa.every((x) => x === 0));
  const g = fin(jeu(), 2020, MAINTENANT);
  assert.equal(g.ventes.length, 0);
  assert.equal(g.coutKg, null);
});

test("rythme de vente sur 90 jours", () => {
  const r = rythme(jeu(), MAINTENANT);
  assert.equal(r.mois, 1 / 3);         // seule V2 (20 oct.) est dans les 90 jours
  assert.equal(r.moisRestants, 18 * 3);
  const sans = rythme(vide(), MAINTENANT);
  assert.equal(sans.mois, 0);
  assert.equal(sans.moisRestants, null);
});
