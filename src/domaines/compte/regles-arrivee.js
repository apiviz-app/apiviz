// Apiviz — parcours d'arrivée (v5.84, maquette « apiviz — Onboarding irréprochable » validée par Pierre-Louis le
// 24 nov. 2026). Règles pures, testées par tests/unitaires/arrivee.test.mjs : quand montrer la bienvenue, les offres
// présentées dans « Faisons connaissance », les rubriques proposées selon le profil, les questions de la première
// visite et les étapes de « Mes premiers pas ».

/** Clé de l'appareil : la bienvenue (écrans 1 et 1 bis) a déjà été vue ici. */
export const CLE_BIENVENUE = "apiviz-bienvenue-vue";

/**
 * Vrai si l'écran de bienvenue doit s'ouvrir à la place de la page de connexion : pas de session, pas de lien
 * d'invitation ni de nouveau mot de passe en cours, pas de message de connexion à montrer, et jamais vu sur cet appareil.
 */
export function doitAccueillir({ session, recuperation, invitation, message, dejaVue, modeChoisi } = {}) {
  return !session && !recuperation && !invitation && !message && !dejaVue && !modeChoisi;
}

/**
 * Les trois offres, telles que la migration 029 les crée (table offres) : la diapositive « Ce qui est gratuit, et ce qui
 * va plus loin » les montre avant le compte, quand la base ne se lit pas encore. Un test vérifie qu'elles suivent 029.
 */
export const OFFRES = [
  { id: "decouverte", nom: "Découverte", prix_mois_cts: 0, prix_an_cts: 0, ruches_max: 10, membres_max: 2, gouttes_mois: 30,
    plus: ["Visites au doigt et à la voix, même sans réseau", "Fiche de chaque colonie, météo du rucher, agenda", "Récoltes, stock de miel et ventes"] },
  { id: "rucher", nom: "Rucher", prix_mois_cts: 390, prix_an_cts: 3900, ruches_max: 50, membres_max: 5, gouttes_mois: 200,
    plus: ["API lit tes factures et remplit tes achats", "Étiquettes de pots, commandes en ligne", "Export comptable"] },
  { id: "exploitation", nom: "Exploitation", prix_mois_cts: 1190, prix_an_cts: 11900, ruches_max: null, membres_max: null, gouttes_mois: 600,
    plus: ["Plusieurs exploitations, rôles et journal d’audit", "Registre d’élevage et traçabilité complète", "Réponse sous 48 h au support"] },
];

/** « Gratuit », « 3,90 € / mois », « 11,90 € / mois ». */
export function prixOffre(o) {
  if (!o.prix_mois_cts) return "Gratuit";
  const e = o.prix_mois_cts / 100;
  return `${Number.isInteger(e) ? e : e.toFixed(2).replace(".", ",")} € / mois`;
}

/** « Jusqu'à 10 ruches et 2 personnes », « Ruches et personnes sans limite ». */
export function limitesOffre(o) {
  if (!o.ruches_max && !o.membres_max) return "Ruches et personnes sans limite";
  return `Jusqu’à ${o.ruches_max} ruches et ${o.membres_max} personnes`;
}

// ---------- « Tu en es où ? » : rubriques proposées ----------

/** Rubriques qu'on peut masquer (Réglages › L'exploitation › Rubriques affichées). Tout le reste est toujours là. */
export const RUBRIQUES = [
  { id: "ventes", nom: "Ventes et clients", detail: "Vendre, encaisser, suivre tes clients" },
  { id: "materiel", nom: "Matériel", detail: "Stock de matériel, liste de courses, fournisseurs" },
  { id: "finances", nom: "Finances", detail: "Bilan, dépenses, factures, budget" },
];

/**
 * Rubriques proposées d'après les réponses : un débutant (1 à 10 colonies) commence sans Matériel ni Finances ; qui ne
 * vend pas (encore) commence sans Ventes et clients. Sans réponse : tout est affiché, comme avant.
 */
export function rubriquesProposees({ colonies = "", vend = null } = {}) {
  const r = { ventes: true, materiel: true, finances: true };
  if (colonies === "1-10") { r.materiel = false; r.finances = false; }
  if (vend === false) r.ventes = false;
  return r;
}

