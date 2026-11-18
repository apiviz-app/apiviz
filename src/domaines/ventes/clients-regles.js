// Apiviz — règles pures des ventes et des clients (v5.66, maquettes « Ventes, clients et récolte » du 18 nov. 2026).
// Vitrine des produits, recherche de client (« Pour qui ? »), adresses proposées dans la fiche client. Pas de navigateur
// ni de base : testées par tests/unitaires/clients.test.mjs.
import * as P from "../production/produits.js";
import { plat } from "../../noyau/choisir.js";

/* ---------- Vitrine de l'écran Ventes ---------- */

/**
 * Produits en vitrine : un par nom et format (« Miel toutes fleurs 250 g », « Hydromel 75 cl »), avec ce qui reste de
 * tous leurs lots. Le lot à vendre est le plus ancien qui a encore du stock. Ceux qui ont du stock d'abord (dans
 * l'ordre du catalogue : le miel, puis les modèles), puis au plus `epuises` produits épuisés.
 */
export function vitrine(lots, { max = 6, epuises = 2 } = {}) {
  const rang = (c) => { const i = P.MODELES.findIndex((m) => m.categorie === c); return i < 0 ? P.MODELES.length : i; };
  const groupes = new Map();
  for (const l of lots || []) {
    const cle = [P.categorieDe(l), P.nomLot(l).toLowerCase(), P.formatLot(l)].join("|");
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(l);
  }
  const produits = [...groupes.values()].map((ls) => {
    const tries = [...ls].sort((a, b) => String(a.code || "").localeCompare(String(b.code || ""), "fr", { numeric: true }));
    const avecStock = tries.filter((l) => Number(l.pots_restants) > 0);
    const lot = avecStock[0] || tries[tries.length - 1];
    const restants = avecStock.reduce((s, l) => s + Number(l.pots_restants || 0), 0);
    return {
      cle: lot.id, lot, lots: tries, categorie: P.categorieDe(lot), nom: P.nomLot(lot), format: P.formatLot(lot),
      restants, prix: Number(lot.prix) || 0, prixAFixer: !(Number(lot.prix) > 0), epuise: restants <= 0, bas: avecStock.some(P.stockBas),
      codes: avecStock.map((l) => l.code).filter(Boolean),
    };
  });
  const ordre = (a, b) => rang(a.categorie) - rang(b.categorie) || a.nom.localeCompare(b.nom, "fr") || (Number(a.lot.format_g) || 0) - (Number(b.lot.format_g) || 0);
  const enStock = produits.filter((p) => !p.epuise).sort(ordre);
  const vides = produits.filter((p) => p.epuise).sort(ordre).slice(0, epuises);
  return [...enStock, ...vides].slice(0, max);
}

/** Taille du pot dessiné : petit (moins de 500 g), moyen, grand (1 kg et plus). */
export const taillePot = (lot) => { const g = Number(lot?.format_g) || 0; return g >= 1000 ? "grand" : g >= 500 ? "moyen" : "petit"; };

/* ---------- Recherche de client ---------- */

