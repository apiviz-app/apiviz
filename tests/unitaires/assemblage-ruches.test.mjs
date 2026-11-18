// Règles de l'assemblage des ruches physiques (migration 026) : composition d'un type, bilan du stock, application
// hors ligne. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as A from "../../src/domaines/colonies/regles-assemblage.js";

const base = () => ({
  articles: [
    { id: "pl", nom: "Plancher", stock: 5 },
    { id: "ca", nom: "Cadres", stock: 40 },
    { id: "ci", nom: "Cire", stock: 12 },
  ],
  compositions: [
    { type: "Dadant 10 cadres", article_id: "pl", quantite: 1 },
    { type: "Dadant 10 cadres", article_id: "ca", quantite: 10 },
    { type: "Dadant 10 cadres", article_id: "ci", quantite: 10 },
    { type: "Warré", article_id: "disparu", quantite: 1 },
  ],
  contenants: [], mouvements: [],
});

test("composition d'un type : casse et accents ignorés, pièces supprimées du stock écartées", () => {
  const d = base();
  assert.equal(A.composition(d, "dadant 10 CADRES").length, 3);
  assert.deepEqual(A.composition(d, "Warre"), []);
  assert.deepEqual(A.composition(d, ""), []);
  assert.deepEqual(A.typesComposes(d), ["Dadant 10 cadres", "Warré"]);
});

test("bilan : quantité × nombre de ruches, stock après, manque", () => {
  const d = base(), b = A.bilan(d, A.composition(d, "Dadant 10 cadres"), 2);
  assert.deepEqual(b.lignes.map((l) => [l.article.id, l.total, l.apres, l.manque]), [["pl", 2, 3, 0], ["ca", 20, 20, 0], ["ci", 20, -8, 8]]);
  assert.equal(A.phraseManque(b), "Il manque 8 Cire.");
  assert.equal(A.resume(b), "2 Plancher, 20 Cadres, 20 Cire");
  assert.equal(A.bilan(d, [{ article_id: "pl", quantite: 0 }], 2).lignes.length, 0, "une pièce à zéro ne compte pas");
});

test("appliquer hors ligne : ruches ajoutées, stock retiré, rien en double", () => {
  const d = base(), pieces = A.composition(d, "Dadant 10 cadres");
  const p = { ruches: [{ id: "c13", code: "13" }, { id: "c14", code: "14" }], type: "Dadant 10 cadres", pieces, date: "2026-11-17" };
  A.appliquer(d, p);
  A.appliquer(d, p);
  assert.equal(d.contenants.length, 2);
  assert.deepEqual(d.articles.map((a) => a.stock), [3, 20, -8]);
  assert.equal(d.mouvements.filter((m) => m.origine === "assemblage").length, 3);
});
