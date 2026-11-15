// Apiviz — règles des visites (IT-03, AP-FEAT-014). Fonctions pures.
// appliquerVisite reproduit dans les données du téléphone ce que fait creer_visite (migrations 006 à 009) :
// la visite, ses intrants, la baisse du stock des articles et l'état de la ruche. Elle sert
//   - à afficher une visite gardée sur le téléphone (hors ligne, offline.js) ;
//   - à mettre l'écran à jour après un enregistrement réussi, sans relire toutes les tables.

/** Ajoute la visite p (charge envoyée à creer_visite, avec son id) aux données d ; extra complète la ligne. */
export function appliquerVisite(d, p, extra = {}) {
  if (d.visites.some((v) => v.id === p.id)) return d;
  d.visites.push({
    id: p.id, ruche_id: p.ruche_id, date_visite: p.date_visite, activite: p.activite, provisions: p.provisions,
    reine: p.reine, couvain: p.couvain, poids_kg: p.poids_kg === "" || p.poids_kg == null ? null : Number(p.poids_kg),
    varroa: p.varroa === "" || p.varroa == null ? null : Number(p.varroa), note: p.note,
    traitement: p.traitement || "", lot_produit: p.lot_produit || "", traitement_dose: p.traitement_dose || "",
    retrait_prevu: p.retrait_prevu || null, ordonnance: !!p.ordonnance,
    varroa_methode: p.varroa_methode || "", varroa_abeilles: p.varroa_abeilles ? Number(p.varroa_abeilles) : null,
    observes: Array.isArray(p.observes) ? [...p.observes] : null, duree_s: p.duree_s ?? null,
    force: p.force === "" || p.force == null ? null : Number(p.force), oeufs_vus: typeof p.oeufs_vus === "boolean" ? p.oeufs_vus : null,
    cellules_royales: p.cellules_royales || null, ...extra,
  });
  d.visites.sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)));
  for (const x of p.intrants || []) {
    d.intrants.push({ visite_id: p.id, article_id: x.article_id, quantite: x.quantite });
    const a = d.articles.find((y) => y.id === x.article_id);
    if (a) a.stock = Number(a.stock) - Number(x.quantite);
  }
  const r = d.ruches.find((y) => y.id === p.ruche_id);
  if (r && p.etat) r.etat = p.etat;
  return d;
}

// ---------- Visite express (v5.32, AP-FEAT-037, migration 020 ; champs de 023, v5.43) ----------
// La visite reprend les valeurs de la précédente ; seuls les champs touchés sont « observés » (visites.observes).
// Ne sont jamais repris (à regarder à chaque visite, même règle que la tournée, tournee.js) : la reine, les œufs et les
// cellules royales. Les cellules royales et les œufs se « dévalident » d'un second toucher (vide = pas regardé).

export const CHOIX_CELLULES = ["Aucune", "Ouvertes", "Operculées"];
/** Champs de la visite express, dans l'ordre de l'écran. repris : la valeur de la dernière visite sert de départ. */
export const CHAMPS_EXPRESS = [
  { k: "activite", nom: "Activité", choix: ["Faible", "Normale", "Forte"], repris: true },
  { k: "provisions", nom: "Provisions", choix: ["Faibles", "Moyennes", "Bonnes"], repris: true },
  { k: "couvain", nom: "Couvain", choix: ["Non vu", "Réduit", "Normal", "Abondant"], repris: true },
  { k: "force", nom: "Force", choix: ["1", "2", "3", "4", "5"], repris: true, vide: true, nouveau: true },
  { k: "oeufs_vus", nom: "Œufs vus", choix: ["Oui", "Non"], repris: false, vide: true, nouveau: true },
  { k: "cellules_royales", nom: "Cellules royales", choix: CHOIX_CELLULES, repris: false, vide: true, nouveau: true },
  { k: "reine", nom: "Reine", choix: ["Vue", "Non vue", "Non cherchée"], repris: false },
  { k: "poids_kg", nom: "Poids", repris: true },
  { k: "etat", nom: "État", choix: ["Bonne", "À surveiller", "Critique"], repris: true },
];
const DEPART = { activite: "Normale", provisions: "Moyennes", couvain: "Non vu", force: "", oeufs_vus: "", cellules_royales: "",
  reine: "Non cherchée", poids_kg: "", etat: "Bonne" };

/** Valeurs de départ d'une visite express : celles de la dernière visite (et l'état actuel de la ruche). */
export function departExpress(derniere, ruche) {
  const v = { ...DEPART, etat: ruche?.etat || DEPART.etat };
  if (derniere) {
    for (const c of CHAMPS_EXPRESS) {
      if (!c.repris || c.k === "etat") continue;
      const x = derniere[c.k];
      if (c.k === "poids_kg") v.poids_kg = x === null || x === undefined || x === "" ? "" : Number(x);
      else if (c.k === "couvain") v.couvain = x || "Non vu";
      else if (c.k === "force") v.force = x === null || x === undefined || x === "" ? "" : String(x);
      else if (x && c.choix.includes(x)) v[c.k] = x;
    }
  }
  return v;
}

/** Vrai si la valeur est vide (pas notée) : rien à reprendre ni à afficher « comme le ». */
export const vide = (x) => x === "" || x === null || x === undefined;

/** Ce que devient chaque champ : « change » (touché, autre valeur), « vu » (touché, même valeur), « repris », « non vu ». */
export function etatChamp(k, valeurs, depart, touches) {
  if (touches.includes(k)) return String(valeurs[k]) === String(depart[k]) ? "vu" : "change";
  const c = CHAMPS_EXPRESS.find((x) => x.k === k);
  return c?.repris && !(c.vide && vide(depart[k])) ? "repris" : "non vu";
}

