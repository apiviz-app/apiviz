// Règles sanitaires et créneaux météo. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { tauxVarroa, seuilVarroa } from "../../src/domaines/sante/regles.js";
import { niveau, analyse, causes, resumeJour } from "../../src/domaines/meteo/regles.js";

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

test("causes d'une heure, valeur par valeur (v5.45)", () => {
  assert.deepEqual(causes(S, 18, 0, 5), { pluie: false, vent: false, temp: 0 });
  assert.deepEqual(causes(S, 14, 0, 5), { pluie: false, vent: false, temp: 1 });
  assert.deepEqual(causes(S, 11, 40, 30), { pluie: true, vent: true, temp: 2 });
  assert.equal(causes(S, 18, 5, 5, 0.2).pluie, true, "il pleut, même avec un faible risque");
});

// Jour au format de MT.parHeure : heures de 8 h à 20 h, n null hors de la plage de visite.
const jour = (t, f, opts = {}) => {
  const heures = [];
  for (let h = 8; h <= 20; h++) {
    const [temp, risque, vent, pluie = 0] = f(h), dedans = h >= S.debut && h < S.fin;
    heures.push({ h, temp, risque, vent, pluie, n: dedans ? niveau(S, temp, risque, vent, pluie) : null, passee: h < (opts.maintenant ?? 0), maintenant: h === opts.maintenant });
  }
  const avenir = heures.filter((x) => !x.passee || x.maintenant);
  return { t, heures, bonnes: avenir.filter((x) => x.n === 2).length, rapides: avenir.filter((x) => x.n === 1).length };
};

test("verdict d'un jour (v5.45)", () => {
  const auj = jour("2026-11-15", (h) => ({ 10: [12, 5, 8], 11: [14, 5, 8], 12: [17, 5, 10], 13: [19, 10, 12], 14: [19, 10, 31], 15: [18, 60, 14] })[h] || [11, 10, 8], { maintenant: 11 });
  const pluie = jour("2026-11-16", () => [13, 85, 15, 0.6]);
  const beau = jour("2026-11-17", () => [21, 5, 9]);
  const frais = jour("2026-11-18", () => [14, 5, 9]);
  const vent = jour("2026-11-19", (h) => [18, 5, h < 13 ? 36 : 30]);
  const J = [auj, pluie, beau, frais, vent];

  const a = resumeJour(S, J, auj.t, auj.t);
  assert.equal(a.ton, 2);
  assert.equal(a.titre, "Ouvrir de 12 h à 14 h");
  assert.equal(a.sous, "Visite rapide aussi possible de 11 h à 12 h.", "l'autre plage à venir, pas 10 h (passée)");
  assert.equal(a.heure, 12);
  assert.equal(a.autre, null);

  const p = resumeJour(S, J, pluie.t, auj.t);
  assert.deepEqual([p.ton, p.titre, p.sous, p.heure, p.autre.t], [0, "Pas de créneau", "Pluie toute la journée (jusqu’à 85 %).", null, beau.t]);

  assert.equal(resumeJour(S, J, beau.t, auj.t).sous, "Bonnes conditions, jusqu’à 21°.");
  const f = resumeJour(S, J, frais.t, auj.t);
  assert.deepEqual([f.ton, f.titre, f.sous, f.heure, f.autre.t], [1, "Visite rapide de 10 h à 16 h", "Un peu frais : visite courte (14° au mieux).", 10, beau.t], "meilleur jour : le plus d'heures bonnes");
  assert.equal(resumeJour(S, J, vent.t, auj.t).sous, "Vent trop fort toute la journée (jusqu’à 36 km/h).");

  const melange = jour("2026-11-20", (h) => (h < 13 ? [16, 70, 5] : [16, 5, 40]));
  assert.equal(resumeJour(S, [melange], melange.t, auj.t).sous, "Pluie, puis vent trop fort.");

  const tard = jour("2026-11-15", () => [18, 5, 5], { maintenant: 17 });
  const t = resumeJour(S, [tard, beau], tard.t, tard.t);
  assert.deepEqual([t.titre, t.sous, t.autre.t], ["Plus de créneau aujourd’hui", "La plage de visite (10 h – 16 h) est passée.", beau.t]);
  assert.equal(resumeJour(S, J, "2027-01-01", auj.t), null);
});
