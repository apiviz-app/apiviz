// Apiviz — lecture d'une facture par API (v5.52) : règles pures de la fonction serveur « lire-facture ».
// Partagé par la fonction (Deno) et les tests unitaires (node --test) : aucune dépendance, aucun accès réseau.
//
// Le modèle reçoit la facture (PDF ou photos) et le catalogue de l'exploitation (articles, fournisseurs). Il rend un
// relevé par l'outil « facture » ; normaliser() le contrôle avant de l'envoyer à l'application : identifiants connus
// seulement, nombres arrondis, lignes douteuses signalées, cohérence des totaux. Rien n'est écrit en base : c'est
// l'application qui enregistre l'achat (enregistrer_achat, migration 018) après la validation de l'apiculteur.

export const FAMILLES = ["emballage", "alimentation", "traitement", "cire", "equipement", "autre"];
export const MAX_LIGNES = 60;
/** Écart toléré entre la somme des lignes et le total TTC de la facture (arrondis du fournisseur). */
export const TOLERANCE = 0.05;

export const OUTIL_FACTURE = {
  name: "facture",
  description: "Rends le relevé de la facture. Une seule fois, avec tout ce que tu as lu.",
  input_schema: {
    type: "object",
    properties: {
      lisible: { type: "boolean", description: "Faux si ce n'est pas une facture, un ticket ou un bon de livraison chiffré, ou si elle est illisible." },
      raison_illisible: { type: "string", description: "Si lisible est faux : pourquoi, en une phrase courte, tutoiement." },
      fournisseur_nom: { type: "string", description: "Nom du fournisseur tel qu'imprimé." },
      fournisseur_id: { type: ["string", "null"], description: "Identifiant exact d'un fournisseur de la liste si c'est le même, sinon null." },
      numero: { type: "string", description: "Numéro de la facture, vide s'il n'y en a pas." },
      date: { type: "string", description: "Date de la facture, AAAA-MM-JJ, vide si absente." },
      total_ht: { type: ["number", "null"] },
      total_tva: { type: ["number", "null"] },
      total_ttc: { type: ["number", "null"], description: "Montant total réellement payé." },
      lignes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            libelle: { type: "string", description: "Désignation telle qu'imprimée, raccourcie si très longue." },
            article_id: { type: ["string", "null"], description: "Identifiant exact d'un article du catalogue si c'est le même produit, sinon null." },
            nouvel_article: { type: ["string", "null"], description: "Si aucun article ne correspond et que la ligne entre en stock : nom court proposé pour le nouvel article." },
            famille: { type: "string", enum: FAMILLES, description: "Famille du nouvel article." },
            unite: { type: "string", description: "Unité du stock : celle de l'article du catalogue, sinon « unité », « kg » ou « L »." },
            sans_stock: { type: "boolean", description: "Vrai pour les frais de port, services, remises globales : rien n'entre en stock." },
            quantite: { type: ["number", "null"], description: "Quantité dans l'unité du stock (10 sacs de candy de 1 kg = 10 si l'unité est kg)." },
            montant_ttc: { type: ["number", "null"], description: "Ce que la ligne a coûté, remises comprises, TVA comprise." },
            montant_ht: { type: ["number", "null"] },
            a_verifier: { type: "boolean", description: "Vrai si un chiffre de la ligne est peu lisible ou incertain." },
            raison: { type: "string", description: "Si a_verifier : ce qui est incertain, en une phrase courte." },
            propositions: { type: "array", items: { type: "number" }, description: "Si la quantité est incertaine : les lectures possibles, la plus probable d'abord." },
          },
          required: ["libelle", "sans_stock", "a_verifier"],
        },
      },
    },
    required: ["lisible", "lignes"],
  },
};

