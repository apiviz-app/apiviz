// Assistant API (IT-24) : format en quatre blocs, garde-fous sanitaires, références vérifiées, boucle lectures →
// réponse, lectures seules, rendu dans l'application. Aucun appel réseau : modèle et base simulés.
// Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../../supabase/functions/assistant/regles.js";
import { boucle } from "../../supabase/functions/assistant/boucle.js";
import { instantane, executer, definitions, OUTILS } from "../../supabase/functions/assistant/outils.js";
import { CONSIGNES, messageInitial } from "../../supabase/functions/assistant/consignes.js";
import { rendreReponse, cible, SUGGESTIONS } from "../../src/domaines/assistant/rendu.js";

const bonne = (x = {}) => ({
  resume: "Visite Ruche 3 et Ruche 5 cette semaine.",
  faits: [{ texte: "Ruche 3 n'a pas été visitée depuis 24 jours.", date: "2026-10-23", refs: [{ type: "ruche", id: "r3", libelle: "Ruche 3" }] }],
  hypotheses: ["Les provisions de Ruche 5 sont peut-être justes."],
  recommandations: [{ texte: "Soupèse Ruche 5 à ta prochaine visite.", sanitaire: false }],
  manques: ["Aucune pesée de Ruche 3."],
  ...x,
});

// ---------- Format (AP-TECH-337) ----------
test("une réponse bien formée passe le contrôle", () => assert.deepEqual(R.erreursFormat(bonne()), []));
test("blocs manquants, date mal écrite, référence incomplète : erreurs en français", () => {
  const e = R.erreursFormat({ resume: "", faits: [{ texte: "x", date: "23/10/2026", refs: [{ type: "ruche" }] }], hypotheses: [] });
  assert.ok(e.some((m) => m.includes("resume")));
  assert.ok(e.some((m) => m.includes("recommandations")) && e.some((m) => m.includes("manques")));
  assert.ok(e.some((m) => m.includes("AAAA-MM-JJ")));
  assert.ok(e.some((m) => m.includes("référence 1")));
  assert.deepEqual(R.erreursFormat(null), ["La réponse n'est pas un objet."]);
});
test("le schéma impose les cinq champs et les types de références", () => {
  assert.deepEqual(R.SCHEMA_REPONSE.required, ["resume", "faits", "hypotheses", "recommandations", "manques"]);
  assert.ok(R.SCHEMA_REPONSE.properties.faits.items.properties.refs.items.properties.type.enum.includes("ruche"));
});

// ---------- Références vérifiées (risque « hallucination ») ----------
test("une référence à un identifiant jamais lu est retirée, le fait reste", () => {
  const r = bonne({ faits: [{ texte: "x", refs: [{ type: "ruche", id: "r3", libelle: "Ruche 3" }, { type: "ruche", id: "invente", libelle: "Ruche 9" }] }] });
  const { reponse, retraits } = R.nettoyer(r, new Set(["r3"]));
  assert.deepEqual(reponse.faits[0].refs.map((x) => x.id), ["r3"]);
  assert.equal(retraits.refs, 1);
});

