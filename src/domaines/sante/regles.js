// Apiviz — règles sanitaires (IT-03, AP-FEAT-013 ; IT-12 : AP-FEAT-051, 052, 057, 058). Fonctions pures, sans DOM.
//
// IT-12 (v5.76, migration 036) :
//   - un comptage varroa est une « opération » sur une ou plusieurs colonies (tables operations, operation_colonies) ;
//     les comptages notés dans les visites sont repris tels quels (origine « visite ») ;
//   - AUCUN seuil par défaut. Un seuil vient de la table seuils_varroa (méthode, période, valeur, source, date de
//     consultation, tous obligatoires) ou du réglage « varroaSeuil » que l'apiculteur avait saisi lui-même avant IT-12
//     (affiché « saisi par toi, source non notée »). Sans seuil : le résultat s'affiche sans couleur d'alerte ;
//   - signes sanitaires notés sans conclusion automatique ; quelques signes invitent à demander un avis ;
//   - la liste des dangers réglementés et la démarche officielle ne s'affichent qu'après relecture humaine (relu: true).

export const METHODES = ["Sucre glace", "Lavage", "Lange", "Autre"];
/** Méthodes qui donnent un taux pour 100 abeilles ; « Lange » donne une chute (varroas par jour). */
export const estChute = (methode) => methode === "Lange";
export const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/**
 * Taux d'infestation d'un comptage : varroas pour 100 abeilles.
 * null si le comptage est incomplet (pas d'abeilles comptées) ou fait par la méthode Lange (chute, pas de taux).
 */
export const tauxVarroa = (v) =>
  v && v.varroa != null && v.varroa_abeilles > 0 && v.varroa_methode !== "Lange" ? (v.varroa / v.varroa_abeilles) * 100 : null;

/** Chute naturelle ramenée à un jour (AP-US-058 : 21 varroas sur 7 jours = 3 par jour) ; null sans durée. */
export const chuteParJour = (v) =>
  v && v.varroa != null && estChute(v.varroa_methode) && Number(v.duree_jours) > 0 ? Number(v.varroa) / Number(v.duree_jours) : null;

const nb = (x, d = 1) => String(Math.round(x * 10 ** d) / 10 ** d).replace(".", ",");

/** Résultat d'un comptage, comparable à un seuil : { valeur, unite: "pourcent" | "par_jour" | null, texte }. */
export function resultat(v) {
  if (!v || v.varroa == null) return { valeur: null, unite: null, texte: "—" };
  const t = tauxVarroa(v);
  if (t !== null) return { valeur: t, unite: "pourcent", texte: nb(t) + " %" };
  const c = chuteParJour(v);
  if (c !== null) return { valeur: c, unite: "par_jour", texte: nb(c) + " / jour" };
  const n = Number(v.varroa);
  return { valeur: null, unite: null, texte: n + " varroa" + (n > 1 ? "s" : "") };
}

// ---------- Comptages : opérations + reprise des visites ----------

/**
 * Tous les comptages, le plus récent d'abord, au format d'une visite (ruche_id, date_visite, varroa, varroa_abeilles,
 * varroa_methode) pour que les anciens écrans les lisent sans changement, plus duree_jours, origine et operation_id.
 * Lignes de operation_colonies (migration 036), puis les visites avec un comptage qu'aucune opération ne reprend
 * encore (base sans 036, visite gardée sur le téléphone) : un comptage n'apparaît jamais deux fois.
 */
