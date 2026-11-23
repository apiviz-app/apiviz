// Apiviz — « Ma saison » en un écran (v5.69, maquette « Accueil compact » validée le 20 nov. 2026). Règles pures :
// phase de la saison, frise, quatre chiffres qui changent avec la phase, aperçus, priorités d'API. Tout est tiré des
// visites, récoltes, événements des colonies et tâches : aucun chiffre inventé, et ce qui n'est pas noté est dit
// « à vérifier ». Tests : tests/unitaires/suivi-saison.test.mjs.
import { tauxVarroa, seuilApplicable, comptages, auDessus } from "../sante/regles.js";

/** Les sept moments de la saison (France, par défaut) ; flex = largeur sur la frise (en mois). */
export const PHASES = [
  { id: "hiver", nom: "Hivernage", mois: [0, 1] },
  { id: "reprise", nom: "Reprise", mois: [2] },
  { id: "developpement", nom: "Développement", mois: [3, 4] },
  { id: "miellees", nom: "Miellées", mois: [5, 6] },
  { id: "recolte", nom: "Récolte et traitement", mois: [7, 8] },
  { id: "preparation", nom: "Mise en hivernage", mois: [9, 10] },
  { id: "decembre", nom: "Hivernage", mois: [11] },
];

const jour = (s) => String(s || "").slice(0, 10);
const an = (s) => String(s || "").slice(0, 4);
const md = (s) => String(s || "").slice(5, 10);
const arrondi = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
const fr = (x) => String(arrondi(x)).replace(".", ",");
const dCourte = (s) => (s ? `${String(s).slice(8, 10)}/${String(s).slice(5, 7)}` : "");
const pl = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const utc = (s) => Date.UTC(Number(an(s)), Number(String(s).slice(5, 7)) - 1, Number(String(s).slice(8, 10)));
const ecartJours = (a, b) => Math.round((utc(a) - utc(b)) / 864e5);

/** Phase d'un jour (AAAA-MM-JJ). */
export const phaseDe = (aujourdhui) => {
  const m = Number(String(aujourdhui).slice(5, 7)) - 1;
  return PHASES.find((p) => p.mois.includes(m)).id;
};

/** Place d'un jour sur la frise de l'année, en % (0 au 1er janvier, 100 au 31 décembre). */
export function position(aujourdhui) {
  const a = Number(an(aujourdhui));
  const debut = Date.UTC(a, 0, 1), fin = Date.UTC(a + 1, 0, 1);
  return arrondi(((utc(aujourdhui) - debut) / (fin - debut)) * 100);
}

/** Noms lisibles : « Ruche 7 », « Ruche 7 et Ruche 11 », « Ruche 1, Ruche 2 et 3 autres ». */
export function noms(liste) {
  const n = liste.map((r) => r.nom);
  if (n.length <= 2) return n.join(" et ");
  if (n.length === 3) return `${n[0]}, ${n[1]} et ${n[2]}`;
  return `${n[0]}, ${n[1]} et ${n.length - 2} autres`;
}

/**
 * Tout ce que l'écran affiche, pour une année. `aujourdhui` borne les calculs : pour une année passée, l'écran se
 * place au 31 décembre (saison terminée).
 */
