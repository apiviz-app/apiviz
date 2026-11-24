// D'un pot à ses ruches (v5.83). src/domaines/production/tracabilite.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../../src/domaines/production/tracabilite.js";

const lot = { id: "L", code: "P26-02", extraction: "EX1", pots_initiaux: 84, pots_restants: 23, miel: "Printemps", format_g: 250 };
const d = {
  ruches: [{ id: "v1", nom: "V1", rucher: "Verger" }, { id: "v2", nom: "V2", rucher: "Verger" }, { id: "c1", nom: "C1", rucher: "Combes" }],
  ruchesSorties: [{ id: "v7", nom: "V7", rucher: "Verger", sortie: "Morte" }],
  recoltes: [{ ruche_id: "v1", extraction: "EX1", date_recolte: "2026-06-12", kg: 8 }, { ruche_id: "v7", extraction: "EX1", date_recolte: "2026-06-12", kg: 7 },
    { ruche_id: "v2", extraction: "EX1", date_recolte: "2026-06-14", kg: 6 }, { ruche_id: "c1", extraction: "EX2", date_recolte: "2026-06-14", kg: 9 }],
  visites: [
    { ruche_id: "v1", date_visite: "2026-03-03", traitement: "Acide oxalique" },
    { ruche_id: "v2", date_visite: "2026-05-01", traitement: "" },
    { ruche_id: "c1", date_visite: "2026-05-10", traitement: "Lanières" },
  ],
  clients: [{ id: "m", nom: "Martine Roux", telephone: "06 12 34 56 78", email: "m@x.fr" }, { id: "p", nom: "Paul", telephone: "" }, { id: "z", nom: "Vente au marché" }],
  ventes: [{ id: "a", client_id: "m" }, { id: "b", client_id: "p" }, { id: "c", client_id: "z" }, { id: "e", client_id: "m" }],
  lignes: [{ vente_id: "a", lot_id: "L", quantite: 4 }, { vente_id: "b", lot_id: "L", quantite: 2 }, { vente_id: "c", lot_id: "L", quantite: 23 }, { vente_id: "e", lot_id: "L", quantite: 1 }, { vente_id: "e", lot_id: "X", quantite: 9 }],
};

test("lien du pot : court, lu par le scanner", () => {
  const l = T.lienLot("https://app.apiviz.fr/index.html?x=1#y", "P26-02");
  assert.equal(l, "https://app.apiviz.fr/index.html?lot=P26-02");
  assert.deepEqual(T.lireLienLot(l), { code: "P26-02" });
  assert.equal(T.lireLienLot("https://app.apiviz.fr/?c=K7M2"), null);
  assert.equal(T.lireLienLot("pas un lien"), null);
  assert.equal(T.trouverLot([lot], "p26-02"), lot);
});

test("origine : colonies (sorties comprises), ruchers, kilos, dates", () => {
  const o = T.origine(d, lot);
  assert.deepEqual(o.ruches, ["V1", "V7", "V2"]);
  assert.deepEqual(o.ruchers, ["Verger"]);
  assert.equal(o.kg, 21);
  assert.equal(o.premiere, "2026-06-12");
  assert.equal(o.derniere, "2026-06-14");
});

test("traitements pendant la miellée : aucun, le dernier avant est donné", () => {
  const t = T.traitementsMiellee(d, T.origine(d, lot));
  assert.equal(t.connu, true);
  assert.deepEqual(t.pendant, []);
  assert.deepEqual(t.dernier, { ruche: "V1", date: "2026-03-03", produit: "Acide oxalique" });
  assert.equal(T.phraseTraitements(t), "Aucun traitement noté pendant la miellée (dernier : 2026-03-03, Acide oxalique).");
  const d2 = { ...d, visites: [...d.visites, { ruche_id: "v2", date_visite: "2026-05-20", traitement: "Thymol" }] };
  const t2 = T.traitementsMiellee(d2, T.origine(d2, lot));
  assert.equal(t2.pendant.length, 1);
  assert.match(T.phraseTraitements(t2), /^1 traitement noté pendant la miellée : V2 le 2026-05-20 \(Thymol\)\. À vérifier/);
  assert.equal(T.traitementsMiellee(d, T.origine(d, { ...lot, extraction: "" })).connu, false);
});

test("à prévenir : clients nommés, pots sans nom, stock, téléphones et e-mails", () => {
  const p = T.aPrevenir(d, lot);
  assert.deepEqual(p.connus.map((x) => [x.client.nom, x.quantite]), [["Martine Roux", 5], ["Paul", 2]]);
  assert.equal(p.anonymes, 23);
  assert.equal(p.vendus, 30);
  assert.equal(p.stock, 23);
  assert.deepEqual(p.telephones, ["0612345678"]);
  assert.deepEqual(p.emails, ["m@x.fr"]);
});

test("message aux clients : vouvoiement, lot, exploitation", () => {
  const m = T.message("Bee's Brothers", lot, "du miel de printemps");
  assert.match(m, /^Bonjour, vous avez acheté du miel de printemps \(lot P26-02\) chez Bee's Brothers\. Par précaution/);
  assert.ok(!/\btu\b|\bton\b/.test(m));
});
