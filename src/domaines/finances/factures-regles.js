// Apiviz — Finances › Factures (corrections du 17 nov. 2026, maquettes validées par Pierre-Louis). Règles pures,
// testées par tests/unitaires/factures.test.mjs. Une facture = un achat : les lignes de dépense d'un même achat_id
// (migration 018) ; une dépense de l'ancienne version (sans achat_id) est une facture d'une ligne. Le fichier de la
// facture (photo ou PDF) est le chemin depenses.fichier (migration 025), le même sur chaque ligne de l'achat.
import { SOCIETE, estSociete } from "./associes.js";

const arrondi = (x) => Math.round(x * 100) / 100;
const plat = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 17 novembre » (avec l'année si `annee`). */
export function dateLettres(iso, annee = false) {
  const [a, m, j] = String(iso || "").slice(0, 10).split("-").map(Number);
  if (!a || !m || !j) return "";
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}${annee ? ` ${a}` : ""}`;
}
/** « Novembre 2026 ». */
export const moisLettres = (iso) => {
  const [a, m] = String(iso || "").slice(0, 7).split("-").map(Number);
  return a && m ? `${MOIS[m - 1][0].toUpperCase()}${MOIS[m - 1].slice(1)} ${a}` : "Sans date";
};

/** Toutes les factures, de la plus récente à la plus ancienne. */
export function factures(d) {
  const fours = new Map((d.fournisseurs || []).map((f) => [f.id, f.nom]));
  const par = new Map();
  for (const x of d.depenses || []) {
    const cle = x.achat_id || x.id;
    if (!par.has(cle)) par.set(cle, []);
    par.get(cle).push(x);
  }
  return [...par].map(([cle, lignes]) => {
    const p = lignes[0];
    const fournisseur = fours.get(lignes.find((l) => l.fournisseur_id)?.fournisseur_id) || "";
    const payeur = lignes.find((l) => l.paye_par)?.paye_par || "";
    return {
      cle, achat_id: p.achat_id || null, ids: lignes.map((l) => l.id), lignes,
      date: lignes.map((l) => l.date_depense).filter(Boolean).sort().at(-1) || "",
      fournisseur, fournisseur_id: lignes.find((l) => l.fournisseur_id)?.fournisseur_id || null,
      titre: fournisseur || (lignes.length === 1 ? p.libelle || "Achat" : "Achat"),
      piece: lignes.find((l) => String(l.piece || "").trim())?.piece.trim() || "",
      montant: arrondi(lignes.reduce((t, l) => t + Number(l.montant || 0), 0)),
      achete_par: lignes.find((l) => l.achete_par)?.achete_par || "",
      paye_par: payeur && !estSociete(payeur) ? payeur : payeur ? SOCIETE : "",
      fichier: lignes.find((l) => String(l.fichier || "").trim())?.fichier || "",
      attente: lignes.some((l) => l._attente),
      cree: lignes.map((l) => l.created_at || "").sort().at(-1) || "",
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.cree).localeCompare(String(a.cree)));
}

/** Avancée par un associé (payée de ses fonds propres, v5.29) : ce qui compte dans « Entre associés ». */
export const avancee = (f) => !!f.paye_par && !estSociete(f.paye_par);

/**
 * Factures d'une année, filtrées : « tout », « avance » (avancées par un associé), « par:<prénom> » (acheté par),
 * « sansfichier » ; `q` cherche dans le fournisseur, le numéro et les libellés.
 */
export function filtrer(fs, { annee = null, f = "tout", q = "" } = {}) {
  const t = plat(q);
  return fs.filter((x) => annee === null || String(x.date).slice(0, 4) === String(annee))
    .filter((x) => f === "tout" || (f === "avance" && avancee(x)) || (f.startsWith("par:") && x.achete_par === f.slice(4)) || (f === "sansfichier" && !x.fichier))
    .filter((x) => !t || [x.fournisseur, x.piece, x.titre, ...x.lignes.map((l) => l.libelle)].some((v) => plat(v).includes(t)));
}

/** Rangées par mois, dans l'ordre reçu : [{ mois: "2026-11", nom: "Novembre 2026", total, factures }]. */
export function parMois(fs) {
  const out = [];
  for (const x of fs) {
    const k = String(x.date).slice(0, 7);
    let g = out.find((m) => m.mois === k);
    if (!g) out.push((g = { mois: k, nom: moisLettres(x.date), total: 0, factures: [] }));
    g.factures.push(x);
    g.total = arrondi(g.total + x.montant);
  }
  return out;
}

/** Chiffres de l'en-tête : total, nombre, total avancé par les associés, factures sans fichier. */
export function totaux(fs) {
  return {
    nb: fs.length,
    total: arrondi(fs.reduce((t, x) => t + x.montant, 0)),
    avance: arrondi(fs.filter(avancee).reduce((t, x) => t + x.montant, 0)),
    sansFichier: fs.filter((x) => !x.fichier).length,
  };
}

/** Mouvements de stock nés de cette facture (mouvements_stock.depense_id, migration 018), par article. */
export function mouvementsDe(d, facture) {
  const ids = new Set(facture.ids);
  const arts = new Map((d.articles || []).map((a) => [a.id, a]));
  const m = new Map();
  for (const x of d.mouvements || []) {
    if (!ids.has(x.depense_id)) continue;
    const a = arts.get(x.article_id);
    const k = x.article_id;
    const prec = m.get(k) || { article_id: k, nom: a?.nom || "Article", unite: a?.unite || "unité", quantite: 0 };
    prec.quantite = arrondi(prec.quantite + Number(x.quantite || 0));
    m.set(k, prec);
  }
  return [...m.values()].filter((x) => x.quantite !== 0);
}

/** Chemin du fichier dans l'espace « factures » : « <exploitation>/<achat>/<nom nettoyé> ». */
export function cheminFichier(exploitation, cle, nom, type = "") {
  const ext = (String(nom || "").match(/\.([a-z0-9]{2,4})$/i)?.[1] || { "application/pdf": "pdf", "image/png": "png", "image/webp": "webp" }[type] || "jpg").toLowerCase();
  const base = plat(String(nom || "facture").replace(/\.[a-z0-9]{2,4}$/i, "")).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "facture";
  return `${exploitation}/${cle}/${base}.${ext}`;
}

/** Nom lisible d'un fichier enregistré (dernier morceau du chemin). */
export const nomFichier = (chemin) => String(chemin || "").split("/").pop() || "";

/** Fichier accepté ? PDF ou image, 10 Mo au plus (limite de l'espace « factures »). Renvoie un message, ou "". */
export function controleFichier(f) {
  if (!f) return "Choisis un fichier.";
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type || "")) return "Seuls les PDF et les photos (JPEG, PNG, WebP) sont acceptés.";
  if (f.size > 10 * 1024 * 1024) return "Ce fichier dépasse 10 Mo.";
  return "";
}
