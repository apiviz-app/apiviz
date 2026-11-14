// Apiviz — règles du tableau des colonies (v5.37, maquettes « Affichage des ruches » validées le 13 nov. 2026, piste 5).
// Fonctions pures, testées par tests/unitaires/tableau.test.mjs : une ligne par colonie active (état, force, reine,
// varroa, provisions, dernière visite, rucher, à faire), filtres, tri et synthèse. Aucune donnée nouvelle : tout vient
// des colonnes existantes (ruches, visites, reines) ; aucun seuil nouveau sauf ceux déjà en usage dans l'app
// (seuil varroa réglable, 3 % par défaut ; « proche du seuil » aux deux tiers, comme ux.js ; 30 jours sans visite,
// comme l'accueil d'app.js).
import { statut, estActive } from "./regles.js";
import { reineEnPlace, couleurMarquage } from "./reines.js";
import { tauxVarroa } from "../sante/regles.js";
import { n, days } from "../../noyau/format.js";

export const JOURS_SANS_VISITE = 30;
export const NIVEAUX = { urg: { rang: 0, libelle: "Urgent", ton: "crit" }, watch: { rang: 1, libelle: "À surveiller", ton: "watch" }, ok: { rang: 2, libelle: "OK", ton: "good" } };
export const FORCES = ["Faible", "Normale", "Forte"];
export const PROVISIONS = ["Faibles", "Moyennes", "Bonnes"];

/** Colonnes du tableau, dans l'ordre (la colonne Colonie est toujours là). `defaut` : affichée au départ. */
export const COLONNES = [
  { id: "niveau", libelle: "État", aide: "OK, à surveiller, urgent", defaut: true },
  { id: "force", libelle: "Force", aide: "Activité à la dernière visite", defaut: true },
  { id: "reine", libelle: "Reine", aide: "Année et couleur de marquage", defaut: true },
  { id: "varroa", libelle: "Varroa", aide: "Dernier comptage", defaut: true },
  { id: "provisions", libelle: "Provisions", aide: "À la dernière visite", defaut: true },
  { id: "visite", libelle: "Visite", aide: "Jours depuis la dernière", defaut: true },
  { id: "rucher", libelle: "Rucher", aide: "Utile pour plusieurs ruchers", defaut: false },
  { id: "afaire", libelle: "À faire", aide: "Ce qui demande ton attention", defaut: false },
];

export const filtresVides = () => ({ ruchers: [], niveaux: [], reines: [], varroa: false, provisions: false, visite: false });
export const nbFiltres = (f) => f.ruchers.length + f.niveaux.length + f.reines.length + (f.varroa ? 1 : 0) + (f.provisions ? 1 : 0) + (f.visite ? 1 : 0);

const pire = (a, b) => (NIVEAUX[a].rang <= NIVEAUX[b].rang ? a : b);

/**
 * Une ligne par colonie active (active ou orpheline), dans l'ordre de d.ruches.
 * `seuil` : seuil varroa de l'exploitation (varroas pour 100 abeilles) ; `aujourdhui` : Date (pour les jours écoulés).
 */
export function lignes(d, { seuil = 3, aujourdhui = new Date() } = {}) {
  const parRuche = new Map();
  for (const v of [...(d.visites || [])].sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)))) {
    if (!parRuche.has(v.ruche_id)) parRuche.set(v.ruche_id, []);
    parRuche.get(v.ruche_id).push(v);
  }
  const ruchers = new Map((d.ruchers || []).map((r) => [r.id, r.nom]));
  return (d.ruches || []).filter(estActive).map((r) => {
    const vs = parRuche.get(r.id) || [], der = vs[0] || null;
    const comptage = vs.find((v) => v.varroa != null) || null;
    const taux = tauxVarroa(comptage);
    const orpheline = statut(r) === "orpheline";
    const reine = orpheline ? null : reineEnPlace(d, r);
    const annee = reine?.annee_naissance ? Number(reine.annee_naissance) : null;
    const jours = der ? days(der.date_visite, aujourdhui) : null;
    const raisons = [];
    const ajoute = (niveau, type, texte) => raisons.push({ niveau, type, texte });
    if (orpheline) ajoute("urg", "orpheline", "Orpheline");
    if (r.etat === "Critique") ajoute("urg", "critique", "État critique");
    if (taux !== null && taux >= seuil) ajoute("urg", "varroa", `Varroa ${n(taux, 1)} % (seuil ${n(seuil, 1)} %)`);
    else if (taux !== null && taux >= seuil * 0.66) ajoute("watch", "varroa", `Varroa ${n(taux, 1)} % : proche du seuil`);
    if (r.etat === "À surveiller") ajoute("watch", "surveiller", "État à surveiller");
    if (der?.provisions === "Faibles") ajoute("watch", "provisions", "Provisions faibles");
    if (jours !== null && jours > JOURS_SANS_VISITE) ajoute("watch", "visite", `Pas visitée depuis ${jours} jours`);
    const niveau = raisons.reduce((m, x) => pire(m, x.niveau), "ok");
    raisons.sort((a, b) => NIVEAUX[a.niveau].rang - NIVEAUX[b.niveau].rang);
    return {
      id: r.id, nom: r.nom || "", code: r.code || "",
      rucherId: r.rucher_id || null, rucher: ruchers.get(r.rucher_id) || String(r.rucher || "").trim() || "Sans rucher",
      niveau, raisons,
      force: FORCES.includes(der?.activite) ? der.activite : null,
      orpheline, reine: annee, marquage: annee ? reine.marquage || couleurMarquage(annee) : "aucun",
      varroa: taux, varroaBrut: comptage && taux === null ? comptage.varroa : null,
      provisions: PROVISIONS.includes(der?.provisions) ? der.provisions : null,
      poids: der?.poids_kg != null && der.poids_kg !== "" ? Number(der.poids_kg) : null,
      jours, derniere: der?.date_visite || null,
      alertes: { varroa: taux !== null && taux >= seuil, provisions: der?.provisions === "Faibles", visite: jours !== null && jours > JOURS_SANS_VISITE },
      visites: vs.slice(0, 3),
    };
  });
}

