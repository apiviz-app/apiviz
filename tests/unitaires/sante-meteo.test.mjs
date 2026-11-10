// Règles sanitaires et créneaux météo. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { tauxVarroa, seuilVarroa } from "../../src/domaines/sante/regles.js";
import { niveau, analyse } from "../../src/domaines/meteo/regles.js";

test("taux de varroa pour 100 abeilles", () => {
  assert.equal(tauxVarroa({ varroa: 12, varroa_abeilles: 300, varroa_methode: "Sucre glace" }), 4);
  assert.equal(tauxVarroa({ varroa: 0, varroa_abeilles: 300 }), 0);
  assert.equal(tauxVarroa({ varroa: 5, varroa_abeilles: 0 }), null, "division par zéro évitée");
  assert.equal(tauxVarroa({ varroa: 5 }), null, "abeilles non comptées");
  assert.equal(tauxVarroa({ varroa: null, varroa_abeilles: 300 }), null);
  assert.equal(tauxVarroa({ varroa: 5, varroa_abeilles: 300, varroa_methode: "Lange" }), null, "Lange : chute, pas de taux");
  assert.equal(tauxVarroa(undefined), null);
});

test("seuil varroa réglable", () => {
  assert.equal(seuilVarroa({}), 3);
  assert.equal(seuilVarroa(undefined), 3);
  assert.equal(seuilVarroa({ varroaSeuil: "2" }), 2);
  assert.equal(seuilVarroa({ varroaSeuil: "" }), 3);
});

// Les valeurs des seuils viennent de meteo.js ; ici, des valeurs fixes pour tester la règle seule.
const S = { ouvrir: 15, rapide: 13, vent: 25, pluie: 30, debut: 10, fin: 16 };

test("niveau d'une heure", () => {
  assert.equal(niveau(S, 18, 0, 5), 2);
  assert.equal(niveau(S, 14, 0, 5), 1);
  assert.equal(niveau(S, 12, 0, 5), 0);
  assert.equal(niveau(S, 20, 30, 5), 0, "risque de pluie au seuil");
  assert.equal(niveau(S, 20, 0, 25), 0, "vent au seuil");
  assert.equal(niveau(S, 20, 0, 5, 0.2), 0, "il pleut");
});

const heures = (jours, f) => {
  const time = [], temperature_2m = [], precipitation_probability = [], wind_speed_10m = [];
  jours.forEach((j) => { for (let h = 0; h < 24; h++) { const [t, p, v] = f(j, h); time.push(`${j}T${String(h).padStart(2, "0")}:00`); temperature_2m.push(t); precipitation_probability.push(p); wind_speed_10m.push(v); } });
  return { time, temperature_2m, precipitation_probability, wind_speed_10m };
};

test("meilleur créneau : le meilleur niveau, le plus tôt", () => {
  const jours = ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"];
  const a = analyse(S, {
    current: { time: "2026-11-06T09:00", temperature_2m: 12, wind_speed_10m: 5 },
    hourly: heures(jours, (j, h) => [j === "2026-11-07" && h === 14 ? 17 : 14, 0, 5]),
    daily: { time: jours, temperature_2m_max: [14, 17, 14, 14] },
  });
  assert.deepEqual([a.creneau.jour, a.creneau.h, a.creneau.n], ["2026-11-07", 14, 2]);
  assert.equal(a.verdict, "Trop tôt pour ouvrir");
  assert.equal(a.jours.length, 3);
  assert.ok(a.jours.every((x) => x.ok));
});

test("aucun créneau : pluie partout, et réponse vide", () => {
  const jours = ["2026-11-06", "2026-11-07"];
  const a = analyse(S, {
    current: { time: "2026-11-06T11:00", temperature_2m: 18, wind_speed_10m: 5, precipitation: 0 },
    hourly: heures(jours, () => [18, 80, 5]),
    daily: { time: jours },
  });
  assert.equal(a.creneau, null);
  assert.equal(a.verdict, "Pluie probable");
  const v = analyse(S, {}, new Date("2026-11-06T17:00:00Z"));
  assert.equal(v.creneau, null);
  assert.deepEqual(v.jours, []);
});

test("raison d'une heure défavorable, dans l'ordre pluie, vent, température", async () => {
  const { raison } = await import("../../src/domaines/meteo/regles.js");
  assert.equal(raison(S, 18, 0, 5), "");
  assert.equal(raison(S, 18, 0, 5, 0.4), "Il pleut");
  assert.equal(raison(S, 18, 45, 40), "Pluie probable (45 %)", "la pluie passe avant le vent");
  assert.equal(raison(S, 18, 10, 31.6), "Trop de vent (32 km/h)");
  assert.equal(raison(S, 11.4, 0, 5), "Trop frais (11°)");
  assert.equal(raison(S, 14, 0, 5), "Un peu frais : visite courte");
});

test("plages d'heures favorables", async () => {
  const { plages } = await import("../../src/domaines/meteo/regles.js");
  const h = (n) => n.map((x, i) => ({ h: 10 + i, n: x }));
  assert.deepEqual(plages(h([0, 2, 2, 2, 0, 1])), [{ debut: 11, fin: 14, n: 2 }, { debut: 15, fin: 16, n: 1 }]);
  assert.deepEqual(plages(h([1, 2, 2, 1])), [{ debut: 10, fin: 11, n: 1 }, { debut: 11, fin: 13, n: 2 }, { debut: 13, fin: 14, n: 1 }], "une heure rapide coupe une plage bonne");
  assert.deepEqual(plages(h([0, null, 0])), []);
  assert.deepEqual(plages([{ h: 10, n: 2 }, { h: 12, n: 2 }]), [{ debut: 10, fin: 11, n: 2 }, { debut: 12, fin: 13, n: 2 }], "un trou coupe la plage");
});
