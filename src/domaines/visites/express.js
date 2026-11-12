// Apiviz — écran « Visite express » (v5.32, AP-FEAT-037, maquettes du 12 nov. 2026, migration 020).
// La visite part des valeurs de la précédente ; on ne touche que ce qui a changé. Chaque ligne dit « repris »,
// « pareil » ou « changé » ; la reine n'est jamais reprise (à revoir à chaque visite, comme dans la tournée).
// Enregistrer passe par creer_visite et la file d'envoi (offline.js), avec observes (champs touchés) et duree_s.
// Sans la migration 020, la base ignore ces deux champs : la visite est enregistrée comme une visite complète.
// Après l'enregistrement : la ruche suivante du même rucher pas encore vue ce jour, sinon la fiche de la ruche.
// Globales d'app.js lues à l'appel : S, esc, n, dfr, today, shell, render, toast, go, byId, lastVisit, apresVisites, ACT, GROUP.
import { CHAMPS_EXPRESS, departExpress, etatChamp, resumeExpress, chargeExpress, rucheSuivante } from "./regles.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
const ETIQUETTE = { repris: "repris", vu: "pareil", change: "changé", "non vu": "à regarder" };
const poidsTexte = (x) => (x === "" || x === null || x === undefined ? "Non pesée" : `${n(Number(x))} kg`);
const texte = (k, v) => (k === "poids_kg" ? poidsTexte(v) : k === "reine" && v === "Non cherchée" ? "Pas cherchée" : v);

/** Ouvre la visite express d'une ruche (ou la visite complète s'il n'y a encore aucune visite à reprendre). */
export function ouvrir(rucheId) {
  const r = byId(S.d.ruches, rucheId);
  if (!r) return;
  const der = lastVisit(r.id);
  if (!der) return ACT.newvisite(r.id);
  const depart = departExpress(der, r);
  S.ve = { id: nouvelId(), ruche_id: r.id, date_base: der.date_visite, depart, valeurs: { ...depart }, touches: [], ouvert: null, note: "", debut: Date.now() };
  go("visiteexpress");
}

function ligne(c) {
  const f = S.ve, etat = etatChamp(c.k, f.valeurs, f.depart, f.touches), ouvert = f.ouvert === c.k;
  const avant = etat === "change" ? `<s>${e(texte(c.k, f.depart[c.k]))}</s> → ` : "";
  const corps = !ouvert ? "" : c.choix
    ? `<div class="seg ve-choix" role="group" aria-label="${e(c.nom)}" style="grid-template-columns:repeat(${c.choix.length},minmax(0,1fr))">${c.choix.map((x) => `<button type="button" class="${f.valeurs[c.k] === x ? "on" : ""}" aria-pressed="${f.valeurs[c.k] === x}" data-act="vechoix" data-k="${c.k}" data-v="${e(x)}">${e(texte(c.k, x))}</button>`).join("")}</div>`
    : `<div class="ve-poids"><button type="button" class="ve-pas" data-act="vepoids" data-v="-0.5" aria-label="Retirer 500 g">−</button>
        <input id="ve_poids" class="ve-poids-i" type="number" inputmode="decimal" step="0.1" min="0" value="${e(f.valeurs.poids_kg)}" placeholder="kg" aria-label="Poids en kilos">
        <button type="button" class="ve-pas" data-act="vepoids" data-v="0.5" aria-label="Ajouter 500 g">+</button></div>`;
  return `<li class="ve-ligne ${etat === "change" ? "ve-modifie" : ""} ${ouvert ? "ve-ouvert" : ""}">
    <button type="button" class="ve-tete" data-act="veouvrir" data-v="${c.k}" aria-expanded="${ouvert}">
      <span class="ve-nom">${e(c.nom)}</span><span class="ve-val">${avant}${e(texte(c.k, f.valeurs[c.k]))}</span>
      <span class="ve-etat ve-${etat.replace(" ", "-")}">${ETIQUETTE[etat]}</span></button>${corps}</li>`;
}