/** Clé du filtre « Reine » d'une ligne : l'année, « absente » (orpheline) ou « inconnue ». */
export const cleReine = (l) => (l.orpheline ? "absente" : l.reine ? String(l.reine) : "inconnue");
export const libelleReine = (k) => (k === "absente" ? "Absente" : k === "inconnue" ? "Non notée" : k);

const normal = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lignes qui passent la recherche (nom ou code) et les filtres. */
export function filtrer(ls, f, q = "") {
  const t = normal(q).trim();
  return ls.filter((l) => {
    if (t && !normal(`${l.nom} ${l.code}`).includes(t)) return false;
    if (f.ruchers.length && !f.ruchers.includes(l.rucher)) return false;
    if (f.niveaux.length && !f.niveaux.includes(l.niveau)) return false;
    if (f.reines.length && !f.reines.includes(cleReine(l))) return false;
    if (f.varroa && !l.alertes.varroa) return false;
    if (f.provisions && !l.alertes.provisions) return false;
    if (f.visite && !l.alertes.visite) return false;
    return true;
  });
}

const comparer = new Intl.Collator("fr", { numeric: true, sensitivity: "base" }).compare;
// Valeur de tri d'une colonne : sens 1 = ce qui demande de l'attention d'abord. null : toujours en fin de liste.
const CLES = {
  nom: (l) => l.nom,
  niveau: (l) => NIVEAUX[l.niveau].rang,
  force: (l) => (l.force ? FORCES.indexOf(l.force) : null),
  reine: (l) => (l.orpheline ? -1 : l.reine ?? null),
  varroa: (l) => (l.varroa !== null ? -l.varroa : null),
  provisions: (l) => (l.provisions ? PROVISIONS.indexOf(l.provisions) : null),
  visite: (l) => (l.jours === null ? -Infinity : -l.jours),
  rucher: (l) => l.rucher,
  afaire: (l) => -l.raisons.length,
};

/** Lignes triées sur une colonne ; `sens` : 1 ou -1. À égalité : niveau, puis nom. */
export function trier(ls, cle = "niveau", sens = 1) {
  const k = CLES[cle] || CLES.niveau;
  const cmp = (a, b) => (typeof a === "string" || typeof b === "string" ? comparer(String(a), String(b)) : a - b);
  return [...ls].sort((a, b) => {
    const va = k(a), vb = k(b);
    if (va === null && vb !== null) return 1;
    if (vb === null && va !== null) return -1;
    const r = va === null ? 0 : cmp(va, vb) * sens;
    return r || NIVEAUX[a.niveau].rang - NIVEAUX[b.niveau].rang || comparer(a.nom, b.nom);
  });
}

