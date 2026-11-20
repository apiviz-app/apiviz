// Feuilles du bas glissables (src/noyau/glisser.js, v5.70) : règles pures. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../../src/noyau/glisser.js";

test("relâchée loin : elle se ferme ; tôt et lentement : elle revient", () => {
  assert.equal(G.decider(G.SEUIL + 1, 0), "fermer");
  assert.equal(G.decider(G.SEUIL, 0), "revenir");
  assert.equal(G.decider(40, 0.1), "revenir");
});

test("un coup sec vers le bas ferme même sous le seuil, pas un simple effleurement", () => {
  assert.equal(G.decider(60, 1.2), "fermer");
  assert.equal(G.decider(10, 1.2), "revenir");
  assert.equal(G.decider(60, -1.2), "revenir");
});

test("vers le haut, la feuille résiste (26 px au plus)", () => {
  assert.equal(G.deplacement(80), 80);
  assert.ok(G.deplacement(-4) < 0 && G.deplacement(-4) > -26);
  assert.equal(G.deplacement(-400), -26);
});

test("le fond s'éclaircit à mesure que la feuille descend", () => {
  assert.equal(G.opaciteFond(0, 500), 1);
  assert.equal(G.opaciteFond(-10, 500), 1);
  assert.equal(G.opaciteFond(250, 500), 0.5);
  assert.equal(G.opaciteFond(900, 500), 0);
});

test("seules les feuilles collées en bas sur toute la largeur se glissent", () => {
  assert.equal(G.estFeuilleDuBas({ width: 390, top: 300, bottom: 844 }, 390, 844), true);
  assert.equal(G.estFeuilleDuBas({ width: 340, top: 0, bottom: 844 }, 390, 844), false, "volet latéral");
  assert.equal(G.estFeuilleDuBas({ width: 460, top: 200, bottom: 600 }, 1280, 800), false, "fenêtre centrée");
});

test("vitesse d'après les derniers points du doigt", () => {
  assert.equal(G.vitesse([]), 0);
  assert.equal(G.vitesse([{ y: 100, t: 0 }, { y: 160, t: 100 }]), 0.6);
});
