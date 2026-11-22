// Ordre de passage d'une tournée (IT-10, AP-US-045). src/domaines/visites/ordre-tournee.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as O from "../../src/domaines/visites/ordre-tournee.js";

const ruches = [
  { id: "a", nom: "Ruche 1", etat: "Bonne", ordre_pose: 3 },
  { id: "b", nom: "Ruche 2", etat: "Critique", ordre_pose: 1 },
  { id: "c", nom: "Ruche 10", etat: "À surveiller", ordre_pose: null },
  { id: "d", nom: "Ruche 3", etat: "Bonne", ordre_pose: 2 },
  { id: "e", nom: "Ruche 9", etat: "Bonne" },
];
const ids = ["a", "b", "c", "d", "e"];
const vues = { a: "2026-11-01", b: "2026-11-04", c: "2026-10-01", d: "", e: "2026-11-02" };

test("ordre de pose : la place notée d'abord, puis les autres par nom", () => {
  assert.deepEqual(O.ordonner(ids, ruches, "pose"), ["b", "d", "a", "e", "c"]);
});

test("priorité : critiques, à surveiller, puis les moins récemment vues (ordre v5.11)", () => {
  assert.deepEqual(O.ordonner(ids, ruches, "priorite", (id) => vues[id]), ["b", "c", "d", "a", "e"]);
});

test("les prioritaires sont signalées quel que soit l'ordre", () => {
  assert.deepEqual(ruches.filter(O.prioritaire).map((r) => r.id), ["b", "c"]);
});

test("ordre proposé : la pose dès qu'une colonie est rangée, sinon la priorité ; le choix de la personne l'emporte", () => {
  assert.equal(O.ordreParDefaut(ids, ruches), "pose");
  assert.equal(O.ordreParDefaut(["e"], ruches), "priorite");
  assert.equal(O.ordreParDefaut(ids, ruches, "priorite"), "priorite");
});

test("déplacer une colonie dans la liste", () => {
  assert.deepEqual(O.deplacer(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepEqual(O.deplacer(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  assert.deepEqual(O.deplacer(["a", "b", "c"], 0, 5), ["a", "b", "c"]);
});

test("colonie inconnue : rangée en dernier sans erreur", () => {
  assert.deepEqual(O.ordonner(["x", "b"], ruches, "pose"), ["b", "x"]);
});
