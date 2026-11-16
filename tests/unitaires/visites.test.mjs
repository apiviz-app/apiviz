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

// ---------- Visite express (v5.32, AP-FEAT-037) ----------
import { departExpress, etatChamp, resumeExpress, chargeExpress, champsRepris, rucheSuivante } from "../../src/domaines/visites/regles.js";

const derniere = { activite: "Forte", provisions: "Bonnes", couvain: "", reine: "Vue", poids_kg: "16", date_visite: "2026-10-28" };

test("visite express : les valeurs de la dernière visite servent de départ, sauf la reine", () => {
  const v = departExpress(derniere, { etat: "À surveiller" });
  // v5.49 : force reprise (vide si jamais notée) ; œufs et cellules royales jamais repris.
  assert.deepEqual(v, { activite: "Forte", provisions: "Bonnes", couvain: "Non vu", force: "", oeufs_vus: "", cellules_royales: "", reine: "Non cherchée", poids_kg: 16, etat: "À surveiller" });
  assert.deepEqual(departExpress(null, null), { activite: "Normale", provisions: "Moyennes", couvain: "Non vu", force: "", oeufs_vus: "", cellules_royales: "", reine: "Non cherchée", poids_kg: "", etat: "Bonne" });
  const v2 = departExpress({ ...derniere, force: 4, oeufs_vus: true, cellules_royales: "Operculées" });
  assert.deepEqual([v2.force, v2.oeufs_vus, v2.cellules_royales], ["4", "", ""], "force reprise ; œufs et cellules à regarder à chaque visite");
  assert.equal(departExpress({ ...derniere, activite: "Inconnue" }).activite, "Normale", "valeur inconnue : départ par défaut");
});

test("visite express : repris, vu, changé", () => {
  const dep = departExpress(derniere, { etat: "Bonne" }), val = { ...dep, poids_kg: 15.2, provisions: "Bonnes" };
  assert.equal(etatChamp("activite", val, dep, []), "repris");
  assert.equal(etatChamp("reine", val, dep, []), "non vu");
  assert.equal(etatChamp("poids_kg", val, dep, ["poids_kg"]), "change");
  assert.equal(etatChamp("provisions", val, dep, ["provisions"]), "vu");
  // force jamais notée : rien à reprendre, « à regarder » comme la reine, les œufs et les cellules.
  assert.equal(etatChamp("force", val, dep, []), "non vu");
  assert.deepEqual(resumeExpress(val, dep, ["poids_kg", "provisions"]), { changes: 1, vus: 1, repris: 3, aRegarder: 4 });
});

test("visite express : la charge ne marque observés que les champs touchés", () => {
  const dep = departExpress(derniere, { etat: "Bonne" });
  const p = chargeExpress({ id: "V9", ruche_id: "R1", date_visite: "2026-11-12", valeurs: { ...dep, poids_kg: "15.2" }, touches: ["poids_kg"], note: "  ", debut: 1000, maintenant: 13400 });
  assert.deepEqual(p.observes, ["poids_kg"]);
  assert.equal(p.poids_kg, 15.2);
  assert.equal(p.couvain, "", "couvain non vu : vide, comme la visite complète");
  assert.equal(p.reine, "Non cherchée");
  assert.equal(p.duree_s, 12);
  assert.equal(chargeExpress({ valeurs: dep, touches: [], note: "Calme" }).observes.join(), "note");
  assert.equal(chargeExpress({ valeurs: { ...dep, poids_kg: "" }, touches: [] }).poids_kg, "");
});

test("visite express : le journal sait ce qui a été repris", () => {
  // v5.49 : seuls les champs qui ont une valeur sont « repris » (l'état est celui de la ruche, pas de la visite).
  assert.deepEqual(champsRepris({ observes: ["poids_kg"], activite: "Forte", provisions: "Bonnes", couvain: "Normal", force: 3, poids_kg: 15 }), ["activite", "provisions", "couvain", "force"]);
  assert.deepEqual(champsRepris({ observes: ["poids_kg"], activite: "Forte", provisions: "Bonnes", couvain: "" }), ["activite", "provisions"]);
  assert.deepEqual(champsRepris({ observes: null }), [], "visite complète : rien de repris");
  const d = appliquerVisite(donnees(), { id: "V2", ruche_id: "R1", date_visite: "2026-11-12", observes: ["reine"], duree_s: 9, intrants: [] });
  assert.deepEqual(d.visites[0].observes, ["reine"]);
  assert.equal(d.visites[0].duree_s, 9);
  assert.equal(appliquerVisite(donnees(), { id: "V3", ruche_id: "R1", date_visite: "2026-11-12", intrants: [] }).visites[0].observes, null);
});

test("visite express : ruche suivante du même rucher, pas encore vue ce jour", () => {
  const d = {
    ruches: [{ id: "a", nom: "Ruche 10", rucher_id: "V" }, { id: "b", nom: "Ruche 2", rucher_id: "V" }, { id: "c", nom: "Ruche 3", rucher_id: "V" },
      { id: "x", nom: "Ruche 4", rucher_id: "B" }, { id: "s", nom: "Ruche 5", rucher_id: "V", sortie: "Morte" }],
    visites: [{ ruche_id: "c", date_visite: "2026-11-12" }],
  };
  assert.equal(rucheSuivante(d, "b", "2026-11-12").id, "a", "Ruche 3 déjà vue aujourd'hui : Ruche 10 (ordre naturel)");
  assert.equal(rucheSuivante(d, "a", "2026-11-12").id, "b", "on reprend au début du rucher");
  assert.equal(rucheSuivante({ ...d, visites: [...d.visites, { ruche_id: "a", date_visite: "2026-11-12" }] }, "b", "2026-11-12"), null, "toutes vues");
  assert.equal(rucheSuivante(d, "x", "2026-11-12"), null, "seule ruche de son rucher");
});

