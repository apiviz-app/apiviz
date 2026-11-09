// Règles des colonies (IT-06) : statut, rucher à une date, déplacement appliqué sur le téléphone, contenants, registre.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/domaines/colonies/regles.js";
import { numeros } from "../../src/domaines/colonies/contenants.js";

const base = () => ({
  ruchers: [{ id: "V", nom: "Verger", lat: 47, lng: 5 }, { id: "L", nom: "Lande", lat: 48, lng: 6 }, { id: "A", nom: "Ancien", archive_le: "2026-01-01" }],
  ruches: [
    { id: "r1", nom: "R1", rucher_id: "V", rucher: "Verger", statut: "active", sortie: "" },
    { id: "r2", nom: "R2", rucher_id: "V", rucher: "Verger", statut: "orpheline", sortie: "" },
    { id: "r3", nom: "R3", rucher_id: "L", rucher: "Lande", statut: "active", sortie: "" },
    { id: "m", nom: "Morte", rucher_id: "V", rucher: "Verger", statut: "morte", sortie: "Morte" },
  ],
  emplacements: [
    { id: "e1", colonie_id: "r1", rucher_id: "V", du: "2026-03-01", au: null },
    { id: "e2", colonie_id: "r2", rucher_id: "V", du: "2026-03-01", au: null },
    { id: "e3", colonie_id: "r3", rucher_id: "L", du: "2026-03-01", au: null },
  ],
  evenements: [{ id: "x", ruche_id: "r1", type: "installation", date_evenement: "2026-03-01", detail: "" }],
  deplacements: [],
});

test("statut : colonne, sinon sortie ; actives = active ou orpheline (AP-US-035)", () => {
  assert.equal(C.statut({ statut: "orpheline", sortie: "" }), "orpheline");
  assert.equal(C.statut({ sortie: "Réunie" }), "reunie", "base sans 016");
  assert.equal(C.statut({ statut: "active", sortie: "Morte" }), "morte", "sortie notée par l'ancienne version, sans déclencheur");
  assert.equal(C.statut(null), "active");
  const d = base();
  assert.equal(d.ruches.filter(C.estActive).length, 3, "2 actives + 1 orpheline comptées, la morte non");
  assert.deepEqual(C.parStatut(d.ruches, "morte").map((r) => r.id), ["m"]);
  assert.equal(C.sortieDe("perdue"), "Perdue");
  assert.equal(C.sortieDe("orpheline"), "");
});

test("rucher à une date (AP-US-032) : période [du, au)", () => {
  const e = [{ colonie_id: "c", rucher_id: "V", du: "2026-03-01", au: "2026-06-01" }, { colonie_id: "c", rucher_id: "B", du: "2026-06-01", au: null }];
  assert.equal(C.rucherADate(e, "c", "2026-05-15"), "V", "visite du 15 mai : au Verger");
  assert.equal(C.rucherADate(e, "c", "2026-06-01"), "B", "le jour du déplacement : déjà au nouveau rucher");
  assert.equal(C.rucherADate(e, "c", "2026-02-01"), undefined, "avant l'historique connu : inconnu");
  assert.equal(C.rucherADate([{ colonie_id: "c", rucher_id: null, du: "2026-01-01" }], "c", "2026-02-01"), null, "« Sans rucher »");
  assert.equal(C.emplacementsDe(e, "c")[0].rucher_id, "B", "plus récent en premier");
});

test("contrôles avant l'envoi d'un déplacement", () => {
  const d = base(), ok = { colonies: ["r1"], rucher_id: "L", date: "2026-06-20" };
  assert.equal(C.controleDeplacement(d, ok, "2026-06-20"), "");
  assert.equal(C.controleDeplacement(d, { ...ok, colonies: [] }, "2026-06-20"), "Choisis au moins une colonie.");
  assert.equal(C.controleDeplacement(d, { ...ok, rucher_id: "" }, "2026-06-20"), "Choisis le rucher de destination.");
  assert.match(C.controleDeplacement(d, { ...ok, rucher_id: "A" }, "2026-06-20"), /archivé/);
  assert.match(C.controleDeplacement(d, { ...ok, colonies: ["r1", "m"] }, "2026-06-20"), /Morte n’est plus active/);
  assert.equal(C.controleDeplacement(d, { ...ok, colonies: ["r3"] }, "2026-06-20"), "Ces colonies sont déjà dans ce rucher.");
  assert.match(C.controleDeplacement(d, { ...ok, date: "2026-02-01" }, "2026-06-20"), /arrivée dans son rucher actuel le 01\/03\/2026/);
  assert.match(C.controleDeplacement(d, { ...ok, date: "2026-06-22" }, "2026-06-20"), /futur/);
  assert.equal(C.controleDeplacement(d, { ...ok, date: "2026-06-21" }, "2026-06-20"), "", "lendemain toléré (fuseaux horaires)");
});

