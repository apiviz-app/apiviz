// Apiviz — règles du stock (v5.30, migration 018). Fonctions pures, sans navigateur ni base ; testées par
// tests/unitaires/stock.test.mjs. `d` a la forme de S.d : { articles, mouvements, depenses, lots, recoltes, lignes,
// ventes, clients, fournisseurs }.
import { sum, byId } from "../../noyau/format.js";

/** Familles du catalogue, dans l'ordre d'affichage. Opex ou Capex reste articles.type (Consommable ou Équipement). */
export const FAMILLES = {
  emballage: "Emballage",
  alimentation: "Alimentation",
  traitement: "Traitements",
  cire: "Cire et cadres",
  equipement: "Équipement",
  autre: "Autres articles",
};

/** Poste de dépense proposé pour chaque famille (repris des postes par défaut des réglages). */
export const POSTE_FAMILLE = {
  emballage: "Pots & étiquettes", alimentation: "Alimentation", traitement: "Traitements",
  cire: "Matériel", equipement: "Matériel", autre: "Autre",
};

/**
 * Catalogue proposé : articles qu'un apiculteur achète couramment. [nom, famille, unité, type, contenance_g].
 * Rien n'est créé tant qu'on ne le choisit pas.
 */
export const CATALOGUE = [
  ["Pot 250 g vide", "emballage", "unité", "Consommable", 250],
  ["Pot 500 g vide", "emballage", "unité", "Consommable", 500],
  ["Pot 1 kg vide", "emballage", "unité", "Consommable", 1000],
  ["Couvercle", "emballage", "unité", "Consommable"],
  ["Étiquette 250 g", "emballage", "unité", "Consommable"],
  ["Étiquette 500 g", "emballage", "unité", "Consommable"],
  ["Carton d'expédition", "emballage", "unité", "Consommable"],
  ["Candy", "alimentation", "kg", "Consommable"],
  ["Sirop", "alimentation", "L", "Consommable"],
  ["Lanières anti-varroa", "traitement", "unité", "Consommable"],
  ["Acide oxalique", "traitement", "unité", "Consommable"],
  ["Cire gaufrée", "cire", "feuille", "Consommable"],
  ["Cadres", "cire", "unité", "Consommable"],
  ["Hausse", "equipement", "unité", "Équipement"],
  ["Corps de ruche", "equipement", "unité", "Équipement"],
  ["Nourrisseur", "equipement", "unité", "Équipement"],
  ["Enfumoir", "equipement", "unité", "Équipement"],
  ["Combinaison", "equipement", "unité", "Équipement"],
  ["Extracteur", "equipement", "unité", "Équipement"],
  ["Maturateur", "equipement", "unité", "Équipement"],
  ["Balance", "equipement", "unité", "Équipement"],
].map(([nom, famille, unite, type, contenance_g = null]) => ({ nom, famille, unite, type, contenance_g }));

/** Opex (consommable, en charge l'année d'achat) ou Capex (équipement, amorti). */
export const estCapex = (a) => a?.type === "Équipement";
export const nature = (a) => (estCapex(a) ? "Capex" : "Opex");

/** Famille d'un article : la sienne, sinon déduite du nom (comme famille_article() en base). */
export function famille(a) {
  if (a?.famille) return a.famille;
  const nom = String(a?.nom || "");
  if (estCapex(a)) return "equipement";
  if (/(pot|bocal|couvercle|capsule|[ée]tiquette|carton|bo[iî]te)/i.test(nom)) return "emballage";
  if (/(candy|candi|sirop|sucre|nourri|pollen|prot[ée]ine)/i.test(nom)) return "alimentation";
  if (/(varroa|lani[èe]re|acide|apivar|apistan|oxalique|formique|traitement|thymol)/i.test(nom)) return "traitement";
  // v5.38 : sans Opex / Capex à choisir, un équipement se reconnaît à son nom.
  if (/(hausse|corps de ruche|ruchette|extracteur|maturateur|enfumoir|combinaison|vareuse|balance|nourrisseur|l[èe]ve-cadres?|d[ée]sopercul|grille|plateau|toit|chasse-abeilles|support)/i.test(nom)) return "equipement";
  if (/cire|cadre/i.test(nom)) return "cire";
  return "autre";
}

