// Apiviz — offres et gouttes d'API (IT-27, migration 029) : règles d'affichage. Fonctions pures, testées par
// tests/unitaires/gouttes.test.mjs. 1 goutte = 1 centime d'euro de coût IA réel.

/** Une question courante coûte environ 3 gouttes (2 à 4 selon les données lues) : base de l'équivalence affichée. */
export const GOUTTES_PAR_QUESTION = 3;
/** Sous ce seuil, l'application prévient (Mon offre, en-tête d'API). */
export const SEUIL_BAS = 20;

/** Recharges proposées (prix TTC en centimes). Prix coûtant + environ 15 % (voir la maquette « Offres et IA »). */
export const RECHARGES = [
  { id: "sachet", nom: "Sachet", gouttes: 400, prix_cts: 600 },
  { id: "pot", nom: "Pot", gouttes: 850, prix_cts: 1200 },
  { id: "seau", nom: "Seau", gouttes: 1800, prix_cts: 2500 },
];

const virgule = (x, d) => x.toFixed(d).replace(".", ",");

/** « 0,2 goutte », « 1 goutte », « 463 gouttes ». */
export function gouttesTexte(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) < 1 && v !== 0) return `${virgule(Math.round(v * 10) / 10 || 0.1, 1)} goutte`;
  const r = Math.round(v);
  return `${r} goutte${Math.abs(r) >= 2 ? "s" : ""}`;
}

/** Prix en centimes : « 39 € », « 11,90 € ». */
export const prix = (cts) => (cts % 100 === 0 ? `${cts / 100} €` : `${virgule(cts / 100, 2)} €`);

/** « environ 70 questions » : arrondi à la dizaine au-delà de 20. */
export function environQuestions(g) {
  const q = Math.max(0, Number(g) || 0) / GOUTTES_PAR_QUESTION;
  const r = q >= 20 ? Math.round(q / 10) * 10 : Math.max(1, Math.round(q));
  return `environ ${r} question${r > 1 ? "s" : ""}`;
}

/** Pourcentage entier de la jauge, entre 0 et 100. */
export const part = (v, total) => (Number(total) > 0 ? Math.max(0, Math.min(100, Math.round((Number(v) || 0) / Number(total) * 100))) : 0);

/** « epuise », « bas » ou « ok ». */
export const etatGouttes = (total) => (Number(total) <= 0 ? "epuise" : Number(total) < SEUIL_BAS ? "bas" : "ok");

const jourMois = (iso) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** État de l'abonnement en quelques mots. */
export function statutTexte(ab, maintenant = new Date()) {
  if (!ab) return "gratuite";
  const fin = ab.fin ? new Date(ab.fin) : null;
  if (fin && fin <= maintenant) return "gratuite";
  if (ab.statut === "essai") return fin ? `essai jusqu'au ${jourMois(ab.fin)}` : "essai";
  if (ab.statut === "resilie") return fin ? `résiliée, jusqu'au ${jourMois(ab.fin)}` : "résiliée";
  return fin ? `active jusqu'au ${jourMois(ab.fin)}` : "active";
}

/** Libellé d'une nature de dépense. */
export const natureTexte = (n, nb) => (n === "facture" ? `${nb} facture${nb > 1 ? "s" : ""} lue${nb > 1 ? "s" : ""}` : `${nb} question${nb > 1 ? "s" : ""} à API`);
