// Rappels même quand Apiviz est fermée (v5.87, fonction « rappels », migration 040) : règles pures.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../supabase/functions/rappels/regles.js";

const RUCHES = [
  { id: "a", nom: "Ruche 1", rucher: "Le Verger", sortie: "", created_at: "2026-03-01T10:00:00Z" },
  { id: "b", nom: "Ruche 2", rucher: "Le Verger", sortie: "", created_at: "2026-03-01T10:00:00Z" },
  { id: "c", nom: "Ruche 3", rucher: "La Lande", sortie: "", created_at: "2026-03-01T10:00:00Z" },
  { id: "d", nom: "Ruche 4", rucher: "La Lande", sortie: "Morte", created_at: "2026-03-01T10:00:00Z" },
  { id: "e", nom: "Ruche 5", rucher: "La Lande", sortie: "", created_at: "2026-11-20T10:00:00Z" },
];

test("ruches à voir : en place, 30 jours sans visite, rucher le plus chargé d'abord", () => {
  const g = R.ruchesAVoir(RUCHES, { a: "2026-10-01", b: "2026-11-20", c: "2026-09-01" }, "2026-11-24");
  assert.deepEqual(g, [{ rucher: "La Lande", ruches: ["Ruche 3"] }, { rucher: "Le Verger", ruches: ["Ruche 1"] }]);
  assert.deepEqual(R.ruchesAVoir(RUCHES, { a: "2026-11-20", b: "2026-11-20", c: "2026-11-20" }, "2026-11-24"), [], "visitées récemment ; Ruche 5 trop récente ; Ruche 4 sortie");
});

test("rappel « ruches à visiter » : texte et clé de semaine", () => {
  const r = R.rappelVisites([{ rucher: "Le Verger", ruches: ["Ruche 1", "Ruche 2", "Ruche 3"] }], "2026-11-24");
  assert.equal(r.titre, "3 ruches pas vues depuis 30 jours");
  assert.equal(r.corps, "Elles attendent ta visite au Verger.");
  assert.equal(r.cle, "visites-2026-W48");
  assert.equal(R.rappelVisites([], "2026-11-24"), null);
});

test("créneau météo : 15 °C, vent sous 20 km/h, moins de 1 mm", () => {
  assert.equal(R.bonCreneau({ tmax: 19, vent: 8, pluie: 0 }), true);
  assert.equal(R.bonCreneau({ tmax: 14, vent: 8, pluie: 0 }), false);
  assert.equal(R.bonCreneau({ tmax: 19, vent: 25, pluie: 0 }), false);
  assert.equal(R.bonCreneau({ tmax: 19, vent: 8, pluie: 2 }), false);
  const r = R.rappelMeteo("Le Verger", { tmax: 19.4, vent: 8, pluie: 0 }, 5, "2026-11-27");
  assert.equal(r.titre, "Beau créneau samedi au Verger");
  assert.equal(r.corps, "19 °C, peu de vent. 5 ruches à voir.");
  assert.equal(R.rappelMeteo("Le Verger", { tmax: 10, vent: 8, pluie: 0 }, 5, "2026-11-27"), null);
});

test("gestes de saison : une fois par an et par période", () => {
  assert.equal(R.rappelSaison("2026-12-08").cle, "saison-varroa-hiver-2026");
  assert.equal(R.rappelSaison("2026-12-08", new Set(["saison-varroa-hiver-2026"])), null);
  assert.equal(R.rappelSaison("2026-11-24"), null);
  assert.equal(R.rappelSaison("2027-04-25").titre, "Pense aux hausses");
});

test("choisir : deux par semaine, pas deux jours de suite, jamais deux fois le même, types respectés", () => {
  const now = new Date("2026-11-24T08:00:00Z");
  const c = [{ type: "saison", cle: "s1" }, { type: "visites", cle: "v1" }];
  assert.equal(R.choisir(c, {}, [], now).cle, "s1");
  assert.equal(R.choisir(c, { saison: false }, [], now).cle, "v1", "type refusé");
  assert.equal(R.choisir(c, {}, [{ type: "saison", cle: "s1", envoye_le: "2026-11-20T08:00:00Z" }], now).cle, "v1", "déjà envoyé");
  assert.equal(R.choisir(c, {}, [{ type: "meteo", cle: "m", envoye_le: "2026-11-23T20:00:00Z" }], now), null, "la veille au soir");
  assert.equal(R.choisir(c, {}, [{ type: "meteo", cle: "m", envoye_le: "2026-11-19T08:00:00Z" }, { type: "visites", cle: "v0", envoye_le: "2026-11-21T08:00:00Z" }], now), null, "deux cette semaine");
  assert.equal(R.choisir(c, {}, [{ type: "meteo", cle: "m", envoye_le: "2026-11-10T08:00:00Z" }, { type: "visites", cle: "v0", envoye_le: "2026-11-21T08:00:00Z" }], now).cle, "s1", "un seul dans les 7 jours");
});

test("nom du rucher avec son article", () => {
  assert.equal(R.aRucher("Le Verger"), "au Verger");
  assert.equal(R.aRucher("La Lande"), "à la Lande");
  assert.equal(R.aRucher("Les Combes"), "aux Combes");
  assert.equal(R.aRucher("L'Orée"), "à l’Orée");
  assert.equal(R.aRucher("Bois Joli"), "au rucher Bois Joli");
});

test("semaine ISO", () => {
  assert.equal(R.semaine("2026-11-24"), "2026-W48");
  assert.equal(R.semaine("2027-01-01"), "2026-W53");
  assert.equal(R.semaine("2026-01-05"), "2026-W02");
});
