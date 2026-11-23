// Apiviz — écran Ruchers › Santé (IT-12, maquette « IT-12 Santé : varroa et observations sanitaires » du 23 nov. 2026,
// validée par Pierre-Louis : les seuils vivent dans cet onglet, bascule « Comptages / Seuils »).
//   - Comptages : dernier comptage de chaque colonie (méthode, résultat, pastille au-dessus / sous le seuil / pas de
//     seuil), seuil appliqué avec sa source, signes notés ces 30 derniers jours. Bouton principal « Compter le rucher ».
//   - Seuils : par méthode et période, chacun avec sa source et sa date de consultation ; aucun seuil par défaut.
// Remplace l'implémentation d'avant (V3.vues.varroa, v3.js), qui reste dans v3.js sans être appelée.
// Enregistré dans la table des écrans (src/domaines/sante/ecrans.js) : aucune surcharge de render, shell ou view*.
// Globales d'app.js lues à l'appel : S, esc, n, dfr, today, toast, render, sheet, cfg, saveCfg, shell, sb, refresh, ACT, UX.
import * as SA from "./regles.js";

const e = (t) => esc(t);
export const ctx = () => ({ seuils: S.d?.seuils || [], reglages: typeof cfg == "function" ? cfg() : {} });
const st = () => (S.sa ||= { vue: "comptages", rucher: null, filtre: "" });
const sans036 = () => !!S.absentes?.has("seuils");
const pl = (k, mot) => (typeof UX != "undefined" ? UX.pluriel(k, mot) : `${k} ${mot}${k > 1 ? "s" : ""}`);
const ic = (d, t = 18) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const nomRucher = (r) => r.rucher || "Sans rucher";

/** Pastille d'un comptage : [texte, classe de tag]. */
export function pastille(c, niv) {
  if (!c) return ["à compter", ""];
  if (niv === "haut") return ["au-dessus", "crit"];
  if (niv === "proche") return ["proche du seuil", "watch"];
  if (niv === "bas") return ["sous le seuil", "good"];
  return ["pas de seuil", ""];
}
/** Détail d'un comptage : date, méthode, échantillon, origine. */
export function detail(c) {
  const t = SA.tauxVarroa(c);
  return [dfr(c.date_visite), c.varroa_methode ? c.varroa_methode.toLowerCase() : "méthode non notée",
    t !== null ? `${c.varroa} sur ${c.varroa_abeilles} abeilles` : SA.chuteParJour(c) !== null ? `${c.varroa} varroas en ${String(c.duree_jours).replace(".", ",")} j` : "",
    c.origine === "visite" ? "noté dans une visite" : ""].filter(Boolean).join(" · ");
}

function lignesColonies() {
  const d = S.d, tous = SA.comptages(d), c = ctx();
  const rang = { haut: 0, proche: 1, bas: 2 };
  return (d.ruches || []).map((r) => {
    const der = tous.find((x) => x.ruche_id === r.id);
    return { r, der, niv: der ? SA.niveau(der, c) : null };
  }).sort((a, b) => (a.der ? rang[a.niv] ?? 3 : 4) - (b.der ? rang[b.niv] ?? 3 : 4) || String(a.r.nom).localeCompare(String(b.r.nom), "fr", { numeric: true }));
}

function segment(vue) {
  const b = (v, t) => `<button type="button" class="${vue === v ? "on" : ""}" aria-pressed="${vue === v}" data-act="savue" data-v="${v}">${t}</button>`;
  const nb = (S.d?.seuils || []).length + (SA.seuilVarroa(ctx().reglages) ? 1 : 0);
  return `<div class="subtabs g-segment sa-seg" role="group" aria-label="Partie de Santé">${b("comptages", "Comptages")}${b("seuils", `Seuils${nb ? ` <span>${nb}</span>` : ""}`)}</div>`;
}

