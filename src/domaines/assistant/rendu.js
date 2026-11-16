// Apiviz — assistant API (IT-24) : rendu d'une réponse en quatre blocs (AP-TECH-338). Fonctions pures, testées par
// tests/unitaires/assistant.test.mjs. Les liens vers les fiches reprennent les actions existantes (ruche, alrucher, go).

const BLOCS = [
  ["faits", "Ce que disent tes données"],
  ["hypotheses", "Ce que je suppose"],
  ["recommandations", "Ce que je te conseille"],
  ["manques", "Ce qui me manque"],
];

/**
 * Action d'une référence : { act, v } ou null (référence affichée sans lien).
 * d : données de l'application (S.d) ; une visite ouvre la fiche de sa colonie.
 */
export function cible(ref, d = {}) {
  const id = ref && ref.id;
  switch (ref && ref.type) {
    case "ruche": return (d.ruches || []).some((r) => r.id === id) ? { act: "ruche", v: id } : null;
    case "rucher": { const r = (d.ruchers || []).find((x) => x.id === id); return r ? { act: "alrucher", v: r.nom } : null; }
    case "visite": { const v = (d.visites || []).find((x) => x.id === id); return v ? { act: "ruche", v: v.ruche_id } : null; }
    case "tache": return { act: "go", v: "agenda" };
    case "lot": case "recolte": return { act: "go", v: "miel" };
    case "vente": case "client": return { act: "go", v: "clients" };
    case "depense": return { act: "go", v: "compta" };
    case "article": return { act: "go", v: "materiel" };
    default: return null;
  }
}

const dateFr = (iso) => {
  const t = Date.parse(`${iso}T12:00:00`);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
};

/** HTML de la réponse. esc : échappement de l'application. */
export function rendreReponse(rep, { esc, d } = {}) {
  const e = esc || ((s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`));
  const lien = (ref) => {
    const c = cible(ref, d);
    return c ? `<button type="button" class="as-ref" data-act="${e(c.act)}" data-v="${e(c.v)}">${e(ref.libelle)}</button>` : `<span class="as-ref sans">${e(ref.libelle)}</span>`;
  };
  const ligne = {
    faits: (f) => `<li>${e(f.texte)}${f.date || (f.refs || []).length ? `<span class="as-src">${f.date ? `<time datetime="${e(f.date)}">${e(dateFr(f.date))}</time>` : ""}${(f.refs || []).map(lien).join("")}</span>` : ""}</li>`,
    hypotheses: (h) => `<li>${e(h)}</li>`,
    recommandations: (r) => `<li class="${r.sanitaire ? "as-sanitaire" : ""}">${e(r.texte)}${r.source ? `<span class="as-src">Source : ${r.source.url && /^https:\/\//.test(r.source.url) ? `<a href="${e(r.source.url)}" target="_blank" rel="noopener">${e(r.source.titre)}</a>` : e(r.source.titre)}${r.source.date ? `, ${e(r.source.date)}` : ""}</span>` : ""}</li>`,
    manques: (m) => `<li>${e(m)}</li>`,
  };
  const blocs = BLOCS.filter(([k]) => (rep[k] || []).length)
    .map(([k, titre]) => `<section class="as-bloc as-${k}"><h3>${titre}</h3><ul>${rep[k].map(ligne[k]).join("")}</ul></section>`).join("");
  return `<p class="as-resume">${e(rep.resume)}</p>${blocs}`;
}

/** Questions proposées tant que la conversation est vide. */
export const SUGGESTIONS = [
  "Quelles colonies dois-je visiter cette semaine ?",
  "Mes colonies ont-elles assez de provisions pour l'hiver ?",
  "Combien de pots de miel me reste-t-il ?",
  "Quelles ventes ne sont pas encore payées ?",
  "Où en sont mes dépenses par rapport au budget ?",
];
