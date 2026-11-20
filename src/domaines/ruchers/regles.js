// Apiviz — règles des ruchers (IT-05, AP-FEAT-025 à 027). Fonctions pures, testées par tests/unitaires/ruchers.test.mjs.
// Le rucher est une ligne de la table ruchers (migration 015). Le texte ruches.rucher reste rempli et synchronisé par
// la base : c'est encore la clé de regroupement des anciens modules (U.ruchers()). Ces règles lisent la table quand
// elle est là, et retombent sur le texte sinon (base sans 015, données d'exemple, base simulée des tests).

/** Nom nettoyé : espaces en trop retirés (comme la base, ruchers_avant()). */
export const nomPropre = (t) => String(t ?? "").trim().replace(/\s+/g, " ");

/** Clé de comparaison des noms : espaces en trop retirés, minuscules (comme public.rucher_cle()). */
export const cle = (t) => nomPropre(t).toLowerCase();

/** Nom affiché d'une clé de regroupement : la clé vide est « Sans rucher ». */
export const nomAffiche = (k) => nomPropre(k) || "Sans rucher";

const ORDRE_ETAT = { Bonne: 0, "À surveiller": 1, Critique: 2 };

/** Pire état des colonies d'un rucher (« Bonne » s'il n'y en a pas). */
export function pire(rs) {
  return (rs || []).reduce((p, r) => ((ORDRE_ETAT[r.etat] ?? 0) > (ORDRE_ETAT[p] ?? 0) ? r.etat : p), "Bonne");
}

const arrondi = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Position d'un rucher : la sienne si elle est connue, sinon la moyenne des colonies placées (ancien calcul).
 * `decimales` : 6 pour la carte, 2 pour la météo (comme meteo.js avant IT-05).
 */
export function position(rucher, rs, decimales = 6) {
  if (rucher && rucher.lat != null && rucher.lng != null) {
    return { lat: arrondi(Number(rucher.lat), decimales), lng: arrondi(Number(rucher.lng), decimales) };
  }
  const p = (rs || []).filter((r) => r.lat != null && r.lng != null);
  if (!p.length) return null;
  const moy = (f) => arrondi(p.reduce((s, r) => s + Number(f(r)), 0) / p.length, decimales);
  return { lat: moy((r) => r.lat), lng: moy((r) => r.lng) };
}

/** Le rucher (ligne de la table) d'une colonie : par rucher_id, à défaut par son texte. */
export function rucherDe(ruchers, ruche) {
  if (!ruche) return null;
  const l = ruchers || [];
  if (ruche.rucher_id) { const x = l.find((r) => r.id === ruche.rucher_id); if (x) return x; }
  const k = cle(ruche.rucher);
  return k ? l.find((r) => cle(r.nom) === k) || null : null;
}

/** Le rucher (ligne de la table) d'une clé de regroupement (le texte ruches.rucher). */
export const rucherParCle = (ruchers, k) => (cle(k) ? (ruchers || []).find((r) => cle(r.nom) === cle(k)) || null : null);

/**
 * Les lieux à afficher (écran Ruchers, carte) : un par rucher de la table, y compris sans colonie, plus ceux que
 * seul le texte connaît (base sans 015), plus « Sans rucher » s'il a des colonies. Triés par nom, « Sans rucher » à
 * la fin. Chaque lieu : { cle, id, nom, rucher, rs, lat, lng, etat, archive }.
 * Les ruchers archivés ne sont rendus qu'avec { archives: true }.
 */
export function lieux(ruchers, ruches, { archives = false } = {}) {
  const table = (ruchers || []).filter((r) => archives || !r.archive_le);
  const parId = new Map(), parCle = new Map(), res = [];
  const ajouter = (x) => { res.push(x); if (x.id) parId.set(x.id, x); parCle.set(cle(x.cle), x); return x; };
  table.forEach((r) => ajouter({ cle: r.nom, id: r.id, nom: r.nom, rucher: r, rs: [], archive: !!r.archive_le }));
  (ruches || []).forEach((c) => {
    let l = (c.rucher_id && parId.get(c.rucher_id)) || parCle.get(cle(c.rucher));
    if (!l) {
      // Colonie d'un rucher archivé (ne devrait pas arriver : la base refuse) : rangée sous son texte.
      const k = nomPropre(c.rucher);
      l = ajouter({ cle: c.rucher || "", id: null, nom: nomAffiche(k), rucher: null, rs: [], archive: false });
    }
    l.rs.push(c);
  });
  res.forEach((l) => {
    const p = position(l.rucher, l.rs);
    Object.assign(l, { lat: p?.lat ?? null, lng: p?.lng ?? null, etat: pire(l.rs) });
  });
  return res.sort((a, b) => (!cle(a.cle) - !cle(b.cle)) || cle(a.cle).localeCompare(cle(b.cle), "fr"));
}

