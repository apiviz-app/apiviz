// Règles des reines et de la filiation (IT-07) : couleur de marquage, reine en place, changement et correction
// appliqués sur le téléphone, contrôles avant l'envoi, lignée, phrase d'origine, journal unifié.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/colonies/reines.js";

const base = () => ({
  ruches: [
    { id: "r1", nom: "Ruche 1", statut: "active", annee_reine: 2024, reine_origine: "Achetée", reine_introduite: "2024-05-02", date_installation: "2023-04-01" },
    { id: "r2", nom: "Ruche 2", statut: "active", annee_reine: 2025, reine_origine: "", reine_introduite: null, date_installation: "2025-04-10" },
    { id: "r3", nom: "Ruche 3", statut: "orpheline", annee_reine: null, reine_origine: "", reine_introduite: null },
    { id: "r5", nom: "Ruche 5", statut: "active", annee_reine: null },
  ],
  ruchesSorties: [{ id: "r6", nom: "Ruche 6", statut: "reunie", sortie: "Réunie" }],
  reines: [{ id: "q1", colonie_id: "r1", annee_naissance: 2024, marquage: "vert", origine: "Achetée", en_place_du: "2024-05-02", en_place_au: null, statut: "en_place", clippee: false, notes: "" }],
  evenements: [
    { id: "e1", ruche_id: "r2", type: "division", date_evenement: "2026-05-12", detail: "Nouvelle ruche : Ruche 5", autre_ruche_id: "r5" },
    { id: "e2", ruche_id: "r5", type: "installation", date_evenement: "2026-05-12", detail: "Issue de la division de Ruche 2", autre_ruche_id: "r2" },
    { id: "e3", ruche_id: "r1", type: "essaimage", date_evenement: "2026-06-01", detail: "Essaim récupéré : Ruche 6", autre_ruche_id: "r6" },
    { id: "e4", ruche_id: "r1", type: "reunion", date_evenement: "2026-07-01", detail: "Ruche 6 réunie dans cette ruche", autre_ruche_id: "r6" },
    { id: "e5", ruche_id: "r1", type: "essaimage", date_evenement: "2026-06-03", detail: "Essaim perdu", autre_ruche_id: null },
  ],
  liens: [
    { id: "l1", parent_id: "r2", enfant_id: "r5", type: "division", date_lien: "2026-05-12", evenement_id: "e1" },
    { id: "l2", parent_id: "r1", enfant_id: "r6", type: "essaim", date_lien: "2026-06-01", evenement_id: "e3" },
    { id: "l3", parent_id: "r6", enfant_id: "r1", type: "reunion", date_lien: "2026-07-01", evenement_id: "e4" },
  ],
  visites: [
    { id: "v1", ruche_id: "r1", date_visite: "2026-07-01" },
    { id: "v2", ruche_id: "r1", date_visite: "2026-05-20" },
    { id: "vx", ruche_id: "r2", date_visite: "2026-06-15" },
  ],
});

test("couleur de marquage : cycle de 5 ans, identique à la v5 (AP-TECH-117)", () => {
  assert.deepEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029].map(R.couleurMarquage),
    ["bleu", "blanc", "jaune", "rouge", "vert", "bleu", "blanc", "jaune", "rouge", "vert"]);
  assert.equal(R.couleurMarquage(null), "aucun");
  assert.equal(R.couleurMarquage(""), "aucun");
  // Table de la v5 (v3.js MARQUE) : libellé et couleur inchangés.
  assert.deepEqual(R.MARQUAGES.bleu, ["Bleu", "#1565C0"]);
  assert.deepEqual(R.MARQUAGES.blanc, ["Blanc", "#F4F4F4"]);
});

test("âge de la reine", () => {
  assert.equal(R.age(2026, 2026), "de l’année");
  assert.equal(R.age(2025, 2026), "1 an");
  assert.equal(R.age(2023, 2026), "3 ans");
});

test("reines d'une colonie : table, sinon repli sur les colonnes de la ruche", () => {
  const d = base();
  assert.equal(R.reineEnPlace(d, d.ruches[0]).id, "q1");
  const repli = R.reineEnPlace(d, d.ruches[1]);
  assert.equal(repli.annee_naissance, 2025);
  assert.equal(repli.marquage, "bleu");
  assert.equal(repli.en_place_du, "2025-04-10"); // sans date d'introduction : date d'installation
  assert.equal(repli.id, null);
  assert.equal(R.reineEnPlace(d, d.ruches[2]), undefined);
  assert.deepEqual(R.reinesDe(d, undefined), []);
});

