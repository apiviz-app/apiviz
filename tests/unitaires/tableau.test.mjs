// Tableau des colonies (src/domaines/colonies/tableau.js, v5.36). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../../src/domaines/colonies/tableau.js";

const AUJ = new Date("2026-11-13T12:00:00");
const v = (ruche_id, date_visite, extra = {}) => ({ id: ruche_id + date_visite, ruche_id, date_visite, activite: "Normale", provisions: "Moyennes", reine: "Vue", varroa: null, ...extra });
const donnees = () => ({
  ruchers: [{ id: "C", nom: "Les Chênes" }, { id: "L", nom: "Bord du Lot" }],
  ruches: [
    { id: "a", nom: "Acacia", code: "C-01", rucher_id: "C", etat: "Bonne", statut: "active", sortie: "", annee_reine: 2025 },
    { id: "b", nom: "Bruyère", code: "C-02", rucher_id: "C", etat: "Bonne", statut: "orpheline", sortie: "", annee_reine: 2024 },
    { id: "c", nom: "Châtaigne", rucher_id: "L", etat: "À surveiller", statut: "active", sortie: "", annee_reine: null },
    { id: "d", nom: "Ruche 10", rucher: "Pré", etat: "Bonne", statut: "active", sortie: "", annee_reine: 2026 },
    { id: "e", nom: "Ruche 9", rucher_id: "L", etat: "Critique", statut: "active", sortie: "" },
    { id: "m", nom: "Morte", rucher_id: "L", etat: "Bonne", statut: "morte", sortie: "Morte" },
  ],
  visites: [
    v("a", "2026-11-07", { activite: "Forte", provisions: "Bonnes", varroa: 3, varroa_abeilles: 300, varroa_methode: "Sucre glace", poids_kg: 38 }),
    v("a", "2026-10-01", { varroa: 30, varroa_abeilles: 300, varroa_methode: "Sucre glace" }),
    v("b", "2026-11-04", { activite: "Faible", provisions: "Faibles" }),
    v("c", "2026-11-01", { varroa: 10, varroa_abeilles: 200, varroa_methode: "Sucre glace" }),
    v("d", "2026-09-01", { varroa: 12, varroa_methode: "Lange" }),
  ],
  reines: [],
});

test("une ligne par colonie active, rucher par la table puis par le nom noté", () => {
  const ls = T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ });
  assert.deepEqual(ls.map((l) => l.id), ["a", "b", "c", "d", "e"], "la colonie morte n'est pas dans le tableau");
  assert.equal(ls[0].rucher, "Les Chênes");
  assert.equal(ls[3].rucher, "Pré", "base sans rucher_id : le nom noté");
});

test("dernière visite : force, provisions, poids, jours ; varroa du dernier comptage", () => {
  const [a, , c, d, e] = T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ });
  assert.equal(a.force, "Forte"); assert.equal(a.provisions, "Bonnes"); assert.equal(a.poids, 38); assert.equal(a.jours, 6);
  assert.equal(a.varroa, 1, "3 varroas pour 300 abeilles = 1 %, pas le comptage d'octobre");
  assert.equal(c.varroa, 5);
  assert.equal(d.varroa, null); assert.equal(d.varroaBrut, 12, "méthode Lange : pas de taux, le nombre compté");
  assert.equal(e.jours, null); assert.equal(e.force, null); assert.equal(e.provisions, null, "jamais visitée");
});

test("niveau et raisons : orpheline, critique, varroa, provisions, 30 jours sans visite", () => {
  const [a, b, c, d, e] = T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ });
  assert.equal(a.niveau, "ok"); assert.deepEqual(a.raisons, []);
  assert.equal(b.niveau, "urg"); assert.deepEqual(b.raisons.map((x) => x.texte), ["Orpheline", "Provisions faibles"]);
  assert.equal(b.reine, null, "orpheline : pas de reine en place, même si une année reste notée");
  assert.equal(c.niveau, "urg"); assert.equal(c.raisons[0].texte, "Varroa 5 % (seuil 3 %)");
  assert.equal(c.raisons[1].texte, "État à surveiller");
  assert.equal(d.niveau, "watch"); assert.equal(d.raisons[0].texte, "Pas visitée depuis 73 jours");
  assert.equal(e.niveau, "urg"); assert.equal(e.raisons[0].texte, "État critique");
  const proche = T.lignes(donnees(), { seuil: 6, aujourdhui: AUJ })[2];
  assert.equal(proche.raisons[0].texte, "Varroa 5 % : proche du seuil", "aux deux tiers du seuil, comme ux.js");
  assert.equal(proche.niveau, "watch");
});