// ---------- Comptages ----------
function vueComptages(s) {
  const toutes = lignesColonies();
  const ruchers = [...new Set(toutes.map((l) => nomRucher(l.r)))];
  if (s.rucher && !ruchers.includes(s.rucher)) s.rucher = null;
  const dansRucher = toutes.filter((l) => !s.rucher || nomRucher(l.r) === s.rucher);
  const haut = dansRucher.filter((l) => l.niv === "haut").length, aCompter = dansRucher.filter((l) => !l.der).length;
  const liste = dansRucher.filter((l) => (s.filtre === "haut" ? l.niv === "haut" : s.filtre === "compter" ? !l.der : true));
  const puce = (act, v, t, on, k) => `<button type="button" class="op-puce${on ? " on" : ""}" aria-pressed="${on}" data-act="${act}" data-v="${e(v)}">${e(t)}${k != null ? ` <span>${k}</span>` : ""}</button>`;
  const puces = `<div class="op-puces" role="group" aria-label="Filtrer les colonies">
    ${ruchers.length > 1 ? [["", "Tous les ruchers"], ...ruchers.map((x) => [x, x])].map(([v, t]) => puce("sarucher", v, t, (s.rucher || "") === v)).join("") : ""}
    ${puce("safiltre", "", "Toutes", !s.filtre, dansRucher.length)}${haut ? puce("safiltre", "haut", "Au-dessus", s.filtre === "haut", haut) : ""}${aCompter ? puce("safiltre", "compter", "À compter", s.filtre === "compter", aCompter) : ""}</div>`;
  const lignes = liste.map(({ r, der, niv }) => {
    const [txt, cls] = pastille(der, niv), res = der ? SA.resultat(der).texte : "—";
    return `<button type="button" class="sa-ligne" data-act="sacolonie" data-v="${e(r.id)}">
      <span class="sa-hex sa-${niv || "aucun"}" aria-hidden="true"></span>
      <span class="sa-t"><b>${e(r.nom)}</b><span class="small">${e(der ? detail(der) : "Jamais comptée")}</span></span>
      <span class="sa-d"><b>${e(res)}</b><span class="tag ${cls}">${e(txt)}</span>${der?._attente ? '<span class="tag watch">en attente</span>' : ""}</span></button>`;
  }).join("");

  // Seuils qui s'appliquent aujourd'hui aux méthodes utilisées pour les derniers comptages (sinon au sucre glace).
  const methodes = [...new Set(dansRucher.map((l) => l.der?.varroa_methode).filter(Boolean))];
  const c = ctx(), auj = today();
  const actifs = (methodes.length ? methodes : ["Sucre glace"]).map((m) => [m, SA.seuilApplicable({ varroa_methode: m, date_visite: auj }, c)]);
  const carteSeuil = actifs.some(([, x]) => x)
    ? `<section class="card sa-seuil"><h2>Seuil appliqué</h2>${actifs.map(([m, x]) => x
        ? `<div class="sa-sl"><span><b>${e(SA.valeurTexte(x))} · ${e(m.toLowerCase())}, ${e(SA.periodeTexte(x))}</b><span class="small">${e(SA.sourceTexte(x))}</span></span>
           <button type="button" class="sa-q" data-act="saquestion" data-v="${e(m)}" aria-label="D’où vient le seuil ${e(m.toLowerCase())} ?">?</button></div>`
        : `<div class="sa-sl"><span><b>${e(m)}</b><span class="small">Aucun seuil enregistré pour ce mois : résultat sans comparaison.</span></span></div>`).join("")}
       <button type="button" class="link" data-act="savue" data-v="seuils">Seuils ›</button></section>`
    : `<section class="card sa-seuil sa-vide"><h2>Pas encore de seuil</h2><p class="small">Les résultats s’affichent sans couleur d’alerte. Ajoute le seuil de ton GDS ou de ton technicien, avec sa source et la date où tu l’as consultée.</p>
       <button type="button" class="btn sm" data-act="saseuil" data-v="">Ajouter un seuil</button></section>`;

  const groupes = signesRecents();
  const signes = groupes.length ? `<section class="card sa-signes">${groupes.map((g) => `<button type="button" class="sa-ligne" data-act="sasignalement" data-v="${e(g.saisie)}">
      <span class="sa-t"><b>${e(g.signes.map(SA.nomSigne).join(", "))}</b><span class="small">${e([g.colonies, dfr(g.date), SA.IMPORTANCES[g.importance]?.toLowerCase()].filter(Boolean).join(" · "))}</span></span>
      ${g._attente ? '<span class="tag watch">en attente</span>' : ""}<span class="u-chev" aria-hidden="true">›</span></button>`).join("")}</section>`
    : '<p class="small sa-rien">Aucun signe noté ces 30 derniers jours.</p>';

  return `${puces}
    <div class="u-entete sa-tete"><h2>Dernier comptage par colonie</h2></div>
    <section class="card sa-liste">${lignes || '<p class="small">Aucune colonie ici.</p>'}</section>
    ${carteSeuil}
    <div class="u-entete sa-tete"><h2>Signes notés ces 30 jours</h2><button type="button" class="link" data-act="sasigne" data-v="">Noter un signe</button></div>
    ${signes}`;
}