/** Rubriques en vigueur dans l'exploitation (réglage « rubriques ») : absent ou incomplet = affiché. */
export function rubriquesActives(reglages) {
  const r = reglages?.rubriques && typeof reglages.rubriques === "object" ? reglages.rubriques : {};
  return Object.fromEntries(RUBRIQUES.map(({ id }) => [id, r[id] !== false]));
}

/** Ce que l'application montrera, pour l'aperçu « Ton apiviz affichera » de l'écran 3. */
export function apercuRubriques(actives) {
  const l = ["Ruchers", "Visites", "Agenda", "Récoltes et stock"];
  if (actives.ventes) l.push("Ventes et clients");
  if (actives.materiel) l.push("Matériel");
  if (actives.finances) l.push("Finances");
  return l;
}

/** Routes rangées sous une rubrique masquable (menu, volet du téléphone, tuiles « Saisir »). */
export const ROUTES_RUBRIQUE = {
  ventes: ["ventes", "vente", "caisse", "commandes", "promotions", "promotion", "newvente"],
  materiel: ["materiel", "courses", "inventaire", "fournisseurs"],
  finances: ["pilotage", "compta", "factures", "achatfacture", "previsions", "associes", "newdepense"],
};

/** Vrai si la route (ou l'action de saisie) appartient à une rubrique masquée. */
export function routeMasquee(route, actives) {
  return Object.entries(ROUTES_RUBRIQUE).some(([id, l]) => actives[id] === false && l.includes(route));
}

/** Nom proposé pour l'exploitation (modifiable dans Réglages) : « Les ruches de Camille », sinon « Mon exploitation ». */
export function nomExploitation(prenom) {
  const p = String(prenom || "").trim();
  return p ? `Les ruches de ${p}` : "Mon exploitation";
}

/** Nombre de ruches borné (1 à 200), comme la création du rucher. */
export const bornerRuches = (n) => Math.min(200, Math.max(1, Math.round(Number(n) || 1)));

// ---------- Première visite guidée (écran 8) ----------

/**
 * Les quatre questions, dans l'ordre, avec le conseil d'API et la valeur envoyée à creer_visite pour chaque choix.
 * Une estimation suffit : rien n'est obligatoire, « Passer » laisse le champ non observé.
 */
export const QUESTIONS_VISITE = [
  { k: "reine", question: "As-tu vu la reine ou des œufs ?",
    conseil: "Pas besoin de chercher longtemps la reine : des œufs frais suffisent à savoir qu’elle est là.",
    choix: [{ t: "Reine vue", d: "", v: { reine: "Vue", oeufs_vus: true } }, { t: "Œufs vus", d: "reine présente", v: { reine: "Non vue", oeufs_vus: true } },
      { t: "Ni l’un ni l’autre", d: "à revoir", v: { reine: "Non vue", oeufs_vus: false } }] },
  { k: "couvain", question: "Combien de cadres de couvain ?",
    conseil: "Compte les cadres avec du couvain, même partiel. Une estimation suffit.",
    choix: [{ t: "1 à 3", d: "faible", v: { couvain: "Réduit", force: 2 } }, { t: "4 à 6", d: "moyen", v: { couvain: "Normal", force: 3 } },
      { t: "7 ou plus", d: "fort", v: { couvain: "Abondant", force: 5 } }] },
  { k: "provisions", question: "Et ses provisions ?",
    conseil: "Soulève la ruche par l’arrière : lourde ou légère ? C’est la « pesée à la main ».",
    choix: [{ t: "Légère", d: "à nourrir", v: { provisions: "Faibles" } }, { t: "Correcte", d: "", v: { provisions: "Moyennes" } },
      { t: "Lourde", d: "", v: { provisions: "Bonnes" } }] },
  { k: "activite", question: "Comment étaient les abeilles ?",
    conseil: "Dernière question ! L’humeur aide à repérer une colonie orpheline ou qui remérit.",
    choix: [{ t: "Calmes", d: "", v: { activite: "Normale" } }, { t: "Nerveuses", d: "", v: { activite: "Forte" } },
      { t: "Peu nombreuses", d: "à surveiller", v: { activite: "Faible", etat: "À surveiller" } }] },
];

/** Champ observé par chaque question (visites.observes). */
const OBSERVES = { reine: ["reine", "oeufs_vus"], couvain: ["couvain", "force"], provisions: ["provisions"], activite: ["activite"] };

