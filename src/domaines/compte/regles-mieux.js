// Apiviz — mieux connaître ses utilisateurs (v5.86, maquette « Onboarding irréprochable », écran 11 et tableau de bord
// « Mes utilisateurs », migration 039). Règles pures, testées par tests/unitaires/mieux.test.mjs : quand proposer la
// carte « Pour mieux te connaître », ses questions, rubrique d'un écran (jours d'utilisation), textes du tableau de bord.
import { AGES, ANCIENNETES, ATTENTES, SOURCES, COLONIES } from "./regles-profil.js";

export const DELAI_JOURS = 14;

/** Les quatre questions de la carte, dans l'ordre (codes des contraintes de profils). */
export const QUESTIONS = [
  { k: "anciennete", q: "Depuis quand as-tu des abeilles ?", choix: ANCIENNETES, pourquoi: "Pour adapter les conseils d’API à ton expérience." },
  { k: "activite", q: "Ton apiculture, c’est plutôt…", choix: [["loisir", "Un loisir"], ["pluriactif", "Une activité en plus de mon métier"], ["professionnel", "Mon métier principal"]], pourquoi: "Pour savoir quelles fonctions développer en premier." },
  { k: "tranche_age", q: "Ta tranche d’âge ?", choix: AGES, pourquoi: "Pour des statistiques d’ensemble, jamais individuelles." },
  { k: "attente", q: "Ce que tu attends d’abord d’Apiviz ?", choix: ATTENTES, pourquoi: "Pour mettre en avant ce qui compte pour toi." },
];

/** Questions encore sans réponse pour ce profil. */
export const restantes = (profil) => QUESTIONS.filter((x) => !profil?.[x.k]);

/**
 * La carte est-elle à proposer ? Profil chargé (base avec 039), inscription finie depuis 14 jours ou plus, carte ni
 * finie ni refusée (dans le compte ou sur l'appareil), au moins une question sans réponse.
 */
export function carteDue({ profil, maintenant = new Date(), finLocale = false, sans039 = false } = {}) {
  if (!profil || sans039 || finLocale || profil.mieux_connaitre_fin) return false;
  const depuis = Date.parse(profil.inscription_finie || profil.created_at || "");
  if (!Number.isFinite(depuis)) return false;
  if (new Date(maintenant).getTime() - depuis < DELAI_JOURS * 864e5) return false;
  return restantes(profil).length > 0;
}

/** Rubrique d'un écran, pour les jours d'utilisation (null : pas compté). */
const RUBRIQUES = {
  accueil: ["dash"],
  ruchers: ["ruches", "rucher", "ruche", "carte", "deplacer", "comparaison", "hiver", "meteo", "etiquettesqr"],
  visites: ["visite", "visiteexpress", "tournee", "premierevisite"],
  sante: ["varroa", "comptage", "signalement", "registre"],
  agenda: ["agenda", "sortie", "rappels", "saison", "masaison"],
  recoltes: ["miel", "recoltes", "recolte", "miseenpots", "lot", "produit"],
  ventes: ["clients", "vente", "caisse", "commandes", "promotions", "promotion", "facture"],
  materiel: ["materiel", "inventaire", "courses", "fournisseurs"],
  finances: ["compta", "factures", "achatfacture", "pilotage", "previsions", "associes", "msbilan"],
  api: ["api", "apimemoire"],
  equipe: ["membres", "fil"],
  carnet: ["reprendre", "carnet"],
};
const PAR_ROUTE = Object.fromEntries(Object.entries(RUBRIQUES).flatMap(([r, routes]) => routes.map((x) => [x, r])));
export const rubriqueDe = (route) => PAR_ROUTE[route] || null;

export const NOMS_RUBRIQUES = { accueil: "Accueil", ruchers: "Ruchers", visites: "Visites", sante: "Santé", agenda: "Agenda", recoltes: "Récoltes et produits",
  ventes: "Ventes", materiel: "Matériel", finances: "Finances", api: "API", equipe: "Équipe", carnet: "Reprise de carnet" };

/** Texte de la comparaison avec le département ; null si pas assez de monde. */
export function texteComparaison(c, departement = "") {
  if (!c || !c.assez) return null;
  const pl = (n) => `${String(n).replace(".", ",")} visite${Number(n) >= 2 ? "s" : ""}`;
  return { titre: `Ce mois-ci${departement ? ` en ${departement}` : " dans ton département"}`, moi: pl(c.moi), moyenne: pl(c.moyenne), personnes: c.personnes,
    part: Math.max(4, Math.min(100, Math.round(100 * Number(c.moi) / Math.max(Number(c.moi), Number(c.moyenne), 1)))),
    partMoyenne: Math.max(4, Math.min(100, Math.round(100 * Number(c.moyenne) / Math.max(Number(c.moi), Number(c.moyenne), 1)))) };
}

