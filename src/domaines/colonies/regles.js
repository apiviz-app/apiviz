// Apiviz — règles des colonies : statut, emplacements, déplacements, contenants (IT-06, AP-FEAT-028 à 031).
// Fonctions pures, testées par tests/unitaires/colonies.test.mjs. Elles reproduisent côté téléphone ce que fait la base
// (migration 016) : affichage immédiat d'une saisie gardée hors ligne, et lecture sur une base sans 016 (repli).

export const STATUTS = { active: "Active", orpheline: "Orpheline", morte: "Morte", reunie: "Réunie", vendue: "Vendue", perdue: "Perdue" };
const DE_SORTIE = { Morte: "morte", Vendue: "vendue", "Réunie": "reunie", Perdue: "perdue" };
const VERS_SORTIE = { morte: "Morte", vendue: "Vendue", reunie: "Réunie", perdue: "Perdue" };

/** Statut d'une colonie : la colonne statut (016), sinon déduit de sortie (base sans 016). */
export function statut(r) {
  if (!r) return "active";
  if (r.statut && STATUTS[r.statut]) {
    // Base sans le déclencheur (données d'exemple) : une sortie notée l'emporte sur un statut resté « active ».
    if (r.sortie && (r.statut === "active" || r.statut === "orpheline")) return DE_SORTIE[r.sortie] || r.statut;
    return r.statut;
  }
  return DE_SORTIE[r.sortie] || "active";
}

/** Une colonie active compte dans les chiffres : active ou orpheline (AP-US-035). */
export const estActive = (r) => ["active", "orpheline"].includes(statut(r));
export const sortieDe = (s) => VERS_SORTIE[s] || "";

/** Colonies comptées, et colonies sorties (encore consultables), avec filtre facultatif par statut (AP-TECH-109). */
export function parStatut(ruches, filtre = "") {
  return (ruches || []).filter((r) => (filtre ? statut(r) === filtre : true));
}

/** Emplacements d'une colonie, du plus récent au plus ancien. */
export function emplacementsDe(emplacements, colonieId) {
  return (emplacements || []).filter((e) => e.colonie_id === colonieId).sort((a, b) => String(b.du).localeCompare(String(a.du)));
}

/**
 * Rucher (id) d'une colonie à une date (AP-US-032), comme public.rucher_a_date() : période [du, au).
 * undefined : aucun emplacement connu à cette date (historique antérieur à IT-06, ou base sans 016).
 */
export function rucherADate(emplacements, colonieId, date) {
  const d = String(date || "").slice(0, 10);
  const e = (emplacements || []).find((x) => x.colonie_id === colonieId && String(x.du) <= d && (!x.au || String(x.au) > d));
  return e ? e.rucher_id ?? null : undefined;
}

/** Colonies d'un lot qui bougeront vraiment (les autres sont déjà dans le rucher de destination). */
export const aDeplacer = (ruches, ids, dest) => (ruches || []).filter((r) => ids.includes(r.id) && r.rucher_id !== dest);

/**
 * Contrôles de deplacer_colonies() faits avant l'envoi : message d'erreur en français, ou "" si tout va bien.
 * `aujourdhui` : date du téléphone (AAAA-MM-JJ).
 */
export function controleDeplacement(d, p, aujourdhui) {
  const ids = p.colonies || [];
  if (!ids.length) return "Choisis au moins une colonie.";
  if (!p.rucher_id) return "Choisis le rucher de destination.";
  const dest = (d.ruchers || []).find((x) => x.id === p.rucher_id);
  if (!dest) return "Rucher introuvable";
  if (dest.archive_le) return "Ce rucher est archivé : il n’accepte plus de colonie.";
  if (!p.date) return "Choisis la date du déplacement.";
  if (aujourdhui && p.date > lendemain(aujourdhui)) return "La date du déplacement ne peut pas être dans le futur.";
  const ruches = (d.ruches || []).filter((r) => ids.includes(r.id));
  const morte = ruches.find((r) => !estActive(r));
  if (morte) return `${morte.nom} n’est plus active : elle ne peut pas être déplacée.`;
  const bougent = aDeplacer(ruches, ids, p.rucher_id);
  if (!bougent.length) return "Ces colonies sont déjà dans ce rucher.";
  for (const r of bougent) {
    const ouvert = (d.emplacements || []).find((e) => e.colonie_id === r.id && !e.au);
    if (ouvert && String(ouvert.du) > p.date) return `${r.nom} est arrivée dans son rucher actuel le ${frDate(ouvert.du)} : choisis une date à partir de ce jour.`;
  }
  return "";
}

/** Texte de la ligne du registre, au format de la v5.10 (« Verger vers Lande, motif, notes »). */
export const detailDeplacement = (origine, destination, motif, notes) =>
  [`${origine || "Sans rucher"} vers ${destination}`, motif, notes].map((x) => String(x || "").trim()).filter(Boolean).join(", ");

/**
 * Applique un déplacement aux données du téléphone, comme deplacer_colonies() (saisie gardée hors ligne).
 * p : { id, date, rucher_id, colonies, motif, notes }. Idempotent (ne refait rien si le déplacement est déjà là).
 */
