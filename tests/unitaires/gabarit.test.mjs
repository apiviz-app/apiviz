// Gabarit d'écran commun (src/noyau/gabarit.js, v5.43) : règles pures. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../../src/noyau/gabarit.js";

test("titre : un nom reste, une phrase passe en résumé sous le titre de l'écran", () => {
  assert.deepEqual(G.titreEtResume("Ruche 5", "Dadant", "Ruche"), { titre: "Ruche 5", resume: "Dadant" });
  assert.deepEqual(G.titreEtResume("Bilan positif de 36 €. Le matériel est à jour.", "Rucher d’exemple", "Gestion"),
    { titre: "Gestion", resume: "Bilan positif de 36 €. Le matériel est à jour · Rucher d’exemple" });
  assert.deepEqual(G.titreEtResume("0 € dépensés en 2026", "", "Dépenses"), { titre: "Dépenses", resume: "0 € dépensés en 2026" });
  assert.deepEqual(G.titreEtResume("2 rappels à voir.", "", "Rappels"), { titre: "Rappels", resume: "2 rappels à voir" });
  assert.equal(G.titreEtResume("Ajoute tes premiers articles.", "", "Matériel").titre, "Matériel");
  assert.equal(G.titreEtResume("", "", "Agenda").titre, "Agenda");
  assert.equal(G.titreEtResume("Lot L26-01", "", "Lot").titre, "Lot L26-01");
});

test("boutons : un seul principal, les autres vont dans ⋯, un ⋯ seul sert tel quel", () => {
  assert.deepEqual(G.trierBoutons([{ principal: false }, { principal: true }, { principal: false }]), { principal: 1, autres: [0, 2], menu: -1 });
  assert.deepEqual(G.trierBoutons([{ principal: true }, { menu: true }]), { principal: 0, autres: [], menu: 1 });
  assert.deepEqual(G.trierBoutons([{}, { garder: true }]), { principal: -1, autres: [0], menu: -1 });
  assert.deepEqual(G.trierBoutons([]), { principal: -1, autres: [], menu: -1 });
  // le premier principal gagne
  assert.equal(G.trierBoutons([{ principal: true }, { principal: true }]).principal, 0);
});

test("retour : jamais au 1er niveau ni dans un flux ; celui de l'écran, sinon le parent connu", () => {
  assert.equal(G.retourDe("compta", { act: "go", v: "plus", texte: "‹ Gestion" }), null);
  assert.equal(G.retourDe("visite", { act: "go", v: "ruches", texte: "‹ Ruchers" }), null);
  assert.deepEqual(G.retourDe("ruche", { act: "go", v: "ruches", texte: "‹ Le Verger" }), { act: "go", v: "ruches", k: "", texte: "Le Verger" });
  assert.deepEqual(G.retourDe("ruche", { act: "go", v: "ruches", texte: "‹ Ruches · Verger" }).texte, "Ruches");
  assert.deepEqual(G.retourDe("lot"), { act: "go", v: "miel", k: "", texte: "Produits" });
  assert.equal(G.retourDe("inconnu"), null);
});

test("années de la puce : uniques, la plus récente d'abord", () => {
  assert.deepEqual(G.annees(["2024", "2026", "2025", "2026", ""]), [2026, 2025, 2024]);
});

test("écrans-sujets : une adresse donne son sujet, ses onglets et l'onglet allumé", () => {
  assert.equal(G.sujetDe("compta").titre, "Finances");
  assert.deepEqual(G.sujetDe("compta").onglets.map(([r]) => r), ["pilotage", "compta", "factures", "previsions", "associes"]);
  assert.equal(G.sujetDe("courses").cle, "materiel");
  assert.equal(G.sujetDe("declaration").titre, "Registre et déclaration");
  assert.equal(G.sujetDe("membres").actif, "membres");
  assert.equal(G.sujetDe("ruche"), null);
  // un onglet de sujet est un écran de 1er niveau : pas de retour
  assert.equal(G.retourDe("courses", { act: "go", v: "materiel", texte: "‹ Matériel" }), null);
});

test("v5.48 : barre d'outils d'un écran-sujet — année, choix de vue, recherche, puces, dans cet ordre", () => {
  const i = (s) => G.OUTILS.indexOf(s);
  assert.ok(i(".g-annee") < i(".subtabs.g-segment") && i(".subtabs.g-segment") < i(".op-barre") && i(".op-barre") < i(".op-puces"));
  assert.ok(G.OUTILS.includes(".er-onglets"));
  // Chaque écran à onglets a son sujet : l'en-tête aligné s'y applique.
  for (const r of ["materiel", "courses", "fournisseurs", "pilotage", "compta", "previsions", "associes", "registre", "declaration", "reglages", "membres"])
    assert.ok(G.sujetDe(r), r);
});

test("v5.50 : Ruchers et Produits (ex-Miel) sont des écrans-sujets ; l'onglet allumé suit l'onglet interne de Miel", () => {
  assert.equal(G.sujetDe("carte").titre, "Ruchers");
  assert.equal(G.sujetDe("clients").titre, "Produits");
  const miel = G.SUJETS.miel;
  assert.equal(G.ongletActif(miel, "clients", "clients"), 1);
  assert.equal(G.ongletActif(miel, "clients", "ventes"), 0);
  assert.equal(G.ongletActif(miel, "clients", "livrer"), 0, "« à livrer » reste sous Ventes");
  assert.equal(G.ongletActif(miel, "miel", undefined), 3);
  assert.equal(G.ongletActif(miel, "commandes", undefined), 2, "Commandes (v5.57) entre Clients et Stock");
  assert.equal(G.ongletActif(G.SUJETS.materiel, "courses"), 1);
  assert.equal(G.ongletActif(G.SUJETS.materiel, "agenda"), -1);
});
