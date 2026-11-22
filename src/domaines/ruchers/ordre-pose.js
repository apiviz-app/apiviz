// Apiviz — ordre de pose d'un rucher (IT-10, AP-TECH-140, migration 034).
// Feuille « Ordre de pose » : les colonies du rucher dans l'ordre où elles sont posées, ↑ ↓ pour en déplacer une,
// « Enregistrer ». L'ordre part par ranger_ruches, à travers la file d'envoi (sans réseau, il part au retour du réseau).
// Ouverte depuis le départ de la tournée et depuis la fiche du rucher. Règles : src/domaines/visites/ordre-tournee.js.
// Globales d'app.js lues à l'appel : S, esc, ACT, render, toast, $sheet, $sheetForm, HL, sb.
import * as O from "../visites/ordre-tournee.js";
import * as G from "../colonies/groupe.js";

const e = (t) => esc(t);
const ic = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const HAUT = "M6 15l6-6 6 6", BAS = "M6 9l6 6 6-6", CROIX = "M18 6L6 18M6 6l12 12";
const etat = () => S.op;
const nomDe = (id) => (S.d.ruches || []).find((r) => r.id === id)?.nom || "Ruche";
const BASE_ANCIENNE = /PGRST202|Could not find the function|ranger_ruches/;

function dessiner() {
  const st = etat();
  if (!st) return;
  const n = st.ids.length;
  $sheetForm.onsubmit = (ev) => { ev.preventDefault(); enregistrer(); };
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>Ordre de pose</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic(CROIX)}</button></div>
    <p class="small">${e(st.nom)} · touche ↑ ou ↓ pour mettre les ruches dans l’ordre où elles sont posées. La tournée suivra cet ordre.</p>
    <ol class="op-ordre" aria-label="Ordre de pose">${st.ids.map((id, i) => `<li class="op-ligne">
      <span class="op-place" aria-hidden="true">${i + 1}</span><b>${e(nomDe(id))}</b>
      <button type="button" class="op-bouge" data-act="opmonter" data-v="${i}" aria-label="Monter ${e(nomDe(id))}" ${i === 0 ? "disabled" : ""}>${ic(HAUT)}</button>
      <button type="button" class="op-bouge" data-act="opdescendre" data-v="${i}" aria-label="Descendre ${e(nomDe(id))}" ${i === n - 1 ? "disabled" : ""}>${ic(BAS)}</button>
    </li>`).join("")}</ol>
    <button class="btn main block" ${st.envoi ? "disabled" : ""}>Enregistrer l’ordre</button>`;
  if (!$sheet.open) $sheet.showModal();
  if (st.focus != null) $sheetForm.querySelector(`[data-act="${st.focus.act}"][data-v="${st.focus.i}"]`)?.focus();
}

function bouger(i, j, act) {
  const st = etat();
  if (!st) return;
  st.ids = O.deplacer(st.ids, i, j);
  // Le focus suit la ruche déplacée, pour enchaîner au clavier ; au bord de la liste, sur l'autre flèche.
  const n = st.ids.length;
  st.focus = { act: j === 0 ? "opdescendre" : j === n - 1 ? "opmonter" : act, i: j };
  dessiner();
}

async function enregistrer() {
  const st = etat();
  if (!st || st.envoi) return;
  st.envoi = true;
  const appel = typeof HL != "undefined" ? HL.rpc : (n, a) => sb.rpc(n, a);
  const p = { ruches: st.ids };
  const { error, local } = await appel("ranger_ruches", { p });
  st.envoi = false;
  if (error) {
    toast(BASE_ANCIENNE.test(`${error.code} ${error.message}`) ? "La base doit être mise à jour pour ranger les ruches (migration 034)." : error.message || "L’ordre n’a pas pu être enregistré.", true);
    return dessiner();
  }
  G.appliquerEnAttente(S.d, "ranger_ruches", p);
  S.op = null;
  $sheet.close();
  toast(local ? "Ordre gardé sur le téléphone : il partira au retour du réseau." : "Ordre de pose enregistré.");
  // Tournée ouverte en ordre de pose : elle suit tout de suite le nouvel ordre.
  if (S.tournee && S.tn?.ordre === "pose" && typeof ACT.tnordre == "function") ACT.tnordre("pose");
  else render();
}

export const actions = {
  oprangement: (cle) => {
    const ruches = (S.d.ruches || []).filter((r) => (r.rucher || "") === (cle || ""));
    if (!ruches.length) return toast("Ce rucher n’a pas encore de colonie.");
    S.op = { cle: cle || "", nom: cle || "Sans rucher", ids: O.rangees(ruches).map((r) => r.id), envoi: false, focus: null };
    $sheet.addEventListener("close", () => { S.op = null; }, { once: true });
    dessiner();
  },
  opmonter: (i) => bouger(Number(i), Number(i) - 1, "opmonter"),
  opdescendre: (i) => bouger(Number(i), Number(i) + 1, "opdescendre"),
};