/** Contenance d'un pot vide : la sienne, sinon lue dans le nom (« Pot 250 g », « Pot 1 kg »). */
export function contenance(a) {
  if (a?.contenance_g) return Number(a.contenance_g);
  const nom = String(a?.nom || "");
  if (!/(pot|bocal)/i.test(nom)) return null;
  const kg = nom.match(/(\d+)\s*kg/i);
  if (kg) return Number(kg[1]) * 1000;
  const g = nom.match(/(\d+)\s*g\b/i);
  return g ? Number(g[1]) : null;
}

/** Article à racheter : consommable sous son seuil. */
export const aCommander = (a) => !estCapex(a) && Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil);

/** Articles groupés par famille, dans l'ordre de FAMILLES ; `filtre` : "tous", "opex" ou "capex". */
export function grouper(articles, filtre = "tous") {
  const garde = (a) => filtre === "tous" || (filtre === "capex") === estCapex(a);
  return Object.keys(FAMILLES)
    .map((f) => ({ famille: f, titre: FAMILLES[f], articles: articles.filter((a) => garde(a) && famille(a) === f)
      .sort((x, y) => String(x.nom).localeCompare(String(y.nom), "fr", { numeric: true })) }))
    .filter((g) => g.articles.length);
}

/** Suggestions du catalogue qui ne sont pas déjà des articles (même nom, sans tenir compte de la casse). */
export function suggestions(articles) {
  const deja = new Set(articles.map((a) => String(a.nom).trim().toLowerCase()));
  return CATALOGUE.filter((c) => !deja.has(c.nom.toLowerCase()));
}

/** Phrase de l'écran Matériel. */
export function phrase(articles) {
  const bas = articles.filter(aCommander);
  if (!articles.length) return "Ajoute tes premiers articles.";
  if (!bas.length) return "Ton matériel est à jour.";
  if (bas.length === 1) {
    const a = bas[0];
    return `Il reste ${quantite(a.stock, a.unite)} de ${a.nom}. Recommande-le.`;
  }
  return `${bas.length} articles sont à recommander.`;
}

