// Tests des retours de réussite (v5.68) : préférences, sons, messages de réussite, rayon de la saison, jalons.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/retours/regles.js";

test("préférences : ambiance Alvéole, volume moyen, vibrations et animations par défaut ; valeurs inconnues ignorées", () => {
  assert.deepEqual(R.normaliser(null), { sons: true, ambiance: "alveole", volume: "moyen", vibrations: true, animations: "completes", terrain: false });
  assert.deepEqual(R.normaliser("{abîmé"), R.normaliser({}));
  const p = R.normaliser(JSON.stringify({ sons: false, ambiance: "cristal", volume: "fort", animations: "rien", terrain: "oui" }));
  assert.equal(p.sons, false); assert.equal(p.ambiance, "cristal"); assert.equal(p.volume, "fort");
  assert.equal(p.animations, "completes"); assert.equal(p.terrain, false);
});

test("effectif : le mode terrain coupe le son pendant la tournée seulement ; « réduire les animations » l'emporte", () => {
  const p = { terrain: true };
  assert.equal(R.effectif(p, { route: "tournee" }).son, false);
  assert.equal(R.effectif(p, { route: "tournee" }).vibre, true);
  assert.equal(R.effectif(p, { route: "dash" }).son, true);
  assert.equal(R.effectif({}, { reduit: true }).anim, "aucune");
  assert.equal(R.effectif({ animations: "discretes" }).anim, "discretes");
  assert.equal(R.effectif({ volume: "discret" }).volume, 0.45);
});

test("sons : chaque ambiance a les mêmes sons ; volume plafonné ; gamme montante", () => {
  const noms = Object.keys(R.SONS.alveole).sort();
  for (const a of Object.keys(R.AMBIANCES)) assert.deepEqual(Object.keys(R.SONS[a]).sort(), noms, a);
  for (const n of Object.values(R.NIVEAUX)) assert.ok(R.notes("alveole", n).length > 0, n);
  assert.ok(R.notes("alveole", "fete", 100).every((x) => x.vol <= 0.3));
  assert.deepEqual(R.notes("inconnue", "ok").map((x) => x.f), [659, 988]);
  assert.deepEqual(R.notes("alveole", "rien"), []);
  assert.ok(R.gamme(1).f > R.gamme(0).f);
  assert.equal(R.gamme(99).f, R.gamme(11).f);
  // Les sons restent courts : moins de 1,6 s du premier au dernier.
  for (const a of Object.keys(R.SONS)) for (const n of Object.keys(R.SONS[a])) assert.ok(Math.max(...R.notes(a, n).map((x) => x.s + x.d)) <= 1.6, `${a}/${n}`);
});

test("message de réussite : enregistrée, gardée sur le téléphone, envoyée ; jamais une erreur", () => {
  for (const m of ["Visite enregistrée en 2 min", "Visite gardée sur le téléphone", "3 saisies envoyées", "Vente encaissée", "Récolte enregistrée · 38,4 kg"]) assert.ok(R.estReussite(m), m);
  for (const m of ["Visite enregistrée, mais les photos n’ont pas pu y être rattachées", "Saisie refusée : à corriger", "Impossible d’enregistrer", "Bonjour Pierre"]) assert.ok(!R.estReussite(m), m);
  assert.ok(!R.estReussite("Visite enregistrée", true));
});

test("semaines : lundi à dimanche, saison montrée (janvier et février : la précédente)", () => {
  assert.equal(R.semaine("2026-11-16"), R.semaine("2026-11-22"));
  assert.equal(R.semaine("2026-11-23"), R.semaine("2026-11-16") + 1);
  assert.equal(R.saisonAnnee("2027-02-10"), 2026);
  assert.equal(R.saisonAnnee("2026-03-01"), 2026);
  assert.equal(R.dateCourte("2026-03-08"), "8 mars");
});

const v = (id, ruche_id, date_visite, x = {}) => ({ id, ruche_id, date_visite, ...x });

