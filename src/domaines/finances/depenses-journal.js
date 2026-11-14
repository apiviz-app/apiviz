// Apiviz — Finances › Dépenses en journal (v5.38, maquettes du 13 nov. 2026 validées le 14). Le tableau des dépenses
// de l'année (app.js, ergonomie.js) devient un journal : tuiles par catégorie, puces (catégories, personne qui a
// acheté, sans facture), tableau date · libellé · catégorie · par · montant, la colonne Libellé restant en place ;
// toucher une ligne ouvre la dépense. « Fichier comptable » à portée de main. Règles : lignesDepenses() ci-dessous.
// Globales lues à l'appel : S, esc, eur, eur0, dfr, shell, yearSel, render.
const e = (t) => esc(t);
const etat = () => (S.dj ||= { f: "tout" });
const cleCat = (c) => String(c || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const CLASSES = { "pots-etiquettes": "k-emballage", emballage: "k-emballage", alimentation: "k-alimentation", materiel: "k-materiel", equipement: "k-materiel", traitements: "k-traitements" };

/** Dépenses de l'année filtrées (pur) : « tout », « cat:<catégorie> », « par:<prénom> » ou « sanspiece ». */
export function lignesDepenses(d, annee, f = "tout") {
  const an = String(annee);
  return (d.depenses || []).filter((x) => String(x.date_depense || "").slice(0, 4) === an).filter((x) => {
    if (f.startsWith("cat:")) return (x.categorie || "") === f.slice(4);
    if (f.startsWith("par:")) return (x.achete_par || "") === f.slice(4);
    if (f === "sanspiece") return !String(x.piece || "").trim();
    return true;
  }).sort((a, b) => String(b.date_depense).localeCompare(String(a.date_depense)) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

/** Totaux par catégorie de l'année, du plus gros au plus petit. */
export function totauxCategories(d, annee) {
  const m = new Map();
  for (const x of lignesDepenses(d, annee)) m.set(x.categorie || "Autre", (m.get(x.categorie || "Autre") || 0) + Number(x.montant || 0));
  return [...m].map(([categorie, total]) => ({ categorie, total: Math.round(total * 100) / 100 })).sort((a, b) => b.total - a.total);
}

export function ecran() {
  const d = S.d, an = S.annee, st = etat();
  const tous = lignesDepenses(d, an), l = lignesDepenses(d, an, st.f), cats = totauxCategories(d, an);
  const total = tous.reduce((s, x) => s + Number(x.montant || 0), 0);
  const pers = [...new Set(tous.map((x) => x.achete_par).filter(Boolean))];
  const puces = [{ k: "tout", t: `${an}`, n: tous.length }, ...cats.map((c) => ({ k: "cat:" + c.categorie, t: c.categorie, n: tous.filter((x) => (x.categorie || "Autre") === c.categorie).length })),
    ...pers.map((p) => ({ k: "par:" + p, t: `Par ${p}`, n: tous.filter((x) => x.achete_par === p).length })),
    { k: "sanspiece", t: "Sans facture", n: tous.filter((x) => !String(x.piece || "").trim()).length }].filter((p) => p.n > 0 || p.k === "tout");
  const lignes = l.map((x) => `<tr data-act="editdepense" data-v="${e(x.id)}"><td class="op-doux">${e(dfr(x.date_depense).slice(0, 5))}</td>
    <th scope="row" class="op-fixe"><button type="button" class="op-nom" data-act="editdepense" data-v="${e(x.id)}"><b>${e(x.libelle)}</b>${x._attente ? '<span class="tag watch hl-tag">en attente</span>' : ""}</button></th>
    <td><span class="dj-cat ${CLASSES[cleCat(x.categorie)] || ""}">${e(x.categorie || "Autre")}</span></td><td class="op-doux">${e(x.achete_par || "–")}</td><td class="op-num"><b>${e(eur(x.montant))}</b></td></tr>`).join("");
  shell(`${eur0(total)} dépensés en ${an}`, "", yearSel(),
    `${cats.length ? `<div class="dj-tuiles">${cats.slice(0, 3).map((c) => `<div class="dj-tuile"><span>${e(c.categorie)}</span><b>${e(eur0(c.total))}</b></div>`).join("")}</div>` : ""}
    <div class="op-puces" role="group" aria-label="Filtrer">${puces.map((p) => `<button type="button" class="op-puce${st.f === p.k ? " on" : ""}" aria-pressed="${st.f === p.k}" data-act="djfiltre" data-v="${e(p.k)}">${e(p.t)} <span>${p.n}</span></button>`).join("")}</div>
    ${l.length ? `<div class="op-boite" tabindex="0" aria-label="Dépenses"><table class="op-table dj-table"><thead><tr><th scope="col">Date</th><th scope="col" class="op-fixe">Libellé</th><th scope="col">Catégorie</th><th scope="col">Par</th><th scope="col" class="op-num">Montant</th></tr></thead><tbody>${lignes}</tbody></table></div>`
      : `<p class="small op-vide">Aucune dépense${st.f === "tout" ? ` en ${an}` : " pour ce filtre"}.</p>`}
    <p class="small" style="margin:10px 2px 0">La catégorie vient de l’article acheté. Toucher une ligne ouvre la dépense.</p>
    <div class="op-pied"><button type="button" class="btn" data-act="rgcomptable">Fichier comptable</button><button type="button" class="btn main" data-act="newdepense">+ Ajouter un achat</button></div>`, "Dépenses");
  document.querySelector(".wrap")?.classList.add("op-ecran");
}

export const actions = { djfiltre: (v) => { etat().f = v; render(); } };

// Fil d'Ariane (ergonomie.js) : il reprend le titre de l'écran ; ces écrans ont une phrase pour titre, le fil garde
// leur nom court (« Finances › Dépenses », « Matériel › Inventaire »).
const NOMS_COURTS = { compta: "Dépenses", inventaire: "Inventaire", courses: "Liste de courses" };
if (typeof window != "undefined") window.Noyau?.crochets?.sur("apresRendu", "fil-nom-court", () => {
  const nom = NOMS_COURTS[S?.route];
  const fin = nom && document.querySelector(".wrap .er-ariane > span:last-child");
  if (fin) fin.textContent = nom;
});