// ---------- Tableau de bord ----------
const libelle = (liste, k) => (liste.find(([c]) => c === k) || [, k])[1];
export const ETAPES = { compte: "Compte créé", profil: "« Tu en es où ? » répondu", rucher: "Rucher créé", visite: "Première visite", j7: "Revenus après 7 jours" };
export const QUESTIONS_STATS = { colonies: "Nombre de colonies", code_postal: "Code postal", source: "Comment nous as-tu connus", anciennete: "Ancienneté",
  activite: "Statut", attente: "Attente principale", tranche_age: "Tranche d’âge" };

/** Lignes de barres : [{ nom, valeur, texte, part (0-100), detail }], part relative au plus grand. */
export function barres(liste, { nom = (x) => x.k, texte = (x) => String(x.n), detail = () => "", max } = {}) {
  const m = max ?? Math.max(1, ...(liste || []).map((x) => Number(x.n) || 0));
  return (liste || []).map((x) => ({ nom: nom(x), valeur: Number(x.n) || 0, texte: texte(x), detail: detail(x), part: Math.round(100 * (Number(x.n) || 0) / m) }));
}

/** Toutes les sections du tableau de bord, prêtes à dessiner, depuis le résultat de admin_stats_utilisateurs. */
export function tableau(s) {
  if (!s) return null;
  const pc = (v) => (v === null || v === undefined ? "—" : `${v} %`);
  const total = (l) => (l || []).reduce((t, x) => t + (Number(x.n) || 0), 0);
  const sources = s.sources || [];
  const totalSources = total(sources) + (Number(s.sources_autres) || 0);
  const parcours = s.parcours || [];
  const perte = (() => {
    let pire = null;
    for (let i = 1; i < parcours.length; i++) {
      const a = Number(parcours[i - 1].n), b = Number(parcours[i].n);
      if (a > 0 && (!pire || (a - b) / a > pire.taux)) pire = { de: ETAPES[parcours[i - 1].k], a: ETAPES[parcours[i].k], taux: (a - b) / a };
    }
    return pire && pire.taux > 0 ? `La plus grosse perte : entre « ${pire.de} » et « ${pire.a} » (${Math.round(pire.taux * 100)} %).` : "";
  })();
  return {
    chiffres: [
      { nom: "Inscrits", valeur: String(s.inscrits ?? 0), detail: `+${s.nouveaux ?? 0} en ${s.jours} jours` },
      { nom: "Actifs cette semaine", valeur: String(s.actifs_semaine ?? 0), detail: "au moins une ouverture" },
      { nom: "Ont fait leur première visite", valeur: pc(s.premiere_visite), detail: `inscrits des ${s.jours} derniers jours` },
      { nom: "Reviennent après 30 jours", valeur: pc(s.retour_30), detail: "inscrits depuis plus de 30 jours" },
    ],
    parcours: barres(parcours, { nom: (x) => ETAPES[x.k] || x.k, max: Number(parcours[0]?.n) || 1 }),
    perte,
    sources: barres(sources, { nom: (x) => libelle(SOURCES, x.k), texte: (x) => `${Math.round(100 * x.n / Math.max(1, totalSources))} %`, detail: (x) => (x.retour === null || x.retour === undefined ? "—" : `${x.retour} %`) }),
    sourcesAutres: Number(s.sources_autres) || 0,
    colonies: barres(s.colonies, { nom: (x) => `${libelle(COLONIES, x.k)} colonies`, texte: (x) => `${Math.round(100 * x.n / Math.max(1, total(s.colonies)))} %` }),
    attentes: barres(s.attentes, { nom: (x) => libelle(ATTENTES, x.k), texte: (x) => `${Math.round(100 * x.n / Math.max(1, total(s.attentes)))} %` }),
    vendent: s.vendent,
    departements: barres([...(s.departements || []), ...(s.departements_autres ? [{ k: "autres", n: s.departements_autres }] : [])], { nom: (x) => (x.k === "autres" ? "Autres départements" : x.k) }),
    rubriques: barres(s.rubriques, { nom: (x) => NOMS_RUBRIQUES[x.k] || x.k, texte: (x) => `${Math.round(100 * x.n / Math.max(1, s.actifs_periode || 1))} %`, max: Math.max(1, s.actifs_periode || 1) }),
    reponses: s.reponses ? barres(Object.entries(s.reponses).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n), { nom: (x) => QUESTIONS_STATS[x.k] || x.k, texte: (x) => `${x.n} %`, max: 100 }) : [],
    refus: s.refus_stats,
  };
}
