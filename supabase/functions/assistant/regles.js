// Apiviz — assistant API (IT-24) : règles pures de la réponse en quatre blocs (AP-FEAT-108).
// Partagé par la fonction serveur (Deno) et les tests unitaires (node --test) : aucune dépendance, aucun accès réseau.
//
// Une réponse d'API : un résumé (la réponse directe), puis Faits (datés, avec références vers les fiches),
// Hypothèses, Recommandations (sourcées si sanitaires) et Informations manquantes.

export const TYPES_REF = ["ruche", "rucher", "visite", "tache", "lot", "vente", "client", "depense", "recolte", "article"];

export const SCHEMA_REPONSE = {
  type: "object",
  properties: {
    resume: { type: "string", description: "La réponse directe, en une ou deux phrases, tutoiement." },
    faits: {
      type: "array",
      description: "Ce que disent les données de l'exploitation. Chaque fait est daté quand une date existe et cite ses fiches.",
      items: {
        type: "object",
        properties: {
          texte: { type: "string" },
          date: { type: "string", description: "AAAA-MM-JJ de la saisie qui fonde le fait, si elle existe." },
          refs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: TYPES_REF },
                id: { type: "string", description: "Identifiant exact lu dans les données. Jamais inventé." },
                libelle: { type: "string", description: "Nom affiché, par exemple « Ruche 3 »." },
              },
              required: ["type", "id", "libelle"],
            },
          },
        },
        required: ["texte", "refs"],
      },
    },
    hypotheses: { type: "array", items: { type: "string" }, description: "Ce que tu supposes ou déduis, présenté comme tel." },
    recommandations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texte: { type: "string" },
          sanitaire: { type: "boolean", description: "Vrai si la recommandation touche à la santé des abeilles, une maladie ou un traitement." },
          source: {
            type: "object",
            description: "Obligatoire si sanitaire : organisme officiel (ANSES, ITSAP-Institut de l'abeille, GDSA, FNOSAD, ministère de l'Agriculture) ou vétérinaire.",
            properties: { titre: { type: "string" }, url: { type: "string" }, date: { type: "string" } },
            required: ["titre"],
          },
        },
        required: ["texte", "sanitaire"],
      },
    },
    manques: { type: "array", items: { type: "string" }, description: "Ce qui manque dans les saisies pour mieux répondre." },
  },
  required: ["resume", "faits", "hypotheses", "recommandations", "manques"],
};

const estTexte = (x) => typeof x === "string" && x.trim().length > 0;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Contrôle le format. Renvoie la liste des erreurs, en français ; vide si la réponse est bien formée. */
export function erreursFormat(r) {
  const e = [];
  if (!r || typeof r !== "object") return ["La réponse n'est pas un objet."];
  if (!estTexte(r.resume)) e.push("« resume » est vide.");
  for (const c of ["faits", "hypotheses", "recommandations", "manques"]) if (!Array.isArray(r[c])) e.push(`« ${c} » doit être une liste.`);
  (Array.isArray(r.faits) ? r.faits : []).forEach((f, i) => {
    if (!f || !estTexte(f.texte)) e.push(`Fait ${i + 1} : texte vide.`);
    if (f && f.date != null && f.date !== "" && !DATE.test(f.date)) e.push(`Fait ${i + 1} : date « ${f.date} » au mauvais format (AAAA-MM-JJ).`);
    if (!f || !Array.isArray(f.refs)) e.push(`Fait ${i + 1} : « refs » doit être une liste (vide si aucune fiche).`);
    else f.refs.forEach((x, j) => {
      if (!x || !TYPES_REF.includes(x.type) || !estTexte(x.id) || !estTexte(x.libelle)) e.push(`Fait ${i + 1}, référence ${j + 1} : type, id et libellé obligatoires.`);
    });
  });
  (Array.isArray(r.hypotheses) ? r.hypotheses : []).forEach((h, i) => { if (!estTexte(h)) e.push(`Hypothèse ${i + 1} vide.`); });
  (Array.isArray(r.manques) ? r.manques : []).forEach((h, i) => { if (!estTexte(h)) e.push(`Manque ${i + 1} vide.`); });
  (Array.isArray(r.recommandations) ? r.recommandations : []).forEach((x, i) => {
    if (!x || !estTexte(x.texte)) e.push(`Recommandation ${i + 1} : texte vide.`);
    if (x && typeof x.sanitaire !== "boolean") e.push(`Recommandation ${i + 1} : « sanitaire » doit valoir true ou false.`);
  });
  return e;
}