export function comptages(d) {
  const ops = new Map((d?.operations || []).map((o) => [o.id, o]));
  const repris = new Set((d?.operations || []).map((o) => o.visite_id).filter(Boolean));
  const l = [];
  for (const c of d?.comptesVarroa || []) {
    const o = ops.get(c.operation_id);
    if (!o || c.varroa == null) continue;
    l.push({ id: c.id, ruche_id: c.ruche_id, date_visite: o.date_operation, varroa: Number(c.varroa),
      varroa_abeilles: c.abeilles ?? o.echantillon_abeilles ?? null, varroa_methode: o.methode || "", duree_jours: o.duree_jours ?? null,
      origine: o.origine || "operation", operation_id: o.id, visite_id: o.visite_id || null, _attente: !!(o._attente || c._attente) });
  }
  for (const v of d?.visites || []) {
    if (v.varroa == null || repris.has(v.id)) continue;
    l.push({ id: v.id, ruche_id: v.ruche_id, date_visite: v.date_visite, varroa: Number(v.varroa), varroa_abeilles: v.varroa_abeilles ?? null,
      varroa_methode: v.varroa_methode || "", duree_jours: null, origine: "visite", operation_id: null, visite_id: v.id, _attente: !!v._attente });
  }
  return l.sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)));
}
/** Comptages d'une colonie, le plus récent d'abord. */
export const comptagesDe = (d, rucheId, liste) => (liste || comptages(d)).filter((c) => c.ruche_id === rucheId);
/** Dernier comptage d'une colonie, ou undefined. */
export const dernierComptage = (d, rucheId, liste) => comptagesDe(d, rucheId, liste)[0];

// ---------- Seuils sourcés (AP-FEAT-052) ----------

/** Le mois m (1 à 12) est-il dans la période [debut, fin] ? La période peut passer la fin de l'année (nov. → févr.). */
export const dansPeriode = (m, debut, fin) => (debut <= fin ? m >= debut && m <= fin : m >= debut || m <= fin);
export const periodeTexte = (s) => (!s || (s.mois_debut === 1 && s.mois_fin === 12) ? "toute l'année" : `${MOIS[s.mois_debut - 1]} → ${MOIS[s.mois_fin - 1]}`);
const dateFr = (iso) => (iso ? new Date(String(iso).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");
/** « Source : … · consultée le 2 sept. 2026 », ou la mention du réglage d'avant IT-12. */
export const sourceTexte = (s) =>
  !s ? "" : s.origine === "reglage" ? "Saisi par toi avant cette version · source non notée" : `Source : ${s.source}${s.consulte_le ? ` · consultée le ${dateFr(s.consulte_le)}` : ""}`;
export const uniteTexte = (u) => (u === "par_jour" ? "varroas par jour" : "% d'abeilles porteuses");
export const valeurTexte = (s) => (!s ? "" : s.unite === "par_jour" ? nb(Number(s.valeur)) + " / jour" : nb(Number(s.valeur)) + " %");

/**
 * Seuil qui s'applique à un comptage (sa méthode, son mois), ou null.
 * ctx = { seuils: lignes de seuils_varroa, reglages: réglages de l'exploitation }.
 * Plusieurs seuils pour la même méthode et le même mois : le plus récemment vérifié. Le réglage d'avant IT-12
 * (varroaSeuil, saisi par l'apiculteur) ne vaut que pour un taux et seulement si aucun seuil de la table ne s'applique.
 */
export function seuilApplicable(v, { seuils = [], reglages = {} } = {}) {
  if (!v) return null;
  const methode = v.varroa_methode || "";
  const chute = estChute(methode);
  const m = Number(String(v.date_visite || "").slice(5, 7)) || new Date().getMonth() + 1;
  const ok = (seuils || []).filter((s) => !s.archive && s.methode === methode && Number(s.valeur) > 0 && String(s.source || "").trim() && s.consulte_le
    && dansPeriode(m, Number(s.mois_debut), Number(s.mois_fin)))
    .sort((a, b) => String(b.consulte_le).localeCompare(String(a.consulte_le)));
  if (ok.length) return { ...ok[0], valeur: Number(ok[0].valeur), unite: chute ? "par_jour" : "pourcent" };
  const ancien = Number(reglages?.varroaSeuil);
  if (!chute && ancien > 0) return { id: null, methode: null, valeur: ancien, unite: "pourcent", origine: "reglage", source: "", consulte_le: null, mois_debut: 1, mois_fin: 12 };
  return null;
}

/**
 * Seuil du réglage d'avant IT-12 seul (varroaSeuil saisi par l'apiculteur), ou null : plus de 3 % par défaut.
 * Gardé pour les anciens appels qui ne connaissent pas la méthode du comptage.
 */
export const seuilVarroa = (reglages) => (Number(reglages?.varroaSeuil) > 0 ? Number(reglages.varroaSeuil) : null);

/** `seuil` peut être un nombre, null ou une fonction (comptage) → nombre | null. */
export const seuilDe = (seuil, v) => {
  const s = typeof seuil === "function" ? seuil(v) : seuil;
  return s != null && Number(s) > 0 ? Number(s) : null;
};
/** Au-dessus du seuil ? Faux sans seuil ou sans valeur (jamais d'alerte sans seuil choisi). */
export const auDessus = (valeur, seuil) => valeur != null && seuil != null && Number(seuil) > 0 && valeur >= seuil;
/** Proche du seuil (aux deux tiers, repère d'affichage de l'app depuis la v2, pas un seuil sanitaire). */
export const proche = (valeur, seuil) => valeur != null && seuil != null && Number(seuil) > 0 && valeur < seuil && valeur >= seuil * 0.66;

/** Niveau d'un comptage : "haut", "proche", "bas", ou null sans seuil (affiché sans couleur). */
export function niveau(v, ctx) {
  const r = resultat(v), s = seuilApplicable(v, ctx);
  if (!s || r.valeur === null || r.unite !== s.unite) return null;
  return auDessus(r.valeur, s.valeur) ? "haut" : proche(r.valeur, s.valeur) ? "proche" : "bas";
}

/** Seuil à enregistrer : message d'erreur en français, ou null s'il est complet. */
export function validerSeuil(s, aujourdhui = new Date().toISOString().slice(0, 10)) {
  if (!METHODES.includes(s?.methode)) return "Choisis une méthode";
  const v = Number(String(s.valeur ?? "").replace(",", "."));
  if (!(v > 0) || v > 1000) return "Indique une valeur de seuil supérieure à 0";
  const d = Number(s.mois_debut), f = Number(s.mois_fin);
  if (!(d >= 1 && d <= 12 && f >= 1 && f <= 12)) return "Choisis les mois de la période";
  if (!String(s.source || "").trim()) return "Indique la source du seuil : organisme, document ou lien";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.consulte_le || ""))) return "Indique la date à laquelle tu as consulté la source";
  if (s.consulte_le > aujourdhui) return "La date de consultation ne peut pas être dans le futur";
  return null;
}