/** « 35 », « 2,5 kg » : quantité avec son unité, sauf « unité ». */
export function quantite(q, unite) {
  const t = Number(q || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return !unite || unite === "unité" ? t : `${t} ${unite}`;
}

/** Mouvements d'un article, du plus récent au plus ancien. */
export const mouvementsArticle = (d, articleId) =>
  (d.mouvements || []).filter((m) => m.article_id === articleId)
    .sort((a, b) => String(b.date_mouvement).localeCompare(String(a.date_mouvement)) || String(b.created_at || "").localeCompare(String(a.created_at || "")));

/** Libellé court d'un mouvement : « Achat », « Visite », « Mise en pots », « Inventaire »… */
export function libelleMouvement(m) {
  if (m.type === "ouverture") return "Stock de départ";
  if (m.type === "inventaire") return "Inventaire";
  if (m.type === "rebut") return "Perte";
  return { achat: "Achat", visite: "Visite", mise_en_pots: "Mise en pots", saisie: m.type === "entree" ? "Entrée" : "Correction", reprise: "Stock de départ" }[m.origine] || "Mouvement";
}

// ---------- Achat ----------

/** Lignes d'un achat déjà enregistré (les dépenses d'un même achat_id). */
export const lignesAchat = (d, achatId) => (d.depenses || []).filter((x) => x.achat_id && x.achat_id === achatId);

/** Contrôle d'un achat avant envoi : message d'erreur, ou null. */
export function controleAchat(p) {
  if (!p.lignes?.length) return "Ajoute au moins une ligne.";
  for (const l of p.lignes) {
    const nom = l.article?.nom || l.nom || l.libelle || "cette ligne";
    if (l.article && !String(l.article.nom || "").trim()) return "Donne un nom au nouvel article.";
    if (!l.article_id && !l.article && !String(l.libelle || "").trim()) return "Donne un libellé à chaque ligne.";
    if ((l.article_id || l.article) && !(Number(l.quantite) > 0)) return `Indique la quantité achetée de ${nom}.`;
    if (l.montant === "" || l.montant === null || l.montant === undefined || !(Number(l.montant) >= 0)) return `Indique le montant de ${nom}.`;
  }
  return null;
}

/** Ajoute aux données du téléphone un achat pas encore envoyé (hors ligne), comme le fera enregistrer_achat(). */
export function appliquerAchat(d, p, extra = {}) {
  if ((d.depenses || []).some((x) => x.achat_id === p.id)) return;
  d.articles ||= []; d.depenses ||= []; d.mouvements ||= [];
  for (const l of p.lignes || []) {
    let a = l.article_id ? byId(d.articles, l.article_id) : null;
    if (l.article) {
      a = d.articles.find((x) => String(x.nom).trim().toLowerCase() === String(l.article.nom).trim().toLowerCase());
      if (!a) {
        a = { id: l.article.id, nom: l.article.nom.trim(), unite: l.article.unite || "unité", type: l.article.type === "Équipement" ? "Équipement" : "Consommable",
          famille: l.article.famille || "", contenance_g: l.article.contenance_g || null, duree_amort: l.article.duree_amort || null,
          poste: l.article.poste || "", seuil: 0, stock: 0, fournisseur_id: p.fournisseur_id || null, ...extra };
        d.articles.push(a);
      }
    }
    const dep = { id: l.id, achat_id: p.id, piece: p.piece || "", libelle: l.libelle || a?.nom || "", categorie: l.categorie || a?.poste || "Autre",
      montant: Number(l.montant), date_depense: p.date, fournisseur_id: p.fournisseur_id || null, achete_par: p.achete_par || "", paye_par: p.paye_par || "",
      nature: a ? (estCapex(a) ? "Immobilisation" : "Consommable") : "Service", duree_amort: a && estCapex(a) ? a.duree_amort || 5 : null,
      article_id: a?.id || null, quantite: a ? Number(l.quantite) : null, ...extra };
    d.depenses.unshift(dep);
    if (a) {
      a.stock = Number(a.stock || 0) + Number(l.quantite);
      if (Number(l.montant) > 0) a.valeur = Math.round((Number(l.montant) / Number(l.quantite)) * 100) / 100;
      d.mouvements.push({ id: l.id + "-m", article_id: a.id, type: "entree", origine: "achat", quantite: Number(l.quantite), depense_id: l.id, date_mouvement: p.date, ...extra });
    }
  }
}

// ---------- Mise en pots ----------

/** Miel en vrac : récolté moins déjà mis en pots (kg). */
export const mielEnVrac = (d) =>
  sum(d.recoltes || [], (r) => r.kg) - sum(d.lots || [], (l) => (Number(l.pots_initiaux) * Number(l.format_g)) / 1e3);

/** Numéro de lot proposé : L26-01, L26-02… (le premier libre de l'année). */
export function prochainCode(lots, annee) {
  const an = String(annee).slice(2), pris = new Set((lots || []).map((l) => l.code));
  for (let i = 1; i < 1000; i++) { const c = `L${an}-${String(i).padStart(2, "0")}`; if (!pris.has(c)) return c; }
  return `L${an}-${Date.now() % 1000}`;
}

/** Date de durabilité minimale proposée : deux ans après la mise en pots (usage courant pour le miel). */
export function ddmProposee(date) {
  const [a, m, j] = String(date).split("-").map(Number);
  if (!a) return "";
  const x = new Date(Date.UTC(a + 2, m - 1, j));
  return x.toISOString().slice(0, 10);
}

/**
 * Articles proposés pour une mise en pots au format `format_g` : le pot vide de ce format, un couvercle, une étiquette
 * (celle du format si elle existe). Chaque rôle peut rester vide.
 */
export function proposerIntrants(articles, format_g) {
  const emb = (articles || []).filter((a) => famille(a) === "emballage" && !estCapex(a));
  const pot = emb.find((a) => contenance(a) === Number(format_g)) || null;
  const couvercle = emb.find((a) => /(couvercle|capsule)/i.test(a.nom)) || null;
  const etiqs = emb.filter((a) => /[ée]tiquette/i.test(a.nom));
  const etiquette = etiqs.find((a) => new RegExp(`\\b${format_g >= 1000 ? Number(format_g) / 1000 + "\\s*kg" : format_g + "\\s*g"}\\b`, "i").test(a.nom)) || etiqs[0] || null;
  return { pot, couvercle, etiquette };
}

/**
 * Bilan d'une mise en pots : ce qui sort, ce qui manque, combien de pots au plus, coût d'emballage par pot.
 * `choix` : { pots, format_g, intrants: [article_id…] } (un pot vide, un couvercle, une étiquette par pot).
 */
export function bilanMiseEnPots(d, choix) {
  const pots = Math.max(0, Math.floor(Number(choix.pots) || 0)), fmt = Number(choix.format_g) || 0;
  const vrac = mielEnVrac(d), kg = (pots * fmt) / 1e3;
  const sorties = (choix.intrants || []).filter(Boolean).map((id) => byId(d.articles || [], id)).filter(Boolean).map((a) => ({
    article: a, quantite: pots, avant: Number(a.stock), apres: Number(a.stock) - pots, manque: Math.max(0, pots - Number(a.stock)),
  }));
  const limites = sorties.map((s) => ({ nom: s.article.nom, max: Math.max(0, Math.floor(Number(s.article.stock))) }));
  if (fmt > 0 && (d.recoltes || []).length) limites.push({ nom: "miel en vrac", max: Math.max(0, Math.floor((vrac * 1e3) / fmt + 1e-9)) });
  const plusPetite = limites.reduce((m, l) => (m === null || l.max < m.max ? l : m), null);
  return {
    pots, kg, vrac, sorties,
    manque: sorties.filter((s) => s.manque > 0),
    mielCourt: (d.recoltes || []).length > 0 && kg > vrac + 1e-9,
    max: plusPetite ? plusPetite.max : null,
    limite: plusPetite?.nom || null,
    emballageParPot: sum(sorties, (s) => s.article.valeur),
  };
}

/** Ajoute aux données du téléphone une mise en pots pas encore envoyée (hors ligne), comme mettre_en_pots(). */
export function appliquerMiseEnPots(d, p, extra = {}) {
  d.lots ||= []; d.mouvements ||= [];
  if (d.lots.some((l) => l.id === p.id)) return;
  d.lots.push({ id: p.id, code: p.code, miel: p.miel || "Toutes fleurs", format_g: Number(p.format_g), prix: Number(p.prix || 0),
    pots_initiaux: Number(p.pots), pots_vendus: 0, pots_restants: Number(p.pots), date_mise_en_pot: p.date, ddm: p.ddm || null,
    extraction: p.extraction || "", ...extra });
  for (const i of p.intrants || []) {
    const a = byId(d.articles || [], i.article_id);
    if (!a || !(Number(i.quantite) > 0)) continue;
    a.stock = Number(a.stock) - Number(i.quantite);
    d.mouvements.push({ id: `${p.id}-${a.id}`, article_id: a.id, type: "consommation", origine: "mise_en_pots", quantite: -Number(i.quantite), lot_id: p.id, date_mouvement: p.date, ...extra });
  }
}

/**
 * Histoire d'un lot, du rucher au client, dans l'ordre des dates : récoltes de son extraction, dernier achat de chaque
 * article emballé avant la mise en pots, mise en pots (ce qui est sorti du stock), ventes.
 */
export function histoireLot(d, lotId) {
  const lot = byId(d.lots || [], lotId);
  if (!lot) return [];
  const etapes = [];
  const recoltes = lot.extraction ? (d.recoltes || []).filter((r) => r.extraction === lot.extraction) : [];
  if (recoltes.length) {
    const ruches = [...new Set(recoltes.map((r) => r.ruche_id).filter(Boolean))].map((id) => byId(d.ruches || [], id)?.nom).filter(Boolean);
    etapes.push({ type: "recolte", date: recoltes.map((r) => r.date_recolte).sort()[0], titre: "Récolte",
      detail: `+${fmt(sum(recoltes, (r) => r.kg))} kg de miel`, sous: ruches.length ? ruches.join(", ") : "" });
  }
  const sorties = (d.mouvements || []).filter((m) => m.lot_id === lot.id && m.origine === "mise_en_pots");
  const quand = lot.date_mise_en_pot || sorties[0]?.date_mouvement || "";
  // Achats d'origine : pour chaque article sorti, son dernier achat à la date de la mise en pots ou avant.
  const achats = new Map();
  for (const m of sorties) {
    const dep = (d.depenses || []).filter((x) => x.article_id === m.article_id && (!quand || x.date_depense <= quand))
      .sort((a, b) => String(b.date_depense).localeCompare(String(a.date_depense)))[0];
    if (!dep) continue;
    const cle = dep.achat_id || dep.id, e = achats.get(cle) || { dep, lignes: [] };
    e.lignes.push(`+${quantiteArticle(dep.quantite, byId(d.articles || [], dep.article_id))}`);
    achats.set(cle, e);
  }
  for (const { dep, lignes } of achats.values()) {
    const four = byId(d.fournisseurs || [], dep.fournisseur_id)?.nom;
    etapes.push({ type: "achat", date: dep.date_depense, titre: `Achat${four ? " chez " + four : ""}`, detail: lignes.join(", "),
      sous: dep.piece ? `Facture ${dep.piece}` : "", depense: dep.id });
  }
  etapes.push({ type: "pots", date: quand, titre: "Mise en pots",
    detail: sorties.length ? sorties.map((m) => `−${quantiteArticle(-m.quantite, byId(d.articles || [], m.article_id))}`).join(", ") : "Rien retiré du stock",
    sous: `+${lot.pots_initiaux} pot${lot.pots_initiaux > 1 ? "s" : ""} de miel de ${fmt(lot.format_g, 0)} g` });
  const parVente = new Map();
  for (const x of (d.lignes || []).filter((l) => l.lot_id === lot.id)) parVente.set(x.vente_id, (parVente.get(x.vente_id) || 0) + Number(x.quantite));
  for (const [venteId, q] of parVente) {
    const v = byId(d.ventes || [], venteId), c = byId(d.clients || [], v?.client_id);
    etapes.push({ type: "vente", date: v?.date_vente || "", titre: `Vente${c ? " à " + c.nom : ""}`, detail: `−${q} pot${q > 1 ? "s" : ""} de miel`, sous: "" });
  }
  const rang = { recolte: 0, achat: 1, pots: 2, vente: 3 };
  return etapes.sort((a, b) => String(a.date).localeCompare(String(b.date)) || rang[a.type] - rang[b.type]);
}

const fmt = (v, dec = 1) => Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: dec });
/** « 150 pots 250 g vides », « 2 kg de candy ». */
function quantiteArticle(q, a) {
  const t = fmt(q, 2);
  if (!a) return t;
  return !a.unite || a.unite === "unité" ? `${t} ${a.nom.toLowerCase()}` : `${t} ${a.unite} de ${a.nom.toLowerCase()}`;
}

