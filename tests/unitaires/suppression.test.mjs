// Mes données et suppression du compte (v5.88, migration 041, fonction « supprimer-comptes ») : règles pures.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/compte/regles-suppression.js";
import * as F from "../../supabase/functions/supprimer-comptes/regles.js";

test("Mes données : ce qui est gardé", () => {
  const n = R.compter({ ruches: [{ rucher: "Verger" }, { rucher: "Verger" }, { rucher: "Lande", sortie: "Morte" }], visites: [1, 2, 3], visite_photos: [1], recoltes: [1], ventes: [1, 2], depenses: [] },
    { colonies: "1-10", source: "salon", attente: "vendre" });
  assert.deepEqual(n, { colonies: "2 ruches · 1 rucher", visites: "3", photos: "1", gestion: "3", reponses: "3 sur 7" });
});

test("noms des autres membres", () => {
  assert.equal(R.listeNoms(["Marc"]), "Marc");
  assert.equal(R.listeNoms(["Marc", "Léa"]), "Marc et Léa");
  assert.equal(R.listeNoms(["Marc", "Léa", "Paul"]), "Marc, Léa et Paul");
  assert.equal(R.listeNoms([]), "les autres membres");
});

test("ce qui part selon les choix ; « tout » seulement pour un responsable", () => {
  const a = { effacees: [{ id: "e1", nom: "Le Verger", colonies: 6 }], quittees: [{ id: "e2", nom: "La Lande", colonies: 4, role: "responsable" }, { id: "e3", nom: "Les Combes", colonies: 1, role: "membre" }] };
  assert.equal(R.ceQuiPart(a).length, 4);
  assert.match(R.ceQuiPart(a)[3], /^Le Verger : 6 colonies/);
  assert.match(R.ceQuiPart(a, { e2: "tout" }).at(-1), /^La Lande, pour tout le monde : 4 colonies/);
  assert.deepEqual(R.choixEnvoyes(a, { e2: "tout", e3: "tout" }), { e2: "tout", e3: "laisser" });
});

test("dates : dans 30 jours, en toutes lettres", () => {
  assert.equal(R.dans30(new Date("2026-11-24T10:00:00Z")), "2026-12-24");
  assert.equal(R.dateLongue("2026-12-24"), "24 décembre 2026");
  assert.equal(R.dateLongue("2027-01-01T08:00:00Z"), "1er janvier 2027");
  assert.equal(R.dateLongue("n'importe quoi"), "");
});

test("supprimer-comptes : clé partagée et lots par espace", () => {
  const cle = "x".repeat(30);
  assert.equal(F.autorise(`Bearer ${cle}`, cle), true);
  assert.equal(F.autorise(`Bearer ${cle}y`, cle), false);
  assert.equal(F.autorise("Bearer court", "court"), false);
  const f = [...Array.from({ length: 150 }, (_, i) => ({ bucket_id: "photos-visites", name: `e/v/${i}.jpg` })), { bucket_id: "factures", name: "e/f.pdf" }, { name: "sans-espace" }];
  const l = F.lotsParEspace(f);
  assert.deepEqual(l.map((x) => [x.bucket, x.chemins.length]), [["photos-visites", 100], ["photos-visites", 50], ["factures", 1]]);
});
