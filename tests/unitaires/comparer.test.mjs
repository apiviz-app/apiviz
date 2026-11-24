// Comparer mes ruchers (v5.81). src/domaines/ruchers/comparer-regles.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/domaines/ruchers/comparer-regles.js";

const mk = (id, rucher, extra = {}) => ({ id, nom: id, rucher, date_creation: "2023-04-01", ...extra });
const ruches = [mk("v1", "Verger"), mk("v2", "Verger"), mk("l1", "Lande"), mk("c1", "Combes"), mk("c2", "Combes")];
const ruchesSorties = [mk("c3", "Combes", { sortie: "Morte", date_sortie: "2026-02-10" }), mk("x", "Lande", { sortie: "Morte", date_sortie: "2024-02-01" })];
const rec = (ruche_id, date, kg) => ({ ruche_id, date_recolte: date, kg });
const recoltes = [
  rec("v1", "2026-06-12", 30), rec("v2", "2026-06-12", 32), rec("l1", "2026-07-01", 22), rec("c1", "2026-06-20", 12),
  rec("v1", "2025-06-12", 28), rec("l1", "2025-07-01", 24), rec("c1", "2025-06-20", 13),
  rec("v1", "2024-06-12", 26), rec("l1", "2024-07-01", 19), rec("c1", "2024-06-20", 14),
];
const operations = [{ id: "o", date_operation: "2026-08-10", methode: "Sucre glace", echantillon_abeilles: 300 }];
const comptesVarroa = [{ id: "a", operation_id: "o", ruche_id: "c1", varroa: 12 }, { id: "b", operation_id: "o", ruche_id: "v1", varroa: 3 }];
const d = { ruches, ruchesSorties, recoltes, operations, comptesVarroa, visites: [] };

test("une ligne par rucher : colonies de l'année, kilos, kilos par colonie, pertes, varroa, valeur, 3 saisons", () => {
  const l = C.comparer(d, 2026, { prixKg: 14, ctx: { seuils: [], reglages: { varroaSeuil: 3 } } });
  const par = Object.fromEntries(l.map((x) => [x.cle, x]));
  assert.deepEqual(Object.keys(par).sort(), ["Combes", "Lande", "Verger"]);
  assert.equal(par.Verger.colonies, 2);
  assert.equal(par.Verger.kgParColonie, 31);
  assert.equal(par.Combes.colonies, 3, "c3 morte en février 2026 compte dans l'année");
  assert.equal(par.Combes.kgParColonie, 4);
  assert.equal(par.Combes.pertes, 1);
  assert.equal(par.Combes.varroa, 4);
  assert.equal(par.Combes.auDessus, 1);
  assert.equal(par.Verger.auDessus, 0);
  assert.equal(par.Lande.colonies, 1, "x morte en 2024 ne compte pas");
  assert.equal(par.Verger.valeur, 868);
  assert.deepEqual(par.Lande.histoire.map((h) => h.kgParColonie), [9.5, 24, 22], "2024 : x vivait encore (2 colonies)");
});

test("tri selon le critère", () => {
  const l = C.comparer(d, 2026, { prixKg: 14, ctx: {} });
  assert.deepEqual(C.trier(l, "kg").map((x) => x.cle), ["Verger", "Lande", "Combes"]);
  assert.deepEqual(C.trier(l, "pertes").map((x) => x.cle), ["Lande", "Verger", "Combes"], "à égalité : ordre alphabétique");
  assert.deepEqual(C.trier(l, "varroa").map((x) => x.cle), ["Verger", "Combes", "Lande"], "Lande sans comptage : à la fin");
  assert.deepEqual(C.trier(C.comparer(d, 2026, {}), "valeur").map((x) => x.cle), ["Combes", "Lande", "Verger"], "sans prix : ordre alphabétique");
});

test("repères et lecture prudente", () => {
  const l = C.comparer(d, 2026, { ctx: {} });
  assert.deepEqual(C.reperes(l), { meilleur: "Verger", faible: "Combes" });
  const t = C.lecture(l);
  assert.match(t, /^À « Combes » : le plus faible 3 saisons de suite, le varroa le plus haut, le plus de pertes\. Ce n’est pas une cause prouvée/);
  assert.equal(C.lecture([l[0]]), "", "un seul rucher : rien à comparer");
});

test("vécu en : sorties et dates", () => {
  assert.equal(C.vecuEn(mk("a", "x", { date_creation: "2027-01-01" }), 2026), false);
  assert.equal(C.vecuEn(mk("a", "x", { sortie: "Morte" }), 2026), false, "sortie sans date : ne compte pas");
  assert.equal(C.vecuEn(mk("a", "x", { sortie: "Vendue", date_sortie: "2026-05-01" }), 2026), true);
});
