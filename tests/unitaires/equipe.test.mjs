// Fil de l'équipe, courbes d'une colonie, Ma saison (v5.59) : src/domaines/equipe/regles.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Q from "../../src/domaines/equipe/regles.js";

const membres = [{ email: "pl@x.fr", nom: "Pierre-Louis Gallot-Lavallée" }, { email: "johan.cochard@outlook.com", nom: "Johan" }, { email: "jc29@x.fr", nom: "jc29" }];

test("mention : prénom, nom collé, début de l'e-mail, accents", () => {
  assert.equal(Q.mention("@Johan tu peux peser Ruche 5 ?", membres).email, "johan.cochard@outlook.com");
  assert.equal(Q.mention("merci @pierre-louis", membres).email, "pl@x.fr");
  assert.equal(Q.mention("@jc29 regarde", membres).email, "jc29@x.fr");
  assert.equal(Q.mention("@JOHAN", membres).email, "johan.cochard@outlook.com");
  assert.equal(Q.mention("@inconnu salut", membres), null);
  assert.equal(Q.mention("pas de mention", membres), null);
});

test("titre de tâche et échéance tirés d'une demande", () => {
  assert.equal(Q.titreTache("@Pierre-Louis tu peux passer peser Ruche 5 avant samedi ?"), "Passer peser Ruche 5 avant samedi");
  assert.equal(Q.titreTache("@Johan, nourrir la 3 stp"), "Nourrir la 3");
  // Mardi 17 novembre 2026
  assert.equal(Q.echeance("avant samedi", "2026-11-17"), "2026-11-21");
  assert.equal(Q.echeance("demain matin", "2026-11-17"), "2026-11-18");
  assert.equal(Q.echeance("mardi prochain", "2026-11-17"), "2026-11-24");
  assert.equal(Q.echeance("quand tu peux", "2026-11-17"), "");
});

test("fil : demandes pour moi d'abord, réponses rattachées, filtres", () => {
  const ms = [
    { id: "m1", auteur: "johan.cochard@outlook.com", texte: "@Pierre-Louis peser la 5", pour: "pl@x.fr", created_at: "2026-11-17T10:00:00Z" },
    { id: "m2", auteur: "pl@x.fr", texte: "Reine vue", ruche_id: "r2", pour: "", created_at: "2026-11-17T12:00:00Z" },
    { id: "m3", auteur: "pl@x.fr", texte: "Je passe samedi", parent_id: "m1", pour: "", created_at: "2026-11-17T11:00:00Z" },
    { id: "m4", auteur: "pl@x.fr", texte: "@Johan nourrir", pour: "johan.cochard@outlook.com", created_at: "2026-11-17T13:00:00Z" },
  ];
  const act = [{ quand: "2026-11-17T14:00:00Z", qui: "johan.cochard@outlook.com", titre: "Visite · Ruche 1" }];
  const f = Q.fil(ms, act, "PL@x.fr");
  assert.deepEqual(f.map((x) => x.type === "message" ? x.m.id : "act"), ["m1", "act", "m4", "m2"]);
  assert.equal(f[0].pourMoi, true);
  assert.deepEqual(f[0].reponses.map((r) => r.id), ["m3"]);
  assert.deepEqual(Q.fil(ms, act, "pl@x.fr", "moi").map((x) => x.m.id), ["m1"]);
  assert.deepEqual(Q.fil(ms, act, "pl@x.fr", "notes").map((x) => x.m.id), ["m1", "m4", "m2"]);
  assert.equal(Q.demandesPourMoi(ms, "pl@x.fr"), 1);
  assert.equal(Q.demandesPourMoi([{ ...ms[0], tache_id: "t" }], "pl@x.fr"), 0);
});

test("il y a", () => {
  const m = new Date("2026-11-17T16:00:00");
  assert.equal(Q.ilYa(new Date("2026-11-17T15:58:00").toISOString(), m), "il y a 2 min");
  assert.equal(Q.ilYa(new Date("2026-11-17T14:00:00").toISOString(), m), "il y a 2 h");
  assert.equal(Q.ilYa(new Date("2026-11-16T16:00:00").toISOString(), m), "hier, 16 h");
});

const taux = (v) => (v.varroa === null || v.varroa === undefined ? null : v.varroa / 3);
const visites = [
  { ruche_id: "r", date_visite: "2026-04-10", poids_kg: 28, varroa: 3, force: 3 },
  { ruche_id: "r", date_visite: "2026-08-10", poids_kg: 46, varroa: 12, activite: "Forte" },
  { ruche_id: "r", date_visite: "2026-10-20", poids_kg: 31, varroa: 3, force: 3 },
  { ruche_id: "r", date_visite: "2026-11-10", poids_kg: 29, varroa: null, force: 3 },
  { ruche_id: "r", date_visite: "2025-11-08", poids_kg: 30, force: 3 },
  { ruche_id: "x", date_visite: "2026-11-10", poids_kg: 50 },
];

