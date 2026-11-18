// Tests des règles des ventes et des clients (v5.66) : vitrine, recherche « Pour qui ? », adresses proposées, saison.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/domaines/ventes/clients-regles.js";
import * as R from "../../src/domaines/production/saison.js";

const m250 = { id: "a", code: "L26-02", miel: "Toutes fleurs", format_g: 250, prix: 0, pots_initiaux: 20, pots_restants: 11 };
const m500 = { id: "b", code: "L26-01", miel: "Toutes fleurs", format_g: 500, prix: 12, pots_initiaux: 30, pots_restants: 18 };
const m500b = { id: "c", code: "L26-05", miel: "Toutes fleurs", format_g: 500, prix: 13, pots_initiaux: 10, pots_restants: 10 };
const kilo = { id: "d", code: "L25-04", miel: "Printemps", format_g: 1000, prix: 20, pots_initiaux: 6, pots_restants: 0 };
const hydro = { id: "h", code: "H26-01", categorie: "Hydromel", miel: "Hydromel", unite: "bouteille", format_libelle: "75 cl", format_g: null, prix: 12, pots_initiaux: 10, pots_restants: 10, seuil: 10 };

test("vitrine : un produit par nom et format, le lot le plus ancien vendu d'abord, les épuisés à la fin", () => {
  const v = C.vitrine([kilo, hydro, m500b, m250, m500]);
  assert.deepEqual(v.map((p) => [p.nom, p.format, p.restants]), [["Toutes fleurs", "250 g", 11], ["Toutes fleurs", "500 g", 28], ["Hydromel", "75 cl", 10], ["Printemps", "1 kg", 0]]);
  assert.equal(v[1].lot.id, "b", "500 g : on vend d'abord L26-01");
  assert.deepEqual(v[1].codes, ["L26-01", "L26-05"]);
  assert.equal(v[0].prixAFixer, true);
  assert.equal(v[2].bas, true, "hydromel sous son seuil");
  assert.equal(v[3].epuise, true);
  assert.equal(C.vitrine([kilo, m250], { epuises: 0 }).length, 1, "sans épuisés si demandé");
  assert.equal(C.vitrine([]).length, 0);
});

test("taille du pot dessiné selon le format", () => {
  assert.deepEqual([m250, m500, kilo].map(C.taillePot), ["petit", "moyen", "grand"]);
});

test("initiales", () => {
  assert.equal(C.initiales("Clara Lemoine"), "CL");
  assert.equal(C.initiales("Marie-Anne de la Tour"), "MT");
  assert.equal(C.initiales("Johan"), "JO");
  assert.equal(C.initiales("  "), "?");
});

const d = {
  clients: [
    { id: "1", nom: "Marie Durand", ville: "Angers", telephone: "06 11 11 11 11" },
    { id: "2", nom: "Mathieu Leroy", ville: "Nantes" },
    { id: "3", nom: "Lucie Martin", ville: "Angers" },
    { id: "4", nom: "Émile Zola", ville: "Paris" },
    { id: "5", nom: "Vente au marché" },
  ],
  ventes: [{ id: "v1", client_id: "3", date_vente: "2026-11-02" }, { id: "v2", client_id: "3", date_vente: "2026-10-01" }, { id: "v3", client_id: "2", date_vente: "2026-09-12" }],
};

test("recherche : début du nom, puis début d'un mot, puis ailleurs ; sans accents ; sans le client du marché", () => {
  const noms = (q) => C.chercherClients(d, q, { exclure: ["Vente au marché"] }).map((r) => r.client.nom);
  assert.deepEqual(noms("ma"), ["Marie Durand", "Mathieu Leroy", "Lucie Martin"]);
  assert.deepEqual(noms("emile"), ["Émile Zola"], "sans accent");
  assert.deepEqual(noms("nantes"), ["Mathieu Leroy"], "par la ville");
  assert.deepEqual(noms("0611"), ["Marie Durand"], "par le téléphone, espaces ignorés");
  assert.deepEqual(noms("marché"), [], "le client du marché est exclu");
  assert.deepEqual(noms(""), ["Lucie Martin", "Mathieu Leroy", "Émile Zola", "Marie Durand"], "sans texte : derniers acheteurs, puis l'alphabet");
  const r = C.chercherClients(d, "mar", { exclure: ["Vente au marché"] })[1];
  assert.equal(r.client.nom, "Lucie Martin");
  assert.deepEqual(C.decouper(r.client.nom, r.debut, r.fin), ["Lucie ", "Mar", "tin"]);
  assert.equal(C.chercherClients(d, "luc")[0].achats, 2);
  assert.equal(C.chercherClients(d, "luc")[0].dernier, "2026-11-02");
});

