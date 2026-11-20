// Apiviz — retours de réussite : sons, vibrations, animations, rayon de la saison et jalons (v5.68, maquettes
// « Interactivité et satisfaction » du 20 nov. 2026, validées par Pierre-Louis : ambiance Alvéole, volume moyen).
// Fonctions pures, sans navigateur ni base. Tests : tests/unitaires/retours.test.mjs.
//
// Trois niveaux, toujours les mêmes :
//   1 · toucher         (choix, compteurs, onglets)          rebond, « tic » très court, 10 ms de vibration ;
//   2 · validation      (visite, vente, note enregistrées)   coche dessinée, deux notes montantes, double tap ;
//   3 · accomplissement (tournée bouclée, récolte, jalon)    alvéoles qui jaillissent, accord, motif plus long. Rare.

// ---------- Préférences (propres à l'appareil) ----------

export const AMBIANCES = {
  alveole: { nom: "Alvéole", desc: "Clair et chaleureux (par défaut)" },
  bois: { nom: "Bois", desc: "Sec, comme un cadre posé" },
  cristal: { nom: "Cristal", desc: "Aigu et léger" },
};
export const VOLUMES = { discret: ["Discret", 0.45], moyen: ["Moyen", 1], fort: ["Fort", 1.8] };
export const ANIMATIONS = { completes: "Complètes", discretes: "Discrètes", aucune: "Aucune" };

/** Réglages de départ, validés le 20 nov. 2026 : sons avec l'ambiance Alvéole au volume moyen, vibrations, animations complètes. */
export const DEFAUT = Object.freeze({ sons: true, ambiance: "alveole", volume: "moyen", vibrations: true, animations: "completes", terrain: false });

/** Préférences lues (objet ou texte JSON, éventuellement abîmé) complétées par les valeurs de départ. */
export function normaliser(brut) {
  let p = brut;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch { p = null; } }
  if (!p || typeof p !== "object") p = {};
  const bool = (v, d) => (typeof v === "boolean" ? v : d);
  return {
    sons: bool(p.sons, DEFAUT.sons),
    ambiance: AMBIANCES[p.ambiance] ? p.ambiance : DEFAUT.ambiance,
    volume: VOLUMES[p.volume] ? p.volume : DEFAUT.volume,
    vibrations: bool(p.vibrations, DEFAUT.vibrations),
    animations: ANIMATIONS[p.animations] ? p.animations : DEFAUT.animations,
    terrain: bool(p.terrain, DEFAUT.terrain),
  };
}

/**
 * Ce qui joue vraiment, selon les préférences et le moment : le mode terrain coupe le son pendant une tournée
 * (vibrations seules) ; « réduire les animations » du téléphone l'emporte sur le réglage de l'app.
 */
export function effectif(p, { reduit = false, route = "" } = {}) {
  const q = normaliser(p);
  return { son: q.sons && !(q.terrain && route === "tournee"), vibre: q.vibrations, anim: reduit ? "aucune" : q.animations, volume: VOLUMES[q.volume][1], ambiance: q.ambiance };
}

// ---------- Sons ----------
// Une note : [fréquence Hz, départ s, durée s, forme d'onde, volume, fréquence d'arrivée (glissé) facultative].
const N = (f, s, d, type, vol, f2) => (f2 ? [f, s, d, type, vol, f2] : [f, s, d, type, vol]);
const ACCORD = [523, 659, 784, 1047];
export const SONS = {
  alveole: {
    tap: [N(1500, 0, 0.045, "sine", 0.035)],
    ok: [N(659, 0, 0.14, "triangle", 0.09), N(988, 0.08, 0.26, "triangle", 0.08)],
    fete: [...ACCORD.map((f, i) => N(f, i * 0.09, 0.4, "triangle", 0.07)), N(2093, 0.36, 0.6, "sine", 0.025)],
    annule: [N(740, 0, 0.1, "triangle", 0.07), N(494, 0.07, 0.18, "triangle", 0.07)],
    refus: [N(220, 0, 0.12, "triangle", 0.08), N(196, 0.08, 0.14, "triangle", 0.07)],
    envoi: [N(600, 0, 0.5, "sine", 0.05, 1400)],
    miel: [0, 0.45, 0.9].map((s, k) => N(220 + k * 60, s, 0.22, "sine", 0.1, 420 + k * 90)),
  },
  bois: {
    tap: [N(900, 0, 0.03, "square", 0.018)],
    ok: [N(330, 0, 0.07, "square", 0.03), N(494, 0.07, 0.09, "square", 0.025)],
    fete: [...[262, 330, 392, 523].map((f, i) => N(f, i * 0.08, 0.12, "square", 0.03)), N(784, 0.32, 0.25, "triangle", 0.04)],
    annule: [N(392, 0, 0.07, "square", 0.03), N(262, 0.07, 0.1, "square", 0.03)],
    refus: [N(165, 0, 0.1, "square", 0.03), N(147, 0.08, 0.12, "square", 0.03)],
    envoi: [N(300, 0, 0.3, "square", 0.02, 700)],
    miel: [0, 0.45, 0.9].map((s, k) => N(180 + k * 50, s, 0.16, "triangle", 0.08, 300 + k * 60)),
  },
  cristal: {
    tap: [N(2400, 0, 0.04, "sine", 0.025)],
    ok: [N(1568, 0, 0.5, "sine", 0.05), N(2349, 0.09, 0.6, "sine", 0.035)],
    fete: [...[1047, 1319, 1568, 2093].map((f, i) => N(f, i * 0.09, 0.7, "sine", 0.04)), N(3136, 0.4, 0.8, "sine", 0.015)],
    annule: [N(1760, 0, 0.2, "sine", 0.04), N(1175, 0.1, 0.3, "sine", 0.04)],
    refus: [N(440, 0, 0.15, "sine", 0.05), N(392, 0.1, 0.2, "sine", 0.05)],
    envoi: [N(1200, 0, 0.5, "sine", 0.035, 2600)],
    miel: [0, 0.45, 0.9].map((s, k) => N(700 + k * 120, s, 0.3, "sine", 0.05, 1100 + k * 150)),
  },
};
/** Nom du son joué pour chaque niveau. */
export const NIVEAUX = { 1: "tap", 2: "ok", 3: "fete" };
/** Motifs de vibration (ms), pour navigator.vibrate. */
export const VIBRATIONS = { tap: 10, ok: [15, 40, 15], fete: [20, 60, 20, 60, 40], annule: 20, refus: 25, envoi: 15, miel: [30, 420, 30, 420, 30] };

