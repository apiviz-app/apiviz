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
  assert.deepEqual(v, { activite: "Forte", provisions: "Bonnes", couvain: "Non vu", reine: "Non cherchée", poids_kg: 16, etat: "À surveiller" });
  assert.deepEqual(departExpress(null, null), { activite: "Normale", provisions: "Moyennes", couvain: "Non vu", reine: "Non cherchée", poids_kg: "", etat: "Bonne" });
  assert.equal(departExpress({ ...derniere, activite: "Inconnue" }).activite, "Normale", "valeur inconnue : départ par défaut");
});

test("visite express : repris, vu, changé", () => {
  const dep = departExpress(derniere, { etat: "Bonne" }), val = { ...dep, poids_kg: 15.2, provisions: "Bonnes" };
  assert.equal(etatChamp("activite", val, dep, []), "repris");
  assert.equal(etatChamp("reine", val, dep, []), "non vu");
  assert.equal(etatChamp("poids_kg", val, dep, ["poids_kg"]), "change");
  assert.equal(etatChamp("provisions", val, dep, ["provisions"]), "vu");
  assert.deepEqual(resumeExpress(val, dep, ["poids_kg", "provisions"]), { changes: 1, vus: 1, repris: 3 });
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
  assert.deepEqual(champsRepris({ observes: ["poids_kg"] }), ["activite", "provisions", "couvain", "etat"]);
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
