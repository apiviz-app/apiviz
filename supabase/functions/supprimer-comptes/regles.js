// Apiviz — règles pures de la fonction « supprimer-comptes » (v5.88, migration 041). Testées sous Node
// (tests/unitaires/suppression.test.mjs). Aucun accès réseau ici.

/** Fichiers retirés par appel au stockage. */
export const LOT = 100;

/** Compare l'en-tête Authorization à la clé partagée, sans court-circuit ; clé de 24 caractères au moins. */
export function autorise(entete, cle) {
  const attendu = "Bearer " + String(cle || "");
  const recu = String(entete || "");
  if (!cle || String(cle).length < 24) return false;
  let diff = recu.length ^ attendu.length;
  for (let i = 0; i < attendu.length; i++) diff |= (recu.charCodeAt(i) || 0) ^ attendu.charCodeAt(i);
  return diff === 0;
}

/** Fichiers [{ bucket_id, name }] rangés par espace, en lots de 100 : [{ bucket, chemins }]. */
export function lotsParEspace(fichiers) {
  const par = new Map();
  for (const f of fichiers || []) {
    if (!f?.bucket_id || !f?.name) continue;
    if (!par.has(f.bucket_id)) par.set(f.bucket_id, []);
    par.get(f.bucket_id).push(f.name);
  }
  const lots = [];
  for (const [bucket, chemins] of par) for (let i = 0; i < chemins.length; i += LOT) lots.push({ bucket, chemins: chemins.slice(i, i + LOT) });
  return lots;
}
