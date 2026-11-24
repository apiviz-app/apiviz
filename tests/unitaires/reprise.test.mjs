// Reprendre son carnet (v5.85) : tableur, colonnes, valeurs, plan d'import, relevé d'une photo (lire-carnet).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/compte/regles-reprise.js";
import * as C from "../../supabase/functions/lire-carnet/regles.js";

test("CSV : séparateur deviné, guillemets, lignes vides", () => {
  assert.deepEqual(R.lireCsv('Ruche;Date;Note\n"R1";12/09/2026;"Hausse posée; ""belle"""\n\nR2;13/09/2026;\n'),
    [["Ruche", "Date", "Note"], ["R1", "12/09/2026", 'Hausse posée; "belle"'], ["R2", "13/09/2026", ""]]);
  assert.deepEqual(R.lireCsv("﻿nom,date\r\nA,2026-05-01"), [["nom", "date"], ["A", "2026-05-01"]]);
});

test("colonnes reconnues d'après l'en-tête, une seule fois chacune", () => {
  assert.deepEqual(R.detecterColonnes(["N° ruche", "Rucher", "Date de visite", "Reine vue", "Cadres de couvain", "Réserves", "Remarques"]),
    { ruche: 0, rucher: 1, date: 2, reine: 3, couvain: 4, provisions: 5, note: 6 });
  assert.equal(R.detecterColonnes(["Colonie", "Le"]).date, 1);
});

test("dates d'un tableur : français, ISO, nombre Excel, jamais dans le futur", () => {
  assert.equal(R.dateTableur("12/09/2026"), "2026-09-12");
  assert.equal(R.dateTableur("1/5/26"), "2026-05-01");
  assert.equal(R.dateTableur("2026-9-3"), "2026-09-03");
  assert.equal(R.dateTableur(46277), "2026-09-12");
  assert.equal(R.dateTableur("31/02/2026"), "");
  assert.equal(R.dateTableur("12/12/2026", "2026-11-24"), "");
  assert.equal(R.dateTableur("hier"), "");
});

test("valeurs ramenées à celles de la visite", () => {
  assert.equal(R.valeur("reine", "oui"), "Vue");
  assert.equal(R.valeur("reine", "Pas vue"), "Non vue");
  assert.equal(R.valeur("reine", "œufs frais"), "Vue");
  assert.equal(R.valeur("couvain", "5"), "Normal");
  assert.equal(R.valeur("couvain", "8"), "Abondant");
  assert.equal(R.valeur("couvain", "peu"), "Réduit");
  assert.equal(R.valeur("provisions", "légère"), "Faibles");
  assert.equal(R.valeur("provisions", "lourde"), "Bonnes");
  assert.equal(R.valeur("activite", "nerveuses"), "Forte");
  assert.equal(R.valeur("activite", "calme"), "Normale");
  assert.equal(R.valeur("reine", "?"), "");
});

test("tableur → carnet : une ligne par visite, ruches regroupées, triées par date", () => {
  const lignes = [["Ruche", "Rucher", "Date", "Reine", "Couvain", "Poids", "Note"],
    ["R1", "Le Verger", "13/09/2026", "oui", "5", "38,5", ""], ["R2", "Le Verger", "12/09/2026", "non", "2", "", "à revoir"],
    ["r1", "Le Verger", "01/09/2026", "", "", "", "traité"], ["R3", "", "", "", "", "", ""]];
  const c = R.tableurVersCarnet(lignes, R.detecterColonnes(lignes[0]), "2026-11-24");
  assert.equal(c.lisible, true);
  assert.deepEqual(c.ruches.map((x) => [x.nom, x.visites.length]), [["R1", 2], ["R2", 1], ["R3", 0]]);
  assert.deepEqual(c.ruches[0].visites.map((v) => v.date), ["2026-09-01", "2026-09-13"]);
  assert.equal(c.ruches[0].visites[1].couvain, "Normal");
  assert.equal(c.ruches[0].visites[1].poids_kg, 38.5);
  assert.equal(c.ruches[1].visites[0].reine, "Non vue");
  assert.deepEqual(R.resume(c), { ruches: 3, visites: 3, doutes: 0 });
  assert.equal(R.tableurVersCarnet(lignes, { date: 2 }, "2026-11-24").lisible, false);
});

