// IT-12 : comptages varroa en opération, reprise des visites, seuils sourcés, signes sanitaires (src/domaines/sante/regles.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as SA from "../../src/domaines/sante/regles.js";

const R1 = "r1", R2 = "r2";
const visite = (id, ruche_id, date_visite, varroa, varroa_abeilles = null, varroa_methode = "") => ({ id, ruche_id, date_visite, varroa, varroa_abeilles, varroa_methode });

test("taux pour 100 abeilles et chute par jour (AP-US-058)", () => {
  assert.equal(SA.tauxVarroa({ varroa: 9, varroa_abeilles: 300, varroa_methode: "Sucre glace" }), 3);
  assert.equal(SA.tauxVarroa({ varroa: 9, varroa_abeilles: 300, varroa_methode: "Lange" }), null);
  assert.equal(SA.chuteParJour({ varroa: 21, varroa_methode: "Lange", duree_jours: 7 }), 3, "21 varroas sur 7 jours = 3 par jour");
  assert.equal(SA.resultat({ varroa: 21, varroa_methode: "Lange", duree_jours: 7 }).texte, "3 / jour");
  assert.equal(SA.resultat({ varroa: 11, varroa_abeilles: 300, varroa_methode: "Lavage" }).texte, "3,7 %");
  assert.equal(SA.resultat({ varroa: 4, varroa_methode: "" }).texte, "4 varroas", "sans abeilles ni durée : le nombre brut");
  assert.equal(SA.resultat({ varroa: 21, varroa_methode: "Lange" }).valeur, null, "lange sans durée (ancienne visite) : pas de valeur comparable");
});

test("comptages : opérations et visites, sans doublon, le plus récent d'abord ; reprise à l'identique", () => {
  const d = {
    visites: [visite("v1", R1, "2026-09-14", 6, 300, "Sucre glace"), visite("v2", R2, "2026-10-01", 4), visite("v3", R1, "2026-10-20", null)],
    operations: [{ id: "v1", date_operation: "2026-09-14", methode: "Sucre glace", echantillon_abeilles: 300, origine: "visite", visite_id: "v1" },
      { id: "o1", date_operation: "2026-11-18", methode: "Lavage", echantillon_abeilles: 300, origine: "operation", visite_id: null }],
    comptesVarroa: [{ id: "v1", operation_id: "v1", ruche_id: R1, varroa: 6, abeilles: 300 }, { id: "c1", operation_id: "o1", ruche_id: R1, varroa: 11, abeilles: 280 }],
  };
  const l = SA.comptages(d);
  assert.deepEqual(l.map((c) => c.id), ["c1", "v2", "v1"], "v1 n'apparaît qu'une fois (reprise), v3 sans comptage absente");
  const v1 = l.find((c) => c.id === "v1");
  assert.deepEqual([v1.varroa, v1.varroa_abeilles, v1.varroa_methode, v1.date_visite, v1.origine], [6, 300, "Sucre glace", "2026-09-14", "visite"]);
  assert.equal(l[0].varroa_abeilles, 280, "abeilles de la colonie avant l'échantillon de l'opération");
  assert.equal(SA.dernierComptage(d, R1).id, "c1");
  assert.equal(SA.comptages({ visites: d.visites }).length, 2, "base sans 036 : les comptages des visites seulement");
});

const ctx = (seuils = [], reglages = {}) => ({ seuils, reglages });
const S9 = { id: "s1", methode: "Lavage", mois_debut: 9, mois_fin: 11, valeur: 3, source: "GDSA, réunion de rentrée", consulte_le: "2026-09-02", origine: "utilisateur" };

test("aucun seuil par défaut : pas de couleur sans seuil choisi (AP-US-059)", () => {
  const c = { varroa: 30, varroa_abeilles: 300, varroa_methode: "Sucre glace", date_visite: "2026-10-01" };
  assert.equal(SA.seuilApplicable(c, ctx()), null);
  assert.equal(SA.niveau(c, ctx()), null, "10 % sans seuil : aucun niveau, donc aucune alerte");
  assert.equal(SA.auDessus(10, null), false);
  assert.equal(SA.proche(10, null), false);
  assert.equal(SA.seuilDe(() => null, c), null);
});

