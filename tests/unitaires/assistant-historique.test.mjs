// Historique des échanges avec API (v5.62) : conversations, rubriques, conseils à faire, recherche, titres.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as H from "../../src/domaines/assistant/historique.js";

const MAINT = new Date("2026-11-18T15:00:00");
const rep = (resume, ...conseils) => ({ resume, recommandations: conseils.map((texte) => (typeof texte === "string" ? { texte } : texte)) });
const L = [
  { id: "x1", conversation_id: "c1", ruche_id: "r5", question: "Pourquoi Ruche 5 perd du poids ?", reponse: rep("Elle mange ses réserves.", "Pèse-la avant samedi. Donne du candy sous 30 kg.", "Recompte le varroa."), conseils_suivis: [1], created_at: "2026-11-18T09:40:00" },
  { id: "x2", conversation_id: "c1", ruche_id: null, question: "Et Ruche 2 ?", reponse: rep("Ruche 2 va bien."), conseils_suivis: [], created_at: "2026-11-18T09:43:00" },
  { id: "x3", conversation_id: "c2", ruche_id: null, question: "Combien de pots pour Noël ?", reponse: rep("Il te reste 29 pots.", { texte: "Garde 10 pots pour le marché.", sanitaire: false }), conseils_suivis: [], created_at: "2026-11-16T10:00:00" },
  { id: "x4", conversation_id: "c3", ruche_id: null, question: "Bilan de la récolte d'été", reponse: rep("42 kg.", "Note la miellée."), conseils_suivis: [], created_at: "2026-10-12T10:00:00" },
];

test("conversations : la plus récente d'abord, titre = première question, ruche, conseils à faire", () => {
  const c = H.conversations(L);
  assert.deepEqual(c.map((x) => x.id), ["c1", "c2", "c3"]);
  assert.equal(c[0].titre, "Pourquoi Ruche 5 perd du poids ?");
  assert.equal(c[0].n, 2);
  assert.equal(c[0].ruche_id, "r5");
  assert.equal(c[0].aFaire, 1, "le conseil 1 est déjà suivi");
  assert.equal(c[0].quand, "2026-11-18T09:43:00");
});

test("échanges d'une conversation, dans l'ordre", () => {
  assert.deepEqual(H.echangesDe([...L].reverse(), "c1").map((x) => x.id), ["x1", "x2"]);
});

test("rubriques : aujourd'hui, hier, cette semaine, puis le mois (et l'année quand ce n'est pas celle-ci)", () => {
  assert.equal(H.periode("2026-11-18T08:00:00", MAINT), "Aujourd’hui");
  assert.equal(H.periode("2026-11-17T22:00:00", MAINT), "Hier");
  assert.equal(H.periode("2026-11-13T10:00:00", MAINT), "Cette semaine");
  assert.equal(H.periode("2026-10-12T10:00:00", MAINT), "Octobre");
  assert.equal(H.periode("2025-12-01T10:00:00", MAINT), "Décembre 2025");
  assert.deepEqual(H.grouper(H.conversations(L), MAINT).map(([p, l]) => [p, l.length]), [["Aujourd’hui", 1], ["Cette semaine", 1], ["Octobre", 1]]);
});

test("conseils à faire : 30 derniers jours, plus récents d'abord, sans ceux déjà suivis", () => {
  const c = H.conseilsAFaire(L, MAINT, 5);
  assert.deepEqual(c.map((x) => [x.echange, x.i]), [["x1", 0], ["x3", 0]]);
  assert.equal(c[0].ruche_id, "r5");
  assert.equal(H.conseilsAFaire(L, MAINT, 1).length, 1);
});

test("recherche : sans accents, dans les questions, résumés et conseils", () => {
  const c = H.conversations(L);
  assert.deepEqual(H.chercher(c, L, "recolte").map((x) => x.id), ["c3"]);
  assert.deepEqual(H.chercher(c, L, "candy").map((x) => x.id), ["c1"]);
  assert.deepEqual(H.chercher(c, L, "ruche 2").map((x) => x.id), ["c1"]);
  assert.deepEqual(H.chercher(c, L, "").length, 3);
  assert.deepEqual(H.chercher(c, L, "abeille noire"), []);
});

test("titre d'une tâche tirée d'un conseil : première phrase, 80 caractères au plus", () => {
  assert.equal(H.titreConseil("Pèse-la avant samedi. Donne du candy sous 30 kg."), "Pèse-la avant samedi");
  assert.equal(H.titreConseil("Recompte le varroa"), "Recompte le varroa");
  const long = H.titreConseil("Prévois une visite complète de toutes les colonies du rucher de Christian avant les premières gelées de décembre");
  assert.ok(long.length <= 80 && long.endsWith("…"));
});

test("question depuis une ruche : la ruche est rappelée si elle n'est pas nommée", () => {
  assert.equal(H.avecRuche("Quand la visiter ?", "Ruche 1"), "À propos de Ruche 1 : Quand la visiter ?");
  assert.equal(H.avecRuche("Comment va ruche 1 ?", "Ruche 1"), "Comment va ruche 1 ?");
  assert.equal(H.avecRuche("Combien de pots ?", ""), "Combien de pots ?");
  assert.deepEqual(H.questionsRuche("Ruche 1"), ["Comment va Ruche 1 ?", "Que regarder à la prochaine visite de Ruche 1 ?"]);
});