test("reine : année et couleur de marquage, absente, non notée", () => {
  const [a, b, c] = T.lignes(donnees(), { aujourdhui: AUJ });
  assert.equal(a.reine, 2025); assert.equal(a.marquage, "bleu");
  assert.equal(T.cleReine(a), "2025"); assert.equal(T.cleReine(b), "absente"); assert.equal(T.cleReine(c), "inconnue");
  assert.equal(T.libelleReine("inconnue"), "Non notée");
});

test("filtres : recherche sans accents, rucher, niveau, reine, seuils", () => {
  const ls = T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ });
  const f = T.filtresVides();
  const ids = (x) => x.map((l) => l.id).join("");
  assert.equal(ids(T.filtrer(ls, f, "bruyere")), "b");
  assert.equal(ids(T.filtrer(ls, f, "c-01")), "a", "par le code");
  assert.equal(ids(T.filtrer(ls, { ...f, ruchers: ["Bord du Lot"] })), "ce");
  assert.equal(ids(T.filtrer(ls, { ...f, niveaux: ["urg"] })), "bce");
  assert.equal(ids(T.filtrer(ls, { ...f, reines: ["absente", "2026"] })), "bd");
  assert.equal(ids(T.filtrer(ls, { ...f, varroa: true })), "c");
  assert.equal(ids(T.filtrer(ls, { ...f, provisions: true })), "b");
  assert.equal(ids(T.filtrer(ls, { ...f, visite: true })), "d");
  assert.equal(ids(T.filtrer(ls, { ...f, ruchers: ["Les Chênes"], niveaux: ["urg"] })), "b", "les filtres se cumulent");
  assert.equal(T.nbFiltres({ ...f, ruchers: ["x"], varroa: true }), 2);
});

test("tri : attention d'abord, sens inversé, valeurs manquantes en fin", () => {
  const ls = T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ });
  const ids = (x) => x.map((l) => l.id).join("");
  assert.equal(ids(T.trier(ls, "niveau")), "bced a".replace(" ", ""), "urgent, puis à surveiller, puis OK ; à égalité par nom");
  assert.equal(ids(T.trier(ls, "varroa")).slice(0, 2), "ca", "plus fort taux d'abord");
  assert.equal(ids(T.trier(ls, "varroa", -1)).slice(0, 2), "ac");
  assert.ok(ids(T.trier(ls, "varroa", -1)).endsWith("e") || ids(T.trier(ls, "varroa", -1)).endsWith("d"), "sans taux : en fin, dans les deux sens");
  assert.equal(ids(T.trier(ls, "nom")), "abcde".replace("de", "ed"), "Ruche 9 avant Ruche 10 (ordre naturel)");
  assert.equal(T.trier(ls, "visite")[0].id, "e", "jamais visitée d'abord");
  assert.equal(T.trier(ls, "force")[0].id, "b", "la plus faible d'abord");
});

test("synthèse et options de filtre", () => {
  const ls = T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ });
  const s = T.synthese(ls);
  assert.equal(s.niveau, "3 urg. · 1 à voir");
  assert.equal(s.reine, "1 absente");
  assert.equal(s.varroa, "moy. 3 %");
  assert.equal(s.visite, "moy. 25 j");
  assert.equal(s.rucher, "3 ruchers");
  assert.equal(T.synthese([]).varroa, "–");
  const o = T.options(ls);
  assert.deepEqual(o.ruchers.map((x) => `${x.v}:${x.n}`), ["Bord du Lot:2", "Les Chênes:2", "Pré:1"]);
  assert.deepEqual(o.reines.map((x) => x.v), ["2026", "2025", "absente", "inconnue"]);
  assert.deepEqual(o.seuils.map((x) => x.n), [1, 1, 1]);
});

test("export : mêmes valeurs qu'à l'écran", () => {
  const { entetes, lignes } = T.exporter(T.lignes(donnees(), { seuil: 3, aujourdhui: AUJ }));
  assert.equal(entetes.length, lignes[0].length);
  assert.deepEqual(lignes[1].slice(0, 6), ["Bruyère", "C-02", "Les Chênes", "Urgent", "Faible", "Absente"]);
  assert.equal(lignes[3][6], "12 varroas");
});