/** Observations des 30 derniers jours, regroupées par saisie (une saisie peut viser plusieurs colonies). */
export function signesRecents(rucheId) {
  const limite = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const parSaisie = new Map();
  for (const o of S.d?.observations || []) {
    if (rucheId ? o.ruche_id !== rucheId : String(o.date_observation) < limite) continue;
    const g = parSaisie.get(o.saisie_id) || { saisie: o.saisie_id, date: o.date_observation, signes: o.signes, importance: o.importance, ruches: [], _attente: !!o._attente };
    g.ruches.push(o.ruche_id); parSaisie.set(o.saisie_id, g);
  }
  const nom = (id) => (S.d.ruches || []).find((r) => r.id === id)?.nom || "Colonie";
  return [...parSaisie.values()].map((g) => ({ ...g, colonies: g.ruches.length > 2 ? pl(g.ruches.length, "colonie") : g.ruches.map(nom).join(", ") }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// ---------- Seuils ----------
function vueSeuils() {
  const seuils = S.d?.seuils || [], ancien = SA.seuilVarroa(ctx().reglages);
  const methodes = SA.METHODES.filter((m) => m !== "Autre" || seuils.some((x) => x.methode === "Autre"));
  const ligne = (x) => `<div class="sa-sl sa-seuil-l">
      <span class="sa-per">${e(SA.periodeTexte(x))}</span>
      <span class="sa-t"><b>${e(SA.valeurTexte({ ...x, unite: SA.estChute(x.methode) ? "par_jour" : "pourcent" }))}</b>
        <span class="tag ${x.origine === "officielle" ? "info" : "good"}">${x.origine === "officielle" ? "source officielle" : "saisi par toi"}</span>
        <span class="small">${e(SA.sourceTexte(x))}</span></span>
      <button type="button" class="btn sm" data-act="saseuil" data-v="${e(x.id)}" aria-label="Modifier le seuil ${e(x.methode.toLowerCase())}, ${e(SA.periodeTexte(x))}">Modifier</button></div>`;
  const groupes = methodes.map((m) => {
    const l = seuils.filter((x) => x.methode === m).sort((a, b) => a.mois_debut - b.mois_debut);
    return `<div class="u-entete sa-tete"><h2>${e(m)}</h2><span class="small">${e(SA.uniteTexte(SA.estChute(m) ? "par_jour" : "pourcent"))}</span></div>
      <section class="card sa-groupe">${l.map(ligne).join("") || `<div class="sa-sl"><span class="sa-t"><b>Aucun seuil</b><span class="small">Le résultat s’affiche sans comparaison.</span></span>
        <button type="button" class="btn sm" data-act="saseuil" data-v="${e("+" + m)}" aria-label="Ajouter un seuil ${e(m.toLowerCase())}">Ajouter</button></div>`}</section>`;
  }).join("");
  return `<section class="card sa-regle"><p>apiviz n’applique <b>aucun seuil par défaut</b>. Un seuil s’affiche seulement s’il dit d’où il vient et quand tu l’as vérifié. Sans seuil, tu vois le chiffre, sans jugement.</p></section>
    ${sans036() ? '<p class="small sa-rien">La base doit être mise à jour (migration 036) pour enregistrer des seuils.</p>' : ""}
    ${ancien ? `<div class="u-entete sa-tete"><h2>Réglage d’avant</h2></div><section class="card sa-groupe"><div class="sa-sl"><span class="sa-per">toute l’année</span>
      <span class="sa-t"><b>${e(String(ancien).replace(".", ","))} %</b><span class="tag good">saisi par toi</span><span class="small">Sucre glace, lavage et autre · source non notée. Ajoute sa source pour le garder.</span></span>
      <span class="sa-btns"><button type="button" class="btn sm" data-act="saseuil" data-v="ancien">Ajouter la source</button><button type="button" class="btn sm" data-act="saretirerancien">Retirer</button></span></div></section>` : ""}
    ${groupes}
    <button type="button" class="btn block sa-ajout" data-act="saseuil" data-v="">Ajouter un seuil</button>`;
}

// ---------- L'écran ----------
export function ecran() {
  const s = st();
  if (!["comptages", "seuils"].includes(s.vue)) s.vue = "comptages";
  const lignes = lignesColonies(), haut = lignes.filter((l) => l.niv === "haut").length;
  const resume = [pl((S.d.ruches || []).length, "colonie"), haut ? `${haut} au-dessus du seuil` : ""].filter(Boolean).join(" · ");
  const actif = (S.d.ruches || []).length > 0;
  shell("Santé", resume,
    `${actif ? '<button type="button" class="btn main" data-act="cvouvrir" data-v="">Compter le rucher</button>' : ""}${actif ? '<button type="button" class="btn" data-act="sasigne" data-v="">Noter un signe</button>' : ""}${segment(s.vue)}`,
    `<div class="sa-ecran">${s.vue === "seuils" ? vueSeuils() : vueComptages(s)}</div>`);
}

// ---------- Feuilles ----------
const optionsMois = SA.MOIS.map((m, i) => [String(i + 1), m]);
function feuilleSeuil(cle) {
  if (sans036()) return toast("La base doit être mise à jour pour enregistrer un seuil (migration 036).", true);
  const ex = (S.d.seuils || []).find((x) => x.id === cle);
  const ancien = cle === "ancien" ? SA.seuilVarroa(ctx().reglages) : null;
  const m0 = ex?.methode || (String(cle || "").startsWith("+") ? cle.slice(1) : "Sucre glace");
  sheet({
    title: ex ? "Modifier le seuil" : "Nouveau seuil",
    intro: "Indique la valeur conseillée par ton GDS, ton technicien sanitaire ou un document officiel, et d’où elle vient. Sans source ni date, le seuil n’est pas enregistré.",
    fields: [
      { name: "methode", label: "Méthode", type: "select", options: SA.METHODES, value: m0 },
      { name: "mois_debut", label: "Du mois de", type: "select", options: optionsMois, value: String(ex?.mois_debut || 1) },
      { name: "mois_fin", label: "Au mois de", type: "select", options: optionsMois, value: String(ex?.mois_fin || 12) },
      { name: "valeur", label: "Valeur (% d’abeilles porteuses, ou varroas par jour pour le lange)", type: "number", step: "0.1", min: "0.1", required: true, value: ex ? String(ex.valeur) : ancien ?? "" },
      { name: "source", label: "Source · obligatoire (organisme, document)", required: true, value: ex?.source || "" },
      { name: "url", label: "Lien vers la source (facultatif)", value: ex?.url || "" },
      { name: "consulte_le", label: "Consultée le · obligatoire", type: "date", required: true, value: ex?.consulte_le || today() },
      { name: "origine", label: "Origine", type: "select", options: [["utilisateur", "Choisi par moi (GDS, technicien…)"], ["officielle", "Document officiel"]], value: ex?.origine || "utilisateur" },
    ],
    submit: async (f) => {
      const ligne = { ...f, valeur: Number(String(f.valeur).replace(",", ".")), mois_debut: Number(f.mois_debut), mois_fin: Number(f.mois_fin), source: String(f.source).trim(), url: String(f.url || "").trim() };
      const err = SA.validerSeuil(ligne, today());
      if (err) throw new Error(err);
      const q = ex ? sb.from("seuils_varroa").update(ligne).eq("id", ex.id) : sb.from("seuils_varroa").insert({ id: crypto.randomUUID(), ...ligne });
      const { error } = await q;
      if (error) throw error;
      if (ancien) await saveCfg({ varroaSeuil: null });
      await refresh();
      toast("Seuil enregistré avec sa source.");
    },
    del: ex ? async () => {
      const { error } = await sb.from("seuils_varroa").delete().eq("id", ex.id);
      if (error) throw error;
      await refresh(); toast("Seuil retiré.");
    } : undefined,
    delLabel: "Retirer ce seuil",
  });
}

/** « ? » à côté d'un seuil (AP-US-059) : source, date, période, et comment en choisir un autre. */
function question(methode) {
  const x = SA.seuilApplicable({ varroa_methode: methode, date_visite: today() }, ctx());
  if (!x) return;
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>D’où vient ce seuil ?</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic("M18 6L6 18M6 6l12 12", 20)}</button></div>
    <dl class="sa-dl"><dt>Valeur</dt><dd>${e(SA.valeurTexte(x))}</dd><dt>Méthode</dt><dd>${e(methode)}</dd><dt>Période</dt><dd>${e(SA.periodeTexte(x))}</dd>
      <dt>Source</dt><dd>${x.origine === "reglage" ? "Saisi par toi avant cette version, source non notée" : e(x.source)}</dd>
      ${x.consulte_le ? `<dt>Consultée le</dt><dd>${e(dfr(x.consulte_le))}</dd>` : ""}</dl>
    ${x.url ? `<a class="btn block" href="${e(x.url)}" target="_blank" rel="noopener">Ouvrir la source</a>` : ""}
    <p class="small">Tu peux choisir le seuil de ton GDS ou de ton technicien : il remplace celui-ci pour cette méthode et cette période.</p>
    <button type="button" class="btn main block" data-act="saversseuils">Voir les seuils</button>`;
  if (!$sheet.open) $sheet.showModal();
}

export const actions = {
  savue: (v) => { st().vue = v === "seuils" ? "seuils" : "comptages"; render(); },
  sarucher: (v) => { st().rucher = v || null; render(); },
  safiltre: (v) => { st().filtre = v || ""; render(); },
  sacolonie: (id) => { ACT.ruche(id); if (typeof ACT.uronglet == "function") ACT.uronglet("sante"); },
  saseuil: (cle) => feuilleSeuil(cle),
  saquestion: (m) => question(m),
  saversseuils: () => { $sheet.close(); st().vue = "seuils"; ACT.go("varroa"); },
  saretirerancien: () => sheet({ title: "Retirer ce seuil ?", intro: "Les résultats s’afficheront sans couleur d’alerte tant qu’aucun seuil n’est choisi.", fields: [], label: "Retirer",
    submit: async () => saveCfg({ varroaSeuil: null }, "Seuil retiré.") }),
};