test("AP-US-037 : une reine 2026 introduite le 10 mai clôture la 2024 au 10 mai", () => {
  const d = base();
  R.appliquerReine(d, { id: "q2", colonie_id: "r1", annee: 2026, date: "2026-05-10", origine: "Élevage maison" });
  const l = R.reinesDe(d, d.ruches[0]);
  assert.equal(l.length, 2);
  assert.deepEqual([l[0].annee_naissance, l[0].statut, l[0].en_place_du, l[0].en_place_au, l[0].marquage], [2026, "en_place", "2026-05-10", null, "blanc"]);
  assert.deepEqual([l[1].annee_naissance, l[1].statut, l[1].en_place_au], [2024, "remplacee", "2026-05-10"]);
  // Les colonnes de la ruche suivent (liste des ruches, ancienne version).
  assert.deepEqual([d.ruches[0].annee_reine, d.ruches[0].reine_origine, d.ruches[0].reine_introduite], [2026, "Élevage maison", "2026-05-10"]);
  assert.equal(d.evenements[0].type, "reine");
  assert.equal(d.evenements[0].detail, "Reine 2026 · élevage maison");
  // Même saisie rejouée (file d'envoi) : rien en double.
  R.appliquerReine(d, { id: "q2", colonie_id: "r1", annee: 2026, date: "2026-05-10" });
  assert.equal(d.reines.length, 2);
  assert.equal(d.evenements.filter((e) => e.type === "reine").length, 1);
});

test("changer de reine : repli repris dans l'historique, orpheline redevient active, devenir de l'ancienne", () => {
  const d = base();
  R.appliquerReine(d, { id: "q3", colonie_id: "r2", annee: 2026, date: "2026-04-15", ancienne: "morte", marquage: "aucun", clippee: true, notes: " Douce " });
  const l = R.reinesDe(d, d.ruches[1]);
  assert.deepEqual(l.map((x) => [x.annee_naissance, x.statut]), [[2026, "en_place"], [2025, "morte"]]);
  assert.deepEqual([l[0].marquage, l[0].clippee, l[0].notes], ["aucun", true, "Douce"]);
  R.appliquerReine(d, { id: "q4", colonie_id: "r3", annee: 2026, date: "2026-06-20" });
  assert.equal(d.ruches[2].statut, "active");
  assert.equal(R.reinesDe(d, d.ruches[2]).length, 1);
  // Colonie inconnue : rien.
  R.appliquerReine(d, { id: "q5", colonie_id: "zz", annee: 2026, date: "2026-06-20" });
  assert.equal(d.reines.some((x) => x.id === "q5"), false);
});

test("contrôles avant l'envoi, en français", () => {
  const d = base(), auj = "2026-06-01";
  assert.equal(R.controleReine(d, { colonie_id: "r1", annee: 2026, date: "2026-05-10" }, auj), "");
  assert.match(R.controleReine(d, { colonie_id: "r1", annee: "", date: "2026-05-10" }, auj), /année de naissance/);
  assert.match(R.controleReine(d, { colonie_id: "r1", annee: 2026, date: "2024-05-01" }, auj), /l’année d’introduction/);
  assert.match(R.controleReine(d, { colonie_id: "r1", annee: 2023, date: "2024-05-01" }, auj), /depuis le 02\/05\/2024/);
  assert.match(R.controleReine(d, { colonie_id: "r1", annee: 2026, date: "2026-08-01" }, auj), /futur/);
  assert.match(R.controleReine(d, { colonie_id: "r1", annee: 1980, date: "2026-05-10" }, auj), /1990/);
  assert.equal(R.controleReine(d, { colonie_id: "zz", annee: 2026, date: "2026-05-10" }, auj), "Colonie introuvable");
  assert.match(R.controleReine(d, { colonie_id: "r1", annee: 2026, date: "2026-05-10" }, auj, false), /n’est plus active/);
});

