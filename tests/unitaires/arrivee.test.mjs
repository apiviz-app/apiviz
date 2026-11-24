// Parcours d'arrivée (v5.84) : bienvenue, offres présentées, rubriques proposées, première visite, premiers pas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as R from "../../src/domaines/compte/regles-arrivee.js";

test("bienvenue : seulement sans session, sans invitation ni message, jamais vue sur l'appareil", () => {
  assert.equal(R.doitAccueillir({}), true);
  for (const k of ["session", "recuperation", "invitation", "message", "dejaVue", "modeChoisi"]) assert.equal(R.doitAccueillir({ [k]: true }), false, k);
});

test("les offres présentées suivent la migration 029 (prix, ruches, personnes, gouttes)", () => {
  const sql = readFileSync(new URL("../../migrations/029-offres-gouttes.sql", import.meta.url), "utf8");
  for (const o of R.OFFRES) {
    const m = sql.match(new RegExp(`\\('${o.id}', '([^']+)', \\d+, (\\d+), (\\d+), (\\d+), (null|\\d+), (null|\\d+)`));
    assert.ok(m, `offre ${o.id} introuvable dans 029`);
    const [, nom, mois, an, gouttes, ruches, membres] = m;
    assert.equal(o.nom, nom);
    assert.equal(o.prix_mois_cts, Number(mois));
    assert.equal(o.prix_an_cts, Number(an));
    assert.equal(o.gouttes_mois, Number(gouttes));
    assert.equal(o.ruches_max, ruches === "null" ? null : Number(ruches));
    assert.equal(o.membres_max, membres === "null" ? null : Number(membres));
  }
});

test("prix et limites affichés", () => {
  assert.deepEqual(R.OFFRES.map(R.prixOffre), ["Gratuit", "3,90 € / mois", "11,90 € / mois"]);
  assert.equal(R.limitesOffre(R.OFFRES[0]), "Jusqu’à 10 ruches et 2 personnes");
  assert.equal(R.limitesOffre(R.OFFRES[2]), "Ruches et personnes sans limite");
});

test("rubriques proposées : débutant sans Matériel ni Finances, sans vente sans Ventes", () => {
  assert.deepEqual(R.rubriquesProposees({}), { ventes: true, materiel: true, finances: true });
  assert.deepEqual(R.rubriquesProposees({ colonies: "1-10", vend: false }), { ventes: false, materiel: false, finances: false });
  assert.deepEqual(R.rubriquesProposees({ colonies: "11-50", vend: true }), { ventes: true, materiel: true, finances: true });
  assert.deepEqual(R.rubriquesProposees({ colonies: "1-10", vend: null }), { ventes: true, materiel: false, finances: false });
});

test("rubriques actives : absent = affiché ; routes masquées", () => {
  assert.deepEqual(R.rubriquesActives({}), { ventes: true, materiel: true, finances: true });
  const a = R.rubriquesActives({ rubriques: { materiel: false } });
  assert.deepEqual(a, { ventes: true, materiel: false, finances: true });
  assert.equal(R.routeMasquee("materiel", a), true);
  assert.equal(R.routeMasquee("courses", a), true);
  assert.equal(R.routeMasquee("pilotage", a), false);
  assert.equal(R.routeMasquee("ruches", a), false);
  assert.equal(R.routeMasquee("newvente", R.rubriquesActives({ rubriques: { ventes: false } })), true);
  assert.deepEqual(R.apercuRubriques(R.rubriquesProposees({ colonies: "1-10", vend: false })), ["Ruchers", "Visites", "Agenda", "Récoltes et stock"]);
});

test("nom proposé de l'exploitation et nombre de ruches borné", () => {
  assert.equal(R.nomExploitation("Camille"), "Les ruches de Camille");
  assert.equal(R.nomExploitation(" "), "Mon exploitation");
  assert.equal(R.bornerRuches(0), 1);
  assert.equal(R.bornerRuches(250), 200);
  assert.equal(R.bornerRuches("6"), 6);
});

test("première visite : la charge suit les réponses, les questions passées ne sont pas observées", () => {
  const p = R.chargeVisite({ id: "v1", ruche_id: "r1", date_visite: "2026-11-24", debut: 1000, maintenant: 101000,
    reponses: [{ k: "reine", i: 1 }, { k: "couvain", i: 2 }, { k: "provisions", i: null }, { k: "activite", i: 2 }] });
  assert.equal(p.reine, "Non vue");
  assert.equal(p.oeufs_vus, true);
  assert.equal(p.couvain, "Abondant");
  assert.equal(p.force, 5);
  assert.equal(p.provisions, "Moyennes");
  assert.equal(p.activite, "Faible");
  assert.equal(p.etat, "À surveiller");
  assert.equal(p.duree_s, 100);
  assert.deepEqual(p.observes, ["reine", "oeufs_vus", "couvain", "force", "activite"]);
  const vide = R.chargeVisite({ id: "v2", ruche_id: "r1", date_visite: "2026-11-24", reponses: [] });
  assert.deepEqual(vide.observes, []);
  assert.equal(vide.reine, "Non cherchée");
  assert.equal(vide.duree_s, null);
});

test("chaque choix de la visite guidée garde des valeurs connues de la visite", () => {
  const permis = { reine: ["Vue", "Non vue", "Non cherchée"], couvain: ["", "Réduit", "Normal", "Abondant"], provisions: ["Faibles", "Moyennes", "Bonnes"],
    activite: ["Faible", "Normale", "Forte"], etat: ["Bonne", "À surveiller", "Critique"] };
  for (const q of R.QUESTIONS_VISITE) for (const c of q.choix) for (const [k, v] of Object.entries(c.v)) {
    if (permis[k]) assert.ok(permis[k].includes(v), `${q.k} › ${c.t} : ${k}=${v}`);
  }
});

test("mes premiers pas : cinq étapes, faites selon les données", () => {
  const e = R.premiersPas({ ruches: 6, visites: 1, seuils: 0, invite: false, recoltes: 0, lots: 0, premiereVisite: { ruche: "Ruche 1", date: "24/11" } });
  assert.deepEqual(e.map((x) => x.id), ["rucher", "visite", "varroa", "associe", "recolte"]);
  assert.deepEqual(e.map((x) => x.faite), [true, true, false, false, false]);
  assert.equal(e[1].detail, "Ruche 1, le 24/11");
  assert.equal(e[0].detail, "6 ruches");
});

test("mes premiers pas : visible 14 jours, pas masquée, pas finie", () => {
  const e = R.premiersPas({ ruches: 1 });
  const j = (n) => new Date(Date.UTC(2026, 10, 24) + n * 864e5);
  assert.equal(R.montrerPremiersPas({ etapes: e, debut: "2026-11-24", maintenant: j(3).getTime() }), true);
  assert.equal(R.montrerPremiersPas({ etapes: e, debut: "2026-11-24", maintenant: j(15).getTime() }), false);
  assert.equal(R.montrerPremiersPas({ etapes: e, masquee: true }), false);
  assert.equal(R.montrerPremiersPas({ etapes: e.map((x) => ({ ...x, faite: true })) }), false);
  assert.equal(R.montrerPremiersPas({ etapes: e, debut: null }), true);
});
