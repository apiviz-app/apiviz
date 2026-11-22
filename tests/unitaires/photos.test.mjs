// Règles des photos (IT-11) : HEIC, chemins, rattachement, espace et alerte à 80 %, nettoyage de nuit.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../src/domaines/photos/regles.js";
import * as N from "../../supabase/functions/nettoyer-stockage/regles.js";

const Mo = 1048576;
const E = "11111111-1111-4111-8111-111111111111", E2 = "22222222-2222-4222-8222-222222222222";

test("HEIC reconnu par le type ou, à défaut, par le nom", () => {
  assert.ok(P.estHeic({ type: "image/heic", name: "IMG_1.HEIC" }));
  assert.ok(P.estHeic({ type: "image/heif" }));
  assert.ok(P.estHeic({ type: "", name: "IMG_2.heic" })); // Android ne donne pas toujours le type
  assert.ok(!P.estHeic({ type: "image/jpeg", name: "IMG_3.jpg" }));
  assert.ok(!P.estHeic(null));
});

test("message de repli clair pour une HEIC illisible, générique sinon (AP-TECH-164)", () => {
  const m = P.messageIllisible({ type: "image/heic" });
  assert.match(m, /HEIC/);
  assert.match(m, /Prendre une photo/);
  assert.match(m, /Le plus compatible/);
  assert.equal(P.messageIllisible({ type: "image/jpeg" }), "Cette photo n’a pas pu être lue. Essaie d’en prendre une nouvelle.");
});

test("chemin : dossier de l'exploitation, puis visite, colonie ou rucher", () => {
  assert.equal(P.chemin({ ex: E, id: "p", visite_id: "v" }), `${E}/v/p.jpg`); // comme avant IT-11
  assert.equal(P.chemin({ ex: E, id: "p", visite_id: "v", colonie_id: "c" }), `${E}/v/p.jpg`);
  assert.equal(P.chemin({ ex: E, id: "p", colonie_id: "c" }), `${E}/colonies/c/p.jpg`);
  assert.equal(P.chemin({ ex: E, id: "p", rucher_id: "r" }), `${E}/ruchers/r/p.jpg`);
  assert.equal(P.chemin({ id: "p", visite_id: "v" }), "v/p.jpg");
  assert.throws(() => P.chemin({ ex: E, id: "p" }), /visite, une colonie ou un rucher/);
});

test("rattachement Visite / Colonie / Rucher (AP-TECH-165)", () => {
  const ruche = { id: "c1", rucher_id: "r1" };
  assert.deepEqual(P.fiches("visite", "v1", ruche), { visite_id: "v1", colonie_id: null, rucher_id: null });
  assert.deepEqual(P.fiches("colonie", "v1", ruche), { visite_id: "v1", colonie_id: "c1", rucher_id: null });
  assert.deepEqual(P.fiches("rucher", "v1", ruche), { visite_id: "v1", colonie_id: null, rucher_id: "r1" });
  assert.deepEqual(P.fiches("rucher", "v1", { id: "c2" }), { visite_id: "v1", colonie_id: null, rucher_id: null }, "colonie sans rucher : la visite seule");
  assert.deepEqual(P.fiches("bidon", "v1", ruche), { visite_id: "v1", colonie_id: null, rucher_id: null });
});

test("photos d'une fiche : les siennes d'abord, les plus récentes en tête", () => {
  const ph = [{ id: 1, colonie_id: "c", created_at: "2026-10-01" }, { id: 2, colonie_id: "c", created_at: "2026-11-01" },
    { id: 3, visite_id: "v", colonie_id: null }, { id: 4, rucher_id: "r" }];
  const c = P.photosDe(ph, "colonie", "c", ["v"]);
  assert.deepEqual(c.propres.map((p) => p.id), [2, 1]);
  assert.deepEqual(c.deVisites.map((p) => p.id), [3]);
  assert.deepEqual(P.photosDe(ph, "rucher", "r").propres.map((p) => p.id), [4]);
});

test("espace : restant, taille moyenne et nombre de photos qui tiennent encore (AP-US-054)", () => {
  const e = P.espace(820 * Mo, { nbPhotos: 100, octetsPhotos: 100 * 290 * 1024 });
  assert.equal(e.restant, 1024 * Mo - 820 * Mo);
  assert.equal(e.moyenne, 290 * 1024);
  assert.equal(e.pourcent, 80);
  assert.ok(e.alerte && !e.plein);
  assert.equal(e.photosRestantes, Math.floor((204 * Mo) / (290 * 1024)));
  assert.equal(P.espace(0).moyenne, P.MOYENNE_PAR_DEFAUT, "sans photo : moyenne par défaut");
});

test("alerte à 80 % du quota, pas avant (fiche IT-11 §11)", () => {
  assert.ok(!P.espace(Math.floor(0.79 * P.QUOTA)).alerte);
  assert.ok(P.espace(Math.ceil(0.8 * P.QUOTA)).alerte);
  assert.ok(!P.espace(800 * Mo).alerte, "800 Mo sur 1 Go = 78 % : pas encore d'alerte");
  assert.ok(P.espace(P.QUOTA).plein && P.espace(P.QUOTA + 1).plein);
  assert.equal(P.espace(P.QUOTA * 2).restant, 0);
});