test("rayon : une alvéole par semaine de mars à novembre, niveaux, semaine en cours, série", () => {
  const d = { visites: [
    v(1, "a", "2026-11-17"), v(2, "b", "2026-11-18"), v(3, "a", "2026-11-10"), v(4, "a", "2026-11-03"), v(5, "b", "2026-11-04"), v(6, "c", "2026-11-05"),
    v(7, "a", "2026-10-20"), v(8, "a", "2025-11-18"),
  ] };
  const r = R.rayon(d, "2026-11-20");
  assert.equal(r.annee, 2026);
  assert.equal(r.total, 7);
  assert.equal(r.cellules[0].lundi, "2026-03-02"); // première semaine qui commence en mars
  assert.equal(r.cellules.length, 40);
  assert.equal(R.rayon(d, "2027-06-01").cellules[0].lundi, "2027-03-01");
  assert.equal(r.cellules.at(-1).lundi, "2026-11-30");
  const ici = r.cellules.find((c) => c.courante);
  assert.equal(ici.lundi, "2026-11-16"); assert.equal(ici.n, 2); assert.equal(ici.niveau, 1); assert.equal(ici.semaine, 47);
  assert.equal(r.cellules.find((c) => c.lundi === "2026-11-02").niveau, 2);
  assert.ok(r.cellules.at(-1).future);
  assert.equal(r.serie, 3); // 16, 9 et 2 nov. ; rien la semaine du 26 oct.
  // Rien encore cette semaine : la série court jusqu'à la semaine d'avant.
  assert.equal(R.rayon(d, "2026-11-23").serie, 3);
  assert.deepEqual([0, 1, 2, 3, 5, 6, 12].map(R.niveauSemaine), [0, 1, 1, 2, 2, 3, 3]);
});

test("jalons : douze, gagnés avec leur date, progression, objectif réglé", () => {
  const ruches = [{ id: "a", rucher: "Verger" }, { id: "b", rucher: "Verger" }, { id: "c", rucher: "Bois" }];
  const visites = [v(1, "a", "2026-03-08", { varroa: 2 }), v(2, "b", "2026-04-02"), v(3, "c", "2026-04-11", { poids_kg: 40 }),
    v(4, "a", "2026-05-03"), v(5, "b", "2026-05-03"), v(6, "a", "2026-11-02"), v(7, "c", "2026-11-10")];
  const d = { ruches, visites, recoltes: [{ date_recolte: "2026-06-14", kg: 120 }, { date_recolte: "2026-08-01", kg: 92 }],
    ventes: [{ date_vente: "2026-06-22" }, { date_vente: "2026-07-01" }] };
  const L = R.jalons(d, { aujourdhui: "2026-11-20", objectif: 300 });
  assert.equal(L.length, 12);
  const j = Object.fromEntries(L.map((x) => [x.id.startsWith("ruchers-") ? "mois" : x.id, x]));
  assert.equal(j["premiere-visite"].date, "2026-03-08");
  assert.ok(j.printemps.got); assert.equal(j.printemps.date, "2026-04-11");
  assert.ok(j.tournee.got); assert.equal(j.tournee.date, "2026-05-03");
  assert.ok(j["premiere-recolte"].got); assert.ok(j["premiere-vente"].got);
  assert.ok(j.mois.got); assert.equal(j.mois.nom, "Tous les ruchers en novembre"); assert.equal(j.mois.date, "2026-11-10");
  assert.ok(!j.objectif.got); assert.equal(j.objectif.nom, "300 kg de miel"); assert.equal(R.progression(j.objectif), "212/300");
  assert.equal(R.progression(j["cent-visites"]), "7/100");
  assert.equal(R.progression(j.varroa), "1/10");
  assert.equal(R.jalons(d, { aujourdhui: "2026-11-20" }).find((x) => x.id === "objectif").date, "2026-06-14"); // 100 kg à défaut
  // Printemps manqué et passé : la suite le dit.
  const sans = R.jalons({ ruches, visites: [v(1, "a", "2026-03-08")] }, { aujourdhui: "2026-06-01" }).find((x) => x.id === "printemps");
  assert.ok(!sans.got); assert.equal(R.progression(sans), "Se rejoue au printemps prochain");
});

test("jalons : série de 8 semaines et compteurs", () => {
  const visites = Array.from({ length: 9 }, (_, i) => v(i, "a", new Date(Date.UTC(2026, 4, 4 + i * 7)).toISOString().slice(0, 10)));
  const s = R.jalons({ ruches: [{ id: "a" }], visites }, { aujourdhui: "2026-11-20" }).find((x) => x.id === "serie");
  assert.ok(s.got); assert.equal(s.date, "2026-06-22");
});

test("nouveaux jalons : rien la première fois, puis ceux qui n'étaient pas gardés", () => {
  const L = [{ id: "a", got: true }, { id: "b", got: true }, { id: "c", got: false }];
  assert.deepEqual(R.nouveaux(L, null), []);
  assert.deepEqual(R.nouveaux(L, ["a"]).map((x) => x.id), ["b"]);
});
