// Apiviz — « Prêt pour l'hiver » (v5.82, maquette « apiviz — Idées à forte valeur », idée 5, validée par Pierre-Louis le
// 24 nov. 2026). Règles pures, testées par tests/unitaires/hiver.test.mjs.
// Chaque colonie active est classée d'après ses mesures d'automne (depuis le 1er août par défaut) : « À reprendre »,
// « À surveiller », « Prête », ou « À compléter » quand rien n'a été mesuré. Les repères chiffrés (poids d'hivernage,
// varroa) sont ceux de l'apiculteur (réglage `hiver`, avec son GDS ou son vétérinaire) : sans repère, le critère n'est
// pas jugé. Ce n'est jamais une prédiction de survie : apiviz compare des mesures à des repères.
import { comptages, resultat } from "../sante/regles.js";

export const NIVEAUX = ["reprendre", "surveiller", "completer", "prete"];
export const TITRES = { reprendre: "À reprendre", surveiller: "À surveiller", completer: "À compléter", prete: "Prête" };

/**
 * Repères : { poids (kg ou null), varroa (% ou null), depuis ("MM-JJ") }. Le poids est le réglage `hiverPoids` déjà lu
 * par Ma saison et par API (« Ce qu'API sait de toi ») ; varroa et début de l'automne sont dans cfg().hiver.
 */
export function reperes(c) {
  const h = { ...((c && c.hiver) || {}), ...(c && c.hiverPoids != null && c.hiverPoids !== "" ? { poids: c.hiverPoids } : {}) };
  const num = (x, min, max) => { const n = Number(String(x ?? "").replace(",", ".")); return x !== "" && x != null && Number.isFinite(n) && n >= min && n <= max ? n : null; };
  const depuis = /^\d{2}-\d{2}$/.test(String(h.depuis || "")) ? h.depuis : "08-01";
  return { poids: num(h.poids, 1, 100), varroa: num(h.varroa, 0.1, 50), depuis };
}

const fr = (x) => String(Math.round(x * 10) / 10).replace(".", ",");

/**
 * Bilan d'hivernage d'une colonie : { niveau, raisons[], poids, varroa, reine, force, date }.
 * visites : celles de la colonie (toutes) ; cs : ses comptages (sante/regles.js comptages), le plus récent d'abord.
 */
export function colonie(r, visites, cs, rep, aujourdhui) {
  const debut = `${aujourdhui.slice(0, 4)}-${rep.depuis}` <= aujourdhui ? `${aujourdhui.slice(0, 4)}-${rep.depuis}` : `${Number(aujourdhui.slice(0, 4)) - 1}-${rep.depuis}`;
  const vs = [...(visites || [])].filter((v) => v.date_visite >= debut).sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)));
  const pesee = vs.find((v) => v.poids_kg != null && Number(v.poids_kg) > 0);
  const compte = (cs || []).filter((c) => String(c.date_visite) >= debut).map((c) => ({ c, r: resultat(c) })).find((x) => x.r.unite === "pourcent");
  const avecForce = vs.find((v) => v.force != null);
  const reineVues = vs.filter((v) => v.reine === "Vue" || v.oeufs_vus === true);
  const nonVues = vs.slice(0, 2).filter((v) => v.reine === "Non vue" && v.oeufs_vus !== true);
  const raisons = [];
  let niv = "prete";
  const monter = (n) => { if (NIVEAUX.indexOf(n) < NIVEAUX.indexOf(niv)) niv = n; };
  // Reine.
  if (r.statut === "orpheline") { raisons.push("Orpheline"); monter("reprendre"); }
  else if (nonVues.length === 2 && !reineVues.length) { raisons.push("Reine non vue aux 2 dernières visites"); monter("reprendre"); }
  else if (r.annee_reine && Number(aujourdhui.slice(0, 4)) - Number(r.annee_reine) >= 3) { raisons.push(`Reine de ${r.annee_reine}`); monter("surveiller"); }
  // Poids.
  if (rep.poids != null && pesee) {
    const p = Number(pesee.poids_kg);
    if (p < rep.poids * 0.9) { raisons.push(`Sous ton repère de ${fr(rep.poids)} kg`); monter("reprendre"); }
    else if (p < rep.poids) { raisons.push("Juste sous ton repère de poids"); monter("surveiller"); }
  }
  // Varroa.
  if (rep.varroa != null && compte && compte.r.valeur >= rep.varroa) { raisons.push(`Varroa au-dessus de ton repère (${fr(compte.r.valeur)} %)`); monter("reprendre"); }
  // Force et réserves notées à la visite (comme Ma saison).
  if (avecForce && Number(avecForce.force) <= 2) { raisons.push("Colonie faible"); monter("surveiller"); }
  const reserves = vs.find((v) => v.provisions);
  if (reserves?.provisions === "Faibles" && !(rep.poids != null && pesee && Number(pesee.poids_kg) >= rep.poids)) { raisons.push("Réserves faibles à la visite"); monter("surveiller"); }
  // Rien de mesuré cet automne.
  const mesures = !!(pesee || compte || avecForce || vs.length);
  if (!mesures) { niv = niv === "prete" ? "completer" : niv; raisons.push(`Pas de visite depuis le ${new Date(debut + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).replace(/^1 /, "1er ")}`); }
  const manque = [];
  if (mesures && rep.poids != null && !pesee) manque.push("pesée");
  if (mesures && rep.varroa != null && !compte) manque.push("comptage de varroa");
  if (mesures && !(visites || []).some((v) => String(v.date_visite) >= `${debut.slice(0, 4)}-07-01` && String(v.traitement || "").trim())) manque.push("traitement noté depuis juillet");
  return {
    id: r.id, nom: r.nom, niveau: niv, raisons, manque,
    poids: pesee ? Number(pesee.poids_kg) : null, varroa: compte ? compte.r.valeur : null,
    reine: r.statut === "orpheline" ? "Orpheline" : reineVues.length ? (r.annee_reine ? String(r.annee_reine) : "Vue") : nonVues.length ? "Non vue" : r.annee_reine ? String(r.annee_reine) : "—",
    force: avecForce ? Number(avecForce.force) : null,
  };
}

/** Toutes les colonies actives, de la plus urgente à la moins urgente ; et le compte par niveau. */
export function hiver(d, rep, aujourdhui) {
  const cs = comptages(d);
  const lignes = (d.ruches || []).filter((r) => !r.sortie).map((r) => colonie(r, (d.visites || []).filter((v) => v.ruche_id === r.id), cs.filter((c) => c.ruche_id === r.id), rep, aujourdhui));
  lignes.sort((a, b) => NIVEAUX.indexOf(a.niveau) - NIVEAUX.indexOf(b.niveau) || String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
  const compte = Object.fromEntries(NIVEAUX.map((n) => [n, lignes.filter((l) => l.niveau === n).length]));
  return { lignes, compte };
}
