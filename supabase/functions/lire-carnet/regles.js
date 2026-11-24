// Apiviz — lecture d'un carnet de rucher par API (v5.85, maquette « Onboarding irréprochable », écrans 5 et 6) :
// règles pures de la fonction serveur « lire-carnet ». Partagé par la fonction (Deno) et les tests unitaires
// (node --test) : aucune dépendance, aucun accès réseau.
//
// Le modèle reçoit les photos des pages d'un carnet (ou un PDF) et la liste des ruches déjà créées. Il rend un relevé
// par l'outil « carnet » ; normaliser() le contrôle avant l'envoi à l'application : valeurs de visite connues
// seulement, dates valides, doutes signalés avec leurs lectures possibles. Rien n'est écrit en base : l'application
// importe après la validation de l'apiculteur.

export const PAGES_MAX = 6;
export const TAILLE_MAX = 10 * 1024 * 1024;
export const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_RUCHES = 200;
export const MAX_VISITES = 60; // par ruche

/** Valeurs permises (celles de la visite, src/domaines/visites/regles.js). */
export const VALEURS = {
  reine: ["Vue", "Non vue", "Non cherchée"],
  couvain: ["Réduit", "Normal", "Abondant"],
  provisions: ["Faibles", "Moyennes", "Bonnes"],
  activite: ["Faible", "Normale", "Forte"],
};

export const OUTIL_CARNET = {
  name: "carnet",
  description: "Rends le relevé du carnet de rucher. Une seule fois, avec tout ce que tu as lu.",
  input_schema: {
    type: "object",
    properties: {
      lisible: { type: "boolean", description: "Faux si ce n'est pas un carnet, un cahier ou un tableau de suivi de ruches, ou s'il est illisible." },
      raison_illisible: { type: "string", description: "Si lisible est faux : pourquoi, en une phrase courte, tutoiement." },
      ruches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nom: { type: "string", description: "Nom ou numéro de la ruche tel qu'écrit (« Ruche 12 », « R3 », « La bleue »)." },
            rucher: { type: "string", description: "Rucher ou emplacement s'il est écrit, sinon vide." },
            a_verifier: { type: "boolean", description: "Vrai si le nom ou le numéro de la ruche est peu lisible." },
            raison: { type: "string", description: "Si a_verifier : ce qui est incertain, en une phrase courte." },
            propositions: { type: "array", items: { type: "string" }, description: "Si le nom est incertain : les lectures possibles, la plus probable d'abord (« Ruche 12 », « Ruche 17 »)." },
            visites: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", description: "AAAA-MM-JJ. Année absente : l'année la plus récente possible, pas dans le futur." },
                  reine: { type: "string", enum: [...VALEURS.reine, ""], description: "« Vue » si la reine est notée vue, « Non vue » si absente ou pas vue, vide si rien n'est dit." },
                  oeufs_vus: { type: ["boolean", "null"] },
                  couvain: { type: "string", enum: [...VALEURS.couvain, ""] },
                  provisions: { type: "string", enum: [...VALEURS.provisions, ""] },
                  activite: { type: "string", enum: [...VALEURS.activite, ""] },
                  cadres_couvain: { type: ["number", "null"] },
                  poids_kg: { type: ["number", "null"] },
                  note: { type: "string", description: "Le reste de ce qui est écrit pour cette visite, recopié simplement (traitement, hausse posée, nourrissement…)." },
                },
                required: ["date"],
              },
            },
          },
          required: ["nom", "visites"],
        },
      },
    },
    required: ["lisible", "ruches"],
  },
};

export const CONSIGNES = `Tu es API, le compagnon d'Apiviz, une application de suivi pour apiculteurs.
On te donne les pages d'un carnet de rucher (photos ou PDF) et la liste des ruches déjà créées dans l'application.
Tu fais le relevé du carnet en appelant l'outil « carnet », une seule fois. Tu n'écris rien d'autre que cet appel.

Règles :
- Une ruche par colonie suivie dans le carnet, avec toutes ses visites datées. Ne mélange pas deux ruches.
- Ne devine jamais : un nom ou un numéro peu lisible → a_verifier vrai, une raison courte, et les lectures possibles dans propositions.
- Valeurs des visites : seulement celles de l'outil ; rien d'écrit → vide. « R vue », « reine OK » → reine « Vue » ; « œufs » → oeufs_vus vrai.
- Couvain : peu ou 1 à 3 cadres → « Réduit », 4 à 6 → « Normal », 7 et plus → « Abondant » ; garde le nombre dans cadres_couvain.
- Le reste (traitement, nourrissement, hausse, essaimage…) va dans note, en français simple.
- Si le nom d'une ruche du carnet correspond à une ruche déjà créée, reprends exactement le même nom.
- Dates : AAAA-MM-JJ ; jamais dans le futur. Une ligne sans date n'est pas une visite : mets-la dans la note de la visite la plus proche.`;

