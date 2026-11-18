// Apiviz — historique des échanges avec API (v5.62, migration 031) : règles pures, testées par
// tests/unitaires/assistant-historique.test.mjs. Une ligne = une question et sa réponse ; une conversation = les lignes
// qui partagent conversation_id.

const sansAccents = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const jourLocal = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Lignes d'une conversation, de la plus ancienne à la plus récente. */
export function echangesDe(lignes, conv) {
  return (lignes || []).filter((x) => x.conversation_id === conv).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

/** Numéros des conseils encore à faire d'une ligne. */
export function conseilsOuverts(x) {
  const suivis = new Set((Array.isArray(x?.conseils_suivis) ? x.conseils_suivis : []).map(Number));
  return ((x?.reponse && x.reponse.recommandations) || []).map((r, i) => ({ r, i })).filter(({ r, i }) => r && r.texte && !suivis.has(i));
}

/** Conversations, la plus récente d'abord : titre (première question), date, nombre de questions, ruche, conseils. */
export function conversations(lignes) {
  const par = new Map();
  for (const x of lignes || []) {
    if (!x || !x.conversation_id) continue;
    (par.get(x.conversation_id) || par.set(x.conversation_id, []).get(x.conversation_id)).push(x);
  }
  return [...par.entries()].map(([id, l]) => {
    l.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return {
      id,
      titre: l[0].question,
      debut: l[0].created_at,
      quand: l[l.length - 1].created_at,
      n: l.length,
      ruche_id: (l.find((x) => x.ruche_id) || {}).ruche_id || null,
      aFaire: l.reduce((t, x) => t + conseilsOuverts(x).length, 0),
    };
  }).sort((a, b) => String(b.quand).localeCompare(String(a.quand)));
}

/** Rubrique d'une date : « Aujourd’hui », « Hier », « Cette semaine » (7 jours), puis le mois (et l'année si autre). */
export function periode(iso, maintenant = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Plus ancien";
  const ecart = Math.round((jourLocal(maintenant) - jourLocal(d)) / 86400000);
  if (ecart <= 0) return "Aujourd’hui";
  if (ecart === 1) return "Hier";
  if (ecart < 7) return "Cette semaine";
  return MOIS[d.getMonth()] + (d.getFullYear() === maintenant.getFullYear() ? "" : ` ${d.getFullYear()}`);
}

/** Conversations rangées par rubrique, dans l'ordre : [[rubrique, conversations], …]. */
export function grouper(convs, maintenant = new Date()) {
  const out = [];
  for (const c of convs || []) {
    const p = periode(c.quand, maintenant);
    const g = out.find(([k]) => k === p);
    if (g) g[1].push(c); else out.push([p, [c]]);
  }
  return out;
}

/** Conseils pas encore faits, des 30 derniers jours, les plus récents d'abord. */
export function conseilsAFaire(lignes, maintenant = new Date(), max = 3) {
  const limite = maintenant.getTime() - 30 * 86400000;
  return [...(lignes || [])]
    .filter((x) => new Date(x.created_at).getTime() >= limite)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .flatMap((x) => conseilsOuverts(x).map(({ r, i }) => ({ echange: x.id, conversation: x.conversation_id, i, texte: r.texte, ruche_id: x.ruche_id || null, sanitaire: !!r.sanitaire })))
    .slice(0, max);
}

/** Conversations dont une question, un résumé ou un conseil contient chaque mot cherché (sans tenir compte des accents). */
export function chercher(convs, lignes, q) {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return convs || [];
  const texte = new Map();
  for (const x of lignes || []) {
    const r = x.reponse || {};
    const t = [x.question, r.resume, ...(r.recommandations || []).map((c) => c && c.texte), ...(r.faits || []).map((f) => f && f.texte)].join(" ");
    texte.set(x.conversation_id, (texte.get(x.conversation_id) || "") + " " + sansAccents(t));
  }
  return (convs || []).filter((c) => { const t = sansAccents(c.titre) + " " + (texte.get(c.id) || ""); return mots.every((m) => t.includes(m)); });
}

/** Titre d'une tâche tirée d'un conseil : sa première phrase, 80 caractères au plus. */
export function titreConseil(texte) {
  const t = String(texte || "").trim().replace(/\s+/g, " ");
  const phrase = (t.match(/^.*?[.!?](?=\s|$)/) || [t])[0].replace(/[.!?]$/, "");
  return phrase.length <= 80 ? phrase : phrase.slice(0, 79).replace(/\s+\S*$/, "") + "…";
}

/** Question envoyée à API depuis la fiche d'une ruche : la ruche est rappelée si la question ne la nomme pas. */
export function avecRuche(question, nom) {
  const q = String(question || "").trim();
  if (!nom || sansAccents(q).includes(sansAccents(nom))) return q;
  return `À propos de ${nom} : ${q}`;
}

/** Questions proposées dans la feuille d'API ouverte depuis une ruche. */
export const questionsRuche = (nom) => [`Comment va ${nom} ?`, `Que regarder à la prochaine visite de ${nom} ?`];