export function suivi(d, annee, aujourdhui, reglages = {}) {
  const a = String(annee), courante = an(aujourdhui) === a;
  const ref = courante ? jour(aujourdhui) : `${a}-12-31`;
  const ruches = d.ruches || [];
  const visites = (d.visites || []).filter((v) => an(v.date_visite) === a && jour(v.date_visite) <= ref);
  const evts = (d.evenements || []).filter((e) => an(e.date_evenement) === a && jour(e.date_evenement) <= ref);
  const recoltes = (d.recoltes || []).filter((x) => an(x.date_recolte) === a);
  const avant = (d.recoltes || []).filter((x) => an(x.date_recolte) === String(annee - 1));
  const somme = (l) => arrondi(l.reduce((t, x) => t + Number(x.kg || 0), 0));
  const parRuche = (id) => visites.filter((v) => v.ruche_id === id).sort((x, y) => jour(y.date_visite).localeCompare(jour(x.date_visite)));
  // IT-12 : seuil de chaque comptage (méthode, mois) d'après seuils_varroa ou le réglage saisi par l'apiculteur ; aucun
  // par défaut. Les comptages viennent des visites et des comptages du rucher (migration 036).
  const seuilDe = (v) => { const s = seuilApplicable(v, { seuils: d.seuils || [], reglages }); return s && s.unite === "pourcent" ? s.valeur : null; };
  const lesComptages = comptages(d).filter((c) => an(c.date_visite) === a && jour(c.date_visite) <= ref);

  // Récolte : kilos de l'année, de l'an dernier, et de l'an dernier à la même date (seulement pendant la saison).
  const kg = somme(recoltes), kgAvant = somme(avant);
  const kgAvantADate = courante ? somme(avant.filter((x) => md(x.date_recolte) <= md(ref))) : kgAvant;
  const objectif = Number(reglages.objectif_recolte) || 0;

  // Colonies : départ, nouvelles (divisions, essaims récupérés, installations), sorties de l'année.
  const plus = evts.filter((e) => e.type === "installation").length;
  const sorties = evts.filter((e) => e.type === "sortie");
  const colonies = { actuel: ruches.length, plus, moins: sorties.length, depart: ruches.length - plus + sorties.length,
    divisions: evts.filter((e) => e.type === "division").length, essaimages: evts.filter((e) => e.type === "essaimage").length,
    sorties: sorties.map((e) => ({ date: jour(e.date_evenement), nom: (d.ruchesSorties || []).find((r) => r.id === e.ruche_id)?.nom || ruches.find((r) => r.id === e.ruche_id)?.nom || "Une ruche", detail: e.detail || "" })) };

  // Varroa : dernier taux compté de chaque ruche cette année.
  const comptes = ruches.map((r) => { const v = lesComptages.find((x) => x.ruche_id === r.id && tauxVarroa(x) !== null); return { r, v, t: v ? tauxVarroa(v) : null, s: v ? seuilDe(v) : null }; });
  const avec = comptes.filter((c) => c.t !== null);
  const varroa = { seuil: avec.find((c) => c.s !== null)?.s ?? null, sansSeuil: avec.filter((c) => c.s === null).length, comptees: avec.length,
    sous: avec.filter((c) => c.s !== null && c.t < c.s).length,
    auDessus: avec.filter((c) => auDessus(c.t, c.s)).sort((x, y) => y.t - x.t).map((c) => ({ id: c.r.id, nom: c.r.nom, taux: arrondi(c.t), date: jour(c.v.date_visite) })),
    sansComptage: comptes.filter((c) => c.t === null).map((c) => ({ id: c.r.id, nom: c.r.nom })),
    moyenne: avec.length ? arrondi(avec.reduce((t, c) => t + c.t, 0) / avec.length) : null };

  // Prêtes pour l'hiver : réserves (depuis le 1er septembre), traitement (depuis le 1er juillet), ponte (depuis le 15 août).
  const poidsMin = Number(reglages.hiverPoids) || 0;
  const hiver = ruches.map((r) => {
    const vs = parRuche(r.id), raisons = [];
    const res = vs.find((v) => jour(v.date_visite) >= `${a}-09-01` && (v.provisions || v.poids_kg));
    if (!res) raisons.push("réserves à vérifier");
    else if (res.provisions === "Faibles" || (poidsMin && res.poids_kg && Number(res.poids_kg) < poidsMin)) raisons.push(res.poids_kg ? `réserves faibles (${fr(Number(res.poids_kg))} kg)` : "réserves faibles");
    if (!vs.some((v) => jour(v.date_visite) >= `${a}-07-01` && String(v.traitement || "").trim())) raisons.push("pas de traitement noté");
    const ponte = vs.find((v) => jour(v.date_visite) >= `${a}-08-15` && (v.oeufs_vus != null || v.reine || v.couvain));
    const okPonte = ponte && (ponte.oeufs_vus === true || ponte.reine === "Vue" || ["Réduit", "Normal", "Abondant"].includes(ponte.couvain));
    if (!okPonte) raisons.push(ponte ? "ni reine ni ponte vue" : "ponte à vérifier");
    return { id: r.id, nom: r.nom, raisons };
  });

  // Essaimage : cellules royales vues à la dernière visite de moins de 21 jours.
  const essaimage = ruches.map((r) => ({ r, v: parRuche(r.id)[0] }))
    .filter(({ v }) => v && ["Ouvertes", "Operculées"].includes(v.cellules_royales) && ecartJours(ref, v.date_visite) <= 21)
    .map(({ r, v }) => ({ id: r.id, nom: r.nom, cellules: v.cellules_royales.toLowerCase(), date: jour(v.date_visite) }));

  // Visites : ruches vues cette année, et depuis combien de jours chacune.
  const derniere = ruches.map((r) => ({ id: r.id, nom: r.nom, date: parRuche(r.id)[0]?.date_visite || null }));
  const premiere = (vs) => vs.map((v) => jour(v.date_visite)).filter((x) => md(x) >= "02-15" && md(x) <= "05-31").sort()[0] || null;
  const premiereAvant = premiere((d.visites || []).filter((v) => an(v.date_visite) === String(annee - 1)));

  return {
    annee: Number(annee), courante, ref, phase: courante ? phaseDe(ref) : null, position: courante ? position(ref) : 100,
    kg, kgAvant, kgAvantADate, objectif, colonies, varroa,
    hiver: { total: ruches.length, pretes: hiver.filter((h) => !h.raisons.length).length, aRevoir: hiver.filter((h) => h.raisons.length) },
    essaimage,
    hausses: { total: ruches.reduce((t, r) => t + (Number(r.hausses) || 0), 0), ruches: ruches.filter((r) => Number(r.hausses) > 0).map((r) => ({ id: r.id, nom: r.nom, n: Number(r.hausses) })) },
    visitees: { n: derniere.filter((x) => x.date).length, total: ruches.length, manquantes: derniere.filter((x) => !x.date), oubliees: derniere.filter((x) => x.date && ecartJours(ref, x.date) > 30).map((x) => ({ ...x, jours: ecartJours(ref, x.date) })) },
    nbVisites: visites.length,
    premiereVisite: premiere(visites), premiereVisiteAvant: premiereAvant,
    parMois: (mois) => ({ kg: somme(recoltes.filter((x) => mois.includes(Number(String(x.date_recolte).slice(5, 7)) - 1))),
      traitees: new Set(visites.filter((v) => mois.includes(Number(String(v.date_visite).slice(5, 7)) - 1) && String(v.traitement || "").trim()).map((v) => v.ruche_id)).size,
      sorties: sorties.filter((e) => mois.includes(Number(String(e.date_evenement).slice(5, 7)) - 1)).length,
      divisions: evts.filter((e) => e.type === "division" && mois.includes(Number(String(e.date_evenement).slice(5, 7)) - 1)).length,
      essaimages: evts.filter((e) => e.type === "essaimage" && mois.includes(Number(String(e.date_evenement).slice(5, 7)) - 1)).length }),
  };
}

