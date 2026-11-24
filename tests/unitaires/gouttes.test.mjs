// Gouttes d'API (IT-27, migration 029) : coût réel d'une réponse, en gouttes (1 goutte = 1 centime d'euro).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { coutUsd, gouttes, tarif, additionner, TARIFS } from "../../supabase/functions/assistant/gouttes.js";
import * as R from "../../src/domaines/compte/regles-offre.js";

test("assistant, lire-facture et lire-carnet partagent exactement le même calcul", () => {
  assert.equal(fs.readFileSync("supabase/functions/assistant/gouttes.js", "utf8"), fs.readFileSync("supabase/functions/lire-facture/gouttes.js", "utf8"));
  assert.equal(fs.readFileSync("supabase/functions/assistant/gouttes.js", "utf8"), fs.readFileSync("supabase/functions/lire-carnet/gouttes.js", "utf8"));
});

test("facture mesurée en production le 17 nov. 2026 : 4,4 centimes de dollar, soit 4 gouttes", () => {
  const u = { input_tokens: 4532, cache_creation_input_tokens: 2153, cache_read_input_tokens: 0, output_tokens: 2964 };
  assert.ok(Math.abs(coutUsd("claude-sonnet-5-5", u) - 0.0440) < 0.0002);
  assert.equal(gouttes("claude-sonnet-5-5", u), 4.01);
});

test("réponse rapide : Haiku environ 20 fois moins cher, jamais moins de 0,01 goutte", () => {
  const u = { input_tokens: 6000, cache_read_input_tokens: 4000, output_tokens: 600 };
  const s = gouttes("claude-sonnet-5-5", u), h = gouttes("claude-haiku-5-5", u);
  assert.ok(s / h > 15, `${s} contre ${h}`);
  assert.equal(gouttes("claude-haiku-5-5", { input_tokens: 10 }), 0.01);
});

test("Haiku au-delà de 100 000 jetons lus : tarif 5 fois plus haut", () => {
  const a = coutUsd("claude-haiku-5-5", { input_tokens: 100000 }), b = coutUsd("claude-haiku-5-5", { input_tokens: 100001 });
  assert.ok(b / a > 4.9);
});

test("modèle inconnu : compté au plus cher, jamais gratuit", () => {
  assert.equal(tarif("modele-inconnu"), TARIFS["claude-sonnet-5-5"]);
});

test("taux de change : réglable, valeur absurde ignorée", () => {
  const u = { output_tokens: 1000 };
  assert.equal(gouttes("claude-sonnet-5-5", u, 1), 1);
  assert.equal(gouttes("claude-sonnet-5-5", u, -3), gouttes("claude-sonnet-5-5", u));
});

test("usage de plusieurs tours additionné", () => {
  assert.deepEqual(additionner({ input_tokens: 1, output_tokens: 2 }, { input_tokens: 3, cache_read_input_tokens: 4 }),
    { input_tokens: 4, output_tokens: 2, cache_read_input_tokens: 4, cache_creation_input_tokens: 0 });
});

test("affichage : gouttes, prix et équivalence en questions", () => {
  assert.equal(R.gouttesTexte(0.2), "0,2 goutte");
  assert.equal(R.gouttesTexte(3), "3 gouttes");
  assert.equal(R.gouttesTexte(462.5), "463 gouttes");
  assert.equal(R.prix(3900), "39 €");
  assert.equal(R.prix(1190), "11,90 €");
  assert.equal(R.environQuestions(200), "environ 70 questions");
  assert.equal(R.environQuestions(30), "environ 10 questions");
});

test("jauge et seuil d'alerte", () => {
  assert.equal(R.part(63, 200), 32);
  assert.equal(R.part(-2, 200), 0);
  assert.equal(R.part(5, 0), 0);
  assert.equal(R.etatGouttes(0), "epuise");
  assert.equal(R.etatGouttes(12), "bas");
  assert.equal(R.etatGouttes(80), "ok");
});

test("offre affichée : essai, échéance, résiliation", () => {
  const d = new Date("2026-11-18T10:00:00+01:00");
  assert.equal(R.statutTexte({ statut: "essai", fin: "2026-12-18T10:00:00+01:00" }, d), "essai jusqu'au 18 déc.");
  assert.equal(R.statutTexte({ statut: "resilie", fin: "2027-03-01T00:00:00+01:00" }, d), "résiliée, jusqu'au 1 mars");
  assert.equal(R.statutTexte({ statut: "actif", fin: null }, d), "active");
  assert.equal(R.statutTexte(null, d), "gratuite");
});
