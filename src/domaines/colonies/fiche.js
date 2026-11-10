// Apiviz — compléments de la fiche colonie (IT-06) : statut (orpheline, AP-US-034), emplacements successifs
// (AP-FEAT-028), rucher d'une visite à sa date (AP-US-032), ruche physique (contenant, AP-US-036, si le suivi est
// activé dans les réglages : niveau Professionnel, AP-TECH-113). Complète l'écran « ruche » rendu par ux.js puis
// alveoles.js. Saisies terrain par la file d'envoi (offline.js) : changer_statut(), affecter_contenant() (migration 016).
// Les globales d'app.js (S, sb, sheet, esc, dfr, today, toast, refresh, render, write, cfg, byId) ne sont lues qu'à l'appel.
import * as C from "./regles.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const colonie = (id) => byId([...(S.d.ruches || []), ...(S.d.ruchesSorties || [])], id);
const nomRucher = (id) => (S.d.ruchers || []).find((r) => r.id === id)?.nom || "Sans rucher";
/** Suivi des ruches physiques activé (réglage de l'exploitation, désactivé par défaut). */
export const contenantsSuivis = () => !!cfg().contenants;

/** Complément de l'écran « ruche ». */
export function completerFiche() {
  if (S.route !== "ruche") return;
  const r = colonie(S.ruche), wrap = document.querySelector(".wrap");
  if (!r || !wrap) return;
  const st = C.statut(r);
  if (st === "orpheline") wrap.querySelector(".u-ruche-id")?.insertAdjacentHTML("beforeend", '<span class="tag crit cl-orph">Orpheline</span>');
  // Journal : le rucher où était la colonie, quand ce n'est pas celui d'aujourd'hui.
  wrap.querySelectorAll(".u-visite").forEach((carte) => {
    const v = byId(S.d.visites, carte.querySelector('[data-act="delvisite"]')?.dataset.v);
    if (!v) return;
    const ou = C.rucherADate(S.d.emplacements, r.id, v.date_visite);
    if (ou !== undefined && ou !== r.rucher_id) carte.querySelector(".u-visite-h")?.insertAdjacentHTML("beforeend", `<span class="tag cl-ou">au ${e(nomRucher(ou))}</span>`);
  });
  // Onglet « Colonie » : statut, emplacements, ruche physique, avant le reste (reine, hausses…).
  const reine = wrap.querySelector(".v3-reine");
  if (!reine) return;
  reine.insertAdjacentHTML("beforebegin", sectionStatut(r, st) + sectionEmplacements(r) + (contenantsSuivis() ? sectionContenant(r) : ""));
}

function sectionStatut(r, st) {
  if (!C.estActive(r) || !("statut" in r)) return ""; // base sans 016 : pas de statut à changer
  const btn = st === "orpheline"
    ? `<button type="button" class="btn" data-act="clstatut" data-v="${e(r.id)}" data-k="active">Elle a de nouveau une reine</button>`
    : `<button type="button" class="btn" data-act="clorpheline" data-v="${e(r.id)}">Marquer orpheline</button>`;
  return `<section class="card cl-statut"><div class="u-entete"><h2>Statut</h2><span class="tag ${st === "orpheline" ? "crit" : "good"}">${e(C.STATUTS[st])}</span></div>
    ${st === "orpheline" ? '<p class="small">Sans reine : elle reste dans tes alertes jusqu’au remérage.</p>' : ""}<div class="u-deux">${btn}</div></section>`;
}

function sectionEmplacements(r) {
  const l = C.emplacementsDe(S.d.emplacements, r.id);
  if (!l.length) return "";
  const dep = (id) => (S.d.deplacements || []).find((x) => x.id === id);
  const lignes = l.map((x) => {
    const m = dep(x.deplacement_id)?.motif;
    const quand = x.au ? `du ${dfr(x.du)} au ${dfr(x.au)}` : `depuis le ${dfr(x.du)}`;
    return `<div class="cl-ligne"><span><b>${e(nomRucher(x.rucher_id))}</b><span class="small">${e([quand, m].filter(Boolean).join(" · "))}</span></span>${x._attente ? '<span class="tag watch">en attente</span>' : ""}</div>`;
  }).join("");
  const debut = l.at(-1);
  return `<section class="card cl-emplacements"><div class="u-entete"><h2>Emplacements</h2>${C.estActive(r) ? `<button type="button" class="link" data-act="dpouvrir" data-v="${e(r.rucher_id || "")}">Déplacer</button>` : ""}</div>${lignes}
    <p class="small">Connu depuis le ${e(dfr(debut.du))}.</p></section>`;
}