test("corriger une reine : pas de nouvelle reine, colonnes de la ruche à jour", () => {
  const d = base();
  R.appliquerReine(d, { id: "q2", colonie_id: "r1", annee: 2026, date: "2026-05-10" });
  assert.equal(R.controleCorrection(d, { id: "q2", annee: 2025, date: "2026-05-12" }, "2026-06-01"), "");
  assert.match(R.controleCorrection(d, { id: "q2", annee: 2025, date: "2026-05-01" }, "2026-06-01"), /reine précédente/);
  assert.match(R.controleCorrection(d, { id: "q1", annee: 2024, date: "2026-05-20" }, "2026-06-01"), /remplacée le 10\/05\/2026/);
  assert.equal(R.controleCorrection(d, { id: "zz", annee: 2025, date: "2026-05-12" }, "2026-06-01"), "Reine introuvable");
  R.appliquerCorrection(d, { id: "q2", annee: 2025, date: "2026-05-12", origine: "Achetée", marquage: "bleu" });
  assert.equal(d.reines.length, 2);
  assert.deepEqual([d.ruches[0].annee_reine, d.ruches[0].reine_origine, d.ruches[0].reine_introduite], [2025, "Achetée", "2026-05-12"]);
  // Une ancienne reine corrigée ne change pas la reine en place.
  R.appliquerCorrection(d, { id: "q1", notes: "Très douce" });
  assert.equal(d.reines.find((x) => x.id === "q1").notes, "Très douce");
  assert.equal(d.ruches[0].annee_reine, 2025);
});

test("liens : table, ou déduits du journal sur une base sans 019", () => {
  const d = base();
  assert.equal(R.liens(d).length, 3);
  const deduits = R.liens({ ...d, liens: undefined }, true);
  assert.deepEqual(deduits.map((x) => [x.parent_id, x.enfant_id, x.type]), [["r2", "r5", "division"], ["r1", "r6", "essaim"], ["r6", "r1", "reunion"]]);
  assert.equal(R.lienDeEvenement(d.evenements[1]), null); // installation
  assert.equal(R.lienDeEvenement(d.evenements[4]), null); // essaim perdu
});

test("AP-US-038 : « Issue de Ruche 2 le 12 mai », descendance et réunions", () => {
  const d = base();
  const l5 = R.lignee(d, "r5");
  assert.equal(l5.origine.autre.nom, "Ruche 2");
  assert.equal(R.phraseOrigine(l5.origine.lien, l5.origine.autre.nom, 2026), "Issue de Ruche 2 le 12 mai");
  assert.equal(R.phraseOrigine({ type: "essaim", date_lien: "2025-06-01" }, "Ruche 1", 2026), "Essaim de Ruche 1 le 1er juin 2025");
  assert.equal(R.phraseOrigine({ type: "division", date_lien: "2026-05-12" }, undefined, 2026), "Issue de une colonie supprimée le 12 mai");
  const l2 = R.lignee(d, "r2");
  assert.deepEqual(l2.issues.map((x) => x.autre.nom), ["Ruche 5"]);
  assert.equal(l2.origine, undefined);
  const l1 = R.lignee(d, "r1");
  assert.deepEqual(l1.issues.map((x) => x.autre.nom), ["Ruche 6"]);
  assert.deepEqual(l1.reunies.map((x) => x.autre.nom), ["Ruche 6"]);
  assert.equal(l1.origine, undefined); // la réunion de Ruche 6 n'en fait pas l'origine de Ruche 1
  const l6 = R.lignee(d, "r6");
  assert.equal(l6.origine.lien.type, "essaim");
  assert.equal(l6.reunieDans.autre.nom, "Ruche 1");
});

test("anti-cycle : la descendance ne boucle pas, la réunion ne compte pas (AP-TECH-118)", () => {
  const l = [{ parent_id: "a", enfant_id: "b", type: "division" }, { parent_id: "b", enfant_id: "c", type: "essaim" }, { parent_id: "c", enfant_id: "a", type: "reunion" }];
  assert.equal(R.feraitBoucle(l, "c", "a"), true);
  assert.equal(R.feraitBoucle(l, "a", "a"), true);
  assert.equal(R.feraitBoucle(l, "a", "d"), false);
  assert.equal(R.feraitBoucle(l, "c", "d"), false);
});

test("journal unifié : visites et événements dans l'ordre des dates (AP-TECH-122)", () => {
  const d = base();
  const j = R.journal(d, d.ruches[0]);
  assert.deepEqual(j.map((x) => [x.genre, x.date, x.visite?.id || x.evenement.type]), [
    ["visite", "2026-07-01", "v1"], ["evenement", "2026-07-01", "reunion"], ["evenement", "2026-06-03", "essaimage"],
    ["evenement", "2026-06-01", "essaimage"], ["visite", "2026-05-20", "v2"], ["evenement", "2023-04-01", "installation"]]);
  // Une colonie qui a son événement d'installation ne le reçoit pas deux fois.
  assert.deepEqual(R.journal(d, { id: "r5", date_installation: "2026-05-12" }).map((x) => x.evenement.type), ["installation"]);
});
