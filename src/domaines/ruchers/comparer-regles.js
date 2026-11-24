// Apiviz — « Comparer mes ruchers » (v5.81, maquette « apiviz — Idées à forte valeur », idée 2, validée par Pierre-Louis le
// 24 nov. 2026). Règles pures, testées par tests/unitaires/comparer.test.mjs.
// Pour chaque rucher et une année : colonies, kilos récoltés et kilos par colonie, pertes, varroa moyen et colonies
// au-dessus du seuil, valeur estimée de la récolte (kilos × prix moyen du kilo vendu dans l'année), et les kilos par
// colonie des deux années d'avant. Une colonie compte dans le rucher où elle est aujourd'hui (les déplacements de
// l'année ne sont pas répartis) : c'est dit à l'écran. Aucune cause n'est affirmée.
import { comptages, resultat, seuilApplicable, auDessus } from "../sante/regles.js";

const PERTES = new Set(["Morte", "Perdue"]);
const arr1 = (x) => Math.round(x * 10) / 10;
const debutDe = (r) => String(r.date_creation || r.date_installation || r.created_at || "").slice(0, 10);

/** La colonie a-t-elle vécu pendant l'année ? (commencée avant la fin, pas sortie avant le début) */
export function vecuEn(r, annee) {
  const a = String(annee), dd = debutDe(r);
  if (dd && dd > `${a}-12-31`) return false;
  if (r.sortie && r.date_sortie && String(r.date_sortie) < `${a}-01-01`) return false;
  if (r.sortie && !r.date_sortie) return false;
  return true;
}

export const CRITERES = [
  { id: "kg", titre: "Kilos par colonie" },
  { id: "pertes", titre: "Pertes" },
  { id: "varroa", titre: "Varroa" },
  { id: "valeur", titre: "Valeur" },
];

/**
 * Tableau des ruchers pour `annee` : [{ cle, colonies, kg, kgParColonie, pertes, varroa, auDessus, valeur, histoire }].
 * d = { ruches, ruchesSorties, recoltes, operations, comptesVarroa, visites } ; prixKg : prix moyen du kilo vendu (ou null) ;
 * ctx : { seuils, reglages } pour les seuils de varroa.
 */
export function comparer(d, annee, { prixKg = null, ctx = {}, rucherDe = (r) => r.rucher || "" } = {}) {
  const toutes = [...(d.ruches || []), ...(d.ruchesSorties || [])];
  const cleDe = new Map(toutes.map((r) => [r.id, rucherDe(r)]));
  const cs = comptages(d);
  const ligne = (cle, an) => {
    const cols = toutes.filter((r) => rucherDe(r) === cle && vecuEn(r, an));
    const ids = new Set(cols.map((r) => r.id));
    const kg = (d.recoltes || []).filter((x) => ids.has(x.ruche_id) && String(x.date_recolte).slice(0, 4) === String(an)).reduce((t, x) => t + Number(x.kg || 0), 0);
    return { cols, ids, kg: arr1(kg), kgParColonie: cols.length && kg > 0 ? arr1(kg / cols.length) : cols.length ? 0 : null };
  };
  // Une année sans aucune récolte notée : pas de kilos par colonie (« — »), plutôt que des zéros trompeurs.
  const recolteEn = (an) => (d.recoltes || []).some((x) => String(x.date_recolte).slice(0, 4) === String(an));
  const cles = [...new Set(toutes.filter((r) => vecuEn(r, annee)).map((r) => cleDe.get(r.id)))];
  return cles.map((cle) => {
    const l = ligne(cle, annee);
    const pertes = l.cols.filter((r) => PERTES.has(r.sortie) && String(r.date_sortie || "").slice(0, 4) === String(annee)).length;
    const leurs = cs.filter((c) => l.ids.has(c.ruche_id) && String(c.date_visite).slice(0, 4) === String(annee));
    const taux = leurs.map(resultat).filter((x) => x.unite === "pourcent").map((x) => x.valeur);
    const hautes = new Set(leurs.filter((c) => { const r = resultat(c), s = seuilApplicable(c, ctx); return s && r.valeur != null && r.unite === s.unite && auDessus(r.valeur, s.valeur); }).map((c) => c.ruche_id));
    return {
      cle, colonies: l.cols.length, kg: l.kg, kgParColonie: recolteEn(annee) ? l.kgParColonie : null, pertes,
      varroa: taux.length ? arr1(taux.reduce((t, x) => t + x, 0) / taux.length) : null, comptages: leurs.length, auDessus: hautes.size,
      valeur: prixKg && l.kg ? Math.round(l.kg * prixKg) : null,
      histoire: [annee - 2, annee - 1, annee].map((an) => ({ annee: an, kgParColonie: recolteEn(an) ? ligne(cle, an).kgParColonie : null })),
    };
  });
}

/** Tri selon le critère : du meilleur au moins bon (moins de pertes, moins de varroa = mieux). Sans valeur : à la fin. */
export function trier(lignes, critere = "kg") {
  const v = (l) => ({ kg: l.kgParColonie, pertes: l.colonies ? l.pertes / l.colonies : null, varroa: l.varroa, valeur: l.valeur })[critere];
  const bas = critere === "pertes" || critere === "varroa";
  return [...lignes].sort((a, b) => {
    const x = v(a), y = v(b);
    if (x == null && y == null) return String(a.cle).localeCompare(String(b.cle), "fr");
    if (x == null) return 1;
    if (y == null) return -1;
    return (bas ? x - y : y - x) || String(a.cle).localeCompare(String(b.cle), "fr");
  });
}

/** Repères : meilleur et plus faible en kilos par colonie, seulement avec au moins deux ruchers qui ont récolté. */
export function reperes(lignes) {
  const r = lignes.filter((l) => l.kgParColonie > 0).sort((a, b) => b.kgParColonie - a.kgParColonie);
  if (r.length < 2) return { meilleur: null, faible: null };
  return { meilleur: r[0].cle, faible: r[r.length - 1].cle };
}

/**
 * Ce que montrent les chiffres, avec prudence : le rucher le plus faible trois saisons de suite, ou le plus de varroa
 * et de pertes ; jamais une cause, toujours « à regarder ». "" quand rien ne ressort.
 */
export function lecture(lignes, nom = (k) => k || "Sans rucher") {
  const { faible } = reperes(lignes);
  if (!faible) return "";
  const l = lignes.find((x) => x.cle === faible);
  const autres = lignes.filter((x) => x.cle !== faible);
  const toujours = l.histoire.every((h, i) => h.kgParColonie != null && autres.every((a) => a.histoire[i].kgParColonie == null || a.histoire[i].kgParColonie > h.kgParColonie));
  const plusVarroa = l.varroa != null && autres.every((a) => a.varroa == null || a.varroa < l.varroa);
  const morceaux = [];
  if (toujours && l.histoire.filter((h) => h.kgParColonie != null).length >= 2) morceaux.push(`le plus faible ${l.histoire.filter((h) => h.kgParColonie != null).length} saisons de suite`);
  if (plusVarroa) morceaux.push("le varroa le plus haut");
  if (l.pertes > 0 && autres.every((a) => a.pertes < l.pertes)) morceaux.push("le plus de pertes");
  if (!morceaux.length) return "";
  return `À « ${nom(faible)} » : ${morceaux.join(", ")}. Ce n’est pas une cause prouvée : l’emplacement, les reines et l’année jouent aussi. À regarder : la floraison autour, l’exposition, le moment du traitement.`;
}
