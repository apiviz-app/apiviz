// Apiviz — règles des reines et de la filiation entre colonies (IT-07, AP-FEAT-032 à 034).
// Fonctions pures, testées par tests/unitaires/reines.test.mjs. Elles reproduisent côté téléphone ce que fait la base
// (migration 019) : affichage immédiat d'une saisie gardée hors ligne, et lecture sur une base sans 019 (repli sur
// les colonnes reine de ruches et sur ruche_evenements.autre_ruche_id).

/**
 * Couleurs de marquage : code international en usage en apiculture, cycle de 5 ans d'après le dernier chiffre de
 * l'année de naissance (1 ou 6 : blanc ; 2 ou 7 : jaune ; 3 ou 8 : rouge ; 4 ou 9 : vert ; 5 ou 0 : bleu).
 * Même table que la v5 (v3.js MARQUE) et que public.couleur_marquage() (019).
 */
export const MARQUAGES = {
  blanc: ["Blanc", "#F4F4F4"], jaune: ["Jaune", "#F2C200"], rouge: ["Rouge", "#C62828"], vert: ["Vert", "#2E7D32"],
  bleu: ["Bleu", "#1565C0"], aucun: ["Non marquée", ""],
};
const CYCLE = ["bleu", "blanc", "jaune", "rouge", "vert"];
export const ORIGINES = ["", "Élevée par la colonie", "Essaim naturel", "Achetée", "Élevage maison"];
export const STATUTS_REINE = { en_place: "En place", remplacee: "Remplacée", morte: "Morte", disparue: "Disparue", vendue: "Vendue" };
export const DEVENIRS = ["remplacee", "morte", "disparue", "vendue"];
const ANNEE_MIN = 1990;

/** Couleur de marquage (clé de MARQUAGES) d'une reine née cette année-là ; "aucun" si l'année est inconnue. */
export const couleurMarquage = (annee) => (Number.isInteger(Number(annee)) && annee !== null && annee !== "" ? CYCLE[Number(annee) % 5] : "aucun");

/** Âge en clair : « de l’année », « 1 an », « 3 ans ». */
export function age(annee, anCourant) {
  const a = Number(anCourant) - Number(annee);
  return a <= 0 ? "de l’année" : `${a} an${a > 1 ? "s" : ""}`;
}

const toutes = (d) => [...(d.ruches || []), ...(d.ruchesSorties || [])];
const colonie = (d, id) => toutes(d).find((r) => r.id === id);

/**
 * Reines d'une colonie, de la plus récente à la plus ancienne. Sans ligne dans d.reines (base sans 019, ou colonie
 * pas encore reprise), la reine notée dans les colonnes de la ruche est montrée telle quelle (repli, sans identifiant).
 */
export function reinesDe(d, r) {
  if (!r) return [];
  const l = (d.reines || []).filter((x) => x.colonie_id === r.id)
    .sort((a, b) => String(b.en_place_du).localeCompare(String(a.en_place_du)) || (a.statut === "en_place" ? -1 : b.statut === "en_place" ? 1 : 0));
  if (l.length || !r.annee_reine) return l;
  return [{ id: null, colonie_id: r.id, annee_naissance: Number(r.annee_reine), marquage: couleurMarquage(r.annee_reine), origine: r.reine_origine || "",
    en_place_du: r.reine_introduite || r.date_installation || null, en_place_au: null, statut: "en_place", clippee: false, notes: "", _repli: true }];
}

/** La reine en place d'une colonie, ou undefined. */
export const reineEnPlace = (d, r) => reinesDe(d, r).find((x) => x.statut === "en_place");