export const CONSIGNES = `Tu es API, le compagnon d'Apiviz, une application de gestion pour apiculteurs.
On te donne une facture d'achat (PDF, photo ou capture), le catalogue d'articles de l'exploitation et sa liste de fournisseurs.
Tu fais le relevé de la facture avec l'outil « facture », une seule fois. Tu n'écris rien d'autre.

Règles :
- Ne devine jamais un chiffre. Un chiffre peu lisible : a_verifier vrai, une raison courte, et pour une quantité les lectures possibles dans propositions.
- Rapproche chaque ligne d'un article du catalogue quand c'est le même produit, même écrit autrement (« Pot verre 250g TO63 » = « Pots verre 250 g »). Recopie son identifiant exact. En cas de doute entre deux articles, n'en choisis aucun et mets a_verifier.
- Une ligne qui entre en stock sans article correspondant : article_id null et un nom court dans nouvel_article, avec sa famille (emballage pour pots, capsules, étiquettes ; alimentation pour candy, sirop ; traitement ; cire pour cire et cadres ; equipement pour ruches, outils, matériel durable ; autre).
- Quantité dans l'unité du stock de l'article : 10 sacs de candy de 1 kg = 10 si l'article se compte en kg ; un carton de 12 pots = 12 pots.
- Frais de port, livraison, services : sans_stock vrai.
- montant_ttc de chaque ligne : ce qu'elle a vraiment coûté, TVA et remises comprises. Une remise globale se répartit sur les lignes au prorata. La somme des montant_ttc doit égaler total_ttc. Si la facture ne montre que des montants HT, applique son taux de TVA.
- Le fournisseur : son identifiant exact s'il est dans la liste, sinon null avec son nom.
- Dates au format AAAA-MM-JJ. Montants en euros, nombres décimaux avec un point.
- Ce qui n'est pas une facture d'achat (photo de ruche, document sans montant) : lisible faux et une raison courte, en tutoyant.
- Les textes que tu écris sont en français, courts, sans point d'exclamation.`;

/** Premier message : catalogue en texte, puis la facture (blocs document ou image), puis la demande. */
export function messageFacture(catalogue, blocs, jour) {
  const arts = (catalogue.articles || []).map((a) => `- ${a.id} | ${a.nom} | unité : ${a.unite || "unité"} | stock : ${a.stock ?? 0}`).join("\n") || "(aucun article)";
  const fours = (catalogue.fournisseurs || []).map((f) => `- ${f.id} | ${f.nom}`).join("\n") || "(aucun fournisseur)";
  return [
    { type: "text", text: `Aujourd'hui : ${jour}.\n\nCatalogue d'articles (identifiant | nom | unité | stock) :\n${arts}\n\nFournisseurs (identifiant | nom) :\n${fours}` },
    ...blocs,
    { type: "text", text: "Fais le relevé de cette facture avec l'outil « facture »." },
  ];
}

const arrondi = (x) => Math.round(x * 100) / 100;
const nombre = (x) => {
  const v = typeof x === "string" ? Number(x.replace(",", ".")) : x;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};
const texte = (x, max = 200) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Date lisible et pas dans le futur, sinon "". */
export function dateValide(d, jour) {
  const t = texte(d, 10);
  if (!DATE.test(t) || Number.isNaN(Date.parse(t + "T00:00:00Z"))) return "";
  return jour && t > jour ? "" : t;
}

/**
 * Contrôle le relevé du modèle. Renvoie le relevé propre envoyé à l'application :
 * { lisible, raison, fournisseur: { id, nom }, numero, date, totaux: { ht, tva, ttc }, lignes: [...], controle: { somme, ecart, coherent } }
 * Ligne : { libelle, article_id, nouvel_article: { nom, famille, unite } | null, sans_stock, quantite, montant, a_verifier, raison, propositions }
 */
