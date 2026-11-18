// Apiviz — produits de la ruche (v5.64, migration 032, maquettes « Produits de la ruche » du 18 nov. 2026).
// Un lot est le lot d'un produit : du miel en pots (categorie « Miel », format_g en grammes) ou un autre produit
// (hydromel, cire, bougie…) décrit par son nom (colonne miel), son unité et son format libre. Règles pures : pas de
// navigateur ni de base, testées par tests/unitaires/produits.test.mjs. Les scripts classiques les lisent par
// window.Regles.produits.
import { n } from "../../noyau/format.js";

/**
 * Modèles proposés à la création d'un produit : catégorie, unité de vente, formats courants, ce qu'Apiviz suit.
 * Le miel passe par la mise en pots (récolte, pots vides, étiquettes) : son modèle ouvre cet écran.
 */
export const MODELES = [
  { categorie: "Miel", unite: "pot", formats: ["250 g", "500 g", "1 kg"], icone: "pot", suivi: "Récolte, mise en pots, DDM, étiquettes" },
  { categorie: "Hydromel", unite: "bouteille", formats: ["75 cl", "50 cl", "37,5 cl"], icone: "bouteille", suivi: "Lots, DDM, prix par format" },
  { categorie: "Cire", unite: "pain", formats: ["Pain de 250 g", "Pain de 500 g", "Pain de 1 kg"], icone: "alveole", suivi: "Pains vendus, stock" },
  { categorie: "Bougie", unite: "pièce", formats: ["Petite", "Grande", "En pot"], icone: "bougie", suivi: "Modèles, stock" },
  { categorie: "Propolis", unite: "flacon", formats: ["Teinture 15 ml", "Teinture 30 ml", "Brute 20 g"], icone: "goutte", suivi: "Lots, DDM" },
  { categorie: "Pollen", unite: "sachet", formats: ["Sachet 100 g", "Sachet 250 g", "Pot 125 g"], icone: "pollen", suivi: "Lots, DDM" },
  { categorie: "Gelée royale", unite: "pot", formats: ["Pot 10 g", "Pot 20 g"], icone: "pot", suivi: "Lots, DDM, conservation au froid" },
  { categorie: "Pain d'épices", unite: "pièce", formats: ["250 g", "500 g"], icone: "gateau", suivi: "Lots, DDM" },
  { categorie: "Essaim", unite: "pièce", formats: ["Essaim sur 5 cadres", "Essaim sur 6 cadres"], icone: "abeille", suivi: "Réservations, ventes" },
  { categorie: "Reine", unite: "pièce", formats: ["Reine fécondée", "Cellule royale"], icone: "abeille", suivi: "Réservations, ventes" },
  { categorie: "Coffret", unite: "pièce", formats: ["Coffret découverte", "Coffret cadeau"], icone: "coffret", suivi: "Composition, prix" },
  { categorie: "Cosmétique", unite: "pièce", formats: ["Baume 30 ml", "Savon 100 g"], icone: "flacon", suivi: "Lots, DDM" },
];
export const UNITES = ["pot", "bouteille", "pièce", "flacon", "sachet", "pain", "boîte", "lot"];

const PLURIELS = { pièce: "pièces", pot: "pots", bouteille: "bouteilles", flacon: "flacons", sachet: "sachets", pain: "pains", boîte: "boîtes", lot: "lots" };

/** Catégorie d'un lot (les lots d'avant la migration 032 sont du miel). */
export const categorieDe = (lot) => String(lot?.categorie || "Miel");
export const estMiel = (lot) => categorieDe(lot) === "Miel";
export const modeleDe = (categorie) => MODELES.find((m) => m.categorie === categorie) || null;

/** Poids d'un pot de miel : « 500 g », « 1 kg ». */
export const formatGrammes = (g) => (Number(g) >= 1000 ? `${n(Number(g) / 1000)} kg` : `${n(Number(g) || 0, 0)} g`);

/** Format d'un lot : le poids du pot pour le miel, le format libre sinon (ou l'unité s'il n'y en a pas). */
export function formatLot(lot) {
  if (!lot) return "";
  if (estMiel(lot) && lot.format_g) return formatGrammes(lot.format_g);
  return String(lot.format_libelle || "").trim() || (lot.format_g ? formatGrammes(lot.format_g) : String(lot.unite || ""));
}

/** Nom d'un lot : « Toutes fleurs » pour le miel, « Hydromel sec » pour un autre produit. */
export const nomLot = (lot) => String(lot?.miel || "").trim() || (estMiel(lot) ? "Miel" : categorieDe(lot));

/**
 * Libellé complet : « Miel toutes fleurs 500 g », « Hydromel sec 75 cl ». Le mot « Miel » n'est ajouté que si le nom
 * ne le dit pas déjà.
 */
export function libelleLot(lot) {
  if (!lot) return "";
  const nom = nomLot(lot), fmt = formatLot(lot);
  const avant = estMiel(lot) && !/^miel\b/i.test(nom) ? `Miel ${nom.charAt(0).toLowerCase()}${nom.slice(1)}` : nom;
  return fmt && fmt !== nom ? `${avant} ${fmt}` : avant;
}