/** « 16 % de plus qu’en 2025 à la même date », ou "" sans point de comparaison. */
export function comparaison(S) {
  if (!S.kgAvantADate) return "";
  const p = Math.round(((S.kg - S.kgAvantADate) / S.kgAvantADate) * 100);
  const quand = S.courante ? " à la même date" : "";
  if (Math.abs(p) < 3) return `Autant qu’en ${S.annee - 1}${quand}`;
  return `${Math.abs(p)} % de ${p > 0 ? "plus" : "moins"} qu’en ${S.annee - 1}${quand}`;
}

/** Bandeau : l'œil (saison et phase), la phrase et la ligne de résumé. */
export function bandeau(S) {
  const phase = PHASES.find((p) => p.id === S.phase);
  const oeil = S.courante ? `Saison ${S.annee} · ${phase.nom.toLowerCase()}` : `Saison ${S.annee} · terminée`;
  let titre;
  if (S.kg > 0) titre = `${fr(S.kg)} kg récoltés${S.objectif ? `, ${Math.round((S.kg / S.objectif) * 100)} % de ton objectif` : ""}`;
  else if (S.colonies.actuel) titre = `${pl(S.colonies.actuel, "colonie")}${S.courante ? " suivie" + (S.colonies.actuel > 1 ? "s" : "") : ""}`;
  else titre = "Ta saison commence";
  const resume = comparaison(S) || (S.nbVisites ? `${pl(S.nbVisites, "visite")} cette saison` : "Note tes visites et récoltes : la saison se dessinera ici.");
  return { oeil, titre, resume };
}

