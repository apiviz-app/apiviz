// Apiviz — règles pures du fil de l'équipe, des courbes d'une colonie et de « Ma saison » (v5.61, maquettes
// « Nouveautés » 5, 6 et 7 validées le 17 nov. 2026). Testées par tests/unitaires/equipe.test.mjs.

const plat = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const arrondi = (x, k = 1) => Math.round(x * 10 ** k) / 10 ** k;
const jour = (d) => String(d || "").slice(0, 10);

// =====================================================================================================================
// Fil de l'équipe
// =====================================================================================================================

/**
 * Membre mentionné dans un texte (« @Johan », « @pierre-louis ») : le premier qui correspond, par son prénom (premier
 * mot du nom), son nom complet sans espaces, ou le début de son e-mail. Renvoie { email, nom } ou null.
 */
export function mention(texte, membres) {
  const ms = [...String(texte || "").matchAll(/@([\p{L}\p{N}._-]+)/gu)].map((m) => plat(m[1]));
  if (!ms.length) return null;
  for (const m of ms) {
    const trouve = (membres || []).find((x) => {
      const nom = plat(x.nom), mots = nom.split(/\s+/);
      return mots[0] === m || nom.replace(/\s+/g, "") === m || plat(String(x.email).split("@")[0]) === m;
    });
    if (trouve) return trouve;
  }
  return null;
}

