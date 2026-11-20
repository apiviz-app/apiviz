// Espace API (v5.71) : src/domaines/assistant/compagnon.js et src/domaines/assistant/voix-api.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../src/domaines/assistant/compagnon.js";
import * as VA from "../../src/domaines/assistant/voix-api.js";

const AUJ = "2026-11-20"; // un vendredi

test("dateConseil : échéances dites en toutes lettres", () => {
  assert.equal(C.dateConseil("Pèse Ruche 5 avant samedi.", AUJ), "2026-11-21");
  assert.equal(C.dateConseil("Repasse vendredi", AUJ), "2026-11-27", "le même jour de la semaine : la semaine suivante");
  assert.equal(C.dateConseil("Fais-le demain matin", AUJ), "2026-11-21");
  assert.equal(C.dateConseil("après-demain", AUJ), "2026-11-22");
  assert.equal(C.dateConseil("Recompte dans 3 jours", AUJ), "2026-11-23");
  assert.equal(C.dateConseil("Revois-la dans deux semaines", AUJ), "2026-12-04");
  assert.equal(C.dateConseil("Déclare tes ruches avant le 31 décembre", AUJ), "2026-12-31");
  assert.equal(C.dateConseil("Commande avant le 3", AUJ), "2026-12-03", "jour passé du mois : le mois suivant");
  assert.equal(C.dateConseil("Le 15 mars, première visite", AUJ), "2027-03-15", "date passée de l'année : l'an prochain");
  assert.equal(C.dateConseil("la semaine prochaine", AUJ), "2026-11-23");
  assert.equal(C.dateConseil("ce week-end", AUJ), "2026-11-21");
  assert.equal(C.dateConseil("Recompte le varroa de Ruche 5.", AUJ), null, "pas de date : rien d'inventé");
  assert.equal(C.dateConseil("le 31 février", AUJ), null);
});

test("jourCourt et quandTexte", () => {
  assert.equal(C.jourCourt("2026-11-21"), "samedi 21 nov.");
  assert.equal(C.quandTexte("2026-11-20", AUJ), "aujourd’hui");
  assert.equal(C.quandTexte("2026-11-21", AUJ), "demain");
  assert.equal(C.quandTexte("2026-11-23", AUJ), "lundi");
});

test("lignesDuJour : ordre, gestes et limite", () => {
  const l = C.lignesDuJour({
    aujourdhui: AUJ, max: 3,
    priorite: { titre: "Ruche 5 a perdu 1 kg depuis le 7 octobre. C’est la priorité du jour.", sous: "D’après 3 pesées de Ruche 5", ruche_id: "r5", nom: "Ruche 5" },
    creneau: { cle: "Verger", nom: "Verger", jour: "2026-11-21", h: 11, temp: 9 },
    priorites: [{ titre: "Déclarer tes 6 ruches", pourquoi: "Avant le 31 décembre." }],
    sousSeuil: [{ nom: "Candy", stock: 1, seuil: 2, unite: "kg" }],
    retard: 2, conseils: 1,
  });
  assert.deepEqual(l.map((x) => x.id), ["priorite", "creneau", "saison0"]);
  assert.equal(l[0].bouton, "Voir Ruche 5");
  assert.equal(l[0].principal, true);
  assert.equal(l[1].titre, "Demain vers 11 h : bon moment pour ouvrir");
  assert.equal(l[1].sous, "Verger · 9°");
  assert.equal(l[1].act, "apiplanifier");
  assert.equal(l[1].v, "2026-11-21|11|Verger");
  const tout = C.lignesDuJour({ aujourdhui: AUJ, max: 9, sousSeuil: [{ nom: "Candy", stock: 1, seuil: 2, unite: "kg" }, { nom: "Pots", stock: 3, seuil: 10 }], retard: 1, conseils: 2 });
  assert.deepEqual(tout.map((x) => x.titre), ["2 articles sous le seuil", "1 tâche en retard", "2 conseils d’API pas encore faits"]);
  const un = C.lignesDuJour({ aujourdhui: AUJ, sousSeuil: [{ nom: "Candy", stock: 1, seuil: 2, unite: "kg" }] });
  assert.equal(un[0].titre, "Candy : 1 kg (seuil 2)");
  assert.equal(C.lignesDuJour({ aujourdhui: AUJ, priorites: [{ titre: "X", dejaAgenda: true }] }).length, 0, "déjà dans l'agenda : pas proposé");
});

test("lignesDuJour : le créneau du jour déjà dit par la priorité n'est pas répété", () => {
  const l = C.lignesDuJour({ aujourdhui: AUJ, priorite: { titre: "Bon créneau vers 11 h : Verger. Ruche 5 est à surveiller.", ruche_id: "r5", nom: "Ruche 5" },
    creneau: { cle: "Verger", nom: "Verger", jour: AUJ, h: 11, temp: 15 } });
  assert.deepEqual(l.map((x) => x.id), ["priorite"]);
});

