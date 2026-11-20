// Apiviz — Agenda : « Organiser avec API » (v5.70, maquette « L'agenda : API organise ta semaine » du 20 nov. 2026).
// En tête de l'agenda, une carte d'API. Toucher « Organiser avec API » : il propose ce qu'il placerait dans les sept
// prochains jours (visites selon la météo déjà connue de chaque rucher, priorités de la saison, conseils d'API pas encore
// faits, matériel sous le seuil), en pointillé, chacun avec sa raison. Une coche garde, une croix écarte ; « Tout
// ajouter » crée les tâches gardées, avec leur date. Rien n'est créé sans ce geste. Règles : compagnon.js.
// Globales lues à l'appel : S, esc, today, write, sb, UX, MT, AL, Noyau.
import * as C from "./compagnon.js";
import * as J from "./aujourdhui.js";
import * as H from "./historique.js";

const nouvelId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16)));
const etat = { ouvert: false, props: [], ecartes: new Set() };
const auj = () => (typeof today == "function" ? today() : new Date().toISOString().slice(0, 10));
const jours = (d) => Math.round((new Date(`${auj()}T12:00:00`) - new Date(`${String(d).slice(0, 10)}T12:00:00`)) / 864e5);

function donnees() {
  const d = S.d;
  const ruchers = typeof UX == "undefined" ? [] : UX.ruchers().map(([cle, rs]) => {
    const vs = (d.visites || []).filter((v) => rs.some((r) => r.id === v.ruche_id)).map((v) => v.date_visite).sort();
    // La météo n'est demandée que si elle manque ; la carte se redessine quand elle arrive.
    if (typeof MT != "undefined" && !MT.creneauConnu(cle, rs)) MT.html(cle, rs, 3);
    return { cle, nom: UX.nomRucher(cle), aVoir: rs.some((r) => r.etat && r.etat !== "Bonne"), joursSansVisite: vs.length ? jours(vs[vs.length - 1]) : null,
      creneau: typeof MT != "undefined" ? MT.creneauConnu(cle, rs) : null };
  });
  return C.propositionsSemaine({
    aujourdhui: auj(), ruchers,
    priorites: J.prioritesSaison().filter((p) => !p.dejaAgenda),
    conseils: J.conseilsOuverts().map((c) => ({ titre: H.titreConseil(c.texte), texte: c.texte, ruche_id: c.ruche_id })),
    sousSeuil: J.sousSeuil(),
    tachesOuvertes: (d.taches || []).filter((t) => !t.faite).map((t) => t.titre),
  });
}

const COCHE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
const CROIX = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function carte() {
  const api = typeof Apiviz != "undefined" ? Apiviz.compagnon(etat.ouvert ? "repond" : "repos", 40) : "";
  if (!etat.ouvert) {
    return `<section class="card ap-carte" id="apAgenda">${api}<div class="ap-t"><b>API peut organiser ta semaine</b><span class="small">Selon la météo de tes ruchers, la saison et ses conseils</span></div>
      <button type="button" class="btn ap-go" data-act="apagenda">Organiser avec API</button></section>`;
  }
  const gardees = etat.props.filter((_, i) => !etat.ecartes.has(i));
  const groupes = new Map();
  etat.props.forEach((p, i) => { const k = p.echeance || ""; (groupes.get(k) || groupes.set(k, []).get(k)).push([p, i]); });
  const liste = [...groupes].map(([k, l]) => `<li class="ap-jour"><h3>${k ? esc(C.jourCourt(k).replace(/^./, (c) => c.toUpperCase())) : "Jour à choisir"}</h3>
    ${l.map(([p, i]) => { const non = etat.ecartes.has(i); return `<div class="ap-prop${non ? " ecartee" : ""}"><span class="ap-pt"><b>${esc(p.titre)}${p.heure ? ` <span>· vers ${p.heure} h</span>` : ""}</b><span class="small">${esc(p.raison)}</span></span>
      <button type="button" class="ap-oui" data-act="apgarder" data-v="${i}" aria-pressed="${!non}" aria-label="Garder : ${esc(p.titre)}">${COCHE}</button>
      <button type="button" class="ap-non" data-act="apecarter" data-v="${i}" aria-pressed="${non}" aria-label="Écarter : ${esc(p.titre)}">${CROIX}</button></div>`; }).join("")}</li>`).join("");
  return `<section class="card ap-carte ouverte" id="apAgenda">
    <div class="ap-tete">${api}<div class="ap-t"><b>${etat.props.length ? `${etat.props.length} proposition${etat.props.length > 1 ? "s" : ""} d’API` : "Rien à proposer cette semaine"}</b><span class="small">${etat.props.length ? "Garde ou écarte, puis ajoute à l’agenda" : "Tes ruchers vont bien, rien n’attend"}</span></div>
      <button type="button" class="link" data-act="apagenda">Refaire</button></div>
    ${etat.props.length ? `<ol class="ap-liste">${liste}</ol>
    <div class="ap-pied"><button type="button" class="btn" data-act="apfermer">Plus tard</button><button type="button" class="btn ap-ajouter" data-act="apajouter" ${gardees.length ? "" : "disabled"}>Tout ajouter (${gardees.length})</button></div>` : '<div class="ap-pied"><button type="button" class="btn" data-act="apfermer">Fermer</button></div>'}
  </section>`;
}

function dessiner() {
  const c = document.getElementById("apAgenda");
  if (c) c.outerHTML = carte();
}

/** Après le rendu de l'agenda (et du calendrier d'agenda-mois.js) : la carte d'API en tête. */
function completer() {
  if (S.route !== "agenda" || !S.d || document.getElementById("apAgenda") || document.documentElement.classList.contains("lecteur")) return;
  const page = document.querySelector(".wrap .ag-page");
  if (!page) return;
  if (etat.ouvert) etat.props = donnees();
  page.insertAdjacentHTML("beforebegin", carte());
}
if (typeof window != "undefined" && window.Noyau?.crochets) window.Noyau.crochets.sur("apresRendu", "agenda-api", completer);
// La météo d'un rucher arrive : les propositions ouvertes en tiennent compte.
if (typeof window != "undefined") {
  const avant = window.AL_meteoPrete;
  window.AL_meteoPrete = (...a) => { const r = avant?.(...a); if (S.route === "agenda" && etat.ouvert) { etat.props = donnees(); etat.ecartes.clear(); dessiner(); } return r; };
}

export const actions = {
  apagenda: () => { etat.ouvert = true; etat.ecartes.clear(); etat.props = donnees(); dessiner(); },
  apfermer: () => { etat.ouvert = false; dessiner(); },
  apgarder: (i) => { etat.ecartes.delete(Number(i)); dessiner(); },
  apecarter: (i) => { etat.ecartes.add(Number(i)); dessiner(); },
  apajouter: async () => {
    const l = etat.props.filter((_, i) => !etat.ecartes.has(i)).map((p) => ({ id: nouvelId(), titre: p.heure ? `${p.titre} (vers ${p.heure} h)` : p.titre, echeance: p.echeance || null, ruche_id: p.ruche_id || null }));
    if (!l.length) return;
    etat.ouvert = false; etat.props = [];
    await write(sb.from("taches").insert(l), `${l.length} tâche${l.length > 1 ? "s" : ""} ajoutée${l.length > 1 ? "s" : ""} à l’agenda`);
  },
};
