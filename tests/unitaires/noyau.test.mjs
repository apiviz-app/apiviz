// Table des écrans et actions (src/noyau/routeur.js, actions.js). Lancer : npm test
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/noyau/routeur.js";
import * as A from "../../src/noyau/actions.js";

beforeEach(() => { R._reinitialiser(); A._reinitialiser(); });

test("un écran enregistré est trouvé ; un autre non", () => {
  const rendu = () => "ruches";
  R.enregistrer({ id: "ruches", rendu });
  assert.equal(R.ecran("ruches").rendu, rendu);
  assert.equal(R.ecran("dash"), null);
  assert.deepEqual(R.liste(), ["ruches"]);
});

test("un écran ne peut pas être enregistré deux fois", () => {
  R.enregistrer({ id: "ruches", rendu: () => {} });
  assert.throws(() => R.enregistrer({ id: "ruches", rendu: () => {} }), /déjà enregistré/);
  assert.throws(() => R.enregistrer({ id: "x" }), /obligatoires/);
});

test("actions : une seule déclaration, remplacement explicite", () => {
  const ACT = { go: () => "ancien" };
  A.enregistrerActions(ACT, "ruches", { trier: () => 1 });
  assert.equal(A.proprietaire("trier"), "ruches");
  assert.throws(() => A.enregistrerActions(ACT, "dash", { trier: () => 2 }), /déjà déclarée par l'écran « ruches »/);
  assert.throws(() => A.enregistrerActions(ACT, "dash", { go: () => 2 }), /remplace/);
  A.enregistrerActions(ACT, "dash", { go: () => "nouveau" }, { remplace: ["go"] });
  assert.equal(ACT.go(), "nouveau");
});

import * as C from "../../src/noyau/crochets.js";

test("crochets : avant du dernier au premier, après du premier au dernier", () => {
  C._reinitialiser();
  const trace = [];
  for (const m of ["rappels", "ux", "nav4"]) {
    C.sur("avantRendu", m, () => { trace.push("avant " + m); });
    C.sur("apresRendu", m, () => { trace.push("après " + m); });
  }
  assert.equal(C.lancer("avantRendu"), false);
  C.lancer("apresRendu");
  assert.deepEqual(trace, ["avant nav4", "avant ux", "avant rappels", "après rappels", "après ux", "après nav4"]);
  assert.throws(() => C.sur("apresRendu", "ux", () => {}), /déjà déclaré/);
  assert.throws(() => C.sur("pendant", "x", () => {}), /inconnu/);
});

test("crochets : arrêt du rendu et transformation des arguments de la coquille", () => {
  C._reinitialiser();
  // « premier » est déclaré d'abord : il passerait en dernier, après l'arrêt demandé par « squelette ».
  C.sur("avantRendu", "premier", () => { throw new Error("ne doit pas tourner après un arrêt"); });
  C.sur("avantRendu", "squelette", () => true);
  assert.equal(C.lancer("avantRendu"), true);
  C.sur("avantCoquille", "titres", (a) => ["Miel", ...a.slice(1)]);
  C.sur("apresCoquille", "voir", (a) => assert.equal(a[0], "Miel"));
  const a = C.coquille("avantCoquille", ["Stocks", "", ""]);
  assert.deepEqual(a, ["Miel", "", ""]);
  C.coquille("apresCoquille", a);
});