/** Message de l'utilisateur : la liste des ruches existantes, puis les pages. */
export function messageCarnet(ruches, blocs, jour) {
  const liste = (ruches || []).map((r) => `- ${r.nom}${r.rucher ? ` (${r.rucher})` : ""}`).join("\n") || "(aucune)";
  return [{ type: "text", text: `Aujourd'hui : ${jour}.\nRuches déjà créées :\n${liste}\n\nVoici les pages du carnet.` }, ...blocs];
}

export function controlePieces(pieces) {
  if (!Array.isArray(pieces) || !pieces.length) return "Envoie au moins une photo de ton carnet.";
  if (pieces.length > PAGES_MAX) return `${PAGES_MAX} pages au plus à la fois.`;
  if (pieces.some((p) => p?.type === "application/pdf") && pieces.length > 1) return "Un seul PDF, sans photo à côté.";
  let total = 0;
  for (const p of pieces) {
    if (!p || !TYPES.includes(p.type)) return "Format non pris en charge : photo (JPG, PNG) ou PDF.";
    if (typeof p.donnees !== "string" || !p.donnees) return "Fichier vide.";
    total += Math.floor((p.donnees.length * 3) / 4);
  }
  return total > TAILLE_MAX ? "Trop lourd : 10 Mo au plus en tout." : null;
}

export const blocsPieces = (pieces) => pieces.map((p) => (p.type === "application/pdf"
  ? { type: "document", source: { type: "base64", media_type: p.type, data: p.donnees } }
  : { type: "image", source: { type: "base64", media_type: p.type, data: p.donnees } }));

/** Relevé rendu par le modèle (outil « carnet », ou JSON écrit en texte). null si rien d'exploitable. */
export function extraireReleve(content) {
  const blocs = Array.isArray(content) ? content : [];
  const outil = blocs.find((c) => c?.type === "tool_use" && c.name === "carnet");
  if (outil?.input && typeof outil.input === "object") return outil.input;
  const brut = blocs.filter((c) => c?.type === "text").map((c) => c.text || "").join("\n");
  const debut = brut.indexOf("{"), fin = brut.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  try { const o = JSON.parse(brut.slice(debut, fin + 1)); return o && Array.isArray(o.ruches) ? o : null; } catch { return null; }
}

const texte = (x, max = 80) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const permis = (k, v) => (VALEURS[k].includes(v) ? v : "");
const nombre = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null; };

/** Date AAAA-MM-JJ valide et pas dans le futur (jour = aujourd'hui, AAAA-MM-JJ), sinon "". */
export function dateValide(d, jour) {
  const s = String(d || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const t = new Date(s + "T12:00:00Z");
  if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== s) return "";
  return s > jour ? "" : s;
}

/**
 * Relevé contrôlé : { lisible, raison, ruches: [{ nom, rucher, a_verifier, raison, propositions, visites }] }.
 * Ruches sans nom écartées ; visites sans date valide écartées ; doublons de date d'une ruche fusionnés.
 */
export function normaliser(r, jour) {
  if (!r || r.lisible === false) return { lisible: false, raison: texte(r?.raison_illisible, 200) || "Je n'arrive pas à lire ces pages.", ruches: [] };
  const ruches = [];
  for (const x of (Array.isArray(r.ruches) ? r.ruches : []).slice(0, MAX_RUCHES)) {
    const nom = texte(x?.nom, 60);
    if (!nom) continue;
    const parDate = new Map();
    for (const v of (Array.isArray(x.visites) ? x.visites : [])) {
      const date = dateValide(v?.date, jour);
      if (!date) continue;
      const cadres = nombre(v.cadres_couvain, 0, 30);
      const n = { date, reine: permis("reine", v.reine), oeufs_vus: typeof v.oeufs_vus === "boolean" ? v.oeufs_vus : null,
        couvain: permis("couvain", v.couvain), provisions: permis("provisions", v.provisions), activite: permis("activite", v.activite),
        cadres_couvain: cadres, poids_kg: nombre(v.poids_kg, 0, 200), note: texte(v.note, 400) };
      const a = parDate.get(date);
      if (a) { for (const k of Object.keys(n)) if ((a[k] === "" || a[k] === null) && n[k] !== "" && n[k] !== null) a[k] = n[k]; if (n.note && a.note !== n.note) a.note = texte(`${a.note} ${n.note}`, 400); }
      else parDate.set(date, n);
    }
    const visites = [...parDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_VISITES);
    const propositions = (Array.isArray(x.propositions) ? x.propositions : []).map((p) => texte(p, 60)).filter(Boolean).slice(0, 4);
    ruches.push({ nom, rucher: texte(x.rucher, 80), a_verifier: !!x.a_verifier, raison: x.a_verifier ? texte(x.raison, 200) : "", propositions: x.a_verifier ? propositions : [], visites });
  }
  return { lisible: true, raison: "", ruches };
}
