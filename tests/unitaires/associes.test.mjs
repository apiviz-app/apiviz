// Comptes entre associés (v5.29) : qui a acheté, avec quel argent, qui a vendu, qui a récolté l'argent.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as A from "../../src/domaines/finances/associes.js";

const d = () => ({
  depenses: [
    { id: "d1", montant: 212.4, achete_par: "Pierre-Louis", paye_par: "Pierre-Louis" },
    { id: "d2", montant: 175.6, achete_par: "Johan", paye_par: "Johan" },
    { id: "d3", montant: 84, achete_par: "Johan", paye_par: "Société" },
    { id: "d4", montant: 30, achete_par: "", paye_par: "Caisse commune" },
  ],
  ventes: [
    { id: "v1", paye: true, vendu_par: "Pierre-Louis", encaisse_par: "Pierre-Louis" },
    { id: "v2", paye: true, vendu_par: "Johan", encaisse_par: "Johan" },
    { id: "v3", paye: true, vendu_par: "Johan", encaisse_par: "Société" },
    { id: "v4", paye: false, vendu_par: "Pierre-Louis", encaisse_par: "Pierre-Louis" },
  ],
  lignes: [
    { vente_id: "v1", quantite: 4, prix_unitaire: 24 }, { vente_id: "v2", quantite: 8, prix_unitaire: 12 },
    { vente_id: "v3", quantite: 2, prix_unitaire: 14 }, { vente_id: "v4", quantite: 1, prix_unitaire: 14 },
  ],
});

test("Société et Caisse commune sont l'argent de la société", () => {
  assert.ok(A.estSociete("Société") && A.estSociete(" caisse commune ") && A.estSociete("societe"));
  assert.ok(!A.estSociete("Johan") && !A.estSociete(""));
});

test("associés : réglages d'abord, sinon les noms déjà notés ; moi en premier", () => {
  assert.deepEqual(A.associesConnus(d(), {}, "Pierre-Louis"), ["Pierre-Louis", "Johan"]);
  assert.deepEqual(A.associesConnus(d(), {}, "Johan"), ["Johan", "Pierre-Louis"]);
  assert.deepEqual(A.associesConnus(d(), { associes: ["Johan", " Pierre-Louis ", ""] }), ["Johan", "Pierre-Louis"]);
  assert.deepEqual(A.associesConnus({ depenses: [], ventes: [] }, {}, ""), []);
});

test("soldes : avancé de ses fonds propres, encaissé sur des ventes payées", () => {
  const s = A.soldesAssocies(d(), ["Pierre-Louis", "Johan"]);
  assert.deepEqual(s[0], { nom: "Pierre-Louis", achats: 1, avance: 212.4, ventes: 2, encaisse: 96, solde: 116.4 });
  assert.deepEqual(s[1], { nom: "Johan", achats: 2, avance: 175.6, ventes: 2, encaisse: 96, solde: 79.6 },
    "un achat payé par la société et une vente encaissée par la société ne comptent pas dans le solde");
});

test("règlement entre deux associés : la moitié de l'écart", () => {
  assert.deepEqual(A.reglementEntreAssocies(A.soldesAssocies(d(), ["Pierre-Louis", "Johan"])), { de: "Johan", a: "Pierre-Louis", montant: 18.4 });
  assert.equal(A.reglementEntreAssocies([{ nom: "A", solde: 10 }, { nom: "B", solde: 10 }]), null, "à égalité");
  assert.equal(A.reglementEntreAssocies([{ nom: "A", solde: 10 }]), null, "un seul associé");
});