/** L'écran « visiteexpress ». */
export function ecran() {
  const f = S.ve;
  const r = f && byId(S.d.ruches, f.ruche_id);
  if (!r) { S.ve = null; return go("ruches"); }
  const res = resumeExpress(f.valeurs, f.depart, f.touches), suivante = rucheSuivante(S.d, r.id, today());
  const total = CHAMPS_EXPRESS.length;
  const resume = [res.changes ? `${res.changes} changement${res.changes > 1 ? "s" : ""}` : "Aucun changement",
    res.repris ? `${res.repris} valeur${res.repris > 1 ? "s" : ""} reprise${res.repris > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
  shell(r.nom, `Visite express · ${total} points`,
    `<button type="button" class="btn" data-act="vecomplete">Visite complète</button>`,
    `<div class="ve">
      <div class="ve-api"><span class="ve-api-i" aria-hidden="true"></span>
        <p>Je reprends ta visite du ${e(dfr(f.date_base))}. Touche seulement ce qui a changé.</p></div>
      <ul class="ve-liste" aria-label="Ce que tu notes">${CHAMPS_EXPRESS.map(ligne).join("")}</ul>
      <label class="ve-note">Note (facultatif)<textarea id="ve_note" rows="2" placeholder="Ce que tu as remarqué">${e(f.note)}</textarea></label>
      <p class="ve-resume" aria-live="polite">${e(resume)}</p>
      <button type="button" class="btn main block ve-ok" data-act="veenregistrer" ${S.busy ? "disabled" : ""}>${suivante ? `Enregistrer et passer à ${e(suivante.nom)}` : "Enregistrer la visite"}</button>
      ${suivante ? `<button type="button" class="link ve-seul" data-act="veenregistrer" data-v="seul">Enregistrer et revenir à la ruche</button>` : ""}
    </div>`);
  const h = document.querySelector(".wrap .head h1");
  if (h) h.closest(".head")?.classList.add("ve-tete-ecran");
  document.getElementById("ve_poids")?.addEventListener("input", (ev) => {
    f.valeurs.poids_kg = ev.target.value === "" ? "" : Number(ev.target.value);
    if (!f.touches.includes("poids_kg")) f.touches.push("poids_kg");
  });
  document.getElementById("ve_note")?.addEventListener("input", (ev) => { f.note = ev.target.value; });
}

const lireNote = () => { const z = document.getElementById("ve_note"); if (z && S.ve) S.ve.note = z.value; };
function toucher(k) { if (!S.ve.touches.includes(k)) S.ve.touches.push(k); }

async function enregistrer(mode, _k, bouton) {
  const f = S.ve;
  if (!f || S.busy) return;
  lireNote();
  const p = chargeExpress({ id: f.id, ruche_id: f.ruche_id, date_visite: today(), valeurs: f.valeurs, touches: f.touches, note: f.note, debut: f.debut });
  if (bouton) bouton.disabled = true;
  S.busy = true;
  try {
    const { data: vid, error, local } = await appel("creer_visite", { p });
    if (error) throw error;
    const suivante = mode === "seul" ? null : rucheSuivante(S.d, f.ruche_id, today());
    S.ve = null;
    S.ruche = f.ruche_id; S.route = "ruche";
    await apresVisites([{ ...p, id: vid || p.id }], local);
    toast(local ? "Visite gardée sur le téléphone" : `Visite enregistrée${p.duree_s ? ` en ${p.duree_s} s` : ""}`);
    if (suivante) ouvrir(suivante.id);
  } finally { S.busy = false; if (bouton?.isConnected) bouton.disabled = false; }
}

/** Bouton « Visite express » sur la fiche d'une ruche active qui a déjà une visite. */
export function completerFiche() {
  const r = S.ruche && byId(S.d.ruches, S.ruche);
  if (!r || r.sortie || !lastVisit(r.id)) return;
  const barre = document.querySelector(".n4-rbarre");
  if (barre && !barre.querySelector('[data-act="veruche"]')) {
    barre.insertAdjacentHTML("afterbegin", `<button class="btn main" data-act="veruche" data-v="${e(r.id)}">Visite express</button>`);
    barre.querySelector('[data-act="newvisite"]')?.classList.replace("honey", "ghost");
    const v = barre.querySelector('[data-act="newvisite"]');
    if (v) v.textContent = "Visite complète";
  }
}

if (typeof GROUP != "undefined") GROUP.visiteexpress = "ruches";

export const actions = {
  veruche: (id) => ouvrir(id),
  veouvrir: (k) => { lireNote(); S.ve.ouvert = S.ve.ouvert === k ? null : k; render(); if (S.ve.ouvert === "poids_kg") document.getElementById("ve_poids")?.focus(); },
  vechoix: (v, k) => { lireNote(); S.ve.valeurs[k] = v; toucher(k); S.ve.ouvert = null; render(); },
  vepoids: (pas) => {
    lireNote();
    const f = S.ve, x = f.valeurs.poids_kg === "" ? Number(f.depart.poids_kg) || 0 : Number(f.valeurs.poids_kg);
    f.valeurs.poids_kg = Math.max(0, Math.round((x + Number(pas)) * 10) / 10); toucher("poids_kg"); render();
  },
  veenregistrer: enregistrer,
  vecomplete: () => { const id = S.ve?.ruche_id; S.ve = null; ACT.newvisite(id); },
};
