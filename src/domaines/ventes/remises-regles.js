// Apiviz — remises et offres de vente (v5.77, migration 037, maquette « Remises et offres » du 24 nov. 2026).
// Règles pures, sans navigateur ni base, testées par tests/unitaires/remises.test.mjs. Les scripts classiques les lisent
// par window.Regles.remises.
//
// Deux façons de baisser le prix d'une vente :
//   - une offre préparée (table promotions) qui s'applique toute seule quand le panier remplit sa condition. Deux offres
//     ne s'additionnent pas : la plus avantageuse pour le client est gardée (décision du 24 nov. 2026) ;
//   - une remise ponctuelle (en %, en € ou un article offert), avec un motif facultatif, appliquée après l'offre.
// Tout se compte en centimes. La remise est répartie sur les lignes de la vente (vente_lignes.remise) : le montant d'une
// ligne est quantité × prix − remise, et les totaux de l'application restent justes sans rien savoir des offres.
import { n } from "../../noyau/format.js";
import { categorieDe, formatLot, uniteLot } from "../production/produits.js";

export const TYPES = [
  { id: "xy", titre: "X achetés, Y offerts", exemple: "4 achetés, 1 offert" },
  { id: "lot", titre: "Lot à prix rond", exemple: "3 pots = 25 €" },
  { id: "remise", titre: "Remise % ou €", exemple: "−10 % dès 30 €" },
  { id: "client", titre: "Prix pour un client", exemple: "Revendeur −20 %" },
];
export const MOTIFS = ["Client fidèle", "Pot abîmé", "Famille, amis", "Geste commercial"];

const cts = (x) => Math.round((Number(x) || 0) * 100);
const euros = (c) => Math.round(c) / 100;
const prixEur = (c) => n(c / 100, 2) + " €";

/** Famille d'un lot pour les offres : catégorie et format (« Miel|250 g », « Hydromel|75 cl »), toutes variétés confondues. */
export const famille = (lot) => `${categorieDe(lot)}|${formatLot(lot)}`;
/** « Miel|250 g » → « Miel 250 g ». */
export const libelleFamille = (f) => String(f || "").split("|").filter(Boolean).join(" ");

/** Familles proposées dans « Produits concernés » : une par catégorie et format, dans l'ordre du catalogue. */
export function familles(lots) {
  const m = new Map();
  for (const l of lots || []) {
    const f = famille(l);
    if (!m.has(f)) m.set(f, { cle: f, libelle: libelleFamille(f), miel: categorieDe(l) === "Miel", g: Number(l.format_g) || 0 });
  }
  return [...m.values()].sort((a, b) => (b.miel - a.miel) || a.cle.split("|")[0].localeCompare(b.cle.split("|")[0], "fr") || a.g - b.g || a.libelle.localeCompare(b.libelle, "fr"));
}

/** Montant d'une ligne de vente : quantité × prix − remise (colonne remise de 037 ; 0 avant). */
export const montantLigne = (l) => euros(cts(Number(l?.quantite || 0) * Number(l?.prix_unitaire || 0)) - cts(l?.remise));

/** L'offre vaut-elle pour cette vente ? Active, dans sa période, et pour ce client s'il y a une restriction. */
export function offreValable(p, { date = "", client = null } = {}) {
  if (!p || p.actif === false) return false;
  if (date && p.debut && date < p.debut) return false;
  if (date && p.fin && date > p.fin) return false;
  const clients = p.clients || [], cercles = p.cercles || [];
  if (clients.length || cercles.length) {
    if (!client) return false;
    if (!clients.includes(client.id) && !(client.cercle && cercles.includes(client.cercle))) return false;
  }
  return true;
}

/** Statut affiché dans la liste : « active », « prevue » (pas encore commencée), « finie », « coupee ». */
export function statut(p, date) {
  if (p.actif === false) return "coupee";
  if (p.debut && date < p.debut) return "prevue";
  if (p.fin && date > p.fin) return "finie";
  return "active";
}

/** Lignes enrichies : prix (centimes), famille, montant brut. Les lignes dont le lot est inconnu valent 0. */
function enrichir(lignes, lots) {
  const parId = new Map((lots || []).map((l) => [l.id, l]));
  return (lignes || []).filter((l) => Number(l.quantite) > 0).map((l, i) => {
    const lot = parId.get(l.lot_id);
    const prix = cts(lot?.prix);
    return { i, lot_id: l.lot_id, quantite: Number(l.quantite), prix, famille: lot ? famille(lot) : "", brut: prix * Number(l.quantite), lot };
  });
}

const concerne = (p, f) => !(p.produits || []).length || p.produits.includes(f);