/** Résumé en bas de l'écran : changements, valeurs reprises, points à regarder (jamais repris, pas encore touchés). */
export function resumeExpress(valeurs, depart, touches) {
  const e = CHAMPS_EXPRESS.map((c) => etatChamp(c.k, valeurs, depart, touches));
  return { changes: e.filter((x) => x === "change").length, vus: e.filter((x) => x === "vu").length,
    repris: e.filter((x) => x === "repris").length, aRegarder: e.filter((x) => x === "non vu").length };
}

/** « 12/05 » : jour et mois d'une date AAAA-MM-JJ (mention « comme le … » des valeurs reprises). */
export const jourMoisCourt = (date) => (/^\d{4}-\d{2}-\d{2}/.test(String(date)) ? `${String(date).slice(8, 10)}/${String(date).slice(5, 7)}` : "");

/** « 24 s », « 1 min 12 » : durée d'une saisie. */
export function dureeTexte(s) {
  const t = Math.max(0, Math.round(Number(s) || 0));
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, "0")}`;
}

/** Œufs : « Oui » → true, « Non » → false, sinon null (pas regardé). Accepte aussi un booléen. */
export const oeufsVersBase = (x) => (x === true || x === "Oui" ? true : x === false || x === "Non" ? false : null);
/** Force : un entier de 1 à 5, sinon "" (pas notée). */
export const forceVersBase = (x) => { const f = Number(x); return vide(x) || !Number.isInteger(f) || f < 1 || f > 5 ? "" : f; };

/** Durée en secondes depuis le début de la saisie, ou null si on ne la connaît pas. */
export const dureeDepuis = (debut, maintenant = Date.now()) => (debut ? Math.max(0, Math.round((maintenant - debut) / 1000)) : null);

/** Charge envoyée à creer_visite. observes : les champs touchés (et la note si elle est écrite). */
export function chargeExpress({ id, ruche_id, date_visite, valeurs, touches, note = "", debut, maintenant = Date.now() }) {
  const observes = CHAMPS_EXPRESS.map((c) => c.k).filter((k) => touches.includes(k));
  if (String(note).trim()) observes.push("note");
  const poids = vide(valeurs.poids_kg) ? "" : Number(valeurs.poids_kg);
  return {
    id, ruche_id, date_visite, activite: valeurs.activite, provisions: valeurs.provisions, reine: valeurs.reine,
    couvain: valeurs.couvain === "Non vu" ? "" : valeurs.couvain, etat: valeurs.etat, poids_kg: poids, varroa: "",
    varroa_methode: "", varroa_abeilles: "", note: String(note).trim(), intrants: [], observes,
    force: forceVersBase(valeurs.force), oeufs_vus: oeufsVersBase(valeurs.oeufs_vus), cellules_royales: valeurs.cellules_royales || "",
    duree_s: dureeDepuis(debut, maintenant),
  };
}

// ---------- Essaimage (v5.43) ----------
// Des cellules royales operculées à la dernière visite d'une colonie active : alerte « Essaimage » (accueil, tableau)
// et tâche proposée. Repère d'observation, sans seuil ni délai réglementaire : l'échéance proposée se change.
export const JOURS_TACHE_ESSAIMAGE = 6;

/** Dernière visite de chaque colonie active dont les cellules royales étaient operculées. [{ ruche, visite }] */
export function alertesEssaimage(d) {
  const der = new Map();
  for (const v of d.visites || []) {
    const a = der.get(v.ruche_id);
    if (!a || String(v.date_visite) > String(a.date_visite) || (v.date_visite === a.date_visite && String(v.created_at || "") > String(a.created_at || ""))) der.set(v.ruche_id, v);
  }
  return (d.ruches || []).filter((r) => !r.sortie && (!r.statut || r.statut === "active"))
    .map((r) => ({ ruche: r, visite: der.get(r.id) })).filter((x) => x.visite?.cellules_royales === "Operculées")
    .sort((a, b) => String(a.ruche.nom).localeCompare(String(b.ruche.nom), "fr", { numeric: true }));
}

/** Tâche proposée après une visite avec cellules operculées : titre et échéance (AAAA-MM-JJ, modifiable). */
export function tacheEssaimage(nomRuche, jour, jours = JOURS_TACHE_ESSAIMAGE) {
  const d = new Date(String(jour) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + jours);
  return { titre: `Surveiller l’essaimage · ${nomRuche}`, echeance: d.toISOString().slice(0, 10) };
}

/** Une visite faite en express (observes renseigné) : les champs repris, pour le journal. */
export function champsRepris(visite) {
  if (!Array.isArray(visite?.observes)) return [];
  return CHAMPS_EXPRESS.filter((c) => c.repris && c.k !== "etat" && !visite.observes.includes(c.k) && !vide(visite[c.k])).map((c) => c.k);
}

/** Ruche suivante pour enchaîner : même rucher, active, dans l'ordre des noms, pas encore visitée ce jour-là. */
export function rucheSuivante(d, rucheId, jour) {
  const cle = (r) => r.rucher_id || r.rucher || "";
  const r = (d.ruches || []).find((x) => x.id === rucheId);
  if (!r) return null;
  const meme = (d.ruches || []).filter((x) => cle(x) === cle(r) && !x.sortie && (!x.statut || x.statut === "active"))
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
  const vue = (x) => (d.visites || []).some((v) => v.ruche_id === x.id && v.date_visite === jour);
  const i = meme.findIndex((x) => x.id === rucheId);
  return [...meme.slice(i + 1), ...meme.slice(0, i)].find((x) => !vue(x)) || null;
}
