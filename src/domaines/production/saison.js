// Apiviz — règles pures de l'onglet Récoltes (v5.66, maquette « Produits › Récoltes » du 18 nov. 2026, validée).
// La saison en trois chiffres (récolté, mis en pots, vendu), le miel qui attend d'être mis en pots, les récoltes
// regroupées par extraction, les autres productions, les clients à prévenir. Tests : tests/unitaires/saison.test.mjs.
import * as P from "./produits.js";

const somme = (l, f) => (l || []).reduce((s, x) => s + (Number(f(x)) || 0), 0);
const arrondi = (x) => Math.round(x * 100) / 100;
const annee = (s) => String(s || "").slice(0, 4);
const kgLot = (l, q) => (Number(q) || 0) * (Number(l?.format_g) || 0) / 1000;

/**
 * Chiffres d'une saison (année civile) : kilos récoltés, mis en pots (lots de miel mis en pots cette année-là),
 * vendus (lignes de vente de miel), part mise en pots ; et le miel qui attend encore d'être mis en pots, toutes
 * années confondues (comme l'accueil : récolté − mis en pots).
 */
export function saison(d, an = new Date().getFullYear()) {
  const a = String(an);
  const miel = P.lotsMiel(d.lots);
  const recolte = somme((d.recoltes || []).filter((r) => annee(r.date_recolte) === a), (r) => r.kg);
  const enPots = somme(miel.filter((l) => annee(l.date_mise_en_pot || l.created_at) === a), (l) => kgLot(l, l.pots_initiaux));
  const ventes = new Set((d.ventes || []).filter((v) => annee(v.date_vente) === a).map((v) => v.id));
  const parId = new Map(miel.map((l) => [l.id, l]));
  const vendu = somme((d.lignes || []).filter((x) => ventes.has(x.vente_id) && parId.has(x.lot_id)), (x) => kgLot(parId.get(x.lot_id), x.quantite));
  const attente = somme(d.recoltes, (r) => r.kg) - somme(miel, (l) => kgLot(l, l.pots_initiaux));
  return {
    annee: Number(an), recolte: arrondi(recolte), enPots: arrondi(enPots), vendu: arrondi(vendu),
    part: recolte > 0 ? Math.max(0, Math.min(100, Math.round((enPots / recolte) * 100))) : 0,
    attente: attente > 0.05 ? arrondi(attente) : 0,
  };
}

/**
 * Récoltes regroupées par extraction (une saisie répartie sur plusieurs ruches = une ligne) : date, miel, ruches,
 * kilos, kilos déjà en pots (lots reliés à l'extraction) et en attente. Les plus récentes d'abord.
 */
export function extractions(d, { max = 12 } = {}) {
  const ruches = [...(d.ruches || []), ...(d.ruchesSorties || [])];
  const groupes = new Map();
  for (const r of d.recoltes || []) {
    const cle = r.extraction || r.id;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(r);
  }
  return [...groupes.entries()].map(([cle, rs]) => {
    const kg = somme(rs, (r) => r.kg);
    const lots = r0(rs).extraction ? P.lotsMiel(d.lots).filter((l) => l.extraction === r0(rs).extraction) : [];
    const enPots = somme(lots, (l) => kgLot(l, l.pots_initiaux));
    const noms = [...new Set(rs.map((r) => (r.ruche_id ? ruches.find((x) => x.id === r.ruche_id)?.nom : null)).filter(Boolean))];
    return {
      cle, id: r0(rs).id, date: rs.map((r) => r.date_recolte).sort()[0] || "", miel: rs.find((r) => r.miel)?.miel || "", extraction: r0(rs).extraction || "",
      ruches: noms, toutes: rs.some((r) => !r.ruche_id), kg: arrondi(kg), enPots: arrondi(enPots),
      attente: lots.length && kg - enPots > 0.05 ? arrondi(kg - enPots) : 0, lots: lots.map((l) => l.code), enAttenteEnvoi: rs.some((r) => r._attente),
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, max);
}
const r0 = (rs) => rs[0] || {};

/** « Ruches 1, 2 et 4 », « Ruche 3 », « Tout le rucher ». */
export function texteRuches(x) {
  if (!x.ruches.length) return "Tout le rucher";
  const l = x.ruches;
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}

/** Autres productions que le miel (hydromel, cire…) : les lots, les plus récents d'abord. */
export const autresProductions = (d, max = 6) =>
  (d.lots || []).filter((l) => !P.estMiel(l)).sort((a, b) => String(b.code || "").localeCompare(String(a.code || ""), "fr", { numeric: true })).slice(0, max);

/** Clients qui ont demandé à être prévenus de la prochaine récolte (migration 033). */
export const aPrevenir = (d) => (d.clients || []).filter((c) => c.prevenir === true).sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"));

/** Ce qu'il y a à vendre, en une phrase : « miel toutes fleurs 250 g et 500 g, hydromel 75 cl ». */
export function aVendre(lots) {
  const par = new Map();
  for (const l of (lots || []).filter((x) => Number(x.pots_restants) > 0)) {
    const nom = P.estMiel(l) ? `miel ${P.nomLot(l).toLowerCase().replace(/^miel\s+/, "")}` : P.nomLot(l).toLowerCase();
    if (!par.has(nom)) par.set(nom, new Set());
    const f = P.formatLot(l);
    if (f) par.get(nom).add(f);
  }
  const et = (l) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}` : l.join(""));
  return [...par.entries()].map(([nom, f]) => [nom, et([...f])].filter(Boolean).join(" ")).join(", ");
}

/** Message au client (document émis : vouvoiement, docs/CHARTE_DE_TON.md). */
export function messagePrevenir(client, lots, signature = "") {
  const prenom = String(client?.nom || "").trim().split(/\s+/)[0] || "";
  const offre = aVendre(lots);
  return `Bonjour ${prenom}, la nouvelle récolte est prête${offre ? ` : ${offre}` : ""}. Dites-moi ce qui vous ferait plaisir, je vous le mets de côté.${signature ? `\n${signature}` : ""}`;
}
