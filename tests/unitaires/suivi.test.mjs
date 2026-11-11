// Suivi d'une colonie sur sa fiche (v5.25) : ce qu'API en dit, échelle et variation de la courbe de poids.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../../src/domaines/colonies/suivi.js";

const AUJ = "2026-11-10";
const v = (date, o = {}) => ({ id: date, ruche_id: "r5", date_visite: date, activite: "Normale", provisions: "Moyennes", reine: "Vue", poids_kg: null, varroa: null, ...o });
const r5 = (etat = "Critique") => ({ id: "r5", nom: "Ruche 5", etat, statut: "active", sortie: "" });

test("perte de poids : constat daté, conseil, source", () => {
  const vs = [v("2026-10-07", { poids_kg: 38 }), v("2026-09-12", { poids_kg: 41 }), v("2026-08-20", { poids_kg: 49 })];
  const m = S.messageRuche(r5(), vs, { aujourdhui: AUJ });
  assert.ok(m.phrase.startsWith("Elle a perdu 3 kg depuis le 12 septembre."), m.phrase);
  assert.ok(m.phrase.includes("Pas de visite depuis 34 jours."), "deuxième constat : la colonie critique n'a pas été vue");
  assert.ok(m.phrase.endsWith("Pèse-la de nouveau et donne du candy si elle est légère."), "conseil du premier constat");
  assert.equal(m.source, "D’après 3 pesées et 3 visites de Ruche 5");
  assert.equal(m.ton, "crit");
});

test("varroa au-dessus du seuil passe en premier et renvoie vers le vétérinaire ou le GDS", () => {
  const vs = [v("2026-11-01", { varroa: 12, varroa_abeilles: 300, varroa_methode: "Sucre glace", poids_kg: 40 }), v("2026-10-01", { poids_kg: 42 })];
  const m = S.messageRuche(r5("À surveiller"), vs, { seuil: 3, aujourdhui: AUJ });
  assert.ok(m.phrase.startsWith("Varroa à 4 % le 1er novembre, au-dessus de ton seuil de 3 %."), m.phrase);
  assert.ok(m.phrase.includes("Elle a perdu 2 kg"), "perte en second constat");
  assert.ok(m.phrase.endsWith("Vois le traitement avec ton vétérinaire ou ton GDS."));
  assert.equal(m.ton, "crit", "varroa au-dessus du seuil : ton critique même si la colonie est à surveiller");
});

test("comptage Lange ou incomplet : pas de taux, pas de constat varroa", () => {
  const m = S.messageRuche(r5("Bonne"), [v("2026-11-01", { varroa: 30, varroa_methode: "Lange" })], { aujourdhui: AUJ });
  assert.equal(m, null);
});

test("provisions faibles, reine non vue deux fois", () => {
  const vs = [v("2026-11-01", { provisions: "Faibles", reine: "Non vue" }), v("2026-10-20", { reine: "Non cherchée" }), v("2026-10-01", { reine: "Non vue" })];
  const m = S.messageRuche(r5("À surveiller"), vs, { aujourdhui: AUJ });
  assert.equal(m.phrase, "Provisions faibles le 1er novembre. Reine non vue aux deux dernières visites. Vérifie ses réserves avant les grands froids.");
  assert.equal(m.ton, "watch");
  assert.equal(m.source, "D’après 3 visites de Ruche 5", "une seule pesée ou aucune : pas de pesée dans la source");
});

test("API ne parle pas pour rien : colonie en forme sans signal, colonie sortie", () => {
  assert.equal(S.messageRuche(r5("Bonne"), [v("2026-11-01", { poids_kg: 40 }), v("2026-10-01", { poids_kg: 39.6 })], { aujourdhui: AUJ }), null);
  assert.equal(S.messageRuche({ ...r5(), statut: "morte", sortie: "Morte" }, [v("2026-10-01", { provisions: "Faibles" })], { aujourdhui: AUJ }), null);
  assert.equal(S.messageRuche(null, []), null);
});

test("colonie à surveiller sans signal dans les visites, ou jamais visitée", () => {
  const m = S.messageRuche(r5("À surveiller"), [v("2026-11-01")], { aujourdhui: AUJ });
  assert.ok(m.phrase.startsWith("Notée à surveiller à la dernière visite."), m.phrase);
  const j = S.messageRuche(r5(), [], { aujourdhui: AUJ });
  assert.ok(j.phrase.startsWith("Pas encore de visite notée."), j.phrase);
  assert.equal(j.source, "D’après la fiche de Ruche 5");
});

test("échelle de la courbe : autour des pesées, multiples de 5, au moins 10 kg d'écart", () => {
  assert.deepEqual(S.echellePoids([38, 41, 46, 51, 49]), { bas: 35, haut: 55, pas: 10 });
  assert.deepEqual(S.echellePoids([42, 42.5]), { bas: 40, haut: 50, pas: 5 });
  assert.deepEqual(S.echellePoids([1, 3]), { bas: 0, haut: 10, pas: 5 }, "jamais sous 0 kg");
  assert.deepEqual(S.echellePoids([]), { bas: 0, haut: 10, pas: 5 });
});

test("variation de poids sur la courbe", () => {
  assert.equal(S.resumePoids([v("2026-06-01", { poids_kg: 46 }), v("2026-10-07", { poids_kg: 38 })]), "−8 kg depuis le 1er juin");
  assert.equal(S.resumePoids([v("2026-06-01", { poids_kg: 40 }), v("2026-10-07", { poids_kg: 42.5 })]), "+2,5 kg depuis le 1er juin");
  assert.equal(S.resumePoids([v("2026-06-01", { poids_kg: 40 }), v("2026-10-07", { poids_kg: 40.2 })]), "Stable depuis le 1er juin");
  assert.equal(S.resumePoids([v("2026-06-01", { poids_kg: 40 })]), "");
});
