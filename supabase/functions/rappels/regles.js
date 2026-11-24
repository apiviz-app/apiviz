// Apiviz — rappels même quand Apiviz est fermée (v5.87, migration 040). Règles pures de la fonction « rappels »,
// testées par tests/unitaires/rappels.test.mjs : ruches à visiter, créneau météo de demain, gestes de saison, choix du
// rappel à envoyer (un seul par passage, deux par semaine au plus, jamais deux fois le même).

export const PLAFOND_SEMAINE = 2;
export const JOURS_SANS_VISITE = 30;

const jours = (a, b) => Math.floor((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
/** « au Verger » pour « Le Verger », « à la Lande », « aux Combes », « à l'Orée », sinon « au rucher Bois Joli ». */
export function aRucher(nom) {
  const n = String(nom || "").trim();
  if (!n) return "au rucher";
  const m = n.match(/^(le|la|les)\s+(.+)$/i), l = n.match(/^l['’]\s*(.+)$/i);
  if (m) return { le: "au", la: "à la", les: "aux" }[m[1].toLowerCase()] + " " + m[2];
  if (l) return `à l’${l[1]}`;
  return `au rucher ${n}`;
}

/**
 * Ruches à visiter : en place, sans visite depuis 30 jours (ou jamais, et créées depuis plus de 30 jours).
 * ruches [{ id, nom, rucher, sortie, created_at }], dernieres { ruche_id: "aaaa-mm-jj" }. Rend [{ rucher, ruches: [noms] }]
 * du rucher le plus chargé au moins chargé.
 */
export function ruchesAVoir(ruches, dernieres, jour) {
  const parRucher = new Map();
  for (const r of ruches || []) {
    if (r.sortie) continue;
    const d = dernieres?.[r.id] || String(r.created_at || "").slice(0, 10);
    if (!d || jours(d, jour) < JOURS_SANS_VISITE) continue;
    const k = r.rucher || "";
    if (!parRucher.has(k)) parRucher.set(k, []);
    parRucher.get(k).push(r.nom);
  }
  return [...parRucher.entries()].map(([rucher, noms]) => ({ rucher, ruches: noms })).sort((a, b) => b.ruches.length - a.ruches.length || a.rucher.localeCompare(b.rucher));
}

/** Rappel « ruches à visiter » (clé : la semaine, pour ne pas le répéter avant 7 jours). */
export function rappelVisites(aVoir, jour) {
  const n = (aVoir || []).reduce((t, g) => t + g.ruches.length, 0);
  if (!n) return null;
  const g = aVoir[0];
  const ou = aVoir.length === 1 && g.rucher ? ` ${aRucher(g.rucher)}` : aVoir.length > 1 ? `, dont ${g.ruches.length} ${aRucher(g.rucher)}` : "";
  return { type: "visites", cle: `visites-${semaine(jour)}`, titre: `${pluriel(n, "ruche")} pas vue${n > 1 ? "s" : ""} depuis 30 jours`, corps: `${n > 1 ? "Elles attendent" : "Elle attend"} ta visite${ou}.`, route: "ruches" };
}

/**
 * Créneau de demain pour un rucher : prévision journalière d'Open-Meteo (température max, vent max, pluie).
 * Bon créneau : 15 °C ou plus, vent sous 20 km/h, moins de 1 mm de pluie.
 */
export function bonCreneau(prevision) {
  if (!prevision) return false;
  const { tmax, vent, pluie } = prevision;
  return Number(tmax) >= 15 && Number(vent) < 20 && Number(pluie) < 1;
}
export function rappelMeteo(rucher, prevision, nbAVoir, jour) {
  if (!rucher || !bonCreneau(prevision) || !nbAVoir) return null;
  const demain = new Date(Date.parse(jour + "T12:00:00Z") + 864e5);
  const nom = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][demain.getUTCDay()];
  return { type: "meteo", cle: `meteo-${semaine(jour)}`, titre: `Beau créneau ${nom} ${aRucher(rucher)}`, corps: `${Math.round(prevision.tmax)} °C, peu de vent. ${pluriel(nbAVoir, "ruche")} à voir.`, route: "agenda" };
}

/** Gestes de saison (France métropolitaine), un par période, une fois par an. [mois, jour début, jour fin]. */
export const SAISON = [
  { cle: "printemps", debut: [3, 15], fin: [3, 31], titre: "Première visite de printemps", corps: "Par une journée douce, vérifie la reine, le couvain et les provisions." },
  { cle: "hausses", debut: [4, 20], fin: [5, 5], titre: "Pense aux hausses", corps: "Quand la colonie couvre ses cadres et que la miellée démarre, c'est le moment." },
  { cle: "essaimage", debut: [5, 6], fin: [5, 20], titre: "Saison de l'essaimage", corps: "Cherche les cellules royales à chaque visite." },
  { cle: "varroa-ete", debut: [7, 25], fin: [8, 15], titre: "Comptage varroa après la récolte", corps: "Le bon moment pour compter, puis traiter si besoin." },
  { cle: "hivernage", debut: [9, 15], fin: [10, 5], titre: "Préparer l'hivernage", corps: "Pèse tes ruches et complète les provisions avant le froid." },
  { cle: "varroa-hiver", debut: [12, 1], fin: [12, 20], titre: "Comptage varroa d'hiver", corps: "Hors couvain, c'est le moment de compter et de traiter si besoin." },
];
export function rappelSaison(jour, deja = new Set()) {
  const [a, m, j] = jour.split("-").map(Number);
  for (const s of SAISON) {
    const dans = (m > s.debut[0] || (m === s.debut[0] && j >= s.debut[1])) && (m < s.fin[0] || (m === s.fin[0] && j <= s.fin[1]));
    const cle = `saison-${s.cle}-${a}`;
    if (dans && !deja.has(cle)) return { type: "saison", cle, titre: s.titre, corps: s.corps, route: "agenda" };
  }
  return null;
}

/** Semaine ISO « 2026-W48 ». */
export function semaine(jour) {
  const d = new Date(jour + "T12:00:00Z");
  const j = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - j + 3);
  const premier = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const n = 1 + Math.round(((d - premier) / 864e5 - 3 + ((premier.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, "0")}`;
}

/**
 * Le rappel à envoyer à une personne, ou null. candidats : rappels possibles (dans l'ordre de priorité), types : ce
 * qu'elle a choisi ({ visites, meteo, saison }), envoyes : [{ type, cle, envoye_le }] des 30 derniers jours.
 * Deux par semaine glissante au plus ; jamais deux fois la même clé ; pas deux jours de suite.
 */
export function choisir(candidats, types, envoyes, maintenant = new Date()) {
  const t = new Date(maintenant).getTime();
  const semaine7 = (envoyes || []).filter((x) => t - Date.parse(x.envoye_le) < 7 * 864e5);
  if (semaine7.length >= PLAFOND_SEMAINE) return null;
  if ((envoyes || []).some((x) => t - Date.parse(x.envoye_le) < 20 * 3600e3)) return null;
  const cles = new Set((envoyes || []).map((x) => x.cle));
  return (candidats || []).find((c) => c && types?.[c.type] !== false && !cles.has(c.cle)) || null;
}
