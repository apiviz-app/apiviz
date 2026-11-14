// Apiviz — règles financières (IT-03, AP-FEAT-013). Fonctions pures, reprises d'app.js (fin, rythme, stock).
// `d` a la forme de S.d : { ventes, lignes, depenses, recoltes, lots }. `maintenant` permet de tester une date fixe.
import { sum, byId, yr, mo } from "../../noyau/format.js";

/** Montant d'une vente : somme quantité × prix de ses lignes. */
export const venteTotal = (d, vente) =>
  sum(d.lignes.filter((ligne) => ligne.vente_id === vente.id), (ligne) => ligne.quantite * ligne.prix_unitaire);

/** Miel en stock : pots, kilos restants, kilos mis en pots, valeur à vendre. */
export function stock(d) {
  return {
    pots: sum(d.lots, (lot) => lot.pots_restants),
    kg: sum(d.lots, (lot) => (lot.pots_restants * lot.format_g) / 1e3),
    kgPots: sum(d.lots, (lot) => (lot.pots_initiaux * lot.format_g) / 1e3),
    valeur: sum(d.lots, (lot) => lot.pots_restants * lot.prix),
  };
}

/**
 * Bilan d'une année : chiffre d'affaires (ventes de l'année, payées ou non), encaissé, dépenses, résultat,
 * séries par mois, trésorerie cumulée (report des années précédentes + encaissé − dépensé, mois écoulés seulement),
 * coût de revient et prix de vente au kilo (null quand il n'y a rien à diviser).
 */
export function fin(d, annee, maintenant = new Date()) {
  const total = (vente) => venteTotal(d, vente);
  const ventes = d.ventes.filter((vente) => yr(vente.date_vente) === annee),
    depenses = d.depenses.filter((depense) => yr(depense.date_depense) === annee),
    recoltes = d.recoltes.filter((recolte) => yr(recolte.date_recolte) === annee),
    idsVentes = new Set(ventes.map((vente) => vente.id)),
    lignes = d.lignes.filter((ligne) => idsVentes.has(ligne.vente_id)),
    ca = sum(lignes, (ligne) => ligne.quantite * ligne.prix_unitaire),
    encaisse = sum(ventes.filter((vente) => vente.paye), total),
    charges = sum(depenses, (depense) => depense.montant),
    kgRecolte = sum(recoltes, (recolte) => recolte.kg),
    kgVendu = sum(lignes, (ligne) => (ligne.quantite * (byId(d.lots, ligne.lot_id)?.format_g || 0)) / 1e3),
    moisCa = Array(12).fill(0),
    moisEncaisse = Array(12).fill(0),
    moisDepenses = Array(12).fill(0),
    moisPots = Array(12).fill(0);
  ventes.forEach((vente) => {
    const t = total(vente);
    moisCa[mo(vente.date_vente)] += t;
    if (vente.paye) moisEncaisse[mo(vente.date_vente)] += t;
    moisPots[mo(vente.date_vente)] += sum(d.lignes.filter((ligne) => ligne.vente_id === vente.id), (ligne) => ligne.quantite);
  });
  depenses.forEach((depense) => { moisDepenses[mo(depense.date_depense)] += Number(depense.montant); });
  const report =
    sum(d.ventes.filter((vente) => yr(vente.date_vente) < annee && vente.paye), total) -
    sum(d.depenses.filter((depense) => yr(depense.date_depense) < annee), (depense) => depense.montant);
  let cumul = report;
  const anneeCourante = maintenant.getFullYear();
  const dernierMois = anneeCourante === annee ? maintenant.getMonth() : annee > anneeCourante ? -1 : 11;
  const tresorerie = moisEncaisse.map((enc, mois) => ((cumul += enc - moisDepenses[mois]), mois <= dernierMois ? cumul : null));
  return {
    ventes, dep: depenses, lignes, ca, encaisse, aEncaisser: ca - encaisse, charges, resultat: ca - charges,
    kgRec: kgRecolte, kgVendu, mCa: moisCa, mEnc: moisEncaisse, mDep: moisDepenses, mPots: moisPots,
    treso: tresorerie, report, tresoFin: report + encaisse - charges,
    coutKg: kgRecolte ? charges / kgRecolte : null,
    prixKg: kgVendu ? ca / kgVendu : null,
  };
}

/** Rythme de vente : pots vendus par mois sur les 90 derniers jours, et mois de stock restants à ce rythme. */
export function rythme(d, maintenant = new Date()) {
  const depuis = new Date(maintenant.getTime() - 90 * 864e5).toISOString().slice(0, 10);
  const idsVentes = new Set(d.ventes.filter((vente) => vente.date_vente >= depuis).map((vente) => vente.id));
  const potsParMois = sum(d.lignes.filter((ligne) => idsVentes.has(ligne.vente_id)), (ligne) => ligne.quantite) / 3;
  const pots = stock(d).pots;
  return { mois: potsParMois, moisRestants: potsParMois > 0 ? pots / potsParMois : null };
}

/**
 * Fichier comptable de l'année (v5.38, Réglages › Tes données) : une ligne par vente et par dépense, dans l'ordre des
 * dates, avec la nature de la dépense (consommable, immobilisation amortie, service) déduite de l'article.
 * Colonnes : Date, Type, Libellé, Tiers, Catégorie, Nature, Amortissement (ans), Recette, Dépense, Pièce, Payée.
 */
export function journalComptable(d, annee) {
  const an = String(annee);
  const nom = (liste, id) => (liste || []).find((x) => x.id === id)?.nom || "";
  const ventes = (d.ventes || []).filter((v) => String(v.date_vente || "").slice(0, 4) === an).map((v) => ({
    date: v.date_vente, type: "Vente", libelle: v.facture_num ? `Facture ${v.facture_num}` : "Vente de miel", tiers: nom(d.clients, v.client_id),
    categorie: "Ventes de miel", nature: "", amort: "", recette: Math.round(venteTotal(d, v) * 100) / 100, depense: "", piece: v.facture_num || "",
    payee: v.paye ? "Oui" : "Non",
  }));
  const depenses = (d.depenses || []).filter((x) => String(x.date_depense || "").slice(0, 4) === an).map((x) => ({
    date: x.date_depense, type: "Dépense", libelle: x.libelle || "", tiers: nom(d.fournisseurs, x.fournisseur_id), categorie: x.categorie || "",
    nature: x.nature === "Immobilisation" ? "Équipement amorti" : x.nature === "Service" ? "Service" : "Consommable",
    amort: x.nature === "Immobilisation" ? x.duree_amort || 5 : "", recette: "", depense: Math.round(Number(x.montant || 0) * 100) / 100,
    piece: x.piece || "", payee: "Oui",
  }));
  return [...ventes, ...depenses].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