// ---------- Visite rapide (v5.49, IT-08 réduite, migration 023) ----------
import { jourMoisCourt, dureeTexte, oeufsVersBase, forceVersBase, alertesEssaimage, tacheEssaimage, CHAMPS_EXPRESS } from "../../src/domaines/visites/regles.js";
import { pointsComplete, pointsExpress, valides, plusRecent, quand, DUREE_BROUILLON_MS } from "../../src/domaines/visites/brouillon.js";

test("visite rapide : neuf points dans l'ordre de la maquette", () => {
  assert.deepEqual(CHAMPS_EXPRESS.map((c) => c.k), ["activite", "provisions", "couvain", "force", "oeufs_vus", "cellules_royales", "reine", "poids_kg", "etat"]);
});

test("visite rapide : « comme le 12/05 » et durée lisible", () => {
  assert.equal(jourMoisCourt("2026-05-12"), "12/05");
  assert.equal(jourMoisCourt(""), "");
  assert.equal(dureeTexte(24), "24 s");
  assert.equal(dureeTexte(72), "1 min 12");
  assert.equal(dureeTexte(-3), "0 s");
});

test("visite rapide : nouveaux champs vers la base", () => {
  assert.equal(oeufsVersBase("Oui"), true);
  assert.equal(oeufsVersBase("Non"), false);
  assert.equal(oeufsVersBase(""), null, "pas regardé ≠ pas vu");
  assert.equal(forceVersBase("4"), 4);
  assert.equal(forceVersBase("6"), "");
  assert.equal(forceVersBase(""), "");
  const dep = departExpress({ activite: "Normale", provisions: "Bonnes", force: 4, date_visite: "2026-05-12" }, { etat: "Bonne" });
  const p = chargeExpress({ valeurs: { ...dep, cellules_royales: "Operculées", oeufs_vus: "Oui" }, touches: ["cellules_royales", "oeufs_vus"] });
  assert.deepEqual([p.force, p.oeufs_vus, p.cellules_royales], [4, true, "Operculées"]);
  assert.deepEqual(p.observes, ["oeufs_vus", "cellules_royales"], "force reprise : envoyée mais pas observée");
  const q = chargeExpress({ valeurs: dep, touches: [] });
  assert.deepEqual([q.oeufs_vus, q.cellules_royales], [null, ""], "œufs et cellules pas regardés : vides");
});

test("essaimage : alerte sur la dernière visite d'une colonie active seulement", () => {
  const d = {
    ruches: [{ id: "a", nom: "Ruche 4" }, { id: "b", nom: "Ruche 2" }, { id: "c", nom: "Ruche 9", sortie: "Morte" }],
    visites: [
      { ruche_id: "a", date_visite: "2026-11-15", cellules_royales: "Operculées" },
      { ruche_id: "b", date_visite: "2026-11-01", cellules_royales: "Operculées" },
      { ruche_id: "b", date_visite: "2026-11-10", cellules_royales: "Aucune" },
      { ruche_id: "c", date_visite: "2026-11-15", cellules_royales: "Operculées" },
    ],
  };
  assert.deepEqual(alertesEssaimage(d).map((x) => x.ruche.nom), ["Ruche 4"], "Ruche 2 revue depuis, Ruche 9 sortie");
  assert.deepEqual(tacheEssaimage("Ruche 4", "2026-11-15"), { titre: "Surveiller l’essaimage · Ruche 4", echeance: "2026-11-21" });
  assert.equal(tacheEssaimage("R", "2026-12-28").echeance, "2027-01-03", "passage d'année");
});

test("brouillon : rien saisi = pas de brouillon ; points comptés depuis l'ouverture", () => {
  const depart = { ruche_id: "R1", date_visite: "2026-11-15", activite: "Normale", provisions: "Moyennes", note: "", q: {}, varroa_methode: "" };
  assert.equal(pointsComplete({ ...depart }, depart), 0);
  assert.equal(pointsComplete({ ...depart, varroa_methode: "Sucre glace", ruche_id: "R2", date_visite: "2026-11-14" }, depart), 0, "méthode, ruche, date : pas une saisie");
  assert.equal(pointsComplete({ ...depart, activite: "Forte", note: "Calme", q: { A1: 1 } }, depart), 3);
  assert.equal(pointsExpress({ touches: ["poids_kg", "reine"], note: " " }), 2);
  assert.equal(pointsExpress({ touches: [], note: "Douce" }), 1);
});

test("brouillon : expiration à 48 h, le plus récent d'abord", () => {
  const t = Date.UTC(2026, 10, 15, 10, 0);
  const l = { a: { at: t - DUREE_BROUILLON_MS - 1 }, b: { at: t - 3600e3 }, c: { at: t - 60e3 } };
  assert.deepEqual(Object.keys(valides(l, t)), ["b", "c"]);
  assert.equal(plusRecent(valides(l, t)).rucheId, "c");
  assert.equal(plusRecent({}), null);
  const h = new Date(2026, 10, 15, 10, 42).getTime();
  assert.equal(quand(h, new Date(2026, 10, 15, 18, 0).getTime()), "10 h 42");
  assert.equal(quand(h, new Date(2026, 10, 16, 9, 0).getTime()), "hier à 10 h 42");
});
