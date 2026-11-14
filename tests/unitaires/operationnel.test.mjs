// v5.38 — règles des écrans opérationnels : Matériel (puces, groupes, liste de courses, inventaire), profil et
// inscription (migration 021), fichier comptable, clients en tableau, journal des dépenses.
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/materiel/regles.js";
import * as P from "../../src/domaines/compte/regles-profil.js";
import { journalComptable } from "../../src/domaines/finances/regles.js";
import { lignesDepenses, totauxCategories } from "../../src/domaines/finances/depenses-journal.js";

const A = [
  { id: "p", nom: "Pot 250 g vide", famille: "emballage", stock: 40, seuil: 100, valeur: 0.32, fournisseur_id: "f" },
  { id: "c", nom: "Candy", famille: "alimentation", unite: "kg", stock: 4, seuil: 10, valeur: 2.1 },
  { id: "h", nom: "Hausse", famille: "equipement", type: "Équipement", stock: 14, seuil: 0 },
  { id: "k", nom: "Couvercle", famille: "emballage", stock: 180, seuil: 150, fournisseur_id: "f" },
];
const F = [{ id: "f", nom: "Coopérative" }];

test("Matériel : plus d'Opex / Capex à choisir, type et poste déduits de la famille", () => {
  assert.equal(R.typeDeFamille("equipement"), "Équipement");
  assert.equal(R.typeDeFamille("emballage"), "Consommable");
  assert.equal(R.posteDeFamille("emballage"), "Pots & étiquettes");
  assert.equal(R.posteDeFamille("inconnue"), "Autre");
  assert.equal(R.famille({ nom: "Maturateur 50 kg" }), "equipement");
  assert.equal(R.famille({ nom: "Lève-cadres inox" }), "equipement");
  assert.equal(R.famille({ nom: "Cadres Dadant" }), "cire");
});

test("Matériel : puces avec leur nombre, filtre, recherche par nom ou fournisseur", () => {
  assert.deepEqual(R.puces(A).map((p) => [p.k, p.n]), [["tout", 4], ["bas", 2], ["emballage", 2], ["alimentation", 1], ["equipement", 1]]);
  assert.equal(R.groupesEcran(A, "bas").flatMap((g) => g.articles).length, 2);
  assert.deepEqual(R.groupesEcran(A, "tout", "coop", F).flatMap((g) => g.articles.map((a) => a.id)), ["p", "k"]);
  const emb = R.groupesEcran(A).find((g) => g.famille === "emballage");
  assert.deepEqual(emb.articles.map((a) => a.id), ["p", "k"], "à commander en tête");
});

test("Liste de courses : par fournisseur, quantité proposée arrondie, montant estimé, choix gardé", () => {
  assert.equal(R.quantiteProposee(A[0]), 160);
  assert.equal(R.quantiteProposee({ stock: 35, seuil: 100 }), 170);
  assert.equal(R.quantiteProposee(A[1]), 16);
  assert.equal(R.quantiteProposee({ stock: 0, seuil: 3 }), 6);
  const l = R.listeCourses(A, F);
  assert.deepEqual(l.groupes.map((g) => g.nom), ["Coopérative", "Sans fournisseur"]);
  assert.equal(l.groupes[0].total, 51.2);
  assert.equal(l.total, 84.8);
  assert.equal(l.articles, 2);
  assert.equal(R.listeCourses(A, F, { p: 200 }).groupes[0].lignes[0].quantite, 200);
  assert.equal(R.texteCourses(l.groupes[0]), "Commande pour Coopérative :\n- 160 Pot 250 g vide");
});

test("Inventaire : écarts du compté, cases vides ignorées", () => {
  const r = R.ecartsInventaire(A, { p: "35", c: "4", h: "", k: "abc" });
  assert.equal(r.comptes, 2);
  assert.deepEqual(r.ecarts.map((x) => [x.article.id, x.ecart]), [["p", -5]]);
  assert.equal(R.ecartsInventaire(A, { c: "4,5" }).ecarts[0].ecart, 0.5);
});

