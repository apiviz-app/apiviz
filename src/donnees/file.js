// Apiviz — file d'opérations hors ligne, version 2 (IT-09, AP-FEAT-043 à 045). Fonctions pures, sans IndexedDB ni
// réseau : offline.js (HL) garde la file sur le téléphone et l'envoie ; ici, ce qu'est une opération, comment elles se
// fusionnent, dans quel ordre elles partent et comment elles s'affichent.
//
// Format d'une opération (AP-TECH-146). Une opération de la file v1 (créations seules) en est un cas particulier :
//   { id            identifiant de l'opération dans la file (UUID)
//     v: 2          version du format (absente : opération de la file v1, reprise par reprendre())
//     type          "rpc" (fonction SQL, args.p) ou "insert" (lignes d'une table, idempotentes par leur id)
//     nom, args     pour "rpc" : la fonction et ses paramètres ; table, lignes pour "insert"
//     op            "creer" | "modifier" | "supprimer"
//     table, cible  pour modifier et supprimer : la table et l'identifiant de la ligne visée
//     depend_de     identifiants d'autres opérations de la file qui doivent partir avant (colonie créée avant sa visite)
//     ex            exploitation où la saisie a été faite (elle ne part que dans celle-ci)
//     cree          horodatage (ordre d'envoi)
//     statut        absent (en attente), "quarantaine" (refusée par le serveur) ou "conflit" (AP-FEAT-044)
//     resume        [titre, détail] figés au moment de la saisie (la ligne visée peut ne plus être affichée) }
// Une modification envoie modifier_saisie({ table, id, champs, avant, version }) ; une suppression
// supprimer_saisie({ table, id, version }) (migration 026). Les deux renvoient { statut: "ok" | "conflit", … }.

export const QUARANTAINE = "quarantaine";
export const CONFLIT = "conflit";

// Liste blanche, identique à public.colonnes_modifiables() de la migration 026 (vérifié par un test unitaire).
export const MODIFIABLES = {
  visites: ["date_visite", "activite", "provisions", "reine", "couvain", "poids_kg", "force", "oeufs_vus",
    "cellules_royales", "varroa", "varroa_methode", "varroa_abeilles", "traitement", "lot_produit", "traitement_dose",
    "retrait_prevu", "ordonnance", "note"],
  ruches: ["nom", "type_ruche", "etat", "notes", "hausses", "equipement", "annee_reine", "code", "origine"],
  recoltes: ["date_recolte", "kg", "hausses", "humidite", "miel", "extraction"],
  depenses: ["date_depense", "categorie", "libelle", "montant", "nature", "duree_amort", "piece"],
  taches: ["titre", "echeance", "assigne", "faite", "faite_le"],
};
// Identique à la liste de public.supprimer_saisie().
export const SUPPRIMABLES = ["visites", "recoltes", "depenses", "taches", "ventes"];
// Table de la base -> liste des données du téléphone (S.d).
export const CLE = { visites: "visites", ruches: "ruches", recoltes: "recoltes", depenses: "depenses", taches: "taches", ventes: "ventes",
  reglements_associes: "reglements", mouvements_stock: "mouvements" };

// Champs vides à envoyer comme « rien » (null) : nombres et dates.
const VIDES_NULL = new Set(["poids_kg", "force", "varroa", "varroa_abeilles", "retrait_prevu", "kg", "hausses", "humidite",
  "montant", "duree_amort", "annee_reine", "echeance", "faite_le", "oeufs_vus"]);

