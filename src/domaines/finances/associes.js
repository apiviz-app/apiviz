// Apiviz — comptes entre associés (chantier des écrans, étape 7, v5.29). Fonctions pures, testées par
// tests/unitaires/associes.test.mjs. Données (migrations 017 et 020) :
//   achat : achete_par (qui l'a fait), paye_par (l'associé qui a payé de ses fonds propres, ou « Société ») ;
//   vente : vendu_par (qui l'a faite), encaisse_par (l'associé qui a récolté l'argent, ou « Société ») ;
//   règlement (020) : de, a (un associé ou « Société »), montant : argent remis pour solder les comptes.
// Une ligne de l'ancienne version peut porter « Caisse commune » : c'est la société.
// Principe, à parts égales : l'argent qu'un associé avance pour la société, la société le lui doit ; l'argent de la
// société qu'il garde après une vente, il le doit à la société. Entre deux associés, celui à qui la société doit le
// plus reçoit de l'autre la moitié de l'écart, et ils sont à égalité.
import { venteTotal } from "./regles.js";

export const SOCIETE = "Société";
const propre = (x) => String(x ?? "").trim();
/** « Société », « Caisse commune » (ancienne version) : l'argent de la société. */
export const estSociete = (x) => ["societe", "société", "caisse commune", "caisse"].includes(propre(x).toLowerCase());

/**
 * Associés à proposer dans les formulaires : la liste des réglages si elle est remplie, sinon les noms déjà notés sur
 * les achats et les ventes ; « moi » (le prénom de cet appareil) en premier s'il est connu.
 */
export function associesConnus(d, reglages = {}, moi = "") {
  const liste = Array.isArray(reglages.associes) ? reglages.associes.map(propre).filter(Boolean) : [];
  const vus = liste.length ? liste : [
    ...(d.depenses || []).flatMap((x) => [x.achete_par, x.paye_par]),
    ...(d.ventes || []).flatMap((x) => [x.vendu_par, x.encaisse_par]),
  ].map(propre).filter((x) => x && !estSociete(x));
  const m = propre(moi);
  const tous = [...new Set([...(m ? [m] : []), ...vus])];
  return tous.sort((a, b) => (a === m ? -1 : b === m ? 1 : a.localeCompare(b, "fr")));
}

/**
 * Pour chaque associé : achats faits, argent avancé de ses fonds propres, ventes faites, argent de vente récolté,
 * et solde vis-à-vis de la société (positif : la société lui doit ; négatif : il doit à la société).
 */
export function soldesAssocies(d, noms) {
  const memeNom = (a, b) => propre(a).toLowerCase() === propre(b).toLowerCase();
  return noms.map((nom) => {
    const achats = (d.depenses || []).filter((x) => memeNom(x.achete_par, nom));
    const avance = (d.depenses || []).filter((x) => memeNom(x.paye_par, nom)).reduce((t, x) => t + Number(x.montant || 0), 0);
    const ventes = (d.ventes || []).filter((x) => memeNom(x.vendu_par, nom));
    const encaisse = (d.ventes || []).filter((x) => x.paye && memeNom(x.encaisse_par, nom)).reduce((t, x) => t + venteTotal(d, x), 0);
    // Règlements (v5.32, migration 020) : l'argent qu'un associé donne (à l'autre ou à la société) compte comme une
    // avance ; celui qu'il reçoit, comme de l'argent gardé.
    const donne = (d.reglements || []).filter((x) => memeNom(x.de, nom)).reduce((t, x) => t + Number(x.montant || 0), 0);
    const recu = (d.reglements || []).filter((x) => memeNom(x.a, nom)).reduce((t, x) => t + Number(x.montant || 0), 0);
    const r = (x) => Math.round(x * 100) / 100;
    return { nom, achats: achats.length, avance: r(avance), ventes: ventes.length, encaisse: r(encaisse), donne: r(donne), recu: r(recu),
      solde: r(avance - encaisse + donne - recu) };
  });
}

/**
 * Ce qu'il faut pour être à égalité, entre deux associés : { de, a, montant } ou null (à égalité, ou un seul associé).
 * Au-delà de deux, chacun règle avec la société : la carte dit alors seulement qui a avancé le plus.
 */
export function reglementEntreAssocies(soldes) {
  if (soldes.length !== 2) return null;
  const [x, y] = [...soldes].sort((a, b) => b.solde - a.solde);
  const montant = Math.round(((x.solde - y.solde) / 2) * 100) / 100;
  return montant >= 0.01 ? { de: y.nom, a: x.nom, montant } : null;
}

/**
 * Argent de vente qu'un associé garde encore pour la société : quand il a récolté plus qu'il n'a avancé, l'écart est
 * à verser à la trésorerie. [{ nom, montant }], le plus gros d'abord.
 */
export function aVerserALaSociete(soldes) {
  return soldes.filter((s) => s.solde <= -0.01).map((s) => ({ nom: s.nom, montant: Math.round(-s.solde * 100) / 100 }))
    .sort((a, b) => b.montant - a.montant);
}

/**
 * Derniers mouvements entre associés, du plus récent au plus ancien : achats payés de ses fonds propres ou par la
 * société, ventes payées avec qui a récolté l'argent, règlements. Seuls ceux qui disent qui a payé ou encaissé.
 * Chaque mouvement : { date, genre (achat | vente | reglement), titre, detail, montant, signe (-1 sortie, 1 entrée, 0) }.
 */
export function mouvementsAssocies(d, { limite = 12, clients = d.clients || [] } = {}) {
  const nomClient = (id) => clients.find((c) => c.id === id)?.nom || "un client";
  const avec = (x) => (estSociete(x) ? "la trésorerie" : `les fonds propres de ${propre(x)}`);
  const l = [
    ...(d.depenses || []).filter((x) => propre(x.paye_par)).map((x) => ({
      date: x.date_depense || "", genre: "achat", titre: x.libelle || "Achat", montant: Number(x.montant || 0), signe: -1, id: x.id,
      detail: `Achat${propre(x.achete_par) ? ` de ${propre(x.achete_par)}` : ""} · payé avec ${avec(x.paye_par)}`,
    })),
    ...(d.ventes || []).filter((x) => x.paye && propre(x.encaisse_par)).map((x) => ({
      date: x.date_vente || "", genre: "vente", titre: `Vente à ${nomClient(x.client_id)}`, montant: venteTotal(d, x), signe: 1, id: x.id,
      detail: estSociete(x.encaisse_par) ? "Argent sur le compte de la société" : `Argent récolté par ${propre(x.encaisse_par)}`,
    })),
    ...(d.reglements || []).map((x) => ({
      date: x.date_reglement || "", genre: "reglement", titre: estSociete(x.a) ? `Versement de ${propre(x.de)} à la société` : `${propre(x.de)} a remboursé ${propre(x.a)}`,
      montant: Number(x.montant || 0), signe: 0, id: x.id, detail: propre(x.note) || "Règlement entre associés", attente: !!x._attente,
    })),
  ];
  return l.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limite);
}
