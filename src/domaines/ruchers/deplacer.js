// Apiviz — écran « Déplacer des colonies » (IT-06, AP-FEAT-029, AP-TECH-104) : transhumance d'un lot de colonies en
// une opération. Sélecteur de colonies par rucher (tout cocher), destination, date, motif. Envoi par deplacer_colonies()
// (migration 016) en passant par la file d'envoi (offline.js) : sans réseau, la saisie est gardée et montrée tout de
// suite. Les globales d'app.js (S, sb, shell, esc, today, toast, refresh, render, go) ne sont lues qu'à l'appel.
import * as R from "./regles.js";
import * as C from "../colonies/regles.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
export const MOTIFS = ["Transhumance", "Hivernage", "Pollinisation", "Vente", "Autre"];

/** État du formulaire (gardé entre deux rendus) ; `depuis` : rucher d'où l'on vient (ses colonies sont en tête). */
function etat() {
  S.dp ||= { sel: [], dest: "", date: today(), motif: MOTIFS[0], notes: "", depuis: null };
  return S.dp;
}
// Champs tapés relus avant chaque nouveau rendu (comme readVisitForm d'app.js).
function lire() {
  const f = etat(), q = (id) => document.getElementById(id);
  if (q("dp_date")) Object.assign(f, { date: q("dp_date").value, notes: q("dp_notes").value, dest: q("dp_dest").value, motif: q("dp_motif").value });
  return f;
}

/** L'écran « deplacer ». */
export function ecran() {
  const f = etat(), d = S.d;
  const lieux = R.lieux(d.ruchers, (d.ruches || []).filter(C.estActive));
  if (f.depuis) lieux.sort((a, b) => (b.id === f.depuis) - (a.id === f.depuis));
  const dests = (d.ruchers || []).filter((r) => !r.archive_le);
  const sel = new Set(f.sel);
  const blocs = lieux.filter((l) => l.rs.length).map((l) => {
    const tous = l.rs.every((r) => sel.has(r.id));
    return `<section class="card dp-rucher"><div class="u-entete"><h2>${e(l.nom)} <span class="small">· ${l.rs.length}</span></h2>
      <button type="button" class="link" data-act="dptout" data-v="${e(l.id || "")}" aria-pressed="${tous}">${tous ? "Tout décocher" : "Tout cocher"}</button></div>
      <div class="pick dp-pick">${l.rs.map((r) => `<button type="button" class="${sel.has(r.id) ? "on" : ""}" aria-pressed="${sel.has(r.id)}" data-act="dpcoche" data-v="${e(r.id)}">${e(r.nom)}${C.statut(r) === "orpheline" ? " ·&nbsp;orph." : ""}</button>`).join("")}</div></section>`;
  }).join("");
  const destNom = dests.find((r) => r.id === f.dest)?.nom;
  const bougent = C.aDeplacer(d.ruches, f.sel, f.dest).length;
  const resume = !f.sel.length ? "Coche les colonies à déplacer." : !f.dest ? `${UX.pluriel(f.sel.length, "colonie")} cochée${f.sel.length > 1 ? "s" : ""} : choisis la destination.`
    : `${UX.pluriel(bougent, "colonie")} vers ${destNom}${bougent < f.sel.length ? ` (${f.sel.length - bougent} y sont déjà)` : ""}.`;
  shell("Déplacer des colonies", "Transhumance, hivernage… en une seule fois, noté au registre",
    `<button type="button" class="btn" data-act="dpannuler">Annuler</button>`,
    `<div class="form dp-form">
      <section class="card stack"><h2>Vers</h2>
        <label>Rucher de destination<select id="dp_dest"><option value="">Choisir…</option>${dests.map((r) => `<option value="${e(r.id)}" ${r.id === f.dest ? "selected" : ""}>${e(r.nom)}</option>`).join("")}</select></label>
        <div class="two"><label>Date<input type="date" id="dp_date" value="${e(f.date)}" max="${e(today())}" required></label>
        <label>Motif<select id="dp_motif">${MOTIFS.map((m) => `<option ${m === f.motif ? "selected" : ""}>${e(m)}</option>`).join("")}</select></label></div>
        <label>Note (facultatif)<input id="dp_notes" value="${e(f.notes)}" placeholder="Ex. colza, prêt de M. Dupont" autocomplete="off"></label>
      </section>
      <h2 class="u-titre">Colonies</h2>
      ${blocs || '<p class="small">Aucune colonie active à déplacer.</p>'}
      <p class="small dp-resume" role="status">${e(resume)}</p>
      <button type="button" class="btn main block" data-act="dpvalider" ${bougent && !S.busy ? "" : "disabled"}>${bougent ? `Déplacer ${UX.pluriel(bougent, "colonie")}` : "Déplacer"}</button>
      <p class="small">Un transport hors du département se déclare à la direction départementale de destination. Vérifie la démarche auprès de ton GDS.</p>
    </div>`);
  // Destination choisie : le bouton et le résumé se mettent à jour.
  document.getElementById("dp_dest")?.addEventListener("change", () => { lire(); render(); });
}

