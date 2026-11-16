// Garde-fou (v5.50) : deux fusions ont effacé ou doublé une rubrique du journal des versions (#33, #46, puis la v5.48 de
// l'agenda lors de la fusion de #73, deux PR portant le même numéro). Chaque numéro de version n'apparaît qu'une fois,
// du plus récent au plus ancien, sans trou depuis la v5.40 (avant, l'historique a déjà des doublons : v5.32, v5.23-24).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const texte = readFileSync(new URL("../../docs/CHANGELOG.md", import.meta.url), "utf8");
const versions = [...texte.matchAll(/^## v(\d+)\.(\d+)\b/gm)].map((m) => [Number(m[1]), Number(m[2])])
  .filter(([a, b]) => a > 5 || (a === 5 && b >= 40));

test("CHANGELOG : chaque version une seule fois, de la plus récente à la plus ancienne", () => {
  const vues = new Set();
  for (const [a, b] of versions) {
    const k = `${a}.${b}`;
    assert.ok(!vues.has(k), `v${k} apparaît deux fois : deux PR ont pris le même numéro, renuméroter la plus récente`);
    vues.add(k);
  }
  for (let i = 1; i < versions.length; i++) {
    const [a, b] = versions[i - 1], [c, d] = versions[i];
    assert.ok(a > c || (a === c && b > d), `v${c}.${d} est au-dessus de v${a}.${b} ou mal rangée`);
  }
});

test("CHANGELOG : aucune rubrique perdue depuis la v5.40", () => {
  const recentes = versions.filter(([a]) => a === 5).map(([, b]) => b);
  for (let i = 1; i < recentes.length; i++)
    assert.equal(recentes[i], recentes[i - 1] - 1, `il manque la rubrique v5.${recentes[i - 1] - 1} (effacée par une fusion ?)`);
});
