// Ma saison en un écran (v5.69) : src/domaines/equipe/suivi-saison.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../../src/domaines/equipe/suivi-saison.js";

const R = (id, nom, extra = {}) => ({ id, nom, ...extra });
const base = () => ({
  ruches: [R("a", "Ruche 1", { hausses: 2 }), R("b", "Ruche 2"), R("c", "Ruche 3", { hausses: 1 })],
  ruchesSorties: [R("z", "Ruche 6")],
  visites: [
    { ruche_id: "a", date_visite: "2026-03-14", reine: "Vue" },
    { ruche_id: "a", date_visite: "2026-10-02", provisions: "Bonnes", traitement: "Lanières", oeufs_vus: true, varroa: 2, varroa_abeilles: 300 },
    { ruche_id: "b", date_visite: "2026-09-20", provisions: "Faibles", poids_kg: 24, traitement: "Lanières", couvain: "Normal", varroa: 12, varroa_abeilles: 300 },
    { ruche_id: "c", date_visite: "2026-04-28", cellules_royales: "Operculées" },
    { ruche_id: "a", date_visite: "2025-03-28" },
  ],
  recoltes: [{ date_recolte: "2026-06-12", kg: 96, miel: "Printemps" }, { date_recolte: "2026-08-08", kg: 216 }, { date_recolte: "2025-06-20", kg: 100 }, { date_recolte: "2025-12-01", kg: 168 }],
  evenements: [
    { ruche_id: "a", type: "division", date_evenement: "2026-05-05" },
    { ruche_id: "c", type: "installation", date_evenement: "2026-05-05" },
    { ruche_id: "z", type: "sortie", date_evenement: "2026-08-10", detail: "Morte" },
    { ruche_id: "a", type: "essaimage", date_evenement: "2026-04-29" },
  ],
});

test("phase et place sur la frise", () => {
  assert.equal(V.phaseDe("2026-01-15"), "hiver");
  assert.equal(V.phaseDe("2026-03-02"), "reprise");
  assert.equal(V.phaseDe("2026-05-31"), "developpement");
  assert.equal(V.phaseDe("2026-07-01"), "miellees");
  assert.equal(V.phaseDe("2026-09-30"), "recolte");
  assert.equal(V.phaseDe("2026-11-20"), "preparation");
  assert.equal(V.phaseDe("2026-12-24"), "decembre");
  assert.equal(V.position("2026-01-01"), 0);
  assert.ok(V.position("2026-11-20") > 87 && V.position("2026-11-20") < 89);
});

test("noms lisibles", () => {
  assert.equal(V.noms([R(1, "A")]), "A");
  assert.equal(V.noms([R(1, "A"), R(2, "B")]), "A et B");
  assert.equal(V.noms([R(1, "A"), R(2, "B"), R(3, "C")]), "A, B et C");
  assert.equal(V.noms([R(1, "A"), R(2, "B"), R(3, "C"), R(4, "D")]), "A, B et 2 autres");
});

test("suivi : récolte, comparaison à même date, colonies", () => {
  const S = V.suivi(base(), 2026, "2026-11-20", { objectif_recolte: 350 });
  assert.equal(S.kg, 312);
  assert.equal(S.kgAvant, 268);
  assert.equal(S.kgAvantADate, 100); // la récolte du 1er décembre 2025 n'est pas encore « à même date »
  assert.equal(V.comparaison(S), "212 % de plus qu’en 2025 à la même date");
  assert.deepEqual([S.colonies.actuel, S.colonies.plus, S.colonies.moins, S.colonies.depart], [3, 1, 1, 3]);
  assert.equal(S.colonies.sorties[0].nom, "Ruche 6");
  const b = V.bandeau(S);
  assert.equal(b.oeil, "Saison 2026 · mise en hivernage");
  assert.equal(b.titre, "312 kg récoltés, 89 % de ton objectif");
});