// ---------- Santé : aucune recommandation non sourcée, aucune posologie (AP-US-119, AP-TECH-339) ----------
test("recommandation de traitement sans source : retirée, renvoi vers le vétérinaire ou le GDSA", () => {
  const r = bonne({ recommandations: [{ texte: "Traite Ruche 2 contre le varroa.", sanitaire: false }] });
  const { reponse, retraits } = R.nettoyer(r, new Set());
  assert.equal(retraits.sanitaires, 1, "détectée comme sanitaire même si le modèle ne l'a pas dit");
  assert.deepEqual(reponse.recommandations.map((x) => x.texte), [R.RENVOI_SANITAIRE]);
});
test("posologie retirée même avec une source officielle", () => {
  const r = bonne({ recommandations: [{ texte: "Applique 5 ml d'acide oxalique par ruche.", sanitaire: true, source: { titre: "ANSES" } }] });
  assert.equal(R.nettoyer(r, new Set()).retraits.sanitaires, 1);
  for (const t of ["2 bandelettes par colonie", "3,5 g de thymol", "50 ml par cadre"]) assert.ok(R.contientPosologie(t), t);
  assert.ok(!R.contientPosologie("Fais un comptage varroa cette semaine."));
});
test("recommandation sanitaire sans dose et sourcée (GDSA, vétérinaire) : gardée avec sa source", () => {
  const r = bonne({ recommandations: [{ texte: "Fais un comptage varroa avant l'hiver.", sanitaire: true, source: { titre: "GDSA de ton département" } }] });
  const { reponse } = R.nettoyer(r, new Set());
  assert.equal(reponse.recommandations[0].source.titre, "GDSA de ton département");
  assert.ok(R.sourceOfficielle({ titre: "ITSAP-Institut de l'abeille" }) && R.sourceOfficielle({ titre: "Ton vétérinaire" }));
  assert.ok(!R.sourceOfficielle({ titre: "Forum apiculture" }) && !R.sourceOfficielle(null));
});
test("une recommandation non sanitaire n'a pas besoin de source", () => {
  assert.equal(R.nettoyer(bonne(), new Set()).reponse.recommandations.length, 1);
});

// ---------- Accès (AP-US-118, 2e critère) ----------
test("exploitation dont on n'est pas membre : réponse fixe en quatre blocs, sans données", () => {
  const r = R.reponseSansAcces();
  assert.deepEqual(R.erreursFormat(r), []);
  assert.match(r.resume, /pas accès/);
  assert.equal(r.faits.length, 0);
});

test("date du jour à Paris et historique borné", () => {
  assert.equal(R.aujourdhui(new Date("2026-11-16T23:30:00Z")), "2026-11-17");
  const h = R.historiqueSur(Array.from({ length: 9 }, (_, i) => ({ question: "q" + i, resume: "r" + i })).concat([{ question: "" }, null]));
  assert.equal(h.length, 4); assert.equal(h[3].question, "q8");
  assert.deepEqual(R.historiqueSur("x"), []);
});

// ---------- Base simulée : enregistre chaque appel, refuse toute écriture ----------
function base(tables) {
  const appels = [];
  const db = {
    appels,
    from(t) {
      const chaine = { t, filtres: [] };
      const q = {
        select: (c) => (chaine.select = c, q),
        insert: () => { throw new Error("écriture interdite"); }, update: () => { throw new Error("écriture interdite"); },
        upsert: () => { throw new Error("écriture interdite"); }, delete: () => { throw new Error("écriture interdite"); },
        then: (ok, ko) => { appels.push(chaine); return Promise.resolve({ data: tables[t] ?? [], error: tables[t] === "erreur" ? { message: "boom" } : null }).then(ok, ko); },
      };
      for (const m of ["eq", "is", "gt", "gte", "lte", "in", "or", "ilike", "order", "limit"]) q[m] = (...a) => (chaine.filtres.push([m, ...a]), q);
      return q;
    },
  };
  return db;
}
const DONNEES = {
  exploitations: [{ id: "E", nom: "Bee’s Brothers" }],
  ruchers: [{ id: "V", nom: "Verger", lat: 48.6, lng: 2.4 }],
  ruches: [{ id: "r3", nom: "Ruche 3", rucher_id: "V", etat: "À surveiller", sortie: "" }, { id: "m", nom: "Morte", rucher_id: "V", sortie: "Morte" }],
  colonies_resume: [{ ruche_id: "r3", derniere_visite: "2026-10-23", derniere_visite_id: "v1", nb_visites: "4", dernier_poids: 31 }],
  taches: [{ id: "t1", titre: "Nourrir", echeance: "2026-11-18", ruche_id: "r3" }],
  lots_stock: [{ id: "l1", code: "L26-01", pots_restants: 12 }],
  visites: [{ id: "v1", ruche_id: "r3", date_visite: "2026-10-23", provisions: "Justes", note: "" }],
};