test("déplacement appliqué sur le téléphone (hors ligne), comme deplacer_colonies()", () => {
  const d = base(), p = { id: "D1", date: "2026-06-20", rucher_id: "L", colonies: ["r1", "r2", "r3"], motif: "transhumance", notes: "Colza" };
  C.appliquerDeplacement(d, p, { _attente: true });
  assert.deepEqual(d.ruches.filter((r) => r.rucher_id === "L").map((r) => r.id), ["r1", "r2", "r3"]);
  assert.equal(d.ruches[0].rucher, "Lande");
  assert.equal(d.ruches[0].lat, 48, "position du rucher de destination");
  const dep = d.deplacements[0];
  assert.equal(dep.nb_colonies, 2, "r3 était déjà à la Lande");
  assert.equal(dep.rucher_origine_id, "V");
  const lignes = d.evenements.filter((e) => e.deplacement_id === "D1");
  assert.equal(lignes.length, 2);
  assert.equal(lignes[0].detail, "Verger vers Lande, transhumance, Colza", "format du registre de la v5.10");
  assert.equal(C.rucherADate(d.emplacements, "r1", "2026-06-19"), "V");
  assert.equal(C.rucherADate(d.emplacements, "r1", "2026-06-20"), "L");
  assert.equal(d.emplacements.filter((e) => e.colonie_id === "r1" && !e.au).length, 1, "un seul emplacement ouvert");
  C.appliquerDeplacement(d, p);
  assert.equal(d.deplacements.length, 1, "appliqué une seule fois");
  assert.equal(d.evenements.filter((e) => e.deplacement_id === "D1").length, 2);
  // Même jour : l'emplacement du jour est corrigé, pas de période vide.
  C.appliquerDeplacement(d, { id: "D2", date: "2026-06-20", rucher_id: "V", colonies: ["r1"] });
  assert.equal(d.emplacements.filter((e) => e.colonie_id === "r1").length, 2);
  assert.equal(C.rucherADate(d.emplacements, "r1", "2026-06-20"), "V");
});

test("registre des mouvements : mêmes lignes qu'avant, date du déplacement", () => {
  const d = base();
  d.evenements.push({ id: "old", ruche_id: "r1", type: "deplacement", date_evenement: "2026-05-01", detail: "Bois vers Verger", deplacement_id: "R" });
  d.deplacements.push({ id: "R", date_deplacement: "2026-05-01", nb_colonies: 1, notes: "Bois vers Verger" });
  const types = ["installation", "deplacement", "sortie"];
  const l = C.lignesMouvements(d, types, 2026);
  assert.deepEqual(l.map((x) => [x.ruche_id, x.type, x.date_evenement, x.detail]),
    [["r1", "installation", "2026-03-01", ""], ["r1", "deplacement", "2026-05-01", "Bois vers Verger"]]);
  assert.equal(l[1].deplacement.id, "R", "chaque ligne de déplacement connaît son déplacement");
  assert.equal(C.lignesMouvements(d, types, 2025).length, 0);
  // Événement de la v5.10 envoyé après 016 sans déplacement relié : toujours au registre.
  d.evenements.push({ id: "n", ruche_id: "r2", type: "deplacement", date_evenement: "2026-07-01", detail: "Verger vers Lande" });
  assert.equal(C.lignesMouvements(d, types, 2026).length, 3);
});

test("statut appliqué sur le téléphone", () => {
  const d = base();
  C.appliquerStatut(d, { id: "s1", colonie_id: "r1", statut: "morte", date: "2026-07-01" });
  assert.deepEqual([d.ruches[0].statut, d.ruches[0].sortie, d.ruches[0].date_sortie], ["morte", "Morte", "2026-07-01"]);
  C.appliquerStatut(d, { id: "s2", colonie_id: "r2", statut: "active", date: "2026-07-01" });
  assert.deepEqual([d.ruches[1].statut, d.ruches[1].sortie, d.ruches[1].date_sortie], ["active", "", null]);
});

test("ruches physiques : transfert (AP-US-036), occupant, numéros", () => {
  const d = base();
  d.contenants = [{ id: "12", code: "12" }, { id: "31", code: "31" }];
  d.occupations = [{ id: "o1", colonie_id: "r1", contenant_id: "12", du: "2026-04-01", au: null }];
  assert.equal(C.occupant(d.occupations, d.ruches, "12").id, "r1");
  C.appliquerContenant(d, { id: "o2", colonie_id: "r1", contenant_id: "31", date: "2026-07-01" });
  assert.equal(C.occupant(d.occupations, d.ruches, "12"), undefined, "le 12 devient libre");
  assert.equal(C.occupant(d.occupations, d.ruches, "31").id, "r1", "le 31 est occupé");
  assert.equal(d.occupations.find((o) => o.id === "o1").au, "2026-07-01", "historique gardé");
  C.appliquerContenant(d, { id: "o2", colonie_id: "r1", contenant_id: "31", date: "2026-07-01" });
  assert.equal(d.occupations.length, 2, "renvoi sans doublon");
  d.occupations.push({ id: "o3", colonie_id: "m", contenant_id: "12", du: "2026-01-01", au: null });
  assert.equal(C.occupant(d.occupations, d.ruches, "12"), undefined, "une colonie morte ne bloque pas sa caisse");
  assert.deepEqual(numeros("12", ""), ["12"]);
  assert.deepEqual(numeros("12", "14"), ["12", "13", "14"]);
  assert.deepEqual(numeros("A3", ""), ["A3"]);
  assert.equal(numeros("12", "10"), null);
  assert.equal(numeros("1", "500"), null);
});
