// File d'opérations hors ligne v2 (src/donnees/file.js, IT-09). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as F from "../../src/donnees/file.js";

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("la liste blanche est la même que dans la migration 026", () => {
  const sql = fs.readFileSync(new URL("../../migrations/026-hors-ligne-v2.sql", import.meta.url), "utf8");
  for (const [t, cols] of Object.entries(F.MODIFIABLES)) {
    const m = sql.match(new RegExp(`when '${t}' then array\\[([^\\]]+)\\]`));
    assert.ok(m, "table " + t + " absente de colonnes_modifiables");
    assert.deepEqual(m[1].match(/'([a-z_]+)'/g).map((x) => x.slice(1, -1)), cols, t);
  }
  const s = sql.match(/v_table not in \(([^)]+)\)/)[1].match(/'([a-z_]+)'/g).map((x) => x.slice(1, -1));
  assert.deepEqual(s, F.SUPPRIMABLES);
});

test("reprise de la file v1 : format 2, contenu intact, colonie avant sa visite", () => {
  const colonie = { id: "q1", cree: 1, type: "insert", table: "ruches", lignes: [{ id: U(1), nom: "Essaim" }] };
  const visite = { id: "q2", cree: 2, type: "rpc", nom: "creer_visite", args: { p: { id: U(2), ruche_id: U(1) } }, statut: "quarantaine", erreur: "x" };
  const v1 = [colonie, visite];
  const v2 = v1.map((it) => F.reprendre(it, v1));
  assert.equal(v2[0].v, 2); assert.equal(v2[0].op, "creer"); assert.deepEqual(v2[0].depend_de, []);
  assert.deepEqual(v2[1].depend_de, ["q1"]);
  assert.equal(v2[1].statut, "quarantaine", "la quarantaine est gardée");
  assert.deepEqual(v2[1].args, visite.args);
  assert.equal(F.reprendre(v2[1], v1), v2[1], "une opération déjà au format 2 n'est pas touchée");
});

test("dépendances : la visite attend la colonie tant qu'elle est dans la file", () => {
  const colonie = { id: "q1", cree: 1, type: "insert", table: "ruches", lignes: [{ id: U(1) }] };
  const visite = { id: "q2", cree: 2, type: "rpc", nom: "creer_visite", args: { p: { id: U(2), ruche_id: U(1) } } };
  visite.depend_de = F.dependances(visite, [colonie]);
  assert.equal(F.bloquante(visite, [colonie, visite])?.id, "q1");
  assert.equal(F.bloquante(visite, [visite]), null, "colonie envoyée : la visite peut partir");
  assert.deepEqual(F.crees(visite), [U(2)]);
  assert.deepEqual(F.references(visite), [U(1)], "la visite cite sa colonie, pas elle-même");
});

test("modification : valeurs « avant » et version gardées, fusion de deux corrections", () => {
  const objet = { id: U(5), poids_kg: 30, note: "a", modifie_le: "2026-11-16T10:00:00+00:00" };
  const m1 = F.modification({ table: "visites", id: U(5), champs: { poids_kg: "31.5" }, objet });
  assert.deepEqual(m1.args.p, { table: "visites", id: U(5), champs: { poids_kg: "31.5" }, avant: { poids_kg: 30 }, version: objet.modifie_le });
  m1.id = "m1";
  const vu = { ...objet, poids_kg: "31.5" }; // affiché après la 1re correction
  const m2 = F.modification({ table: "visites", id: U(5), champs: { poids_kg: "32", note: "b", varroa: "" }, objet: vu, existante: m1 });
  assert.equal(m2.id, "m1", "même opération");
  assert.deepEqual(m2.args.p.avant, { poids_kg: 30, note: "a" }, "on garde ce qu'on avait vu avant la 1re correction");
  assert.deepEqual(m2.args.p.champs, { poids_kg: "32", note: "b", varroa: null }, "champ nombre vide : null");
  assert.equal(m2.args.p.version, objet.modifie_le);
});

test("modifiable : liste blanche", () => {
  assert.ok(F.modifiable("visites", { poids_kg: 3 }));
  assert.ok(!F.modifiable("visites", { ruche_id: "x" }));
  assert.ok(!F.modifiable("clients", { nom: "x" }));
  assert.ok(!F.modifiable("visites", {}));
});

test("création en attente : la correction part avec elle", () => {
  const c = { id: "q", type: "rpc", nom: "creer_visite", args: { p: { id: U(9), poids_kg: 1 } } };
  assert.equal(F.creationDe([c], "visites", U(9)), c);
  assert.equal(F.creationDe([c], "recoltes", U(9)), null);
  assert.equal(F.corrigerCreation(c, U(9), { poids_kg: 2 }).args.p.poids_kg, 2);
  assert.equal(c.args.p.poids_kg, 1, "l'opération d'origine n'est pas modifiée en place");
  const r = { id: "r", type: "insert", table: "recoltes", lignes: [{ id: U(3), kg: 4 }] };
  assert.equal(F.corrigerCreation(r, U(3), { kg: 5 }).lignes[0].kg, 5);
});

