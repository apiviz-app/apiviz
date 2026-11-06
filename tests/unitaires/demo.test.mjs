// Données de démonstration (IT-04, AP-TECH-057) : le script refuse la production, sans rien contacter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { operations } from "../demo/operations.mjs";

test("scripts/demo.mjs refuse la base de production", () => {
  const r = spawnSync(process.execPath, ["scripts/demo.mjs", "config.js"], { env: { ...process.env, APIDOO_DEMO_EMAIL: "x@x.fr", APIDOO_DEMO_MOT_DE_PASSE: "x" }, encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /REFUS : .*production/);
});

test("le fichier de démonstration ne contient ni traitement, ni dose, ni seuil sanitaire", () => {
  const brut = fs.readFileSync("tests/demo/exploitation-demo.json", "utf8");
  assert.doesNotMatch(brut, /"traitement|"traitement_dose|"lot_produit|"retrait_prevu/);
  const ops = operations(JSON.parse(brut), "00000000-0000-4000-8000-000000000000");
  assert.ok(ops.every((o) => !o.lignes || o.lignes.every((l) => !("exploitation_id" in l))), "l'exploitation vient toujours de la base");
});
