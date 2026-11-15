// Composant « Choisir » (src/noyau/choisir.js, v5.41) : règles pures. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/noyau/choisir.js";

const opts = (...l) => l.map((valeur) => ({ valeur, detail: "" }));

test("forme : puces jusqu'à 8 choix ou pour un choix multiple, liste sous le champ au-delà", () => {
  assert.equal(C.forme(4), "A");
  assert.equal(C.forme(8), "A");
  assert.equal(C.forme(9), "B");
  assert.equal(C.forme(21), "B");
  assert.equal(C.forme(30, { multiple: true }), "A");
});

test("plat : sans accents ni majuscules", () => {
  assert.equal(C.plat("  Étiquette Été "), "etiquette ete");
  assert.equal(C.plat(null), "");
});

test("filtrer : début de mot d'abord, puis contenu ; sans accents ; position pour le gras", () => {
  const o = opts("Couvercle", "Pot 250 g vide", "Pot 500 g vide", "Étiquette 250 g", "Carton d'expédition");
  const r = C.filtrer(o, "pot");
  assert.deepEqual(r.map((x) => x.valeur), ["Pot 250 g vide", "Pot 500 g vide"]);
  assert.equal(r[0].debut, 0); assert.equal(r[0].fin, 3);
  assert.deepEqual(C.filtrer(o, "250").map((x) => x.valeur), ["Pot 250 g vide", "Étiquette 250 g"]);
  assert.deepEqual(C.filtrer(o, "etiq").map((x) => x.valeur), ["Étiquette 250 g"], "accents ignorés");
  assert.deepEqual(C.filtrer(o, "pedi").map((x) => x.valeur), ["Carton d'expédition"], "au milieu d'un mot");
  assert.equal(C.filtrer(o, "").length, 5, "vide : les premières");
  assert.equal(C.filtrer(o, "", 2).length, 2, "au plus max");
  assert.equal(C.filtrer(o, "zz").length, 0);
});

test("filtrer : les options qui commencent par le texte passent devant", () => {
  const r = C.filtrer(opts("Sirop de pot", "Pot 1 kg vide"), "pot");
  assert.deepEqual(r.map((x) => x.valeur), ["Pot 1 kg vide", "Sirop de pot"]);
});

test("existe : comparaison sans accents ni majuscules", () => {
  assert.ok(C.existe(opts("Warré"), "warre"));
  assert.ok(!C.existe(opts("Warré"), "War"));
});

test("valeurs et basculer : champ multiple « a, b », sans doublon", () => {
  assert.deepEqual(C.valeurs(" Marché, ,Famille "), ["Marché", "Famille"]);
  assert.equal(C.basculer("Marché", "Famille"), "Marché, Famille");
  assert.equal(C.basculer("Marché, Famille", "famille"), "Marché", "retire sans tenir compte des majuscules");
  assert.equal(C.basculer("", "AMAP"), "AMAP");
});

test("le module se charge sans navigateur (demarrer ne fait rien)", () => {
  assert.doesNotThrow(() => C.demarrer());
});