test("avertissement des Réglages : espace restant et taille moyenne d'une photo", () => {
  const t = P.avertissement(P.espace(820 * Mo, { nbPhotos: 10, octetsPhotos: 10 * 290 * 1024 }));
  assert.equal(t, "Il reste 204 Mo d’espace photos, soit environ 700 photos. Une photo fait en moyenne 290 Ko.");
  assert.equal(P.avertissement(P.espace(100 * Mo)), "", "sous 80 % : rien");
  assert.match(P.avertissement(P.espace(P.QUOTA)), /plein/);
});

test("octets et arrondis lisibles", () => {
  assert.equal(P.octets(380 * 1024), "380 Ko");
  assert.equal(P.octets(4.2 * Mo), "4,2 Mo");
  assert.equal(P.octets(204 * Mo), "204 Mo");
  assert.equal(P.octets(P.QUOTA), "1 Go");
  assert.equal(P.environ(12), "12");
  assert.equal(P.environ(57), "environ 60");
  assert.equal(P.environ(718), "environ 700");
  assert.match(P.environ(3456), /^environ 3\s500$/); // espace insécable de fr-FR
});

test("journal : libellé d'un passage", () => {
  assert.equal(P.libellePassage({ statut: "fait", fichiers: 12, octets: 48 * Mo }), "12 fichiers sans fiche retirés, 48 Mo libérés.");
  assert.equal(P.libellePassage({ statut: "fait", fichiers: 1, octets: 4 * Mo }), "1 fichier sans fiche retiré, 4 Mo libérés.");
  assert.match(P.libellePassage({ statut: "rien", fichiers: 0 }), /Rien à retirer/);
  assert.match(P.libellePassage({ statut: "echec" }), /Rien n’a été retiré/);
  assert.match(P.libellePassage({ statut: "simule", fichiers: 2, octets: Mo }), /essai/);
});

test("nettoyage : seule une clé assez longue et exacte ouvre la fonction", () => {
  const cle = "x".repeat(32);
  assert.ok(N.autorise("Bearer " + cle, cle));
  assert.ok(!N.autorise("Bearer " + cle + "y", cle));
  assert.ok(!N.autorise("Bearer " + "y".repeat(32), cle));
  assert.ok(!N.autorise("Bearer ", ""), "clé absente : refus");
  assert.ok(!N.autorise("Bearer court", "court"), "clé trop courte : refus");
  assert.ok(!N.autorise(null, cle));
});

test("nettoyage : coupure, délai borné", () => {
  assert.ok(N.actif(undefined) && N.actif("oui") && !N.actif("non") && !N.actif(" NON "));
  assert.equal(N.delai(undefined), 7);
  assert.equal(N.delai(0), 7);
  assert.equal(N.delai(3), 3);
  assert.equal(N.delai(9999), 365);
});

test("nettoyage : seuls les chemins rangés sous leur exploitation sont retenus", () => {
  const g = N.parExploitation([
    { exploitation_id: E, chemin: `${E}/a.jpg`, octets: 100 },
    { exploitation_id: E, chemin: `${E}/colonies/c/b.jpg`, octets: 50 },
    { exploitation_id: E, chemin: `${E2}/vole.jpg`, octets: 10 }, // dossier d'une autre exploitation : refusé
    { exploitation_id: E, chemin: `${E}/../${E2}/x.jpg`, octets: 10 },
    { exploitation_id: "pas-un-uuid", chemin: "pas-un-uuid/x.jpg" },
    { exploitation_id: E2, chemin: `${E2}/c.jpg`, octets: 7 },
  ]);
  assert.deepEqual([...g.keys()].sort(), [E, E2].sort());
  assert.deepEqual(g.get(E).chemins, [`${E}/a.jpg`, `${E}/colonies/c/b.jpg`]);
  assert.equal(g.get(E).octets, 150);
});

test("nettoyage : lots de 100, une ligne de journal par exploitation, résumé sans chemin", () => {
  assert.deepEqual(N.lots([...Array(250).keys()]).map((l) => l.length), [100, 100, 50]);
  const res = new Map([[E, { fichiers: 3, octets: 3000 }], [E2, { fichiers: 0, octets: 0, erreur: "Le stockage n’a pas répondu." }]]);
  const E3 = "33333333-3333-4333-8333-333333333333";
  const l = N.lignesJournal([E, E2, E3], res);
  assert.deepEqual(l.map((x) => x.statut), ["fait", "echec", "rien"]);
  assert.equal(N.lignesJournal([E], res, { simuler: true })[0].statut, "simule");
  assert.deepEqual(N.resume(l), { exploitations: 3, fichiers: 3, octets: 3000, echecs: 1 });
  assert.ok(!JSON.stringify(N.resume(l)).includes("/"));
});
