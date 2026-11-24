// Apiviz — « Préparer ma sortie » (v5.80, maquette « apiviz — Idées à forte valeur », idée 4, validée par Pierre-Louis le
// 24 nov. 2026). Règles pures, testées par tests/unitaires/sortie.test.mjs.
// La veille (ou le matin), apiviz rassemble ce qu'il y a à faire un jour donné (tâches de l'agenda, colonies à voir),
// le range par rucher, et en déduit le matériel à emporter, comparé au stock de Matériel. Les règles de matériel sont
// des mots repérés dans le texte des tâches et des alertes : simples, lisibles, sans rien deviner d'autre.

/** Matériel de toute sortie. */
export const TOUJOURS = [
  { nom: "Enfumoir et combustible", pour: "Toujours" },
  { nom: "Lève-cadre et brosse", pour: "Toujours" },
  { nom: "Voile et gants", pour: "Toujours" },
];

/**
 * Ce qu'un mot de la tâche fait emporter. `article` : nom à chercher dans Matériel pour vérifier le stock ;
 * `parColonie` : une unité par colonie concernée.
 */
export const REGLES = [
  { id: "pesee", mots: /\bpes(er|ée|ee|ées|ees|age)\b|\bpoids\b|\bpesée/i, nom: "Peson", article: /peson|balance/i, pour: "les pesées" },
  { id: "candi", mots: /cand[iy]|nourri/i, nom: "Candi", article: /cand[iy]/i, parColonie: true, pour: "le nourrissement" },
  { id: "sirop", mots: /sirop/i, nom: "Sirop", article: /sirop/i, pour: "le nourrissement" },
  { id: "varroa", mots: /varroa|comptage|recompter|sucre glace/i, nom: "Sucre glace et bocal de comptage", article: /sucre glace/i, pour: "les comptages de varroa" },
  { id: "traitement", mots: /trait(er|ement)|lanière|laniere|oxalique|apivar|apistan|maqs|formique|thymol/i, nom: "Gants jetables", pour: "les traitements" },
  { id: "produit", mots: /poser .*(lanière|laniere)|trait(er|ement)|oxalique|formique|thymol/i, nom: "Produit de traitement", article: /lanière|laniere|oxalique|apivar|apistan|maqs|formique|thymol|traitement/i, parColonie: true, pour: "les traitements" },
  { id: "retrait", mots: /retirer .*(lanière|laniere)|enlever .*(lanière|laniere)/i, nom: "Sac pour les lanières usagées", pour: "le retrait des lanières" },
  { id: "hausse", mots: /hausse|miellée|miellee/i, nom: "Hausses", article: /hausse/i, parColonie: true, pour: "les hausses" },
  { id: "recolte", mots: /récolt|recolt/i, nom: "Chasse-abeilles et caisses à hausses", pour: "la récolte" },
  { id: "essaim", mots: /essaim|division|diviser|ruchette/i, nom: "Ruchette", article: /ruchette/i, pour: "essaim ou division" },
  { id: "reine", mots: /\breine\b|remérage|remerage|cage/i, nom: "Cage à reine et marqueur", pour: "la reine" },
  { id: "cadres", mots: /cadre|cire/i, nom: "Cadres et cire gaufrée", article: /cadre|cire gaufr/i, pour: "les cadres" },
];

const joursEntre = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);

/**
 * Ce qu'il y a à faire le jour `jour` : [{ texte, ruche_id, rucher (clé), source: "tache" | "alerte", tache_id }].
 * Tâches non faites dont l'échéance est ce jour-là ou passée ; colonies orphelines, en état « Critique » ou
 * « À surveiller », ou sans visite depuis plus de 30 jours (sauf si une tâche les concerne déjà).
 * d = { taches, ruches, visites } ; rucherDe(ruche) → clé du rucher.
 */
