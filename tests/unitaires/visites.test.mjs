// Règles des visites (src/domaines/visites/regles.js). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { appliquerVisite } from "../../src/domaines/visites/regles.js";

const donnees = () => ({
  ruches: [{ id: "R1", etat: "Bonne" }],
  articles: [{ id: "A1", stock: "5" }],
  visites: [{ id: "V0", ruche_id: "R1", date_visite: "2026-10-01" }],
  intrants: [],
});

test("une visite enregistrée apparaît comme après creer_visite", () => {
  const d = appliquerVisite(donnees(), { id: "V1", ruche_id: "R1", date_visite: "2026-11-06", activite: "Forte", poids_kg: "38.5", varroa: "",
    etat: "À surveiller", intrants: [{ article_id: "A1", quantite: 0.5 }] }, { auteur: "x" });
  assert.equal(d.visites[0].id, "V1", "la plus récente en premier");
  assert.equal(d.visites[0].poids_kg, 38.5);
  assert.equal(d.visites[0].varroa, null);
  assert.equal(d.visites[0].auteur, "x");
  assert.deepEqual(d.intrants, [{ visite_id: "V1", article_id: "A1", quantite: 0.5 }]);
  assert.equal(d.articles[0].stock, 4.5);
  assert.equal(d.ruches[0].etat, "À surveiller");
});

test("deux fois la même visite : appliquée une seule fois", () => {
  const d = donnees(), p = { id: "V1", ruche_id: "R1", date_visite: "2026-11-06", intrants: [{ article_id: "A1", quantite: 1 }] };
  appliquerVisite(d, p); appliquerVisite(d, p);
  assert.equal(d.visites.length, 2);
  assert.equal(d.articles[0].stock, 4);
});

test("champs vides, ruche ou article inconnus : rien ne casse", () => {
  const d = appliquerVisite(donnees(), { id: "V2", ruche_id: "R9", date_visite: "2026-11-06", intrants: [{ article_id: "A9", quantite: 1 }] });
  assert.equal(d.visites.length, 2);
  assert.equal(d.visites[0].poids_kg, null);
  assert.equal(d.ruches[0].etat, "Bonne");
});