test("voletGouttes : estimation, jauge, alerte et vide", () => {
  const r = C.voletGouttes({ mode: "rapide", restant: 28, forfait: 30 });
  assert.equal(r.titre, "Cette question : moins d’1 goutte");
  assert.equal(r.sous, "Rapide · il t’en restera environ 27");
  assert.deepEqual(r.gouttes, [24]);
  assert.equal(r.jauge, "28 sur 30");
  assert.equal(r.restePct, 93.3);
  assert.equal(r.alerte, "");
  const a = C.voletGouttes({ mode: "approfondi", restant: 3, forfait: 30 });
  assert.equal(a.titre, "Cette question : 2 à 4 gouttes");
  assert.deepEqual(a.gouttes, [20, 24, 20]);
  assert.equal(a.alerte, "Il ne t’en reste que 3 : Approfondie peut tout prendre.");
  assert.equal(a.etat, "bas");
  assert.equal(a.prisPct, 10);
  assert.equal(a.prisDepuis, 0);
  const v = C.voletGouttes({ mode: "approfondi", restant: 0, forfait: 30, aujourdhui: AUJ });
  assert.equal(v.vide, true);
  assert.equal(v.titre, "Plus de gouttes pour l’instant");
  assert.equal(v.sous, "Ton forfait revient le 1er décembre.");
  assert.equal(v.etat, "epuise");
  const inconnu = C.voletGouttes({ mode: "rapide" });
  assert.equal(inconnu.connu, false);
  assert.equal(inconnu.sous, "Rapide");
});

test("coutTexte : coût réel et prévu", () => {
  assert.deepEqual(C.coutTexte({ cout: 0.2, mode: "rapide" }), { reel: "Coût réel : 0,2 goutte", prevu: "Réponse rapide, prévu moins d’1 goutte" });
  assert.equal(C.coutTexte({ cout: 3.3, mode: "approfondi" }).reel, "Coût réel : 3 gouttes");
  assert.equal(C.coutTexte(null), null);
});

test("remarquesVoix : comparaison avec les visites précédentes", () => {
  const prec = [
    { date_visite: "2026-11-17", poids_kg: 38, couvain: "Normal", reine: "Non vue" },
    { date_visite: "2026-10-02", varroa: 12, varroa_abeilles: 300, varroa_methode: "Lavage" },
  ];
  const r = C.remarquesVoix({ poids_kg: 37, couvain: "Réduit", reine: "Non vue", provisions: "Faibles", cellules_royales: "Aucune" }, prec, { nom: "Ruche 5", seuil: 3, aujourdhui: AUJ });
  assert.deepEqual(r.remarques.map((x) => x.id), ["poids", "couvain", "reine", "provisions", "varroa"]);
  assert.equal(r.remarques[0].texte, "1 kg de moins qu’au 17 nov.");
  assert.deepEqual(r.remarques[0].tache, { titre: "Peser Ruche 5", echeance: "2026-11-27" });
  assert.equal(r.remarques[4].texte, "Varroa à 4 % le 2 oct. (ton seuil : 3 %), pas de traitement noté depuis.");
  assert.equal(r.doute, null);
  const d = C.remarquesVoix({ poids_kg: 47 }, prec, { nom: "Ruche 5", aujourdhui: AUJ });
  assert.equal(d.doute.texte, "J’ai compris 47 kg, soit +9 kg depuis le 17 nov. C’est bien ça ?");
  assert.ok(!d.remarques.some((x) => x.id === "poids"), "un poids douteux est une question, pas une remarque");
  const traitee = C.remarquesVoix({}, [{ date_visite: "2026-10-10", traitement: "Acide oxalique" }, prec[1]], { nom: "R", seuil: 3, aujourdhui: AUJ });
  assert.equal(traitee.remarques.length, 0, "traitement noté après le comptage : rien à dire");
  assert.deepEqual(C.remarquesVoix({ cellules_royales: "Operculées" }, [], { nom: "R", aujourdhui: "2026-05-02" }).remarques.map((x) => x.id), ["essaimage"]);
});

