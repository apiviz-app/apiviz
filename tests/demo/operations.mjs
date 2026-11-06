// Données de démonstration (IT-04, AP-FEAT-018) : du fichier JSON unique à la liste ordonnée des opérations à faire,
// la même pour une vraie base (scripts/demo.mjs, par l'API) et pour la base en mémoire des tests SQL
// (tests/sql/test_demo.mjs). Les identifiants sont dérivés de l'exploitation créée : chaque chargement donne une
// exploitation neuve au contenu identique, sans conflit avec un chargement précédent.
import crypto from "node:crypto";

/** Identifiant stable dérivé de l'exploitation et d'une clé du fichier (« c01 », « v123 »…). */
export function identifiant(exploitation, cle) {
  const h = crypto.createHash("sha256").update(exploitation + "/" + cle).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Opérations, dans l'ordre : { insert: table, lignes: [...] } ou { rpc: nom, args: {...} }.
 * Visites et ventes passent par creer_visite et creer_vente (contrôles de stock et d'exploitation de la base).
 * Aucune ligne ne porte exploitation_id : la base le prend de l'exploitation courante (en-tête x-exploitation).
 */
export function operations(doc, exploitation) {
  if (doc?.format !== "apidoo-demo" || doc.version !== 1) throw new Error("Fichier de démonstration inconnu (format apidoo-demo, version 1 attendus)");
  const id = (cle) => (cle ? identifiant(exploitation, cle) : null);
  const ops = [];
  ops.push({ rpc: "regler", args: { p_modifs: { nom: doc.nom, ...doc.reglages } } });
  ops.push({ insert: "fournisseurs", lignes: doc.fournisseurs.map((f) => ({ id: id(f.cle), nom: f.nom, produits: f.produits || "" })) });
  ops.push({ insert: "articles", lignes: doc.articles.map((a) => ({ id: id(a.cle), nom: a.nom, type: a.type, unite: a.unite, stock: a.stock, seuil: a.seuil, valeur: a.valeur ?? null, fournisseur_id: id(a.fournisseur) })) });
  ops.push({ insert: "ruches", lignes: doc.colonies.map((c) => ({ id: id(c.cle), nom: c.nom, rucher: c.rucher, lat: c.lat, lng: c.lng, type_ruche: c.type_ruche,
    annee_reine: c.annee_reine, etat: c.etat, date_installation: c.date_installation })) });
  for (const v of doc.visites) {
    ops.push({ rpc: "creer_visite", args: { p: { id: id(v.cle), ruche_id: id(v.colonie), date_visite: v.date, activite: v.activite, provisions: v.provisions,
      reine: v.reine, couvain: v.couvain, poids_kg: v.poids_kg, varroa: v.varroa ?? "", varroa_methode: v.varroa_methode, note: v.note,
      intrants: v.intrants.map((i) => ({ article_id: id(i.article), quantite: i.quantite })) } } });
  }
  ops.push({ insert: "recoltes", lignes: doc.recoltes.map((r, i) => ({ id: id("r" + i), ruche_id: id(r.colonie), date_recolte: r.date, kg: r.kg, miel: r.miel, hausses: r.hausses })) });
  ops.push({ insert: "lots", lignes: doc.lots.map((l) => ({ id: id(l.cle), code: l.code, miel: l.miel, format_g: l.format_g, prix: l.prix, pots_initiaux: l.pots_initiaux,
    date_mise_en_pot: l.date_mise_en_pot, ddm: l.ddm })) });
  ops.push({ insert: "clients", lignes: doc.clients.map((k) => ({ id: id(k.cle), nom: k.nom, cercle: k.cercle })) });
  for (const s of doc.ventes) {
    ops.push({ rpc: "creer_vente", args: { p: { id: id(s.cle), client_id: id(s.client), date_vente: s.date, paye: s.paye, mode: s.paye ? s.mode : "",
      lignes: s.lignes.map((l) => ({ lot_id: id(l.lot), quantite: l.quantite })) } } });
  }
  ops.push({ insert: "depenses", lignes: doc.depenses.map((d, i) => ({ id: id("d" + i), date_depense: d.date, categorie: d.categorie, libelle: d.libelle, montant: d.montant, fournisseur_id: id(d.fournisseur) })) });
  ops.push({ insert: "taches", lignes: doc.taches.map((t, i) => ({ id: id("t" + i), titre: t.titre, echeance: t.echeance, ruche_id: id(t.colonie) })) });
  return ops;
}

/** Résumé attendu après chargement, pour vérifier. */
export function attendu(doc) {
  return { ruchers: new Set(doc.colonies.map((c) => c.rucher)).size, colonies: doc.colonies.length, visites: doc.visites.length,
    saisons: new Set(doc.visites.map((v) => v.date.slice(0, 4))).size, ventes: doc.ventes.length, recoltes: doc.recoltes.length };
}
