// Règles des ruchers (IT-05). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { cle, nomPropre, nomAffiche, pire, position, rucherDe, rucherParCle, lieux, lienTel, lienItineraire, nomLibre, archivable, infosDepuis } from "../../src/domaines/ruchers/regles.js";

const V = { id: "v", nom: "Verger", lat: 47.4, lng: 5.1 }, B = { id: "b", nom: "Bois du Roi", lat: null, lng: null };

test("noms : espaces en trop et casse", () => {
  assert.equal(nomPropre("  Bois   du  Roi "), "Bois du Roi");
  assert.equal(cle(" VERGER  "), "verger");
  assert.equal(cle(null), "");
  assert.equal(nomAffiche(""), "Sans rucher");
  assert.equal(nomAffiche("  Le  Pré "), "Le Pré");
});

test("pire état", () => {
  assert.equal(pire([]), "Bonne");
  assert.equal(pire([{ etat: "Bonne" }, { etat: "À surveiller" }]), "À surveiller");
  assert.equal(pire([{ etat: "Critique" }, { etat: "À surveiller" }, { etat: "Bonne" }]), "Critique");
});

test("position : celle du rucher, sinon la moyenne des colonies placées", () => {
  assert.deepEqual(position(V, [{ lat: 1, lng: 1 }]), { lat: 47.4, lng: 5.1 });
  assert.deepEqual(position(B, [{ lat: 47.3, lng: 5 }, { lat: 47.5, lng: 5.2 }, { lat: null, lng: null }]), { lat: 47.4, lng: 5.1 });
  assert.deepEqual(position(null, [{ lat: 47.333, lng: 5.016 }], 2), { lat: 47.33, lng: 5.02 }, "2 décimales pour la météo");
  assert.equal(position(B, []), null);
});

test("rucher d'une colonie : par rucher_id, sinon par le texte", () => {
  assert.equal(rucherDe([V, B], { rucher_id: "b", rucher: "Verger" }), B);
  assert.equal(rucherDe([V, B], { rucher: " verger " }), V);
  assert.equal(rucherDe([V, B], { rucher: "" }), null);
  assert.equal(rucherDe([], { rucher: "Verger" }), null, "base sans 015");
  assert.equal(rucherParCle([V, B], "bois du roi"), B);
});

test("lieux : table, ruchers vides, repli sur le texte, Sans rucher, tri", () => {
  const rs = [
    { id: 1, rucher_id: "v", rucher: "Verger", etat: "Bonne" }, { id: 2, rucher: "verger", etat: "Critique" },
    { id: 3, rucher: "", etat: "Bonne" }, { id: 4, rucher: "Les Prés", etat: "À surveiller", lat: 46, lng: 4 },
  ];
  const l = lieux([V, B, { id: "z", nom: "Archivé", archive_le: "2026-11-06" }], rs);
  assert.deepEqual(l.map((x) => x.nom), ["Bois du Roi", "Les Prés", "Verger", "Sans rucher"]);
  const v = l.find((x) => x.id === "v");
  assert.equal(v.rs.length, 2, "colonie rattachée par le texte (autre casse)");
  assert.equal(v.etat, "Critique");
  assert.deepEqual([v.lat, v.lng], [47.4, 5.1]);
  assert.equal(l.find((x) => x.id === "b").rs.length, 0, "rucher sans colonie affiché");
  const pres = l.find((x) => x.nom === "Les Prés");
  assert.equal(pres.id, null, "rucher connu seulement par le texte");
  assert.deepEqual([pres.lat, pres.lng], [46, 4]);
  assert.equal(l.at(-1).cle, "", "« Sans rucher » à la fin, clé vide");
  assert.equal(lieux([V, { id: "z", nom: "Archivé", archive_le: "x" }], [], { archives: true }).length, 2);
  const seul = lieux([], [{ id: 1, rucher: "Verger", etat: "Bonne" }, { id: 2, rucher: " verger", etat: "Bonne" }]);
  assert.equal(seul.length, 1, "sans la table : variantes regroupées");
});

test("liens : appel et itinéraire", () => {
  assert.equal(lienTel("06 12 34 56 78"), "tel:0612345678");
  assert.equal(lienTel("+33 6 12-34-56-78"), "tel:+33612345678");
  assert.equal(lienTel(""), null);
  assert.equal(lienTel("n/a"), null);
  assert.equal(lienItineraire({ lat: 47.4, lng: 5.1 }), "https://www.google.com/maps/dir/?api=1&destination=47.4,5.1");
  assert.equal(lienItineraire(null), null);
});

test("nom libre, archivage, infos", () => {
  assert.equal(nomLibre([V, B], " VERGER"), false);
  assert.equal(nomLibre([V, B], "verger", "v"), true, "renommer en changeant la casse");
  assert.equal(nomLibre([V, B], "  "), false);
  assert.equal(archivable([]), true);
  assert.equal(archivable([{ sortie: "Morte" }]), true, "colonies sorties : archivable");
  assert.equal(archivable([{ sortie: "" }]), false);
  const i = infosDepuis({ acces: " Portail 1234 ", capacite: "12", proprietaire_tel: "06" });
  assert.equal(i.acces, "Portail 1234");
  assert.equal(i.capacite, 12);
  assert.equal(i.notes, "");
  assert.equal(infosDepuis({ capacite: "" }).capacite, null);
});
