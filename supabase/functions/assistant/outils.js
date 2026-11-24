// Apiviz — assistant API (IT-24) : instantané de l'exploitation et outils de lecture typés (AP-TECH-334).
// Chaque lecture passe par le client Supabase créé avec le jeton de l'utilisateur et l'en-tête « x-exploitation » :
// les règles d'accès (RLS, exploitation_courante()) s'appliquent, API ne voit que ce que l'utilisateur voit.
// Aucune écriture ici (les actions viendront en IT-25).
// Chaque identifiant renvoyé au modèle est noté dans « ids » : une référence qui n'y figure pas est retirée de la
// réponse (regles.js, nettoyer).

import { SCHEMA_REPONSE } from "./regles.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (x) => (typeof x === "string" && DATE.test(x) ? x : null);
const borne = (x, min, max, def) => (Number.isInteger(x) ? Math.min(max, Math.max(min, x)) : def);
const sansVide = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)));
const jours = (de, a) => (de ? Math.round((Date.parse(a) - Date.parse(de)) / 864e5) : null);

async function lire(requete) {
  const { data, error } = await requete;
  if (error) throw new Error(error.message || "lecture impossible");
  return data || [];
}

/** Note les identifiants lus et renvoie les lignes telles quelles. */
const noter = (ids, lignes, ...cles) => {
  for (const l of lignes) for (const c of cles.length ? cles : ["id"]) if (l && l[c]) ids.add(String(l[c]));
  return lignes;
};

/** Résumé compact envoyé avec chaque question : de quoi répondre aux questions simples sans appel d'outil. */
export async function instantane(db, exploitationId, jour, ids) {
  const [expl, ruchers, ruches, resume, taches, lots] = await Promise.all([
    lire(db.from("exploitations").select("id,nom").eq("id", exploitationId)),
    lire(db.from("ruchers").select("id,nom,lat,lng,archive_le").is("archive_le", null).order("nom")),
    lire(db.from("ruches").select("id,nom,code,rucher,rucher_id,etat,statut,sortie,date_sortie,annee_reine,hausses,type_ruche,notes").order("nom")),
    lire(db.from("colonies_resume").select("*")),
    lire(db.from("taches").select("id,titre,echeance,ruche_id,assigne").eq("faite", false).order("echeance", { ascending: true, nullsFirst: false }).limit(40)),
    lire(db.from("lots_stock").select("id,code,miel,format_g,prix,pots_restants,ddm").gt("pots_restants", 0)),
  ]);
  noter(ids, ruchers); noter(ids, taches); noter(ids, lots);
  const parRuche = new Map(resume.map((r) => [r.ruche_id, r]));
  const actives = ruches.filter((r) => !r.sortie && !r.date_sortie);
  noter(ids, actives);
  for (const r of resume) if (r.derniere_visite_id) ids.add(String(r.derniere_visite_id));
  const nomRucher = new Map(ruchers.map((r) => [r.id, r.nom]));
  return {
    exploitation: expl[0]?.nom || null,
    aujourdhui: jour,
    ruchers: ruchers.map((r) => sansVide({ id: r.id, nom: r.nom, place_sur_carte: r.lat != null && r.lng != null })),
    colonies: actives.map((r) => {
      const s = parRuche.get(r.id) || {};
      return sansVide({
        id: r.id, nom: r.nom, code: r.code, rucher: nomRucher.get(r.rucher_id) || r.rucher, etat: r.etat, statut: r.statut,
        annee_reine: r.annee_reine, hausses: r.hausses, type: r.type_ruche, notes: r.notes?.slice(0, 200),
        derniere_visite: s.derniere_visite, derniere_visite_id: s.derniere_visite_id, jours_depuis_visite: jours(s.derniere_visite, jour),
        nb_visites: s.nb_visites ? Number(s.nb_visites) : 0, provisions: s.dernieres_provisions,
        dernier_poids_kg: s.dernier_poids, date_dernier_poids: s.date_dernier_poids,
        dernier_varroa: s.dernier_varroa, varroa_abeilles: s.dernier_varroa_abeilles, varroa_methode: s.dernier_varroa_methode, date_dernier_varroa: s.date_dernier_varroa,
      });
    }),
    colonies_sorties: ruches.length - actives.length,
    taches_a_faire: taches.map((t) => sansVide({ id: t.id, titre: t.titre, echeance: t.echeance, ruche_id: t.ruche_id, assigne: t.assigne })),
    miel_en_stock: lots.map((l) => sansVide({ id: l.id, code: l.code, miel: l.miel, format_g: l.format_g, prix: l.prix, pots_restants: l.pots_restants, ddm: l.ddm })),
  };
}