/**
 * Charge de creer_visite à partir des réponses : [{ k, i }] (i = index du choix, null = passé). Les champs non touchés
 * gardent les valeurs de départ d'une visite (reine « Non cherchée », etc.) et ne sont pas notés comme observés.
 */
export function chargeVisite({ id, ruche_id, date_visite, reponses, debut, maintenant = Date.now() }) {
  const p = { id, ruche_id, date_visite, activite: "Normale", provisions: "Moyennes", reine: "Non cherchée", couvain: "", etat: "Bonne",
    poids_kg: "", varroa: "", varroa_methode: "", varroa_abeilles: "", note: "", intrants: [], observes: [], force: "", oeufs_vus: null,
    cellules_royales: "", duree_s: debut ? Math.max(0, Math.round((maintenant - debut) / 1000)) : null };
  for (const { k, i } of reponses || []) {
    const q = QUESTIONS_VISITE.find((x) => x.k === k);
    if (!q || i === null || i === undefined || !q.choix[i]) continue;
    Object.assign(p, q.choix[i].v);
    p.observes.push(...OBSERVES[k]);
  }
  p.observes = [...new Set(p.observes)];
  return p;
}

// ---------- « Mes premiers pas » (écran 10) ----------

/** Nombre de jours pendant lesquels la carte reste sur l'accueil après la création de l'exploitation. */
export const JOURS_PREMIERS_PAS = 14;

/**
 * Les cinq étapes, dans l'ordre : [{ id, titre, detail, duree, faite, act }]. etat = { ruches, visites, seuils,
 * invite, recoltes, lots, premiereVisite: { ruche, date } }.
 */
export function premiersPas(e = {}) {
  const pv = e.premiereVisite;
  return [
    { id: "rucher", titre: "Créer mon rucher", detail: e.ruches ? `${e.ruches} ruche${e.ruches > 1 ? "s" : ""}` : "Le nom et l’emplacement", duree: "1 min", faite: e.ruches > 0, act: "newruches" },
    { id: "visite", titre: "Faire ma première visite", detail: pv ? `${pv.ruche}, le ${pv.date}` : "4 questions, en moins de 2 minutes", duree: "2 min", faite: e.visites > 0, act: "arvisite" },
    { id: "varroa", titre: "Régler mon seuil varroa", detail: "Pour des alertes à ta mesure", duree: "30 s", faite: e.seuils > 0, act: "saversseuils" },
    { id: "associe", titre: "Inviter un associé", detail: "Par lien ou code QR", duree: "1 min", faite: !!e.invite, act: "dminviter" },
    { id: "recolte", titre: "Noter ma récolte de l’année", detail: "Pour ton premier bilan de saison", duree: "1 min", faite: e.recoltes > 0 || e.lots > 0, act: "newrecolte" },
  ];
}

/** Vrai si la carte « Mes premiers pas » doit s'afficher : pas masquée, pas finie, moins de 14 jours après le début. */
export function montrerPremiersPas({ etapes, masquee, debut, maintenant = Date.now() }) {
  if (masquee || !etapes?.length || etapes.every((x) => x.faite)) return false;
  if (!debut) return true;
  return maintenant - new Date(debut).getTime() < JOURS_PREMIERS_PAS * 864e5;
}

/** Questions d'exemple proposées sous « Une question ? Demande à API ». */
export const QUESTIONS_AIDE = ["Comment ajouter un rucher ?", "Où noter un traitement ?"];

// ---------- Exploitation d'exemple (écran 7) ----------

/** Les trois bulles de découverte : sélecteur visé (le premier présent), titre, texte. */
export const BULLES_EXEMPLE = [
  { cible: [".ac-api", ".dm-guide", ".wrap .card"], titre: "La priorité du jour", texte: "Chaque matin, API choisit la chose la plus utile à faire, d’après tes visites et tes pesées." },
  { cible: [".ac-ruchers", ".u-ruchers", ".wrap section:nth-of-type(3)"], titre: "Tes ruchers d’un coup d’œil", texte: "Les colonies à voir sont signalées. Touche un rucher pour ouvrir ses ruches." },
  { cible: ['.bottom [data-v="saisir"]', '.side [data-v="saisir"]', ".topbar [data-act=saisir]"], titre: "Le bouton API", texte: "Dicte « visite ruche 4, reine vue, 6 cadres » : API remplit la fiche pour toi." },
];
