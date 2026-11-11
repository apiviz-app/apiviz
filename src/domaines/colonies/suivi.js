// Apiviz — suivi d'une colonie sur sa fiche (chantier des écrans, étape 5, v5.25) : ce qu'API en dit, et l'échelle
// de la courbe de poids. Fonctions pures, testées par tests/unitaires/suivi.test.mjs.
// API ne parle que s'il a quelque chose à dire (docs/CHARTE_GRAPHIQUE.md) : une colonie en forme sans signal n'a pas
// de message. Pour un soin, il renvoie vers le vétérinaire ou le GDS, sans rien prescrire.
import { tauxVarroa } from "../sante/regles.js";
import { estActive } from "./regles.js";

const jour = (d) => String(d || "").slice(0, 10);
const ecartJours = (a, b) => Math.round((new Date(jour(b) + "T12:00:00Z") - new Date(jour(a) + "T12:00:00Z")) / 86400000);
/** « 12 septembre », « 1er novembre » */
export const dateLongue = (d) => {
  const t = new Date(jour(d) + "T12:00:00Z");
  return `${t.getUTCDate() === 1 ? "1er" : t.getUTCDate()} ${t.toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" })}`;
};
const nb = (x, dec = 1) => (Math.round(x * 10 ** dec) / 10 ** dec).toLocaleString("fr-FR", { maximumFractionDigits: dec });
const pesee = (v) => v.poids_kg !== null && v.poids_kg !== undefined && v.poids_kg !== "" && !Number.isNaN(Number(v.poids_kg));
const pluriel = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;

/** Visites d'une colonie, de la plus récente à la plus ancienne. */
export function visitesDe(visites, id) {
  return (visites || []).filter((v) => v.ruche_id === id).sort((a, b) => jour(b.date_visite).localeCompare(jour(a.date_visite)));
}

/**
 * Ce qu'API dit d'une colonie, d'après ses visites : { phrase, source, ton: "crit" | "watch" } ou null.
 * Signaux, dans l'ordre : varroa au-dessus du seuil, perte de poids d'au moins 1 kg entre les deux dernières pesées,
 * provisions faibles, reine non vue deux fois de suite, longue absence de visite (colonie qui n'est pas en forme).
 * La phrase reprend au plus deux constats, puis le conseil du premier.
 */
export function messageRuche(r, visites, { seuil = 3, aujourdhui = new Date().toISOString().slice(0, 10) } = {}) {
  if (!r || !estActive(r)) return null;
  const vs = visitesDe(visites, r.id), der = vs[0], ps = vs.filter(pesee);
  const constats = [];
  const vr = vs.find((v) => v.varroa !== null && v.varroa !== undefined);
  const tx = vr ? tauxVarroa(vr) : null;
  if (tx !== null && tx >= seuil)
    constats.push({ t: `Varroa à ${nb(tx)} % le ${dateLongue(vr.date_visite)}, au-dessus de ton seuil de ${nb(seuil)} %.`, c: "Vois le traitement avec ton vétérinaire ou ton GDS.", crit: true });
  if (ps.length > 1) {
    const perte = Number(ps[1].poids_kg) - Number(ps[0].poids_kg);
    if (perte >= 1) constats.push({ t: `Elle a perdu ${nb(perte)} kg depuis le ${dateLongue(ps[1].date_visite)}.`, c: "Pèse-la de nouveau et donne du candy si elle est légère." });
  }
  if (der?.provisions === "Faibles") constats.push({ t: `Provisions faibles le ${dateLongue(der.date_visite)}.`, c: "Vérifie ses réserves avant les grands froids." });
  const reines = vs.filter((v) => v.reine && v.reine !== "Non cherchée").slice(0, 2);
  if (reines.length === 2 && reines.every((v) => v.reine === "Non vue")) constats.push({ t: "Reine non vue aux deux dernières visites.", c: "Cherche des œufs à la prochaine visite." });
  if (r.etat && r.etat !== "Bonne") {
    if (!der) constats.push({ t: "Pas encore de visite notée.", c: "Fais une première visite pour suivre son état." });
    else if (ecartJours(der.date_visite, aujourdhui) > 30) constats.push({ t: `Pas de visite depuis ${ecartJours(der.date_visite, aujourdhui)} jours.`, c: "Prévois une visite au prochain créneau." });
  }
  const crit = r.etat === "Critique" || constats.some((x) => x.crit);
  if (!constats.length) {
    if (!r.etat || r.etat === "Bonne") return null;
    constats.push({ t: `Notée ${r.etat === "Critique" ? "critique" : "à surveiller"} à la dernière visite.`, c: "Dis-moi ce que tu observes à la prochaine visite." });
  }
  const phrase = [...constats.slice(0, 2).map((x) => x.t), constats[0].c].join(" ");
  const parts = [ps.length > 1 ? pluriel(ps.length, "pesée") : "", vs.length ? pluriel(vs.length, "visite") : ""].filter(Boolean);
  const source = parts.length ? `D’après ${parts.join(" et ")} de ${r.nom}` : `D’après la fiche de ${r.nom}`;
  return { phrase, source, ton: crit ? "crit" : "watch" };
}

/**
 * Échelle d'une courbe de poids : bornes multiples de 5 autour des pesées, avec de la marge, pour que la variation
 * se voie (une échelle qui part de 0 kg aplatit tout). { bas, haut, pas } ; pas = graduation.
 */
export function echellePoids(valeurs) {
  const v = (valeurs || []).map(Number).filter((x) => !Number.isNaN(x));
  if (!v.length) return { bas: 0, haut: 10, pas: 5 };
  let bas = Math.floor((Math.min(...v) - 2) / 5) * 5, haut = Math.ceil((Math.max(...v) + 2) / 5) * 5;
  if (bas < 0) bas = 0;
  if (haut - bas < 10) haut = bas + 10;
  return { bas, haut, pas: (haut - bas) / 2 };
}

/** Variation entre la première et la dernière pesée montrées : texte court, ou "" s'il n'y en a pas. */
export function resumePoids(pesees) {
  if (!pesees || pesees.length < 2) return "";
  const ancien = pesees[0], recent = pesees.at(-1), d = Number(recent.poids_kg) - Number(ancien.poids_kg);
  if (Math.abs(d) < 0.5) return `Stable depuis le ${dateLongue(ancien.date_visite)}`;
  return `${d > 0 ? "+" : "−"}${nb(Math.abs(d))} kg depuis le ${dateLongue(ancien.date_visite)}`;
}
