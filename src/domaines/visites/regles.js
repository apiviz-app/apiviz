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
    observes: Array.isArray(p.observes) ? [...p.observes] : null, duree_s: p.duree_s ?? null, ...extra,
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

// ---------- Visite express (v5.32, AP-FEAT-037, migration 020) ----------
// La visite reprend les valeurs de la précédente ; seuls les champs touchés sont « observés » (visites.observes).
// La reine n'est jamais reprise : elle doit être revue à chaque visite (même règle que la tournée, tournee.js).

/** Champs de la visite express, dans l'ordre de l'écran. repris : la valeur de la dernière visite sert de départ. */
export const CHAMPS_EXPRESS = [
  { k: "activite", nom: "Activité", choix: ["Faible", "Normale", "Forte"], repris: true },
  { k: "provisions", nom: "Provisions", choix: ["Faibles", "Moyennes", "Bonnes"], repris: true },
  { k: "couvain", nom: "Couvain", choix: ["Non vu", "Réduit", "Normal", "Abondant"], repris: true },
  { k: "reine", nom: "Reine", choix: ["Vue", "Non vue", "Non cherchée"], repris: false },
  { k: "poids_kg", nom: "Poids", repris: true },
  { k: "etat", nom: "État", choix: ["Bonne", "À surveiller", "Critique"], repris: true },
];
const DEPART = { activite: "Normale", provisions: "Moyennes", couvain: "Non vu", reine: "Non cherchée", poids_kg: "", etat: "Bonne" };

/** Valeurs de départ d'une visite express : celles de la dernière visite (et l'état actuel de la ruche). */
export function departExpress(derniere, ruche) {
  const v = { ...DEPART, etat: ruche?.etat || DEPART.etat };
  if (derniere) {
    for (const c of CHAMPS_EXPRESS) {
      if (!c.repris || c.k === "etat") continue;
      const x = derniere[c.k];
      if (c.k === "poids_kg") v.poids_kg = x === null || x === undefined || x === "" ? "" : Number(x);
      else if (c.k === "couvain") v.couvain = x || "Non vu";
      else if (x && c.choix.includes(x)) v[c.k] = x;
    }
  }
  return v;
}

/** Ce que devient chaque champ : « change » (touché, autre valeur), « vu » (touché, même valeur), « repris », « non vu ». */
export function etatChamp(k, valeurs, depart, touches) {
  if (touches.includes(k)) return String(valeurs[k]) === String(depart[k]) ? "vu" : "change";
  return CHAMPS_EXPRESS.find((c) => c.k === k)?.repris ? "repris" : "non vu";
}

/** Résumé en bas de l'écran : nombre de changements et de valeurs reprises. */
export function resumeExpress(valeurs, depart, touches) {
  const e = CHAMPS_EXPRESS.map((c) => etatChamp(c.k, valeurs, depart, touches));
  return { changes: e.filter((x) => x === "change").length, vus: e.filter((x) => x === "vu").length, repris: e.filter((x) => x === "repris").length };
}

/** Charge envoyée à creer_visite. observes : les champs touchés (et la note si elle est écrite). */
export function chargeExpress({ id, ruche_id, date_visite, valeurs, touches, note = "", debut, maintenant = Date.now() }) {
  const observes = CHAMPS_EXPRESS.map((c) => c.k).filter((k) => touches.includes(k));
  if (String(note).trim()) observes.push("note");
  const poids = valeurs.poids_kg === "" || valeurs.poids_kg === null || valeurs.poids_kg === undefined ? "" : Number(valeurs.poids_kg);
  return {
    id, ruche_id, date_visite, activite: valeurs.activite, provisions: valeurs.provisions, reine: valeurs.reine,
    couvain: valeurs.couvain === "Non vu" ? "" : valeurs.couvain, etat: valeurs.etat, poids_kg: poids, varroa: "",
    varroa_methode: "", varroa_abeilles: "", note: String(note).trim(), intrants: [], observes,
    duree_s: debut ? Math.max(0, Math.round((maintenant - debut) / 1000)) : null,
  };
}

/** Une visite faite en express (observes renseigné) : les champs repris, pour le journal. */
export function champsRepris(visite) {
  if (!Array.isArray(visite?.observes)) return [];
  return CHAMPS_EXPRESS.filter((c) => c.repris && !visite.observes.includes(c.k)).map((c) => c.k);
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