test("plan d'import : nom existant repris, ruches créées d'office renommées, le reste ajouté", () => {
  const ex = [{ id: "a", nom: "Ruche 1", rucher: "Le Verger" }, { id: "b", nom: "Ruche 2", rucher: "Le Verger" }, { id: "c", nom: "La bleue", rucher: "Le Verger" }];
  const carnet = { ruches: [
    { nom: "La bleue", visites: [{ date: "2026-09-01" }] },
    { nom: "R12", visites: [{ date: "2026-09-02" }, { date: "2026-09-10" }] },
    { nom: "R13", visites: [] },
    { nom: "R14", rucher: "Les Combes", visites: [{ date: "2026-09-03" }] },
  ] };
  const p = R.planImport(ex, new Set(["b"]), carnet);
  assert.deepEqual(p.renommer, [{ id: "a", ancien: "Ruche 1", nom: "R12" }]);
  assert.deepEqual(p.creer.map((x) => [x.nom, x.rucher]), [["R13", "Le Verger"], ["R14", "Les Combes"]]);
  assert.deepEqual(p.visites.map((v) => v.ruche), ["c", "a", "a", "nouvelle-3"]);
});

test("plan d'import : un doute réglé prend le nom choisi, une ruche ignorée ne vient pas", () => {
  const carnet = { ruches: [{ nom: "Ruche 1?", a_verifier: true, propositions: ["Ruche 12", "Ruche 17"], visites: [{ date: "2026-09-01" }] },
    { nom: "R5", a_verifier: true, visites: [{ date: "2026-09-01" }] }] };
  const p = R.planImport([], new Set(), carnet, { 0: "Ruche 17", 1: null });
  assert.deepEqual(p.creer.map((x) => x.nom), ["Ruche 17"]);
  assert.equal(p.visites.length, 1);
});

test("visite reprise : champs lus observés, mention « repris du carnet », état de la ruche gardé", () => {
  const p = R.chargeVisite({ date: "2026-09-01", reine: "Vue", couvain: "", provisions: "Bonnes", activite: "", oeufs_vus: true, poids_kg: 38, note: "hausse" }, { id: "v", ruche_id: "r", etat: "À surveiller" });
  assert.deepEqual(p.observes, ["reine", "provisions", "oeufs_vus", "poids_kg", "note"]);
  assert.equal(p.note, "hausse (repris du carnet)");
  assert.equal(p.etat, "À surveiller");
  assert.equal(p.activite, "Normale");
  assert.equal(R.texteImport(8, 14), "8 ruches et 14 visites");
  assert.equal(R.texteImport(1, 0), "1 ruche");
});

test("lire-carnet : pages contrôlées", () => {
  assert.match(C.controlePieces([]), /au moins une photo/);
  assert.match(C.controlePieces(Array(7).fill({ type: "image/jpeg", donnees: "aa" })), /6 pages/);
  assert.match(C.controlePieces([{ type: "application/pdf", donnees: "a" }, { type: "image/jpeg", donnees: "a" }]), /Un seul PDF/);
  assert.equal(C.controlePieces([{ type: "image/jpeg", donnees: "aGVsbG8=" }]), null);
});

test("lire-carnet : relevé normalisé (valeurs permises, dates, doublons, doutes)", () => {
  const n = C.normaliser({ lisible: true, ruches: [
    { nom: "  Ruche 1? ", a_verifier: true, raison: "chiffre effacé", propositions: ["Ruche 12", "Ruche 17"], visites: [
      { date: "2026-09-12", reine: "Vue", couvain: "Beaucoup", provisions: "Bonnes", note: "hausse" },
      { date: "2026-09-12", activite: "Forte", note: "calme" }, { date: "2026-13-01" }, { date: "2027-01-01" }] },
    { nom: "", visites: [] }] }, "2026-11-24");
  assert.equal(n.ruches.length, 1);
  const r = n.ruches[0];
  assert.equal(r.nom, "Ruche 1?");
  assert.deepEqual(r.propositions, ["Ruche 12", "Ruche 17"]);
  assert.equal(r.visites.length, 1);
  assert.equal(r.visites[0].couvain, "");
  assert.equal(r.visites[0].activite, "Forte");
  assert.equal(r.visites[0].note, "hausse calme");
  assert.deepEqual(C.normaliser({ lisible: false, raison_illisible: "Ce n'est pas un carnet." }, "2026-11-24"), { lisible: false, raison: "Ce n'est pas un carnet.", ruches: [] });
  assert.equal(C.extraireReleve([{ type: "text", text: 'Voici : {"lisible": true, "ruches": []}' }]).lisible, true);
});
