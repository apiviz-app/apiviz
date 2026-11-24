// Apiviz — d'un pot à ses ruches (v5.83, maquette « apiviz — Idées à forte valeur », idée 3, validée par Pierre-Louis le
// 24 nov. 2026). Règles pures, testées par tests/unitaires/tracabilite.test.mjs.
// La fiche de lot montrait déjà l'histoire du lot (v5.30) et ses clients ; on y ajoute : le QR de l'étiquette du pot
// (« ?lot=<code> », court pour rester lisible sur 14 mm), les ruchers et colonies d'origine, les traitements notés
// pendant la miellée (fenêtre avant la récolte) et, si un souci est signalé, qui prévenir.
import { byId, sum } from "../../noyau/format.js";

const CLIENT_MARCHE = "Vente au marché";

/** Lien imprimé dans le QR du pot : l'adresse de l'application et le code du lot. */
export function lienLot(base, code) {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("lot", String(code || "").trim());
  return u.toString();
}

/** Ce que contient un QR de pot : { code } ou null (pas un lien de lot d'Apiviz). */
export function lireLienLot(texte) {
  try {
    const u = new URL(String(texte || "").trim());
    const c = (u.searchParams.get("lot") || "").trim();
    return c && c.length <= 40 ? { code: c } : null;
  } catch { return null; }
}

/** Le lot de ce code dans l'exploitation ouverte (sans tenir compte des majuscules), ou null. */
export const trouverLot = (lots, code) => (lots || []).find((l) => String(l.code || "").trim().toLowerCase() === String(code || "").trim().toLowerCase()) || null;

/**
 * Origine d'un lot : récoltes de son extraction, kilos, colonies et ruchers (noms), première et dernière date.
 * rucherDe(ruche) → nom du rucher.
 */
export function origine(d, lot, rucherDe = (r) => r.rucher || "") {
  const recoltes = lot?.extraction ? (d.recoltes || []).filter((r) => r.extraction === lot.extraction) : [];
  const toutes = [...(d.ruches || []), ...(d.ruchesSorties || [])];
  const ruches = [...new Set(recoltes.map((r) => r.ruche_id).filter(Boolean))].map((id) => byId(toutes, id)).filter(Boolean);
  const dates = recoltes.map((r) => String(r.date_recolte)).sort();
  return {
    recoltes, kg: Math.round(sum(recoltes, (r) => r.kg) * 10) / 10,
    ruches: ruches.map((r) => r.nom), ids: ruches.map((r) => r.id),
    ruchers: [...new Set(ruches.map(rucherDe).filter(Boolean))],
    premiere: dates[0] || null, derniere: dates[dates.length - 1] || null,
  };
}

const moins = (iso, j) => new Date(new Date(iso + "T12:00:00").getTime() - j * 864e5).toISOString().slice(0, 10);

/**
 * Traitements notés (champ « traitement » des visites) sur les colonies d'origine : pendant la miellée (de `jours`
 * jours avant la première récolte jusqu'à la dernière) et le dernier avant. { connu, pendant: [{ ruche, date,
 * produit }], dernier: { date, produit } | null, depuis }. connu = faux sans récolte reliée à des colonies.
 */
export function traitementsMiellee(d, o, jours = 60) {
  if (!o.premiere || !o.ids.length) return { connu: false, pendant: [], dernier: null, depuis: null };
  const depuis = moins(o.premiere, jours), ids = new Set(o.ids);
  const noms = new Map([...(d.ruches || []), ...(d.ruchesSorties || [])].map((r) => [r.id, r.nom]));
  const traites = (d.visites || []).filter((v) => ids.has(v.ruche_id) && String(v.traitement || "").trim())
    .map((v) => ({ ruche: noms.get(v.ruche_id) || "", date: String(v.date_visite), produit: String(v.traitement).trim() }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const pendant = traites.filter((t) => t.date >= depuis && t.date <= o.derniere);
  const avant = traites.filter((t) => t.date < depuis);
  return { connu: true, pendant, dernier: avant.length ? avant[avant.length - 1] : null, depuis };
}

/**
 * Si un souci est signalé : clients nommés qui ont acheté ce lot (avec téléphone et e-mail), pots vendus sans nom
 * (« Vente au marché ») et pots encore en stock.
 */
export function aPrevenir(d, lot) {
  const lignes = (d.lignes || []).filter((l) => l.lot_id === lot.id);
  const parClient = new Map();
  let anonymes = 0;
  for (const l of lignes) {
    const v = byId(d.ventes || [], l.vente_id), c = byId(d.clients || [], v?.client_id);
    if (!c || c.nom === CLIENT_MARCHE) { anonymes += Number(l.quantite) || 0; continue; }
    const x = parClient.get(c.id) || { client: c, quantite: 0 };
    x.quantite += Number(l.quantite) || 0;
    parClient.set(c.id, x);
  }
  const connus = [...parClient.values()].sort((a, b) => String(a.client.nom).localeCompare(String(b.client.nom), "fr"));
  const vendus = sum(lignes, (l) => l.quantite);
  return {
    connus, anonymes, vendus,
    stock: Math.max(0, Number(lot.pots_restants ?? (Number(lot.pots_initiaux) || 0) - vendus)),
    telephones: connus.map((x) => String(x.client.telephone || "").replace(/[^\d+]/g, "")).filter(Boolean),
    emails: connus.map((x) => String(x.client.email || "").trim()).filter(Boolean),
  };
}

/** Message aux clients d'un lot (vouvoiement, modifiable avant l'envoi). */
export function message(nomExploitation, lot, libelle) {
  return `Bonjour, vous avez acheté ${libelle} (lot ${lot.code}) chez ${nomExploitation || "nous"}. Par précaution, ce lot fait l’objet d’une vérification : merci de ne pas le consommer en attendant et de me répondre à ce message. Je vous l’échange ou je vous rembourse. Merci de votre compréhension.\n${nomExploitation || ""}`.trim();
}

/** Phrase des traitements pour la fiche : « Aucun traitement noté pendant la miellée (dernier : 3 mars) »… */
export function phraseTraitements(t, dfr = (x) => x) {
  if (!t.connu) return "Récolte non reliée à des colonies : traitements inconnus.";
  if (!t.pendant.length) return `Aucun traitement noté pendant la miellée${t.dernier ? ` (dernier : ${dfr(t.dernier.date)}, ${t.dernier.produit})` : ""}.`;
  return `${t.pendant.length} traitement${t.pendant.length > 1 ? "s" : ""} noté${t.pendant.length > 1 ? "s" : ""} pendant la miellée : ${t.pendant.map((x) => `${x.ruche} le ${dfr(x.date)} (${x.produit})`).join(", ")}. À vérifier avec le délai d’attente du produit.`;
}