test("propositionsSemaine : météo, priorités, conseils, stock, sans doublon", () => {
  const p = C.propositionsSemaine({
    aujourdhui: AUJ,
    ruchers: [
      { cle: "Verger", nom: "Verger", aVoir: true, joursSansVisite: 3, creneau: { jour: "2026-11-23", h: 14, temp: 8, n: 2 } },
      { cle: "Bois", nom: "Bois", aVoir: false, joursSansVisite: 40, creneau: null },
      { cle: "Pré", nom: "Pré", aVoir: true, joursSansVisite: 5, creneau: null },
    ],
    priorites: [{ titre: "Déclarer tes 6 ruches", pourquoi: "Avant le 31 décembre." }],
    conseils: [{ titre: "Pèse Ruche 5 avant samedi", texte: "Pèse Ruche 5 avant samedi. Donne du candy sous 30 kg.", ruche_id: "r5" }, { titre: "Visite · Verger" }],
    sousSeuil: [{ nom: "Candy" }],
    tachesOuvertes: ["déclarer tes 6 ruches", "Visite · Bois (vers 11 h)"],
  });
  assert.deepEqual(p.map((x) => [x.titre, x.echeance]), [
    ["Pèse Ruche 5 avant samedi", "2026-11-21"],
    ["Commander : Candy", "2026-11-21"],
    ["Visite · Verger", "2026-11-23"],
    ["Visite · Pré", null],
  ]);
  assert.equal(p[2].heure, 14);
  assert.equal(p[2].raison, "Une colonie à surveiller · 8°, bon moment pour ouvrir");
  assert.equal(p[3].raison, "Une colonie à surveiller · météo pas encore connue : choisis le jour");
  const ete = C.propositionsSemaine({ aujourdhui: "2026-06-10", ruchers: [{ cle: "Bois", nom: "Bois", aVoir: false, joursSansVisite: 20, creneau: null }] });
  assert.equal(ete[0].titre, "Visite · Bois", "en saison, une visite de plus de 14 jours est proposée");
  assert.equal(C.propositionsSemaine({ aujourdhui: "2026-06-10", ruchers: [{ cle: "Bois", nom: "Bois", aVoir: false, joursSansVisite: 20, creneau: null }], tachesOuvertes: ["Visite · Bois (vers 11 h)"] }).length, 0,
    "déjà planifiée (avec son heure) : pas reproposée");
});

test("texteReponse : résumé et deux conseils", () => {
  assert.equal(C.texteReponse({ resume: "Elle mange ses réserves", recommandations: [{ texte: "Pèse-la avant samedi." }, { texte: "Recompte le varroa" }, { texte: "Trois" }] }),
    "Elle mange ses réserves. Pèse-la avant samedi. Recompte le varroa.");
  assert.equal(C.texteReponse(null), "");
});

test("voix d'API : préférences par défaut, normalisées", () => {
  assert.deepEqual(VA.normaliser({}), { lecture: "mains", voix: "posee", vitesse: "normale" });
  assert.deepEqual(VA.normaliser({ lecture: "toujours", voix: "vive", vitesse: "rapide" }), { lecture: "toujours", voix: "vive", vitesse: "rapide" });
  assert.deepEqual(VA.normaliser({ lecture: "fort", voix: 3 }), { lecture: "mains", voix: "posee", vitesse: "normale" });
  assert.equal(VA.debit({ voix: "posee", vitesse: "normale" }), 0.95);
  assert.equal(VA.debit({ voix: "vive", vitesse: "rapide" }), 1.32);
  assert.equal(VA.resume({ lecture: "jamais" }), "Réponses écrites seulement");
  assert.equal(VA.resume({ lecture: "mains", voix: "posee" }), "Lit quand tu parles · voix posée");
  assert.equal(VA.doitLire({ lecture: "mains" }, true), true, "question dite : réponse lue");
  assert.equal(VA.doitLire({ lecture: "mains" }, false), false, "question écrite : réponse écrite");
  assert.equal(VA.doitLire({ lecture: "toujours" }, false), true);
  assert.equal(VA.doitLire({ lecture: "jamais" }, true), false);
});

// ---------- v5.72 ----------
const D = {
  ruches: [{ id: "r5", nom: "Ruche 5", rucher: "Bois" }, { id: "r1", nom: "Ruche 1", rucher: "Bois" }, { id: "r15", nom: "Ruche 15", rucher: "Pré" }],
  visites: [
    { ruche_id: "r5", date_visite: "2026-11-17", poids_kg: 38, reine: "Vue", couvain: "Normal", activite: "Normale" },
    { ruche_id: "r5", date_visite: "2026-10-10", poids_kg: 40, traitement: "Acide oxalique" },
    { ruche_id: "r5", date_visite: "2026-09-02", varroa: 9, varroa_abeilles: 300, varroa_methode: "Lavage" },
    { ruche_id: "r1", date_visite: "2026-11-15", poids_kg: 44 }, { ruche_id: "r1", date_visite: "2026-10-12", poids_kg: 46 },
    { ruche_id: "r15", date_visite: "2026-11-01", poids_kg: 20 },
  ],
  articles: [{ nom: "Candy", stock: 1, seuil: 2, unite: "kg" }, { nom: "Pots 500 g", stock: 40, seuil: 0, unite: "unité" }],
  taches: [{ titre: "Peser Ruche 5", echeance: "2026-11-19", faite: false }, { titre: "Plus tard", echeance: "2026-12-01", faite: false }],
};

