// Outils de terrain (v5.57) : étiquettes QR, caisse du marché, commandes en ligne. src/domaines/ventes/terrain-regles.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../../src/domaines/ventes/terrain-regles.js";

const R = "3f2b1c4d-0000-4000-8000-00000000abcd", E = "11111111-1111-4111-8111-111111111111";

test("lien d'une ruche : écrit puis relu", () => {
  const l = T.lienRuche("https://app.apiviz.fr/?x=1#a", E, R);
  assert.equal(l, `https://app.apiviz.fr/?ruche=${R}&ex=${E}`);
  assert.deepEqual(T.lireLienRuche(l), { ruche: R, ex: E });
  assert.deepEqual(T.lireLienRuche(R.toUpperCase()), { ruche: R, ex: null });
  assert.equal(T.lireLienRuche("https://exemple.fr/?ruche=abc"), null);
  assert.equal(T.lireLienRuche("bonjour"), null);
});

const lots = [
  { id: "l1", miel: "Printemps", format_g: 500, prix: 10, pots_restants: 2, date_mise_en_pot: "2026-06-01" },
  { id: "l2", miel: "Printemps", format_g: 500, prix: 10, pots_restants: 5, date_mise_en_pot: "2026-07-01" },
  { id: "l3", miel: "Printemps", format_g: 250, prix: 6, pots_restants: 4 },
  { id: "l4", miel: "Été", format_g: 500, prix: 11, pots_restants: 0 },
];

test("caisse : produits regroupés, total, lignes prises dans les lots les plus anciens", () => {
  const p = T.produitsCaisse(lots);
  assert.deepEqual(p.map((x) => [x.nom, x.stock]), [["Printemps 250 g", 4], ["Printemps 500 g", 7], ["Été 500 g", 0]]);
  const k500 = p[1].cle, k250 = p[0].cle;
  assert.equal(T.totalPanier(p, { [k500]: 3, [k250]: 1 }), 36);
  assert.deepEqual(T.lignesVente(p, { [k500]: 3 }).lignes, [{ lot_id: "l1", quantite: 2 }, { lot_id: "l2", quantite: 1 }]);
  assert.equal(T.lignesVente(p, { [k500]: 8 }).manque, "Printemps 500 g");
});

test("caisse : ventes du jour", () => {
  const d = { ventes: [{ id: "v1", client_id: "c", date_vente: "2026-11-17" }, { id: "v2", client_id: "c", date_vente: "2026-11-16" }, { id: "v3", client_id: "x", date_vente: "2026-11-17" }],
    lignes: [{ vente_id: "v1", quantite: 2, prix_unitaire: 10 }, { vente_id: "v2", quantite: 1, prix_unitaire: 6 }] };
  assert.deepEqual(T.ventesDuJour(d, "c", "2026-11-17"), { nb: 1, montant: 20 });
});

test("commandes : lien, rangement, détail, message, retraits", () => {
  assert.equal(T.lienBoutique("https://app.apiviz.fr/recette/index.html", "abc"), "https://app.apiviz.fr/recette/commande.html?b=abc");
  const cs = [{ id: 1, statut: "nouvelle", created_at: "2026-11-17T10:00" }, { id: 2, statut: "nouvelle", created_at: "2026-11-16T10:00" },
    { id: 3, statut: "livree", created_at: "2026-11-15", traitee_le: "2026-11-17" }];
  const r = T.rangerCommandes(cs);
  assert.deepEqual(r.aPreparer.map((c) => c.id), [2, 1]);
  assert.deepEqual(r.traitees.map((c) => c.id), [3]);
  const c = { nom: "Marie Le Goff", retrait: "Samedi matin", lignes: [{ miel: "Printemps", format_g: 500, quantite: 2 }, { miel: "Été", format_g: 250, quantite: 1 }] };
  assert.equal(T.detailCommande(c), "2 × Printemps 500 g · 1 × Été 250 g");
  assert.equal(T.potsCommande(c), 3);
  assert.equal(T.messagePret(c, "Bee's Brothers"), "Bonjour Marie, votre commande de miel (2 × Printemps 500 g · 1 × Été 250 g) est prête : retrait Samedi matin. À bientôt, Bee's Brothers.");
  assert.equal(T.lienSms("06 12 34 56 78", "a b"), "sms:0612345678?body=a%20b");
  const rs = T.lireRetraits("Chez Pierre-Louis : samedi matin\nAu marché\n\n");
  assert.deepEqual(rs, [{ nom: "Chez Pierre-Louis", quand: "samedi matin" }, { nom: "Au marché", quand: "" }]);
  assert.equal(T.ecrireRetraits(rs), "Chez Pierre-Louis : samedi matin\nAu marché");
});
