// Actions groupées sur plusieurs colonies (IT-10, AP-US-046). src/domaines/colonies/groupe.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../../src/domaines/colonies/groupe.js";

const dix = Array.from({ length: 10 }, (_, i) => ({ id: "r" + i, nom: "Ruche " + (i + 1), hausses: i % 3, etat: "Bonne" }));
const ids = dix.map((r) => r.id);

test("+1 hausse sur 10 colonies : chacune a une hausse de plus, et le toast le dit", () => {
  const p = G.preparer("x1", "hausse", ids);
  assert.deepEqual(p.valeur, { delta: 1 });
  assert.equal(G.message(p), "Hausse posée sur 10 colonies.");
  const copie = dix.map((r) => ({ ...r }));
  const { apres, avant } = G.effet(copie, p);
  G.appliquer(copie, apres);
  assert.ok(copie.every((r, i) => r.hausses === dix[i].hausses + 1));
  G.appliquer(copie, avant);
  assert.deepEqual(copie, dix, "Annuler remet tout comme avant");
});

test("hausses jamais sous zéro, et messages au pluriel", () => {
  const p = G.preparer("x2", "hausse", ["r0"], { delta: -2 });
  assert.equal(G.effet(dix, p).apres[0].champs.hausses, 0);
  assert.equal(G.message(p), "2 hausses retirées sur 1 colonie.");
  assert.equal(G.message(G.preparer("x3", "hausse", ["r0", "r1"], { delta: 2 })), "2 hausses posées sur 2 colonies.");
});

test("état et tâche", () => {
  const e = G.preparer("x4", "etat", ["r0", "r1"], { etat: "À surveiller" });
  assert.equal(G.message(e), "État « À surveiller » sur 2 colonies.");
  assert.deepEqual(G.effet(dix, e).apres.map((c) => c.champs.etat), ["À surveiller", "À surveiller"]);
  const t = G.preparer("x5", "tache", ["r0"], { titre: "  Poser la grille  ", echeance: "2026-12-01" });
  assert.deepEqual(t.valeur, { titre: "Poser la grille", echeance: "2026-12-01" });
  assert.deepEqual(G.effet(dix, t).apres, [], "une tâche ne change pas la colonie");
});

test("doublons retirés, erreurs en français", () => {
  assert.deepEqual(G.preparer("x6", "hausse", ["r0", "r0"]).ruches, ["r0"]);
  assert.equal(G.verifier("hausse", []), "Choisis au moins une colonie.");
  assert.equal(G.verifier("etat", ids, { etat: "Parfaite" }), "Choisis un état.");
  assert.equal(G.verifier("tache", ids, { titre: " " }), "Indique la tâche à faire.");
  assert.equal(G.verifier("hausse", ids), "");
  assert.equal(G.DELAI_ANNULER_MS, 5000);
});