test("affichage : modification et suppression en attente", () => {
  const d = { visites: [{ id: "V", poids_kg: 1 }, { id: "W" }], intrants: [{ visite_id: "W", article_id: "A", quantite: 2 }],
    articles: [{ id: "A", stock: 3 }], ruches: [{ id: "R", hausses: 0 }], ruchesSorties: [] };
  F.appliquerOperation(d, F.modification({ table: "visites", id: "V", champs: { poids_kg: 9 }, objet: d.visites[0] }));
  assert.equal(d.visites[0].poids_kg, 9); assert.equal(d.visites[0]._attente, true);
  F.appliquerOperation(d, F.suppression({ table: "visites", id: "W", objet: d.visites[1] }));
  assert.deepEqual(d.visites.map((v) => v.id), ["V"]);
  assert.equal(d.articles[0].stock, 5, "stock rétabli à l'affichage");
  assert.equal(d.intrants.length, 0);
  F.appliquerOperation(d, F.modification({ table: "ruches", id: "R", champs: { hausses: 2 }, objet: d.ruches[0] }));
  assert.equal(d.ruches[0].hausses, 2);
});

test("compteurs par exploitation et phrase du menu du compte", () => {
  const file = [{ ex: "A" }, { ex: "B" }, { ex: "B", statut: "quarantaine" }, { ex: "B", statut: "conflit" }];
  assert.deepEqual(F.compteurs(file), { A: { attente: 1, corriger: 0, conflit: 0 }, B: { attente: 1, corriger: 1, conflit: 1 } });
  const l = F.autresExploitations(file.slice(0, 3), "A", [{ id: "A", nom: "Bee's" }, { id: "B", nom: "Rucher Pro" }]);
  assert.deepEqual(l, [{ id: "B", nom: "Rucher Pro", nb: 2, texte: "2 saisies en attente dans Rucher Pro" }]);
});

test("conflit : deux versions champ par champ, puis choix", () => {
  const it = { id: "m", statut: "conflit", ...F.modification({ table: "visites", id: "V", champs: { note: "Ma note", poids_kg: 32 },
    objet: { note: "vue", poids_kg: 31, modifie_le: "t1" } }) };
  const rep = { statut: "conflit", champs: ["note"], serveur: { note: "Note de Johan", poids_kg: 31, modifie_le: "t2" }, version: "t2" };
  assert.deepEqual(F.versions(it, rep).map((x) => [x.k, x.mien, x.serveur, x.conflit]),
    [["note", "Ma note", "Note de Johan", true], ["poids_kg", 32, 31, false]]);
  const garde = F.resoudre(it, rep, { note: "serveur" });
  assert.deepEqual(garde.args.p.champs, { poids_kg: 32 }, "la note de Johan est gardée, mon poids part");
  assert.equal(garde.args.p.version, "t2"); assert.equal(garde.statut, undefined);
  assert.deepEqual(F.resoudre(it, rep, { note: "mien" }).args.p.champs, { note: "Ma note", poids_kg: 32 });
  const seul = { ...it, args: { p: { ...it.args.p, champs: { note: "Ma note" } } } };
  assert.equal(F.resoudre(seul, rep, { note: "serveur" }), null, "plus rien à envoyer");
  assert.equal(F.valeurLisible("date_visite", "2026-11-17"), "17/11/2026");
  assert.equal(F.valeurLisible("oeufs_vus", false), "Non");
});

test("corriger une visite : seuls les champs changés partent, au format de la base", async () => {
  const { champsCorriges } = await import("../../src/domaines/visites/corriger.js");
  const v = { id: "V", date_visite: "2026-11-16", activite: "Normale", provisions: "Bonnes", reine: "Vue", couvain: "", poids_kg: 30,
    force: null, oeufs_vus: null, cellules_royales: null, varroa: null, note: "" };
  const f = { date_visite: "2026-11-16", activite: "Normale", provisions: "Bonnes", reine: "Vue", couvain: "Non vu", poids_kg: "31,5",
    force: "", oeufs_vus: "", cellules_royales: "", varroa: "", note: "" };
  assert.deepEqual(champsCorriges(v, f), { poids_kg: 31.5 });
  assert.deepEqual(champsCorriges(v, { ...f, poids_kg: "30", force: "4", oeufs_vus: "Non", note: "calme" }), { force: 4, oeufs_vus: false, note: "calme" });
  assert.deepEqual(champsCorriges(v, { ...f, poids_kg: "" }), { poids_kg: null });
  assert.throws(() => champsCorriges(v, { ...f, varroa: "2.5" }), /entier/);
  assert.ok(F.modifiable("visites", champsCorriges(v, { ...f, force: "3", couvain: "Normal" })), "tous ces champs sont dans la liste blanche");
});