// ---------- Écran Matériel opérationnel (v5.38, maquettes du 13 nov. 2026 validées le 14 nov.) ----------
// Plus d'Opex / Capex à l'écran : la nature reste déduite de la famille (Équipement → amorti) pour les exports.

/** Type enregistré pour une famille : « Équipement » pour la famille équipement, sinon « Consommable ». */
export const typeDeFamille = (fam) => (fam === "equipement" ? "Équipement" : "Consommable");

/** Poste de dépense d'une famille (jamais demandé à l'écran). */
export const posteDeFamille = (fam) => POSTE_FAMILLE[fam] || "Autre";

/** Garde un article selon le filtre (« tout », « bas » ou une famille) et la recherche (nom, fournisseur). */
export function garder(a, f = "tout", q = "", fournisseurs = []) {
  const t = String(q || "").trim().toLowerCase();
  if (t) {
    const four = (fournisseurs.find((x) => x.id === a.fournisseur_id)?.nom || "").toLowerCase();
    if (!String(a.nom || "").toLowerCase().includes(t) && !four.includes(t)) return false;
  }
  if (f === "tout" || !f) return true;
  if (f === "bas") return aCommander(a);
  return famille(a) === f;
}

/** Puces du filtre : Tout, À commander, puis les familles présentes, chacune avec son nombre d'articles. */
export function puces(articles) {
  const l = [{ k: "tout", t: "Tout", n: articles.length }, { k: "bas", t: "À commander", n: articles.filter(aCommander).length }];
  for (const [k, t] of Object.entries(FAMILLES)) {
    const nb = articles.filter((a) => famille(a) === k).length;
    if (nb) l.push({ k, t, n: nb });
  }
  return l;
}