/** Texte de la ligne de synthèse, par colonne, pour les lignes affichées. */
export function synthese(ls) {
  const nb = (fn) => ls.filter(fn).length;
  const tx = ls.filter((l) => l.varroa !== null);
  const vus = ls.filter((l) => l.jours !== null);
  const plur = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;
  const urg = nb((l) => l.niveau === "urg"), watch = nb((l) => l.niveau === "watch");
  return {
    niveau: urg || watch ? [urg ? `${urg} urg.` : "", watch ? `${watch} à voir` : ""].filter(Boolean).join(" · ") : "Tout va bien",
    force: nb((l) => l.force === "Faible") ? plur(nb((l) => l.force === "Faible"), "faible") : "aucune faible",
    reine: nb((l) => l.orpheline) ? plur(nb((l) => l.orpheline), "absente") : "toutes là",
    varroa: tx.length ? `moy. ${n(tx.reduce((s, l) => s + l.varroa, 0) / tx.length, 1)} %` : "–",
    provisions: nb((l) => l.alertes.provisions) ? plur(nb((l) => l.alertes.provisions), "faible") : "aucune faible",
    visite: vus.length ? `moy. ${Math.round(vus.reduce((s, l) => s + l.jours, 0) / vus.length)} j` : "–",
    rucher: plur(new Set(ls.map((l) => l.rucher)).size, "rucher"),
    afaire: nb((l) => l.raisons.length) ? plur(nb((l) => l.raisons.length), "colonie") + " à voir" : "rien à faire",
  };
}

/** Options des filtres, avec le nombre de colonies de chacune (sur toutes les lignes). */
export function options(ls) {
  const compte = (fn) => ls.filter(fn).length;
  const ruchers = [...new Set(ls.map((l) => l.rucher))].sort(comparer);
  const reines = [...new Set(ls.map(cleReine))].sort((a, b) => (/^\d+$/.test(b) && /^\d+$/.test(a) ? b - a : /^\d+$/.test(a) ? -1 : /^\d+$/.test(b) ? 1 : a === "absente" ? -1 : 1));
  return {
    ruchers: ruchers.map((r) => ({ v: r, libelle: r, n: compte((l) => l.rucher === r) })),
    niveaux: Object.keys(NIVEAUX).map((k) => ({ v: k, libelle: NIVEAUX[k].libelle, n: compte((l) => l.niveau === k) })),
    reines: reines.map((k) => ({ v: k, libelle: libelleReine(k), n: compte((l) => cleReine(l) === k) })),
    seuils: [
      { v: "varroa", libelle: "Varroa au-dessus du seuil", n: compte((l) => l.alertes.varroa) },
      { v: "provisions", libelle: "Provisions faibles", n: compte((l) => l.alertes.provisions) },
      { v: "visite", libelle: `Pas visitée depuis ${JOURS_SANS_VISITE} jours`, n: compte((l) => l.alertes.visite) },
    ],
  };
}

/** Lignes du fichier exporté (tableur), mêmes valeurs qu'à l'écran. */
export function exporter(ls) {
  const entetes = ["Colonie", "Code", "Rucher", "État", "Force", "Reine", "Varroa (%)", "Provisions", "Dernière visite", "À faire"];
  const lignesCsv = ls.map((l) => [l.nom, l.code, l.rucher, NIVEAUX[l.niveau].libelle, l.force || "", l.orpheline ? "Absente" : l.reine || "",
    l.varroa !== null ? n(l.varroa, 1) : l.varroaBrut !== null ? `${l.varroaBrut} varroas` : "", l.provisions || "", l.derniere || "", l.raisons.map((x) => x.texte).join(" · ")]);
  return { entetes, lignes: lignesCsv };
}

/**
 * Texte très court d'une colonie pour une tuile (alvéoles, v5.40) : la première raison, sinon le varroa et les jours
 * depuis la dernière visite.
 */
export function court(l) {
  const r = l.raisons[0];
  if (r) return { orpheline: "Orpheline", critique: "Critique", varroa: `Varroa ${l.varroa !== null ? n(l.varroa, 1) + " %" : ""}`.trim(),
    surveiller: "À surveiller", provisions: "Provisions", visite: `${l.jours} j sans visite` }[r.type] || r.texte;
  if (l.jours === null) return "Jamais vue";
  return l.varroa !== null ? `${n(l.varroa, 1)} % · ${l.jours} j` : `${l.jours} j`;
}

/**
 * Lignes rangées par rucher, dans l'ordre des ruchers donné (v5.40). `ruchers` : [{ cle, nom, ids }] (ids : toutes les
 * colonies du rucher). Chaque groupe garde l'ordre des lignes reçues (déjà triées). Une colonie d'aucun rucher connu
 * va dans un groupe « Sans rucher » en fin de liste. `garderVides` : garder les ruchers sans ligne.
 */
export function grouper(ls, ruchers, { garderVides = false } = {}) {
  const ou = new Map();
  ruchers.forEach((g, i) => g.ids.forEach((id) => ou.set(id, i)));
  const groupes = ruchers.map((g) => ({ ...g, lignes: [] }));
  const reste = [];
  for (const l of ls) (ou.has(l.id) ? groupes[ou.get(l.id)].lignes : reste).push(l);
  const out = groupes.filter((g) => garderVides || g.lignes.length);
  if (reste.length) out.push({ cle: "", nom: "Sans rucher", ids: reste.map((l) => l.id), lignes: reste });
  return out;
}
