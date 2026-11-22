// Apiviz — règles pures des outils de terrain (v5.57, maquettes « Nouveautés » du 17 nov. 2026) : étiquette QR d'une
// ruche, caisse du marché, commandes en ligne. Testées par tests/unitaires/terrain.test.mjs.
import { estMiel, nomLot, formatLot, categorieDe } from "../production/produits.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Étiquettes QR ----------
/** Lien d'une ruche, imprimé dans son QR : l'adresse de l'application, la ruche et son exploitation. */
export function lienRuche(base, exploitation, id) {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("ruche", id);
  if (exploitation) u.searchParams.set("ex", exploitation);
  return u.toString();
}

/** Ce que contient un QR lu (lien d'Apiviz ou identifiant seul) : { ruche, ex } ou null. */
export function lireLienRuche(texte) {
  const t = String(texte || "").trim();
  if (UUID.test(t)) return { ruche: t.toLowerCase(), ex: null };
  try {
    const u = new URL(t);
    const r = u.searchParams.get("ruche"), ex = u.searchParams.get("ex");
    return r && UUID.test(r) ? { ruche: r.toLowerCase(), ex: ex && UUID.test(ex) ? ex.toLowerCase() : null } : null;
  } catch { return null; }
}

// ---------- Code court des QR (IT-10, migration 034) ----------
// 4 caractères (« K7M2 ») parmi 31 : ni 0, O, 1, I ni L, pour ne pas se tromper en recopiant. Unique dans l'exploitation.
export const ALPHABET_CODE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE = /^[2-9A-HJKMNP-Z]{4,6}$/;

/** Code tapé ou lu, ramené à sa forme (« k7m2 », « K7-M2 », « k 7 m 2 » → « K7M2 ») ; "" s'il n'est pas valable. */
export function normaliserCode(texte) {
  const c = String(texte || "").toUpperCase().replace(/[\s\-.·]/g, "");
  return CODE.test(c) ? c : "";
}

/** Lien court imprimé dans le QR : « ?c=K7M2&ex=<exploitation> ». Plus court que ?ruche=, donc un QR plus gros. */
export function lienCode(base, exploitation, code) {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("c", code);
  if (exploitation) u.searchParams.set("ex", exploitation);
  return u.toString();
}

/**
 * Ce que contient un QR ou une adresse : { ruche, code, ex }, ou null.
 * Lit le lien court (?c=), les étiquettes déjà collées (?ruche=, v5.57), un identifiant seul ou un code seul.
 */
export function lireQr(texte) {
  const t = String(texte || "").trim();
  const ancien = lireLienRuche(t);
  if (ancien) return { ruche: ancien.ruche, code: "", ex: ancien.ex };
  const seul = normaliserCode(t);
  if (seul && !/^https?:/i.test(t)) return { ruche: "", code: seul, ex: null };
  try {
    const u = new URL(t);
    const c = normaliserCode(u.searchParams.get("c")), ex = u.searchParams.get("ex");
    return c ? { ruche: "", code: c, ex: ex && UUID.test(ex) ? ex.toLowerCase() : null } : null;
  } catch { return null; }
}

/** La colonie désignée par ce que lireQr a rendu, parmi celles de l'exploitation ouverte ; null si aucune. */
export function trouverRuche(ruches, p) {
  if (!p || !Array.isArray(ruches)) return null;
  if (p.ruche) return ruches.find((r) => String(r.id).toLowerCase() === p.ruche) || null;
  if (p.code) return ruches.find((r) => String(r.code_qr || "").toUpperCase() === p.code) || null;
  return null;
}

/**
 * Pourquoi rien n'a été trouvé : « autre » (le QR vient d'une autre exploitation), « attente » (hors ligne, la colonie
 * n'est peut-être pas encore sur ce téléphone) ou « inconnu ». Message en français, au tutoiement.
 */
export function raisonIntrouvable(p, exploitation, horsLigne) {
  if (p?.ex && exploitation && p.ex !== exploitation) {
    return { raison: "autre", texte: "Cette ruche n’est pas dans ton exploitation. Si tu en gères plusieurs, change d’exploitation depuis ton avatar, puis scanne à nouveau." };
  }
  if (horsLigne) return { raison: "attente", texte: "Cette ruche n’est pas encore sur ton téléphone. Elle s’ouvrira dès le retour du réseau." };
  return { raison: "inconnu", texte: p?.code ? `Aucune de tes ruches n’a le code ${p.code}.` : "Cette ruche n’existe plus dans Apiviz." };
}

/** Les colonies à imprimer : « nouvelles » (jamais imprimées), « toutes », ou celles choisies (ids). */
export function aImprimer(ruches, quoi, choisies = []) {
  const ls = Array.isArray(ruches) ? ruches : [];
  if (quoi === "nouvelles") return ls.filter((r) => !r.etiquette_imprimee_le);
  if (quoi === "choix") { const s = new Set(choisies); return ls.filter((r) => s.has(r.id)); }
  return ls;
}

// ---------- Caisse ----------
// Libellé d'un produit à la caisse : « Toutes fleurs 500 g », « Hydromel sec 75 cl » (v5.65, migration 032).
const libelleLot = (l) => (estMiel(l) ? `${l.miel || "Miel"} ${l.format_g} g` : `${nomLot(l)}${formatLot(l) ? " " + formatLot(l) : ""}`);