/**
 * Répartit `total` centimes sur des lignes au prorata de `poids` (centimes), sans dépasser le poids d'une ligne :
 * plus forts restes d'abord, pour que la somme tombe juste.
 */
export function repartir(total, poids) {
  const somme = poids.reduce((t, x) => t + x, 0);
  const t = Math.max(0, Math.min(Math.round(total), somme));
  if (!somme || !t) return poids.map(() => 0);
  const brut = poids.map((p) => (t * p) / somme);
  const parts = brut.map(Math.floor);
  let reste = t - parts.reduce((a, b) => a + b, 0);
  const ordre = brut.map((b, i) => [b - Math.floor(b), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of ordre) {
    if (!reste) break;
    if (parts[i] < poids[i]) { parts[i]++; reste--; }
  }
  return parts;
}

/** Unités des lignes concernées : [{ i (index de ligne), prix }]. */
const unites = (ls, p) => ls.filter((l) => concerne(p, l.famille)).flatMap((l) => Array.from({ length: l.quantite }, () => ({ i: l.i, prix: l.prix })));

/**
 * Ce que rapporte une offre au client sur ces lignes : { remise (centimes), parLigne (centimes, même ordre que les
 * lignes), offerts (unités offertes, pour X achetés / Y offerts) }. remise = 0 si la condition n'est pas remplie.
 */
export function calculerOffre(p, ls) {
  const parLigne = ls.map(() => 0);
  const vide = { remise: 0, parLigne, offerts: 0 };
  if (!p) return vide;
  if (p.type === "xy") {
    const x = Number(p.achetes) || 0, y = Number(p.offerts) || 0;
    if (x < 1 || y < 1) return vide;
    const u = unites(ls, p).sort((a, b) => a.prix - b.prix);
    const offerts = Math.floor(u.length / (x + y)) * y;
    u.slice(0, offerts).forEach((x) => { parLigne[ls.findIndex((l) => l.i === x.i)] += x.prix; });
    return { remise: parLigne.reduce((a, b) => a + b, 0), parLigne, offerts };
  }
  if (p.type === "lot") {
    const q = Number(p.quantite) || 0, prix = cts(p.prix_lot);
    if (q < 2 || prix <= 0) return vide;
    const u = unites(ls, p).sort((a, b) => b.prix - a.prix);
    const lots = Math.floor(u.length / q);
    if (!lots) return vide;
    const pris = u.slice(0, lots * q);
    const brut = pris.reduce((t, x) => t + x.prix, 0);
    const remise = brut - lots * prix;
    if (remise <= 0) return vide;
    const poids = ls.map((l) => pris.filter((x) => x.i === l.i).reduce((t, x) => t + x.prix, 0));
    return { remise, parLigne: repartir(remise, poids), offerts: 0 };
  }
  if (p.type === "remise" || p.type === "client") {
    const poids = ls.map((l) => (concerne(p, l.famille) ? l.brut : 0));
    const base = poids.reduce((a, b) => a + b, 0);
    if (!base || base < cts(p.minimum)) return vide;
    const remise = p.mode === "pct" ? Math.round((base * Number(p.valeur || 0)) / 100) : Math.min(cts(p.valeur), base);
    if (remise <= 0) return vide;
    return { remise, parLigne: repartir(remise, poids), offerts: 0 };
  }
  return vide;
}

/** La meilleure offre valable (la plus forte remise ; à égalité, la première par nom), ou null. */
export function meilleureOffre(promotions, lignes, lots, ctx = {}) {
  const ls = enrichir(lignes, lots);
  let best = null;
  for (const p of [...(promotions || [])].sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"))) {
    if (!offreValable(p, ctx)) continue;
    const r = calculerOffre(p, ls);
    if (r.remise > 0 && (!best || r.remise > best.remise)) best = { promotion: p, ...r };
  }
  return best;
}

/** Libellé d'une remise ponctuelle : « −10 % », « −2,00 € », « 1 offert ». */
export function libelleManuelle(r) {
  if (!r) return "";
  if (r.mode === "pct") return `−${n(Number(r.valeur) || 0, 2)} %`;
  if (r.mode === "eur") return `−${prixEur(cts(r.valeur))}`;
  if (r.mode === "article") return "1 offert";
  return "";
}

/**
 * Remise ponctuelle, appliquée après l'offre sur ce qui reste à payer de chaque ligne.
 * r = { mode: "pct" | "eur" | "article", valeur, cible (lot_id ; vide = toute la vente, sauf « article ») }.
 * Rend { remise, parLigne } en centimes.
 */
export function calculerManuelle(r, ls, dejaParLigne) {
  const parLigne = ls.map(() => 0);
  if (!r || !r.mode) return { remise: 0, parLigne };
  const restant = ls.map((l, k) => Math.max(0, l.brut - (dejaParLigne?.[k] || 0)));
  const cible = r.cible ? ls.findIndex((l) => l.lot_id === r.cible) : -1;
  if (r.mode === "article") {
    const k = cible >= 0 ? cible : ls.reduce((m, l, j) => (m < 0 || l.prix < ls[m].prix ? j : m), -1);
    if (k < 0) return { remise: 0, parLigne };
    parLigne[k] = Math.min(ls[k].prix, restant[k]);
    return { remise: parLigne[k], parLigne };
  }
  const poids = restant.map((x, k) => (cible < 0 || k === cible ? x : 0));
  const base = poids.reduce((a, b) => a + b, 0);
  const total = r.mode === "pct" ? Math.round((base * Math.min(100, Math.max(0, Number(r.valeur) || 0))) / 100) : Math.min(Math.max(0, cts(r.valeur)), base);
  const parts = repartir(total, poids);
  return { remise: parts.reduce((a, b) => a + b, 0), parLigne: parts };
}

/**
 * Tout le calcul d'une vente : brut, meilleure offre, remise ponctuelle, total, lignes et champs à envoyer à
 * creer_vente (037). lignes = [{ lot_id, quantite }] ; manuelle = { mode, valeur, cible, motif } ou null.
 */
export function calculerVente({ lignes = [], lots = [], promotions = [], client = null, date = "", manuelle = null } = {}) {
  const ls = enrichir(lignes, lots);
  const brut = ls.reduce((t, l) => t + l.brut, 0);
  const offre = meilleureOffre(promotions, lignes, lots, { client, date });
  const parOffre = offre ? offre.parLigne : ls.map(() => 0);
  const man = calculerManuelle(manuelle, ls, parOffre);
  const remiseOffre = offre ? offre.remise : 0;
  const total = brut - remiseOffre - man.remise;
  return {
    brut: euros(brut),
    offre: offre ? { promotion: offre.promotion, remise: euros(remiseOffre), offerts: offre.offerts } : null,
    manuelle: man.remise ? { remise: euros(man.remise), libelle: libelleManuelle(manuelle), motif: String(manuelle?.motif || "") } : null,
    total: euros(total),
    economie: euros(remiseOffre + man.remise),
    lignes: ls.map((l, k) => ({ lot_id: l.lot_id, quantite: l.quantite, remise: euros(parOffre[k] + man.parLigne[k]) })),
    champs: {
      promotion_id: offre ? offre.promotion.id || null : null,
      promotion_nom: offre ? String(offre.promotion.nom || "") : "",
      remise_offre: euros(remiseOffre),
      remise_manuelle: euros(man.remise),
      remise_motif: man.remise ? String(manuelle?.motif || "").slice(0, 60) : "",
      remise_libelle: man.remise ? libelleManuelle(manuelle) : "",
    },
  };
}

/**
 * Petit coup de pouce : un article de plus d'un produit déjà dans le panier ferait-il gagner une offre (ou plus) ?
 * stockDe(lot_id) : ce qu'il reste du lot une fois le panier compté (null = inconnu, on ne propose rien).
 * Rend { texte, famille, gain } ou null. Ne propose que les offres X/Y et les lots (un article de plus) et le minimum
 * d'achat d'une remise (« encore 4,00 € »).
 */
export function prochaineOffre(promotions, lignes, lots, ctx = {}, stockDe = () => null) {
  const ls = enrichir(lignes, lots);
  if (!ls.length) return null;
  const actuelle = meilleureOffre(promotions, lignes, lots, ctx)?.remise || 0;
  let best = null;
  for (const p of promotions || []) {
    if (!offreValable(p, ctx)) continue;
    if (p.type === "xy" || p.type === "lot") {
      for (const l of ls) {
        if (!concerne(p, l.famille) || !(Number(stockDe(l.lot_id)) > 0)) continue;
        const essai = ls.map((x) => (x.i === l.i ? { ...x, quantite: x.quantite + 1, brut: x.brut + x.prix } : x));
        const gain = calculerOffre(p, essai).remise - actuelle;
        if (gain > 0 && (!best || gain > best.gain)) {
          const u = l.lot ? uniteLot(l.lot, 1) : "article";
          best = { gain, famille: l.famille, texte: `Encore 1 ${u} de ${libelleFamille(l.famille)} et le client gagne ${prixEur(gain)} avec « ${p.nom} ».` };
        }
      }
    } else if (cts(p.minimum) > 0) {
      const base = ls.filter((l) => concerne(p, l.famille)).reduce((t, l) => t + l.brut, 0);
      const manque = cts(p.minimum) - base;
      if (base > 0 && manque > 0 && manque <= base) {
        const gainMin = p.mode === "pct" ? Math.round((cts(p.minimum) * Number(p.valeur || 0)) / 100) : cts(p.valeur);
        if (gainMin > actuelle && !best) best = { gain: 0, famille: "", texte: `Encore ${prixEur(manque)} d’achat et l’offre « ${p.nom} » s’applique.` };
      }
    }
  }
  return best ? { texte: best.texte, famille: best.famille, gain: euros(Math.max(0, best.gain)) } : null;
}

/** Nom proposé pour une offre, d'après ses paramètres. */
export function nomPropose(p) {
  const f = (p.produits || []).length === 1 ? " " + libelleFamille(p.produits[0]) : "";
  if (p.type === "xy") return `${p.achetes || "?"} achetés, ${p.offerts || "?"} offert${Number(p.offerts) > 1 ? "s" : ""}`;
  if (p.type === "lot") return `${p.quantite || "?"}${f || " produits"} = ${p.prix_lot ? prixEur(cts(p.prix_lot)) : "?"}`;
  const v = p.mode === "pct" ? `−${n(Number(p.valeur) || 0, 2)} %` : `−${prixEur(cts(p.valeur))}`;
  if (p.type === "client") return `Prix client ${v}`;
  return `${v}${Number(p.minimum) > 0 ? ` dès ${prixEur(cts(p.minimum))}` : ""}`;
}

/** Une ligne de description : produits, pour qui. */
export function resume(p, nomsClients = {}) {
  const produits = (p.produits || []).length ? p.produits.map(libelleFamille).join(", ") : "Tous les produits";
  const qui = [...(p.cercles || []), ...(p.clients || []).map((c) => nomsClients[c] || "un client")];
  return qui.length ? `${produits} · ${qui.join(", ")}` : produits;
}

/** Période affichée : « Toute l'année », « Jusqu'au 31 déc. », « Du 12 au 14 déc. ». */
export function periode(p) {
  const d = (s) => new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (p.debut && p.fin) return `Du ${d(p.debut)} au ${d(p.fin)}`;
  if (p.fin) return `Jusqu’au ${d(p.fin)}`;
  if (p.debut) return `À partir du ${d(p.debut)}`;
  return "Sans date de fin";
}

/** Ce qu'une offre a donné : nombre de ventes, euros offerts, euros encaissés (montant net des ventes). */
export function usage(p, ventes, lignes) {
  const vs = (ventes || []).filter((v) => v.promotion_id === p.id);
  const ids = new Set(vs.map((v) => v.id));
  const net = (lignes || []).filter((l) => ids.has(l.vente_id)).reduce((t, l) => t + cts(montantLigne(l)), 0);
  return { fois: vs.length, offert: euros(vs.reduce((t, v) => t + cts(v.remise_offre), 0)), ventes: euros(net) };
}

/** Remises accordées sur une liste de ventes : offres, remises ponctuelles, total (euros). */
export function remisesAccordees(ventes) {
  const o = (ventes || []).reduce((t, v) => t + cts(v.remise_offre), 0), m = (ventes || []).reduce((t, v) => t + cts(v.remise_manuelle), 0);
  return { offres: euros(o), ponctuelles: euros(m), total: euros(o + m) };
}

/** Contrôle d'une offre avant enregistrement : message en français (tutoiement) ou "" si tout va bien. */
export function validerPromotion(p) {
  if (!String(p.nom || "").trim()) return "Donne un nom à l’offre.";
  if (!TYPES.some((t) => t.id === p.type)) return "Choisis un modèle d’offre.";
  if (p.type === "xy" && !(Number(p.achetes) >= 1 && Number(p.offerts) >= 1)) return "Indique combien sont achetés et combien sont offerts.";
  if (p.type === "lot" && !(Number(p.quantite) >= 2)) return "Un lot compte au moins 2 produits.";
  if (p.type === "lot" && !(Number(p.prix_lot) > 0)) return "Indique le prix du lot.";
  if ((p.type === "remise" || p.type === "client") && !(Number(p.valeur) > 0)) return "Indique le montant de la remise.";
  if ((p.type === "remise" || p.type === "client") && p.mode === "pct" && Number(p.valeur) > 100) return "Une remise ne dépasse pas 100 %.";
  if (p.type === "client" && !((p.clients || []).length || (p.cercles || []).length)) return "Choisis le client ou le cercle qui a ce prix.";
  if (p.debut && p.fin && p.fin < p.debut) return "La fin de l’offre est avant son début.";
  return "";
}

/** Ligne à écrire dans promotions (champs inutiles au modèle remis à null). */
export function promotionAEnvoyer(p) {
  const t = p.type;
  return {
    ...(p.id ? { id: p.id } : {}),
    nom: String(p.nom || "").trim().slice(0, 80),
    type: t,
    produits: t === "client" && !(p.produits || []).length ? [] : [...(p.produits || [])],
    achetes: t === "xy" ? Number(p.achetes) : null,
    offerts: t === "xy" ? Number(p.offerts) : null,
    quantite: t === "lot" ? Number(p.quantite) : null,
    prix_lot: t === "lot" ? Number(p.prix_lot) : null,
    mode: t === "remise" || t === "client" ? (p.mode === "eur" ? "eur" : "pct") : "",
    valeur: t === "remise" || t === "client" ? Number(p.valeur) : null,
    minimum: t === "remise" ? Number(p.minimum) || 0 : 0,
    clients: [...(p.clients || [])],
    cercles: [...(p.cercles || [])],
    debut: p.debut || null,
    fin: p.fin || null,
    actif: p.actif !== false,
  };
}

/** Aperçu pour le client (carte sombre de « Créer une offre ») : titre et détail, avec le prix moyen des produits. */
export function apercu(p, prixUnitaire = 0) {
  const pu = cts(prixUnitaire);
  if (p.type === "xy") {
    const x = Number(p.achetes) || 0, y = Number(p.offerts) || 0, tot = x + y;
    if (!pu || !tot) return { titre: `${tot} pour le prix de ${x}`, detail: "Les moins chers sont offerts." };
    return { titre: `${tot} pour ${prixEur(x * pu)}`, detail: `Au lieu de ${prixEur(tot * pu)} : soit −${Math.round((y / tot) * 100)} %. Les ${tot} sortent du stock.` };
  }
  if (p.type === "lot") {
    const q = Number(p.quantite) || 0, prix = cts(p.prix_lot);
    if (!pu || !prix) return { titre: `${q} pour ${prix ? prixEur(prix) : "?"}`, detail: "Les plus chers du panier entrent dans le lot." };
    const plein = q * pu;
    return { titre: `${q} pour ${prixEur(prix)}`, detail: plein > prix ? `Au lieu de ${prixEur(plein)} : soit −${Math.round(((plein - prix) / plein) * 100)} %.` : "Attention : ce prix n’est pas plus bas que le prix normal." };
  }
  const v = p.mode === "pct" ? `−${n(Number(p.valeur) || 0, 2)} %` : `−${prixEur(cts(p.valeur))}`;
  const ex = cts(Math.max(Number(p.minimum) || 0, 40));
  const apres = p.mode === "pct" ? ex - Math.round((ex * Number(p.valeur || 0)) / 100) : Math.max(0, ex - cts(p.valeur));
  return { titre: `${v}${Number(p.minimum) > 0 ? ` dès ${prixEur(cts(p.minimum))} d’achat` : ""}`, detail: `Ex. ${prixEur(ex)} d’achat → ${prixEur(apres)}.` };
}

/**
 * Lignes de remise à afficher sous les produits d'une vente (reçu, facture, détail) : [{ libelle, montant }] en euros
 * positifs. Une vente enregistrée sans le détail (lignes remisées seulement) donne une seule ligne « Remise ».
 */
export function lignesRemise(vente, lignes) {
  if (!vente) return [];
  const out = [];
  if (cts(vente.remise_offre) > 0) out.push({ libelle: vente.promotion_nom ? `Offre « ${vente.promotion_nom} »` : "Offre", montant: euros(cts(vente.remise_offre)) });
  if (cts(vente.remise_manuelle) > 0) {
    const d = [vente.remise_libelle, vente.remise_motif].filter(Boolean).join(", ");
    out.push({ libelle: d ? `Remise (${d})` : "Remise", montant: euros(cts(vente.remise_manuelle)) });
  }
  if (!out.length) {
    const t = (lignes || []).filter((l) => l.vente_id === vente.id).reduce((s, l) => s + cts(l.remise), 0);
    if (t > 0) out.push({ libelle: "Remise", montant: euros(t) });
  }
  return out;
}

/** Montant brut d'une vente (avant remise), en euros. */
export const venteBrut = (vente, lignes) => euros((lignes || []).filter((l) => l.vente_id === vente?.id).reduce((t, l) => t + cts(Number(l.quantite || 0) * Number(l.prix_unitaire || 0)), 0));
