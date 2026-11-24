// Préparer ma sortie (v5.80). src/domaines/agenda/sortie-regles.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../src/domaines/agenda/sortie-regles.js";

const ruches = [
  { id: "v1", nom: "V1", rucher: "Verger", etat: "Bonne" },
  { id: "v2", nom: "V2", rucher: "Verger", etat: "Bonne" },
  { id: "c3", nom: "C3", rucher: "Combes", etat: "À surveiller" },
  { id: "c5", nom: "C5", rucher: "Combes", etat: "Bonne", statut: "orpheline" },
  { id: "c6", nom: "C6", rucher: "Combes", etat: "Bonne" },
  { id: "m", nom: "Morte", rucher: "Combes", etat: "Critique", sortie: "Morte" },
];
const taches = [
  { id: "t1", titre: "Poser 3 pains de candi", echeance: "2026-11-25", ruche_id: "c6" },
  { id: "t2", titre: "Retirer les lanières", echeance: "2026-11-20", ruche_id: "v2" },
  { id: "t3", titre: "Peser avant l'hiver", echeance: "2026-11-25", ruche_id: "v1" },
  { id: "t4", titre: "Recompter le varroa", echeance: "2026-11-25", ruche_id: "c3" },
  { id: "t5", titre: "Commander des pots", echeance: "2026-11-25", ruche_id: null },
  { id: "t6", titre: "Plus tard", echeance: "2026-12-10", ruche_id: "v1" },
  { id: "t7", titre: "Déjà fait", echeance: "2026-11-25", ruche_id: "v1", faite: true },
];
const visites = [{ ruche_id: "c6", date_visite: "2026-09-01" }, { ruche_id: "v1", date_visite: "2026-11-10" }];

test("programme : tâches du jour et en retard, colonies à voir sans tâche, pas les sorties", () => {
  const it = P.programme({ taches, ruches, visites }, "2026-11-25");
  assert.deepEqual(it.map((x) => x.texte), ["Poser 3 pains de candi", "Retirer les lanières", "Peser avant l'hiver", "Recompter le varroa", "Commander des pots", "C5 : orpheline, voir la reine"]);
  assert.equal(it.find((x) => x.tache_id === "t2").retard, true);
  assert.equal(it.find((x) => x.tache_id === "t5").rucher, null);
});

test("par rucher : du plus chargé au moins chargé, tâches sans rucher à part", () => {
  const g = P.parRucher(P.programme({ taches, ruches, visites }, "2026-11-25"));
  assert.deepEqual(g.map((x) => [x.cle, x.items.length, x.colonies]), [["Combes", 3, 3], ["Verger", 2, 2]]);
});

test("matériel : toujours, puis selon les mots, avec le stock de Matériel", () => {
  const it = P.programme({ taches, ruches, visites }, "2026-11-25");
  const articles = [{ id: "a1", nom: "Candy", stock: 2, unite: "unité" }, { id: "a2", nom: "Lanières anti-varroa", stock: 0, unite: "unité" }];
  const m = P.materiel(it, articles);
  const par = Object.fromEntries(m.map((x) => [x.nom, x]));
  assert.ok(par["Enfumoir et combustible"] && par["Voile et gants"]);
  assert.equal(par["Candi"].besoin, 3, "3 pains écrits dans la tâche");
  assert.equal(par["Candi"].stock, 2);
  assert.equal(par["Candi"].manque, 1);
  assert.equal(P.detail(par["Candi"]), "Pour 3 colonies · il t’en reste 2");
  assert.ok(par["Peson"] && par["Peson"].stock === null);
  assert.ok(par["Sucre glace et bocal de comptage"]);
  assert.ok(par["Gants jetables"] && par["Sac pour les lanières usagées"]);
  assert.equal(par["Hausses"], undefined);
});

test("rien à faire : seulement le matériel de toujours", () => {
  assert.equal(P.materiel([], []).length, P.TOUJOURS.length);
});

test("jours proposés et meilleure plage", () => {
  assert.deepEqual(P.jours("2026-11-24").map((j) => j.iso), ["2026-11-24", "2026-11-25", "2026-11-26"]);
  assert.deepEqual(P.meilleurePlage([{ debut: 9, fin: 10, n: 1 }, { debut: 10, fin: 13, n: 2 }, { debut: 15, fin: 16, n: 2 }]), { debut: 10, fin: 13, n: 2 });
  assert.equal(P.meilleurePlage([]), null);
});