test("Profil : département et lieu déduits du code postal (Corse, outre-mer)", () => {
  assert.equal(P.departement("33750"), "33");
  assert.equal(P.departement("20090"), "2A");
  assert.equal(P.departement("20200"), "2B");
  assert.equal(P.departement("97400"), "974");
  assert.equal(P.departement("3375"), "");
  assert.equal(P.lieu("33750"), "Gironde");
  assert.equal(P.lieu("97400"), "La Réunion");
  assert.equal(P.lieu(""), "");
});

test("Profil : tout est facultatif, seules les réponses de la liste sont gardées", () => {
  assert.equal(P.controle({}), null);
  assert.equal(P.controle({ code_postal: "123" }), "Le code postal a cinq chiffres.");
  assert.equal(P.controle({ sexe: "licorne" }), "Une réponse n’est pas reconnue.");
  assert.deepEqual(P.reponses({ tranche_age: "35-49", sexe: "x", code_postal: " 33750 ", source: "salon" }),
    { code_postal: "33750", tranche_age: "35-49", sexe: "", anciennete: "", activite: "", colonies: "", source: "salon" });
  assert.equal(P.libelle(P.SOURCES, "syndicat"), "Syndicat ou GDS");
  assert.equal(P.libelle(P.AGES, ""), "");
  assert.deepEqual(P.sansCompte({ associes: [" Jean ", "Société", ""] }), ["Jean"]);
  assert.deepEqual(P.sansCompte({}), []);
});

const D = {
  clients: [{ id: "c1", nom: "Mme Martin" }], fournisseurs: F,
  ventes: [{ id: "v1", client_id: "c1", date_vente: "2026-05-03", paye: true, facture_num: "F-2026-0001" }, { id: "v2", client_id: "c1", date_vente: "2025-12-30", paye: true }],
  lignes: [{ vente_id: "v1", quantite: 3, prix_unitaire: 12 }, { vente_id: "v2", quantite: 1, prix_unitaire: 7 }],
  depenses: [
    { id: "d1", date_depense: "2026-04-01", libelle: "Extracteur", categorie: "Matériel", montant: 420, nature: "Immobilisation", duree_amort: 5, fournisseur_id: "f", piece: "F12", achete_par: "Camille" },
    { id: "d2", date_depense: "2026-06-10", libelle: "Pots", categorie: "Pots & étiquettes", montant: 48, nature: "Consommable", achete_par: "Pierre" },
    { id: "d3", date_depense: "2026-06-11", libelle: "Port", categorie: "Frais", montant: 9.9, nature: "Service" },
  ],
};

test("Fichier comptable : ventes et dépenses de l'année, nature de la dépense, dans l'ordre des dates", () => {
  const j = journalComptable(D, 2026);
  assert.deepEqual(j.map((x) => [x.date, x.type, x.recette, x.depense]), [["2026-04-01", "Dépense", "", 420], ["2026-05-03", "Vente", 36, ""], ["2026-06-10", "Dépense", "", 48], ["2026-06-11", "Dépense", "", 9.9]]);
  assert.equal(j[0].nature, "Équipement amorti");
  assert.equal(j[0].amort, 5);
  assert.equal(j[0].tiers, "Coopérative");
  assert.equal(j[1].libelle, "Facture F-2026-0001");
  assert.equal(j[3].nature, "Service");
});

test("Journal des dépenses : filtres par catégorie, personne, sans facture ; totaux par catégorie", () => {
  assert.deepEqual(lignesDepenses(D, 2026).map((x) => x.id), ["d3", "d2", "d1"]);
  assert.deepEqual(lignesDepenses(D, 2026, "cat:Matériel").map((x) => x.id), ["d1"]);
  assert.deepEqual(lignesDepenses(D, 2026, "par:Pierre").map((x) => x.id), ["d2"]);
  assert.deepEqual(lignesDepenses(D, 2026, "sanspiece").map((x) => x.id), ["d3", "d2"]);
  assert.deepEqual(totauxCategories(D, 2026).map((x) => [x.categorie, x.total]), [["Matériel", 420], ["Pots & étiquettes", 48], ["Frais", 9.9]]);
});
