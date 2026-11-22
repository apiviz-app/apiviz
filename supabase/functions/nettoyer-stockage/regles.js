// Apiviz — règles pures du nettoyage du stockage des photos (IT-11, AP-TECH-166 et AP-TECH-168).
// Utilisées par index.ts (Deno) et testées sous Node (tests/unitaires/nettoyage.test.mjs). Aucun accès réseau ici.

export const BUCKET = "photos-visites";
/** Délai avant de retirer un fichier sans fiche (choix validé le 22 nov. 2026) : protège une photo en cours d'envoi. */
export const DELAI_JOURS = 7;
/** Fichiers retirés par appel au stockage (limite pratique de l'API de suppression). */
export const LOT = 100;
/** Le journal garde 90 jours de passages. */
export const GARDE_JOURNAL_JOURS = 90;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La fonction tourne-t-elle ? « NETTOYAGE_ACTIF=non » la coupe (retour arrière sans redéploiement). */
export const actif = (valeur) => String(valeur ?? "oui").trim().toLowerCase() !== "non";

/** Délai demandé, ramené entre 1 et 365 jours ; 7 par défaut. */
export function delai(j) {
  const n = Math.floor(Number(j));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 365) : DELAI_JOURS;
}

/** Compare l'en-tête Authorization à la clé du nettoyage, sans court-circuit sur le premier caractère différent. */
export function autorise(entete, cle) {
  const attendu = "Bearer " + String(cle || "");
  const recu = String(entete || "");
  if (!cle || String(cle).length < 24) return false; // clé absente ou trop courte : refus
  let diff = recu.length ^ attendu.length;
  for (let i = 0; i < attendu.length; i++) diff |= (recu.charCodeAt(i) || 0) ^ attendu.charCodeAt(i);
  return diff === 0;
}

/**
 * Regroupe les fichiers candidats par exploitation, en n'acceptant que des chemins rangés sous le dossier de leur
 * exploitation (double contrôle de photos_a_nettoyer : rien d'autre ne peut être supprimé).
 */
export function parExploitation(fichiers) {
  const m = new Map();
  for (const f of fichiers || []) {
    const ex = String(f?.exploitation_id || ""), ch = String(f?.chemin || "");
    if (!UUID.test(ex) || !ch.startsWith(ex + "/") || ch.includes("..")) continue;
    const g = m.get(ex) || { chemins: [], octets: 0 };
    g.chemins.push(ch); g.octets += Math.max(0, Number(f.octets) || 0);
    m.set(ex, g);
  }
  return m;
}

/** Découpe une liste en lots de n éléments. */
export function lots(liste, n = LOT) {
  const r = [];
  for (let i = 0; i < liste.length; i += n) r.push(liste.slice(i, i + n));
  return r;
}

/**
 * Lignes du journal : une par exploitation, qu'il y ait eu quelque chose à retirer ou non.
 * resultats : Map ex -> { fichiers, octets, erreur? }.
 */
export function lignesJournal(exploitations, resultats, { simuler = false } = {}) {
  return (exploitations || []).filter((e) => UUID.test(String(e))).map((e) => {
    const r = resultats.get(e);
    if (r?.erreur) return { exploitation_id: e, statut: "echec", fichiers: r.fichiers || 0, octets: r.octets || 0, detail: String(r.erreur).slice(0, 200) };
    if (!r || !r.fichiers) return { exploitation_id: e, statut: "rien", fichiers: 0, octets: 0, detail: "" };
    return { exploitation_id: e, statut: simuler ? "simule" : "fait", fichiers: r.fichiers, octets: r.octets, detail: "" };
  });
}

/** Résumé renvoyé à l'appelant (aucun chemin de fichier : seulement des nombres). */
export function resume(lignes) {
  const s = { exploitations: lignes.length, fichiers: 0, octets: 0, echecs: 0 };
  for (const l of lignes) { s.fichiers += l.statut === "echec" ? 0 : l.fichiers; s.octets += l.statut === "echec" ? 0 : l.octets; s.echecs += l.statut === "echec" ? 1 : 0; }
  return s;
}