test("adresses connues : 3 lettres, une fois chacune, avec les voisins", () => {
  const cl = [
    { id: "1", nom: "Marie Durand", adresse: "12 rue de la Paix", code_postal: "49000", ville: "Angers" },
    { id: "2", nom: "Paul Durand", adresse: "12 Rue de la paix ", code_postal: "49000", ville: "Angers" },
    { id: "3", nom: "Lucie", adresse: "", ville: "Angers" },
  ];
  assert.deepEqual(C.adressesConnues(cl, "12"), []);
  const a = C.adressesConnues(cl, "12 rue de la p");
  assert.equal(a.length, 1);
  assert.deepEqual(a[0].noms, ["Marie Durand", "Paul Durand"]);
  assert.equal(C.memeAdresse(a[0].noms), "Même adresse que Marie Durand et 1 autre");
  assert.equal(C.adressesConnues(cl, "angers", { sauf: "1" })[0].noms.join(), "Paul Durand", "le client modifié n'est pas proposé à lui-même");
});

test("adresses officielles : adresse de la requête et lecture de la réponse", () => {
  const u = C.urlAdresses("12 rue de la P", { lat: 47.47, lon: -0.55 });
  assert.ok(u.startsWith("https://data.geopf.fr/geocodage/search?q=12+rue+de+la+P&"));
  assert.ok(u.includes("autocomplete=1") && u.includes("lat=47.47") && u.includes("lon=-0.55"));
  assert.ok(!C.urlAdresses("x").includes("lat="), "sans rucher situé : pas de position");
  const json = { features: [
    { properties: { type: "housenumber", name: "12 Rue de la Paix", postcode: "49000", city: "Angers", label: "12 Rue de la Paix 49000 Angers" } },
    { properties: { type: "housenumber", name: "12 Rue de la Paix", postcode: "49000", city: "Angers", label: "doublon" } },
    { properties: { type: "municipality", name: "Paimpol", postcode: "22500", city: "Paimpol" } },
  ] };
  assert.deepEqual(C.lireAdresses(json).map((a) => [a.adresse, a.code_postal, a.ville]), [["12 Rue de la Paix", "49000", "Angers"], ["", "22500", "Paimpol"]]);
  assert.deepEqual(C.lireAdresses(null), []);
  assert.deepEqual(C.centre({ ruchers: [{ lat: null, lng: null }], ruches: [{ lat: 47.1, lng: -1.5 }] }), { lat: 47.1, lon: -1.5 });
});

test("saison : récolté, en pots et vendu de l'année ; miel en attente toutes années", () => {
  const dd = {
    recoltes: [{ id: "r1", kg: 14, date_recolte: "2026-08-30", extraction: "E260830-1", ruche_id: "x" }, { id: "r2", kg: 11, date_recolte: "2026-08-30", extraction: "E260830-1", ruche_id: "y" },
      { id: "r3", kg: 9, date_recolte: "2025-07-10" }],
    lots: [{ ...m500, date_mise_en_pot: "2026-09-01", extraction: "E260830-1", pots_initiaux: 30 }, { ...m250, created_at: "2026-09-02T10:00:00Z" }, { ...kilo, date_mise_en_pot: "2025-07-20" }, hydro],
    ventes: [{ id: "v1", date_vente: "2026-10-01" }, { id: "v2", date_vente: "2025-10-01" }],
    lignes: [{ vente_id: "v1", lot_id: "b", quantite: 4 }, { vente_id: "v1", lot_id: "h", quantite: 2 }, { vente_id: "v2", lot_id: "d", quantite: 1 }],
    ruches: [{ id: "x", nom: "Ruche 1" }, { id: "y", nom: "Ruche 4" }],
  };
  const s = R.saison(dd, 2026);
  assert.deepEqual([s.recolte, s.enPots, s.vendu, s.part], [25, 20, 2, 80]);
  assert.equal(s.attente, 8, "34 kg récoltés en tout, 26 kg mis en pots");
  const ex = R.extractions(dd);
  assert.equal(ex.length, 2);
  assert.deepEqual([ex[0].kg, ex[0].enPots, ex[0].attente, ex[0].lots], [25, 15, 10, ["L26-01"]]);
  assert.equal(R.texteRuches(ex[0]), "Ruche 1 et Ruche 4");
  assert.equal(R.texteRuches(ex[1]), "Tout le rucher");
  assert.deepEqual(R.autresProductions(dd).map((l) => l.code), ["H26-01"]);
  assert.equal(R.saison({ recoltes: [], lots: [] }, 2026).part, 0);
});

test("clients à prévenir et message (vouvoiement : document émis)", () => {
  const cl = { clients: [{ id: "1", nom: "Zoé Petit", prevenir: true }, { id: "2", nom: "Clara Lemoine", prevenir: true }, { id: "3", nom: "Paul", prevenir: false }] };
  assert.deepEqual(R.aPrevenir(cl).map((c) => c.nom), ["Clara Lemoine", "Zoé Petit"]);
  assert.equal(R.aVendre([m250, m500, hydro, kilo]), "miel toutes fleurs 250 g et 500 g, hydromel 75 cl");
  const t = R.messagePrevenir({ nom: "Clara Lemoine" }, [m500], "Bee’s Brothers");
  assert.equal(t, "Bonjour Clara, la nouvelle récolte est prête : miel toutes fleurs 500 g. Dites-moi ce qui vous ferait plaisir, je vous le mets de côté.\nBee’s Brothers");
  assert.ok(!R.messagePrevenir({ nom: "Paul" }, []).includes(" : "), "rien en stock : pas de liste");
});