const lendemain = (j) => { const t = new Date(j + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
const frDate = (j) => (j ? `${String(j).slice(8, 10)}/${String(j).slice(5, 7)}/${String(j).slice(0, 4)}` : "");

function controleAnnee(annee, date, aujourdhui) {
  if (annee === null || annee === undefined || annee === "" || !Number.isInteger(Number(annee))) return "Indique l’année de naissance de la reine.";
  if (!date) return "Choisis la date d’introduction.";
  if (aujourdhui && date > lendemain(aujourdhui)) return "La date d’introduction ne peut pas être dans le futur.";
  if (Number(annee) < ANNEE_MIN || Number(annee) > Number(String(date).slice(0, 4))) return `L’année de naissance doit être comprise entre ${ANNEE_MIN} et l’année d’introduction.`;
  return "";
}

/**
 * Contrôles de changer_reine() faits avant l'envoi : message en français, ou "" si tout va bien.
 * p : { colonie_id, annee, date } ; `actif` : la colonie est active ou orpheline.
 */
export function controleReine(d, p, aujourdhui, actif = true) {
  const r = colonie(d, p.colonie_id);
  if (!r) return "Colonie introuvable";
  if (!actif) return `${r.nom} n’est plus active.`;
  const e = controleAnnee(p.annee, p.date, aujourdhui);
  if (e) return e;
  const o = reineEnPlace(d, r);
  if (o && o.en_place_du && String(o.en_place_du) > p.date) return `La reine en place l’est depuis le ${frDate(o.en_place_du)} : choisis une date à partir de ce jour.`;
  return "";
}

/** Contrôles de corriger_reine() avant l'envoi. p : { id, annee, date }. */
export function controleCorrection(d, p, aujourdhui) {
  const o = (d.reines || []).find((x) => x.id === p.id);
  if (!o) return "Reine introuvable";
  const e = controleAnnee(p.annee, p.date, aujourdhui);
  if (e) return e;
  if (o.en_place_au && p.date > String(o.en_place_au)) return `Cette reine a été remplacée le ${frDate(o.en_place_au)} : choisis une date d’introduction antérieure.`;
  const avant = (d.reines || []).filter((x) => x.colonie_id === o.colonie_id && x.id !== o.id && x.en_place_au && String(x.en_place_au) > p.date
    && String(x.en_place_du) <= String(o.en_place_du)).sort((a, b) => String(b.en_place_au).localeCompare(String(a.en_place_au)))[0];
  if (avant) return `La reine précédente était en place jusqu’au ${frDate(avant.en_place_au)} : choisis une date à partir de ce jour.`;
  return "";
}

/** Texte de la ligne « reine » du journal, au format de la v5 (« Reine 2026 · achetée »). */
export const detailReine = (annee, origine) => [`Reine ${annee}`, String(origine || "").trim().toLowerCase()].filter(Boolean).join(" · ");

function versRuche(d, r) {
  const o = (d.reines || []).find((x) => x.colonie_id === r.id && x.statut === "en_place");
  Object.assign(r, o ? { annee_reine: o.annee_naissance, reine_origine: o.origine, reine_introduite: o.en_place_du }
    : { annee_reine: null, reine_origine: "", reine_introduite: null });
}

/**
 * Applique changer_reine() aux données du téléphone (saisie gardée hors ligne).
 * p : { id, colonie_id, annee, date, origine, marquage, clippee, notes, ancienne }. Idempotent par p.id.
 */
export function appliquerReine(d, p, extra = {}) {
  d.reines ||= []; d.evenements ||= [];
  if (d.reines.some((x) => x.id === p.id)) return d;
  const r = colonie(d, p.colonie_id);
  if (!r) return d;
  let o = d.reines.find((x) => x.colonie_id === r.id && x.statut === "en_place");
  if (!o) {
    // Reine connue seulement par les colonnes de la ruche : elle entre dans l'historique avant d'être clôturée.
    const repli = reineEnPlace(d, r);
    if (repli) { o = { ...repli, id: `${p.id}:avant`, _repli: undefined }; d.reines.push(o); }
  }
  if (o) Object.assign(o, { statut: DEVENIRS.includes(p.ancienne) ? p.ancienne : "remplacee", en_place_au: p.date });
  d.reines.push({ id: p.id, colonie_id: r.id, annee_naissance: Number(p.annee), marquage: p.marquage || couleurMarquage(p.annee),
    origine: String(p.origine || "").trim(), en_place_du: p.date, en_place_au: null, statut: "en_place", clippee: !!p.clippee,
    notes: String(p.notes || "").trim(), ...extra });
  versRuche(d, r);
  if (r.statut === "orpheline") r.statut = "active";
  d.evenements.unshift({ id: `${p.id}:evt`, ruche_id: r.id, type: "reine", date_evenement: p.date, detail: detailReine(p.annee, p.origine), autre_ruche_id: null, ...extra });
  return d;
}

/** Applique corriger_reine() aux données du téléphone. Un champ absent de p n'est pas touché. */
export function appliquerCorrection(d, p) {
  const o = (d.reines || []).find((x) => x.id === p.id);
  if (!o) return d;
  if (p.annee !== undefined && p.annee !== "") o.annee_naissance = Number(p.annee);
  if (p.date) o.en_place_du = p.date;
  if (p.marquage) o.marquage = p.marquage;
  if ("origine" in p) o.origine = String(p.origine || "").trim();
  if ("clippee" in p) o.clippee = !!p.clippee;
  if ("notes" in p) o.notes = String(p.notes || "").trim();
  const r = colonie(d, o.colonie_id);
  if (r && o.statut === "en_place") versRuche(d, r);
  return d;
}

// ---------- Filiation ----------
const TYPE_LIEN = { division: "division", essaimage: "essaim", reunion: "reunion" };

/**
 * Lien de filiation que donne un événement du journal, comme le déclencheur de 019, ou null.
 * division, essaim : parent = colonie d'origine, enfant = nouvelle colonie ; reunion : parent = colonie réunie
 * (absorbée), enfant = colonie qui l'accueille.
 */
export function lienDeEvenement(e) {
  const type = TYPE_LIEN[e.type];
  if (!type || !e.autre_ruche_id || e.autre_ruche_id === e.ruche_id) return null;
  const [parent_id, enfant_id] = type === "reunion" ? [e.autre_ruche_id, e.ruche_id] : [e.ruche_id, e.autre_ruche_id];
  return { id: `evt:${e.id}`, parent_id, enfant_id, type, date_lien: e.date_evenement, evenement_id: e.id };
}

/** Liens connus : la table colonie_liens (019) ; sur une base sans 019 (`absente`), déduits du journal. */
export function liens(d, absente = false) {
  if (!absente) return d.liens || [];
  return (d.evenements || []).map(lienDeEvenement).filter(Boolean);
}

/** Vrai si relier parent → enfant par division ou essaim ferait une boucle (comme lien_ferait_boucle() de 019). */
export function feraitBoucle(l, parentId, enfantId) {
  if (parentId === enfantId) return true;
  const vus = new Set(), pile = [enfantId];
  while (pile.length) {
    const id = pile.pop();
    for (const x of l) {
      if (x.parent_id !== id || x.type === "reunion" || vus.has(x.enfant_id)) continue;
      if (x.enfant_id === parentId) return true;
      vus.add(x.enfant_id); pile.push(x.enfant_id);
    }
  }
  return false;
}

/**
 * Lignée d'une colonie : d'où elle vient (division ou essaim), ce qui en est issu, les colonies réunies en elle et
 * celle dans laquelle elle a été réunie. Chaque entrée : { lien, autre } (autre : l'autre colonie, ou undefined si
 * elle a été supprimée). Du plus récent au plus ancien.
 */
export function lignee(d, id, absente = false) {
  const l = liens(d, absente), tri = (a, b) => String(b.lien.date_lien).localeCompare(String(a.lien.date_lien));
  const avec = (x, autreId) => ({ lien: x, autre: colonie(d, autreId) });
  return {
    origine: l.filter((x) => x.enfant_id === id && x.type !== "reunion").map((x) => avec(x, x.parent_id)).sort(tri)[0],
    issues: l.filter((x) => x.parent_id === id && x.type !== "reunion").map((x) => avec(x, x.enfant_id)).sort(tri),
    reunies: l.filter((x) => x.enfant_id === id && x.type === "reunion").map((x) => avec(x, x.parent_id)).sort(tri),
    reunieDans: l.filter((x) => x.parent_id === id && x.type === "reunion").map((x) => avec(x, x.enfant_id)).sort(tri)[0],
  };
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** 2026-05-12 → « 12 mai » ; l'année est ajoutée quand ce n'est pas l'année en cours. */
export function jourMois(date, anCourant) {
  if (!date) return "";
  const [a, m, j] = String(date).slice(0, 10).split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}${anCourant && a !== Number(anCourant) ? " " + a : ""}`;
}

/** AP-US-038 : « Issue de Ruche 2 le 12 mai » (division) ou « Essaim de Ruche 2 le 12 mai ». */
export function phraseOrigine(lien, nomParent, anCourant) {
  const nom = nomParent || "une colonie supprimée";
  return `${lien.type === "essaim" ? "Essaim de" : "Issue de"} ${nom} le ${jourMois(lien.date_lien, anCourant)}`;
}

// ---------- Journal unifié (AP-TECH-122) ----------
/**
 * Visites et événements d'une colonie dans l'ordre des dates, du plus récent au plus ancien :
 * [{ genre: "visite", date, visite } | { genre: "evenement", date, evenement }]. Le même jour, la visite vient
 * d'abord. Une colonie sans événement « installation » reçoit sa date d'installation (comme la v5).
 */
export function journal(d, r) {
  const vis = (d.visites || []).filter((v) => v.ruche_id === r.id).map((v) => ({ genre: "visite", date: String(v.date_visite || ""), visite: v }));
  const evs = (d.evenements || []).filter((e) => e.ruche_id === r.id);
  const lignes = evs.map((e) => ({ genre: "evenement", date: String(e.date_evenement || ""), evenement: e }));
  if (r.date_installation && !evs.some((e) => e.type === "installation")) {
    lignes.push({ genre: "evenement", date: String(r.date_installation), evenement: { id: null, ruche_id: r.id, type: "installation", date_evenement: r.date_installation, detail: "" } });
  }
  // Tri stable : l'ordre d'arrivée (visites puis événements, chacun déjà du plus récent au plus ancien) départage un même jour.
  return [...vis, ...lignes].map((x, i) => [x, i]).sort((a, b) => b[0].date.localeCompare(a[0].date) || a[1] - b[1]).map(([x]) => x);
}