// ---------- Comptage du rucher (AP-FEAT-051) ----------

/** Comptage à enregistrer : message d'erreur en français, ou null. Les colonies sans nombre sont « pas comptées ». */
export function validerComptage(p) {
  if (!p?.id) return "Identifiant du comptage manquant";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ""))) return "Indique la date du comptage";
  if (!METHODES.includes(p.methode)) return "Choisis une méthode";
  const cols = (p.colonies || []).filter((c) => c.varroa !== "" && c.varroa != null);
  if (!cols.length) return "Compte au moins une colonie";
  for (const c of cols) {
    if (!Number.isInteger(Number(c.varroa)) || Number(c.varroa) < 0) return "Le nombre de varroas doit être un entier positif";
    if (!estChute(p.methode) && c.abeilles != null && c.abeilles !== "" && !(Number(c.abeilles) > 0)) return "Le nombre d'abeilles doit être supérieur à 0";
  }
  if (estChute(p.methode) && !(Number(p.duree_jours) > 0)) return "Indique sur combien de jours le lange est resté";
  return null;
}
/** Colonies réellement comptées, au format envoyé à compter_varroa. */
export const coloniesComptees = (p) => (p.colonies || []).filter((c) => c.varroa !== "" && c.varroa != null)
  .map((c) => ({ ruche_id: c.ruche_id, varroa: Number(c.varroa), abeilles: estChute(p.methode) || c.abeilles === "" || c.abeilles == null ? null : Number(c.abeilles) }));

/** Comptage noté sans réseau (ou juste envoyé) : ajouté aux données du téléphone comme le fera compter_varroa. */
export function appliquerComptage(d, p, extra = {}) {
  d.operations ||= []; d.comptesVarroa ||= [];
  if (d.operations.some((o) => o.id === p.id)) return;
  d.operations.unshift({ id: p.id, type: "comptage_varroa", rucher_id: p.rucher_id || null, date_operation: p.date, methode: p.methode,
    echantillon_abeilles: p.echantillon_abeilles ?? null, duree_jours: estChute(p.methode) ? Number(p.duree_jours) : null, note: p.note || "",
    origine: "operation", visite_id: null, ...extra });
  for (const c of p.colonies || []) d.comptesVarroa.push({ id: `${p.id}:${c.ruche_id}`, operation_id: p.id, ruche_id: c.ruche_id, varroa: c.varroa, abeilles: c.abeilles ?? null, ...extra });
}

