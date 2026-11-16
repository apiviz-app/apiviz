// Apiviz — facture lue par API (v5.52) : règles pures de l'écran de validation. Testées par
// tests/unitaires/facture.test.mjs. Le relevé vient de la fonction serveur « lire-facture » (déjà contrôlé par
// normaliser()) ; l'apiculteur le corrige, puis versAchat() le transforme en achat pour enregistrer_achat()
// (migration 018), comme la feuille « Ajouter un achat ».
import * as R from "../materiel/regles.js";

const arrondi = (x) => Math.round(x * 100) / 100;
const num = (v) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
const plat = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** État de validation à partir du relevé d'API. `id` : fabrique d'identifiants (crypto.randomUUID). */
export function etatValidation(facture, d, id, jour) {
  const arts = d.articles || [], fours = d.fournisseurs || [];
  const f = facture.fournisseur || {};
  // Fournisseur : celui reconnu par API, sinon un fournisseur du même nom, sinon à créer.
  const connu = (f.id && fours.find((x) => x.id === f.id)) || (f.nom && fours.find((x) => plat(x.nom) === plat(f.nom))) || null;
  const lignes = (facture.lignes || []).map((l) => {
    const art = l.article_id ? arts.find((a) => a.id === l.article_id) : null;
    // Nouvel article dont le nom existe déjà : rattaché à l'existant (pas de doublon, comme achat.js).
    const memeNom = !art && l.nouvel_article ? arts.find((a) => plat(a.nom) === plat(l.nouvel_article.nom)) : null;
    const cible = l.sans_stock ? "libre" : art || memeNom ? `article:${(art || memeNom).id}` : "nouveau";
    return {
      id: id(), libelle: l.libelle || "", cible, articleNouveau: { id: id(), nom: l.nouvel_article?.nom || l.libelle || "", famille: l.nouvel_article?.famille || "autre", unite: l.nouvel_article?.unite || "unité" },
      quantite: l.quantite ?? "", montant: l.montant ?? "", a_verifier: !!l.a_verifier, raison: l.raison || "", propositions: l.propositions || [], confirme: false,
    };
  });
  return {
    id: id(), date: facture.date || jour, piece: facture.numero || "",
    fournisseur_id: connu ? connu.id : f.nom ? "nouveau" : "",
    fournisseurNouveau: { id: id(), nom: connu ? "" : f.nom || "" },
    totaux: facture.totaux || { ht: null, tva: null, ttc: null },
    lignes,
  };
}

/** Lignes encore à vérifier (signalées par API et pas encore confirmées). */
export const aVerifier = (e) => e.lignes.filter((l) => l.a_verifier && !l.confirme);

/** Somme des montants des lignes. */
export const somme = (e) => arrondi(e.lignes.reduce((t, l) => t + (num(l.montant) || 0), 0));

/** Somme comparée au total de la facture : { somme, ttc, ecart, coherent } (coherent null sans total lu). */
export function controle(e) {
  const s = somme(e), ttc = e.totaux?.ttc ?? null;
  if (ttc === null) return { somme: s, ttc, ecart: null, coherent: null };
  const ecart = arrondi(s - ttc);
  return { somme: s, ttc, ecart, coherent: Math.abs(ecart) <= 0.05 };
}

/** Article visé par une ligne (existant), ou null. */
export const articleDe = (l, d) => (l.cible.startsWith("article:") ? (d.articles || []).find((a) => a.id === l.cible.slice(8)) || null : null);

/** Stock avant et après pour chaque ligne qui entre en stock : [{ id, nom, unite, avant, apres, ajout, nouveau }]. */
export function mouvementsPrevus(e, d) {
  const out = [];
  for (const l of e.lignes) {
    if (l.cible === "libre") continue;
    const q = num(l.quantite) || 0, art = articleDe(l, d);
    const nom = art ? art.nom : l.articleNouveau.nom.trim() || l.libelle;
    const deja = out.find((x) => plat(x.nom) === plat(nom));
    if (deja) { deja.ajout = arrondi(deja.ajout + q); deja.apres = arrondi(deja.avant + deja.ajout); continue; }
    const avant = art ? Number(art.stock) || 0 : 0;
    out.push({ id: l.id, nom, unite: art ? art.unite || "unité" : l.articleNouveau.unite || "unité", avant, apres: arrondi(avant + q), ajout: q, nouveau: !art });
  }
  return out;
}

/** Message d'erreur avant l'intégration, ou null. */
export function controleValidation(e) {
  if (!e.lignes.length) return "Il n'y a plus aucune ligne à intégrer.";
  const n = aVerifier(e).length;
  if (n) return n > 1 ? `Règle d'abord les ${n} lignes à vérifier.` : "Règle d'abord la ligne à vérifier.";
  if (e.fournisseur_id === "nouveau" && !e.fournisseurNouveau.nom.trim()) return "Donne un nom au fournisseur, ou choisis « Aucun ».";
  return null;
}

/** Poste de dépense d'un article : le sien, sinon celui de sa famille (comme achat.js). */
const poste = (art) => art?.poste || R.posteDeFamille(R.famille(art || {}));

/** Achat pour enregistrer_achat() (même forme que la feuille « Ajouter un achat »). */
export function versAchat(e, d, { achete_par = "", paye_par = "" } = {}) {
  return {
    id: e.id, date: e.date, piece: String(e.piece || "").trim(), achete_par, paye_par,
    fournisseur_id: e.fournisseur_id === "nouveau" ? e.fournisseurNouveau.id : e.fournisseur_id || null,
    lignes: e.lignes.map((l) => {
      const base = { id: l.id, montant: num(l.montant) };
      if (l.cible === "libre") {
        const lib = String(l.libelle || "").trim() || "Frais";
        return { ...base, libelle: lib, categorie: /port|livraison|transport|exp[ée]dition/i.test(lib) ? "Frais" : "Autre" };
      }
      const art = articleDe(l, d);
      if (art) return { ...base, article_id: art.id, quantite: num(l.quantite), categorie: poste(art) };
      const nom = l.articleNouveau.nom.trim();
      const k = R.CATALOGUE.find((c) => plat(c.nom) === plat(nom));
      const fam = k?.famille || (l.articleNouveau.famille !== "autre" ? l.articleNouveau.famille : R.famille({ nom }));
      const type = R.typeDeFamille(fam);
      const article = { id: l.articleNouveau.id, nom, type, famille: fam, unite: k?.unite || l.articleNouveau.unite || "unité",
        contenance_g: k?.contenance_g || R.contenance({ nom }), duree_amort: type === "Équipement" ? 5 : null, poste: R.posteDeFamille(fam) };
      return { ...base, article, quantite: num(l.quantite), categorie: article.poste };
    }),
  };
}

/** Phrase « qui a payé » de l'écran final. `societe` : la valeur « Société » d'associes.js. */
export function phrasePaiement(achete_par, paye_par, total, societe, eur) {
  if (!achete_par && !paye_par) return "";
  const qui = achete_par || paye_par;
  if (!paye_par || paye_par === societe) return `Acheté par ${qui}, payé avec le compte de l’exploitation.`;
  return `Payé par ${paye_par} de sa poche : l’exploitation lui doit ${eur(total)}.`;
}