/** Phrase d'un moment de la saison, tirée des données (passé), ou ce qui vient (futur). */
export function textePhase(id, S) {
  const i = PHASES.findIndex((p) => p.id === id), ici = S.phase ? PHASES.findIndex((p) => p.id === S.phase) : 99;
  const quand = i < ici ? "passe" : i === ici ? "cours" : "futur";
  const P = PHASES[i], m = S.parMois(P.mois);
  const A_VENIR = {
    hiver: "garder les entrées dégagées et surveiller le poids.",
    reprise: "première visite par temps doux, vérifier reine et réserves.",
    developpement: "surveiller le couvain, poser les hausses, anticiper l’essaimage.",
    miellees: "contrôler les hausses et préparer l’extraction.",
    recolte: "récolter, puis traiter contre le varroa.",
    preparation: "peser, nourrir si besoin, réduire les entrées.",
    decembre: "traitement hors couvain et déclaration des ruches avant le 31 décembre.",
  };
  if (quand === "futur") return `À venir : ${A_VENIR[id]}`;
  const pre = quand === "cours" ? "En cours : " : "";
  let t = "";
  if (id === "hiver" || id === "decembre") {
    const tr = id === "decembre" && m.traitees ? `${pl(m.traitees, "ruche")} traitée${m.traitees > 1 ? "s" : ""}, ` : "";
    t = `${tr}${m.sorties ? `${pl(m.sorties, "colonie")} perdue${m.sorties > 1 ? "s" : ""}` : "aucune perte notée"}.`;
    if (id === "decembre" && quand === "cours") t += " Déclaration des ruches avant le 31 décembre.";
  } else if (id === "reprise") {
    if (!S.premiereVisite) t = quand === "cours" ? A_VENIR.reprise : "aucune visite notée au printemps.";
    else {
      const e = S.premiereVisiteAvant ? ecartJours(`2000-${md(S.premiereVisiteAvant)}`, `2000-${md(S.premiereVisite)}`) : null;
      t = `première visite le ${dCourte(S.premiereVisite)}${e === null ? "" : e === 0 ? `, comme en ${S.annee - 1}` : `, ${pl(Math.abs(e), "jour")} plus ${e > 0 ? "tôt" : "tard"} qu’en ${S.annee - 1}`}.`;
    }
  } else if (id === "developpement") {
    const bouts = [m.divisions ? pl(m.divisions, "division") : "", m.essaimages ? pl(m.essaimages, "essaimage") : "", quand === "cours" && S.hausses.total ? `${pl(S.hausses.total, "hausse")} posée${S.hausses.total > 1 ? "s" : ""}` : "", quand === "cours" && S.essaimage.length ? `cellules royales sur ${noms(S.essaimage)}` : ""].filter(Boolean);
    t = bouts.length ? bouts.join(", ") + "." : "ni division ni essaimage notés.";
  } else if (id === "miellees") {
    t = m.kg ? `${fr(m.kg)} kg récoltés.` : "pas de récolte notée.";
  } else if (id === "recolte") {
    t = [m.kg ? `${fr(m.kg)} kg récoltés` : "pas de récolte notée", m.traitees ? `${m.traitees} ruche${m.traitees > 1 ? "s" : ""} sur ${S.colonies.actuel} traitée${m.traitees > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") + ".";
  } else if (id === "preparation") {
    t = S.hiver.total ? `${S.hiver.pretes} ruche${S.hiver.pretes > 1 ? "s" : ""} prête${S.hiver.pretes > 1 ? "s" : ""} sur ${S.hiver.total}${S.hiver.aRevoir.length ? `, ${S.hiver.aRevoir.length} à revoir` : ""}.` : "aucune ruche.";
  }
  return pre + t.charAt(0).toUpperCase() + t.slice(1);
}

/** Le quatrième chiffre change avec la phase. */
export function quatrieme(S) {
  if (!S.courante) return "ventes";
  return { reprise: "visitees", developpement: "essaimage", miellees: "hausses", recolte: "hausses" }[S.phase] || "hiver";
}

/** Les quatre chiffres : [{ id, nom, valeur, sous, ton }] ; ton = "" | "good" | "watch" | "crit". */
export function chiffres(S, ventes = null) {
  const c = S.colonies, v = S.varroa;
  const recolte = { id: "recolte", nom: "Récolte", valeur: `${fr(S.kg)} kg`,
    sous: S.objectif ? `sur ${S.objectif} kg visés` : S.kgAvant ? `${fr(S.kgAvant)} kg en ${S.annee - 1}` : "cette saison", ton: "" };
  const colonies = { id: "colonies", nom: "Colonies", valeur: S.courante ? String(c.actuel) : `+${c.plus} −${c.moins}`,
    sous: S.courante ? (c.plus || c.moins ? `${c.depart} au départ · +${c.plus} −${c.moins}` : "aucune entrée ni sortie") : "entrées et sorties", ton: "" };
  const varroa = v.comptees && v.sansSeuil === v.comptees
    ? { id: "varroa", nom: "Varroa", valeur: String(v.comptees), sous: "comptées · aucun seuil choisi", ton: "" }
    : v.comptees
    ? { id: "varroa", nom: "Varroa", valeur: `${v.sous}/${v.comptees}`, sous: v.auDessus.length ? `${v.auDessus.length} au-dessus du seuil` : v.sansComptage.length ? `sous le seuil · ${v.sansComptage.length} à compter` : "sous le seuil", ton: v.auDessus.length ? "crit" : v.sansComptage.length ? "watch" : "good" }
    : { id: "varroa", nom: "Varroa", valeur: "—", sous: "aucun comptage", ton: "watch" };
  const q = quatrieme(S);
  const Q = {
    hiver: { id: "hiver", nom: "Hiver", valeur: `${S.hiver.pretes}/${S.hiver.total}`, sous: S.hiver.aRevoir.length ? `prêtes · ${S.hiver.aRevoir.length} à revoir` : "toutes prêtes", ton: S.hiver.aRevoir.length ? "watch" : "good" },
    essaimage: { id: "essaimage", nom: "Essaimage", valeur: S.essaimage.length ? pl(S.essaimage.length, "alerte") : "Calme", sous: S.essaimage.length ? `${noms(S.essaimage)} à revoir` : "aucune cellule royale", ton: S.essaimage.length ? "crit" : "good" },
    hausses: { id: "hausses", nom: "Hausses posées", valeur: String(S.hausses.total), sous: `sur ${pl(S.hausses.ruches.length, "ruche")}`, ton: "" },
    visitees: { id: "visitees", nom: "Ruches visitées", valeur: `${S.visitees.n}/${S.visitees.total}`, sous: S.visitees.manquantes.length ? `${S.visitees.manquantes.length} pas encore vue${S.visitees.manquantes.length > 1 ? "s" : ""}` : "toutes vues", ton: S.visitees.manquantes.length ? "watch" : "good" },
    ventes: { id: "ventes", nom: "Pots vendus", valeur: String(ventes?.pots ?? 0), sous: ventes?.clients ? pl(ventes.clients, "client") : "aucune vente", ton: "" },
  };
  return [recolte, colonies, varroa, Q[q]];
}

/**
 * Aperçu d'un chiffre (feuille du bas) : titre, jauge (pct ou null), lignes { k, v, ruche? } et bouton [route, libellé].
 * `extra` : { parMiel: [[miel, kg]], meilleurRucher: { nom, kg } } calculés par l'écran.
 */
export function apercu(id, S, extra = {}) {
  const L = (k, v, ruche) => ({ k, v, ruche: ruche || null });
  const c = S.colonies, v = S.varroa;
  switch (id) {
    case "recolte": return { titre: `Récolte ${S.annee}`, pct: S.objectif ? Math.min(100, Math.round((S.kg / S.objectif) * 100)) : null,
      lignes: [...(extra.parMiel || []).slice(0, 3).map(([m, k]) => L(m || "Sans nom de miel", `${fr(k)} kg`)),
        extra.meilleurRucher ? L("Meilleur rucher", `${extra.meilleurRucher.nom} · ${fr(extra.meilleurRucher.kg)} kg/ruche`) : null,
        S.kgAvant ? L(`En ${S.annee - 1}`, `${fr(S.kgAvant)} kg`) : null,
        S.objectif ? L("Objectif", `${S.objectif} kg`) : L("Objectif", "à fixer dans Réglages")].filter(Boolean),
      bouton: ["recoltes", "Voir les récoltes"] };
    case "colonies": return { titre: "Colonies", pct: null,
      lignes: [L("Au départ", String(c.depart)), L("Nouvelles", `+${c.plus}${c.divisions ? ` (dont ${pl(c.divisions, "division")})` : ""}`), L("Sorties", `−${c.moins}`),
        ...c.sorties.slice(0, 3).map((s) => L(`${s.nom} · ${dCourte(s.date)}`, s.detail || "sortie"))],
      bouton: ["ruches", "Voir les ruchers"] };
    case "varroa": return { titre: "Varroa", pct: v.comptees ? Math.round((v.sous / v.comptees) * 100) : null,
      lignes: [L("Taux moyen", v.moyenne === null ? "aucun comptage" : `${fr(v.moyenne)} %${v.seuil !== null ? ` (seuil ${fr(v.seuil)} %)` : " (aucun seuil choisi)"}`),
        ...v.auDessus.slice(0, 3).map((r) => L(r.nom, `${fr(r.taux)} % le ${dCourte(r.date)}`, r.id)),
        v.sansComptage.length ? L("Pas encore comptées", noms(v.sansComptage)) : null].filter(Boolean),
      bouton: ["varroa", "Voir la santé"] };
    case "hiver": return { titre: "Prêtes pour l’hiver", pct: S.hiver.total ? Math.round((S.hiver.pretes / S.hiver.total) * 100) : null,
      lignes: S.hiver.aRevoir.length ? S.hiver.aRevoir.slice(0, 5).map((h) => L(h.nom, h.raisons.join(", "), h.id)) : [L("Toutes les ruches", "réserves, traitement et ponte vus")],
      note: "Prête : réserves notées depuis le 1er septembre, traitement depuis le 1er juillet, reine ou ponte vue depuis le 15 août.",
      bouton: ["ruches", "Voir les ruchers"] };
    case "essaimage": return { titre: "Essaimage", pct: null,
      lignes: S.essaimage.length ? S.essaimage.map((e) => L(e.nom, `cellules ${e.cellules} le ${dCourte(e.date)}`, e.id)) : [L("Cellules royales", "aucune aux dernières visites")],
      bouton: ["ruches", "Voir les ruchers"] };
    case "hausses": return { titre: "Hausses", pct: null,
      lignes: S.hausses.ruches.length ? S.hausses.ruches.slice(0, 5).map((r) => L(r.nom, pl(r.n, "hausse"), r.id)) : [L("Hausses posées", "aucune")],
      bouton: ["ruches", "Voir les ruchers"] };
    case "visitees": return { titre: "Ruches visitées", pct: S.visitees.total ? Math.round((S.visitees.n / S.visitees.total) * 100) : null,
      lignes: S.visitees.manquantes.length ? S.visitees.manquantes.slice(0, 5).map((r) => L(r.nom, "pas encore vue", r.id)) : [L("Toutes les ruches", "vues cette saison")],
      bouton: ["ruches", "Voir les ruchers"] };
    default: return { titre: "Ventes", pct: null, lignes: [L("Pots vendus", String(extra.ventes?.pots ?? 0)), L("Clients", String(extra.ventes?.clients ?? 0))], bouton: ["msbilan", "Voir le bilan"] };
  }
}

/**
 * Priorités d'API pour la saison en cours (3 au plus, les plus urgentes d'abord) : { titre, pourquoi, ruche_id }.
 * `attente` : kilos récoltés pas encore en pots.
 */
export function priorites(S, { attente = 0 } = {}) {
  if (!S.courante) return [];
  const m = Number(S.ref.slice(5, 7)) - 1, out = [];
  const une = (l) => (l.length === 1 ? l[0].id : null);
  if (S.varroa.auDessus.length) {
    const l = S.varroa.auDessus;
    out.push({ titre: `Traiter ou recompter ${noms(l)}`, pourquoi: `Varroa à ${fr(l[0].taux)} % le ${dCourte(l[0].date)} (seuil ${fr(S.varroa.seuil)} %).`, ruche_id: une(l) });
  }
  if (m >= 2 && m <= 6 && S.essaimage.length) {
    const e = S.essaimage[0];
    out.push({ titre: `Repasser à ${noms(S.essaimage)}`, pourquoi: `Cellules royales ${e.cellules} vues le ${dCourte(e.date)} : risque d’essaimage.`, ruche_id: une(S.essaimage) });
  }
  if (m >= 8) {
    const faibles = S.hiver.aRevoir.filter((h) => h.raisons.some((r) => r.startsWith("réserves faibles")));
    if (faibles.length) out.push({ titre: `Peser ou nourrir ${noms(faibles)}`, pourquoi: "Réserves faibles à la dernière visite.", ruche_id: une(faibles) });
    const sans = S.hiver.aRevoir.filter((h) => h.raisons.includes("pas de traitement noté"));
    if (sans.length) out.push({ titre: `Traiter contre le varroa : ${noms(sans)}`, pourquoi: "Aucun traitement noté depuis le 1er juillet.", ruche_id: une(sans) });
  }
  if (attente > 0.05) out.push({ titre: `Mettre ${fr(attente)} kg en pots`, pourquoi: "Miel récolté pas encore en pots.", ruche_id: null, route: "miseenpots" });
  if (m === 2 && S.visitees.manquantes.length) out.push({ titre: `Première visite : ${noms(S.visitees.manquantes)}`, pourquoi: "Pas encore vue cette saison.", ruche_id: une(S.visitees.manquantes) });
  if (m >= 3 && m <= 9 && S.visitees.oubliees.length) {
    const o = [...S.visitees.oubliees].sort((x, y) => y.jours - x.jours);
    out.push({ titre: `Visiter ${noms(o)}`, pourquoi: `Pas de visite depuis ${o[0].jours} jours.`, ruche_id: une(o) });
  }
  if (m >= 8 && S.colonies.actuel) out.push({ titre: `Déclarer tes ${pl(S.colonies.actuel, "ruche")}`, pourquoi: "Déclaration obligatoire chaque année, avant le 31 décembre.", ruche_id: null, route: "declaration" });
  return out.slice(0, 3);
}

/** La rubrique mise en avant (« Du moment ») selon le mois. */
export const MOMENT = ["msbilan", "msbilan", "varroa", "agenda", "agenda", "recoltes", "recoltes", "recoltes", "varroa", "varroa", "varroa", "msbilan"];
export const moment = (S) => (S.courante ? MOMENT[Number(S.ref.slice(5, 7)) - 1] : "msbilan");
