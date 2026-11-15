// Garde-fou (v5.46) : une fusion avait retiré gabarit.css et menu.css d'index.html sans que rien ne casse à l'œil
// dans le code. Chaque feuille de styles/ et styles/composants/ doit être chargée, et le gabarit commun en dernier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const racine = new URL("../../", import.meta.url);
const index = readFileSync(new URL("index.html", racine), "utf8");
const liens = [...index.matchAll(/<link rel="stylesheet" href="(styles\/[^"]+\.css)">/g)].map((m) => m[1]);

test("index.html charge chaque feuille de styles/ et de styles/composants/", () => {
  const feuilles = [
    ...readdirSync(new URL("styles/", racine)).filter((f) => f.endsWith(".css")).map((f) => "styles/" + f),
    ...readdirSync(new URL("styles/composants/", racine)).filter((f) => f.endsWith(".css")).map((f) => "styles/composants/" + f),
  ];
  const absentes = feuilles.filter((f) => !liens.includes(f));
  assert.deepEqual(absentes, [], "feuilles non chargées par index.html : " + absentes.join(", "));
});

test("le gabarit commun et le menu sont chargés après toutes les autres feuilles", () => {
  const g = liens.indexOf("styles/composants/gabarit.css"), m = liens.indexOf("styles/composants/menu.css");
  assert.ok(g >= 0 && m >= 0);
  assert.deepEqual(liens.slice(-2), ["styles/composants/gabarit.css", "styles/composants/menu.css"]);
});