// ---------- Signes sanitaires (AP-FEAT-057) ----------
// Libellés d'observation écrits par apiviz (ce qu'on voit au rucher), relus avec Pierre-Louis ; ce ne sont pas des
// diagnostics. « avis » : signe qui mérite l'avis d'un vétérinaire ou du groupement sanitaire (formulation sans
// obligation réglementaire tant que la liste officielle n'est pas relue, voir DANGERS_REGLEMENTES).
export const SIGNES = [
  { groupe: "Couvain", signes: [
    { cle: "couvain_mosaique", nom: "Couvain en mosaïque" },
    { cle: "opercules_affaisses", nom: "Opercules affaissés ou percés", avis: true },
    { cle: "larves_filantes", nom: "Larves filantes", avis: true },
    { cle: "odeur_anormale", nom: "Odeur anormale", avis: true },
    { cle: "larves_seches", nom: "Larves sèches (écailles)" }] },
  { groupe: "Abeilles", signes: [
    { cle: "ailes_deformees", nom: "Ailes déformées" },
    { cle: "abeilles_tremblantes", nom: "Abeilles tremblantes ou noires" },
    { cle: "mortalite", nom: "Mortalité devant la ruche", avis: true },
    { cle: "diarrhee", nom: "Traces de diarrhée" }] },
  { groupe: "Prédateurs et ravageurs", signes: [
    { cle: "frelons", nom: "Frelons asiatiques" },
    { cle: "petit_coleoptere", nom: "Petit coléoptère suspecté", avis: true },
    { cle: "fausse_teigne", nom: "Fausse teigne" },
    { cle: "autre", nom: "Autre (à décrire)" }] },
];
const TOUS = SIGNES.flatMap((g) => g.signes);
export const nomSigne = (cle) => TOUS.find((s) => s.cle === cle)?.nom || cle;
export const signesAvis = (cles) => (cles || []).filter((c) => TOUS.find((s) => s.cle === c)?.avis);
export const IMPORTANCES = { leger: "Léger", marque: "Marqué", grave: "Grave" };

/** Observation à enregistrer : message d'erreur, ou null. */
export function validerSignes(p) {
  if (!p?.id) return "Identifiant de l'observation manquant";
  if (!(p.ruches || []).length) return "Choisis au moins une colonie";
  if (!(p.signes || []).length) return "Choisis au moins un signe";
  if ((p.signes || []).some((c) => !TOUS.some((s) => s.cle === c))) return "Signe inconnu";
  if (p.signes.includes("autre") && !String(p.note || "").trim()) return "Décris ce que tu as vu dans la note";
  if (!IMPORTANCES[p.importance]) return "Choisis l'importance";
  return null;
}
/** Observation notée sans réseau (ou juste envoyée) : une ligne par colonie, comme noter_signes. */
export function appliquerSignes(d, p, extra = {}) {
  d.observations ||= [];
  if (d.observations.some((o) => o.saisie_id === p.id)) return;
  for (const r of p.ruches || []) d.observations.unshift({ id: `${p.id}:${r}`, saisie_id: p.id, ruche_id: r, date_observation: p.date, signes: [...p.signes],
    importance: p.importance, note: p.note || "", visite_id: p.visite_id || null, ...extra });
}
/** Observations d'une colonie, la plus récente d'abord. */
export const observationsDe = (d, rucheId) => (d?.observations || []).filter((o) => o.ruche_id === rucheId)
  .sort((a, b) => String(b.date_observation).localeCompare(String(a.date_observation)));