test("seuil par méthode et période, avec sa source et sa date", () => {
  const nov = { varroa: 11, varroa_abeilles: 300, varroa_methode: "Lavage", date_visite: "2026-11-18" };
  const s = SA.seuilApplicable(nov, ctx([S9]));
  assert.equal(s.valeur, 3); assert.equal(s.unite, "pourcent");
  assert.equal(SA.niveau(nov, ctx([S9])), "haut");
  assert.equal(SA.sourceTexte(s), "Source : GDSA, réunion de rentrée · consultée le 2 sept. 2026");
  assert.equal(SA.periodeTexte(s), "sept. → nov.");
  assert.equal(SA.seuilApplicable({ ...nov, date_visite: "2026-05-10" }, ctx([S9])), null, "hors période : pas de seuil");
  assert.equal(SA.seuilApplicable({ ...nov, varroa_methode: "Sucre glace" }, ctx([S9])), null, "autre méthode : pas de seuil");
  assert.equal(SA.seuilApplicable(nov, ctx([{ ...S9, source: " " }])), null, "seuil sans source : ignoré");
  assert.equal(SA.seuilApplicable(nov, ctx([{ ...S9, consulte_le: null }])), null, "seuil sans date : ignoré");
  const recent = { ...S9, id: "s2", valeur: 2, consulte_le: "2026-10-01" };
  assert.equal(SA.seuilApplicable(nov, ctx([S9, recent])).id, "s2", "deux seuils : le plus récemment vérifié");
  assert.equal(SA.niveau({ ...nov, varroa: 7 }, ctx([S9])), "proche");
  assert.equal(SA.niveau({ ...nov, varroa: 3 }, ctx([S9])), "bas");
});

test("période qui passe la fin de l'année ; chute comparée à un seuil par jour", () => {
  assert.ok(SA.dansPeriode(1, 11, 2) && SA.dansPeriode(12, 11, 2) && !SA.dansPeriode(5, 11, 2));
  const lange = { varroa: 21, varroa_methode: "Lange", duree_jours: 7, date_visite: "2026-12-10" };
  const s = { id: "l", methode: "Lange", mois_debut: 11, mois_fin: 2, valeur: 2, source: "Mon technicien", consulte_le: "2026-11-01" };
  assert.equal(SA.seuilApplicable(lange, ctx([s])).unite, "par_jour");
  assert.equal(SA.niveau(lange, ctx([s])), "haut");
  assert.equal(SA.niveau(lange, ctx([], { varroaSeuil: 1 })), null, "le réglage d'avant (un taux) ne vaut pas pour une chute");
});

test("réglage d'avant IT-12 : gardé, présenté comme saisi par l'apiculteur, source non notée", () => {
  const c = { varroa: 12, varroa_abeilles: 300, varroa_methode: "Sucre glace", date_visite: "2026-06-01" };
  const s = SA.seuilApplicable(c, ctx([], { varroaSeuil: 3 }));
  assert.equal(s.origine, "reglage"); assert.equal(s.valeur, 3);
  assert.match(SA.sourceTexte(s), /source non notée/);
  assert.equal(SA.seuilApplicable({ ...c, varroa_methode: "Lavage", date_visite: "2026-10-01" }, ctx([S9], { varroaSeuil: 5 })).valeur, 3, "un seuil sourcé passe avant le réglage d'avant");
});

test("validation d'un seuil : source et date obligatoires", () => {
  const ok = { methode: "Lavage", mois_debut: 9, mois_fin: 11, valeur: "2,5", source: "GDSA", consulte_le: "2026-09-02" };
  assert.equal(SA.validerSeuil(ok, "2026-11-23"), null);
  assert.match(SA.validerSeuil({ ...ok, source: "" }, "2026-11-23"), /source/);
  assert.match(SA.validerSeuil({ ...ok, consulte_le: "" }, "2026-11-23"), /date/);
  assert.match(SA.validerSeuil({ ...ok, consulte_le: "2026-12-01" }, "2026-11-23"), /futur/);
  assert.match(SA.validerSeuil({ ...ok, valeur: "0" }, "2026-11-23"), /valeur/);
  assert.match(SA.validerSeuil({ ...ok, methode: "Pifomètre" }, "2026-11-23"), /méthode/);
});

