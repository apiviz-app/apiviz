// Finances › Factures (corrections du 17 nov. 2026) : src/domaines/finances/factures-regles.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as F from "../../src/domaines/finances/factures-regles.js";

const d = {
  fournisseurs: [{ id: "f1", nom: "Magasin apicole" }],
  articles: [{ id: "a1", nom: "Cadres de corps", unite: "unité" }, { id: "a2", nom: "Pots 500 g", unite: "unité" }],
  depenses: [
    { id: "d1", achat_id: "A", piece: "F-2026-123", libelle: "Cadres de corps", montant: 42, date_depense: "2026-11-17", fournisseur_id: "f1", achete_par: "Pierre-Louis", paye_par: "Société", fichier: "e/A/facture.pdf" },
    { id: "d2", achat_id: "A", piece: "F-2026-123", libelle: "Pots 500 g", montant: 50.4, date_depense: "2026-11-17", fournisseur_id: "f1", achete_par: "Pierre-Louis", paye_par: "Société", fichier: "e/A/facture.pdf" },
    { id: "d3", achat_id: "A", piece: "F-2026-123", libelle: "Frais de port", montant: 45, date_depense: "2026-11-17", fournisseur_id: "f1", achete_par: "Pierre-Louis", paye_par: "Société", fichier: "e/A/facture.pdf" },
    { id: "d4", achat_id: "B", piece: "", libelle: "Sirop", montant: 64, date_depense: "2026-11-12", achete_par: "Johan", paye_par: "Johan" },
    { id: "d5", achat_id: null, piece: "", libelle: "Cotisation GDS", montant: 35, date_depense: "2026-10-09", achete_par: "Pierre-Louis", paye_par: "Caisse commune" },
    { id: "d6", achat_id: "C", piece: "", libelle: "Cire", montant: 20, date_depense: "2025-06-01", achete_par: "Johan", paye_par: "" },
  ],
  mouvements: [
    { article_id: "a1", depense_id: "d1", quantite: 20 }, { article_id: "a2", depense_id: "d2", quantite: 48 },
    { article_id: "a2", depense_id: "zz", quantite: -3 },
  ],
};

test("une facture par achat, de la plus récente à la plus ancienne", () => {
  const fs = F.factures(d);
  assert.deepEqual(fs.map((x) => x.cle), ["A", "B", "d5", "C"]);
  const a = fs[0];
  assert.equal(a.titre, "Magasin apicole");
  assert.equal(a.montant, 137.4);
  assert.equal(a.lignes.length, 3);
  assert.equal(a.piece, "F-2026-123");
  assert.equal(a.fichier, "e/A/facture.pdf");
  assert.equal(fs[1].titre, "Sirop", "sans fournisseur, une ligne : son libellé");
  assert.equal(fs[2].paye_par, "Société", "« Caisse commune » de l'ancienne version : la société");
});

test("filtres : année, avancées, acheté par, sans fichier, recherche", () => {
  const fs = F.factures(d);
  assert.equal(F.filtrer(fs, { annee: 2026 }).length, 3);
  assert.deepEqual(F.filtrer(fs, { annee: 2026, f: "avance" }).map((x) => x.cle), ["B"]);
  assert.deepEqual(F.filtrer(fs, { f: "par:Johan" }).map((x) => x.cle), ["B", "C"]);
  assert.deepEqual(F.filtrer(fs, { annee: 2026, f: "sansfichier" }).map((x) => x.cle), ["B", "d5"]);
  assert.deepEqual(F.filtrer(fs, { q: "f-2026" }).map((x) => x.cle), ["A"]);
  assert.deepEqual(F.filtrer(fs, { q: "port" }).map((x) => x.cle), ["A"], "cherche aussi dans les lignes");
});

test("par mois et totaux", () => {
  const fs = F.filtrer(F.factures(d), { annee: 2026 });
  const m = F.parMois(fs);
  assert.deepEqual(m.map((x) => [x.nom, x.total, x.factures.length]), [["Novembre 2026", 201.4, 2], ["Octobre 2026", 35, 1]]);
  assert.deepEqual(F.totaux(fs), { nb: 3, total: 236.4, avance: 64, sansFichier: 2 });
});

test("mouvements de stock de la facture", () => {
  const m = F.mouvementsDe(d, F.factures(d)[0]);
  assert.deepEqual(m.map((x) => [x.nom, x.quantite]), [["Cadres de corps", 20], ["Pots 500 g", 48]]);
});

test("dates en lettres, chemin et contrôle du fichier", () => {
  assert.equal(F.dateLettres("2026-11-17"), "17 novembre");
  assert.equal(F.dateLettres("2026-03-01", true), "1er mars 2026");
  assert.equal(F.moisLettres("2026-08-04"), "Août 2026");
  assert.equal(F.cheminFichier("e1", "A", "Facture Bretagne Apiculture.PDF"), "e1/A/facture-bretagne-apiculture.pdf");
  assert.equal(F.cheminFichier("e1", "A", "", "image/png"), "e1/A/facture.png");
  assert.equal(F.nomFichier("e1/A/facture.pdf"), "facture.pdf");
  assert.equal(F.controleFichier({ type: "application/pdf", size: 1000 }), "");
  assert.match(F.controleFichier({ type: "text/plain", size: 10 }), /PDF/);
  assert.match(F.controleFichier({ type: "image/jpeg", size: 11 * 1024 * 1024 }), /10 Mo/);
});
