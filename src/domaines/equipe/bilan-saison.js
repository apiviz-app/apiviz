// Apiviz — bilan de saison enrichi (v5.79, maquette « apiviz — Idées à forte valeur », idée 1, validée par Pierre-Louis
// le 24 nov. 2026). Complète l'écran « Bilan de la saison » de la v5.61 (equipe/saison.js) : colonies au début et à la
// fin, pertes, varroa, coût du kilo, « Ce qui a marché » / « À revoir » / « Ce qui manque », et trois versions à
// partager (complète ; sanitaire pour le GDS, sans argent ; simple pour la famille). Règles pures, testées par
// tests/unitaires/bilan-saison.test.mjs. Rien n'est inventé : sans donnée, la phrase n'est pas écrite et le manque est dit.
import { comptages, resultat, seuilApplicable, auDessus } from "../sante/regles.js";

const PERTES = new Set(["Morte", "Perdue"]);
const arr1 = (x) => Math.round(x * 10) / 10;
const f = (x) => String(x).replace(".", ",");
const pl = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export const VERSIONS = [
  { id: "complete", titre: "Complète", sous: "Pour moi et mes associés" },
  { id: "sanitaire", titre: "Sanitaire", sous: "Pour le GDS, sans les chiffres d’argent" },
  { id: "famille", titre: "Simple", sous: "Pour la famille" },
];
/** Ce que montre chaque version. */
export const montre = (version) => ({
  argent: version === "complete",
  sante: version !== "famille",
  details: version !== "famille",
});

/** Date de début d'une colonie (création, installation, sinon ajout dans l'appli). */
const debutDe = (r) => String(r.date_creation || r.date_installation || r.created_at || "").slice(0, 10);
const nomRucher = (d, r) => (r.rucher_id && (d.ruchers || []).find((x) => x.id === r.rucher_id)?.nom) || r.rucher || "";

/**
 * Colonies de l'année : au 1er janvier, au 31 décembre (ou aujourd'hui pour l'année en cours), pertes (Morte, Perdue)
 * avec leur rucher, autres sorties (vendues, réunies), colonies nées (essaim, division, élevage) et achetées.
 */
export function colonies(d, annee, aujourdhui) {
  const a = String(annee), debut = `${a}-01-01`, fin = aujourdhui && aujourdhui.slice(0, 4) === a ? aujourdhui : `${a}-12-31`;
  const toutes = [...(d.ruches || []), ...(d.ruchesSorties || [])];
  // En vie ce jour-là : commencée avant (ou date inconnue) et pas encore sortie.
  const vivante = (r, jour, strict) => { const dd = debutDe(r); return (!dd || (strict ? dd < jour : dd <= jour)) && !(r.sortie && (!r.date_sortie || String(r.date_sortie) <= jour)); };
  const sortiesAnnee = toutes.filter((r) => r.sortie && String(r.date_sortie || "").slice(0, 4) === a);
  const nees = toutes.filter((r) => debutDe(r).slice(0, 4) === a);
  const pertes = sortiesAnnee.filter((r) => PERTES.has(r.sortie));
  const parRucher = new Map();
  for (const r of pertes) { const n = nomRucher(d, r) || "Sans rucher"; parRucher.set(n, (parRucher.get(n) || 0) + 1); }
  return {
    debut: toutes.filter((r) => vivante(r, debut, true) || (r.sortie && String(r.date_sortie || "") === debut && debutDe(r) < debut)).length,
    fin: toutes.filter((r) => vivante(r, fin, false)).length,
    pertes: pertes.length,
    pertesParRucher: [...parRucher].sort((x, y) => y[1] - x[1]),
    autresSorties: sortiesAnnee.length - pertes.length,
    essaims: nees.filter((r) => r.origine === "essaim").length,
    divisions: nees.filter((r) => r.origine === "division" || r.origine === "elevage").length,
    achats: nees.filter((r) => r.origine === "achat").length,
  };
}

/**
 * Varroa de l'année : taux moyen (comptages en % d'abeilles porteuses), nombre de comptages, colonies au-dessus de
 * leur seuil (seuil choisi par l'apiculteur ; sans seuil, aucune alerte) et le rucher qui en compte le plus.
 */