test("rucheDuTexte : le nom le plus long, en entier", () => {
  assert.equal(C.rucheDuTexte("Comment va Ruche 15 ?", D.ruches).id, "r15");
  assert.equal(C.rucheDuTexte("et ruche 5, elle mange ?", D.ruches).id, "r5");
  assert.equal(C.rucheDuTexte("Ruche 51", D.ruches), null);
});

test("reponseLocale : réponses simples sans réseau, sinon null", () => {
  const o = { seuil: 3, aujourdhui: AUJ };
  assert.equal(C.reponseLocale("Combien pèse Ruche 5 ?", D, o).resume, "Ruche 5 : 38 kg le 17 nov.");
  assert.equal(C.reponseLocale("Combien pèse Ruche 5 ?", D, o).faits[0].refs[0].id, "r5");
  assert.equal(C.reponseLocale("La reine de Ruche 5 ?", D, o).resume, "Reine vue le 17 nov.");
  assert.equal(C.reponseLocale("Ruche 5 a été traitée ?", D, o).resume, "Ruche 5 : dernier traitement noté : Acide oxalique le 10 oct. ; varroa à 3 % le 2 sept.");
  assert.equal(C.reponseLocale("Ruche 5", D, o).resume, "Dernière visite de Ruche 5 le 17 nov. : activité normale, couvain normal, reine vue, 38 kg.");
  assert.equal(C.reponseLocale("Quel est mon seuil varroa déjà ?", D, o).resume, "Ton seuil d’alerte varroa : 3 varroas pour 100 abeilles.");
  assert.equal(C.reponseLocale("Il me reste combien de candy ?", D, o).resume, "Candy : 1 kg en stock (seuil 2).");
  assert.equal(C.reponseLocale("Qu'est-ce que j'ai à faire ?", D, o).resume, "1 tâche pour aujourd’hui ou en retard : Peser Ruche 5.");
  assert.equal(C.reponseLocale("Pourquoi mes abeilles sont agressives ?", D, o), null, "question ouverte : pour API");
  assert.equal(C.reponseLocale("Combien pèse Ruche 15 ?", { ...D, visites: [] }, o).resume, "Je n’ai encore aucune visite de Ruche 15.");
});

test("apprentissage : ce qu'API propose de retenir", () => {
  assert.deepEqual(C.apprentissage("Mon seuil varroa est de 2 %"), { cle: "varroaSeuil", valeur: 2, texte: "Je retiens que ton seuil d’alerte varroa est 2 % ?" });
  assert.equal(C.apprentissage("mon seuil varroa c'est 2,5 pour cent").valeur, 2.5);
  assert.equal(C.apprentissage("En hiver je m'alerte quand une ruche est sous 18 kg").cle, "hiverPoids");
  assert.equal(C.apprentissage("Je vise 120 kilos cette année").valeur, 120);
  assert.equal(C.apprentissage("Combien pèse Ruche 5 ?"), null);
  assert.equal(C.apprentissage("seuil varroa 90 %"), null, "valeur aberrante : rien");
});

test("serieRuche : pesées et moyenne du rucher le même mois", () => {
  const s = C.serieRuche(D, "r5");
  assert.equal(s.nom, "Ruche 5");
  assert.deepEqual(s.points, [{ date: "2026-10-10", kg: 40, moyenne: 46 }, { date: "2026-11-17", kg: 38, moyenne: 44 }]);
  assert.equal(s.min, 38); assert.equal(s.max, 46);
  assert.equal(C.serieRuche(D, "r15"), null, "une seule pesée : pas de courbe");
});

test("rappelsApi : un conseil par jour, le point du lundi, rien en visite", () => {
  const lignes = [{ titre: "Ruche 5 a perdu 1 kg", sous: "D’après 3 pesées", act: "ruche", v: "r5" }];
  assert.deepEqual(C.rappelsApi({ lignes, aujourdhui: AUJ }).map((r) => [r.cle, r.titre, r.sous]), [["api-2026-11-20", "Ruche 5 a perdu 1 kg", "Conseil d’API · D’après 3 pesées"]]);
  assert.deepEqual(C.rappelsApi({ lignes, aujourdhui: "2026-11-23" }).map((r) => r.act), ["ruche", "apsemaine"], "lundi : le point de la semaine");
  assert.equal(C.rappelsApi({ lignes, aujourdhui: "2026-11-23", prefs: { notif: false, lundi: false } }).length, 0);
  assert.equal(C.rappelsApi({ lignes, aujourdhui: AUJ, enVisite: true }).length, 0);
});