/** Initiales d'un nom : « Clara Lemoine » → « CL », « Mme Martin » → « MM », « Johan » → « JO ». */
export function initiales(nom) {
  const mots = String(nom || "").trim().split(/[\s'’-]+/).filter(Boolean);
  if (!mots.length) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

/**
 * Clients qui correspondent à ce qui est tapé, dans le nom (début d'un mot d'abord), la ville ou le téléphone. Sans
 * texte : les clients des dernières ventes, puis les autres par ordre alphabétique. Le client « Vente au marché » n'y
 * est pas : il a son propre choix. Chaque résultat garde où se trouve le texte dans le nom (debut, fin) pour le surligner.
 */
export function chercherClients(d, texte, { max = 8, exclure = [] } = {}) {
  const t = plat(texte), sans = new Set(exclure.map(plat));
  const ventes = [...(d.ventes || [])].sort((a, b) => String(b.date_vente).localeCompare(String(a.date_vente)));
  const derniere = new Map();
  for (const v of ventes) if (!derniere.has(v.client_id)) derniere.set(v.client_id, v.date_vente);
  const achats = (id) => ventes.filter((v) => v.client_id === id).length;
  const clients = (d.clients || []).filter((c) => !sans.has(plat(c.nom)));
  const res = clients.map((c) => {
    const nom = plat(c.nom);
    if (!t) return { c, score: derniere.has(c.id) ? 0 : 1, debut: -1, fin: -1 };
    const i = nom.indexOf(t);
    const auDebutDUnMot = i === 0 || (i > 0 && /[\s'’-]/.test(nom[i - 1]));
    if (i >= 0) return { c, score: i === 0 ? 0 : auDebutDUnMot ? 1 : 2, debut: i, fin: i + t.length };
    const ailleurs = [c.ville, c.code_postal, String(c.telephone || "").replace(/\s/g, ""), c.email].some((x) => plat(x).includes(t.replace(/\s/g, "")) || plat(x).includes(t));
    return ailleurs ? { c, score: 3, debut: -1, fin: -1 } : null;
  }).filter(Boolean);
  res.sort((a, b) => a.score - b.score
    || (!t ? String(derniere.get(b.c.id) || "").localeCompare(String(derniere.get(a.c.id) || "")) : 0)
    || String(a.c.nom).localeCompare(String(b.c.nom), "fr"));
  return res.slice(0, max).map((r) => ({ client: r.c, debut: r.debut, fin: r.fin, achats: achats(r.c.id), dernier: derniere.get(r.c.id) || "" }));
}

/** Nom découpé pour surligner le texte trouvé : [avant, trouvé, après] (les indices viennent du nom sans accents). */
export function decouper(nom, debut, fin) {
  const s = String(nom || "");
  if (!(debut >= 0) || !(fin > debut)) return [s, "", ""];
  // Sans accents, chaque lettre garde sa place : normalize("NFD") n'ajoute que des signes, retirés par plat().
  return [s.slice(0, debut), s.slice(debut, fin), s.slice(fin)];
}

/* ---------- Adresses ---------- */

const cleAdresse = (a) => plat([a.adresse, a.code_postal, a.ville].join(" ")).replace(/\s+/g, " ");

/**
 * Adresses déjà saisies dans les fiches clients qui correspondent au texte (3 lettres au moins), une fois chacune,
 * avec les clients qui y habitent. `sauf` : le client en cours de modification.
 */
export function adressesConnues(clients, texte, { sauf = null, max = 3 } = {}) {
  const t = plat(texte).replace(/\s+/g, " ");
  if (t.length < 3) return [];
  const par = new Map();
  for (const c of clients || []) {
    if (c.id && c.id === sauf) continue;
    if (!String(c.adresse || "").trim()) continue;
    const cle = cleAdresse(c);
    if (!cle.includes(t)) continue;
    if (!par.has(cle)) par.set(cle, { adresse: String(c.adresse).trim(), code_postal: String(c.code_postal || "").trim(), ville: String(c.ville || "").trim(), noms: [] });
    par.get(cle).noms.push(c.nom);
  }
  return [...par.values()].slice(0, max);
}

/** « Même adresse que Marie Durand », « Même adresse que Marie Durand et 2 autres ». */
export function memeAdresse(noms) {
  const l = (noms || []).filter(Boolean);
  if (!l.length) return "";
  return `Même adresse que ${l[0]}${l.length > 1 ? ` et ${l.length - 1} autre${l.length > 2 ? "s" : ""}` : ""}`;
}

/** Adresse de recherche officielle (service de géocodage de l'IGN, ex-API Adresse de la Base Adresse Nationale). */
export const SERVICE_ADRESSES = "https://data.geopf.fr/geocodage/search";
export function urlAdresses(texte, { lat = null, lon = null, limite = 5 } = {}) {
  const p = new URLSearchParams({ q: String(texte || "").trim(), limit: String(limite), autocomplete: "1", index: "address" });
  if (lat != null && lon != null && isFinite(lat) && isFinite(lon)) { p.set("lat", String(lat)); p.set("lon", String(lon)); }
  return `${SERVICE_ADRESSES}?${p}`;
}

/** Réponse du service (GeoJSON) → [{ adresse, code_postal, ville, libelle }] ; les communes seules gardent une adresse vide. */
export function lireAdresses(json) {
  const vus = new Set();
  return ((json && json.features) || []).map((f) => {
    const p = f.properties || {};
    const rue = p.type === "municipality" ? "" : String(p.name || "").trim();
    return { adresse: rue, code_postal: String(p.postcode || "").trim(), ville: String(p.city || "").trim(), libelle: String(p.label || [rue, p.postcode, p.city].filter(Boolean).join(" ")).trim() };
  }).filter((a) => (a.adresse || a.ville) && !vus.has(cleAdresse(a)) && vus.add(cleAdresse(a)));
}

/** Point de départ des suggestions : le premier rucher situé (les adresses les plus proches d'abord). */
export function centre(d) {
  const r = [...(d.ruchers || []), ...(d.ruches || [])].find((x) => isFinite(Number(x.lat)) && isFinite(Number(x.lng)) && x.lat != null && x.lng != null);
  return r ? { lat: Number(r.lat), lon: Number(r.lng) } : { lat: null, lon: null };
}