export function programme(d, jour, rucherDe = (r) => r.rucher || "") {
  const ruches = new Map((d.ruches || []).map((r) => [r.id, r]));
  const items = [];
  for (const t of d.taches || []) {
    if (t.faite || !t.echeance || t.echeance > jour) continue;
    const r = t.ruche_id ? ruches.get(t.ruche_id) : null;
    items.push({ texte: t.titre, ruche_id: r?.id || null, rucher: r ? rucherDe(r) : null, source: "tache", tache_id: t.id, retard: t.echeance < jour });
  }
  const avecTache = new Set(items.map((x) => x.ruche_id).filter(Boolean));
  const derniere = new Map();
  for (const v of d.visites || []) if (!derniere.has(v.ruche_id) || v.date_visite > derniere.get(v.ruche_id)) derniere.set(v.ruche_id, v.date_visite);
  for (const r of d.ruches || []) {
    if (avecTache.has(r.id) || r.sortie) continue;
    let texte = "";
    if (r.statut === "orpheline") texte = `${r.nom} : orpheline, voir la reine`;
    else if (r.etat === "Critique") texte = `${r.nom} : état critique, à voir`;
    else if (r.etat === "À surveiller") texte = `${r.nom} : à surveiller`;
    else if (derniere.has(r.id) && joursEntre(derniere.get(r.id), jour) > 30) texte = `${r.nom} : pas de visite depuis ${joursEntre(derniere.get(r.id), jour)} jours`;
    if (texte) items.push({ texte, ruche_id: r.id, rucher: rucherDe(r), source: "alerte", tache_id: null, retard: false });
  }
  return items;
}

/** Ruchers du programme, du plus chargé au moins chargé : [{ cle, items, colonies }]. Les tâches sans rucher à part. */
export function parRucher(items) {
  const m = new Map();
  for (const x of items) {
    if (x.rucher == null) continue;
    const g = m.get(x.rucher) || { cle: x.rucher, items: [], colonies: new Set() };
    g.items.push(x);
    if (x.ruche_id) g.colonies.add(x.ruche_id);
    m.set(x.rucher, g);
  }
  return [...m.values()].map((g) => ({ ...g, colonies: g.colonies.size })).sort((a, b) => b.items.length - a.items.length || String(a.cle).localeCompare(String(b.cle), "fr"));
}

const nombre = (texte) => { const m = String(texte).match(/\b(\d{1,3})\b/); return m ? Number(m[1]) : 0; };

/**
 * Matériel à emporter : TOUJOURS, puis ce que les mots des tâches et alertes demandent, avec le stock de Matériel.
 * Rend [{ nom, pour, besoin (null si on ne compte pas), stock (null si l'article n'est pas suivi), manque, article_id }].
 * besoin : nombre de colonies concernées (ou le nombre écrit dans la tâche, « 3 pains de candi »), pour parColonie.
 */
export function materiel(items, articles = []) {
  const out = TOUJOURS.map((x) => ({ ...x, besoin: null, stock: null, manque: 0, article_id: null }));
  for (const r of REGLES) {
    const vises = items.filter((x) => r.mots.test(x.texte));
    if (!vises.length) continue;
    let besoin = null;
    if (r.parColonie) {
      const colonies = new Set(vises.map((x) => x.ruche_id).filter(Boolean)).size;
      const ecrit = vises.reduce((t, x) => t + nombre(x.texte), 0);
      besoin = Math.max(colonies, ecrit, 1);
    }
    const art = r.article ? (articles || []).find((a) => r.article.test(a.nom || "")) : null;
    const stock = art ? Number(art.stock) || 0 : null;
    const manque = besoin != null && stock != null ? Math.max(0, besoin - stock) : stock === 0 ? 1 : 0;
    out.push({ nom: r.nom, pour: r.pour, besoin, stock, manque, article_id: art?.id || null, unite: art?.unite || "" });
  }
  return out;
}

/** Détail d'une ligne de matériel : « Pour 3 colonies · il t'en reste 2 », « Il en manque 1 »… */
export function detail(m) {
  const morceaux = [m.besoin != null ? `Pour ${m.besoin} colonie${m.besoin > 1 ? "s" : ""}` : m.pour === "Toujours" ? "À chaque sortie" : `Pour ${m.pour}`];
  if (m.stock != null) morceaux.push(m.stock > 0 ? `il t’en reste ${String(m.stock).replace(".", ",")}${m.unite && m.unite !== "unité" ? " " + m.unite : ""}` : "plus en stock");
  return morceaux.join(" · ");
}

/** Jours proposés : aujourd'hui, demain, après-demain. */
export function jours(aujourdhui) {
  const d = (n) => new Date(new Date(aujourdhui + "T12:00:00").getTime() + n * 864e5).toISOString().slice(0, 10);
  return [{ iso: d(0), titre: "Aujourd’hui" }, { iso: d(1), titre: "Demain" }, { iso: d(2), titre: "Après-demain" }];
}

/** Meilleure plage d'un jour parmi des plages [{ debut, fin, n }] : la bonne (n = 2) la plus longue, sinon la rapide. */
export function meilleurePlage(plages) {
  return [...(plages || [])].filter((p) => p.n > 0).sort((a, b) => b.n - a.n || (b.fin - b.debut) - (a.fin - a.debut) || a.debut - b.debut)[0] || null;
}