/** Texte d'une demande sans la mention, en titre de tâche : « Passer peser Ruche 5 avant samedi ». */
export function titreTache(texte) {
  let t = String(texte || "").replace(/@[\p{L}\p{N}._-]+[,:]?/gu, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^(est-ce que\s+)?(tu (pourrais|peux)|peux-tu|pourrais-tu|merci de|stp|s'il te plaît)\s+/i, "");
  t = t.replace(/\s*(stp|s'il te plaît|merci)\s*[?!.]*$/i, "").replace(/\s*[?!.]+$/, "").trim();
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 120);
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
/** Échéance lue dans le texte (« demain », « samedi », « avant vendredi ») : AAAA-MM-JJ, ou "". */
export function echeance(texte, aujourdhui) {
  const t = plat(texte), d = new Date(jour(aujourdhui) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "";
  const iso = (x) => x.toISOString().slice(0, 10);
  if (/\baujourd'?hui\b|\bce soir\b/.test(t)) return iso(d);
  if (/\bapres-demain\b/.test(t)) { d.setDate(d.getDate() + 2); return iso(d); }
  if (/\bdemain\b/.test(t)) { d.setDate(d.getDate() + 1); return iso(d); }
  const j = JOURS.findIndex((x) => new RegExp(`\\b${x}\\b`).test(t));
  if (j < 0) return "";
  let ecart = (j - d.getDay() + 7) % 7;
  if (ecart === 0) ecart = 7;
  d.setDate(d.getDate() + ecart);
  return iso(d);
}

/**
 * Le fil : messages (avec leurs réponses) et activité (saisies de chacun), du plus récent au plus ancien.
 * activite : [{ quand, qui, titre, sous, act, v }] (V3.fil). filtre : "tout" | "moi" (demandes pour moi pas encore
 * prises) | "notes" (messages seulement).
 */
export function fil(messages, activite, moi, filtre = "tout") {
  const ms = messages || [];
  const reponses = new Map();
  for (const m of ms) if (m.parent_id) (reponses.get(m.parent_id) || reponses.set(m.parent_id, []).get(m.parent_id)).push(m);
  for (const l of reponses.values()) l.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const moiP = plat(moi);
  const messagesHaut = ms.filter((m) => !m.parent_id).map((m) => ({
    type: "message", quand: m.created_at, m, reponses: reponses.get(m.id) || [],
    demande: !!m.pour, pourMoi: !!m.pour && plat(m.pour) === moiP && !m.tache_id, prise: !!m.tache_id,
  }));
  const acts = filtre === "tout" ? (activite || []).map((a) => ({ type: "activite", quand: a.quand, a })) : [];
  return [...messagesHaut.filter((x) => filtre !== "moi" || x.pourMoi), ...acts]
    .filter((x) => x.quand)
    .sort((a, b) => (Number(!!b.pourMoi) - Number(!!a.pourMoi)) || String(b.quand).localeCompare(String(a.quand)));
}

/** Demandes adressées à moi, pas encore prises (sous-titre de l'écran). */
export const demandesPourMoi = (messages, moi) => (messages || []).filter((m) => !m.parent_id && m.pour && plat(m.pour) === plat(moi) && !m.tache_id).length;

/** « il y a 2 h », « hier, 16 h », « lundi », « 3 nov. » */
export function ilYa(iso, maintenant = new Date()) {
  const t = new Date(iso), m = (maintenant - t) / 60000;
  if (Number.isNaN(t.getTime())) return "";
  if (m < 1) return "à l’instant";
  if (m < 60) return `il y a ${Math.floor(m)} min`;
  if (m < 6 * 60) return `il y a ${Math.floor(m / 60)} h`;
  const j0 = new Date(maintenant); j0.setHours(0, 0, 0, 0);
  const h = `${t.getHours()} h${t.getMinutes() ? String(t.getMinutes()).padStart(2, "0") : ""}`;
  if (t >= j0) return `aujourd’hui, ${h}`;
  const hier = new Date(j0); hier.setDate(hier.getDate() - 1);
  if (t >= hier) return `hier, ${h}`;
  const sem = new Date(j0); sem.setDate(sem.getDate() - 6);
  if (t >= sem) return JOURS[t.getDay()];
  return t.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// =====================================================================================================================
// Courbes d'une colonie
// =====================================================================================================================

export const MESURES = {
  poids: { nom: "Poids", titre: "Poids de la ruche", unite: " kg", dec: 1 },
  varroa: { nom: "Varroa", titre: "Varroas pour 100 abeilles", unite: " %", dec: 1 },
  force: { nom: "Force", titre: "Force de la colonie (1 à 5)", unite: "/5", dec: 0 },
};

/** Valeur d'une visite pour une mesure, ou null. tauxVarroa : fonction de l'application (varroas pour 100 abeilles). */
export function valeur(v, mesure, tauxVarroa) {
  if (mesure === "poids") { const x = Number(v.poids_kg); return v.poids_kg !== null && v.poids_kg !== undefined && v.poids_kg !== "" && !Number.isNaN(x) ? x : null; }
  if (mesure === "force") { const x = Number(v.force); return v.force && x >= 1 && x <= 5 ? x : v.force ? null : ({ Faible: 2, Normale: 3, Forte: 4 }[v.activite] ?? null); }
  if (mesure === "varroa") { const x = tauxVarroa ? tauxVarroa(v) : null; return x === null || x === undefined || Number.isNaN(Number(x)) ? null : Number(x); }
  return null;
}

/** Jour de l'année (0 au 1er janvier), pour superposer deux saisons. */
const jourAn = (iso) => { const d = new Date(jour(iso) + "T12:00:00"); return Math.round((d - new Date(d.getFullYear(), 0, 1, 12)) / 864e5); };

/**
 * Séries d'une ruche pour une mesure : [{ annee, points: [{ date, j, v }] }] pour l'année demandée et la précédente,
 * dans l'ordre des dates. j : jour de l'année.
 */
export function series(visites, rucheId, mesure, annee, tauxVarroa) {
  const out = [];
  for (const a of [annee, annee - 1]) {
    const points = (visites || []).filter((v) => v.ruche_id === rucheId && String(v.date_visite).slice(0, 4) === String(a))
      .map((v) => ({ date: jour(v.date_visite), j: jourAn(v.date_visite), v: valeur(v, mesure, tauxVarroa) }))
      .filter((p) => p.v !== null).sort((x, y) => x.j - y.j);
    out.push({ annee: a, points });
  }
  return out;
}

/** Fenêtre des mois à montrer : de mars à novembre, élargie aux points en dehors. Renvoie { de, a } en jours de l'année. */
export function fenetre(listes) {
  const js = listes.flatMap((l) => l.map((p) => p.j));
  const de = Math.min(59, ...js), a = Math.max(334, ...js);
  return { de: Math.max(0, Math.floor(de / 30.4) * 30.4), a: Math.min(365, Math.ceil((a + 1) / 30.4) * 30.4) };
}

/** Échelle verticale : { bas, haut } arrondis, avec un peu d'air ; la force reste de 0 à 5. */
export function echelle(valeurs, mesure, seuil) {
  if (mesure === "force") return { bas: 0, haut: 5 };
  const v = [...valeurs, ...(mesure === "varroa" && seuil ? [seuil] : [])];
  if (!v.length) return { bas: 0, haut: mesure === "varroa" ? 5 : 40 };
  const pas = mesure === "varroa" ? 1 : 5;
  let bas = Math.floor((Math.min(...v) - (mesure === "varroa" ? 0 : 2)) / pas) * pas, haut = Math.ceil((Math.max(...v) + pas / 2) / pas) * pas;
  if (bas < 0) bas = 0;
  if (haut - bas < pas * 2) haut = bas + pas * 2;
  return { bas, haut };
}

/** Événements de la saison sur la courbe : récoltes (kg) et traitements (produit), avec leur jour de l'année. */
export function evenements(d, rucheId, annee) {
  const a = String(annee);
  const rec = (d.recoltes || []).filter((x) => x.ruche_id === rucheId && String(x.date_recolte).slice(0, 4) === a)
    .map((x) => ({ type: "recolte", date: jour(x.date_recolte), j: jourAn(x.date_recolte), texte: `${String(arrondi(Number(x.kg))).replace(".", ",")} kg` }));
  const tr = (d.visites || []).filter((v) => v.ruche_id === rucheId && String(v.date_visite).slice(0, 4) === a && String(v.traitement || "").trim())
    .map((v) => ({ type: "traitement", date: jour(v.date_visite), j: jourAn(v.date_visite), texte: String(v.traitement).trim() }));
  return [...rec, ...tr].sort((x, y) => x.j - y.j);
}

/** La phrase sous la courbe : évolution depuis la première mesure de l'année, et comparaison avec l'an dernier. */
export function phraseCourbe(s, mesure, seuil) {
  const [cette, avant] = s, p = cette.points;
  const u = MESURES[mesure], f = (x) => String(arrondi(x, u.dec)).replace(".", ",");
  if (!p.length) return { texte: "Pas encore de mesure cette année.", ton: "" };
  const der = p.at(-1);
  if (mesure === "varroa" && seuil) {
    if (der.v >= seuil) return { texte: `${f(der.v)} % à la dernière mesure, au-dessus du seuil de ${f(seuil)} %.`, ton: "crit" };
    const max = Math.max(...p.map((x) => x.v));
    if (max >= seuil) return { texte: `Retombé sous le seuil (${f(der.v)} %) après un pic à ${f(max)} %.`, ton: "good" };
  }
  const comp = (() => {
    const proche = avant.points.reduce((b, x) => (!b || Math.abs(x.j - der.j) < Math.abs(b.j - der.j) ? x : b), null);
    if (!proche || Math.abs(proche.j - der.j) > 21) return "";
    const ecart = der.v - proche.v;
    if (Math.abs(ecart) < (mesure === "poids" ? 1 : mesure === "force" ? 1 : 0.3)) return " Comme l’an dernier à la même date.";
    return ` ${ecart > 0 ? "+" : "−"}${f(Math.abs(ecart))}${u.unite} par rapport à l’an dernier à la même date.`;
  })();
  if (p.length < 2) return { texte: `${f(der.v)}${u.unite} à la seule mesure de l’année.${comp}`, ton: "" };
  const d = der.v - p[0].v;
  const pres = mesure === "poids" && p.length >= 2 ? (() => { const avantDer = p.at(-2); const dd = der.v - avantDer.v; return dd <= -1 ? `−${f(-dd)} kg depuis la pesée précédente.` : ""; })() : "";
  if (pres) return { texte: `${pres}${comp}`, ton: "watch" };
  return { texte: `${Math.abs(d) < 0.05 ? "Stable" : (d > 0 ? "+" : "−") + f(Math.abs(d)) + u.unite} depuis le début de l’année.${comp}`, ton: "" };
}

// =====================================================================================================================
// Ma saison
// =====================================================================================================================

/** Totaux d'une année : kg récoltés (et l'an d'avant), pots vendus, clients, argent rentré et dépensé, stock. */
export function saison(d, annee, venteTotal) {
  const a = String(annee), b = String(annee - 1);
  const de = (l, champ, an) => (l || []).filter((x) => String(x[champ]).slice(0, 4) === an);
  const kg = (l) => arrondi(l.reduce((t, x) => t + Number(x.kg || 0), 0));
  const recoltes = de(d.recoltes, "date_recolte", a), avant = de(d.recoltes, "date_recolte", b);
  const ventes = de(d.ventes, "date_vente", a);
  const ids = new Set(ventes.map((v) => v.id));
  const lignes = (d.lignes || []).filter((l) => ids.has(l.vente_id));
  const pots = lignes.reduce((t, l) => t + Number(l.quantite || 0), 0);
  const rentre = arrondi(ventes.reduce((t, v) => t + (venteTotal ? Number(venteTotal(v)) : 0), 0), 2);
  const depense = arrondi(de(d.depenses, "date_depense", a).reduce((t, x) => t + Number(x.montant || 0), 0), 2);
  const stock = (d.lots || []).reduce((t, l) => t + Math.max(0, Number(l.pots_restants ?? 0)), 0);
  return {
    kg: kg(recoltes), kgAvant: kg(avant), pots, clients: new Set(ventes.map((v) => v.client_id)).size,
    rentre, depense, stock, nbVentes: ventes.length,
  };
}

/** « 23 % de plus qu’en 2025 », « autant qu’en 2025 », ou "" quand l'an d'avant n'a rien. */
export function evolution(kg, kgAvant, annee) {
  if (!kgAvant) return "";
  const p = Math.round(((kg - kgAvant) / kgAvant) * 100);
  if (Math.abs(p) < 3) return `autant qu’en ${annee - 1}`;
  return `${Math.abs(p)} % de ${p > 0 ? "plus" : "moins"} qu’en ${annee - 1}`;
}

/** Kilos par ruche active (et sorties qui ont récolté), du meilleur au moins bon. */
export function kgParRuche(d, annee) {
  const a = String(annee), par = new Map();
  for (const x of d.recoltes || []) if (x.ruche_id && String(x.date_recolte).slice(0, 4) === a) par.set(x.ruche_id, (par.get(x.ruche_id) || 0) + Number(x.kg || 0));
  const ruches = [...(d.ruches || []), ...(d.ruchesSorties || []).filter((r) => par.has(r.id))];
  return ruches.map((r) => ({ id: r.id, nom: r.nom, rucher: r.rucher || "", annee_reine: r.annee_reine, kg: arrondi(par.get(r.id) || 0) }))
    .sort((x, y) => y.kg - x.kg || String(x.nom).localeCompare(String(y.nom), "fr", { numeric: true }));
}

/** Semaines de ventes que tient le stock, d'après les 8 dernières semaines ; null si rien vendu. */
export function semainesDeStock(d, stock, aujourdhui) {
  const fin = new Date(jour(aujourdhui) + "T12:00:00"), debut = new Date(fin); debut.setDate(debut.getDate() - 56);
  const ids = new Set((d.ventes || []).filter((v) => { const t = new Date(jour(v.date_vente) + "T12:00:00"); return t > debut && t <= fin; }).map((v) => v.id));
  const pots = (d.lignes || []).filter((l) => ids.has(l.vente_id)).reduce((t, l) => t + Number(l.quantite || 0), 0);
  if (!pots) return null;
  return Math.max(1, Math.round(stock / (pots / 8)));
}

/**
 * Ce qu'API retient de la saison : 3 constats au plus, tirés des chiffres (aucune invention). Le meilleur rucher (si
 * plusieurs ruchers ont récolté), les ruches sans récolte (avec l'âge de la reine quand elle a 3 ans ou plus), la
 * meilleure ruche.
 */
export function constats(parRuche, annee) {
  const out = [];
  const avecKg = parRuche.filter((r) => r.kg > 0);
  const ruchers = new Map();
  for (const r of parRuche) if (r.rucher) { const x = ruchers.get(r.rucher) || { kg: 0, n: 0 }; x.kg += r.kg; x.n += 1; ruchers.set(r.rucher, x); }
  const moy = [...ruchers].map(([nom, x]) => ({ nom, m: x.kg / x.n })).filter((x) => x.m > 0).sort((a, b) => b.m - a.m);
  if (moy.length >= 2) {
    const reste = [...ruchers].filter(([n]) => n !== moy[0].nom).reduce((t, [, x]) => ({ kg: t.kg + x.kg, n: t.n + x.n }), { kg: 0, n: 0 });
    const autres = reste.n ? reste.kg / reste.n : 0;
    const p = autres ? Math.round(((moy[0].m - autres) / autres) * 100) : 0;
    if (p >= 10) out.push(`Les ruches « ${moy[0].nom} » ont donné ${p} % de plus que les autres, par ruche.`);
  }
  const zero = parRuche.filter((r) => r.kg === 0);
  if (zero.length && avecKg.length) {
    const vieille = zero.find((r) => r.annee_reine && annee - Number(r.annee_reine) >= 3);
    if (vieille) out.push(`${vieille.nom} n’a rien donné : sa reine a ${annee - Number(vieille.annee_reine)} ans, pense à la changer au printemps.`);
    else out.push(zero.length === 1 ? `${zero[0].nom} n’a rien donné cette année.` : `${zero.length} ruches n’ont rien donné cette année : ${zero.slice(0, 4).map((r) => r.nom).join(", ")}${zero.length > 4 ? "…" : ""}.`);
  }
  if (avecKg.length >= 3) out.push(`${avecKg[0].nom} est la meilleure ruche de l’année, avec ${String(avecKg[0].kg).replace(".", ",")} kg.`);
  return out.slice(0, 3);
}

/** Résumé à partager (texte). */
export function resumeTexte(nom, annee, s, parRuche, cs) {
  const f = (x) => String(x).replace(".", ",");
  const lignes = [
    `${nom ? nom + " · " : ""}Saison ${annee}`,
    `${f(s.kg)} kg récoltés${evolution(s.kg, s.kgAvant, annee) ? ` (${evolution(s.kg, s.kgAvant, annee)})` : ""}`,
    `${s.pots} pots vendus à ${s.clients} client${s.clients > 1 ? "s" : ""}`,
    `${f(s.rentre)} € rentrés, ${f(s.depense)} € dépensés`,
    `${s.stock} pots en stock`,
  ];
  const top = parRuche.filter((r) => r.kg > 0).slice(0, 3).map((r) => `${r.nom} ${f(r.kg)} kg`).join(", ");
  if (top) lignes.push(`Meilleures ruches : ${top}`);
  return [...lignes, ...cs].join("\n");
}