/** Lien d'appel : chiffres et « + » seulement ; null si le numéro est vide. */
export function lienTel(tel) {
  const t = String(tel ?? "").replace(/[^\d+]/g, "");
  return t.replace(/\+/g, "").length >= 3 ? "tel:" + t : null;
}

/** Itinéraire vers une position (Google Maps, comme les autres boutons « Itinéraire » de l'application). */
export const lienItineraire = (p) => (p && p.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : null);

// ---------- Carte et adresses : services publics de l'IGN (v5.72) ----------
// Plan IGN et le géocodage de la Géoplateforme sont gratuits, sans clé, sous Licence Ouverte (usage commercial permis,
// source à citer). Ils remplacent tile.openstreetmap.org et nominatim.openstreetmap.org, interdits aux applications
// très utilisées ou commerciales. Limite : 50 requêtes par seconde et par adresse IP, donc par téléphone.

/** Fond de carte Plan IGN (WMTS de la Géoplateforme, grille Web Mercator, lu par Leaflet comme des tuiles XYZ). */
export const FOND_CARTE = Object.freeze({
  url: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"
    + "&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
  options: Object.freeze({ minZoom: 0, maxZoom: 19, attribution: "© IGN – Plan IGN" }),
  mention: "Fond de carte © IGN (Plan IGN), adresses : Géoplateforme de l'IGN.",
});

const GEOCODAGE = "https://data.geopf.fr/geocodage";

/** Recherche d'une commune ou d'une adresse (France). */
export function urlCherche(texte) {
  const p = new URLSearchParams({ q: String(texte ?? "").trim(), limit: "1" });
  return `${GEOCODAGE}/search?${p}`;
}

/** Réponse de la recherche (GeoJSON) → { lat, lng, libelle } ou null. */
export function lireCherche(json) {
  const f = json?.features?.[0], c = f?.geometry?.coordinates;
  if (!Array.isArray(c) || !isFinite(Number(c[0])) || !isFinite(Number(c[1]))) return null;
  const p = f.properties || {};
  const libelle = p.type === "municipality" ? [p.city || p.name, p.postcode].filter(Boolean).join(" ") : (p.label || p.name || "");
  return { lat: Number(c[1]), lng: Number(c[0]), libelle: String(libelle).trim() };
}

/** Commune la plus proche d'un point (déclaration annuelle des ruches). */
export function urlCommune(lat, lng) {
  const p = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: "1" });
  return `${GEOCODAGE}/reverse?${p}`;
}

/** Réponse de la recherche inverse → « Commune · code postal » (« » si rien). */
export function lireCommune(json) {
  const p = json?.features?.[0]?.properties || {};
  return [p.city || p.municipality || "", p.postcode || ""].map((x) => String(x).trim()).filter(Boolean).join(" · ");
}

/** Un nom de rucher est-il libre ? (sans tenir compte de la casse ni des espaces ; `sauf` : le rucher renommé). */
export function nomLibre(ruchers, nom, sauf = null) {
  const k = cle(nom);
  return !!k && !(ruchers || []).some((r) => r.id !== sauf && cle(r.nom) === k);
}

/** Un rucher peut-il être archivé ? Seulement sans colonie active (comme la base). */
export const archivable = (rs) => !(rs || []).some((r) => !r.sortie);

/** Champs de la fiche « Infos » (AP-TECH-094), dans l'ordre d'affichage. */
export const CHAMPS_INFOS = Object.freeze([
  ["acces", "Accès", "Portail, code, chemin, clé, où se garer…"],
  ["proprietaire", "Propriétaire du terrain", ""],
  ["proprietaire_tel", "Téléphone du propriétaire", ""],
  ["capacite", "Capacité (colonies)", ""],
  ["environnement", "Environnement", "Bois, cultures, haies, voisinage…"],
  ["ressources", "Ressources", "Flore, miellées…"],
  ["point_eau", "Point d’eau", ""],
  ["notes", "Notes", ""],
]);

/** Infos d'un rucher prêtes à enregistrer à partir d'un formulaire (chaînes nettoyées, capacité en nombre ou null). */
export function infosDepuis(f) {
  const o = {};
  CHAMPS_INFOS.forEach(([k]) => {
    const v = String(f?.[k] ?? "").trim();
    o[k] = k === "capacite" ? (v === "" ? null : Math.max(0, Math.round(Number(v)) || 0)) : v;
  });
  return o;
}
