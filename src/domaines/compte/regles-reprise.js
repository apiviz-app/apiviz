// Apiviz — reprendre son carnet (v5.85, maquette « Onboarding irréprochable », écrans 5 et 6). Règles pures, testées
// par tests/unitaires/reprise.test.mjs : lecture d'un tableur (CSV, ou lignes déjà lues d'un Excel), colonnes
// reconnues, valeurs ramenées à celles de la visite, plan d'import, soit ruches renommées, créées et visites, charges de
// creer_visite. Le relevé d'une photo (fonction « lire-carnet ») a la même forme que celui d'un tableur.

const sansAccent = (s) => String(s ?? "").replace(/œ/gi, "oe").replace(/æ/gi, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Lit un CSV (séparateur ; , ou tabulation deviné sur la première ligne, guillemets doublés). [[cellules]] */
export function lireCsv(texte) {
  const t = String(texte ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const premiere = t.split("\n")[0] || "";
  const compte = (c) => premiere.split(c).length - 1;
  const sep = [";", "\t", ","].reduce((a, c) => (compte(c) > compte(a) ? c : a), ";");
  const lignes = [];
  let ligne = [], cellule = "", guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"' && cellule === "") guillemets = true;
    else if (c === sep) { ligne.push(cellule.trim()); cellule = ""; }
    else if (c === "\n") { ligne.push(cellule.trim()); lignes.push(ligne); ligne = []; cellule = ""; }
    else cellule += c;
  }
  if (cellule !== "" || ligne.length) { ligne.push(cellule.trim()); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x !== ""));
}

/** Colonnes qu'on sait reprendre, avec les mots qui les désignent dans un en-tête. */
export const COLONNES = [
  { k: "ruche", nom: "Ruche", mots: ["ruche", "colonie", "n° ruche", "numero", "num", "nom", "code", "id"] },
  { k: "rucher", nom: "Rucher", mots: ["rucher", "emplacement", "lieu", "site"] },
  { k: "date", nom: "Date", mots: ["date", "jour", "visite le", "le"] },
  { k: "reine", nom: "Reine", mots: ["reine", "reine vue", "ponte"] },
  { k: "couvain", nom: "Couvain", mots: ["couvain", "cadres de couvain", "cadres couvain", "nb cadres"] },
  { k: "provisions", nom: "Provisions", mots: ["provisions", "reserves", "réserves", "miel", "nourriture", "poids estime"] },
  { k: "activite", nom: "Activité", mots: ["activite", "activité", "humeur", "comportement", "force"] },
  { k: "poids", nom: "Poids", mots: ["poids", "pesee", "pesée", "kg"] },
  { k: "note", nom: "Note", mots: ["note", "notes", "remarque", "remarques", "observation", "observations", "commentaire", "commentaires", "travaux", "intervention"] },
];

/** Colonnes reconnues d'après la ligne d'en-tête : { ruche: 0, date: 1, … } (une colonne ne sert qu'une fois). */
export function detecterColonnes(entetes) {
  const h = (entetes || []).map(sansAccent);
  const pris = new Set(), m = {};
  for (const c of COLONNES) {
    const mots = c.mots.map(sansAccent);
    let i = h.findIndex((x, j) => !pris.has(j) && mots.includes(x));
    if (i < 0) i = h.findIndex((x, j) => !pris.has(j) && x && mots.some((w) => w.length > 2 && x.includes(w)));
    if (i >= 0) { m[c.k] = i; pris.add(i); }
  }
  return m;
}

/** Date d'une cellule : « 12/09/2026 », « 12/09/26 », « 2026-09-12 », un nombre de jours Excel ou un Date. "" sinon. */
export function dateTableur(v, jour = "9999-12-31") {
  let d = "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) d = v.toISOString().slice(0, 10);
  else if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v ?? "").trim())) {
    const n = Number(v);
    if (n > 20000 && n < 80000) d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 864e5).toISOString().slice(0, 10);
  } else {
    const s = String(v ?? "").trim();
    let x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (x) d = `${x[1]}-${x[2].padStart(2, "0")}-${x[3].padStart(2, "0")}`;
    else if ((x = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/))) {
      const an = x[3].length === 2 ? `20${x[3]}` : x[3];
      d = `${an}-${x[2].padStart(2, "0")}-${x[1].padStart(2, "0")}`;
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const t = new Date(d + "T12:00:00Z");
  if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== d || d > jour) return "";
  return d;
}

