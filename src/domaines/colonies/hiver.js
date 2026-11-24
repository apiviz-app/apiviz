// Apiviz — écran « Prêt pour l'hiver » (v5.82, maquette « apiviz — Idées à forte valeur », idée 5, validée par
// Pierre-Louis le 24 nov. 2026). Ruchers › ⋯ › Prêt pour l'hiver.
// Une barre (prêtes / à surveiller / à reprendre / à compléter), des puces pour filtrer, la liste des colonies de la
// plus urgente à la moins urgente avec leurs mesures et la raison ; « Tes repères » (poids d'hivernage, varroa après
// traitement, début de l'automne) se règlent dans une feuille. Toucher une colonie ouvre sa fiche.
// Règles pures : hiver-regles.js. Globales lues à l'appel : S, esc, cfg, saveCfg, sheet, shell, render, today.
import * as H from "./hiver-regles.js";

const e = (t) => esc(t);
const f = (x) => String(Math.round(x * 10) / 10).replace(".", ",");
const etat = { filtre: "" };
const CLS = { reprendre: "hv-reprendre", surveiller: "hv-surveiller", completer: "hv-completer", prete: "hv-prete" };

export function ecran() {
  const rep = H.reperes(cfg());
  const { lignes, compte } = H.hiver(S.d, rep, today());
  const total = lignes.length || 1;
  const vis = etat.filtre ? lignes.filter((l) => l.niveau === etat.filtre) : lignes;
  const barre = H.NIVEAUX.filter((n) => compte[n]).map((n) => `<span class="${CLS[n]}" style="flex:${compte[n]}"></span>`).join("");
  const resume = H.NIVEAUX.filter((n) => compte[n]).map((n) => `${compte[n]} ${H.TITRES[n].toLowerCase()}${compte[n] > 1 && n === "prete" ? "s" : ""}`).join(", ");
  const puce = (n, t) => `<button type="button" class="chip${etat.filtre === n ? " on" : ""}" aria-pressed="${etat.filtre === n}" data-act="hvfiltre" data-v="${n}">${t}</button>`;
  const ligne = (l) => `<button type="button" class="hv-col" data-act="ruche" data-v="${e(l.id)}">
      <span class="hv-tete"><b>${e(l.nom)}</b><span class="hv-tag ${CLS[l.niveau]}">${H.TITRES[l.niveau]}</span></span>
      <span class="hv-mesures"><span>Poids <b>${l.poids == null ? "—" : e(f(l.poids)) + " kg"}</b></span><span>Varroa <b>${l.varroa == null ? "—" : e(f(l.varroa)) + " %"}</b></span><span>Reine <b>${e(l.reine)}</b></span>${l.force != null ? `<span>Force <b>${l.force}/5</b></span>` : ""}</span>
      ${l.raisons.length ? `<span class="small">${e(l.raisons.join(" · "))}</span>` : ""}${l.manque.length ? `<span class="small hv-manque">Manque : ${e(l.manque.join(", "))}</span>` : ""}
    </button>`;
  const sansRepere = rep.poids == null && rep.varroa == null;
  shell("Prêt pour l’hiver", `${lignes.length} colonie${lignes.length > 1 ? "s" : ""} · mesures depuis le ${e(new Date(`2026-${rep.depuis}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).replace(/^1 /, "1er "))}`, "",
    `<div class="hv-page">
      ${lignes.length ? `<section class="card hv-resume">
        <div class="hv-barre" role="img" aria-label="${e(resume)}">${barre}</div>
        <p class="small">${e(resume)}</p></section>` : '<section class="card"><p class="small">Aucune colonie active.</p></section>'}
      ${sansRepere ? `<section class="card hv-alerte"><b>Règle d’abord tes repères</b><p class="small">Sans repère de poids ni de varroa, apiviz ne juge que la reine, la force et les visites. Fixe-les avec ton GDS ou ton vétérinaire.</p><button type="button" class="btn main" data-act="hvreperes">Régler mes repères</button></section>` : ""}
      ${lignes.length ? `<div class="hv-filtres" role="group" aria-label="Filtrer">${puce("", "Toutes")}${H.NIVEAUX.filter((n) => compte[n]).map((n) => puce(n, `${H.TITRES[n]} (${compte[n]})`)).join("")}</div>
      <section class="card hv-liste">${vis.map(ligne).join("") || '<p class="small">Aucune colonie ici.</p>'}</section>` : ""}
      <section class="card hv-reperes"><div class="hv-tete"><h2>Tes repères</h2><button type="button" class="link" data-act="hvreperes">Modifier</button></div>
        <p class="hv-ligne"><span>Poids d’hivernage</span><b>${rep.poids == null ? "Pas réglé" : e(f(rep.poids)) + " kg"}</b></p>
        <p class="hv-ligne"><span>Varroa après traitement</span><b>${rep.varroa == null ? "Pas réglé" : "moins de " + e(f(rep.varroa)) + " %"}</b></p>
        <p class="small">C’est toi qui les règles. apiviz compare tes mesures à tes repères, il ne prédit pas la survie d’une colonie.</p></section>
    </div>`);
}

function regler() {
  const rep = H.reperes(cfg());
  sheet({ title: "Repères d’hivernage", intro: "À fixer avec ton GDS ou ton vétérinaire. Laisse vide pour ne pas juger ce critère.",
    fields: [
      { name: "poids", label: "Poids d’hivernage minimum (kg, ruche pesée)", type: "number", step: "0.5", min: 0, value: rep.poids ?? "" },
      { name: "varroa", label: "Varroa après traitement : au-dessus de (% d’abeilles porteuses)", type: "number", step: "0.1", min: 0, value: rep.varroa ?? "" },
      { name: "depuis", label: "Mesures d’automne à partir du", type: "select", options: [["08-01", "1er août"], ["08-15", "15 août"], ["09-01", "1er septembre"], ["09-15", "15 septembre"], ["10-01", "1er octobre"]], value: rep.depuis },
    ],
    // Le poids reste dans hiverPoids (Ma saison et API le lisent) ; le reste dans hiver.
    submit: (v) => saveCfg({ hiverPoids: v.poids === "" ? null : Number(v.poids), hiver: { varroa: v.varroa === "" ? null : Number(v.varroa), depuis: v.depuis } }, "Repères enregistrés") });
}

export const actions = {
  hvfiltre: (n) => { etat.filtre = H.NIVEAUX.includes(n) ? n : ""; render(); },
  hvreperes: () => regler(),
};