// ---------- Signalement (AP-FEAT-058) ----------
// Dangers sanitaires réglementés des abeilles. Sources trouvées le 23 nov. 2026, à faire relire par Pierre-Louis avant
// tout affichage (relu: false → l'application ne les montre pas et ne parle d'aucune obligation) :
//   - Anses, rapport d'activité 2025 du Laboratoire national de référence « Santé des abeilles » (Sophia-Antipolis) :
//     loque américaine, infestation à Aethina tumida et infestation à Tropilaelaps spp., classées en catégories D et E
//     de la loi de santé animale européenne (règlement (UE) 2016/429, règlement d'exécution (UE) 2018/1882).
//     https://www.anses.fr/sites/default/files/RALNR-2025-Sophia-Sante-des-abeilles.pdf
//   - Arrêté du 3 mai 2022 listant les maladies animales réglementées d'intérêt national (cité par l'Anses).
export const SOURCE_DANGERS = { titre: "Anses, rapport d'activité 2025 du LNR Santé des abeilles", url: "https://www.anses.fr/sites/default/files/RALNR-2025-Sophia-Sante-des-abeilles.pdf", consulte_le: "2026-11-23" };
export const DANGERS_REGLEMENTES = [
  { cle: "loque_americaine", nom: "Loque américaine (Paenibacillus larvae)", signes: ["larves_filantes", "opercules_affaisses", "odeur_anormale"], relu: false },
  { cle: "aethina", nom: "Petit coléoptère de la ruche (Aethina tumida)", signes: ["petit_coleoptere"], relu: false },
  { cle: "tropilaelaps", nom: "Acariens Tropilaelaps", signes: [], relu: false },
];
/** Dangers relus que ces signes peuvent évoquer (vide tant que la liste n'est pas relue). */
export const dangersPour = (cles) => DANGERS_REGLEMENTES.filter((x) => x.relu && x.signes.some((s) => (cles || []).includes(s)));

/** Contacts de l'aide au signalement, saisis par l'apiculteur (réglage « contactsSanitaires »). */
export const CONTACTS = [
  { cle: "veterinaire", qui: "Ton vétérinaire" },
  { cle: "groupement", qui: "Ton groupement sanitaire (GDSA, OVS)" },
  { cle: "services", qui: "Services vétérinaires du département" },
];

/**
 * Texte de la fiche de signalement, au vouvoiement (document remis à un tiers). Ne conclut rien : décrit ce qui a été
 * vu. o = { date, rucher, commune, colonies: [noms], total, signes: [libellés], importance, varroa: texte | "", note,
 *           apiculteur, napi, contact }.
 */
export function ficheSignalement(o) {
  const signes = (o.signes || []).join(", ").toLowerCase();
  const lignes = [
    "Objet : signes sanitaires observés sur un rucher",
    "",
    "Madame, Monsieur,",
    "",
    `Je vous signale avoir observé le ${dateLongue(o.date)}, sur le rucher « ${o.rucher || "sans nom"} »${o.commune ? ` (${o.commune})` : ""}, `
      + `sur ${o.colonies.length} colonie${o.colonies.length > 1 ? "s" : ""}${o.total ? ` sur ${o.total}` : ""} (${o.colonies.join(", ")}) : ${signes}.`,
    o.importance ? `Importance notée : ${String(o.importance).toLowerCase()}.` : "",
    o.varroa ? `Dernier comptage de varroas : ${o.varroa}.` : "",
    o.note ? `Précisions : ${o.note}` : "",
    "",
    "Je souhaite avoir votre avis sur la conduite à tenir.",
    "",
    [o.apiculteur, o.napi ? `NAPI ${o.napi}` : "", o.contact].filter(Boolean).join(" · "),
  ];
  return lignes.filter((l, i, t) => l !== "" || (t[i - 1] !== "" && i > 0)).join("\n");
}
const dateLongue = (iso) => new Date(String(iso).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Libellé d'une saisie santé en attente d'envoi (journal de synchronisation). */
export function libelleEnAttente(nom, p, d) {
  const nomR = (id) => (d?.ruches || []).find((r) => r.id === id)?.nom || "colonie";
  if (nom === "compter_varroa") return ["Comptage varroa · " + (p.colonies || []).length + " colonie" + ((p.colonies || []).length > 1 ? "s" : ""), dateFr(p.date) + " · " + String(p.methode || "").toLowerCase()];
  if (nom === "noter_signes") return ["Signe sanitaire · " + ((p.ruches || []).length === 1 ? nomR(p.ruches[0]) : (p.ruches || []).length + " colonies"), dateFr(p.date) + " · " + (p.signes || []).map(nomSigne).join(", ").toLowerCase()];
  return [nom, ""];
}