/** Unité d'un lot accordée au nombre : « 1 pot », « 3 bouteilles ». */
export function uniteLot(lot, quantite = 2) {
  const u = String(lot?.unite || (estMiel(lot) ? "pot" : "pièce"));
  return Math.abs(Number(quantite)) >= 2 ? PLURIELS[u] || (/[sx]$/.test(u) ? u : u + "s") : u;
}
export const quantiteLot = (lot, quantite) => `${n(Number(quantite) || 0, 0)} ${uniteLot(lot, quantite)}`;

/** Lots de miel seulement : les chiffres en kilos (stock, mis en pots, vendus) ne comptent qu'eux. */
export const lotsMiel = (lots) => (lots || []).filter(estMiel);

/** Le stock d'un lot passe sous son seuil d'alerte (s'il en a un). */
export const stockBas = (lot) => lot?.seuil != null && lot.seuil !== "" && Number(lot.pots_restants ?? 0) <= Number(lot.seuil);

/**
 * Numéro du prochain lot d'un produit : initiale de la catégorie, année sur deux chiffres, rang (« H26-01 »). Le miel
 * garde ses numéros « L26-01 » (materiel/regles.js, prochainCode).
 */
export function prochainCodeProduit(lots, categorie, annee = new Date().getFullYear()) {
  const lettre = String(categorie || "P").normalize("NFD").replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase() || "P";
  const prefixe = `${lettre}${String(annee).slice(2)}-`;
  const rangs = (lots || []).map((l) => String(l.code || "")).filter((c) => c.startsWith(prefixe)).map((c) => Number(c.slice(prefixe.length)) || 0);
  return prefixe + String(Math.max(0, ...rangs) + 1).padStart(2, "0");
}

/**
 * Produits du catalogue, regroupés par catégorie puis par nom et format, avec le stock de tous leurs lots.
 * Le miel d'abord, puis les autres catégories dans l'ordre des modèles, puis les catégories libres par ordre alphabétique.
 */
export function catalogue(lots) {
  const rang = (c) => { const i = MODELES.findIndex((m) => m.categorie === c); return i < 0 ? MODELES.length : i; };
  const groupes = new Map();
  for (const l of lots || []) {
    const c = categorieDe(l);
    const g = groupes.get(c) || { categorie: c, lots: [], restants: 0, valeur: 0, bas: 0 };
    g.lots.push(l);
    g.restants += Math.max(0, Number(l.pots_restants ?? 0));
    g.valeur += Math.max(0, Number(l.pots_restants ?? 0)) * Number(l.prix || 0);
    if (stockBas(l)) g.bas++;
    groupes.set(c, g);
  }
  return [...groupes.values()].sort((a, b) => rang(a.categorie) - rang(b.categorie) || a.categorie.localeCompare(b.categorie, "fr"));
}

/** Ligne à envoyer à creer_produit (032) depuis la saisie de l'écran « produit ». */
export function produitAEnvoyer(f) {
  const quantite = Math.floor(Number(f.quantite));
  if (!String(f.categorie || "").trim()) throw new Error("Choisis le type de produit.");
  if (f.categorie === "Miel") throw new Error("Le miel passe par la mise en pots.");
  if (!String(f.nom || "").trim()) throw new Error("Indique le nom du produit.");
  if (!(quantite >= 0) || String(f.quantite ?? "").trim() === "") throw new Error("Indique combien tu en as en stock.");
  if (Number(f.prix) < 0) throw new Error("Le prix ne peut pas être négatif.");
  if (!String(f.code || "").trim()) throw new Error("Indique le numéro de lot.");
  return {
    id: f.id, code: String(f.code).trim(), categorie: String(f.categorie).trim(), nom: String(f.nom).trim(),
    unite: String(f.unite || "pièce").trim() || "pièce", format_libelle: String(f.format_libelle || "").trim().slice(0, 40),
    prix: Number(f.prix) || 0, quantite, date: f.date || null, ddm: f.ddm || null,
    seuil: f.seuil === "" || f.seuil == null ? null : Math.max(0, Math.floor(Number(f.seuil)) || 0),
  };
}

/** Ajoute aux données du téléphone un produit pas encore envoyé (hors ligne), comme creer_produit(). */
export function appliquerProduit(d, p, extra = {}) {
  d.lots = d.lots || [];
  if (d.lots.some((l) => l.id === p.id)) return;
  d.lots.push({ id: p.id, code: p.code, categorie: p.categorie, miel: p.nom, unite: p.unite, format_libelle: p.format_libelle,
    format_g: null, prix: Number(p.prix || 0), pots_initiaux: p.quantite, pots_vendus: 0, pots_restants: p.quantite,
    date_mise_en_pot: p.date, ddm: p.ddm, seuil: p.seuil, extraction: "", ...extra });
}