/** Notes d'un son, au volume voulu (multiplicateur). Son inconnu : aucune note. */
export function notes(ambiance, nom, volume = 1) {
  const l = (SONS[ambiance] || SONS.alveole)[nom] || [];
  return l.map(([f, s, d, type, vol, f2]) => ({ f, s, d, type, vol: Math.min(0.3, vol * volume), f2: f2 || null }));
}
/** Une note de la gamme montante (do majeur, à partir du do5) : chaque ruche d'une tournée a la sienne. */
export function gamme(i, ambiance = "alveole") {
  const G = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];
  const f = G[Math.max(0, Math.min(G.length - 1, i))] * (ambiance === "cristal" ? 2 : ambiance === "bois" ? 0.5 : 1);
  return { f, s: 0, d: 0.22, type: ambiance === "bois" ? "square" : "sine", vol: ambiance === "bois" ? 0.03 : 0.06, f2: null };
}

// ---------- Messages de réussite ----------
const REUSSITE = /enregistr|ajout|noté|encaiss|mis à jour|créé|envoyé|gardée? sur le téléphone|vendu/i;
const ECHEC = /impossible|erreur|échec|refus|non enregistr|\bmais\b|à corriger|lecture seule/i;
/** Vrai si le message d'une bulle dit qu'une saisie a abouti (niveau 2). */
export function estReussite(message, erreur) {
  const m = String(message || "");
  return !erreur && REUSSITE.test(m) && !ECHEC.test(m);
}

// ---------- Dates ----------
const JOUR = 86400000;
const utc = (s) => { const [a, m, j] = String(s).slice(0, 10).split("-").map(Number); return Date.UTC(a, (m || 1) - 1, j || 1); };
const iso = (t) => new Date(t).toISOString().slice(0, 10);
/** Numéro de semaine absolu (semaines commençant le lundi), pour comparer et compter des semaines. */
export function semaine(s) { const t = utc(s); const lundi = t - (((new Date(t).getUTCDay() + 6) % 7) * JOUR); return Math.round((lundi - utc("1970-01-05")) / (7 * JOUR)); }
const lundiDe = (k) => iso(utc("1970-01-05") + k * 7 * JOUR);
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** « 8 mars ». */
export const dateCourte = (s) => (s ? `${Number(String(s).slice(8, 10))} ${MOIS_COURT[Number(String(s).slice(5, 7)) - 1]}` : "");

/** Saison montrée : en janvier et février, celle qui vient de finir. */
export const saisonAnnee = (aujourdhui) => { const a = Number(String(aujourdhui).slice(0, 4)), m = Number(String(aujourdhui).slice(5, 7)); return m < 3 ? a - 1 : a; };
const deLAnnee = (an) => (s) => String(s || "").slice(0, 4) === String(an);

// ---------- Rayon de la saison ----------
export const niveauSemaine = (n) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3);

/**
 * Une alvéole par semaine de mars à novembre : nombre de visites et niveau (0 rien, 1 : 1–2, 2 : 3–5, 3 : 6 et plus),
 * la semaine en cours, les semaines à venir ; la série en cours (semaines d'affilée avec au moins une visite, jusqu'à
 * cette semaine, ou la précédente si celle-ci n'en a pas encore) ; le total de visites de la saison.
 */