/** Groupes par famille de l'écran, articles à commander en tête puis par nom. */
export function groupesEcran(articles, f = "tout", q = "", fournisseurs = []) {
  const garde = articles.filter((a) => garder(a, f, q, fournisseurs));
  return Object.keys(FAMILLES)
    .map((fam) => ({ famille: fam, titre: FAMILLES[fam], articles: garde.filter((a) => famille(a) === fam)
      .sort((x, y) => aCommander(y) - aCommander(x) || String(x.nom).localeCompare(String(y.nom), "fr", { numeric: true })) }))
    .filter((g) => g.articles.length);
}

/** Quantité proposée pour racheter : de quoi revenir à deux fois le seuil, arrondie (à 5 au-delà de 20, à 10 au-delà de 100). */
export function quantiteProposee(a) {
  const seuil = Number(a.seuil) || 0, stock = Math.max(0, Number(a.stock) || 0);
  let q = Math.max(seuil * 2 - stock, seuil, 1);
  const pas = q > 100 ? 10 : q > 20 ? 5 : a.unite && a.unite !== "unité" ? 0.5 : 1;
  q = Math.ceil(q / pas - 1e-9) * pas;
  return Math.round(q * 100) / 100;
}

/**
 * Liste de courses : les articles à commander, groupés par fournisseur habituel (« Sans fournisseur » à la fin),
 * avec la quantité proposée (ou celle choisie dans `choix`, { article_id: quantité }) et le montant estimé.
 */