/** Valeur d'une cellule ramenée à celles de la visite ; "" si on ne sait pas. Couvain : un nombre de cadres compte. */
export function valeur(champ, v) {
  const s = sansAccent(v);
  if (!s) return "";
  const n = Number(s.replace(",", "."));
  if (champ === "reine") {
    if (/^(non|absente?|pas vue|orpheline|x|0|-)$/.test(s) || /pas vu|non vu|absent|orphel/.test(s)) return "Non vue";
    if (/^(oui|vue|ok|v|1|presente?|marquee)$/.test(s) || /\bvue\b|presente|ok|oeufs|ponte/.test(s)) return "Vue";
    return "";
  }
  if (champ === "couvain") {
    if (Number.isFinite(n)) return n <= 0 ? "" : n <= 3 ? "Réduit" : n <= 6 ? "Normal" : "Abondant";
    if (/peu|faible|reduit|petit/.test(s)) return "Réduit";
    if (/abondant|beaucoup|fort|plein|gros/.test(s)) return "Abondant";
    if (/normal|moyen|bon|ok/.test(s)) return "Normal";
    return "";
  }
  if (champ === "provisions") {
    if (/faible|peu|leger|vide|nourrir|0/.test(s)) return "Faibles";
    if (/bonne|bon|lourd|plein|beaucoup/.test(s)) return "Bonnes";
    if (/moyen|correct|ok|normal/.test(s)) return "Moyennes";
    return "";
  }
  if (champ === "activite") {
    if (Number.isFinite(n)) return n <= 2 ? "Faible" : n >= 4 ? "Forte" : "Normale";
    if (/faible|peu|calme plat|mou/.test(s)) return "Faible";
    if (/forte|fort|nerveu|agressi|vive/.test(s)) return "Forte";
    if (/normal|calme|douce|moyen|bonne/.test(s)) return "Normale";
    return "";
  }
  return "";
}

/** Poids en kg (« 38,5 », « 38 kg »), null sinon. */
const poids = (v) => { const n = Number(String(v ?? "").replace(",", ".").replace(/[^\d.]/g, "")); return Number.isFinite(n) && n > 0 && n <= 200 ? Math.round(n * 10) / 10 : null; };

/**
 * Carnet tiré d'un tableur : lignes (la première est l'en-tête), colonnes reconnues. Une ligne = une visite d'une ruche
 * (ou une ruche seule, sans date). Même forme que le relevé d'une photo : { lisible, ruches: [{ nom, rucher, visites }] }.
 */
export function tableurVersCarnet(lignes, colonnes, jour) {
  const c = colonnes || {}, ruches = new Map();
  if (c.ruche === undefined) return { lisible: false, raison: "Je ne trouve pas la colonne des ruches.", ruches: [] };
  for (const l of (lignes || []).slice(1)) {
    const nom = String(l[c.ruche] ?? "").trim().slice(0, 60);
    if (!nom) continue;
    const cle = sansAccent(nom);
    if (!ruches.has(cle)) ruches.set(cle, { nom, rucher: c.rucher !== undefined ? String(l[c.rucher] ?? "").trim().slice(0, 80) : "", a_verifier: false, raison: "", propositions: [], visites: [] });
    const r = ruches.get(cle);
    const date = c.date !== undefined ? dateTableur(l[c.date], jour) : "";
    if (!date) continue;
    const brut = (k) => (c[k] !== undefined ? l[c[k]] : "");
    const cadres = Number(String(brut("couvain")).replace(",", "."));
    r.visites.push({ date, reine: valeur("reine", brut("reine")), oeufs_vus: /oeuf|ponte/.test(sansAccent(brut("reine"))) ? true : null,
      couvain: valeur("couvain", brut("couvain")), provisions: valeur("provisions", brut("provisions")), activite: valeur("activite", brut("activite")),
      cadres_couvain: Number.isFinite(cadres) && cadres > 0 ? cadres : null, poids_kg: poids(brut("poids")), note: String(brut("note") ?? "").trim().slice(0, 400) });
  }
  for (const r of ruches.values()) r.visites.sort((a, b) => a.date.localeCompare(b.date));
  return { lisible: ruches.size > 0, raison: ruches.size ? "" : "Aucune ruche trouvée dans ce fichier.", ruches: [...ruches.values()] };
}