test("courbes : séries de l'année et de la précédente, valeurs, échelle", () => {
  const s = Q.series(visites, "r", "poids", 2026, taux);
  assert.deepEqual(s[0].points.map((p) => p.v), [28, 46, 31, 29]);
  assert.deepEqual(s[1].points.map((p) => p.v), [30]);
  assert.equal(Q.series(visites, "r", "force", 2026, taux)[0].points[1].v, 4, "force tirée de l'activité si non notée");
  assert.deepEqual(Q.series(visites, "r", "varroa", 2026, taux)[0].points.map((p) => p.v), [1, 4, 1]);
  assert.deepEqual(Q.echelle([28, 46], "poids"), { bas: 25, haut: 50 });
  assert.deepEqual(Q.echelle([1, 4], "varroa", 3), { bas: 1, haut: 5 });
  assert.deepEqual(Q.echelle([3], "force"), { bas: 0, haut: 5 });
  const w = Q.fenetre([s[0].points]);
  assert.ok(w.de <= 59 && w.a >= 334);
});

test("courbes : phrase et événements", () => {
  const s = Q.series(visites, "r", "poids", 2026, taux);
  const p = Q.phraseCourbe(s, "poids");
  assert.equal(p.ton, "watch");
  assert.match(p.texte, /^−2 kg depuis la pesée précédente\. −1 kg par rapport à l’an dernier/);
  const v = Q.phraseCourbe(Q.series(visites, "r", "varroa", 2026, taux), "varroa", 3);
  assert.equal(v.ton, "good");
  assert.match(v.texte, /Retombé sous le seuil/);
  const d = { recoltes: [{ ruche_id: "r", date_recolte: "2026-07-18", kg: 14 }], visites: [{ ruche_id: "r", date_visite: "2026-08-20", traitement: "Lanières" }] };
  assert.deepEqual(Q.evenements(d, "r", 2026).map((x) => [x.type, x.texte]), [["recolte", "14 kg"], ["traitement", "Lanières"]]);
  assert.equal(Q.phraseCourbe(Q.series([], "r", "poids", 2026), "poids").texte, "Pas encore de mesure cette année.");
});

test("Ma saison : totaux, évolution, kilos par ruche, constats, résumé", () => {
  const d = {
    ruches: [
      { id: "a", nom: "Ruche 1", rucher: "Chez Christian", annee_reine: 2025 }, { id: "b", nom: "Ruche 2", rucher: "Chez Christian" },
      { id: "c", nom: "Ruche 3", rucher: "Verger" }, { id: "z", nom: "Ruche 9", rucher: "Verger", annee_reine: 2023 },
    ],
    recoltes: [
      { ruche_id: "a", date_recolte: "2026-07-01", kg: 20 }, { ruche_id: "b", date_recolte: "2026-07-01", kg: 18 },
      { ruche_id: "c", date_recolte: "2026-07-01", kg: 14 }, { ruche_id: null, date_recolte: "2026-07-01", kg: 5 },
      { ruche_id: "a", date_recolte: "2025-07-01", kg: 40 },
    ],
    ventes: [{ id: "v1", client_id: "k1", date_vente: "2026-10-01" }, { id: "v2", client_id: "k2", date_vente: "2026-11-01" }, { id: "v3", client_id: "k1", date_vente: "2025-10-01" }],
    lignes: [{ vente_id: "v1", quantite: 4 }, { vente_id: "v2", quantite: 8 }, { vente_id: "v3", quantite: 9 }],
    depenses: [{ date_depense: "2026-03-01", montant: 100.5 }, { date_depense: "2025-03-01", montant: 50 }],
    lots: [{ pots_restants: 20 }, { pots_restants: -2 }],
  };
  const s = Q.saison(d, 2026, (v) => (v.id === "v1" ? 40 : 80));
  assert.deepEqual(s, { kg: 57, kgAvant: 40, pots: 12, clients: 2, rentre: 120, depense: 100.5, stock: 20, nbVentes: 2 });
  assert.equal(Q.evolution(57, 40, 2026), "43 % de plus qu’en 2025");
  assert.equal(Q.evolution(40, 40, 2026), "autant qu’en 2025");
  assert.equal(Q.evolution(40, 0, 2026), "");
  const pr = Q.kgParRuche(d, 2026);
  assert.deepEqual(pr.map((r) => [r.nom, r.kg]), [["Ruche 1", 20], ["Ruche 2", 18], ["Ruche 3", 14], ["Ruche 9", 0]]);
  const cs = Q.constats(pr, 2026);
  assert.equal(cs.length, 3);
  assert.match(cs[0], /« Chez Christian » ont donné 171 % de plus/);
  assert.equal(cs[1], "Ruche 9 n’a rien donné : sa reine a 3 ans, pense à la changer au printemps.");
  assert.equal(cs[2], "Ruche 1 est la meilleure ruche de l’année, avec 20 kg.");
  assert.equal(Q.semainesDeStock(d, 20, "2026-11-17"), 13);
  assert.equal(Q.semainesDeStock({ ventes: [], lignes: [] }, 20, "2026-11-17"), null);
  const t = Q.resumeTexte("Bee's Brothers", 2026, s, pr, cs);
  assert.match(t, /^Bee's Brothers · Saison 2026\n57 kg récoltés \(43 % de plus qu’en 2025\)\n12 pots vendus à 2 clients/);
  assert.match(t, /Meilleures ruches : Ruche 1 20 kg, Ruche 2 18 kg, Ruche 3 14 kg/);
});