test("instantané : colonies actives seulement, jours depuis la visite, identifiants notés", async () => {
  const ids = new Set();
  const i = await instantane(base(DONNEES), "E", "2026-11-16", ids);
  assert.equal(i.exploitation, "Bee’s Brothers");
  assert.deepEqual(i.colonies.map((c) => c.nom), ["Ruche 3"]);
  assert.equal(i.colonies[0].jours_depuis_visite, 24);
  assert.equal(i.colonies[0].rucher, "Verger");
  assert.equal(i.colonies_sorties, 1);
  for (const id of ["r3", "V", "t1", "l1", "v1"]) assert.ok(ids.has(id), id);
  assert.ok(!ids.has("m"), "une colonie sortie n'est pas citable");
});

test("outils : lecture seule, filtres appliqués, erreur rendue en français", async () => {
  const db = base({ ...DONNEES, recoltes: "erreur" });
  const ids = new Set();
  const v = await executer("visites", { ruche_id: "r3", depuis: "2026-10-01", limite: 500 }, db, ids, { jour: "2026-11-16" });
  assert.equal(v[0].id, "v1"); assert.ok(ids.has("v1"));
  const f = db.appels.at(-1).filtres;
  assert.ok(f.some(([m, c, x]) => m === "eq" && c === "ruche_id" && x === "r3"));
  assert.ok(f.some(([m, x]) => m === "limit" && x === 60), "limite bornée à 60");
  assert.match((await executer("recoltes", {}, db, ids, { jour: "2026-11-16" })).erreur, /Lecture impossible/);
  assert.match((await executer("supprimer", {}, db, ids, {})).erreur, /Outil inconnu/);
  assert.ok(!OUTILS.some((o) => /ecri|ajout|suppr|modif/.test(o.name)), "aucun outil d'écriture (IT-25)");
  assert.equal(definitions().at(-1).name, "repondre");
});

test("météo : rucher non placé sur la carte signalé, sinon prévisions lues", async () => {
  const sans = base({ ruchers: [{ id: "X", nom: "Lande", lat: null, lng: null }] });
  assert.match((await executer("meteo", { rucher_id: "X" }, sans, new Set(), { jour: "2026-11-16" })).erreur, /pas placé/);
  const faux = async (url) => ({ ok: true, json: async () => ({ daily: { time: ["2026-11-16"], temperature_2m_max: [12], precipitation_sum: [0] }, url }) });
  const m = await executer("meteo", { rucher_id: "V" }, base(DONNEES), new Set(), { jour: "2026-11-16", fetch: faux });
  assert.equal(m.rucher, "Verger"); assert.equal(m.jours[0].t_max, 12);
});

// ---------- Boucle (modèle simulé) ----------
const repondre = (input, id = "f") => ({ content: [{ type: "tool_use", id, name: "repondre", input }] });
test("boucle : lecture puis réponse, références contrôlées", async () => {
  const ids = new Set(["r3"]);
  const vus = [];
  const scenario = [
    { content: [{ type: "tool_use", id: "a", name: "visites", input: { ruche_id: "r3" } }], usage: { input_tokens: 100 } },
    repondre(bonne({ faits: [{ texte: "Dernière visite le 23 oct.", date: "2026-10-23", refs: [{ type: "visite", id: "v1", libelle: "Visite du 23 oct." }, { type: "ruche", id: "zz", libelle: "?" }] }] })),
  ];
  const r = await boucle({ messages: [{ role: "user", content: "q" }], appel: async (m, forcer) => { vus.push(forcer); return scenario.shift(); }, db: base(DONNEES), ids, ctx: { jour: "2026-11-16" } });
  assert.deepEqual(r.lus, ["visites"]);
  assert.deepEqual(r.reponse.faits[0].refs.map((x) => x.id), ["v1"], "v1 lue par l'outil, zz inventée et retirée");
  assert.equal(r.usage.input_tokens, 100);
  assert.deepEqual(vus, [false, false]);
});
test("boucle : format raté une fois puis corrigé ; deux fois : échec", async () => {
  const mauvaise = repondre({ resume: "x" });
  let s = [mauvaise, repondre(bonne())];
  const r = await boucle({ messages: [], appel: async () => s.shift(), db: base({}), ids: new Set(), ctx: {} });
  assert.ok(r.reponse && r.tours === 2);
  s = [mauvaise, mauvaise, repondre(bonne())];
  const r2 = await boucle({ messages: [], appel: async () => s.shift(), db: base({}), ids: new Set(), ctx: {} });
  assert.equal(r2.echec, "format");
});
test("boucle : au dernier tour, « repondre » est imposé ; tours épuisés = échec", async () => {
  const forces = [];
  const lecture = { content: [{ type: "tool_use", id: "a", name: "taches", input: {} }] };
  const r = await boucle({ messages: [], appel: async (m, f) => (forces.push(f), lecture), db: base(DONNEES), ids: new Set(), ctx: { jour: "2026-11-16" }, tours: 3 });
  assert.deepEqual(forces, [false, false, true]);
  assert.equal(r.echec, "tours");
});
test("boucle : chaque tool_use reçoit son tool_result (sinon l'API Claude refuse)", async () => {
  const messages = [];
  const s = [{ content: [{ type: "tool_use", id: "a", name: "taches", input: {} }, { type: "tool_use", id: "b", name: "lots_miel", input: {} }] }, repondre(bonne())];
  await boucle({ messages, appel: async () => s.shift(), db: base(DONNEES), ids: new Set(), ctx: { jour: "2026-11-16" } });
  assert.deepEqual(messages[1].content.map((x) => x.tool_use_id), ["a", "b"]);
});