/** { ruches, visites, doutes } d'un carnet (photo ou tableur). */
export function resume(carnet) {
  const r = carnet?.ruches || [];
  return { ruches: r.length, visites: r.reduce((t, x) => t + (x.visites?.length || 0), 0), doutes: r.filter((x) => x.a_verifier).length };
}

const AUTO = /^ruche \d+$/;

/**
 * Plan d'import. existantes : ruches de l'exploitation [{ id, nom, rucher }], visitees : Set des ids qui ont déjà une
 * visite, choix : { index de ruche du carnet: nom choisi | null (ignorée) } pour les doutes.
 *  - une ruche du carnet qui porte le nom d'une ruche existante la reprend ;
 *  - sinon elle prend, dans l'ordre, une ruche créée d'office (« Ruche 3 ») et jamais visitée, qui est renommée ;
 *  - sinon elle est créée (rucher du carnet, ou le premier rucher).
 * Rend { renommer: [{ id, ancien, nom }], creer: [{ cle, nom, rucher }], visites: [{ ruche, visite }] } où ruche est
 * l'id d'une ruche existante ou la clé d'une ruche à créer.
 */
export function planImport(existantes, visitees, carnet, choix = {}) {
  const ex = existantes || [], vues = visitees instanceof Set ? visitees : new Set(visitees || []);
  const parNom = new Map(ex.map((r) => [sansAccent(r.nom), r]));
  const libres = ex.filter((r) => AUTO.test(sansAccent(r.nom)) && !vues.has(r.id));
  const pris = new Set(), plan = { renommer: [], creer: [], visites: [] };
  (carnet?.ruches || []).forEach((x, i) => {
    let nom = x.nom;
    if (x.a_verifier) { if (choix[i] === null) return; if (choix[i]) nom = choix[i]; }
    let cible = parNom.get(sansAccent(nom));
    if (cible && pris.has(cible.id)) cible = null;
    if (!cible) {
      const l = libres.find((r) => !pris.has(r.id) && !parNom.has(sansAccent(nom)));
      if (l) { cible = l; if (l.nom !== nom) plan.renommer.push({ id: l.id, ancien: l.nom, nom }); }
    }
    let ref;
    if (cible) { pris.add(cible.id); ref = cible.id; }
    else { ref = `nouvelle-${i}`; plan.creer.push({ cle: ref, nom, rucher: x.rucher || ex[0]?.rucher || "" }); }
    for (const v of x.visites || []) plan.visites.push({ ruche: ref, visite: v });
  });
  return plan;
}

/** Charge de creer_visite pour une visite reprise ; seuls les champs lus sont « observés ». etat : celui de la ruche
 *  aujourd'hui (une visite reprise ne le change pas). */
export function chargeVisite(v, { id, ruche_id, etat = "Bonne" }) {
  const observes = ["reine", "couvain", "provisions", "activite"].filter((k) => v[k]);
  if (typeof v.oeufs_vus === "boolean") observes.push("oeufs_vus");
  if (v.poids_kg) observes.push("poids_kg");
  if (v.note) observes.push("note");
  return { id, ruche_id, date_visite: v.date, activite: v.activite || "Normale", provisions: v.provisions || "Moyennes",
    reine: v.reine || "Non cherchée", couvain: v.couvain || "", etat, poids_kg: v.poids_kg ?? "", varroa: "", varroa_methode: "",
    varroa_abeilles: "", note: v.note ? `${v.note} (repris du carnet)` : "Repris du carnet", intrants: [], observes,
    force: "", oeufs_vus: typeof v.oeufs_vus === "boolean" ? v.oeufs_vus : null, cellules_royales: "", duree_s: null };
}

/** « 8 ruches et 14 visites », « 1 ruche ». */
export function texteImport(nr, nv) {
  const r = `${nr} ruche${nr > 1 ? "s" : ""}`;
  return nv ? `${r} et ${nv} visite${nv > 1 ? "s" : ""}` : r;
}
