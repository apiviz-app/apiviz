// Apiviz — Matériel › Inventaire (v5.38, maquettes du 13 nov. 2026 validées le 14). On compte ce qu'on a sous les
// yeux, article par article ; les cases vides sont ignorées ; rien ne change avant « Enregistrer ». Chaque écart part
// en un mouvement « inventaire » (le déclencheur de la migration 018 met le stock à jour).
// Règles : ecartsInventaire() de regles.js. Globales lues à l'appel : S, esc, shell, sb, HL, toast, go, render, ES.
import * as R from "./regles.js";

const e = (t) => esc(t);
const etat = () => (S.inv ||= { f: "tout", v: {} });

function lignes() {
  const st = etat(), arts = S.d.articles || [];
  const groupes = R.groupesEcran(arts, st.f === "tout" ? "tout" : st.f, "", []);
  return groupes.map((g) => `<section class="op-groupe"><h2 class="op-gt">${e(g.titre)}</h2><div class="inv-liste">
    <div class="inv-l inv-tete"><span>Article</span><span>Prévu</span><span>Compté</span></div>
    ${g.articles.map((a) => {
      const v = st.v[a.id] ?? "";
      return `<div class="inv-l" data-art="${e(a.id)}"><span><b>${e(a.nom)}</b><span class="inv-ec"></span></span>
        <span class="inv-prevu">${e(R.quantite(a.stock, a.unite === "unité" ? "" : a.unite))}</span>
        <input type="number" inputmode="decimal" min="0" step="any" class="inv-in" data-art="${e(a.id)}" value="${e(v)}" placeholder="–" aria-label="Compté pour ${e(a.nom)}"></div>`;
    }).join("")}</div></section>`).join("");
}

function maj() {
  const st = etat(), arts = S.d.articles || [], r = R.ecartsInventaire(arts, st.v);
  for (const ligne of document.querySelectorAll(".inv-l[data-art]")) {
    const a = arts.find((x) => x.id === ligne.dataset.art), v = st.v[ligne.dataset.art], z = ligne.querySelector(".inv-ec");
    const saisi = v !== undefined && String(v).trim() !== "";
    ligne.classList.toggle("inv-fait", saisi);
    if (!z || !a) continue;
    const ec = saisi ? Math.round((Number(String(v).replace(",", ".")) - Number(a.stock || 0)) * 100) / 100 : 0;
    z.className = "inv-ec" + (!saisi ? "" : ec > 0 ? " plus" : ec < 0 ? " moins" : " ok");
    z.textContent = !saisi ? "" : ec === 0 ? "✓ comme prévu" : `${ec > 0 ? "+" : "−"}${R.quantite(Math.abs(ec), "")} par rapport au prévu`;
  }
  const n = r.ecarts.length, btn = document.querySelector(".inv-ok");
  if (btn) btn.textContent = n ? `Enregistrer ${n} écart${n > 1 ? "s" : ""}` : r.comptes ? "Terminer, tout est conforme" : "Enregistrer";
  const p = document.querySelector(".inv-prog i"), c = document.querySelector(".inv-compte");
  if (p) p.style.width = `${arts.length ? Math.round((r.comptes / arts.length) * 100) : 0}%`;
  if (c) c.textContent = `${r.comptes} / ${arts.length} comptés`;
}

export function ecran() {
  const st = etat(), arts = S.d.articles || [];
  const puces = [{ k: "tout", t: "Tout" }, ...R.puces(arts).filter((p) => !["tout", "bas"].includes(p.k))];
  shell("Compte ce que tu as sous les yeux", "Laisse vide ce que tu ne comptes pas. Rien n’est changé avant « Enregistrer ».", "",
    `<div class="op-puces" role="group" aria-label="Famille">${puces.map((p) => `<button type="button" class="op-puce${st.f === p.k ? " on" : ""}" aria-pressed="${st.f === p.k}" data-act="invfiltre" data-v="${e(p.k)}">${e(p.t)}</button>`).join("")}</div>
    <div class="inv-corps">${arts.length ? lignes() : '<p class="small">Aucun article à compter.</p>'}</div>
    <div class="op-pied inv-pied"><div class="inv-prog" aria-hidden="true"><i></i></div><span class="small inv-compte"></span>
      <button type="button" class="btn main inv-ok" data-act="invok">Enregistrer</button></div>`, "Inventaire");
  document.querySelector(".wrap")?.classList.add("op-ecran");
  ES.retour("invquitter", "", "‹ Matériel");
  document.querySelector(".inv-corps")?.addEventListener("input", (ev) => {
    const c = ev.target.closest(".inv-in");
    if (c) { etat().v[c.dataset.art] = c.value; maj(); }
  });
  maj();
}

async function enregistrer() {
  const st = etat(), r = R.ecartsInventaire(S.d.articles || [], st.v);
  if (!r.ecarts.length) { S.inv = null; go("materiel"); if (r.comptes) toast("Inventaire terminé : tout est conforme"); return; }
  const rows = r.ecarts.map((x) => ({ id: crypto.randomUUID(), article_id: x.article.id, type: "inventaire", origine: "saisie", quantite: x.ecart, note: "Inventaire" }));
  const q = sb.from("mouvements_stock").insert(rows);
  const msg = `Inventaire enregistré : ${r.ecarts.length} écart${r.ecarts.length > 1 ? "s" : ""} corrigé${r.ecarts.length > 1 ? "s" : ""}`;
  if (typeof HL != "undefined") await HL.write(q, msg);
  else { const { error } = await q; if (error) throw error; await refresh(); toast(msg); }
  S.inv = null;
  go("materiel");
}

export const actions = {
  invfiltre: (v) => { etat().f = v; render(); },
  invok: enregistrer,
  invquitter: () => {
    const n = R.ecartsInventaire(S.d.articles || [], etat().v).comptes;
    if (n && !confirmer()) return;
    S.inv = null; go("materiel");
  },
};
// Pas de fenêtre du navigateur (elle bloque l'app) : un second appui sur « ‹ Matériel » confirme l'abandon.
let armer = 0;
function confirmer() {
  if (Date.now() - armer < 4000) return true;
  armer = Date.now();
  toast("Touche encore « Matériel » pour abandonner ce comptage");
  return false;
}