// Sanitaire (AP-TECH-339) : mots qui font d'une recommandation un sujet de santé, même si le modèle ne l'a pas dit.
const SANITAIRE = /\b(traite(r|ment|ments)?|varroa|varroas|acaricide|oxalique|formique|amitraze|apivar|apiguard|apilife|apistan|thymol|maladie|loque|nos[eé]mose|mycose|couvain plâtré|virus|frelon|aethina|trop[ié]laelaps|m[ée]dicament|ordonnance|d[ée]sinfect)/i;
// Posologie : une quantité chiffrée avec une unité de dose ou un « par ruche ».
const POSOLOGIE = /\d+([.,]\d+)?\s*(ml|mg|cl|g|gr|grammes?|kg|litres?|l|bandelettes?|lani[eè]res?|%|gouttes?)\b|\d+([.,]\d+)?\s*(\S+\s+){0,2}par (ruche|colonie|cadre|ruchette)/i;
const OFFICIELLE = /anses|itsap|institut de l.abeille|gdsa|fnosad|agriculture\.gouv|minist[eè]re de l.agriculture|dgal|draaf|v[ée]t[ée]rinaire|\bompv?\b|ordre des v[ée]t[ée]rinaires/i;

export const RENVOI_SANITAIRE = "Pour tout traitement ou doute sanitaire, demande l'avis de ton vétérinaire ou de ton GDSA, qui tiennent compte de ta situation et de la réglementation en vigueur.";

export const estSanitaire = (texte) => SANITAIRE.test(texte || "");
export const contientPosologie = (texte) => POSOLOGIE.test(texte || "");
export const sourceOfficielle = (s) => !!(s && estTexte(s.titre) && OFFICIELLE.test(`${s.titre} ${s.url || ""}`));

/**
 * Rend la réponse sûre avant de l'envoyer :
 * - une référence dont l'identifiant n'a pas été lu dans les données est retirée (pas de lien inventé) ;
 * - une recommandation sanitaire sans source officielle, ou chiffrant une dose, est retirée et remplacée par le renvoi
 *   vers le vétérinaire ou le GDSA (aucune posologie, même sourcée : elle dépend de l'ordonnance et de l'AMM du produit).
 * Renvoie { reponse, retraits } ; « retraits » sert au journal et aux tests.
 */
export function nettoyer(r, idsConnus) {
  const connus = idsConnus instanceof Set ? idsConnus : new Set(idsConnus || []);
  const retraits = { refs: 0, sanitaires: 0 };
  const faits = (r.faits || []).map((f) => {
    const refs = (f.refs || []).filter((x) => {
      const ok = connus.has(String(x.id));
      if (!ok) retraits.refs++;
      return ok;
    });
    const fait = { texte: f.texte.trim(), refs };
    if (f.date && DATE.test(f.date)) fait.date = f.date;
    return fait;
  });
  let renvoi = false;
  const recommandations = [];
  for (const x of r.recommandations || []) {
    const sanitaire = x.sanitaire === true || estSanitaire(x.texte);
    if (sanitaire && (contientPosologie(x.texte) || !sourceOfficielle(x.source))) { retraits.sanitaires++; renvoi = true; continue; }
    const reco = { texte: x.texte.trim(), sanitaire };
    if (x.source && estTexte(x.source.titre)) reco.source = { titre: x.source.titre.trim(), ...(x.source.url ? { url: x.source.url } : {}), ...(x.source.date ? { date: x.source.date } : {}) };
    recommandations.push(reco);
  }
  if (renvoi && !recommandations.some((x) => x.texte === RENVOI_SANITAIRE)) recommandations.push({ texte: RENVOI_SANITAIRE, sanitaire: true });
  return {
    reponse: {
      resume: r.resume.trim(),
      faits,
      hypotheses: (r.hypotheses || []).map((h) => h.trim()).filter(Boolean),
      recommandations,
      manques: (r.manques || []).map((h) => h.trim()).filter(Boolean),
    },
    retraits,
  };
}

/** Réponse fixe quand l'exploitation demandée n'est pas la sienne (AP-US-118, 2e critère) : le modèle n'est pas appelé. */
export const reponseSansAcces = () => ({
  resume: "Je n'ai pas accès à ces données : tu n'es pas membre de cette exploitation.",
  faits: [],
  hypotheses: [],
  recommandations: [{ texte: "Choisis une de tes exploitations dans Réglages, ou demande une invitation à son responsable.", sanitaire: false }],
  manques: ["Une exploitation dont tu es membre."],
});

/** Date du jour à Paris (AAAA-MM-JJ), pour que « cette semaine » veuille dire la même chose pour API et pour toi. */
export function aujourdhui(d = new Date()) {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Nettoie l'historique envoyé par l'application : au plus 4 échanges, textes courts. */
export function historiqueSur(h) {
  if (!Array.isArray(h)) return [];
  return h.filter((x) => x && estTexte(x.question) && estTexte(x.resume)).slice(-4)
    .map((x) => ({ question: x.question.slice(0, 500), resume: x.resume.slice(0, 600) }));
}