/** Ouvre l'écran ; `rucherId` : rucher d'où l'on part (ses colonies en tête). */
export function ouvrir(rucherId) {
  S.dp = null;
  const f = etat();
  f.depuis = rucherId || null;
  go("deplacer");
}

async function valider(_v, _k, bouton) {
  const f = lire();
  const p = { id: f.id || (f.id = crypto.randomUUID()), date: f.date, rucher_id: f.dest, colonies: [...f.sel], motif: f.motif === "Autre" ? "" : f.motif.toLowerCase(), notes: f.notes.trim() };
  const err = C.controleDeplacement(S.d, p, today());
  if (err) throw new Error(err);
  const n = C.aDeplacer(S.d.ruches, p.colonies, p.rucher_id).length, dest = (S.d.ruchers || []).find((r) => r.id === p.rucher_id)?.nom;
  if (bouton) bouton.disabled = true;
  S.busy = true;
  try {
    const { error, local } = await appel("deplacer_colonies", { p });
    if (error) throw error;
    S.dp = null;
    S.rucher = dest; S.route = "rucher";
    if (local) {
      C.appliquerDeplacement(S.d, p, { _attente: true });
      typeof HL != "undefined" && HL.garderDonnees();
      render(); toast("Gardé sur le téléphone : envoi au retour du réseau");
    } else { await refresh(); toast(`${UX.pluriel(n, "colonie")} déplacée${n > 1 ? "s" : ""} vers ${dest}`); }
  } finally { S.busy = false; if (bouton?.isConnected) bouton.disabled = false; }
}

/** Actions de l'écran « deplacer ». */
export const actions = {
  dpcoche: (id) => { const f = lire(); f.sel = f.sel.includes(id) ? f.sel.filter((x) => x !== id) : [...f.sel, id]; render(); },
  dptout: (rid) => {
    const f = lire(), l = R.lieux(S.d.ruchers, S.d.ruches.filter(C.estActive)).find((x) => (x.id || "") === rid);
    if (!l) return;
    const ids = l.rs.map((r) => r.id), tous = ids.every((id) => f.sel.includes(id));
    f.sel = tous ? f.sel.filter((x) => !ids.includes(x)) : [...new Set([...f.sel, ...ids])];
    render();
  },
  dpvalider: valider,
  dpannuler: () => { const depuis = S.dp?.depuis; S.dp = null; if (depuis) { S.rucher = (S.d.ruchers || []).find((r) => r.id === depuis)?.nom; go("rucher"); } else go("ruches"); },
  // Depuis la fiche d'un rucher, l'écran Ruchers ou le registre.
  dpouvrir: (rid) => ouvrir(rid),
};
