// Bilan de saison enrichi (v5.79). src/domaines/equipe/bilan-saison.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as B from "../../src/domaines/equipe/bilan-saison.js";

const ruchers = [{ id: "rv", nom: "Le Verger" }, { id: "rc", nom: "Les Combes" }];
const ruches = [
  { id: "v1", nom: "V1", rucher_id: "rv", date_creation: "2024-05-01" },
  { id: "v2", nom: "V2", rucher_id: "rv", date_creation: "2025-04-01" },
  { id: "c1", nom: "C1", rucher_id: "rc", date_creation: "2024-06-01" },
  { id: "e1", nom: "E1", rucher_id: "rc", date_creation: "2026-05-12", origine: "essaim" },
  { id: "d1", nom: "D1", rucher_id: "rv", date_creation: "2026-06-02", origine: "division" },
];
const ruchesSorties = [
  { id: "c2", nom: "C2", rucher_id: "rc", date_creation: "2024-06-01", sortie: "Morte", date_sortie: "2026-02-10" },
  { id: "c3", nom: "C3", rucher_id: "rc", date_creation: "2024-06-01", sortie: "Perdue", date_sortie: "2026-03-01" },
  { id: "x1", nom: "X1", rucher_id: "rv", date_creation: "2023-06-01", sortie: "Réunie", date_sortie: "2026-04-01" },
  { id: "o1", nom: "O1", rucher_id: "rv", date_creation: "2023-06-01", sortie: "Morte", date_sortie: "2025-11-01" },
];
const d = { ruchers, ruches, ruchesSorties, visites: [], operations: [], comptesVarroa: [] };

test("colonies : début, fin, pertes par rucher, nées et autres sorties", () => {
  const c = B.colonies(d, 2026, "2026-11-24");
  assert.equal(c.debut, 6, "v1, v2, c1, c2, c3, x1 (o1 morte en 2025)");
  assert.equal(c.fin, 5, "v1, v2, c1, e1, d1");
  assert.equal(c.pertes, 2);
  assert.deepEqual(c.pertesParRucher, [["Les Combes", 2]]);
  assert.equal(c.autresSorties, 1);
  assert.equal(c.essaims, 1);
  assert.equal(c.divisions, 1);
});

test("varroa : moyenne des taux, colonies au-dessus du seuil choisi, par rucher", () => {
  const dd = { ...d, operations: [
    { id: "o1", date_operation: "2026-08-10", methode: "Sucre glace", echantillon_abeilles: 300 },
    { id: "o2", date_operation: "2026-04-10", methode: "Sucre glace", echantillon_abeilles: 300 },
  ], comptesVarroa: [
    { id: "a", operation_id: "o1", ruche_id: "c1", varroa: 12 }, // 4 %
    { id: "b", operation_id: "o1", ruche_id: "e1", varroa: 9 },  // 3 %
    { id: "c", operation_id: "o1", ruche_id: "v1", varroa: 3 },  // 1 %
    { id: "e", operation_id: "o2", ruche_id: "v2", varroa: 6 },  // 2 %
  ] };
  const sans = B.varroa(dd, 2026, { seuils: [], reglages: {} });
  assert.equal(sans.comptages, 4);
  assert.equal(sans.moyenne, 2.5);
  assert.equal(sans.auDessus, 0, "sans seuil choisi : aucune alerte");
  const v = B.varroa(dd, 2026, { seuils: [], reglages: { varroaSeuil: 3 } });
  assert.equal(v.auDessus, 2);
  assert.deepEqual(v.parRucher, [["Les Combes", 2]]);
  assert.deepEqual(v.mois, [8, 8]);
});

const s = { kg: 452, kgAvant: 380, pots: 310, clients: 40, rentre: 3412, depense: 2893, stock: 80, nbVentes: 90 };

test("bilan : ce qui a marché, à revoir, ce qui manque ; coût du kilo", () => {
  const b = B.bilan({ d, annee: 2026, aujourdhui: "2026-11-24", ctx: { seuils: [], reglages: {} }, s,
    parRuche: [{ nom: "V1", kg: 31 }], constats: ["Les ruches « Le Verger » ont donné 40 % de plus que les autres, par ruche.", "C1 n’a rien donné cette année."], caAvant: 1700 });
  assert.equal(b.coutKg, 6.4);
  assert.deepEqual(b.marche.map((x) => x.texte), [
    "Les ruches « Le Verger » ont donné 40 % de plus que les autres, par ruche.",
    "1 essaim récupéré et 1 colonie faite par division ou élevage.",
    "Les ventes ont augmenté de 101 % par rapport à 2025.",
  ]);
  assert.deepEqual(b.revoir.map((x) => x.texte), ["2 colonies perdues, toutes à « Les Combes ».", "C1 n’a rien donné cette année."]);
  assert.deepEqual(b.manque.map((x) => x.texte), ["Aucun comptage de varroa noté cette année."]);
});

test("versions : la sanitaire et la simple n'ont pas d'argent ; la simple pas de détails", () => {
  const b = B.bilan({ d, annee: 2026, aujourdhui: "2026-11-24", ctx: { seuils: [], reglages: {} }, s, parRuche: [{ nom: "V1", kg: 31 }], constats: [], caAvant: 1700 });
  assert.ok(B.filtrer(b.marche, "complete").some((x) => /ventes/.test(x.texte)));
  assert.ok(!B.filtrer(b.marche, "sanitaire").some((x) => /ventes/.test(x.texte)));
  const t = B.texte("Rucher des Combes", 2026, b, "complete", [{ nom: "V1", kg: 31 }]);
  assert.match(t, /^Rucher des Combes · Saison 2026\n452 kg récoltés\nColonies : 6 au début, 5 à la fin, 2 perdues\n310 pots vendus, 3412 € rentrés, 2893 € dépensés\nCoût du kilo : 6,4 €/);
  const g = B.texte("", 2026, b, "sanitaire");
  assert.ok(!/€/.test(g), "sanitaire : aucun euro");
  assert.match(g, /À revoir :/);
  const fam = B.texte("", 2026, b, "famille", [{ nom: "V1", kg: 31 }]);
  assert.ok(!/€/.test(fam) && !/À revoir/.test(fam));
  assert.match(fam, /Meilleure ruche : V1 \(31 kg\)/);
});

test("rien de saisi : le manque est dit, aucune phrase inventée", () => {
  const vide = { kg: 0, kgAvant: 0, pots: 0, clients: 0, rentre: 0, depense: 0, stock: 0, nbVentes: 0 };
  const b = B.bilan({ d: { ruches: [], ruchesSorties: [] }, annee: 2026, aujourdhui: "2026-11-24", ctx: {}, s: vide });
  assert.deepEqual(b.marche, []);
  assert.deepEqual(b.revoir, []);
  assert.equal(b.coutKg, null);
  assert.equal(b.manque.length, 2);
});
