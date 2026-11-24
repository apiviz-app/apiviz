// Mieux connaître ses utilisateurs (v5.86, migration 039) : carte à J+14, questions, rubriques, tableau de bord.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../src/domaines/compte/regles-mieux.js";
import * as P from "../../src/domaines/compte/regles-profil.js";

const J = (n) => new Date(Date.UTC(2026, 11, 8) - n * 864e5).toISOString();
const MAINTENANT = new Date(Date.UTC(2026, 11, 8));

test("carte : 14 jours après l'inscription, tant qu'une question manque", () => {
  const p = { inscription_finie: J(14), anciennete: "", activite: "", tranche_age: "", attente: "" };
  assert.equal(R.carteDue({ profil: p, maintenant: MAINTENANT }), true);
  assert.equal(R.carteDue({ profil: { ...p, inscription_finie: J(13) }, maintenant: MAINTENANT }), false, "trop tôt");
  assert.equal(R.carteDue({ profil: { ...p, mieux_connaitre_fin: J(1) }, maintenant: MAINTENANT }), false, "finie dans le compte");
  assert.equal(R.carteDue({ profil: p, maintenant: MAINTENANT, finLocale: true }), false, "finie sur l'appareil");
  assert.equal(R.carteDue({ profil: p, maintenant: MAINTENANT, sans039: true }), false, "base sans 039");
  assert.equal(R.carteDue({ profil: { ...p, anciennete: "1-3", activite: "loisir", tranche_age: "35-49", attente: "vendre" }, maintenant: MAINTENANT }), false, "tout répondu");
  assert.equal(R.carteDue({ profil: { created_at: J(20) }, maintenant: MAINTENANT }), true, "sans fin d'inscription : date du profil");
  assert.equal(R.carteDue({ profil: null }), false);
});

test("questions : quatre, codes de la table profils, seules les restantes", () => {
  assert.deepEqual(R.QUESTIONS.map((x) => x.k), ["anciennete", "activite", "tranche_age", "attente"]);
  assert.deepEqual(R.restantes({ anciennete: "0", attente: "conseil" }).map((x) => x.k), ["activite", "tranche_age"]);
  for (const q of R.QUESTIONS) for (const [v] of q.choix) assert.equal(P.controle({ [q.k]: v }), null, `${q.k}=${v} accepté`);
});

test("profil : le sexe n'est plus demandé, l'attente l'est", () => {
  assert.equal("sexe" in P.vide(), false);
  assert.equal(P.reponses({ sexe: "femme", attente: "vendre" }).sexe, "");
  assert.equal(P.reponses({ attente: "vendre" }).attente, "vendre");
});

test("rubrique d'un écran (jours d'utilisation)", () => {
  assert.equal(R.rubriqueDe("dash"), "accueil");
  assert.equal(R.rubriqueDe("ruche"), "ruchers");
  assert.equal(R.rubriqueDe("visiteexpress"), "visites");
  assert.equal(R.rubriqueDe("vente"), "ventes");
  assert.equal(R.rubriqueDe("utilisateurs"), null);
  for (const r of Object.keys(R.NOMS_RUBRIQUES)) assert.match(r, /^[a-z0-9_-]{1,24}$/, "accepté par noter_activite");
});

test("comparaison : rien sous 5 personnes ; barres relatives", () => {
  assert.equal(R.texteComparaison({ assez: false, moi: 3 }), null);
  const t = R.texteComparaison({ assez: true, moi: 3, moyenne: 1.5, personnes: 12 }, "Ille-et-Vilaine");
  assert.equal(t.titre, "Ce mois-ci en Ille-et-Vilaine");
  assert.equal(t.moi, "3 visites");
  assert.equal(t.moyenne, "1,5 visite");
  assert.equal(t.part, 100);
  assert.equal(t.partMoyenne, 50);
});

test("tableau de bord : chiffres, plus grosse perte, sources avec retour, groupes masqués", () => {
  const t = R.tableau({ jours: 30, inscrits: 412, nouveaux: 38, actifs_semaine: 168, actifs_periode: 200, premiere_visite: 71, retour_30: null,
    parcours: [{ k: "compte", n: 86 }, { k: "profil", n: 74 }, { k: "rucher", n: 70 }, { k: "visite", n: 61 }, { k: "j7", n: 44 }],
    sources: [{ k: "syndicat", n: 24, retour: 58 }, { k: "bouche", n: 16, retour: null }], sources_autres: 10,
    colonies: [], attentes: [], departements: [{ k: "35", n: 48 }], departements_autres: 12, rubriques: [{ k: "visites", n: 184 }],
    vendent: 55, reponses: { colonies: 96, tranche_age: 41 }, refus_stats: 6 });
  assert.deepEqual(t.chiffres.map((c) => c.valeur), ["412", "168", "71 %", "—"]);
  assert.equal(t.parcours[0].part, 100);
  assert.equal(t.parcours.at(-1).part, 51);
  assert.match(t.perte, /« Première visite » et « Revenus après 7 jours » \(28 %\)/);
  assert.deepEqual(t.sources.map((x) => [x.nom, x.texte, x.detail]), [["Syndicat ou GDS", "48 %", "58 %"], ["Bouche-à-oreille", "32 %", "—"]]);
  assert.deepEqual(t.departements.map((x) => x.nom), ["35", "Autres départements"]);
  assert.equal(t.rubriques[0].texte, "92 %");
  assert.deepEqual(t.reponses.map((x) => x.nom), ["Nombre de colonies", "Tranche d’âge"]);
  assert.equal(R.tableau(null), null);
});