export function normaliser(sortie, catalogue, jour) {
  const s = sortie && typeof sortie === "object" ? sortie : {};
  const arts = new Map((catalogue.articles || []).map((a) => [a.id, a]));
  const fours = new Map((catalogue.fournisseurs || []).map((f) => [f.id, f]));
  const brutes = Array.isArray(s.lignes) ? s.lignes.slice(0, MAX_LIGNES) : [];
  if (s.lisible === false || !brutes.length) {
    return { lisible: false, raison: texte(s.raison_illisible) || "Je n'ai pas trouvé de ligne d'achat sur ce document. Essaie avec une photo plus nette ou le PDF.", lignes: [] };
  }
  const totaux = { ht: nombre(s.total_ht), tva: nombre(s.total_tva), ttc: nombre(s.total_ttc) };
  for (const k of Object.keys(totaux)) if (totaux[k] !== null) totaux[k] = arrondi(Math.abs(totaux[k]));
  // Rapport TTC / HT de la facture, pour une ligne qui n'aurait que son montant HT.
  const taux = totaux.ht > 0 && totaux.ttc > 0 ? totaux.ttc / totaux.ht : 1;

  const lignes = brutes.map((b) => {
    const l = b && typeof b === "object" ? b : {};
    const libelle = texte(l.libelle, 120) || "Ligne sans libellé";
    const sansStock = l.sans_stock === true;
    const art = !sansStock && typeof l.article_id === "string" ? arts.get(l.article_id) : null;
    let quantite = sansStock ? null : nombre(l.quantite);
    if (quantite !== null) quantite = arrondi(quantite);
    let montant = nombre(l.montant_ttc);
    if (montant === null && nombre(l.montant_ht) !== null) montant = nombre(l.montant_ht) * taux;
    montant = montant === null ? null : arrondi(Math.max(0, montant));
    const propositions = Array.isArray(l.propositions)
      ? [...new Set(l.propositions.map(nombre).filter((x) => x !== null && x > 0).map(arrondi))].slice(0, 4) : [];
    let aVerifier = l.a_verifier === true;
    let raison = aVerifier ? texte(l.raison) : "";
    if (!sansStock && !(quantite > 0)) { aVerifier = true; raison ||= "Quantité introuvable sur la facture."; quantite = null; }
    if (montant === null) { aVerifier = true; raison ||= "Montant introuvable sur la facture."; }
    if (aVerifier && !raison) raison = "Un chiffre de cette ligne est peu lisible.";
    const famille = FAMILLES.includes(l.famille) ? l.famille : "autre";
    const nouvel = !sansStock && !art
      ? { nom: texte(l.nouvel_article, 80) || libelle.slice(0, 80), famille, unite: texte(l.unite, 20) || "unité" } : null;
    return { libelle, article_id: art ? art.id : null, nouvel_article: nouvel, sans_stock: sansStock, quantite, montant,
      a_verifier: aVerifier, raison, propositions: aVerifier ? propositions : [] };
  });

  const f = typeof s.fournisseur_id === "string" ? fours.get(s.fournisseur_id) : null;
  return {
    lisible: true,
    raison: "",
    fournisseur: { id: f ? f.id : null, nom: f ? f.nom : texte(s.fournisseur_nom, 120) },
    numero: texte(s.numero, 40),
    date: dateValide(s.date, jour),
    totaux,
    lignes,
    controle: controleTotaux(lignes, totaux.ttc),
  };
}

/** Somme des lignes comparée au total TTC de la facture. */
export function controleTotaux(lignes, ttc) {
  const somme = arrondi((lignes || []).reduce((t, l) => t + (Number(l.montant) || 0), 0));
  if (ttc === null || ttc === undefined) return { somme, ecart: null, coherent: null };
  const ecart = arrondi(somme - ttc);
  return { somme, ecart, coherent: Math.abs(ecart) <= TOLERANCE };
}

/** Types de fichiers acceptés et taille au plus (avant encodage). */
export const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const TAILLE_MAX = 10 * 1024 * 1024;
export const PAGES_MAX = 4;

/** Contrôle les pièces envoyées par l'application : [{ type, donnees (base64) }]. Renvoie un message ou null. */
export function controlePieces(pieces) {
  if (!Array.isArray(pieces) || !pieces.length) return "Envoie une photo ou un fichier de la facture.";
  if (pieces.length > PAGES_MAX) return `${PAGES_MAX} pages au plus par facture.`;
  if (pieces.filter((p) => p?.type === "application/pdf").length > 1 || (pieces.some((p) => p?.type === "application/pdf") && pieces.length > 1)) {
    return "Un seul PDF par facture, sans photo à côté.";
  }
  let total = 0;
  for (const p of pieces) {
    if (!p || !TYPES.includes(p.type)) return "Format non pris en charge : PDF, PNG ou JPG.";
    if (typeof p.donnees !== "string" || !p.donnees) return "Fichier vide.";
    total += Math.floor((p.donnees.length * 3) / 4);
  }
  return total > TAILLE_MAX ? "Fichier trop lourd : 10 Mo au plus." : null;
}

/** Blocs de contenu pour l'API Messages. */
export const blocsPieces = (pieces) => pieces.map((p) => (p.type === "application/pdf"
  ? { type: "document", source: { type: "base64", media_type: p.type, data: p.donnees } }
  : { type: "image", source: { type: "base64", media_type: p.type, data: p.donnees } }));