export const LIBELLES = {
  date_visite: "Date", activite: "Activité", provisions: "Provisions", reine: "Reine", couvain: "Couvain", poids_kg: "Poids (kg)",
  force: "Force", oeufs_vus: "Œufs vus", cellules_royales: "Cellules royales", varroa: "Varroa", varroa_methode: "Méthode varroa",
  varroa_abeilles: "Abeilles comptées", traitement: "Traitement", lot_produit: "Lot du produit", traitement_dose: "Dose",
  retrait_prevu: "Retrait prévu", ordonnance: "Ordonnance", note: "Note", nom: "Nom", type_ruche: "Type de ruche", etat: "État",
  notes: "Notes", hausses: "Hausses", equipement: "Équipement", annee_reine: "Année de la reine", code: "Code", origine: "Origine",
  date_recolte: "Date", kg: "Quantité (kg)", humidite: "Humidité", miel: "Miel", extraction: "Extraction", date_depense: "Date",
  categorie: "Catégorie", libelle: "Libellé", montant: "Montant (€)", nature: "Nature", duree_amort: "Durée d’amortissement",
  piece: "Pièce", titre: "Tâche", echeance: "Échéance", assigne: "Pour", faite: "Faite", faite_le: "Faite le",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const estRpc = (it, nom) => it?.type === "rpc" && it.nom === nom;
export const estModif = (it) => estRpc(it, "modifier_saisie");
export const estSuppr = (it) => estRpc(it, "supprimer_saisie");
export const enAttente = (it) => it.statut !== QUARANTAINE && it.statut !== CONFLIT;

/** Identifiants des objets qu'une opération crée (visite, vente, colonie, ligne…). */
export function crees(it) {
  if (!it) return [];
  if (it.type === "insert") return (it.lignes || []).map((l) => l.id).filter(Boolean);
  if (it.type === "rpc" && !estModif(it) && !estSuppr(it) && /^creer_|^enregistrer_|^changer_reine$|^mettre_en_pots$/.test(it.nom || "")) {
    return it.args?.p?.id ? [it.args.p.id] : [];
  }
  return [];
}

/** Tous les identifiants cités par une opération (hors ceux qu'elle crée elle-même). */
export function references(it) {
  const vus = new Set(), propres = new Set(crees(it));
  const parcourir = (x) => {
    if (typeof x === "string") { if (UUID.test(x) && !propres.has(x)) vus.add(x); return; }
    if (Array.isArray(x)) return x.forEach(parcourir);
    if (x && typeof x === "object") Object.values(x).forEach(parcourir);
  };
  parcourir(it.type === "insert" ? it.lignes : it.args);
  return [...vus];
}

/** Opérations de la file dont dépend `it` : celles qui créent un objet qu'elle cite (colonie avant sa visite). */
export function dependances(it, file) {
  const refs = new Set(references(it));
  if (!refs.size) return [];
  return file.filter((o) => o.id !== it.id && crees(o).some((x) => refs.has(x))).map((o) => o.id);
}

/** Reprise d'une opération de la file v1 (AP-TECH-148) : même contenu, format 2. Sans effet sur une opération v2. */
export function reprendre(it, file = []) {
  if (it?.v === 2) return it;
  return { ...it, v: 2, op: "creer", depend_de: dependances(it, file.filter((o) => (o.cree || 0) < (it.cree || 0))) };
}

/** Ordre d'envoi : création d'abord dans l'ordre de saisie. */
export const ordonner = (file) => [...file].sort((a, b) => (a.cree || 0) - (b.cree || 0));

/**
 * L'opération dont `it` attend l'envoi, ou null si elle peut partir. Une dépendance encore dans la file (en attente,
 * refusée ou en conflit) la retient : elle ne part pas, et n'est jamais supprimée pour autant.
 */
export function bloquante(it, file) {
  for (const d of it.depend_de || []) {
    const o = file.find((x) => x.id === d);
    if (o) return o;
  }
  return null;
}

/** Ramène les valeurs saisies au format attendu par la base (champs vides des nombres et dates : null). */
export function normaliserChamps(champs) {
  const r = {};
  for (const [k, v] of Object.entries(champs || {})) r[k] = v === "" && VIDES_NULL.has(k) ? null : v;
  return r;
}

/** Une modification de cette table et de ces champs peut-elle être gardée sur le téléphone ? */
export const modifiable = (table, champs) => !!MODIFIABLES[table] && Object.keys(champs || {}).length > 0
  && Object.keys(champs).every((k) => MODIFIABLES[table].includes(k));

/** Création encore dans la file qui porte l'objet `id` de cette table (visite, ligne…), ou null. */
export function creationDe(file, table, id) {
  return file.find((it) => (it.type === "insert" ? it.table === table && (it.lignes || []).some((l) => l.id === id)
    : table === "visites" && estRpc(it, "creer_visite") ? it.args?.p?.id === id
    : table === "ventes" && estRpc(it, "creer_vente") ? it.args?.p?.id === id : false)) || null;
}

/** Applique `champs` à une création encore dans la file (la modification part avec elle). Renvoie l'opération modifiée. */
export function corrigerCreation(it, id, champs) {
  const c = structuredClone(it);
  if (c.type === "insert") c.lignes = c.lignes.map((l) => (l.id === id ? { ...l, ...champs } : l));
  else c.args = { ...c.args, p: { ...c.args.p, ...champs } };
  return c;
}

/** Modification en attente (pas en conflit) de la même ligne, avec laquelle fusionner, ou null. */
export const modifEnAttente = (file, table, id) =>
  file.find((it) => estModif(it) && it.statut !== CONFLIT && it.args.p.table === table && it.args.p.id === id) || null;

/**
 * Nouvelle modification d'une ligne déjà envoyée. `objet` est la ligne telle qu'affichée (sa version, ses valeurs
 * avant la modification). Si une modification de la même ligne attend déjà, elle est complétée : on garde la version
 * et les valeurs « avant » de la première, pour que le serveur juge les conflits par rapport à ce qu'on avait vu.
 */
export function modification({ table, id, champs, objet, existante }) {
  champs = normaliserChamps(champs);
  if (existante) {
    const p = existante.args.p, avant = { ...p.avant };
    for (const k of Object.keys(champs)) if (!(k in avant) && objet && k in objet) avant[k] = objet[k] ?? null;
    return { ...existante, args: { p: { ...p, champs: { ...p.champs, ...champs }, avant } } };
  }
  const avant = {};
  for (const k of Object.keys(champs)) if (objet && k in objet) avant[k] = objet[k] ?? null;
  return { type: "rpc", nom: "modifier_saisie", v: 2, op: "modifier", table, cible: id,
    args: { p: { table, id, champs, avant, version: objet?.modifie_le || null } } };
}

/** Suppression d'une ligne déjà envoyée. */
export const suppression = ({ table, id, objet }) => ({ type: "rpc", nom: "supprimer_saisie", v: 2, op: "supprimer", table, cible: id,
  args: { p: { table, id, version: objet?.modifie_le || null } } });

/**
 * Effet d'une modification ou d'une suppression en attente sur les données affichées (marquées « en attente »).
 * Les créations sont appliquées par offline.js (règles des domaines). Renvoie d.
 */
export function appliquerOperation(d, it) {
  if (!estModif(it) && !estSuppr(it)) return d;
  const { table, id } = it.args.p, cle = CLE[table];
  const listes = table === "ruches" ? [d.ruches, d.ruchesSorties] : [d[cle]];
  if (estModif(it)) {
    for (const l of listes) { const o = (l || []).find((x) => x.id === id); if (o) Object.assign(o, it.args.p.champs, { _attente: true }); }
    return d;
  }
  const l = d[cle];
  if (!l) return d;
  const i = l.findIndex((x) => x.id === id);
  if (i < 0) return d;
  l.splice(i, 1);
  if (table === "visites") { // le stock consommé revient, comme le fera la base
    for (const x of (d.intrants || []).filter((y) => y.visite_id === id)) {
      const a = (d.articles || []).find((y) => y.id === x.article_id);
      if (a) a.stock = Number(a.stock) + Number(x.quantite);
    }
    d.intrants = (d.intrants || []).filter((y) => y.visite_id !== id);
  }
  if (table === "ventes") {
    for (const x of (d.lignes || []).filter((y) => y.vente_id === id)) {
      const lot = (d.lots || []).find((y) => y.id === x.lot_id);
      if (lot) lot.pots_restants = Number(lot.pots_restants) + Number(x.quantite);
    }
    d.lignes = (d.lignes || []).filter((y) => y.vente_id !== id);
  }
  return d;
}

/** Compteurs par exploitation (AP-TECH-153) : { [ex]: { attente, corriger, conflit } }. */
export function compteurs(file) {
  const r = {};
  for (const it of file) {
    const c = (r[it.ex || ""] ||= { attente: 0, corriger: 0, conflit: 0 });
    if (it.statut === QUARANTAINE) c.corriger++;
    else if (it.statut === CONFLIT) c.conflit++;
    else c.attente++;
  }
  return r;
}

/**
 * Lignes « N saisies en attente dans <exploitation> » pour les autres exploitations que la courante (AP-US-050).
 * exploitations : [{ id, nom }]. Renvoie [{ id, nom, nb, texte }].
 */
export function autresExploitations(file, courante, exploitations) {
  const c = compteurs(file);
  return Object.entries(c).filter(([ex]) => ex && ex !== courante).map(([ex, k]) => {
    const nb = k.attente + k.corriger + k.conflit, nom = exploitations.find((e) => e.id === ex)?.nom || "une autre exploitation";
    return { id: ex, nom, nb, texte: `${nb} saisie${nb > 1 ? "s" : ""} en attente dans ${nom}` };
  });
}

/** Valeur lisible d'un champ, pour l'écran de conflit. */
export function valeurLisible(k, v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) { const [a, m, j] = String(v).split("-"); return `${j}/${m}/${a}`; }
  return String(v);
}

