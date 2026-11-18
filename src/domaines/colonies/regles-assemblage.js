// Apiviz — règles de l'assemblage des ruches physiques (migration 028, demande du 17 nov. 2026). Fonctions pures,
// testées par tests/unitaires/assemblage-ruches.test.mjs. `d` a la forme de S.d : { articles, compositions, contenants }.

const plat = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const arrondi = (x) => Math.round(Number(x) * 100) / 100;

/** Composition enregistrée d'un type (casse et accents ignorés) : [{ article_id, quantite }] pour UNE ruche. */
export function composition(d, type) {
  const t = plat(type);
  if (!t) return [];
  const articles = new Set((d.articles || []).map((a) => a.id));
  return (d.compositions || []).filter((c) => plat(c.type) === t && articles.has(c.article_id))
    .map((c) => ({ article_id: c.article_id, quantite: Number(c.quantite) }));
}

/** Types qui ont une composition, dans l'ordre alphabétique, sans doublon de casse. */
export function typesComposes(d) {
  const vus = new Map();
  for (const c of d.compositions || []) if (!vus.has(plat(c.type))) vus.set(plat(c.type), String(c.type).trim());
  return [...vus.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Bilan d'un assemblage : pour chaque pièce, le total à sortir (quantité × nombre de ruches), le stock avant et après,
 * ce qui manque. Les lignes à zéro sont ignorées. { lignes, manques, total }
 */
export function bilan(d, pieces, nombre) {
  const n = Math.max(0, Math.floor(Number(nombre) || 0));
  const parId = new Map((d.articles || []).map((a) => [a.id, a]));
  const lignes = [];
  for (const p of pieces || []) {
    const article = parId.get(p.article_id), q = arrondi(p.quantite);
    if (!article || !(q > 0)) continue;
    const total = arrondi(q * n), avant = Number(article.stock || 0), apres = arrondi(avant - total);
    lignes.push({ article, parRuche: q, total, avant, apres, manque: arrondi(Math.max(0, total - Math.max(0, avant))) });
  }
  return { lignes, manques: lignes.filter((l) => l.manque > 0), total: lignes.reduce((s, l) => s + l.total, 0) };
}

/** Phrase d'alerte : « Il manque 8 Cire gaufrée corps. » ou « Il manque des pièces : … ». */
export function phraseManque(b) {
  if (!b.manques.length) return "";
  if (b.manques.length === 1) return `Il manque ${fmt(b.manques[0].manque)} ${b.manques[0].article.nom}.`;
  return `Il manque des pièces : ${b.manques.map((l) => `${fmt(l.manque)} ${l.article.nom}`).join(", ")}.`;
}

/** Résumé du bouton : « 2 Plancher, 20 Cadres… ». */
export const resume = (b) => b.lignes.map((l) => `${fmt(l.total)} ${l.article.nom}`).join(", ");

/** Applique un assemblage aux données du téléphone (saisie gardée hors ligne), comme assembler_ruches(). */
export function appliquer(d, p, extra = {}) {
  d.contenants = d.contenants || [];
  if (d.contenants.some((c) => c.id === p.ruches[0]?.id)) return d;
  for (const r of p.ruches) {
    d.contenants.push({ id: r.id, code: r.code, type: p.type || "", etat: p.etat || "bon", achat_le: p.achat_le || null,
      article_id: p.article_id || null, notes: p.notes || "", ...extra });
  }
  const n = p.ruches.length, parId = new Map((d.articles || []).map((a) => [a.id, a]));
  d.mouvements = d.mouvements || [];
  for (const x of p.pieces || []) {
    const a = parId.get(x.article_id), q = Number(x.quantite);
    if (!a || !(q > 0)) continue;
    a.stock = arrondi(Number(a.stock || 0) - q * n);
    d.mouvements.push({ id: `${p.ruches[0].id}-${a.id}`, article_id: a.id, type: "consommation", origine: "assemblage",
      quantite: -arrondi(q * n), date_mouvement: p.date, ...extra });
  }
  return d;
}

const fmt = (v) => Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