test("varroa, hiver, essaimage, hausses", () => {
  // IT-12 : aucun seuil par défaut ; ici, le seuil de 3 % réglé par l'apiculteur.
  const sans = V.suivi(base(), 2026, "2026-11-20", {});
  assert.equal(sans.varroa.auDessus.length, 0, "sans seuil choisi : aucune colonie « au-dessus »");
  assert.equal(sans.varroa.sansSeuil, 2);
  const S = V.suivi(base(), 2026, "2026-11-20", { varroaSeuil: 3 });
  assert.equal(S.varroa.comptees, 2);
  assert.equal(S.varroa.sous, 1);
  assert.deepEqual(S.varroa.auDessus.map((r) => [r.nom, r.taux]), [["Ruche 2", 4]]);
  assert.deepEqual(S.varroa.sansComptage.map((r) => r.nom), ["Ruche 3"]);
  assert.equal(S.hiver.pretes, 1);
  assert.deepEqual(S.hiver.aRevoir.map((h) => [h.nom, h.raisons]), [
    ["Ruche 2", ["réserves faibles (24 kg)"]],
    ["Ruche 3", ["réserves à vérifier", "pas de traitement noté", "ponte à vérifier"]],
  ]);
  assert.equal(S.essaimage.length, 0); // cellules vues il y a plus de 21 jours
  assert.equal(V.suivi(base(), 2026, "2026-05-10", {}).essaimage[0].nom, "Ruche 3");
  assert.deepEqual([S.hausses.total, S.hausses.ruches.length], [3, 2]);
});

test("le quatrième chiffre suit la phase", () => {
  const q = (j) => V.chiffres(V.suivi(base(), 2026, j, {}))[3].id;
  assert.equal(q("2026-03-10"), "visitees");
  assert.equal(q("2026-05-10"), "essaimage");
  assert.equal(q("2026-07-10"), "hausses");
  assert.equal(q("2026-11-20"), "hiver");
  assert.equal(q("2026-01-20"), "hiver");
  const passe = V.chiffres(V.suivi(base(), 2025, "2026-11-20", {}), { pots: 40, clients: 9 });
  assert.equal(passe[3].id, "ventes");
  assert.equal(passe[3].valeur, "40");
  assert.equal(passe[1].valeur, "+0 −0");
});

test("phrases de la frise : passé tiré des données, futur annoncé", () => {
  const S = V.suivi(base(), 2026, "2026-11-20", {});
  assert.equal(V.textePhase("reprise", S), "Première visite le 14/03, 14 jours plus tôt qu’en 2025.");
  assert.equal(V.textePhase("developpement", S), "1 division, 1 essaimage.");
  assert.equal(V.textePhase("miellees", S), "96 kg récoltés.");
  assert.equal(V.textePhase("recolte", S), "216 kg récoltés, 1 ruche sur 3 traitée.");
  assert.equal(V.textePhase("preparation", S), "En cours : 1 ruche prête sur 3, 2 à revoir.");
  assert.ok(V.textePhase("decembre", S).startsWith("À venir : "));
});

test("priorités d'API : urgentes d'abord, trois au plus, rien pour une saison passée", () => {
  const S = V.suivi(base(), 2026, "2026-11-20", { varroaSeuil: 3 });
  const P = V.priorites(S, { attente: 12.5 });
  assert.equal(P.length, 3);
  assert.equal(P[0].titre, "Traiter ou recompter Ruche 2");
  assert.equal(P[0].ruche_id, "b");
  assert.equal(P[1].titre, "Peser ou nourrir Ruche 2");
  assert.equal(P[2].titre, "Traiter contre le varroa : Ruche 3");
  assert.equal(V.priorites(V.suivi(base(), 2025, "2026-11-20", {})).length, 0);
  const mai = V.priorites(V.suivi(base(), 2026, "2026-05-10", {}));
  assert.ok(mai.some((p) => p.titre === "Repasser à Ruche 3" && p.pourquoi.includes("operculées")));
});

test("aperçus et rubrique du moment", () => {
  const S = V.suivi(base(), 2026, "2026-11-20", { objectif_recolte: 350 });
  const r = V.apercu("recolte", S, { parMiel: [["Printemps", 96]], meilleurRucher: { nom: "Les Combes", kg: 28 } });
  assert.equal(r.pct, 89);
  assert.deepEqual(r.lignes.map((l) => l.k), ["Printemps", "Meilleur rucher", "En 2025", "Objectif"]);
  assert.deepEqual(r.bouton, ["recoltes", "Voir les récoltes"]);
  const h = V.apercu("hiver", S);
  assert.equal(h.lignes[0].ruche, "b");
  assert.equal(V.moment(S), "varroa");
  assert.equal(V.moment(V.suivi(base(), 2026, "2026-06-10", {})), "recoltes");
  assert.equal(V.moment(V.suivi(base(), 2025, "2026-06-10", {})), "msbilan");
});