const PERIODE = {
  depuis: { type: "string", description: "Date de début AAAA-MM-JJ (incluse)." },
  jusqu_a: { type: "string", description: "Date de fin AAAA-MM-JJ (incluse)." },
};
const RUCHE = { ruche_id: { type: "string", description: "Identifiant d'une colonie (champ id de l'instantané)." } };

export const OUTILS = [
  {
    name: "visites",
    description: "Visites saisies, les plus récentes d'abord : activité, couvain, reine, provisions, poids, force, œufs vus, cellules royales, observations, note. Filtrer par colonie et/ou période.",
    input_schema: { type: "object", properties: { ...RUCHE, ...PERIODE, limite: { type: "integer", description: "1 à 60, 20 par défaut." } } },
    async executer(db, a, ids) {
      let q = db.from("visites").select("id,ruche_id,date_visite,activite,couvain,reine,provisions,poids_kg,force,oeufs_vus,cellules_royales,observes,note,auteur,duree_s").order("date_visite", { ascending: false }).limit(borne(a.limite, 1, 60, 20));
      if (a.ruche_id) q = q.eq("ruche_id", a.ruche_id);
      if (date(a.depuis)) q = q.gte("date_visite", a.depuis);
      if (date(a.jusqu_a)) q = q.lte("date_visite", a.jusqu_a);
      return noter(ids, (await lire(q)).map(sansVide));
    },
  },
  {
    name: "sante",
    description: "Comptages varroa et traitements notés dans les visites (produit, dose saisie par l'apiculteur, ordonnance, retrait prévu). Ce sont des faits saisis, pas des consignes.",
    input_schema: { type: "object", properties: { ...RUCHE, ...PERIODE } },
    async executer(db, a, ids) {
      let q = db.from("visites").select("id,ruche_id,date_visite,varroa,varroa_methode,varroa_abeilles,traitement,lot_produit,traitement_dose,ordonnance,retrait_prevu").or("varroa.not.is.null,traitement.not.is.null").order("date_visite", { ascending: false }).limit(60);
      if (a.ruche_id) q = q.eq("ruche_id", a.ruche_id);
      if (date(a.depuis)) q = q.gte("date_visite", a.depuis);
      if (date(a.jusqu_a)) q = q.lte("date_visite", a.jusqu_a);
      return noter(ids, (await lire(q)).map(sansVide));
    },
  },
  {
    name: "reines",
    description: "Historique des reines (année de naissance, marquage, origine, période en place, statut, clippée) et liens entre colonies (essaims, divisions).",
    input_schema: { type: "object", properties: { ...RUCHE } },
    async executer(db, a, ids) {
      let q = db.from("reines").select("id,colonie_id,annee_naissance,marquage,origine,en_place_du,en_place_au,statut,clippee,notes").order("en_place_du", { ascending: false }).limit(60);
      if (a.ruche_id) q = q.eq("colonie_id", a.ruche_id);
      let l = db.from("colonie_liens").select("*").limit(60);
      const [reines, liens] = await Promise.all([lire(q), lire(l).catch(() => [])]);
      return { reines: reines.map(sansVide), liens: liens.map(sansVide) };
    },
  },
  {
    name: "evenements",
    description: "Journal des événements d'une colonie ou de l'exploitation : essaimage, division, réunion, déplacement, perte, etc.",
    input_schema: { type: "object", properties: { ...RUCHE, ...PERIODE } },
    async executer(db, a) {
      let q = db.from("ruche_evenements").select("ruche_id,type,date_evenement,detail,autre_ruche_id,auteur").order("date_evenement", { ascending: false }).limit(60);
      if (a.ruche_id) q = q.eq("ruche_id", a.ruche_id);
      if (date(a.depuis)) q = q.gte("date_evenement", a.depuis);
      if (date(a.jusqu_a)) q = q.lte("date_evenement", a.jusqu_a);
      return (await lire(q)).map(sansVide);
    },
  },
  {
    name: "recoltes",
    description: "Récoltes par colonie : date, kg, hausses, humidité, type de miel, extraction.",
    input_schema: { type: "object", properties: { annee: { type: "integer" }, ...RUCHE } },
    async executer(db, a, ids) {
      let q = db.from("recoltes").select("id,ruche_id,date_recolte,kg,hausses,humidite,miel,extraction").order("date_recolte", { ascending: false }).limit(200);
      if (Number.isInteger(a.annee)) q = q.gte("date_recolte", `${a.annee}-01-01`).lte("date_recolte", `${a.annee}-12-31`);
      if (a.ruche_id) q = q.eq("ruche_id", a.ruche_id);
      return noter(ids, (await lire(q)).map(sansVide));
    },
  },
  {
    name: "lots_miel",
    description: "Lots de miel mis en pots : code, miel, format, prix, pots initiaux, vendus et restants, date limite (DDM). Par défaut tous les lots, y compris épuisés.",
    input_schema: { type: "object", properties: { en_stock_seulement: { type: "boolean" } } },
    async executer(db, a, ids) {
      let q = db.from("lots_stock").select("id,code,miel,format_g,prix,pots_initiaux,pots_vendus,pots_restants,date_mise_en_pot,ddm").order("date_mise_en_pot", { ascending: false }).limit(100);
      if (a.en_stock_seulement) q = q.gt("pots_restants", 0);
      return noter(ids, (await lire(q)).map(sansVide));
    },
  },
  {
    name: "ventes",
    description: "Ventes avec client, lignes (lot, quantité, prix), payée ou non, livrée ou non, vendue par, encaissée par. Filtrer par période ou client.",
    input_schema: { type: "object", properties: { ...PERIODE, client_id: { type: "string" } } },
    async executer(db, a, ids) {
      let q = db.from("ventes").select("id,client_id,date_vente,paye,mode,livre,livraison,vendu_par,encaisse_par,facture_num,facture_annee").order("date_vente", { ascending: false }).limit(100);
      if (date(a.depuis)) q = q.gte("date_vente", a.depuis);
      if (date(a.jusqu_a)) q = q.lte("date_vente", a.jusqu_a);
      if (a.client_id) q = q.eq("client_id", a.client_id);
      const ventes = await lire(q);
      const vIds = ventes.map((v) => v.id), cIds = [...new Set(ventes.map((v) => v.client_id).filter(Boolean))];
      const [lignes, clients] = await Promise.all([
        vIds.length ? lire(db.from("vente_lignes").select("*").in("vente_id", vIds)) : [],
        cIds.length ? lire(db.from("clients").select("id,nom").in("id", cIds)) : [],
      ]);
      noter(ids, ventes); noter(ids, clients);
      const nom = new Map(clients.map((c) => [c.id, c.nom]));
      return ventes.map((v) => {
        const l = lignes.filter((x) => x.vente_id === v.id);
        return sansVide({ ...v, client: nom.get(v.client_id), lignes: l.map(({ vente_id, id, exploitation_id, ...x }) => x), total: Math.round(l.reduce((s, x) => s + Number(x.quantite || 0) * Number(x.prix_unitaire || 0) - Number(x.remise || 0), 0) * 100) / 100 });
      });
    },
  },
  {
    name: "clients",
    description: "Clients : nom, cercle, ville, étiquettes, notes. Recherche facultative par nom.",
    input_schema: { type: "object", properties: { recherche: { type: "string" } } },
    async executer(db, a, ids) {
      let q = db.from("clients").select("id,nom,cercle,ville,etiquettes,notes").order("nom").limit(200);
      if (typeof a.recherche === "string" && a.recherche.trim()) q = q.ilike("nom", `%${a.recherche.trim().replace(/[%_,()]/g, " ")}%`);
      return noter(ids, (await lire(q)).map(sansVide));
    },
  },
  {
    name: "depenses",
    description: "Dépenses et achats (date, catégorie, poste, libellé, montant, acheté par, payé avec) et budgets par poste pour une année.",
    input_schema: { type: "object", properties: { annee: { type: "integer", description: "Année, l'année en cours par défaut." } } },
    async executer(db, a, ids, ctx) {
      const an = Number.isInteger(a.annee) ? a.annee : Number(ctx.jour.slice(0, 4));
      const [depenses, budgets] = await Promise.all([
        lire(db.from("depenses").select("id,date_depense,categorie,libelle,montant,nature,achete_par,paye_par,quantite").gte("date_depense", `${an}-01-01`).lte("date_depense", `${an}-12-31`).order("date_depense", { ascending: false }).limit(300)),
        lire(db.from("budgets").select("annee,poste,montant").eq("annee", an)),
      ]);
      return { annee: an, depenses: noter(ids, depenses).map(sansVide), budgets, total: Math.round(depenses.reduce((s, d) => s + Number(d.montant || 0), 0) * 100) / 100 };
    },
  },
  {
    name: "materiel",
    description: "Matériel et consommables : stock, seuil d'alerte, unité, famille, valeur.",
    input_schema: { type: "object", properties: { sous_seuil_seulement: { type: "boolean" } } },
    async executer(db, a, ids) {
      const l = await lire(db.from("articles").select("id,nom,type,famille,unite,stock,seuil,valeur").order("nom").limit(300));
      const r = a.sous_seuil_seulement ? l.filter((x) => x.seuil != null && Number(x.stock) <= Number(x.seuil)) : l;
      return noter(ids, r).map(sansVide);
    },
  },
  {
    name: "taches",
    description: "Tâches de l'agenda. Par défaut celles à faire ; « inclure_faites » ajoute celles déjà faites.",
    input_schema: { type: "object", properties: { inclure_faites: { type: "boolean" }, ...PERIODE } },
    async executer(db, a, ids) {
      let q = db.from("taches").select("id,titre,echeance,ruche_id,assigne,faite,faite_le").order("echeance", { ascending: true }).limit(100);
      if (!a.inclure_faites) q = q.eq("faite", false);
      if (date(a.depuis)) q = q.gte("echeance", a.depuis);
      if (date(a.jusqu_a)) q = q.lte("echeance", a.jusqu_a);
      return noter(ids, (await lire(q)).map(sansVide));
    },
  },
  {
    name: "meteo",
    description: "Prévisions sur 7 jours au rucher (Open-Meteo) : températures, pluie, vent, code météo. Le rucher doit être placé sur la carte.",
    input_schema: { type: "object", properties: { rucher_id: { type: "string" } }, required: ["rucher_id"] },
    async executer(db, a, ids, ctx) {
      const r = (await lire(db.from("ruchers").select("id,nom,lat,lng").eq("id", a.rucher_id || "")))[0];
      if (!r) return { erreur: "Rucher introuvable dans cette exploitation." };
      if (r.lat == null || r.lng == null) return { erreur: `Le rucher ${r.nom} n'est pas placé sur la carte.` };
      ids.add(String(r.id));
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Europe%2FParis&forecast_days=7`;
      const rep = await (ctx.fetch || fetch)(url);
      if (!rep.ok) return { erreur: "Météo indisponible pour le moment." };
      const d = (await rep.json()).daily || {};
      return { rucher: r.nom, jours: (d.time || []).map((t, i) => ({ date: t, code: d.weathercode?.[i], t_max: d.temperature_2m_max?.[i], t_min: d.temperature_2m_min?.[i], pluie_mm: d.precipitation_sum?.[i], pluie_proba: d.precipitation_probability_max?.[i], vent_max_kmh: d.wind_speed_10m_max?.[i] })) };
    },
  },
];

/** Outil final : la réponse en quatre blocs. Le modèle doit toujours terminer par lui. */
export const OUTIL_REPONDRE = {
  name: "repondre",
  description: "Donne ta réponse finale à l'apiculteur, en quatre blocs. Appelle-le une seule fois, quand tu as ce qu'il faut.",
  input_schema: SCHEMA_REPONSE,
};

/** Définitions envoyées au modèle (sans les fonctions). */
export const definitions = () => [...OUTILS, OUTIL_REPONDRE].map(({ name, description, input_schema }) => ({ name, description, input_schema }));

/** Exécute un outil de lecture ; une erreur est renvoyée au modèle comme résultat, en français. */
export async function executer(nom, args, db, ids, ctx) {
  const o = OUTILS.find((x) => x.name === nom);
  if (!o) return { erreur: `Outil inconnu : ${nom}.` };
  try { return await o.executer(db, args || {}, ids, ctx); }
  catch (e) { return { erreur: `Lecture impossible (${String(e.message || e).slice(0, 200)}).` }; }
}
