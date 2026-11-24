// Apiviz — mes données et suppression du compte (v5.88, migration 041). Règles pures, testées par
// tests/unitaires/suppression.test.mjs : ce qu'Apiviz garde, ce qui partira selon les choix, dates.

const pl = (n, mot, pluriel = mot + "s") => `${n} ${n > 1 ? pluriel : mot}`;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Ce que garde Apiviz pour l'exploitation ouverte et le profil (écran « Mes données »). */
export function compter(d = {}, profil = {}) {
  const ruches = (d.ruches || []).filter((r) => !r.sortie).length;
  const ruchers = new Set((d.ruches || []).filter((r) => !r.sortie).map((r) => r.rucher || "")).size || (d.ruchers || []).length;
  const QUESTIONS = ["colonies", "code_postal", "source", "anciennete", "activite", "tranche_age", "attente"];
  const repondues = QUESTIONS.filter((k) => profil?.[k]).length;
  return {
    colonies: `${pl(ruches, "ruche")} · ${pl(ruchers, "rucher")}`,
    visites: String((d.visites || []).length),
    photos: String((d.visite_photos || d.photos || []).length),
    gestion: String((d.recoltes || []).length + (d.ventes || []).length + (d.depenses || []).length),
    reponses: `${repondues} sur ${QUESTIONS.length}`,
  };
}

/** « Marc », « Marc et Léa », « Marc, Léa et Paul ». */
export function listeNoms(noms) {
  const l = (noms || []).filter(Boolean);
  if (!l.length) return "les autres membres";
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}

/** Ce qui sera supprimé, d'après l'aperçu (compte_a_supprimer) et les choix { id: "laisser" | "tout" }. */
export function ceQuiPart(apercu, choix = {}) {
  const l = ["Ton compte, ton e-mail et ton mot de passe", "Ton profil, tes réponses et tes jours d'utilisation", "Tes réglages sur les appareils, tes rappels et tes échanges avec API"];
  for (const x of apercu?.effacees || []) l.push(`${x.nom} : ${pl(Number(x.colonies) || 0, "colonie")}, visites, photos, ventes et factures`);
  for (const x of apercu?.quittees || []) {
    if (choix[x.id] === "tout") l.push(`${x.nom}, pour tout le monde : ${pl(Number(x.colonies) || 0, "colonie")}, visites, photos, ventes et factures`);
  }
  return l;
}

/** Choix à envoyer à demander_suppression : seulement les exploitations partagées, « tout » si responsable. */
export function choixEnvoyes(apercu, choix = {}) {
  const r = {};
  for (const x of apercu?.quittees || []) r[x.id] = choix[x.id] === "tout" && x.role === "responsable" ? "tout" : "laisser";
  return r;
}

/** Date + 30 jours (aaaa-mm-jj). */
export function dans30(depuis = new Date()) {
  return new Date(new Date(depuis).getTime() + 30 * 864e5).toISOString().slice(0, 10);
}

/** « 24 décembre 2026 » (heure de Paris). */
export function dateLongue(x) {
  const t = typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? new Date(x + "T12:00:00Z") : new Date(x);
  if (Number.isNaN(t.getTime())) return "";
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(t);
  const v = (k) => Number(p.find((x) => x.type === k)?.value);
  return `${v("day") === 1 ? "1er" : v("day")} ${MOIS[v("month") - 1]} ${v("year")}`;
}
