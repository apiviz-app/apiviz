// Formats (src/noyau/format.js). Lancer : npm test
// IT-03 est une refonte sans changement visible : ces tests décrivent le comportement actuel, cas limites compris.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as F from "../../src/noyau/format.js";

const nbsp = (t) => t.replace(/[  ]/g, " "); // espaces fines de toLocaleString

test("esc neutralise le HTML", () => {
  assert.equal(F.esc(`<b a="1">'&'</b>`), "&lt;b a=&quot;1&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;");
  assert.equal(F.esc(null), "");
  assert.equal(F.esc(undefined), "");
  assert.equal(F.esc(0), "0");
});

test("nombres et euros à la française", () => {
  assert.equal(nbsp(F.n(1234.56)), "1 234,6");
  assert.equal(F.n(2.5, 0), "3");
  assert.equal(F.n(null), "0");
  assert.equal(F.n("abc"), "NaN"); // comportement actuel, conservé : les champs sont numériques en amont
  assert.equal(nbsp(F.eur(1234.5)), "1 234,5 €");
  assert.equal(F.eur0(19.99), "20 €");
});

test("dates", () => {
  assert.equal(F.dfr("2026-11-06"), "06/11/2026");
  assert.equal(F.dfr(""), "–");
  assert.equal(F.dshort("2026-11-06"), "06/11");
  assert.equal(F.dshort(null), "–");
  assert.equal(F.yr("2026-11-06"), 2026);
  assert.equal(F.mo("2026-01-15"), 0);
  assert.equal(F.mo("2026-12-15"), 11);
  assert.equal(F.today(new Date(2026, 10, 6, 23, 30)), "2026-11-06");
  assert.equal(F.days("2026-11-01", new Date(2026, 10, 6, 10)), 5);
  assert.equal(F.days("2026-11-06", new Date(2026, 10, 6, 10)), 0);
});

test("sommes, recherche et champs de formulaire", () => {
  assert.equal(F.sum([], (x) => x), 0);
  assert.equal(F.sum([{ v: "2" }, { v: null }, { v: "" }, { v: 3.5 }], (x) => x.v), 5.5);
  assert.ok(Number.isNaN(F.sum([{ v: "x" }], (x) => x.v)), "texte non numérique : NaN (comportement actuel, conservé)");
  assert.deepEqual(F.byId([{ id: "a" }, { id: "b" }], "b"), { id: "b" });
  assert.equal(F.byId([], "b"), undefined);
  assert.equal(F.num(""), null);
  assert.equal(F.num(null), null);
  assert.equal(F.num("0"), 0);
  assert.equal(F.num("12.5"), 12.5);
  assert.equal(F.orNull(""), null);
});

test("haut d'axe des graphiques", () => {
  assert.equal(F.niceMax(0), 1);
  assert.equal(F.niceMax(-5), 1);
  assert.equal(F.niceMax(7), 10);
  assert.equal(F.niceMax(21), 25);
  assert.equal(F.niceMax(250), 250);
  assert.equal(F.niceMax(1001), 2000);
});