export function listeCourses(articles, fournisseurs = [], choix = {}) {
  const groupes = new Map();
  for (const a of articles.filter(aCommander)) {
    const cle = a.fournisseur_id && fournisseurs.some((f) => f.id === a.fournisseur_id) ? a.fournisseur_id : "";
    const q = choix[a.id] !== undefined ? Math.max(0, Number(choix[a.id]) || 0) : quantiteProposee(a);
    const prix = Number(a.valeur) || 0;
    const g = groupes.get(cle) || { fournisseur_id: cle || null, nom: cle ? fournisseurs.find((f) => f.id === cle).nom : "Sans fournisseur", lignes: [], total: 0, sansPrix: 0 };
    g.lignes.push({ article: a, quantite: q, montant: Math.round(q * prix * 100) / 100, prix });
    g.total = Math.round((g.total + q * prix) * 100) / 100;
    if (!prix) g.sansPrix++;
    groupes.set(cle, g);
  }
  const l = [...groupes.values()].sort((x, y) => (!x.fournisseur_id) - (!y.fournisseur_id) || x.nom.localeCompare(y.nom, "fr"));
  l.forEach((g) => g.lignes.sort((x, y) => String(x.article.nom).localeCompare(String(y.article.nom), "fr", { numeric: true })));
  return { groupes: l, total: Math.round(l.reduce((t, g) => t + g.total, 0) * 100) / 100, articles: l.reduce((t, g) => t + g.lignes.length, 0) };
}

/** Texte à envoyer au fournisseur (ou à copier) pour un groupe de la liste de courses. */
export function texteCourses(groupe) {
  return [`Commande${groupe.fournisseur_id ? " pour " + groupe.nom : ""} :`, ...groupe.lignes.map((l) => `- ${quantite(l.quantite, l.article.unite)} ${l.article.nom}`)].join("\n");
}

/** Inventaire : écarts entre le compté (`comptes`, { article_id: "12" }) et le stock prévu. Les cases vides sont ignorées. */
export function ecartsInventaire(articles, comptes = {}) {
  const l = [];
  for (const a of articles) {
    const v = comptes[a.id];
    if (v === undefined || v === null || String(v).trim() === "") continue;
    const compte = Number(String(v).replace(",", "."));
    if (!Number.isFinite(compte) || compte < 0) continue;
    const ecart = Math.round((compte - Number(a.stock || 0)) * 100) / 100;
    l.push({ article: a, compte, ecart });
  }
  return { comptes: l.length, ecarts: l.filter((x) => x.ecart !== 0) };
}