export function rayon(d, aujourdhui) {
  const an = saisonAnnee(aujourdhui), dans = deLAnnee(an);
  const parSemaine = new Map();
  let total = 0;
  for (const v of d.visites || []) {
    if (!dans(v.date_visite)) continue;
    total++;
    const k = semaine(v.date_visite);
    parSemaine.set(k, (parSemaine.get(k) || 0) + 1);
  }
  // De la première semaine qui commence en mars à celle du 30 novembre : 39 ou 40 alvéoles.
  const debut = semaine(`${an}-03-01`) + (new Date(utc(`${an}-03-01`)).getUTCDay() === 1 ? 0 : 1), fin = semaine(`${an}-11-30`), ici = semaine(aujourdhui);
  const cellules = [];
  for (let k = debut; k <= fin; k++) {
    const n = parSemaine.get(k) || 0;
    cellules.push({ semaine: k - semaine(`${an}-01-04`) + 1, lundi: lundiDe(k), n, niveau: niveauSemaine(n), courante: k === ici, future: k > ici });
  }
  let k = parSemaine.get(ici) ? ici : ici - 1, serie = 0;
  while (parSemaine.get(k)) { serie++; k--; }
  return { annee: an, cellules, serie, total };
}

// ---------- Jalons ----------
// Calculés à partir des données (aucune table) : visites, récoltes, ventes de la saison. « Gagné le » = la date de
// la saisie qui l'a fait gagner. Progression : [fait, but].

const premieres = (l, champ) => l.map((x) => String(x[champ] || "").slice(0, 10)).filter(Boolean).sort();
const nieme = (dates, n) => (dates.length >= n ? dates[n - 1] : null);
const compteur = (dates, but) => ({ got: dates.length >= but, date: nieme(dates, but), prog: [Math.min(dates.length, but), but] });

/** Plus longue série de semaines d'affilée avec une visite ; et la date de la visite qui a fait atteindre « but ». */
function meilleureSerie(dates, but) {
  const ks = [...new Set(dates.map(semaine))].sort((a, b) => a - b);
  let best = 0, cur = 0, prec = null, atteint = null;
  for (const k of ks) {
    cur = prec !== null && k === prec + 1 ? cur + 1 : 1;
    prec = k;
    if (cur > best) best = cur;
    if (!atteint && cur >= but) atteint = dates.find((s) => semaine(s) === k);
  }
  return { best, atteint };
}

/**
 * Les 12 jalons de la saison, dans l'ordre du carnet.
 * ctx : { aujourdhui: "AAAA-MM-JJ", objectif: kilos de miel visés (réglage), à défaut 100 }.
 * Chaque jalon : { id, nom, desc, got, date, prog: [fait, but] | null, suite: texte sous un jalon pas encore gagné }.
 */
