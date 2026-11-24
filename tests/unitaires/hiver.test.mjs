// Prêt pour l'hiver (v5.82). src/domaines/colonies/hiver-regles.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as H from "../../src/domaines/colonies/hiver-regles.js";

const J = "2026-11-24";
const rep = H.reperes({ hiver: { poids: 18, varroa: 1 } });

test("repères : bornés, vides par défaut (rien n'est jugé sans repère)", () => {
  assert.deepEqual(H.reperes({}), { poids: null, varroa: null, depuis: "08-01" });
  assert.deepEqual(rep, { poids: 18, varroa: 1, depuis: "08-01" });
  assert.equal(H.reperes({ hiver: { poids: "abc", varroa: 0 } }).poids, null);
  assert.equal(H.reperes({ hiver: { poids: "17,5" } }).poids, 17.5);
  assert.equal(H.reperes({ hiverPoids: 20, hiver: { poids: 12 } }).poids, 20, "hiverPoids (Ma saison, API) d'abord");
});

const v = (date, extra) => ({ date_visite: date, reine: "Vue", ...extra });
const cpt = (date, varroa, abeilles = 300) => ({ date_visite: date, varroa, varroa_abeilles: abeilles, varroa_methode: "Sucre glace" });

test("poids : sous le repère de plus de 10 % → à reprendre ; juste sous → à surveiller", () => {
  assert.equal(H.colonie({ id: "a", nom: "C3" }, [v("2026-10-10", { poids_kg: 14 })], [], rep, J).niveau, "reprendre");
  const l = H.colonie({ id: "b", nom: "L2" }, [v("2026-10-10", { poids_kg: 17 })], [], rep, J);
  assert.equal(l.niveau, "surveiller");
  assert.deepEqual(l.raisons, ["Juste sous ton repère de poids"]);
  assert.equal(H.colonie({ id: "c", nom: "V1" }, [v("2026-10-10", { poids_kg: 24 })], [cpt("2026-10-10", 1)], rep, J).niveau, "prete");
});

test("varroa au-dessus du repère, reine, force", () => {
  const c = H.colonie({ id: "a", nom: "C3" }, [v("2026-10-10", { poids_kg: 20 })], [cpt("2026-10-12", 9)], rep, J);
  assert.equal(c.niveau, "reprendre");
  assert.match(c.raisons[0], /Varroa au-dessus de ton repère \(3 %\)/);
  const r = H.colonie({ id: "b", nom: "C5" }, [v("2026-10-20", { reine: "Non vue" }), v("2026-10-01", { reine: "Non vue" })], [], rep, J);
  assert.equal(r.niveau, "reprendre");
  assert.deepEqual(r.raisons, ["Reine non vue aux 2 dernières visites"]);
  assert.equal(H.colonie({ id: "o", nom: "O", statut: "orpheline" }, [v("2026-10-01")], [], rep, J).niveau, "reprendre");
  assert.equal(H.colonie({ id: "f", nom: "F" }, [v("2026-10-01", { force: 2 })], [], rep, J).niveau, "surveiller");
  assert.equal(H.colonie({ id: "g", nom: "G", annee_reine: 2023 }, [v("2026-10-01")], [], rep, J).niveau, "surveiller");
});

test("rien mesuré cet automne : à compléter ; mesures manquantes signalées", () => {
  const c = H.colonie({ id: "a", nom: "X" }, [v("2026-06-01", { poids_kg: 30 })], [], rep, J);
  assert.equal(c.niveau, "completer");
  assert.match(c.raisons[0], /^Pas de visite depuis le 1er août/);
  const m = H.colonie({ id: "b", nom: "Y" }, [v("2026-10-01")], [], rep, J);
  assert.equal(m.niveau, "prete");
  assert.deepEqual(m.manque, ["pesée", "comptage de varroa", "traitement noté depuis juillet"]);
  assert.equal(H.colonie({ id: "r", nom: "R" }, [v("2026-10-01", { provisions: "Faibles" })], [], rep, J).niveau, "surveiller", "réserves faibles à la visite");
});

test("sans repère : ni poids ni varroa jugés", () => {
  const sans = H.reperes({});
  assert.equal(H.colonie({ id: "a", nom: "C3" }, [v("2026-10-10", { poids_kg: 5 })], [cpt("2026-10-12", 30)], sans, J).niveau, "prete");
});

test("toutes les colonies actives, triées, comptées", () => {
  const d = {
    ruches: [{ id: "a", nom: "Ruche 2" }, { id: "b", nom: "Ruche 10" }, { id: "c", nom: "Ruche 1" }, { id: "m", nom: "Morte", sortie: "Morte" }],
    visites: [{ ruche_id: "a", date_visite: "2026-10-10", reine: "Vue", poids_kg: 12 }, { ruche_id: "b", date_visite: "2026-10-10", reine: "Vue", poids_kg: 25 }],
    operations: [], comptesVarroa: [],
  };
  const h = H.hiver(d, rep, J);
  assert.deepEqual(h.lignes.map((l) => [l.nom, l.niveau]), [["Ruche 2", "reprendre"], ["Ruche 1", "completer"], ["Ruche 10", "prete"]]);
  assert.deepEqual(h.compte, { reprendre: 1, surveiller: 0, completer: 1, prete: 1 });
});
