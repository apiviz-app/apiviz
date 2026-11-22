// Apiviz — règles pures des photos (IT-11, AP-FEAT-047 et AP-FEAT-048).
// Lues par photos.js (script classique) sous window.Regles.photos (src/passerelle.js), et par les compléments d'écran
// de src/domaines/photos/. Aucune globale d'app.js ici : tout est testable sous Node (tests/unitaires/photos.test.mjs).

/** Espace de l'offre gratuite Supabase : 1 Go (photos.js le disait déjà, IT-02). */
export const QUOTA = 1024 ** 3;
/** Alerte à 80 % du quota (fiche IT-11, §11). */
export const SEUIL_ALERTE = 0.8;
/** Taille moyenne d'une photo quand aucune n'est encore enregistrée : la réduction vise 320 Ko au plus. */
export const MOYENNE_PAR_DEFAUT = 300 * 1024;
/** Délai avant qu'un fichier sans fiche soit retiré par le nettoyage de nuit (choix validé le 22 nov. 2026). */
export const DELAI_NETTOYAGE_JOURS = 7;

/** Rattachements proposés pour une photo prise pendant une visite (AP-TECH-165). */
export const LIENS = [["visite", "Visite"], ["colonie", "Colonie"], ["rucher", "Rucher"]];

/** Vrai pour une photo au format HEIC ou HEIF (iPhone), d'après son type ou, à défaut, son nom. */
export function estHeic(f) {
  if (!f) return false;
  return /^image\/hei[cf](-sequence)?$/i.test(f.type || "") || /\.hei[cf]$/i.test(f.name || "");
}

/** Message de repli quand le téléphone n'a pas pu lire la photo (AP-TECH-164). Tutoiement, en français. */
export function messageIllisible(f) {
  return estHeic(f)
    ? "Cette photo HEIC n’a pas pu être lue sur ce téléphone. Reprends-la avec « Prendre une photo », ou choisis « Le plus compatible » dans Réglages › Appareil photo › Formats de l’iPhone."
    : "Cette photo n’a pas pu être lue. Essaie d’en prendre une nouvelle.";
}

/** Emplacement du fichier dans le stockage. Le dossier de l'exploitation vient toujours en premier (règles 014). */
export function chemin({ ex = "", id, visite_id = null, colonie_id = null, rucher_id = null }) {
  const dossier = visite_id ? visite_id : colonie_id ? `colonies/${colonie_id}` : rucher_id ? `ruchers/${rucher_id}` : null;
  if (!id || !dossier) throw new Error("Photo sans fiche : choisis une visite, une colonie ou un rucher.");
  return `${ex ? ex + "/" : ""}${dossier}/${id}.jpg`;
}

/**
 * Fiches d'une photo prise pendant une visite, selon le rattachement choisi.
 * « Visite » : la visite seule. « Colonie » : la visite, et la colonie pour la retrouver sur sa fiche.
 * « Rucher » : la visite, et le rucher de la colonie (rien de plus si la colonie n'a pas de rucher).
 */
export function fiches(lien, visiteId, ruche) {
  const o = { visite_id: visiteId || null, colonie_id: null, rucher_id: null };
  if (lien === "colonie" && ruche?.id) o.colonie_id = ruche.id;
  if (lien === "rucher" && ruche?.rucher_id) o.rucher_id = ruche.rucher_id;
  return o;
}

/** Les photos d'une fiche colonie ou rucher : celles rattachées à la fiche, puis celles de ses visites. */
export function photosDe(photos, type, ficheId, visitesIds = []) {
  const col = type === "rucher" ? "rucher_id" : "colonie_id", vis = new Set(visitesIds);
  const propres = (photos || []).filter((p) => p[col] === ficheId);
  const deVisites = type === "colonie" ? (photos || []).filter((p) => p[col] !== ficheId && p.visite_id && vis.has(p.visite_id)) : [];
  const date = (p) => String(p.created_at || p.cree || "");
  return { propres: [...propres].sort((a, b) => date(b).localeCompare(date(a))), deVisites };
}

/** Octets lisibles : « 380 Ko », « 4,2 Mo », « 1 Go ». */
export function octets(o) {
  const n = Math.max(0, Number(o) || 0);
  if (n < 1048576) return Math.max(1, Math.round(n / 1024)) + " Ko";
  if (n < 1024 ** 3) return (n / 1048576).toLocaleString("fr-FR", { maximumFractionDigits: n < 10 * 1048576 ? 1 : 0 }) + " Mo";
  return (n / 1024 ** 3).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Go";
}

/**
 * État de l'espace photos (AP-US-054) : utilisé, restant, part, taille moyenne d'une photo, photos qui tiennent encore.
 * `nbPhotos` et `octetsPhotos` viennent des fiches (visite_photos.octets) ; à défaut, la moyenne par défaut.
 */
export function espace(utilise, { nbPhotos = 0, octetsPhotos = 0, quota = QUOTA } = {}) {
  const u = Math.max(0, Number(utilise) || 0), q = Math.max(1, Number(quota) || QUOTA);
  const restant = Math.max(0, q - u), part = u / q;
  const moyenne = nbPhotos > 0 && octetsPhotos > 0 ? Math.round(octetsPhotos / nbPhotos) : MOYENNE_PAR_DEFAUT;
  return { utilise: u, quota: q, restant, part, pourcent: Math.min(100, Math.floor(part * 100)), moyenne,
    photosRestantes: Math.floor(restant / moyenne), alerte: part >= SEUIL_ALERTE, plein: part >= 1 };
}

/** Arrondi lisible d'un nombre de photos : « environ 700 », « une vingtaine », exact sous 20. */
export function environ(n) {
  const x = Math.max(0, Math.floor(Number(n) || 0));
  if (x < 20) return String(x);
  if (x < 100) return "environ " + Math.round(x / 10) * 10;
  if (x < 1000) return "environ " + Math.round(x / 50) * 50;
  return "environ " + (Math.round(x / 100) * 100).toLocaleString("fr-FR");
}

/** Phrase d'avertissement des Réglages (AP-US-054) : espace restant et taille moyenne d'une photo. */
export function avertissement(e) {
  if (!e?.alerte) return "";
  if (e.plein) return `L’espace photos est plein. Une photo fait en moyenne ${octets(e.moyenne)} : supprime d’anciennes photos pour en ajouter.`;
  return `Il reste ${octets(e.restant)} d’espace photos, soit ${environ(e.photosRestantes)} photos. Une photo fait en moyenne ${octets(e.moyenne)}.`;
}

/** Libellé d'un passage du nettoyage (journal, AP-TECH-168). */
export function libellePassage(p) {
  if (!p) return "";
  if (p.statut === "echec") return "Le nettoyage n’a pas pu se faire. Rien n’a été retiré, nouvel essai la nuit suivante.";
  if (p.statut === "rien" || !p.fichiers) return "Rien à retirer : chaque fichier a sa fiche.";
  const f = p.fichiers > 1 ? `${p.fichiers} fichiers sans fiche retirés` : "1 fichier sans fiche retiré";
  return `${f}, ${octets(p.octets)} libérés${p.statut === "simule" ? " (essai, rien n’a été supprimé)" : ""}.`;
}