function sectionContenant(r) {
  const occ = (S.d.occupations || []).filter((o) => o.colonie_id === r.id).sort((a, b) => String(b.du).localeCompare(String(a.du)));
  const cont = (id) => (S.d.contenants || []).find((c) => c.id === id);
  const actuel = occ.find((o) => !o.au);
  const libelle = (c) => (c ? `N° ${c.code}${c.type ? " · " + c.type : ""}` : "?");
  const hist = occ.filter((o) => o.au).map((o) => `<div class="cl-ligne"><span><b>${e(libelle(cont(o.contenant_id)))}</b><span class="small">du ${e(dfr(o.du))} au ${e(dfr(o.au))}</span></span></div>`).join("");
  return `<section class="card cl-contenant"><div class="u-entete"><h2>Ruche physique</h2>${C.estActive(r) ? `<button type="button" class="link" data-act="clcontenant" data-v="${e(r.id)}">${actuel ? "Transférer" : "Choisir"}</button>` : ""}</div>
    ${actuel ? `<div class="cl-ligne"><span><b>${e(libelle(cont(actuel.contenant_id)))}</b><span class="small">depuis le ${e(dfr(actuel.du))}</span></span></div>` : '<p class="small">Aucune caisse notée pour cette colonie.</p>'}
    ${hist}</section>`;
}

// ---------- Actions ----------
async function changer(p, message) {
  const { error, local } = await appel("changer_statut", { p });
  if (error) throw error;
  if (local) { C.appliquerStatut(S.d, p); typeof HL != "undefined" && HL.garderDonnees(); render(); toast("Gardé sur le téléphone : envoi au retour du réseau"); }
  else { await refresh(); toast(message); }
}

function orpheline(id) {
  const r = colonie(id);
  if (!r) return;
  sheet({
    title: `${r.nom} est orpheline`,
    intro: "Elle apparaîtra dans tes alertes jusqu’à ce qu’elle ait de nouveau une reine.",
    fields: [{ name: "date", label: "Constatée le", type: "date", required: !0, value: today() },
      { name: "tache", label: "Tâche de remérage", type: "select", options: [["1", `Ajouter « Remérer ${r.nom} » à l’agenda`], ["", "Ne pas ajouter de tâche"]], value: "1" }],
    submit: async (f) => {
      await changer({ id: crypto.randomUUID(), colonie_id: r.id, statut: "orpheline", date: f.date }, `${r.nom} : orpheline`);
      // Tâche sans échéance : le délai dépend de la saison et de ta méthode (aucun délai imposé ici).
      if (f.tache) await write(sb.from("taches").insert({ id: crypto.randomUUID(), titre: `Remérer ${r.nom}`, ruche_id: r.id }), "Tâche de remérage ajoutée");
    },
  });
}

function contenant(id) {
  const r = colonie(id), d = S.d;
  if (!r) return;
  const actuel = C.occupationDe(d.occupations, r.id);
  const libres = (d.contenants || []).filter((c) => c.etat !== "hors_service" && c.id !== actuel?.contenant_id && !C.occupant(d.occupations, d.ruches, c.id));
  if (!libres.length && !actuel) return toast("Ajoute d’abord tes ruches physiques dans Matériel.", !0);
  const options = [...libres.map((c) => [c.id, `N° ${c.code}${c.type ? " · " + c.type : ""}${c.etat === "a_reparer" ? " (à réparer)" : ""}`]), ...(actuel ? [["", "Aucune (sortir de sa caisse)"]] : [])];
  sheet({
    title: actuel ? `Transférer ${r.nom}` : `Caisse de ${r.nom}`,
    intro: actuel ? "L’ancienne caisse devient libre ; l’historique de la colonie ne change pas." : "",
    fields: [{ name: "contenant_id", label: "Ruche physique", type: "select", options, value: options[0]?.[0] ?? "" },
      { name: "date", label: "Date", type: "date", required: !0, value: today() }],
    submit: async (f) => {
      const p = { id: crypto.randomUUID(), colonie_id: r.id, contenant_id: f.contenant_id || null, date: f.date };
      const { error, local } = await appel("affecter_contenant", { p });
      if (error) throw error;
      if (local) { C.appliquerContenant(S.d, p); typeof HL != "undefined" && HL.garderDonnees(); render(); toast("Gardé sur le téléphone : envoi au retour du réseau"); }
      else { await refresh(); toast(f.contenant_id ? "Ruche physique enregistrée" : "Caisse libérée"); }
    },
  });
}

/** Actions de la fiche colonie (écran « ruche »). */
export const actions = {
  clorpheline: orpheline,
  clstatut: (id, statut) => changer({ id: crypto.randomUUID(), colonie_id: id, statut, date: today() }, statut === "active" ? "Colonie de nouveau active" : "Statut enregistré"),
  clcontenant: contenant,
};
