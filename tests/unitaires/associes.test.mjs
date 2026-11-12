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
  assert.deepEqual(s[0], { nom: "Pierre-Louis", achats: 1, avance: 212.4, ventes: 2, encaisse: 96, donne: 0, recu: 0, solde: 116.4 });
  assert.deepEqual(s[1], { nom: "Johan", achats: 2, avance: 175.6, ventes: 2, encaisse: 96, donne: 0, recu: 0, solde: 79.6 },
    "un achat payé par la société et une vente encaissée par la société ne comptent pas dans le solde");
});

test("règlement entre deux associés : la moitié de l'écart", () => {
  assert.deepEqual(A.reglementEntreAssocies(A.soldesAssocies(d(), ["Pierre-Louis", "Johan"])), { de: "Johan", a: "Pierre-Louis", montant: 18.4 });
  assert.equal(A.reglementEntreAssocies([{ nom: "A", solde: 10 }, { nom: "B", solde: 10 }]), null, "à égalité");
  assert.equal(A.reglementEntreAssocies([{ nom: "A", solde: 10 }]), null, "un seul associé");
});

// ---------- Règlements (v5.32, migration 020) ----------
test("remboursement noté : les associés reviennent à égalité", () => {
  const x = { ...d(), reglements: [{ id: "r1", de: "Johan", a: "Pierre-Louis", montant: 18.4, date_reglement: "2026-11-12" }] };
  const s = A.soldesAssocies(x, ["Pierre-Louis", "Johan"]);
  assert.equal(s[0].recu, 18.4);
  assert.equal(s[1].donne, 18.4);
  assert.equal(s[0].solde, 98);
  assert.equal(s[1].solde, 98);
  assert.equal(A.reglementEntreAssocies(s), null);
});

test("versement à la société : l'argent gardé n'est plus dû", () => {
  const x = { depenses: [], ventes: [{ id: "v", paye: true, encaisse_par: "Johan" }], lignes: [{ vente_id: "v", quantite: 2, prix_unitaire: 28 }] };
  const avant = A.soldesAssocies(x, ["Pierre-Louis", "Johan"]);
  assert.deepEqual(A.aVerserALaSociete(avant), [{ nom: "Johan", montant: 56 }]);
  const apres = A.soldesAssocies({ ...x, reglements: [{ de: "Johan", a: "Société", montant: 56 }] }, ["Pierre-Louis", "Johan"]);
  assert.deepEqual(A.aVerserALaSociete(apres), []);
  assert.equal(apres[1].solde, 0);
  const remb = A.soldesAssocies({ ...x, reglements: [{ de: "Société", a: "Pierre-Louis", montant: 20 }] }, ["Pierre-Louis", "Johan"]);
  assert.equal(remb[0].solde, -20, "la société rembourse un associé : il a reçu 20");
});

test("derniers mouvements : achats, ventes encaissées, règlements, du plus récent au plus ancien", () => {
  const x = {
    depenses: [{ id: "d1", libelle: "Pots 500 g", montant: 96, achete_par: "Pierre-Louis", paye_par: "Pierre-Louis", date_depense: "2026-11-02" },
      { id: "d2", libelle: "Candi", montant: 32, paye_par: "Société", date_depense: "2026-11-05" }, { id: "d3", libelle: "Sans info", montant: 5, paye_par: "", date_depense: "2026-11-09" }],
    ventes: [{ id: "v1", client_id: "c", paye: true, encaisse_par: "Johan", date_vente: "2026-11-08" }, { id: "v2", paye: false, encaisse_par: "Johan", date_vente: "2026-11-10" }],
    lignes: [{ vente_id: "v1", quantite: 3, prix_unitaire: 9 }],
    clients: [{ id: "c", nom: "Martine L." }],
    reglements: [{ id: "r", de: "Johan", a: "Pierre-Louis", montant: 54, date_reglement: "2026-11-12", note: "" }],
  };
  const m = A.mouvementsAssocies(x);
  assert.deepEqual(m.map((y) => y.id), ["r", "v1", "d2", "d1"], "sans qui a payé, ou pas encore payé : absent");
  assert.equal(m[0].titre, "Johan a remboursé Pierre-Louis");
  assert.equal(m[1].titre, "Vente à Martine L.");
  assert.equal(m[1].montant, 27);
  assert.equal(m[1].detail, "Argent récolté par Johan");
  assert.equal(m[2].detail, "Achat · payé avec la trésorerie");
  assert.equal(m[3].detail, "Achat de Pierre-Louis · payé avec les fonds propres de Pierre-Louis");
  assert.equal(A.mouvementsAssocies(x, { limite: 2 }).length, 2);
});