/** Produits proposés à la caisse : un par catégorie, nom, format et prix, avec le stock de tous les lots correspondants. */
export function produitsCaisse(lots) {
  const m = new Map();
  for (const l of lots || []) {
    const k = `${categorieDe(l)}|${l.miel || ""}|${l.format_g ?? ""}|${l.format_libelle || ""}|${Number(l.prix)}`;
    const p = m.get(k) || { cle: k, nom: libelleLot(l), categorie: categorieDe(l), miel: l.miel || "", format_g: l.format_g == null ? null : Number(l.format_g),
      format_libelle: l.format_libelle || "", unite: l.unite || "pot", prix: Number(l.prix), stock: 0, lots: [] };
    p.stock += Math.max(0, Number(l.pots_restants ?? 0));
    p.lots.push(l);
    m.set(k, p);
  }
  return [...m.values()].filter((p) => p.stock > 0 || p.lots.length)
    .sort((a, b) => (b.stock > 0) - (a.stock > 0) || (a.categorie !== "Miel") - (b.categorie !== "Miel") || a.categorie.localeCompare(b.categorie, "fr")
      || a.miel.localeCompare(b.miel, "fr") || (a.format_g || 0) - (b.format_g || 0) || a.format_libelle.localeCompare(b.format_libelle, "fr"));
}

/** Total du panier (q : { cle: nombre de pots }). */
export const totalPanier = (produits, q) => Math.round(produits.reduce((t, p) => t + (q[p.cle] || 0) * p.prix, 0) * 100) / 100;

/**
 * Lignes de vente (creer_vente, 017) : chaque pot est pris dans les lots les plus anciens du produit. Renvoie
 * { lignes, manque } (manque : le nom d'un produit qui n'a plus assez de pots).
 */
export function lignesVente(produits, q) {
  const lignes = [];
  for (const p of produits) {
    let reste = q[p.cle] || 0;
    const lots = [...p.lots].sort((a, b) => String(a.date_mise_en_pot || a.created_at || "").localeCompare(String(b.date_mise_en_pot || b.created_at || "")));
    for (const l of lots) {
      if (!reste) break;
      const n = Math.min(reste, Math.max(0, Number(l.pots_restants ?? 0)));
      if (n > 0) { lignes.push({ lot_id: l.id, quantite: n }); reste -= n; }
    }
    if (reste > 0) return { lignes: [], manque: p.nom };
  }
  return { lignes, manque: "" };
}

/** Ventes du jour faites à la caisse (client « Vente au marché ») : nombre et montant. */
export function ventesDuJour(d, clientId, jour) {
  const vs = (d.ventes || []).filter((v) => v.client_id === clientId && String(v.date_vente).slice(0, 10) === jour);
  const ids = new Set(vs.map((v) => v.id));
  const montant = (d.lignes || []).filter((l) => ids.has(l.vente_id)).reduce((t, l) => t + Number(l.quantite) * Number(l.prix_unitaire || 0), 0);
  return { nb: vs.length, montant: Math.round(montant * 100) / 100 };
}

// ---------- Commandes en ligne ----------
/** Lien de la page publique de commande. */
export function lienBoutique(base, jeton) {
  const u = new URL("commande.html", base);
  u.searchParams.set("b", jeton);
  return u.toString();
}

/** Commandes rangées : à préparer (les plus anciennes d'abord), puis les dernières traitées. */
export function rangerCommandes(cs) {
  const l = cs || [];
  return {
    aPreparer: l.filter((c) => c.statut === "nouvelle").sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))),
    traitees: l.filter((c) => c.statut !== "nouvelle").sort((a, b) => String(b.traitee_le || b.created_at).localeCompare(String(a.traitee_le || a.created_at))).slice(0, 20),
  };
}

/** « 2 × Printemps 500 g · 1 × Été 250 g » */
export const detailCommande = (c) => (c.lignes || []).map((l) => `${l.quantite} × ${l.miel || "Miel"} ${l.format_libelle || (l.format_g ? l.format_g + " g" : "")}`.trim()).join(" · ");
export const potsCommande = (c) => (c.lignes || []).reduce((t, l) => t + Number(l.quantite || 0), 0);

/** Message prêt à envoyer au client (SMS) quand sa commande est prête. Message émis : vouvoiement (charte de ton). */
export function messagePret(c, signature) {
  const prenom = String(c.nom || "").trim().split(/\s+/)[0] || "";
  return `Bonjour ${prenom}, votre commande (${detailCommande(c)}) est prête${c.retrait ? ` : retrait ${c.retrait}` : ""}. À bientôt${signature ? `, ${signature}` : ""}.`.replace(/\s+/g, " ");
}

/** Lien sms: (iOS et Android acceptent « ?&body= » ou « ?body= » ; « ?body= » suffit aux deux aujourd'hui). */
export const lienSms = (tel, texte) => `sms:${String(tel || "").replace(/[^0-9+]/g, "")}?body=${encodeURIComponent(texte)}`;

/** Lieux de retrait saisis (une ligne « Nom : quand ») → [{ nom, quand }], 6 au plus. */
export function lireRetraits(texte) {
  return String(texte || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6).map((x) => {
    const i = x.indexOf(":");
    return i > 0 ? { nom: x.slice(0, i).trim(), quand: x.slice(i + 1).trim() } : { nom: x, quand: "" };
  }).filter((r) => r.nom);
}
export const ecrireRetraits = (rs) => (rs || []).map((r) => (r.quand ? `${r.nom} : ${r.quand}` : r.nom)).join("\n");