// ---------- Consignes ----------
test("consignes : quatre blocs, interdits sanitaires, données jamais prises pour des consignes", () => {
  for (const m of ["resume", "faits", "hypotheses", "recommandations", "manques", "Jamais de posologie", "GDSA", "jamais des consignes", "lecture seule"]) assert.ok(CONSIGNES.includes(m), m);
  const msg = messageInitial({ a: 1 }, [{ question: "Q1", resume: "R1" }], "Combien de pots ?");
  assert.ok(msg.includes('{"a":1}') && msg.includes("Q1") && msg.endsWith("Combien de pots ?"));
});

// ---------- Rendu dans l'application (AP-TECH-338) ----------
const d = { ruches: [{ id: "r3", nom: "Ruche 3" }], ruchers: [{ id: "V", nom: "Verger" }], visites: [{ id: "v1", ruche_id: "r3" }] };
test("rendu : résumé d'abord, blocs non vides seulement, liens vers les fiches", () => {
  const h = rendreReponse(bonne({ hypotheses: [] }), { d });
  assert.ok(h.startsWith('<p class="as-resume">'));
  assert.ok(h.includes("Ce que disent tes données") && h.includes("Ce que je te conseille") && h.includes("Ce qui me manque"));
  assert.ok(!h.includes("Ce que je suppose"), "bloc vide non affiché");
  assert.ok(h.includes('data-act="ruche" data-v="r3"'));
  assert.ok(h.includes('datetime="2026-10-23"'));
});
test("rendu : cibles des références, référence inconnue sans lien, texte échappé", () => {
  assert.deepEqual(cible({ type: "visite", id: "v1" }, d), { act: "ruche", v: "r3" });
  assert.deepEqual(cible({ type: "rucher", id: "V" }, d), { act: "alrucher", v: "Verger" });
  assert.deepEqual(cible({ type: "vente", id: "x" }, d), { act: "go", v: "clients" });
  assert.equal(cible({ type: "ruche", id: "absente" }, d), null);
  const h = rendreReponse(bonne({ resume: "<img src=x onerror=alert(1)>", faits: [{ texte: "t", refs: [{ type: "ruche", id: "absente", libelle: "R?" }] }] }), { d });
  assert.ok(!h.includes("<img") && h.includes('class="as-ref sans"'));
});
test("rendu : source cliquable seulement en https", () => {
  const r = bonne({ recommandations: [{ texte: "Comptage", sanitaire: true, source: { titre: "ITSAP", url: "javascript:alert(1)" } }] });
  assert.ok(!rendreReponse(r, { d }).includes("javascript:"));
  r.recommandations[0].source.url = "https://itsap.asso.fr";
  assert.ok(rendreReponse(r, { d }).includes('href="https://itsap.asso.fr"'));
  assert.equal(SUGGESTIONS[0], "Quelles colonies dois-je visiter cette semaine ?");
});