/** Les deux versions champ par champ (AP-TECH-152) : [{ k, libelle, mien, serveur, conflit }]. */
export function versions(it, reponse) {
  const p = it.args.p, conflits = new Set(reponse?.champs || []), serveur = reponse?.serveur || {};
  return Object.keys(p.champs || {}).map((k) => ({ k, libelle: LIBELLES[k] || k, mien: p.champs[k], serveur: serveur[k],
    conflit: conflits.has(k) }));
}

/**
 * Résultat du choix fait sur l'écran de conflit. choix : { champ: "mien" | "serveur" }. Renvoie l'opération à renvoyer
 * (version et « avant » du serveur, seuls les champs gardés) ou null si plus rien n'est à envoyer.
 */
export function resoudre(it, reponse, choix) {
  const p = it.args.p, serveur = reponse?.serveur || {}, champs = {}, avant = {};
  for (const [k, v] of Object.entries(p.champs || {})) {
    if ((reponse?.champs || []).includes(k) && choix[k] !== "mien") continue;
    champs[k] = v; avant[k] = serveur[k] ?? null;
  }
  if (!Object.keys(champs).length) return null;
  const { statut, reponse: _r, erreur, code, refuseLe, ...reste } = it;
  return { ...reste, args: { p: { ...p, champs, avant, version: reponse?.version ?? serveur.modifie_le ?? null } } };
}