test("comptage du rucher : validation, colonies comptées, application sur le téléphone", () => {
  const p = { id: "o9", date: "2026-11-18", methode: "Sucre glace", colonies: [{ ruche_id: R1, varroa: "3", abeilles: "" }, { ruche_id: R2, varroa: "" }] };
  assert.equal(SA.validerComptage(p), null);
  assert.deepEqual(SA.coloniesComptees(p), [{ ruche_id: R1, varroa: 3, abeilles: null }], "colonie sans nombre : pas comptée");
  assert.match(SA.validerComptage({ ...p, colonies: [{ ruche_id: R1, varroa: "" }] }), /au moins une/);
  assert.match(SA.validerComptage({ ...p, methode: "Lange" }), /jours/);
  assert.match(SA.validerComptage({ ...p, colonies: [{ ruche_id: R1, varroa: "-1" }] }), /entier/);
  const d = { visites: [] };
  SA.appliquerComptage(d, { ...p, colonies: SA.coloniesComptees(p) }, { _attente: true });
  SA.appliquerComptage(d, { ...p, colonies: SA.coloniesComptees(p) }, { _attente: true });
  assert.equal(d.operations.length, 1, "appliqué deux fois (rejeu de la file) : une seule opération");
  const c = SA.dernierComptage(d, R1);
  assert.equal(c.varroa, 3); assert.equal(c._attente, true); assert.equal(c.origine, "operation");
  assert.deepEqual(SA.libelleEnAttente("compter_varroa", { ...p, colonies: [1] }, d)[0], "Comptage varroa · 1 colonie");
});

test("signes sanitaires : validation, une ligne par colonie, signes qui demandent un avis, pas de danger affiché avant relecture", () => {
  const p = { id: "g1", date: "2026-11-18", ruches: [R1, R2], signes: ["ailes_deformees", "larves_filantes"], importance: "marque", note: "" };
  assert.equal(SA.validerSignes(p), null);
  assert.match(SA.validerSignes({ ...p, signes: [] }), /signe/);
  assert.match(SA.validerSignes({ ...p, ruches: [] }), /colonie/);
  assert.match(SA.validerSignes({ ...p, signes: ["autre"] }), /Décris/);
  const d = {};
  SA.appliquerSignes(d, p); SA.appliquerSignes(d, p);
  assert.equal(d.observations.length, 2, "une ligne par colonie, rejeu sans doublon");
  assert.equal(SA.observationsDe(d, R1)[0].signes.join(), "ailes_deformees,larves_filantes");
  assert.deepEqual(SA.signesAvis(p.signes), ["larves_filantes"]);
  assert.equal(SA.nomSigne("ailes_deformees"), "Ailes déformées");
  assert.ok(SA.DANGERS_REGLEMENTES.every((x) => x.relu === false), "dangers réglementés : en attente de relecture humaine");
  assert.deepEqual(SA.dangersPour(p.signes), [], "rien d'affiché comme réglementé tant que ce n'est pas relu");
  assert.equal(SA.SOURCE_DANGERS.consulte_le, "2026-11-23");
});

test("fiche de signalement : vouvoiement, faits seulement, sans conclusion", () => {
  const t = SA.ficheSignalement({ date: "2026-11-23", rucher: "Verger", colonies: ["Ruche 5"], total: 6, signes: ["Larves filantes", "Ailes déformées"],
    importance: "Marqué", varroa: "6 % au lavage le 18 nov. 2026", note: "", apiculteur: "Rucher A", napi: "A1234", contact: "a@x.fr" });
  assert.match(t, /^Objet : signes sanitaires observés sur un rucher/);
  assert.match(t, /Madame, Monsieur,/);
  assert.match(t, /Je vous signale avoir observé le 23 novembre 2026, sur le rucher « Verger », sur 1 colonie sur 6 \(Ruche 5\) : larves filantes, ailes déformées\./);
  assert.match(t, /votre avis/);
  assert.doesNotMatch(t, /\btu\b|\bton\b|loque|diagnostic/i);
  assert.match(t, /NAPI A1234/);
});