export function jalons(d, { aujourdhui, objectif } = {}) {
  const an = saisonAnnee(aujourdhui), dans = deLAnnee(an);
  const visites = (d.visites || []).filter((v) => dans(v.date_visite));
  const dv = premieres(visites, "date_visite");
  const recoltes = (d.recoltes || []).filter((r) => dans(r.date_recolte));
  const ventes = premieres((d.ventes || []).filter((v) => dans(v.date_vente)), "date_vente");
  const ruches = d.ruches || [];
  const ruchers = new Map();
  for (const r of ruches) { const k = r.rucher || ""; if (!ruchers.has(k)) ruchers.set(k, []); ruchers.get(k).push(r.id); }
  const L = [];
  const ajoute = (id, nom, desc, r) => L.push({ id, nom, desc, got: !!r.got, date: r.got ? r.date || null : null, prog: r.prog || null, suite: r.suite || "" });

  ajoute("premiere-visite", "Première visite", "Ta première visite de la saison.", { got: dv.length > 0, date: dv[0] });

  // Printemps lancé : chaque ruche visitée entre le 1er mars et le 15 avril.
  const fenetre = (s) => s >= `${an}-03-01` && s <= `${an}-04-15`;
  const vuesPrintemps = new Map();
  for (const v of visites) if (fenetre(String(v.date_visite)) && !vuesPrintemps.has(v.ruche_id)) vuesPrintemps.set(v.ruche_id, String(v.date_visite).slice(0, 10));
  const nbP = ruches.filter((r) => vuesPrintemps.has(r.id)).length;
  const gotP = ruches.length > 0 && nbP === ruches.length;
  ajoute("printemps", "Printemps lancé", "Toutes les ruches visitées avant le 15 avril.", {
    got: gotP, date: gotP ? ruches.map((r) => vuesPrintemps.get(r.id)).sort().pop() : null, prog: [nbP, ruches.length || 1],
    suite: !gotP && String(aujourdhui) > `${an}-04-15` ? "Se rejoue au printemps prochain" : "",
  });

  ajoute("cent-visites", "100 visites", "Cent visites notées dans la saison.", compteur(dv, 100));
  ajoute("premiere-recolte", "Première récolte", "Ta première récolte enregistrée.", { got: recoltes.length > 0, date: premieres(recoltes, "date_recolte")[0] });

  // Tournée sans oubli : toutes les ruches d'un rucher (au moins deux) visitées le même jour.
  let dateTournee = null;
  const parJour = new Map();
  for (const v of visites) { const j = String(v.date_visite).slice(0, 10); if (!parJour.has(j)) parJour.set(j, new Set()); parJour.get(j).add(v.ruche_id); }
  for (const j of [...parJour.keys()].sort()) {
    if ([...ruchers.values()].some((ids) => ids.length >= 2 && ids.every((id) => parJour.get(j).has(id)))) { dateTournee = j; break; }
  }
  ajoute("tournee", "Tournée sans oubli", "Toutes les ruches d’un rucher vues le même jour.", { got: !!dateTournee, date: dateTournee });

  ajoute("premiere-vente", "Première vente", "Ton premier produit vendu et noté.", { got: ventes.length > 0, date: ventes[0] });

  // Tous les ruchers vus ce mois-ci (le mois en cours).
  const mois = String(aujourdhui).slice(0, 7), moisNom = MOIS[Number(mois.slice(5, 7)) - 1];
  const vusMois = [...ruchers.values()].filter((ids) => (d.visites || []).some((v) => String(v.date_visite).startsWith(mois) && ids.includes(v.ruche_id)));
  const gotM = ruchers.size > 0 && vusMois.length === ruchers.size;
  const derniere = gotM ? [...ruchers.values()].map((ids) => (d.visites || []).filter((v) => String(v.date_visite).startsWith(mois) && ids.includes(v.ruche_id)).map((v) => String(v.date_visite).slice(0, 10)).sort()[0]).sort().pop() : null;
  ajoute(`ruchers-${mois}`, `Tous les ruchers en ${moisNom}`, `Chaque rucher visité au moins une fois en ${moisNom}.`, { got: gotM, date: derniere, prog: [vusMois.length, ruchers.size || 1] });

  // Objectif de récolte (réglage de l'exploitation, 100 kg à défaut).
  const but = Number(objectif) > 0 ? Number(objectif) : 100;
  let cumul = 0, dateObj = null;
  for (const r of [...recoltes].sort((a, b) => String(a.date_recolte).localeCompare(String(b.date_recolte)))) {
    cumul += Number(r.kg) || 0;
    if (!dateObj && cumul >= but - 1e-9) dateObj = String(r.date_recolte).slice(0, 10);
  }
  ajoute("objectif", `${fmt(but)} kg de miel`, Number(objectif) > 0 ? `Ton objectif de la saison : ${fmt(but)} kg récoltés.` : `Récolter ${fmt(but)} kg dans la saison (objectif réglable dans Réglages).`,
    { got: cumul >= but - 1e-9, date: dateObj, prog: [Math.min(Math.round(cumul), but), but] });

  const s = meilleureSerie(dv, 8);
  ajoute("serie", "8 semaines d’affilée", "Au moins une visite chaque semaine, huit semaines de suite.", { got: s.best >= 8, date: s.atteint, prog: [Math.min(s.best, 8), 8] });

  ajoute("cinquante-ventes", "50 ventes", "Cinquante ventes notées dans la saison.", compteur(ventes, 50));
  ajoute("varroa", "Œil sur le varroa", "Dix comptages de varroa notés dans la saison.", compteur(premieres(visites.filter((v) => v.varroa != null && v.varroa !== ""), "date_visite"), 10));
  ajoute("pesees", "Pesées régulières", "Vingt pesées notées dans la saison.", compteur(premieres(visites.filter((v) => v.poids_kg != null && v.poids_kg !== ""), "date_visite"), 20));
  return L;
}
const fmt = (x) => String(Math.round(x * 10) / 10).replace(".", ",");

/** Texte de progression d'un jalon pas encore gagné : « 212/300 », sinon sa suite. */
export const progression = (j) => (j.suite ? j.suite : j.prog ? `${j.prog[0]}/${j.prog[1]}` : "");

/**
 * Jalons nouvellement gagnés depuis la dernière fois (ids gardés sur l'appareil). Première fois (rien de gardé) :
 * aucun n'est annoncé, pour ne pas fêter d'un coup toute une saison déjà faite.
 */
export function nouveaux(liste, vus) {
  if (!Array.isArray(vus)) return [];
  const deja = new Set(vus);
  return liste.filter((j) => j.got && !deja.has(j.id));
}
