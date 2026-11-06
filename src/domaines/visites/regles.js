// Apidoo — règles des visites (IT-03, AP-FEAT-014). Fonctions pures.
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
    varroa_methode: p.varroa_methode || "", varroa_abeilles: p.varroa_abeilles ? Number(p.varroa_abeilles) : null, ...extra,
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