export function appliquerDeplacement(d, p, extra = {}) {
  d.deplacements ||= []; d.emplacements ||= []; d.evenements ||= [];
  if (d.deplacements.some((x) => x.id === p.id)) return d;
  const dest = (d.ruchers || []).find((x) => x.id === p.rucher_id);
  if (!dest) return d;
  const bougent = aDeplacer(d.ruches, p.colonies || [], p.rucher_id);
  if (!bougent.length) return d;
  const origines = [...new Set(bougent.map((r) => r.rucher_id ?? null))];
  d.deplacements.unshift({ id: p.id, date_deplacement: p.date, rucher_origine_id: origines.length === 1 ? origines[0] : null,
    rucher_destination_id: dest.id, motif: p.motif || "", nb_colonies: bougent.length, notes: p.notes || "", ...extra });
  for (const r of bougent) {
    const origine = (d.ruchers || []).find((x) => x.id === r.rucher_id);
    d.evenements.unshift({ id: `${p.id}:${r.id}`, ruche_id: r.id, type: "deplacement", date_evenement: p.date,
      detail: detailDeplacement(origine?.nom, dest.nom, p.motif, p.notes), deplacement_id: p.id, ...extra });
    const ouvert = d.emplacements.find((e) => e.colonie_id === r.id && !e.au);
    if (ouvert && String(ouvert.du) >= p.date) Object.assign(ouvert, { rucher_id: dest.id, deplacement_id: p.id });
    else {
      if (ouvert) ouvert.au = p.date;
      d.emplacements.push({ id: `${p.id}:${r.id}:e`, colonie_id: r.id, rucher_id: dest.id, du: p.date, au: null, deplacement_id: p.id, ...extra });
    }
    Object.assign(r, { rucher_id: dest.id, rucher: dest.nom, ...(dest.lat != null ? { lat: dest.lat, lng: dest.lng } : {}) });
  }
  return d;
}

/** Applique un changement de statut (changer_statut(), p : {id, colonie_id, statut, date}) aux données du téléphone. */
export function appliquerStatut(d, p) {
  const r = [...(d.ruches || []), ...(d.ruchesSorties || [])].find((x) => x.id === p.colonie_id);
  if (!r || statut(r) === p.statut) return d;
  const actif = p.statut === "active" || p.statut === "orpheline";
  Object.assign(r, { statut: p.statut, sortie: sortieDe(p.statut), date_sortie: actif ? null : p.date });
  return d;
}

/** Ligne d'occupation ouverte d'une colonie (son contenant actuel), ou undefined. */
export const occupationDe = (occupations, colonieId) => (occupations || []).find((o) => o.colonie_id === colonieId && !o.au);

/** Colonie (active) qui occupe un contenant aujourd'hui, ou undefined : une colonie qui n'est plus active le libère. */
export function occupant(occupations, ruches, contenantId) {
  const o = (occupations || []).find((x) => x.contenant_id === contenantId && !x.au);
  if (!o) return undefined;
  const r = (ruches || []).find((x) => x.id === o.colonie_id);
  return r && estActive(r) ? r : undefined;
}

/** Applique affecter_contenant() aux données du téléphone. */
export function appliquerContenant(d, p) {
  d.occupations ||= [];
  if (d.occupations.some((o) => o.id === p.id)) return d;
  const actuel = occupationDe(d.occupations, p.colonie_id);
  if (actuel && actuel.contenant_id === (p.contenant_id || null)) return d;
  if (actuel) {
    if (String(actuel.du) === p.date) d.occupations.splice(d.occupations.indexOf(actuel), 1);
    else actuel.au = p.date;
  }
  if (p.contenant_id) {
    const autre = d.occupations.find((o) => o.contenant_id === p.contenant_id && !o.au);
    if (autre) autre.au = p.date;
    d.occupations.push({ id: p.id, colonie_id: p.colonie_id, contenant_id: p.contenant_id, du: p.date, au: null });
  }
  return d;
}

/**
 * Lignes « Mouvements » du registre pour une année (AP-TECH-106) : les déplacements (table deplacements) avec leurs
 * colonies (lignes reliées de ruche_evenements), puis les autres mouvements. Même contenu et même ordre qu'avant 016 :
 * [{ date_evenement, ruche_id, type, detail }], du plus récent au plus ancien.
 */
export function lignesMouvements(d, types, an) {
  const evs = (d.evenements || []).filter((e) => types.includes(e.type) && Number(String(e.date_evenement).slice(0, 4)) === an);
  const deps = new Map((d.deplacements || []).map((x) => [x.id, x]));
  return evs.map((e) => {
    const dep = e.type === "deplacement" && e.deplacement_id ? deps.get(e.deplacement_id) : null;
    return dep ? { ...e, date_evenement: dep.date_deplacement || e.date_evenement, deplacement: dep } : e;
  });
}

const lendemain = (j) => { const t = new Date(j + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
const frDate = (j) => (j ? `${String(j).slice(8, 10)}/${String(j).slice(5, 7)}/${String(j).slice(0, 4)}` : "");