export function varroa(d, annee, ctx) {
  const a = String(annee);
  const cs = comptages(d).filter((c) => String(c.date_visite).slice(0, 4) === a);
  const taux = cs.map((c) => resultat(c)).filter((r) => r.unite === "pourcent").map((r) => r.valeur);
  const hautes = new Map(); // ruche_id → mois
  for (const c of cs) {
    const r = resultat(c), s = seuilApplicable(c, ctx);
    if (s && r.valeur != null && r.unite === s.unite && auDessus(r.valeur, s.valeur) && !hautes.has(c.ruche_id)) hautes.set(c.ruche_id, Number(String(c.date_visite).slice(5, 7)));
  }
  const toutes = [...(d.ruches || []), ...(d.ruchesSorties || [])];
  const parRucher = new Map();
  for (const id of hautes.keys()) { const r = toutes.find((x) => x.id === id); const n = (r && nomRucher(d, r)) || "Sans rucher"; parRucher.set(n, (parRucher.get(n) || 0) + 1); }
  return {
    comptages: cs.length,
    moyenne: taux.length ? arr1(taux.reduce((t, x) => t + x, 0) / taux.length) : null,
    auDessus: hautes.size,
    parRucher: [...parRucher].sort((x, y) => y[1] - x[1]),
    mois: [...hautes.values()],
  };
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/**
 * Tout le bilan : { s (saison de la v5.61), col, va, coutKg, marche[], revoir[], manque[] }.
 * s vient de equipe/regles.js saison() ; parRuche de kgParRuche() ; constats de constats() ; caAvant : argent rentré
 * l'année d'avant (pour comparer).
 */
export function bilan({ d, annee, aujourdhui, ctx, s, parRuche = [], constats = [], caAvant = 0 }) {
  const col = colonies(d, annee, aujourdhui), va = varroa(d, annee, ctx);
  const coutKg = s.kg > 0 && s.depense > 0 ? Math.round((s.depense / s.kg) * 100) / 100 : null;
  const marche = [], revoir = [], manque = [];
  // Ce qui a marché.
  for (const c of constats) if (!/rien donné/.test(c)) marche.push({ texte: c, argent: false });
  if (col.essaims + col.divisions > 0) marche.push({ texte: `${[col.essaims ? pl(col.essaims, "essaim") + " récupéré" + (col.essaims > 1 ? "s" : "") : "", col.divisions ? pl(col.divisions, "colonie") + " faite" + (col.divisions > 1 ? "s" : "") + " par division ou élevage" : ""].filter(Boolean).join(" et ")}.`, argent: false });
  if (col.debut > 0 && col.pertes === 0 && col.fin >= col.debut) marche.push({ texte: `Aucune colonie perdue cette année.`, argent: false });
  if (caAvant > 0 && s.rentre > caAvant * 1.1) marche.push({ texte: `Les ventes ont augmenté de ${Math.round(((s.rentre - caAvant) / caAvant) * 100)} % par rapport à ${annee - 1}.`, argent: true });
  // À revoir.
  if (va.auDessus > 0) {
    const r = va.parRucher[0];
    const mois = va.mois.length ? MOIS[Math.round(va.mois.reduce((t, x) => t + x, 0) / va.mois.length) - 1] : "";
    revoir.push({ texte: `Varroa au-dessus de ton seuil sur ${pl(va.auDessus, "colonie")}${r && va.parRucher.length > 1 ? `, surtout à « ${r[0]} » (${r[1]})` : r && r[0] !== "Sans rucher" ? ` à « ${r[0]} »` : ""}${mois ? `, vers ${mois}` : ""}.`, argent: false });
  }
  if (col.pertes > 0) {
    const r = col.pertesParRucher[0];
    revoir.push({ texte: `${pl(col.pertes, "colonie")} perdue${col.pertes > 1 ? "s" : ""}${col.pertesParRucher.length === 1 && r[0] !== "Sans rucher" ? `, ${col.pertes > 1 ? "toutes " : ""}à « ${r[0]} »` : r && col.pertesParRucher.length > 1 ? `, dont ${r[1]} à « ${r[0]} »` : ""}.`, argent: false });
  }
  for (const c of constats) if (/rien donné/.test(c)) revoir.push({ texte: c, argent: false });
  if (caAvant > 0 && s.rentre < caAvant * 0.9) revoir.push({ texte: `Les ventes ont baissé de ${Math.round(((caAvant - s.rentre) / caAvant) * 100)} % par rapport à ${annee - 1}.`, argent: true });
  // Ce qui manque (pour que les chiffres disent vrai).
  if (!s.kg) manque.push({ texte: "Aucune récolte notée : les kilos et le coût du kilo restent vides.", argent: false });
  else if (parRuche.length && !parRuche.some((r) => r.kg > 0)) manque.push({ texte: "Les récoltes ne disent pas de quelle ruche elles viennent : pas de comparaison possible.", argent: false });
  if (!va.comptages) manque.push({ texte: "Aucun comptage de varroa noté cette année.", argent: false });
  else if (!(ctx?.seuils || []).length && !(Number(ctx?.reglages?.varroaSeuil) > 0)) manque.push({ texte: "Pas de seuil de varroa choisi : apiviz ne dit pas quelles colonies étaient trop infestées.", argent: false });
  if (s.kg && !s.depense) manque.push({ texte: "Aucune dépense notée : le coût du kilo n’est pas calculé.", argent: true });
  return { s, col, va, coutKg, marche: marche.slice(0, 4), revoir: revoir.slice(0, 4), manque };
}

/** Garde ce que la version montre (les phrases d'argent disparaissent des versions sanitaire et simple). */
export const filtrer = (liste, version) => liste.filter((x) => montre(version).argent || !x.argent);

/** Texte à partager, selon la version. */
export function texte(nom, annee, b, version, parRuche = []) {
  const m = montre(version), s = b.s;
  const lignes = [`${nom ? nom + " · " : ""}Saison ${annee}`];
  if (s.kg) lignes.push(`${f(s.kg)} kg récoltés`);
  if (b.col.debut || b.col.fin) lignes.push(`Colonies : ${b.col.debut} au début, ${b.col.fin} à la fin${b.col.pertes ? `, ${b.col.pertes} perdue${b.col.pertes > 1 ? "s" : ""}` : ""}`);
  if (m.sante && b.va.moyenne != null) lignes.push(`Varroa moyen : ${f(b.va.moyenne)} % (${pl(b.va.comptages, "comptage")})`);
  if (m.argent) {
    lignes.push(`${s.pots} pots vendus, ${f(s.rentre)} € rentrés, ${f(s.depense)} € dépensés`);
    if (b.coutKg != null) lignes.push(`Coût du kilo : ${f(b.coutKg)} €`);
  }
  if (!m.details) {
    const top = parRuche.filter((r) => r.kg > 0)[0];
    if (top) lignes.push(`Meilleure ruche : ${top.nom} (${f(top.kg)} kg)`);
  }
  const ok = filtrer(b.marche, version), ko = m.details ? filtrer(b.revoir, version) : [];
  if (ok.length) lignes.push("", "Ce qui a marché :", ...ok.map((x) => "• " + x.texte));
  if (ko.length) lignes.push("", "À revoir :", ...ko.map((x) => "• " + x.texte));
  return lignes.join("\n");
}
